import React from 'react';
import PropTypes from 'prop-types';
import NumberWidget from './NumberWidget';

export default class Vec2Widget extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    label: PropTypes.string,
    componentname: PropTypes.string,
    entity: PropTypes.object,
    onChange: PropTypes.func,
    value: PropTypes.object.isRequired
  };

  onChange = (name, value) => {
    const vector = {};
    ['x', 'y'].forEach((axis) => {
      vector[axis] = axis === name ? value : this.props.value[axis];
    });
    this.props.onChange?.(name, vector);
  };

  render() {
    return (
      <div role="group" aria-label={this.props.label} className="vec2">
        {['x', 'y'].map((axis) => (
          <NumberWidget
            key={axis}
            id={this.props.id + '-' + axis}
            label={this.props.label + ' ' + axis.toUpperCase()}
            name={axis}
            value={this.props.value[axis]}
            onChange={this.onChange}
          />
        ))}
      </div>
    );
  }
}
