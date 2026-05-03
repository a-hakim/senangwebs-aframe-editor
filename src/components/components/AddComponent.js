import React from 'react';
import PropTypes from 'prop-types';
import Events from '../../lib/Events';
import Select from 'react-select';
import Swal from 'sweetalert2';

export default class AddComponent extends React.Component {
  static propTypes = {
    entity: PropTypes.object
  };

  /**
   * Add blank component.
   * If component is instanced, generate an ID.
   */
  addComponent = (value) => {
    let componentName = value.value;
    const entity = this.props.entity;

    if (AFRAME.components[componentName].multiple) {
      Swal.fire({
        title: 'Component ID',
        text: `Provide an ID for this component (e.g., 'foo' for ${componentName}__foo).`,
        input: 'text',
        inputPlaceholder: 'ID',
        showCancelButton: true,
        inputAttributes: {
          autocapitalize: 'off'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const id = result.value;
          componentName = id ? `${componentName}__${id}` : componentName;
          this.applyComponent(entity, componentName);
        }
      });
    } else {
      this.applyComponent(entity, componentName);
    }
  };

  applyComponent(entity, componentName) {
    entity.setAttribute(componentName, '');
    Events.emit('componentadd', { entity: entity, component: componentName });
  }

  /**
   * Component dropdown options.
   */
  getComponentsOptions() {
    const usedComponents = Object.keys(this.props.entity.components);
    var commonOptions = Object.keys(AFRAME.components)
      .filter(function (componentName) {
        return (
          AFRAME.components[componentName].multiple ||
          usedComponents.indexOf(componentName) === -1
        );
      })
      .sort()
      .map(function (value) {
        return { value: value, label: value, origin: 'loaded' };
      });

    this.options = commonOptions;
    this.options = this.options.sort(function (a, b) {
      return a.label === b.label ? 0 : a.label < b.label ? -1 : 1;
    });
  }

  renderOption(option) {
    var bullet = (
      <span title="Component already loaded in the scene">&#9679;</span>
    );
    return (
      <strong className="option">
        {option.label} {option.origin === 'loaded' ? bullet : ''}
      </strong>
    );
  }

  render() {
    const entity = this.props.entity;
    if (!entity) {
      return <div />;
    }

    this.getComponentsOptions();

    return (
      <div id="addComponentContainer">
        <p id="addComponentHeader">COMPONENTS</p>
        <Select
          id="addComponent"
          className="addComponent"
          classNamePrefix="select"
          options={this.options}
          simpleValue
          clearable={true}
          placeholder="Add component..."
          noResultsText="No components found"
          onChange={this.addComponent}
          optionRenderer={this.renderOption}
          searchable={true}
        />
      </div>
    );
  }
}

/* eslint-disable no-unused-vars */
/**
 * Check if component has multiplicity.
 */
function isComponentInstanced(entity, componentName) {
  for (var component in entity.components) {
    if (component.substring(0, component.indexOf('__')) === componentName) {
      return true;
    }
  }
}
