import Events from './Events';

const LIMIT = 100;
const INTERNAL_ATTRIBUTE =
  /^(data-aframe-inspector|aframe-inspector-removed-embedded)/;

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function stringify(value, schema) {
  if (value === null || value === undefined) return '';
  if (!schema) return String(value);
  if (AFRAME.schema.isSingleProperty(schema)) return schema.stringify(value);
  const values = {};
  Object.keys(value)
    .sort()
    .forEach((key) => {
      if (value[key] === undefined) return;
      if (value[key] === null) {
        values[key] = '';
        return;
      }
      values[key] = schema[key]
        ? schema[key].stringify(value[key])
        : value[key];
    });
  return AFRAME.utils.styleParser.stringify(values);
}

function attributes(node) {
  const result = {};
  const names = new Set([...node.attributes].map((attr) => attr.name));
  // A-Frame keeps authored changes in component.attrValue until flushToDOM.
  Object.keys(node.components || {}).forEach((name) => names.add(name));
  [...names].sort().forEach((name) => {
    if (INTERNAL_ATTRIBUTE.test(name)) return;
    const component = node.components?.[name];
    const authored = component && node.getDOMAttribute?.(name);
    if (component && authored !== null && authored !== undefined) {
      result[name] = stringify(authored, component.schema);
    } else if (node.hasAttribute(name)) {
      result[name] = [...node.attributes].find(
        (attr) => attr.name === name
      ).value;
    }
  });
  return result;
}

function excluded(node) {
  return (
    node.nodeType === 1 &&
    (node.isInspector ||
      node.dataset?.isInspector ||
      node.hasAttribute('data-aframe-inspector') ||
      node.hasAttribute('data-aframe-canvas') ||
      node.hasAttribute('aframe-injected'))
  );
}

function difference(before, after) {
  const changes = new Map();
  new Set([...before.keys(), ...after.keys()]).forEach((id) => {
    const previous = before.get(id) || null;
    const next = after.get(id) || null;
    if (!same(previous, next)) {
      changes.set(id, { before: previous, after: next });
    }
  });
  return changes;
}

/** Authored scene history. Entries contain data and stable keys, never DOM nodes. */
export class History {
  constructor(inspector) {
    this.inspector = inspector;
    this.ids = new WeakMap();
    this.nodes = new Map();
    this.nextId = 0;
    this.entries = [];
    this.cursor = 0;
    this.depth = 0;
    this.replaying = false;
    this.disposed = false;
    this.generation = 0;
    this.updates = {};
    this.pendingLoads = new Set();
    this.pendingSelection = null;
    this.clear();
  }

  id(node) {
    if (!this.ids.has(node)) this.ids.set(node, ++this.nextId);
    const id = this.ids.get(node);
    this.nodes.set(id, node);
    return id;
  }

  capture() {
    const records = new Map();
    const visit = (node, parent = null) => {
      if (excluded(node)) return null;
      const id = this.id(node);
      const record = { id, parent, type: node.nodeType };
      if (node.nodeType === 1) {
        record.tag = node.tagName.toLowerCase();
        record.attrs = attributes(node);
        record.children = [];
        records.set(id, record);
        [...node.childNodes].forEach((child) => {
          const key = visit(child, id);
          if (key !== null) record.children.push(key);
        });
      } else {
        record.text = node.nodeValue;
        records.set(id, record);
      }
      return id;
    };
    const root = visit(this.inspector.sceneEl);
    const selected = this.inspector.selectedEntity;
    return {
      records,
      root,
      selection: selected ? (this.ids.get(selected) ?? null) : null,
      saveState: this.inspector.persistence
        ? {
            dirty: this.inspector.persistence.dirty,
            message: this.inspector.persistence.message
          }
        : null
    };
  }

  get busy() {
    return this.replaying || this.depth > 0 || !!this.group || this.disposed;
  }

  canUndo() {
    return !this.busy && this.cursor > 0;
  }

