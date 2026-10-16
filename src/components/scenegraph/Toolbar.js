import React from 'react';
import { faPlus, faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from '../AwesomeIcon';
import Events, { createEventScope } from '../../lib/Events';
import ModalPrimitive from '../modals/ModalPrimitive';

export default class Toolbar extends React.Component {
  state = { isPlaying: false, isAddEntityModalOpen: false };
  events = createEventScope();

  componentDidMount() {
    this.events.on('inspectortoggle', () =>
      this.setState({ isPlaying: false })
    );
    this.events.on('scenereload', () =>
      this.setState({ isPlaying: false, isAddEntityModalOpen: false })
    );
  }

  componentWillUnmount() {
    this.events.dispose();
  }

  toggleScenePlaying = () => {
    const scene = AFRAME.INSPECTOR.sceneEl;
    if (this.state.isPlaying) {
      scene.pause();
      scene.isPlaying = true;
      AFRAME.INSPECTOR.cursor.play();
    } else {
      scene.isPlaying = false;
      scene.play();
    }
    this.setState((state) => ({ isPlaying: !state.isPlaying }));
  };

  render() {
    return (
      <div id="toolbar">
        <div className="toolbarActions">
          <button
            type="button"
            className="button"
            title="Add a new entity"
            onClick={() => this.setState({ isAddEntityModalOpen: true })}
          >
            <AwesomeIcon icon={faPlus} />
            <span>Add Entity</span>
          </button>
          <button
            type="button"
            id="playPauseScene"
            className="button"
            onClick={this.toggleScenePlaying}
            aria-pressed={this.state.isPlaying}
            title={this.state.isPlaying ? 'Pause scene' : 'Play scene'}
          >
            <AwesomeIcon icon={this.state.isPlaying ? faPause : faPlay} />
            <span>{this.state.isPlaying ? 'Pause Scene' : 'Play Scene'}</span>
          </button>
        </div>
        <ModalPrimitive
          isOpen={this.state.isAddEntityModalOpen}
          onClose={() => this.setState({ isAddEntityModalOpen: false })}
          onSelectPrimitive={(element) => {
            if (element)
              Events.emit('entitycreate', { element, components: {} });
            this.setState({ isAddEntityModalOpen: false });
          }}
        />
      </div>
    );
  }
}
