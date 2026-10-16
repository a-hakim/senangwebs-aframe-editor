import { createRoot } from 'react-dom/client';
import Events, { createEventScope } from './lib/Events';
import { Viewport } from './lib/viewport';
import { AssetsLoader } from './lib/assetsLoader';
import { Shortcuts } from './lib/shortcuts';

import ErrorBoundary from './components/ErrorBoundary';
import Main from './components/Main';
import { initCameras } from './lib/cameras';
import { createEntity } from './lib/entity';
import { ScenePersistence } from './lib/persistence';
import { EditorViewport } from './lib/editorViewport';
import { History } from './lib/history';

import './style/index.styl';

/* global __webpack_public_path__: writable */
if (document.currentScript?.src) {
  __webpack_public_path__ = document.currentScript?.src
    ? new URL('.', document.currentScript.src).href
    : __webpack_public_path__;
}
let exporterPromise;
function loadExporter() {
  if (!exporterPromise) {
    exporterPromise = import(
      /* webpackChunkName: "gltf-exporter" */ 'three/addons/exporters/GLTFExporter'
    )
      .then(({ GLTFExporter }) => new GLTFExporter())
      .catch((error) => {
        exporterPromise = null;
        throw error;
      });
  }
  return exporterPromise;
}

function Inspector() {
  this.assetsLoader = new AssetsLoader();
  this.events = createEventScope();
  this.exporters = {
    gltf: {
      parse: (scene, onDone, onError, options) =>
        loadExporter()
          .then((exporter) => exporter.parse(scene, onDone, onError, options))
          .catch((error) => {
            if (onError) onError(error);
            else console.error(error);
          })
    }
  };
  this.isFirstOpen = true;
  this.modules = {};
  this.opened = false;

  // Wait for stuff.
  const doInit = () => {
    if (!AFRAME.scenes.length) {
      setTimeout(() => {
        doInit();
      }, 100);
      return;
    }

    this.sceneEl = AFRAME.scenes[0];
    if (this.sceneEl.hasLoaded) {
      this.init();
      return;
    }
    this.sceneEl.addEventListener('loaded', this.init.bind(this), {
      once: true
    });
  };
  doInit();
}

