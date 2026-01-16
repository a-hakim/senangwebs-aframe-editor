import React from 'react';
import { faPlus, faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from '../AwesomeIcon';
import Events from '../../lib/Events';
import { saveBlob } from '../../lib/utils';
import ModalPrimitive from '../modals/ModalPrimitive';

function filterHelpers(scene, visible) {
  scene.traverse((o) => {
    if (o.userData.source === 'INSPECTOR') {
      o.visible = visible;
    }
  });
}

function getSceneName(scene) {
  return scene.id || slugify(window.location.host + window.location.pathname);
}

/**
 * Slugify the string removing non-word chars and spaces
 * @param  {string} text String to slugify
 * @return {string}      Slugified string
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '-') // Replace all non-word chars with -
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

/**
 * Tools and actions.
 */
export default class Toolbar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isPlaying: false,
      isAddEntityModalOpen: false // Add state for modal visibility
    };
  }

  exportSceneToGLTF() {
    const sceneName = getSceneName(AFRAME.scenes[0]);
    const scene = AFRAME.scenes[0].object3D;
    filterHelpers(scene, false);
    AFRAME.INSPECTOR.exporters.gltf.parse(
      scene,
      function (buffer) {
        filterHelpers(scene, true);
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        saveBlob(blob, sceneName + '.glb');
      },
      function (error) {
        console.error(error);
      },
      { binary: true }
    );
  }

  // Renamed original addEntity to toggleAddEntityModal
  toggleAddEntityModal = () => {
    this.setState({ isAddEntityModalOpen: !this.state.isAddEntityModalOpen });
  };

  // New function to handle entity creation based on modal selection
  createEntity = (primitiveType) => {
    if (primitiveType) {
      Events.emit('entitycreate', { element: primitiveType, components: {} });
    }
    this.setState({ isAddEntityModalOpen: false }); // Close modal after selection or cancellation
  };

  toggleScenePlaying = () => {
    if (this.state.isPlaying) {
      AFRAME.scenes[0].pause();
      this.setState({ isPlaying: false });
      AFRAME.scenes[0].isPlaying = true;
      document.getElementById('aframeInspectorMouseCursor').play();
      return;
    }
    AFRAME.scenes[0].isPlaying = false;
    AFRAME.scenes[0].play();
    this.setState({ isPlaying: true });
  };

  render() {
    // const watcherTitle = 'Write changes with aframe-watcher.'; // Keep or remove as needed

    return (
      <div id="toolbar">
        <div className="toolbarActions">
          <a
            className="button"
            title="Add a new entity"
            onClick={this.toggleAddEntityModal} // Changed onClick handler
          >
            <AwesomeIcon icon={faPlus} />
            <span>Add Entity</span>
          </a>
          {/* Play/Pause Button */}
          <a
            id="playPauseScene"
            className="button"
            title={this.state.isPlaying ? 'Pause scene' : 'Resume scene'}
            onClick={this.toggleScenePlaying}
          >
            {this.state.isPlaying ? (
              <>
                <AwesomeIcon icon={faPause} />
                <span>Pause Scene</span>
              </>
            ) : (
              <>
                <AwesomeIcon icon={faPlay} />
                <span>Play Scene</span>
              </>
            )}
          </a>
          {/* Add other buttons like export, save if needed */}
        </div>

        {/* Conditionally render the modal */}
        {this.state.isAddEntityModalOpen && (
          <ModalPrimitive
            isOpen={this.state.isAddEntityModalOpen}
            onClose={this.toggleAddEntityModal} // Pass function to close modal
            onSelectPrimitive={this.createEntity} // Pass function to create entity
          />
        )}
      </div>
    );
  }
}
