import React from 'react';
import PropTypes from 'prop-types';

export default class NumberWidget extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    label: PropTypes.string,
    componentname: PropTypes.string,
    entity: PropTypes.object,
    max: PropTypes.number,
    min: PropTypes.number,
    name: PropTypes.string,
    onChange: PropTypes.func,
    precision: PropTypes.number,
    step: PropTypes.number,
    value: PropTypes.number
  };

  static defaultProps = {
    min: -Infinity,
    max: Infinity,
    value: 0,
    precision: 3,
    step: 0.01
  };
  state = { displayValue: this.format(this.props.value), error: '' };
  input = React.createRef();
  distance = 0;

  format(value) {
    return Number.isFinite(value) ? value.toFixed(this.props.precision) : '';
  }

  componentDidUpdate(prevProps) {
    if (!Object.is(this.props.value, prevProps.value)) {
      this.setState({ displayValue: this.format(this.props.value), error: '' });
    }
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  setValue(raw) {
    let value =
      typeof raw === 'number' ? raw : raw.trim() === '' ? NaN : Number(raw);
    if (!Number.isFinite(value)) {
      this.setState({ error: 'Enter a finite number.' });
      return false;
    }
    if (this.props.precision === 0) value = Math.round(value);
    value = Math.min(this.props.max, Math.max(this.props.min, value));
    value = Number(value.toFixed(this.props.precision));
    this.setState({ displayValue: this.format(value), error: '' });
    if (!Object.is(value, this.props.value))
      this.props.onChange?.(this.props.name, value);
    return true;
  }

  onMouseDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    this.distance = 0;
    this.startValue = Number(this.props.value) || 0;
    this.pointer = [event.clientX, event.clientY];
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  };

  onMouseMove = (event) => {
    this.distance +=
      event.clientX - this.pointer[0] - (event.clientY - this.pointer[1]);
    this.pointer = [event.clientX, event.clientY];
    if (Math.abs(this.distance) < 2) return;
    const step =
      this.props.precision === 0
        ? Math.max(1, this.props.step)
        : this.props.step;
    this.setValue(
      this.startValue +
        Math.trunc(this.distance / (event.shiftKey ? 1 : 5)) * step
    );
  };

  onMouseUp = () => {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    if (Math.abs(this.distance) < 2 && this.input.current) {
      this.input.current.focus();
      this.input.current.select();
    }
  };

  onKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (this.setValue(this.input.current.value)) this.input.current.blur();
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      this.setState({ displayValue: this.format(this.props.value), error: '' });
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      let step =
        this.props.precision === 0
          ? Math.max(1, this.props.step)
          : this.props.step;
      if (event.shiftKey) step *= 10;
      if (event.altKey && this.props.precision !== 0)
        step = Math.max(10 ** -this.props.precision, step / 10);
      const current = Number(this.input.current.value);
      this.setValue(
        (Number.isFinite(current) ? current : this.props.value) +
          (event.key === 'ArrowUp' ? step : -step)
      );
    }
  };

  render() {
    return (
      <>
        <input
          id={this.props.id}
          aria-label={this.props.label || this.props.name}
          ref={this.input}
          className="number"
          type="text"
          inputMode="decimal"
          value={this.state.displayValue}
          aria-invalid={!!this.state.error}
          aria-describedby={
            this.state.error ? this.props.id + '-error' : undefined
          }
          onChange={(event) =>
            this.setState({ displayValue: event.target.value, error: '' })
          }
          onKeyDown={this.onKeyDown}
          onMouseDown={this.onMouseDown}
          onBlur={() => this.setValue(this.input.current.value)}
        />
        {this.state.error && (
          <span
            id={this.props.id + '-error'}
            className="field-error"
            role="alert"
          >
            {this.state.error}
          </span>
        )}
      </>
    );
  }
}
