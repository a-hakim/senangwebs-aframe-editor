import React from 'react';
import PropTypes from 'prop-types';
import { recordInput, finishInput } from '../../lib/history';

export default class ColorWidget extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    label: PropTypes.string,
    componentname: PropTypes.string.isRequired,
    entity: PropTypes.object,
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func,
    value: PropTypes.string
  };

  static defaultProps = {
    value: '#ffffff'
  };

  constructor(props) {
    super(props);

    var value = this.props.value;
    this.color = new THREE.Color();

    this.state = {
      value: value,
      pickerValue: this.getHexString(value)
    };
  }

  setValue(value) {
    var pickerValue = this.getHexString(value);

    this.setState({
      value: value,
      pickerValue: pickerValue
    });

    if (this.props.onChange && value !== this.props.value) {
      recordInput(this, 'Edit ' + this.props.componentname, () =>
        this.props.onChange(this.props.name, value)
      );
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.value !== prevProps.value) {
      this.setState({
        value: this.props.value,
        pickerValue: this.getHexString(this.props.value)
      });
    }
  }

  componentWillUnmount() {
    finishInput(this);
  }

  getHexString(value) {
    return '#' + this.color.set(value).getHexString();
  }

  onChange = (e) => {
    this.setValue(e.target.value);
  };

  onKeyUp = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') finishInput(this);
  };

  onChangeText = (e) => {
    this.setValue(e.target.value);
  };

  render() {
    return (
      <span className="color-widget">
        <input
          aria-label={(this.props.label || this.props.name) + ' picker'}
          type="color"
          className="color"
          value={this.state.pickerValue}
          title={this.state.value}
          onChange={this.onChange}
          onBlur={() => finishInput(this)}
        />
        <input
          type="text"
          id={this.props.id}
          aria-label={this.props.label || this.props.name}
          className="color_value"
          value={this.state.value}
          onKeyUp={this.onKeyUp}
          onChange={this.onChangeText}
          onBlur={() => finishInput(this)}
        />
      </span>
    );
  }
}
