import React from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash.debounce';
import Entity from './Entity';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from '../AwesomeIcon';
import Toolbar from './Toolbar';
import Events, { createEventScope } from '../../lib/Events';

const ROW_HEIGHT = 40;
const OVERSCAN = 5;
let nextTreeId = 0;

export default class SceneGraph extends React.Component {
  static propTypes = {
    scene: PropTypes.object,
    selectedEntity: PropTypes.object,
    visible: PropTypes.bool
  };
  state = {
    entities: [],
    expandedElements: new WeakMap(),
    filter: '',
    scrollTop: 0,
    height: 600
  };
  events = createEventScope();
  outliner = React.createRef();
  rowIds = new WeakMap();
  batchChanges = debounce(() => this.rebuildEntityOptions(), 50, {
    maxWait: 150
  });

  componentDidMount() {
    this.state.expandedElements.set(this.props.scene, true);
    this.rebuildEntityOptions();
    ['entityidchange', 'entitycreated', 'entityclone'].forEach((name) =>
      this.events.on(name, this.rebuildEntityOptions)
    );
    this.events.on('entityupdate', (detail) => {
      if (detail.component === 'mixin' || detail.component === 'scenegraph')
        this.rebuildEntityOptions();
    });
    this.bindScene(this.props.scene);
    this.observeSize();
  }

