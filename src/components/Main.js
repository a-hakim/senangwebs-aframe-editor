import React from 'react';
import {
  faPlus,
  faCog,
  faCode,
  faBars,
  faTimes,
  faEye,
  faCube,
  faCubes,
  faFileUpload,
  faFolderOpen,
  faVrCardboard
} from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from './AwesomeIcon';
import Events from '../lib/Events';
import ComponentsSidebar from './components/Sidebar';
import ModalTextures from './modals/ModalTextures';
import ModalHelp from './modals/ModalHelp';
import SceneGraph from './scenegraph/SceneGraph';
import CameraToolbar from './viewport/CameraToolbar';
import TransformToolbar from './viewport/TransformToolbar';
import ViewportHUD from './viewport/ViewportHUD';

THREE.ImageUtils.crossOrigin = '';

export default class Main extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      entity: null,
      inspectorEnabled: true,
      isModalTexturesOpen: false,
      sceneEl: AFRAME.scenes[0],
      visible: {
        scenegraph: true,
        attributes: false // Set this to false
      }
    };

    Events.on('togglesidebar', (event) => {
      if (event.which === 'all') {
        if (this.state.visible.scenegraph || this.state.visible.attributes) {
          this.setState({
            visible: {
              scenegraph: false,
              attributes: false
            }
          });
        } else {
          this.setState({
            visible: {
              scenegraph: true,
              attributes: true
            }
          });
        }
      } else if (event.which === 'attributes') {
        this.setState((prevState) => ({
          visible: {
            ...prevState.visible,
            attributes: !prevState.visible.attributes
          }
        }));
      } else if (event.which === 'scenegraph') {
        this.setState((prevState) => ({
          visible: {
            ...prevState.visible,
            scenegraph: !prevState.visible.scenegraph
          }
        }));
      }
    });
  }

  componentDidMount() {
    Events.on(
      'opentexturesmodal',
      function (selectedTexture, textureOnClose) {
        this.setState({
          selectedTexture: selectedTexture,
          isModalTexturesOpen: true,
          textureOnClose: textureOnClose
        });
      }.bind(this)
    );

    Events.on('entityselect', (entity) => {
      // Set the selected entity and ensure the attributes sidebar is visible
      this.setState({
        entity: entity,
        visible: { ...this.state.visible, attributes: true }
      });
    });

    Events.on('inspectortoggle', (enabled) => {
      this.setState({ inspectorEnabled: enabled });
    });

    Events.on('openhelpmodal', () => {
      this.setState({ isHelpOpen: true });
    });
  }

  handleClose = () => {
    Events.emit('togglesidebar', { which: 'attributes' });
  };

  onCloseHelpModal = (value) => {
    this.setState({ isHelpOpen: false });
  };

  onModalTextureOnClose = (value) => {
    this.setState({ isModalTexturesOpen: false });
    if (this.state.textureOnClose) {
      this.state.textureOnClose(value);
    }
  };

  toggleEdit = () => {
    if (this.state.inspectorEnabled) {
      AFRAME.INSPECTOR.close();
    } else {
      AFRAME.INSPECTOR.open();
    }
  };

  renderSceneGraphToggle() {
    if (!this.state.inspectorEnabled || this.state.visible.scenegraph) {
      return null;
    }
    return (
      <div className="toggle-sidebar left">
        <a
          onClick={() => {
            Events.emit('togglesidebar', { which: 'scenegraph' });
          }}
          title="Show scenegraph"
        >
          <AwesomeIcon icon={faPlus} />
        </a>
      </div>
    );
  }

  render() {
    const scene = this.state.sceneEl;
    // Simplified toggle button text logic
    const buttonText = this.state.inspectorEnabled ? 'Show' : 'Edit';

    return (
      <div>
        <a
          id="previewSceneBtn"
          className="toggle-edit"
          onClick={this.toggleEdit}
        >
          <AwesomeIcon icon={faVrCardboard} />
        </a>

        {this.renderSceneGraphToggle()}

        <div
          id="inspectorContainer"
          className={this.state.inspectorEnabled ? '' : 'hidden'}
        >
          <div id="leftPanel">
            <div className="scenegraph-menubar">
              <div id="scenegraph-menu-back"></div>
              <div id="scenegraph-panel-action"></div>
            </div>
            <SceneGraph
              scene={scene}
              selectedEntity={this.state.entity}
              visible={this.state.visible.scenegraph}
            />
          </div>

          <div id="viewportBar">
            <CameraToolbar />
            <TransformToolbar />
            {/* <div className="viewportHud-menubar">
              <ViewportHUD />
            </div> */}
          </div>

          <div
            id="rightPanel"
            className={this.state.visible.attributes ? '' : 'hidden'}
          >
            <div className="componentHeader title">
              {/* <a>
                <AwesomeIcon icon={faBars} />
              </a> */}
              <div id="entity-panel-action"></div>
              <a onClick={this.handleClose}>
                <AwesomeIcon icon={faTimes} />
              </a>
            </div>
            <ComponentsSidebar
              entity={this.state.entity}
              visible={this.state.visible.attributes} // This prop might become redundant depending on CSS, but leave for now
            />
          </div>

          <div id="actionBar"></div>
        </div>

        <ModalHelp
          isOpen={this.state.isHelpOpen}
          onClose={this.onCloseHelpModal}
        />
        <ModalTextures
          isOpen={this.state.isModalTexturesOpen}
          selectedTexture={this.state.selectedTexture}
          onClose={this.onModalTextureOnClose}
        />
      </div>
    );
  }
}
