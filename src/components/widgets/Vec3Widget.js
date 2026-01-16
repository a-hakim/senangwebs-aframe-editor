import React from 'react';
import PropTypes from 'prop-types';

import NumberWidget from './NumberWidget';
import { areVectorsEqual } from '../../lib/utils';

export default class Vec3Widget extends React.Component {
  static propTypes = {
    componentname: PropTypes.string,
    entity: PropTypes.object,
    onChange: PropTypes.func,
    value: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      x: props.value.x,
      y: props.value.y,
      z: props.value.z
    };
  }

  onChange = (name, value) => {
    this.setState({ [name]: parseFloat(value.toFixed(5)) }, () => {
      if (this.props.onChange) {
        this.props.onChange(name, this.state);
      }
    });
  };

  componentDidUpdate(prevProps) {
    // Only update state if props.value actually changed from parent
    // Comparing to this.state would cause infinite loops when value objects are recreated
    if (!areVectorsEqual(this.props.value, prevProps.value)) {
      this.setState({
        x: this.props.value.x,
        y: this.props.value.y,
        z: this.props.value.z
      });
    }
  }

  render() {
    const widgetProps = {
      componentname: this.props.componentname,
      entity: this.props.entity,
      onChange: this.onChange
    };

    return (
      <div className="vec3">
        <NumberWidget name="x" value={this.state.x} {...widgetProps} />
        <NumberWidget name="y" value={this.state.y} {...widgetProps} />
        <NumberWidget name="z" value={this.state.z} {...widgetProps} />
      </div>
    );
  }
}
