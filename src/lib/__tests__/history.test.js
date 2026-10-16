/* eslint-env jest */
import Events from '../Events';
import {
  History,
  record,
  recordInput,
  finishInput,
  whenLoaded
} from '../history';
import { createDocument, createAFrame } from '../__fixtures__/scene';

describe('authored scene history', () => {
  let history;
  let inspector;
  let scene;
  let entity;
  let originalDocument;
  let originalAFrame;

  beforeEach(() => {
    originalDocument = global.document;
    originalAFrame = global.AFRAME;
    global.document = createDocument();
    global.AFRAME = createAFrame();
    scene = document.createElement('a-scene');
    scene.connectedRoot = true;
    entity = document.createElement('a-entity');
    entity.id = 'box';
    scene.appendChild(entity);
    inspector = {
      sceneEl: scene,
      selectedEntity: entity,
      selectEntity(value) {
        this.selectedEntity = value;
      },
      persistence: { markDirty: jest.fn() }
    };
    history = new History(inspector);
    inspector.history = history;
    global.AFRAME.INSPECTOR = inspector;
  });

  afterEach(() => {
    history.dispose();
    global.document = originalDocument;
    global.AFRAME = originalAFrame;
  });

  it('returns results, publishes state and replays attribute changes without replacing unaffected nodes', async () => {
    const states = [];
    const listener = (state) => states.push(state);
    Events.on('historychanged', listener);
    try {
      expect(
        history.transaction('Hide', () => {
          entity.setAttribute('visible', false);
          return 42;
        })
      ).toBe(42);
      expect(history.getState()).toEqual({
        canUndo: true,
        canRedo: false,
        undoCount: 1,
        redoCount: 0,
        undoLabel: 'Hide',
        redoLabel: null,
        busy: false
      });
      expect(states.some((state) => state.busy)).toBe(true);
      expect(await history.undo()).toBe(true);
      expect(scene.firstChild).toBe(entity);
      expect(entity.hasAttribute('visible')).toBe(false);
      expect(await history.redo()).toBe(true);
      expect(entity.getAttribute('visible')).toBe('false');
      expect(inspector.persistence.markDirty).toHaveBeenCalled();
    } finally {
      Events.off('historychanged', listener);
    }
  });

  it('handles empty stacks, no-ops, redo branching and the 100-entry limit', async () => {
    expect(await history.undo()).toBe(false);
    expect(await history.redo()).toBe(false);
    history.transaction('No-op', () => {});
    expect(history.entries).toHaveLength(0);
    for (let i = 0; i < 105; i++) {
      history.transaction('Edit ' + i, () => entity.setAttribute('title', i));
    }
    expect(history.entries).toHaveLength(100);
    await history.undo();
    history.transaction('No-op', () => {});
    expect(history.canRedo()).toBe(true);
    history.transaction('Branch', () => entity.setAttribute('class', 'other'));
    expect(history.canRedo()).toBe(false);
    expect(history.getState().undoLabel).toBe('Branch');
  });

  it('groups nested transactions and rolls back failed synchronous callbacks', async () => {
    history.transaction('Combined', () => {
      entity.setAttribute('class', 'new');
      expect(history.canUndo()).toBe(false);
      history.transaction('Nested', () => entity.setAttribute('title', 'new'));
    });
    expect(history.entries).toHaveLength(1);
    expect(() =>
      history.transaction('Failed', () => {
        entity.setAttribute('class', 'broken');
        entity.remove();
        throw new Error('failure');
      })
    ).toThrow('failure');
    entity = scene.firstChild;
    expect(entity.getAttribute('class')).toBe('new');
    expect(history.entries).toHaveLength(1);
    await history.undo();
    expect(entity.hasAttribute('class')).toBe(false);
    expect(entity.hasAttribute('title')).toBe(false);
  });

  it('rolls back a nested failure even if the outer callback catches it', async () => {
    history.transaction('Outer', () => {
      entity.setAttribute('title', 'outer');
      try {
        history.transaction('Inner', () => {
          entity.setAttribute('class', 'invalid');
          throw new Error('inner failed');
        });
      } catch (error) {
        expect(error.message).toBe('inner failed');
      }
      entity.setAttribute('title', 'finished');
    });
    expect(entity.hasAttribute('class')).toBe(false);
    expect(history.entries).toHaveLength(1);
    await history.undo();
    expect(entity.hasAttribute('title')).toBe(false);
  });

  it('restores implicit transforms when removing the first authored transform', async () => {
    const position = { set: jest.fn() };
    entity.object3D = { position };
    history.transaction('Move', () => entity.setAttribute('position', '2 0 0'));
    await history.undo();
    expect(entity.hasAttribute('position')).toBe(false);
    expect(position.set).toHaveBeenCalledWith(0, 0, 0);
  });

  it('rejects asynchronous transactions and rolls back returned promises', () => {
    expect(() => history.transaction('Async', async () => {})).toThrow(
      TypeError
    );
    expect(() =>
      history.transaction('Thenable', () => {
        entity.setAttribute('title', 'temporary');
        return Promise.resolve();
      })
    ).toThrow(TypeError);
    expect(entity.hasAttribute('title')).toBe(false);
    expect(history.entries).toHaveLength(0);
  });

  it('groups text, color, keyboard numbers and scrubs by interaction owner', async () => {
    const owner = {};
    recordInput(owner, 'Edit value', () => entity.setAttribute('title', 'a'));
    recordInput(owner, 'Edit value', () => entity.setAttribute('title', 'ab'));
    expect(history.getState().busy).toBe(true);
    expect(await history.undo()).toBe(false);
    expect(() => history.clear()).toThrow();
    finishInput({});
    expect(history.getState().busy).toBe(true);
    finishInput(owner);
    expect(history.entries).toHaveLength(1);
    await history.undo();
    expect(entity.hasAttribute('title')).toBe(false);
    await history.redo();
    expect(entity.getAttribute('title')).toBe('ab');
  });

  it('records one transform gesture and drops a gesture that returns to its starting value', async () => {
    entity.setAttribute('position', '0 0 0');
    const owner = {};
    let token = history.beginGroup('Transform', owner);
    history.inGroup(token, () =>
      record('Move', () => entity.setAttribute('position', '1 0 0'))
    );
    history.inGroup(token, () =>
      record('Move', () => entity.setAttribute('position', '2 0 0'))
    );
    history.endGroup(token);
    expect(history.entries).toHaveLength(1);
    await history.undo();
    expect(entity.getAttribute('position')).toBe('0 0 0');
    token = history.beginGroup('No-op transform', owner);
    history.inGroup(token, () => entity.setAttribute('position', '1 0 0'));
    history.inGroup(token, () => entity.setAttribute('position', '0 0 0'));
    history.endGroup(token);
    expect(history.canRedo()).toBe(true);
  });

  it('preserves authored component properties, selectors, multi-instance names and removal', async () => {
    entity.setAttribute('material', { color: 'red', opacity: 0.5 });
    entity.setAttribute('behavior__one', { target: '#box', value: 'first' });
    history.clear();
    history.transaction('Components', () => {
      entity.removeAttribute('material', 'opacity');
      entity.setAttribute('behavior__one', 'target', '.other');
      entity.setAttribute('behavior__two', { target: '#box' });
      entity.setAttribute('mixin', 'shared other');
    });
    await history.undo();
    expect(entity.getDOMAttribute('material')).toEqual({
      color: 'red',
      opacity: '0.5'
    });
    expect(entity.getDOMAttribute('behavior__one').target).toBe('#box');
    expect(entity.hasAttribute('behavior__two')).toBe(false);
    expect(entity.hasAttribute('mixin')).toBe(false);
    await history.redo();
    expect(entity.getDOMAttribute('material')).toEqual({ color: 'red' });
    expect(entity.getDOMAttribute('behavior__one').target).toBe('.other');
    history.transaction('Remove material', () =>
      entity.removeAttribute('material')
    );
    expect(history.updates.box.material).toBeNull();
    await history.undo();
    expect(entity.getDOMAttribute('material')).toEqual({ color: 'red' });
  });

  it('restores subtrees and selection, then resolves older edits against recreated descendants', async () => {
    const child = document.createElement('a-entity');
    child.id = 'same';
    entity.appendChild(child);
    const sibling = document.createElement('a-entity');
    sibling.id = 'same';
    scene.appendChild(sibling);
    inspector.selectedEntity = child;
    history.clear();
    history.transaction('Child edit', () =>
      child.setAttribute('title', 'edited')
    );
    history.transaction('Delete subtree', () => {
      entity.remove();
      inspector.selectedEntity = sibling;
    });
    expect([...history.nodes.values()]).not.toContain(entity);
    await history.undo();
    const restored = scene.firstChild;
    const restoredChild = restored.firstChild;
    expect(restored).not.toBe(entity);
    expect(restoredChild.id).toBe('same');
    expect(inspector.selectedEntity).toBe(restoredChild);
    expect(scene.childNodes[1]).toBe(sibling);
    await history.undo();
    expect(restoredChild.hasAttribute('title')).toBe(false);
    await history.redo();
    expect(restoredChild.getAttribute('title')).toBe('edited');
    await history.redo();
    expect(scene.firstChild).toBe(sibling);
    expect(inspector.selectedEntity).toBe(sibling);
  });

  it('replays hierarchy moves and order together with local transform adjustments', async () => {
    const parent = document.createElement('a-entity');
    const sibling = document.createElement('a-entity');
    scene.appendChild(parent);
    scene.appendChild(sibling);
    entity.setAttribute('position', '1 0 0');
    history.clear();
    history.transaction('Reparent', () => {
      parent.appendChild(entity);
      entity.setAttribute('position', '-4 0 0');
    });
    await history.undo();
    expect(scene.firstChild.getAttribute('position')).toBe('1 0 0');
    expect(scene.children[1]).toBe(parent);
    await history.redo();
    expect(parent.firstChild.getAttribute('position')).toBe('-4 0 0');
    history.transaction('Reorder', () => scene.insertBefore(sibling, parent));
    await history.undo();
    expect(scene.firstChild).toBe(parent);
    await history.redo();
    expect(scene.children.map((node) => history.ids.get(node))).toEqual([
      history.ids.get(sibling),
      history.ids.get(parent)
    ]);
  });

  it('transfers stable descendant keys when the editor clones to reparent', async () => {
    const child = document.createElement('a-entity');
    entity.appendChild(child);
    history.clear();
    history.transaction('Edit child', () =>
      child.setAttribute('title', 'value')
    );
    const replacement = document.createElement('a-entity');
    replacement.id = entity.id;
    const replacementChild = document.createElement('a-entity');
    replacementChild.setAttribute('title', 'value');
    replacement.appendChild(replacementChild);
    history.transaction('Clone-based move', () => {
      entity.remove();
      scene.appendChild(replacement);
      history.transfer(entity, replacement);
    });
    await history.undo();
    // Identical authored state means the clone-based move itself was a no-op.
    expect(replacementChild.hasAttribute('title')).toBe(false);
  });

  it('refreshes export changes after renaming and leaves unrelated attributes alone', async () => {
    history.transaction('Edit', () =>
      entity.setAttribute('material', { color: 'blue' })
    );
    expect(history.updates.box.material.color).toBe('blue');
    history.transaction('Rename', () => {
      entity.id = 'renamed';
    });
    expect(history.updates.box).toBeUndefined();
    expect(history.updates.renamed.material.color).toBe('blue');
    entity.setAttribute('title', 'external');
    await history.undo();
    expect(entity.id).toBe('box');
    expect(entity.getAttribute('title')).toBe('external');
    expect(history.updates.renamed).toBeUndefined();
  });

  it('suppresses recording during replay, rejects overlapping replay and rolls back failures', async () => {
    history.transaction('Edit', () => entity.setAttribute('title', 'new'));
    const original = history.waitForLoads.bind(history);
    history.waitForLoads = jest
      .fn()
      .mockRejectedValueOnce(new Error('load failed'))
      .mockImplementation(original);
    const undo = history.undo();
    expect(await history.redo()).toBe(false);
    expect(() => record('Invalid', () => {})).toThrow();
    await expect(undo).rejects.toThrow('load failed');
    expect(entity.getAttribute('title')).toBe('new');
    expect(history.cursor).toBe(1);
    expect(history.getState().busy).toBe(false);
  });

  it('cancels pending loads on reset without restoring an obsolete cursor', async () => {
    jest.useFakeTimers();
    const createElement = document.createElement;
    try {
      history.transaction('Delete', () => entity.remove());
      document.createElement = (tag) => {
        const node = createElement(tag);
        node.hasLoaded = false;
        return node;
      };
      const undo = history.undo();
      expect(history.pendingLoads.size).toBe(1);
      history.reset();
      await expect(undo).rejects.toThrow('cancelled');
      expect(history.cursor).toBe(0);
      expect(history.entries).toHaveLength(0);
      expect(history.canUndo()).toBe(false);
      expect(history.pendingLoads.size).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      document.createElement = createElement;
      jest.useRealTimers();
    }
  });

  it('rolls back timed-out entity restoration and releases load listeners', async () => {
    jest.useFakeTimers();
    const createElement = document.createElement;
    try {
      history.transaction('Delete', () => entity.remove());
      document.createElement = (tag) => {
        const node = createElement(tag);
        node.hasLoaded = false;
        return node;
      };
      const undo = history.undo();
      jest.advanceTimersByTime(15000);
      await expect(undo).rejects.toThrow('did not initialize');
      expect(scene.children).toHaveLength(0);
      expect(history.cursor).toBe(1);
      expect(history.pendingLoads.size).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      document.createElement = createElement;
      jest.useRealTimers();
    }
  });

  it('does not let a delayed loaded callback select an undone entity', async () => {
    let created;
    const callback = jest.fn();
    history.transaction('Create', () => {
      created = document.createElement('a-entity');
      whenLoaded(created, callback);
      scene.appendChild(created);
    });
    await history.undo();
    created.emit('loaded');
    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
    await history.redo();
    expect(inspector.selectedEntity).toBe(scene.children[1]);
  });

  it('ignores editor/injected nodes and records asset and material insertion together', async () => {
    const helper = document.createElement('a-entity');
    helper.setAttribute('data-aframe-inspector', 'helper');
    scene.appendChild(helper);
    history.transaction('Helper change', () =>
      helper.setAttribute('visible', false)
    );
    expect(history.entries).toHaveLength(0);
    history.transaction('Texture', () => {
      const assets = document.createElement('a-assets');
      const image = document.createElement('img');
      image.id = 'texture';
      image.setAttribute('src', 'image.png');
      assets.appendChild(image);
      scene.appendChild(assets);
      entity.setAttribute('material', { src: '#texture' });
    });
    await history.undo();
    expect(scene.children).toEqual([entity, helper]);
    await history.redo();
    expect(scene.querySelector('img').id).toBe('texture');
    expect(entity.getDOMAttribute('material').src).toBe('#texture');
    expect(helper.parentNode).toBe(scene);
  });

  it('resets its baseline on lifecycle reset and releases entries on disposal', () => {
    history.transaction('Edit', () => entity.setAttribute('title', 'value'));
    history.reset();
    expect(history.canUndo()).toBe(false);
    expect(history.updates).toEqual({});
    history.transaction('Edit', () => entity.setAttribute('class', 'value'));
    history.dispose();
    expect(history.entries).toHaveLength(0);
    expect(history.nodes.size).toBe(0);
    expect(history.baseline.size).toBe(0);
    expect(() => history.transaction('Unavailable', () => {})).toThrow();
  });
});