  canRedo() {
    return !this.busy && this.cursor < this.entries.length;
  }

  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.cursor,
      redoCount: this.entries.length - this.cursor,
      undoLabel: this.entries[this.cursor - 1]?.label ?? null,
      redoLabel: this.entries[this.cursor]?.label ?? null,
      busy: this.busy
    };
  }

  publish() {
    const state = this.getState();
    if (same(state, this.lastState)) return;
    this.lastState = { ...state };
    Events.emit('historychanged', state);
  }

  restoreSaveState(state) {
    if (!state || !this.inspector.persistence) return;
    Object.assign(this.inspector.persistence, state);
    this.inspector.persistence.publish?.();
  }

  assertAvailable() {
    if (this.replaying || this.disposed) {
      throw new Error(
        'History is unavailable during replay or after disposal.'
      );
    }
  }

  transaction(label, callback) {
    this.assertAvailable();
    if (
      typeof callback !== 'function' ||
      callback.constructor?.name === 'AsyncFunction'
    ) {
      throw new TypeError(
        'History transactions require a synchronous callback.'
      );
    }
    const nested = this.depth > 0;
    const continuingGroup = this.group && this.group.running;
    if (!nested && !continuingGroup) this.endGroup();
    const before = this.capture();
    const pendingSelection = this.pendingSelection;
    const entries = this.entries.slice();
    const cursor = this.cursor;
    this.depth++;
    try {
      this.publish();
      const result = this.runCallback(callback);
      const after = this.capture();
      if (after.root !== before.root) {
        throw new Error('Transactions cannot replace the scene root.');
      }
      if (
        this.pendingSelection !== null &&
        after.records.has(this.pendingSelection)
      ) {
        after.selection = this.pendingSelection;
      }
      if (!nested && !continuingGroup && !this.commit(label, before, after)) {
        this.restoreSaveState(before.saveState);
      }
      return result;
    } catch (error) {
      this.entries = entries;
      this.cursor = cursor;
      this.replaying = true;
      try {
        this.apply(difference(this.capture().records, before.records), 'after');
        this.refresh(before.selection);
        this.updateExports(this.capture().records);
        this.restoreSaveState(before.saveState);
        this.pendingSelection = pendingSelection;
      } finally {
        this.replaying = false;
      }
      throw error;
    } finally {
      this.depth--;
      if (!nested) this.pendingSelection = null;
      this.prune();
      this.publish();
    }
  }

  runCallback(callback) {
    const result = callback();
    if (result && typeof result.then === 'function') {
      Promise.resolve(result).catch(() => {});
      throw new TypeError(
        'Await asynchronous preparation before starting a history transaction.'
      );
    }
    return result;
  }

  commit(label, before, after) {
    const changes = difference(before.records, after.records);
    if (!changes.size) return false;
    this.entries.splice(this.cursor);
    this.entries.push({
      label: String(label || 'Edit scene'),
      changes,
      beforeSelection: before.selection,
      afterSelection: after.selection
    });
    if (this.entries.length > LIMIT) this.entries.shift();
    this.cursor = this.entries.length;
    this.updateExports(after.records);
    this.inspector.persistence?.markDirty();
    Events.emit('scenechanged');
    return true;
  }

  // Tokens prevent stale mouseup/blur callbacks from closing another interaction.
  beginGroup(label, owner) {
    this.assertAvailable();
    if (this.depth) return null;
    if (this.group?.owner === owner) return this.group;
    this.endGroup();
    this.group = { label, owner, before: this.capture(), running: false };
    this.publish();
    return this.group;
  }

  inGroup(token, callback) {
    if (!token || this.group !== token) return callback();
    token.running = true;
    try {
      return callback();
    } catch (error) {
      this.group = null;
      this.pendingSelection = null;
      this.replaying = true;
      try {
        this.apply(
          difference(this.capture().records, token.before.records),
          'after'
        );
        this.refresh(token.before.selection);
        this.updateExports(this.capture().records);
        this.restoreSaveState(token.before.saveState);
      } finally {
        this.replaying = false;
        this.prune();
        this.publish();
      }
      throw error;
    } finally {
      token.running = false;
    }
  }

  endGroup(token) {
    if (!this.group || (token && token !== this.group)) return;
    const group = this.group;
    this.group = null;
    if (!this.commit(group.label, group.before, this.capture())) {
      this.restoreSaveState(group.before.saveState);
    }
    this.prune();
    this.publish();
  }

  // Reparenting clones the subtree to respect A-Frame's lifecycle. Transfer keys
  // so earlier entries still address its new descendants.
  transfer(original, replacement) {
    const copy = (source, target) => {
      if (this.ids.has(source)) {
        const id = this.ids.get(source);
        const previous = this.ids.get(target);
        if (previous !== undefined && previous !== id) {
          this.nodes.delete(previous);
          if (this.pendingSelection === previous) this.pendingSelection = id;
        }
        this.ids.set(target, id);
        this.nodes.set(id, target);
      }
      [...source.childNodes].forEach((child, index) => {
        if (target.childNodes[index]) copy(child, target.childNodes[index]);
      });
    };
    copy(original, replacement);
  }

  /** Apply only changed fields; unrelated authored edits remain untouched. */
  apply(changes, direction) {
    const current = this.capture();
    const desired = new Map(current.records);
    const opposite = direction === 'before' ? 'after' : 'before';
    changes.forEach((change, id) => {
      const target = change[direction];
      const source = change[opposite];
      if (!target) desired.delete(id);
      else if (!source || !desired.has(id)) desired.set(id, target);
      else {
        const record = { ...desired.get(id) };
        ['parent', 'children', 'text'].forEach((key) => {
          if (!same(source[key], target[key])) record[key] = target[key];
        });
        if (target.attrs) {
          record.attrs = { ...record.attrs };
          new Set([
            ...Object.keys(source.attrs),
            ...Object.keys(target.attrs)
          ]).forEach((name) => {
            if (source.attrs[name] === target.attrs[name]) return;
            if (name in target.attrs) record.attrs[name] = target.attrs[name];
            else delete record.attrs[name];
          });
        }
        desired.set(id, record);
      }
    });
    const recreate = new Set();
    const markSubtree = (id) => {
      if (recreate.has(id)) return;
      recreate.add(id);
      desired.get(id)?.children?.forEach(markSubtree);
    };
    desired.forEach((record, id) => {
      const previous = current.records.get(id);
      if (!previous || previous.parent !== record.parent) markSubtree(id);
    });
    // insertBefore on an already connected A-Frame entity tears down components,
    // even within the same parent. Recreate only nodes that actually change order.
    desired.forEach((record) => {
      if (!record.children || recreate.has(record.id)) return;
      const order = (current.records.get(record.id)?.children || []).filter(
        (id) => desired.get(id)?.parent === record.id
      );
      let anchor = null;
      [...record.children].reverse().forEach((id) => {
        const index = order.indexOf(id);
        const next = index < 0 ? undefined : (order[index + 1] ?? null);
        if (index < 0 || next !== anchor) {
          if (index >= 0) {
            markSubtree(id);
            order.splice(index, 1);
          }
          const position =
            anchor === null ? order.length : order.indexOf(anchor);
          order.splice(position, 0, id);
        }
        anchor = id;
      });
    });
    const removed = [];
    current.records.forEach((record, id) => {
      if ((!desired.has(id) || recreate.has(id)) && id !== current.root) {
        removed.push(this.nodes.get(id));
      }
    });
    // Remove before reinserting so selectors never see two copies of the subtree.
    removed.forEach((node) => node?.parentNode?.removeChild(node));
    recreate.forEach((id) => {
      const record = desired.get(id);
      const node =
        record.type === 1
          ? document.createElement(record.tag)
          : record.type === 8
            ? document.createComment(record.text)
            : document.createTextNode(record.text);
      this.ids.set(node, id);
      this.nodes.set(id, node);
    });
    desired.forEach((record, id) => {
      const node = this.nodes.get(id);
      const previous = recreate.has(id) ? null : current.records.get(id);
      if (record.type !== 1) {
        if (node.nodeValue !== record.text) node.nodeValue = record.text;
        return;
      }
      const oldAttrs = previous?.attrs || {};
      const names = [
        ...new Set([...Object.keys(oldAttrs), ...Object.keys(record.attrs)])
      ];
      names.sort((a, b) => (a === 'mixin' ? -1 : b === 'mixin' ? 1 : 0));
      names.forEach((name) => {
        if (oldAttrs[name] === record.attrs[name]) return;
        node.removeAttribute(name);
        if (name in record.attrs) node.setAttribute(name, record.attrs[name]);
        else if (node.object3D && !node.components?.[name]) {
          // Removing a transform component does not reset its Object3D. Restore
          // the implicit transform when undo removes the first authored value.
          if (name === 'position' || name === 'rotation') {
            node.object3D[name].set(0, 0, 0);
          }
          if (name === 'scale') node.object3D.scale.set(1, 1, 1);
          if (name === 'visible') node.object3D.visible = true;
        }
      });
    });
    // Assemble detached subtrees bottom-up, then attach their roots.
    const assemble = (id) => {
      const record = desired.get(id);
      if (!record?.children) return;
      record.children.forEach(assemble);
      const previous = current.records.get(record.id);
      if (
        !recreate.has(record.id) &&
        same(previous?.children, record.children) &&
        !record.children.some((id) => recreate.has(id))
      ) {
        return;
      }
      const parent = this.nodes.get(record.id);
      let anchor = null;
      [...record.children].reverse().forEach((id) => {
        const child = this.nodes.get(id);
        if (!child) throw new Error('Cannot resolve a history node.');
        let next = child.nextSibling;
        while (next && excluded(next)) next = next.nextSibling;
        if (child.parentNode !== parent || next !== anchor) {
          parent.insertBefore(child, anchor);
        }
        anchor = child;
      });
    };
    assemble(current.root);
    return [...recreate].map((id) => this.nodes.get(id));
  }

  waitForLoads(nodes) {
    return Promise.all(
      nodes
        .filter((node) => node.isEntity && !node.hasLoaded)
        .map(
          (node) =>
            new Promise((resolve, reject) => {
              const finish = (error) => {
                clearTimeout(timer);
                node.removeEventListener('loaded', loaded);
                this.pendingLoads.delete(cancel);
                if (error) reject(error);
                else resolve();
              };
              const loaded = (event) => {
                if (event.target === node) finish();
              };
              const cancel = () =>
                finish(new Error('History replay was cancelled.'));
              const timer = setTimeout(
                () => finish(new Error('Restored entity did not initialize.')),
                15000
              );
              this.pendingLoads.add(cancel);
              node.addEventListener('loaded', loaded);
            })
        )
    );
  }

  refresh(selection) {
    const inspector = this.inspector;
    if (this.disposed) return;
    const scene = inspector.sceneEl;
    const entity = this.nodes.get(selection);
    inspector.selectEntity(
      entity && (entity === scene || scene.contains(entity)) ? entity : null
    );
    if (inspector.helpers && inspector.sceneHelpers) {
      Object.values(inspector.helpers).forEach((helper) => {
        inspector.sceneHelpers.remove(helper);
        helper.dispose?.();
      });
      inspector.helpers = {};
      scene.object3D?.traverse((object) => {
        if (object.userData?.source !== 'INSPECTOR') {
          inspector.addHelper(object);
        }
      });
      inspector.selectEntity(inspector.selectedEntity);
    }
    this.capture().records.forEach((record, id) => {
      const node = this.nodes.get(id);
      if (!node.isEntity) return;
      Object.keys(node.components || {}).forEach((component) =>
        Events.emit('entityupdate', {
          entity: node,
          component,
          property: '',
          value: node.getAttribute(component)
        })
      );
    });
    Events.emit('entitycreated');
    Events.emit('historyreplayed');
    Events.emit('scenechanged');
    inspector.persistence?.markDirty();
  }

  async replay(direction) {
    if (
      this.busy ||
      (direction === 'before' ? !this.canUndo() : !this.canRedo())
    ) {
      return false;
    }
    const entry =
      this.entries[direction === 'before' ? this.cursor - 1 : this.cursor];
    const before = this.capture();
    const generation = this.generation;
    const cursor = this.cursor;
    this.replaying = true;
    try {
      this.publish();
      await this.waitForLoads(this.apply(entry.changes, direction));
      if (generation !== this.generation || this.disposed) {
        throw new Error('The scene changed during history replay.');
      }
      this.refresh(
        direction === 'before' ? entry.beforeSelection : entry.afterSelection
      );
      this.cursor += direction === 'before' ? -1 : 1;
      this.updateExports(this.capture().records);
      return true;
    } catch (error) {
      this.pendingLoads.forEach((cancel) => cancel());
      if (generation === this.generation && !this.disposed) {
        this.cursor = cursor;
        await this.waitForLoads(
          this.apply(
            difference(this.capture().records, before.records),
            'after'
          )
        );
        this.refresh(before.selection);
        this.updateExports(this.capture().records);
        this.restoreSaveState(before.saveState);
      }
      throw error;
    } finally {
      this.replaying = false;
      this.prune();
      this.publish();
    }
  }

  undo() {
    return this.replay('before');
  }

  redo() {
    return this.replay('after');
  }

  updateExports(records) {
    Object.keys(this.updates).forEach((id) => delete this.updates[id]);
    records.forEach((record, key) => {
      if (!record.attrs || !record.attrs.id) return;
      const baseline = this.baseline?.get(key)?.attrs || {};
      const changed = {};
      new Set([...Object.keys(baseline), ...Object.keys(record.attrs)]).forEach(
        (name) => {
          if (baseline[name] === record.attrs[name]) return;
          const component = this.nodes.get(key)?.components?.[name];
          if (!(name in record.attrs)) changed[name] = null;
          else if (
            component &&
            !AFRAME.schema.isSingleProperty(component.schema)
          ) {
            const authored = this.nodes.get(key).getDOMAttribute(name);
            changed[name] = Object.fromEntries(
              Object.keys(authored || {})
                .filter((property) => authored[property] !== undefined)
                .map((property) => [
                  property,
                  authored[property] === null
                    ? ''
                    : (component.schema[property]?.stringify(
                        authored[property]
                      ) ?? authored[property])
                ])
            );
          } else changed[name] = record.attrs[name];
        }
      );
      if (Object.keys(changed).length) {
        Object.defineProperty(this.updates, record.attrs.id, {
          value: changed,
          configurable: true,
          enumerable: true,
          writable: true
        });
      }
    });
  }

  prune() {
    const scene = this.inspector.sceneEl;
    this.nodes.forEach((node, id) => {
      if (
        this.ids.get(node) !== id ||
        (node !== scene && !scene.contains(node))
      ) {
        this.nodes.delete(id);
      }
    });
  }

  clear() {
    if (this.busy) {
      throw new Error('Cannot clear history while an operation is active.');
    }
    this.reset();
  }

  // Lifecycle reset can cancel replay when the inspector reloads or is destroyed.
  reset() {
    this.generation++;
    this.pendingLoads.forEach((cancel) => cancel());
    this.group = null;
    this.pendingSelection = null;
    this.entries = [];
    this.cursor = 0;
    this.nodes.clear();
    this.baseline = this.capture().records;
    this.updateExports(this.baseline);
    this.publish();
  }

  dispose() {
    this.generation++;
    this.disposed = true;
    this.pendingLoads.forEach((cancel) => cancel());
    this.group = null;
    this.entries = [];
    this.cursor = 0;
    this.nodes.clear();
    this.baseline.clear();
    Object.keys(this.updates).forEach((id) => delete this.updates[id]);
    this.publish();
  }
}

