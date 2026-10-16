import React from 'react';
import {
  faPlus,
  faTimes,
  faVrCardboard
} from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { AwesomeIcon } from './AwesomeIcon';
import { createEventScope } from '../lib/Events';
import ComponentsSidebar from './components/Sidebar';
import ModalTextures from './modals/ModalTextures';
import ModalHelp from './modals/ModalHelp';
import SceneGraph from './scenegraph/SceneGraph';
import CameraToolbar from './viewport/CameraToolbar';
import TransformToolbar from './viewport/TransformToolbar';
import ViewportHUD from './viewport/ViewportHUD';
import Swal from 'sweetalert2';
import pkg from '../../package.json';

export default class Main extends React.Component {
  events = createEventScope();
  state = {
    entity: null,
    inspectorEnabled: true,
    isModalTexturesOpen: false,
    isHelpOpen: false,
    sceneEl: AFRAME.scenes[0],
    visible: { scenegraph: true, attributes: false },
    save: {},
    restoring: false
  };

  componentDidMount() {
    this.media = window.matchMedia('(max-width: 1000px)');
    this.media.addEventListener('change', this.onResize);
    this.events.on('togglesidebar', this.onToggleSidebar);
    this.events.on('opentexturesmodal', (selectedTexture, textureOnClose) =>
      this.setState({
        selectedTexture,
        textureOnClose,
        isModalTexturesOpen: true
      })
    );
    this.events.on('entityselect', (entity) =>
      this.setState((state) => ({
        entity,
        visible: entity
          ? {
              scenegraph: this.media.matches ? false : state.visible.scenegraph,
              attributes: true
            }
          : state.visible
      }))
    );
    this.events.on('inspectortoggle', (inspectorEnabled) =>
      this.setState({ inspectorEnabled })
    );
    this.events.on('openhelpmodal', () => this.setState({ isHelpOpen: true }));
    this.events.on('scenereload', (sceneEl) =>
      this.setState({ sceneEl, entity: null })
    );
    this.events.on('scenesavestate', (save) => this.setState({ save }));
    this.events.on('scenerestore', this.restoreDraft);
    this.setState({ save: AFRAME.INSPECTOR.persistence.getState() });
  }

  componentWillUnmount() {
    this.events.dispose();
    this.media.removeEventListener('change', this.onResize);
  }

  onResize = () => {
    if (this.media.matches) {
      this.setState((state) => ({
        visible: {
          scenegraph: !state.entity && state.visible.scenegraph,
          attributes: !!state.entity && state.visible.attributes
        }
      }));
    }
  };

  onToggleSidebar = ({ which, show }) => {
    this.setState((state) => {
      if (which === 'all') {
        const show = !state.visible.scenegraph && !state.visible.attributes;
        return {
          visible: {
            scenegraph: show,
            attributes: show && !this.media.matches && !!state.entity
          }
        };
      }
      const visible = {
        ...state.visible,
        [which]: show === undefined ? !state.visible[which] : show
      };
      if (this.media.matches && visible[which])
        visible[which === 'scenegraph' ? 'attributes' : 'scenegraph'] = false;
      return { visible };
    });
  };

  restoreDraft = async () => {
    if (this.state.restoring || !this.state.save.hasDraft) return;
    if (this.state.save.dirty) {
      const result = await Swal.fire({
        title: 'Restore saved draft?',
        text: 'Your current unsaved changes will be replaced.',
        showCancelButton: true,
        confirmButtonText: 'Restore draft'
      });
      if (!result.isConfirmed) return;
    }
    this.setState({ restoring: true });
    try {
      await AFRAME.INSPECTOR.persistence.restoreDraft();
    } finally {
      this.setState({ restoring: false });
    }
  };

  toggleEdit = () => AFRAME.INSPECTOR.toggle();

  render() {
    const { visible, save, entity, inspectorEnabled } = this.state;
    return (
      <div className="editor-ui">
        <button
          type="button"
          id="previewSceneBtn"
          className="toggle-edit"
          onClick={this.toggleEdit}
          aria-label={inspectorEnabled ? 'Preview scene' : 'Return to editor'}
          title={inspectorEnabled ? 'Preview scene' : 'Return to editor'}
        >
          <AwesomeIcon icon={faVrCardboard} />
        </button>
        {inspectorEnabled && !visible.scenegraph && (
          <div className="toggle-sidebar left">
            <button
              type="button"
              aria-label="Show scenegraph"
              title="Show scenegraph"
              onClick={() =>
                this.onToggleSidebar({ which: 'scenegraph', show: true })
              }
            >
              <AwesomeIcon icon={faPlus} />
            </button>
          </div>
        )}
        <div
          id="inspectorContainer"
          className={inspectorEnabled ? '' : 'hidden'}
        >
          <div id="leftPanel" hidden={!visible.scenegraph}>
            <div className="scenegraph-menubar">
              <div id="scenegraph-menu-back">
                <a
                  href="https://github.com/a-hakim/senangwebs-aframe-editor"
                  target="_blank"
                  rel="noopener noreferrer"
                  id="githubLink"
                >
                  <AwesomeIcon icon={faGithub} />
                  <span>senangwebs-aframe-editor</span>
                </a>
              </div>
              <div id="scenegraph-panel-action" />
            </div>
            <SceneGraph
              scene={this.state.sceneEl}
              selectedEntity={entity}
              visible={visible.scenegraph}
            />
          </div>
          <div id="viewportBar">
            <CameraToolbar />
            <TransformToolbar />
            <div className="viewportHud-menubar">
              <ViewportHUD />
            </div>
          </div>
          <div id="rightPanel" hidden={!visible.attributes}>
            <div className="componentHeader title">
              <div id="entity-panel-action" />
              <button
                type="button"
                aria-label="Close properties"
                title="Close properties"
                onClick={() => this.onToggleSidebar({ which: 'attributes' })}
              >
                <AwesomeIcon icon={faTimes} />
              </button>
            </div>
            {entity ? (
              <ComponentsSidebar entity={entity} visible={visible.attributes} />
            ) : (
              <p className="panel-hint">
                Select an entity in the scene or scene tree to edit its
                properties.
              </p>
            )}
          </div>
          <div id="actionBar">
            <div className="save-feedback" aria-live="polite">
              {(save.message || save.dirty) && (
                <span role="status">{save.message || 'Unsaved changes'}</span>
              )}
              {save.error && (
                <span role="alert" className="form-error">
                  {save.error}
                </span>
              )}
            </div>
            <div id="sw-info">
              <span>
                <b>Senangwebs Webverse</b>
              </span>
              <span>
                <small>Ver {pkg.version}</small>
              </span>
            </div>
          </div>
        </div>
        <ModalHelp
          isOpen={this.state.isHelpOpen}
          onClose={() => this.setState({ isHelpOpen: false })}
        />
        <ModalTextures
          isOpen={this.state.isModalTexturesOpen}
          selectedTexture={this.state.selectedTexture}
          onClose={(value) => {
            const callback = this.state.textureOnClose;
            this.setState(
              { isModalTexturesOpen: false, textureOnClose: null },
              () => callback?.(value)
            );
          }}
        />
      </div>
    );
  }
}