  componentWillUnmount() {
    this.events.dispose();
    this.batchChanges.cancel();
    this.bindScene(null);
    this.resizeObserver?.disconnect();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.scene !== this.props.scene) {
      this.batchChanges.cancel();
      this.bindScene(this.props.scene);
      this.setState(
        {
          expandedElements: new WeakMap([[this.props.scene, true]]),
          filter: '',
          scrollTop: 0
        },
        this.rebuildEntityOptions
      );
    }
    if (
      prevProps.selectedEntity !== this.props.selectedEntity &&
      this.props.selectedEntity
    )
      this.revealSelection();
    if (prevProps.visible !== this.props.visible) this.observeSize();
  }

  observeSize() {
    this.resizeObserver?.disconnect();
    const element = this.outliner.current;
    if (!element) return;
    const update = () => this.setState({ height: element.clientHeight || 400 });
    this.resizeObserver = new ResizeObserver(update);
    this.resizeObserver.observe(element);
    update();
  }

  bindScene(scene) {
    ['child-attached', 'child-detached'].forEach((name) => {
      this.boundScene?.removeEventListener(name, this.onChildChange);
      scene?.addEventListener(name, this.onChildChange);
    });
    this.boundScene = scene;
  }

  onChildChange = (event) => {
    if (!event.detail.el?.closest?.('[data-aframe-inspector]'))
      this.batchChanges();
  };

  rebuildEntityOptions = () => {
    if (!this.props.scene) return;
    this.batchChanges.cancel();
    const entities = [];
    const visit = (entity, depth) => {
      entities.push({ entity, depth });
      [...entity.children]
        .filter(
          (child) =>
            child.isEntity &&
            !child.isInspector &&
            !child.dataset.isInspector &&
            !('aframeInspector' in child.dataset)
        )
        .forEach((child) => visit(child, depth + 1));
    };
    visit(this.props.scene, 0);
    this.setState({ entities });
  };

  getVisibleEntities = () =>
    this.state.entities.filter(({ entity }) => {
      const filter = this.state.filter.trim();
      if (filter) {
        if (
          [entity.id, entity.tagName, entity.className].some((text) =>
            String(text).toLowerCase().includes(filter.toLowerCase())
          )
        )
          return true;
        try {
          return entity.matches(filter);
        } catch (error) {
          return false;
        }
      }
      let parent = entity.parentElement;
      while (parent?.isEntity) {
        if (!this.state.expandedElements.get(parent)) return false;
        parent = parent.parentElement;
      }
      return true;
    });

  rowId = (entity) => {
    if (!this.rowIds.has(entity))
      this.rowIds.set(entity, 'scene-tree-item-' + ++nextTreeId);
    return this.rowIds.get(entity);
  };

  selectEntity = (entity) => {
    Events.emit('entityselect', entity);
  };

  handleRowSelect = (entity) => {
    this.selectEntity(entity);
    this.outliner.current?.focus();
  };

  revealSelection = () => {
    let parent = this.props.selectedEntity.parentElement;
    while (parent?.isEntity) {
      this.state.expandedElements.set(parent, true);
      parent = parent.parentElement;
    }
    this.setState({ expandedElements: this.state.expandedElements }, () => {
      const index = this.getVisibleEntities().findIndex(
        ({ entity }) => entity === this.props.selectedEntity
      );
      const element = this.outliner.current;
      if (index < 0 || !element) return;
      const top = index * ROW_HEIGHT;
      if (top < element.scrollTop) element.scrollTop = top;
      else if (top + ROW_HEIGHT > element.scrollTop + element.clientHeight)
        element.scrollTop = top + ROW_HEIGHT - element.clientHeight;
      this.setState({ scrollTop: element.scrollTop });
    });
  };

  toggleExpandedCollapsed = (entity) => {
    this.state.expandedElements.set(
      entity,
      !this.state.expandedElements.get(entity)
    );
    this.setState({ expandedElements: this.state.expandedElements });
  };

  onKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    const rows = this.getVisibleEntities();
    if (!rows.length) return;
    const index = rows.findIndex(
      ({ entity }) => entity === this.props.selectedEntity
    );
    const selected = rows[index]?.entity;
    let next;
    switch (event.key) {
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = rows.length - 1;
        break;
      case 'ArrowUp':
        next = Math.max(0, index - 1);
        break;
      case 'ArrowDown':
        next = Math.min(rows.length - 1, index + 1);
        break;
      case 'ArrowRight':
        if (
          selected &&
          !this.state.filter &&
          !this.state.expandedElements.get(selected)
        )
          this.toggleExpandedCollapsed(selected);
        else next = Math.min(rows.length - 1, index + 1);
        break;
      case 'ArrowLeft':
        if (
          selected &&
          !this.state.filter &&
          this.state.expandedElements.get(selected)
        )
          this.toggleExpandedCollapsed(selected);
        else
          next = rows.findIndex(
            ({ entity }) => entity === selected?.parentElement
          );
        break;
      case 'Enter':
      case ' ':
        next = Math.max(0, index);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (next >= 0) this.selectEntity(rows[next].entity);
  };

  onDragStart = (event, entity) => {
    this.draggedEntity = entity;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', this.rowId(entity));
  };

  onDrop = (event, target, requestedPlace) => {
    event.preventDefault();
    const original = this.draggedEntity;
    this.draggedEntity = null;
    if (!original || original === target || original.contains(target)) return;
    const place = ['before', 'after'].includes(requestedPlace)
      ? requestedPlace
      : 'inside';
    const parent = place === 'inside' ? target : target.parentElement;
    if (!parent?.object3D) return;
    original.object3D.updateWorldMatrix(true, false);
    parent.object3D.updateWorldMatrix(true, false);
    const matrix = new THREE.Matrix4()
      .copy(parent.object3D.matrixWorld)
      .invert()
      .multiply(original.object3D.matrixWorld);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);
    // Serialize every descendant before cloning so component edits survive reparenting.
    [original, ...original.querySelectorAll('*')].forEach((node) =>
      node.flushToDOM?.()
    );
    const clone = original.cloneNode(true);
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);
    clone.setAttribute('position', position.toArray().join(' '));
    clone.setAttribute(
      'rotation',
      [rotation.x, rotation.y, rotation.z]
        .map(THREE.MathUtils.radToDeg)
        .join(' ')
    );
    clone.setAttribute('scale', scale.toArray().join(' '));
    clone.addEventListener(
      'loaded',
      () => {
        this.selectEntity(clone);
        Events.emit('entitycreated', clone);
      },
      { once: true }
    );
    try {
      if (place === 'inside') parent.appendChild(clone);
      else
        parent.insertBefore(
          clone,
          place === 'before' ? target : target.nextSibling
        );
      original.remove();
      Events.emit('scenechanged');
      this.rebuildEntityOptions();
    } catch (error) {
      clone.remove();
    }
  };

  render() {
    if (!this.props.visible) return null;
    const rows = this.getVisibleEntities();
    const first = Math.max(
      0,
      Math.min(
        Math.floor(this.state.scrollTop / ROW_HEIGHT) - OVERSCAN,
        Math.max(0, rows.length - 1)
      )
    );
    const end = Math.min(
      rows.length,
      first + Math.ceil(this.state.height / ROW_HEIGHT) + OVERSCAN * 2
    );
    const selected = rows.findIndex(
      ({ entity }) => entity === this.props.selectedEntity
    );
    return (
      <div id="scenegraph" className="scenegraph">
        <div className="scenegraph-toolbar">
          <Toolbar />
          <div className="search">
            <input
              id="filter"
              aria-label="Search scene entities"
              placeholder="Search..."
              value={this.state.filter}
              onChange={(event) => {
                if (this.outliner.current) this.outliner.current.scrollTop = 0;
                this.setState({ filter: event.target.value, scrollTop: 0 });
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  this.setState({ filter: '' });
                }
              }}
            />
            {this.state.filter ? (
              <button
                type="button"
                aria-label="Clear scene search"
                onClick={() => {
                  if (this.outliner.current)
                    this.outliner.current.scrollTop = 0;
                  this.setState({ filter: '', scrollTop: 0 });
                }}
              >
                <AwesomeIcon icon={faTimes} />
              </button>
            ) : (
              <AwesomeIcon icon={faSearch} />
            )}
          </div>
        </div>
        <div
          className="outliner"
          role="tree"
          aria-label="Scene entities"
          tabIndex="0"
          ref={this.outliner}
          aria-activedescendant={
            selected >= first && selected < end
              ? this.rowId(this.props.selectedEntity)
              : undefined
          }
          onKeyDown={this.onKeyDown}
          onScroll={(event) =>
            this.setState({ scrollTop: event.currentTarget.scrollTop })
          }
        >
          <div
            role="presentation"
            aria-hidden="true"
            style={{ height: first * ROW_HEIGHT }}
          />
          {rows.slice(first, end).map(({ entity, depth }) => (
            <Entity
              key={this.rowId(entity)}
              id={this.rowId(entity)}
              depth={depth}
              entity={entity}
              isFiltering={!!this.state.filter}
              isExpanded={!!this.state.expandedElements.get(entity)}
              isSelected={entity === this.props.selectedEntity}
              selectEntity={this.handleRowSelect}
              toggleExpandedCollapsed={this.toggleExpandedCollapsed}
              onDragStart={this.onDragStart}
              onDrop={this.onDrop}
            />
          ))}
          <div
            role="presentation"
            aria-hidden="true"
            style={{ height: (rows.length - end) * ROW_HEIGHT }}
          />
          {!rows.length && <p role="status">No matching entities.</p>}
        </div>
      </div>
    );
  }
}
