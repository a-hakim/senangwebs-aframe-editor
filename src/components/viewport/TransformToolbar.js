import React from 'react';
import {
  faArrowsAlt,
  faRotateRight,
  faUpRightAndDownLeftFromCenter
} from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from '../AwesomeIcon';
import clsx from 'clsx';
import Events, { createEventScope } from '../../lib/Events';

var TransformButtons = [
  { value: 'translate', icon: <AwesomeIcon icon={faArrowsAlt} /> },
  { value: 'rotate', icon: <AwesomeIcon icon={faRotateRight} /> },
  {
    value: 'scale',
    icon: <AwesomeIcon icon={faUpRightAndDownLeftFromCenter} />
  }
];

export default class TransformToolbar extends React.Component {
  events = createEventScope();

  componentWillUnmount() {
    this.events.dispose();
  }

  constructor(props) {
    super(props);
    this.state = {
      selectedTransform: 'translate',
      localSpace: false
    };
  }

  componentDidMount() {
    this.events.on('scenereload', () =>
      this.setState({ selectedTransform: 'translate', localSpace: false })
    );
    this.events.on('transformmodechange', (mode) => {
      this.setState({ selectedTransform: mode });
    });

    this.events.on('transformspacechange', () => {
      Events.emit(
        'transformspacechanged',
        this.state.localSpace ? 'world' : 'local'
      );
      this.setState({ localSpace: !this.state.localSpace });
    });
  }

  changeTransformMode = (mode) => {
    this.setState({ selectedTransform: mode });
    Events.emit('transformmodechange', mode);
  };

  onLocalChange = (e) => {
    const local = e.target.checked;
    this.setState({ localSpace: local });
    Events.emit('transformspacechanged', local ? 'local' : 'world');
  };

  renderTransformButtons = () => {
    return TransformButtons.map(
      function (option, i) {
        var selected = option.value === this.state.selectedTransform;
        var classes = clsx({
          button: true,
          active: selected
        });

        return (
          <button
            type="button"
            title={option.value}
            aria-label={option.value}
            aria-pressed={selected}
            key={i}
            onClick={this.changeTransformMode.bind(this, option.value)}
            className={classes}
          >
            {option.icon}
          </button>
        );
      }.bind(this)
    );
  };

  render() {
    return (
      <div id="transformToolbar" className="toolbarButtons">
        {this.renderTransformButtons()}
        {/* <span className="local-transform">
          <input
            id="local"
            type="checkbox"
            title="Toggle between local and world space transforms"
            checked={
              this.state.localSpace || this.state.selectedTransform === 'scale'
            }
            disabled={this.state.selectedTransform === 'scale'}
            onChange={this.onLocalChange}
          />
          <label
            htmlFor="local"
            title="Toggle between local and world space transforms"
          >
            Local Space Transform
          </label>
        </span> */}
      </div>
    );
  }
}
