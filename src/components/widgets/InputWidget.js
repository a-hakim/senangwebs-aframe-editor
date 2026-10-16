import React from 'react';
import PropTypes from 'prop-types';
import { recordInput, finishInput } from '../../lib/history';

export default class InputWidget extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    label: PropTypes.string,
    componentname: PropTypes.string,
    entity: PropTypes.object,
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func,
    value: PropTypes.any
  };

  constructor(props) {
    super(props);
    this.state = { value: this.props.value || '' };
  }

  onChange = (e) => {
    var value = e.target.value;
    this.setState({ value: value });
    if (this.props.onChange) {
      recordInput(
        this,
        'Edit ' + (this.props.componentname || this.props.name),
        () => this.props.onChange(this.props.name, value)
      );
    }
  };

  componentDidUpdate(prevProps) {
    if (this.props.value !== prevProps.value) {
      this.setState({ value: this.props.value });
    }
  }

  componentWillUnmount() {
    finishInput(this);
  }

  render() {
    return (
      <input
        id={this.props.id}
        aria-label={this.props.label || this.props.name}
        type="text"
        className="string"
        value={this.state.value || ''}
        onChange={this.onChange}
        onBlur={() => finishInput(this)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') finishInput(this);
        }}
      />
    );
  }
}