Inspector.prototype = {
  undo: function () {
    return this.history.undo();
  },
  redo: function () {
    return this.history.redo();
  },
  canUndo: function () {
    return this.history?.canUndo() || false;
  },
  canRedo: function () {
    return this.history?.canRedo() || false;
  },
  transaction: function (label, callback) {
    return this.history.transaction(label, callback);
  },
  clearHistory: function () {
    return this.history.clear();
  },
  getHistoryState: function () {
    return this.history.getState();
  },

  init: function () {
    // Wait for camera.
    if (!this.sceneEl.camera) {
      this.sceneEl.addEventListener(
        'camera-set-active',
        () => {
          this.init();
        },
        { once: true }
      );
      return;
    }

    this.container = document.querySelector('.a-canvas');
    initCameras(this);
    this.initUI();
  },

  initUI: function () {
    Shortcuts.init(this);
    this.initEvents();

    this.selected = null;

    // Init React.
    const div = document.createElement('div');
    div.id = 'aframeInspector';
    div.setAttribute('data-aframe-inspector', 'app');
    document.body.appendChild(div);
    const root = (this.root = createRoot(div));
    root.render(
      <ErrorBoundary>
        <Main />
      </ErrorBoundary>
    );

    this.scene = this.sceneEl.object3D;
    this.helpers = {};
    this.sceneHelpers = new THREE.Scene();
    this.sceneHelpers.userData.source = 'INSPECTOR';
    this.sceneHelpers.visible = true;
    this.inspectorActive = false;

    this.viewport = new Viewport(this);

    this.sceneEl.object3D.traverse((node) => {
      this.addHelper(node);
    });

    this.scene.add(this.sceneHelpers);
    this.persistence = new ScenePersistence(this);
    this.history = new History(this);
    this.open();
  },

  removeObject: function (object) {
    // Remove just the helper as the object will be deleted by A-Frame
    this.removeHelpers(object);
    Events.emit('objectremove', object);
  },

  addHelper: function (object) {
    let helper;

    if (object instanceof THREE.Camera) {
      this.cameraHelper = helper = new THREE.CameraHelper(object);
    } else if (object instanceof THREE.PointLight) {
      helper = new THREE.PointLightHelper(object, 1);
    } else if (object instanceof THREE.DirectionalLight) {
      helper = new THREE.DirectionalLightHelper(object, 1);
    } else if (object instanceof THREE.SpotLight) {
      helper = new THREE.SpotLightHelper(object, 1);
    } else if (object instanceof THREE.HemisphereLight) {
      helper = new THREE.HemisphereLightHelper(object, 1);
    } else if (object instanceof THREE.SkinnedMesh) {
      helper = new THREE.SkeletonHelper(object);
    } else {
      // no helper for this object type
      return;
    }

    helper.visible = false;
    this.sceneHelpers.add(helper);
    this.helpers[object.uuid] = helper;
    // SkeletonHelper doesn't have an update method
    if (helper.update) {
      helper.update();
    }
  },

  removeHelpers: function (object) {
    object.traverse((node) => {
      const helper = this.helpers[node.uuid];
      if (helper) {
        this.sceneHelpers.remove(helper);
        helper.dispose();
        delete this.helpers[node.uuid];
        Events.emit('helperremove', helper);
      }
    });
  },

  selectEntity: function (entity, emit) {
    this.selectedEntity = entity;
    if (entity) {
      this.select(entity.object3D);
    } else {
      this.select(null);
    }

    if (emit === undefined) {
      Events.emit('entityselect', entity);
    }

    // Update helper visibilities.
    for (const id in this.helpers) {
      this.helpers[id].visible = false;
    }

    if (entity === this.sceneEl) {
      return;
    }

    if (entity) {
      entity.object3D.traverse((node) => {
        if (this.helpers[node.uuid]) {
          this.helpers[node.uuid].visible = true;
        }
      });
    }
  },

  initEvents: function () {
    this.onToggleKey = (evt) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      // Alt + Ctrl + i: Shorcut to toggle the inspector
      const shortcutPressed =
        evt.keyCode === 73 &&
        ((evt.ctrlKey && evt.altKey) || evt.getModifierState('AltGraph'));
      if (shortcutPressed) {
        this.toggle();
      }
    };
    window.addEventListener('keydown', this.onToggleKey);

    this.events.on('entityselect', (entity) => {
      this.selectEntity(entity, false);
    });

    this.events.on('inspectortoggle', (active) => {
      this.inspectorActive = active;
      this.sceneHelpers.visible = this.inspectorActive;
    });

    this.events.on('entitycreate', (definition) => {
      createEntity(definition, (entity) => {
        this.selectEntity(entity);
      });
    });

    this.onChildDetached = (event) => {
      const entity = event.detail.el;
      if (
        entity?.object3D &&
        (event.target === this.sceneEl || event.target.sceneEl === this.sceneEl)
      ) {
        this.removeObject(entity.object3D);
      }
    };
    document.addEventListener('child-detached', this.onChildDetached);
  },

  selectById: function (id) {
    if (id === this.camera.id) {
      this.select(this.camera);
      return;
    }
    this.select(this.scene.getObjectById(id, true));
  },

  /**
   * Change to select object.
   */
  select: function (object3D) {
    if (this.selected === object3D) {
      return;
    }
    this.selected = object3D;
    Events.emit('objectselect', object3D);
  },

  deselect: function () {
    this.select(null);
  },

  /**
   * Toggle the editor
   */
  toggle: function () {
    if (this.opened) {
      this.close();
    } else {
      this.open();
    }
  },

  /**
   * Open the editor UI
   */
  open: function (focusEl) {
    this.opened = true;
    Events.emit('inspectortoggle', true);

    if (this.sceneEl.hasAttribute('embedded')) {
      // Remove embedded styles, but keep track of it.
      this.sceneEl.removeAttribute('embedded');
      this.sceneEl.setAttribute('aframe-inspector-removed-embedded');
    }

    if (!this.editorViewport) {
      this.editorViewport = new EditorViewport(this.sceneEl);
    }
    document.body.classList.add('aframe-inspector-opened');
    this.sceneEl.resize();
    this.sceneEl.pause();
    this.sceneEl.exitVR();

    Shortcuts.enable();

    // Trick scene to run the cursor tick.
    this.sceneEl.isPlaying = true;
    this.cursor.play();

    if (
      !focusEl &&
      this.isFirstOpen &&
      AFRAME.utils.getUrlParameter('inspector')
    ) {
      // Focus entity with URL parameter on first open.
      focusEl = document.getElementById(
        AFRAME.utils.getUrlParameter('inspector')
      );
    }
    if (focusEl) {
      this.selectEntity(focusEl);
      Events.emit('objectfocus', focusEl.object3D);
    }
    this.isFirstOpen = false;
  },

  /**
   * Reload the inspector UI to reflect current scene HTML.
   * Call this after programmatically modifying the scene DOM.
   */
  reload: async function () {
    this.history?.reset();
    this.cancelReload?.();
    this.selectEntity(null);
    this.editorViewport?.dispose();
    this.editorViewport = null;
    this.viewport?.dispose();
    this.disposeCameras?.();
    this.persistence?.bindScene(null);
    for (const helper of Object.values(this.helpers)) {
      this.sceneHelpers.remove(helper);
      helper.dispose?.();
    }
    this.helpers = {};
    this.sceneHelpers.parent?.remove(this.sceneHelpers);
    const ready = await new Promise((resolve) => {
      const start = Date.now();
      let timer;
      const finish = (value) => {
        clearTimeout(timer);
        resolve(value);
      };
      this.cancelReload = () => finish(false);
      const poll = () => {
        const scene = AFRAME.scenes[0];
        if (scene?.hasLoaded && scene.camera) return finish(scene);
        if (Date.now() - start > 15000) return finish(false);
        timer = setTimeout(poll, 50);
      };
      poll();
    });
    if (!ready) return false;
    this.cancelReload = null;
    this.sceneEl = ready;
    this.container = ready.canvas;
    initCameras(this);
    this.scene = ready.object3D;
    this.sceneHelpers = new THREE.Scene();
    this.sceneHelpers.userData.source = 'INSPECTOR';
    this.scene.add(this.sceneHelpers);
    this.viewport = new Viewport(this);
    this.scene.traverse((node) => {
      if (node.userData.source !== 'INSPECTOR') this.addHelper(node);
    });
    this.persistence?.bindScene(ready);
    this.history?.reset();
    Events.emit('scenereload', ready);
    Events.emit('entitycreated');
    this.open();
    return true;
  },

  destroy: function () {
    this.history?.dispose();
    this.cancelReload?.();
    if (this.opened) this.close();
    this.viewport?.dispose();
    this.disposeCameras?.();
    Object.values(this.helpers).forEach((helper) => helper.dispose?.());
    this.sceneHelpers.parent?.remove(this.sceneHelpers);
    this.persistence?.dispose();
    this.assetsLoader.dispose();
    this.events.dispose();
    window.removeEventListener('keydown', this.onToggleKey);
    document.removeEventListener('child-detached', this.onChildDetached);
    this.root?.unmount();
    document.getElementById('aframeInspector')?.remove();
    Shortcuts.disable();
  },

  /**
   * Closes the editor and gives the control back to the scene
   * @return {[type]} [description]
   */
  close: function () {
    this.history?.endGroup();
    this.opened = false;
    Events.emit('inspectortoggle', false);

    // Untrick scene when we enabled this to run the cursor tick.
    this.sceneEl.isPlaying = false;

    this.sceneEl.play();
    this.cursor.pause();

    if (this.sceneEl.hasAttribute('aframe-inspector-removed-embedded')) {
      this.sceneEl.setAttribute('embedded', '');
      this.sceneEl.removeAttribute('aframe-inspector-removed-embedded');
    }
    this.editorViewport?.dispose();
    this.editorViewport = null;
    document.body.classList.remove('aframe-inspector-opened');
    this.sceneEl.resize();
    Shortcuts.disable();
  }
};

AFRAME.INSPECTOR = new Inspector();
