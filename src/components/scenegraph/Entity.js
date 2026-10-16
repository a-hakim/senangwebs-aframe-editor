/* eslint-disable react/no-danger */
import React from 'react';
import PropTypes from 'prop-types';
import {
  faCaretDown,
  faCaretRight,
  faClone,
  faEye,
  faEyeSlash,
  faTrashAlt
} from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from '../AwesomeIcon';
import clsx from 'clsx';
import { removeEntity, cloneEntity, updateEntity } from '../../lib/entity';
import EntityRepresentation from '../EntityRepresentation';
import Events from '../../lib/Events';

export default class Entity extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    depth: PropTypes.number,
    entity: PropTypes.object,
    isExpanded: PropTypes.bool,
    isFiltering: PropTypes.bool,
    isSelected: PropTypes.bool,
    selectEntity: PropTypes.func,
    toggleExpandedCollapsed: PropTypes.func,
    onDragStart: PropTypes.func,
    onDrop: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {};
  }

  onClick = () => this.props.selectEntity(this.props.entity);

  onDoubleClick = () => Events.emit('objectfocus', this.props.entity.object3D);

  toggleVisibility = (event) => {
    event.stopPropagation();
    const entity = this.props.entity;
    const visible =
      entity.tagName.toLowerCase() === 'a-scene'
        ? entity.object3D.visible
        : entity.getAttribute('visible');
    updateEntity(entity, 'visible', '', !visible);
    this.forceUpdate();
  };

  onDragStart = (e) => {
    if (this.props.entity.tagName.toLowerCase() === 'a-scene') {
      e.preventDefault();
      return;
    }
    this.props.onDragStart(e, this.props.entity);
  };

  onDragOver = (e) => {
    if (this.props.entity.tagName.toLowerCase() === 'a-scene') {
      return;
    }
    e.preventDefault();
    const rect = e.target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let dragPosition = 'inside';
    if (y < height * 0.25) {
      dragPosition = 'before';
    } else if (y > height * 0.75) {
      dragPosition = 'after';
    }

    if (this.state.dragPosition !== dragPosition) {
      this.setState({ dragPosition });
    }
  };

  onDragLeave = () => {
    this.setState({ dragPosition: null });
  };

  onDrop = (e) => {
    e.preventDefault();
    this.props.onDrop(e, this.props.entity, this.state.dragPosition);
    this.setState({ dragPosition: null });
  };

  render() {
    const isFiltering = this.props.isFiltering;
    const isExpanded = this.props.isExpanded;
    const entity = this.props.entity;
    const tagName = entity.tagName.toLowerCase();

    // Clone and remove buttons if not a-scene.
    const cloneButton =
      tagName === 'a-scene' ? null : (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            cloneEntity(entity);
          }}
          title="Clone entity"
          className="button"
        >
          <AwesomeIcon icon={faClone} />
        </button>
      );
    const removeButton =
      tagName === 'a-scene' ? null : (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            removeEntity(entity);
          }}
          title="Remove entity"
          className="button"
        >
          <AwesomeIcon icon={faTrashAlt} />
        </button>
      );

    // Add spaces depending on depth.
    const label = entity.id || tagName;
    let collapse;
    if (entity.children.length > 0 && !isFiltering) {
      collapse = (
        <button
          type="button"
          tabIndex={this.props.isSelected ? 0 : -1}
          aria-label={(isExpanded ? 'Collapse ' : 'Expand ') + label}
          onClick={(event) => {
            event.stopPropagation();
            this.props.toggleExpandedCollapsed(entity);
          }}
          className="collapsespace"
        >
          {isExpanded ? (
            <AwesomeIcon icon={faCaretDown} />
          ) : (
            <AwesomeIcon icon={faCaretRight} />
          )}
        </button>
      );
    } else {
      collapse = <span className="collapsespace" />;
    }

    // Visibility button.
    const visible =
      tagName === 'a-scene'
        ? entity.object3D.visible
        : entity.getAttribute('visible');
    const visibilityButton = (
      <button
        type="button"
        className="visibility-button"
        tabIndex={this.props.isSelected ? 0 : -1}
        aria-label={(visible ? 'Hide ' : 'Show ') + label}
        aria-pressed={!!visible}
        title="Toggle entity visibility"
        onClick={this.toggleVisibility}
      >
        {visible ? (
          <AwesomeIcon icon={faEye} />
        ) : (
          <AwesomeIcon icon={faEyeSlash} />
        )}
      </button>
    );

    // Class name.
    const className = clsx({
      active: this.props.isSelected,
      entity: true,
      novisible: !visible,
      option: true,
      'drag-before': this.state.dragPosition === 'before',
      'drag-after': this.state.dragPosition === 'after',
      'drag-inside': this.state.dragPosition === 'inside'
    });

    return (
      <div
        id={this.props.id}
        role="treeitem"
        aria-label={label}
        aria-level={this.props.depth + 1}
        aria-selected={this.props.isSelected}
        aria-expanded={
          entity.children.length && !isFiltering ? isExpanded : undefined
        }
        className={className}
        onClick={this.onClick}
        draggable={tagName !== 'a-scene'}
        onDragStart={this.onDragStart}
        onDragOver={this.onDragOver}
        onDragLeave={this.onDragLeave}
        onDrop={this.onDrop}
      >
        <span
          className="entity-label"
          style={{ paddingLeft: this.props.depth * 12 }}
        >
          {visibilityButton}
          {collapse}
          <EntityRepresentation
            entity={entity}
            onDoubleClick={this.onDoubleClick}
          />
        </span>
        <span className="entityActions">
          {cloneButton}
          {removeButton}
        </span>
      </div>
    );
  }
}