export function record(label, callback) {
  const history = AFRAME.INSPECTOR?.history;
  if (history instanceof History) history.assertAvailable();
  // Gestures already captured their starting state. Do not walk the scene on
  // every pointermove; the ending snapshot produces their single reversible diff.
  if (history instanceof History && history.group?.running) {
    return history.runCallback(callback);
  }
  return history instanceof History
    ? history.transaction(label, callback)
    : callback();
}

/** Focus alone is inert: widgets group only committed authored values. */
export function recordInput(owner, label, callback) {
  const history = AFRAME.INSPECTOR?.history;
  if (!(history instanceof History)) return callback();
  const token = history.beginGroup(label, owner);
  return history.inGroup(token, () => record(label, callback));
}

export function finishInput(owner) {
  const history = AFRAME.INSPECTOR?.history;
  if (history?.group?.owner === owner) history.endGroup(history.group);
}

/** A load from an undone/replaced action must not steal the current selection. */
export function whenLoaded(entity, callback) {
  const history = AFRAME.INSPECTOR?.history;
  const generation = history?.generation;
  const selectedBefore = history?.inspector.selectedEntity;
  if (history instanceof History) history.pendingSelection = history.id(entity);
  const loaded = (event) => {
    if (event.target !== entity) return;
    entity.removeEventListener('loaded', loaded);
    // Some primitives load during appendChild; run after the transaction commits.
    Promise.resolve().then(() => {
      if (
        !entity.isConnected ||
        history?.disposed ||
        history?.replaying ||
        (history && generation !== history.generation)
      ) {
        return;
      }
      if (history instanceof History) {
        const id = history.ids.get(entity);
        const entry = history.entries[history.cursor - 1];
        if (
          history.nodes.get(id) !== entity ||
          !entry?.changes.get(id)?.after ||
          history.cursor !== history.entries.length
        ) {
          return;
        }
        if (history.inspector.selectedEntity !== selectedBefore) {
          return;
        }
        entry.afterSelection = id;
      }
      callback();
    });
  };
  entity.addEventListener('loaded', loaded);
}
