/* eslint-disable no-unused-vars, react/no-danger */
import React from 'react';
import PropTypes from 'prop-types';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from '../AwesomeIcon';
import debounce from 'lodash.debounce';

import Entity from './Entity';
import Toolbar from './Toolbar';
import Events from '../../lib/Events';
import CameraToolbar from '../viewport/CameraToolbar';

export default class SceneGraph extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    onChange: PropTypes.func,
    scene: PropTypes.object,
    selectedEntity: PropTypes.object,
    visible: PropTypes.bool
  };

  static defaultProps = {
    selectedEntity: '',
    index: -1,
    id: 'left-sidebar'
  };

  constructor(props) {
    super(props);
    this.state = {
      entities: [],
      expandedElements: new WeakMap([[props.scene, true]]),
      filter: '',
      filteredEntities: [],
      selectedIndex: -1
    };

    this.rebuildEntityOptions = debounce(
      this.rebuildEntityOptions.bind(this),
      1000
    );
    this.updateFilteredEntities = debounce(
      this.updateFilteredEntities.bind(this),
      500
    );
  }

  componentDidMount() {
    this.rebuildEntityOptions();
    Events.on('entityidchange', this.rebuildEntityOptions);
    Events.on('entitycreated', this.rebuildEntityOptions);
    Events.on('entityclone', this.rebuildEntityOptions);
    Events.on('entityupdate', this.handleEntityUpdate);

    // Listen for DOM changes to keep Scenegraph in sync
    if (this.props.scene) {
      this.props.scene.addEventListener(
        'child-attached',
        this.rebuildEntityOptions
      );
      this.props.scene.addEventListener(
        'child-detached',
        this.rebuildEntityOptions
      );
    }
  }

  componentWillUnmount() {
    Events.off('entityidchange', this.rebuildEntityOptions);
    Events.off('entitycreated', this.rebuildEntityOptions);
    Events.off('entityclone', this.rebuildEntityOptions);
    Events.off('entityupdate', this.handleEntityUpdate);

    if (this.props.scene) {
      this.props.scene.removeEventListener(
        'child-attached',
        this.rebuildEntityOptions
      );
      this.props.scene.removeEventListener(
        'child-detached',
        this.rebuildEntityOptions
      );
    }
  }

  handleEntityUpdate = (detail) => {
    if (detail.component === 'mixin') {
      this.rebuildEntityOptions();
    }
  };

  /**
   * Selected entity updated from somewhere else in the app.
   */
  componentDidUpdate(prevProps) {
    if (prevProps.selectedEntity !== this.props.selectedEntity) {
      this.selectEntity(this.props.selectedEntity);
    }
  }

  selectEntity = (entity) => {
    let found = false;
    for (let i = 0; i < this.state.filteredEntities.length; i++) {
      const entityOption = this.state.filteredEntities[i];
      if (entityOption.entity === entity) {
        this.setState({ selectedEntity: entity, selectedIndex: i });
        // Make sure selected value is visible in scenegraph
        this.expandToRoot(entity);
        if (this.props.onChange) {
          this.props.onChange(entity);
        }
        Events.emit('entityselect', entity, true);
        found = true;
      }
    }

    if (!found) {
      this.setState({ selectedEntity: null, selectedIndex: -1 });
    }
  };

  rebuildEntityOptions = () => {
    const entities = [{ depth: 0, entity: this.props.scene }];

    function treeIterate(element, depth) {
      if (!element) {
        return;
      }
      depth += 1;

      for (let i = 0; i < element.children.length; i++) {
        let entity = element.children[i];

        if (
          entity.dataset.isInspector ||
          !entity.isEntity ||
          entity.isInspector ||
          'aframeInspector' in entity.dataset
        ) {
          continue;
        }

        entities.push({ entity: entity, depth: depth });

        treeIterate(entity, depth);
      }
    }
    treeIterate(this.props.scene, 0);

    this.setState({
      entities: entities,
      filteredEntities: this.getFilteredEntities(this.state.filter, entities)
    });
  };

  selectIndex = (index) => {
    if (index >= 0 && index < this.state.entities.length) {
      this.selectEntity(this.state.entities[index].entity);
    }
  };

  onFilterKeyUp = (event) => {
    if (event.key === 'Escape') {
      // Use event.key for consistency
      this.clearFilter();
    }
  };

  onKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        break;
    }
  };

  onKeyUp = (event) => {
    if (this.props.selectedEntity === null) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        if (this.isExpanded(this.props.selectedEntity)) {
          this.toggleExpandedCollapsed(this.props.selectedEntity);
        }
        break;
      case 'ArrowUp':
        this.selectIndex(
          this.previousExpandedIndexTo(this.state.selectedIndex)
        );
        break;
      case 'ArrowRight':
        if (!this.isExpanded(this.props.selectedEntity)) {
          this.toggleExpandedCollapsed(this.props.selectedEntity);
        }
        break;
      case 'ArrowDown':
        this.selectIndex(this.nextExpandedIndexTo(this.state.selectedIndex));
        break;
    }
  };

  getFilteredEntities(filter, entities) {
    entities = entities || this.state.entities;
    if (!filter) {
      return entities;
    }
    return entities.filter((entityOption) => {
      return filterEntity(entityOption.entity, filter || this.state.filter);
    });
  }

  isVisibleInSceneGraph = (x) => {
    let curr = x.parentNode;
    if (!curr) {
      return false;
    }
    while (curr !== undefined && curr.isEntity) {
      if (!this.isExpanded(curr)) {
        return false;
      }
      curr = curr.parentNode;
    }
    return true;
  };

  isExpanded = (x) => this.state.expandedElements.get(x) === true;

  toggleExpandedCollapsed = (x) => {
    this.setState({
      expandedElements: this.state.expandedElements.set(x, !this.isExpanded(x))
    });
  };

  expandToRoot = (x) => {
    // Expand element all the way to the scene element
    let curr = x.parentNode;
    while (curr !== undefined && curr.isEntity) {
      this.state.expandedElements.set(curr, true);
      curr = curr.parentNode;
    }
    this.setState({ expandedElements: this.state.expandedElements });
  };

  previousExpandedIndexTo = (i) => {
    for (let prevIter = i - 1; prevIter >= 0; prevIter--) {
      const prevEl = this.state.entities[prevIter].entity;
      if (this.isVisibleInSceneGraph(prevEl)) {
        return prevIter;
      }
    }
    return -1;
  };

  nextExpandedIndexTo = (i) => {
    for (
      let nextIter = i + 1;
      nextIter < this.state.entities.length;
      nextIter++
    ) {
      const nextEl = this.state.entities[nextIter].entity;
      if (this.isVisibleInSceneGraph(nextEl)) {
        return nextIter;
      }
    }
    return -1;
  };

  onChangeFilter = (evt) => {
    const filter = evt.target.value;
    this.setState({ filter: filter });
    this.updateFilteredEntities(filter);
  };

  updateFilteredEntities(filter) {
    this.setState({
      filteredEntities: this.getFilteredEntities(filter)
    });
  }

  clearFilter = () => {
    this.setState({ filter: '' });
    this.updateFilteredEntities('');
  };

  onDragStart = (event, entity) => {
    this.draggedEntity = entity;
    event.dataTransfer.effectAllowed = 'move';
  };

  onDrop = (event, entity, place) => {
    console.log('onDrop called', {
      entity,
      place,
      draggedEntity: this.draggedEntity
    });

    if (!this.draggedEntity) {
      console.warn('onDrop: No draggedEntity');
      return;
    }

    if (this.draggedEntity === entity) {
      console.warn('onDrop: Dragged entity is target');
      return;
    }

    // Check if trying to drop into itself or children
    let iter = entity;
    while (iter) {
      if (iter === this.draggedEntity) {
        console.warn('onDrop: Dropping into self/child');
        return;
      }
      iter = iter.parentNode;
    }

    const draggedObject = this.draggedEntity.object3D;
    if (!draggedObject) {
      console.error('onDrop: Missing object3D');
      return;
    }

    // Calculate the new parent
    let newParentEl = entity;
    if (place === 'before' || place === 'after') {
      newParentEl = entity.parentNode;
    }

    console.log('onDrop: Proceeding with Clone & Replace', { newParentEl });

    // 1. Get the current world transform of the dragged entity
    draggedObject.updateMatrixWorld(true);
    const worldMatrix = draggedObject.matrixWorld.clone();

    // Capture draggedEntity in a local variable
    const originalEntity = this.draggedEntity;

    // 2. Clone the entity
    // We clone the node to create a fresh entity
    const clonedEntity = originalEntity.cloneNode(true);
    console.log('onDrop: Entity cloned', clonedEntity);

    // 3. Calculate new local transform relative to the NEW parent
    const newParentObj = newParentEl.object3D;
    if (newParentObj) {
      newParentObj.updateMatrixWorld(true);
      const newParentMatrixWorldInverse = new THREE.Matrix4()
        .copy(newParentObj.matrixWorld)
        .invert();

      // New Local Matrix = ParentInverse * WorldMatrix
      const newLocalMatrix = newParentMatrixWorldInverse.multiply(worldMatrix);

      // Decompose to get position, rotation, scale
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scale = new THREE.Vector3();

      newLocalMatrix.decompose(pos, quat, scale);

      console.log('Reparenting Debug (Clone & Replace):');
      console.log('  Calculated Pos:', pos);

      // Apply to the CLONED entity using strings
      const euler = new THREE.Euler().setFromQuaternion(quat);
      const radToDeg = 180 / Math.PI;

      clonedEntity.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
      clonedEntity.setAttribute(
        'rotation',
        `${euler.x * radToDeg} ${euler.y * radToDeg} ${euler.z * radToDeg}`
      );
      clonedEntity.setAttribute('scale', `${scale.x} ${scale.y} ${scale.z}`);
    } else {
      console.error('Reparenting Error: New parent missing object3D');
    }

    // 4. Perform the DOM move (Remove old, Insert new)
    try {
      if (originalEntity.parentNode) {
        console.log('onDrop: Removing original entity');
        originalEntity.parentNode.removeChild(originalEntity);
      } else {
        console.warn('onDrop: Original entity has no parent');
      }

      console.log('onDrop: Inserting cloned entity', { place });
      if (place === 'inside') {
        entity.appendChild(clonedEntity);
      } else if (place === 'before') {
        entity.parentNode.insertBefore(clonedEntity, entity);
      } else if (place === 'after') {
        entity.parentNode.insertBefore(clonedEntity, entity.nextSibling);
      }
    } catch (e) {
      console.error('onDrop: DOM manipulation error', e);
    }

    // 5. Force scene update and notify
    setTimeout(() => {
      console.log('onDrop: Post-drop update');
      if (AFRAME.INSPECTOR && AFRAME.INSPECTOR.sceneEl) {
        AFRAME.INSPECTOR.sceneEl.object3D.updateMatrixWorld(true);
      }

      // Select the NEW entity
      Events.emit('entityselect', clonedEntity, true);

      Events.emit('entityupdate', {
        component: 'scenegraph',
        entity: clonedEntity
      });
    }, 50);

    // Update the scene graph UI immediately
    this.rebuildEntityOptions();

    this.draggedEntity = null;
  };

  renderEntities = () => {
    return this.state.filteredEntities.map((entityOption, idx) => {
      if (
        !this.isVisibleInSceneGraph(entityOption.entity) &&
        !this.state.filter
      ) {
        return null;
      }
      return (
        <Entity
          {...entityOption}
          key={idx}
          isFiltering={!!this.state.filter}
          isExpanded={this.isExpanded(entityOption.entity)}
          isSelected={this.props.selectedEntity === entityOption.entity}
          selectEntity={this.selectEntity}
          toggleExpandedCollapsed={this.toggleExpandedCollapsed}
          onDragStart={this.onDragStart}
          onDrop={this.onDrop}
        />
      );
    });
  };

  render() {
    // To hide the SceneGraph we have to hide its parent too (#left-sidebar).
    if (!this.props.visible) {
      return null;
    }

    const clearFilter = this.state.filter ? (
      <a onClick={this.clearFilter} className="button">
        <AwesomeIcon icon={faTimes} />
      </a>
    ) : null;

    return (
      <div id="scenegraph" className="scenegraph">
        <div className="scenegraph-toolbar">
          <Toolbar />
          <div className="search">
            <input
              id="filter"
              placeholder="Search..."
              onChange={this.onChangeFilter}
              onKeyUp={this.onFilterKeyUp}
              value={this.state.filter}
            />
            {clearFilter}
            {!this.state.filter && <AwesomeIcon icon={faSearch} />}
          </div>
        </div>
        <div
          className="outliner"
          tabIndex="0"
          onKeyDown={this.onKeyDown}
          onKeyUp={this.onKeyUp}
        >
          {this.renderEntities()}
        </div>
      </div>
    );
  }
}

function filterEntity(entity, filter) {
  if (!filter) {
    return true;
  }

  // Check if the ID, tagName, class includes the filter.
  if (
    entity.id.toUpperCase().indexOf(filter.toUpperCase()) !== -1 ||
    entity.tagName.toUpperCase().indexOf(filter.toUpperCase()) !== -1 ||
    entity.classList.contains(filter)
  ) {
    return true;
  }

  // Try CSS selector match - wrapped in try-catch since invalid selectors throw
  try {
    if (entity.matches(filter)) {
      return true;
    }
  } catch (e) {
    // Invalid CSS selector, ignore
  }

  return false;
}
