import Events, { createEventScope } from './Events';
import { getEntityClipboardRepresentation } from './entity';
import { saveString } from './utils';

export class ScenePersistence {
  constructor(inspector) {
    this.inspector = inspector;
    this.events = createEventScope();
    this.dirty = false;
    this.error = '';
    this.message = '';
    this.savedAt = null;
    [
      'entityupdate',
      'entityidchange',
      'entitycreated',
      'entityclone',
      'componentadd',
      'componentremove',
      'scenechanged'
    ].forEach((name) => {
      this.events.on(name, this.markDirty);
    });
    this.events.on('scenesave', () => this.saveDraft());
    this.events.on('scenedownload', () => this.download());
    window.addEventListener('beforeunload', this.beforeUnload);
    this.bindScene(inspector.sceneEl);
  }

  key() {
    return (
      'senangwebs-scene-draft:' +
      location.pathname +
      ':' +
      (this.scene?.id || 'scene')
    );
  }

  bindScene(scene) {
    ['child-attached', 'child-detached'].forEach((name) => {
      this.scene?.removeEventListener(name, this.onChildChange);
      scene?.addEventListener(name, this.onChildChange);
    });
    this.scene = scene;
    this.publish();
  }

  onChildChange = (event) => {
    const element = event.detail.el;
    if (
      !element ||
      element.closest?.('[data-aframe-inspector]') ||
      element.hasAttribute?.('aframe-injected')
    )
      return;
    this.markDirty();
  };

  readDraft() {
    try {
      const value = JSON.parse(localStorage.getItem(this.key()) || 'null');
      return value?.version === 1 && typeof value.scene === 'string'
        ? value
        : null;
    } catch (error) {
      return null;
    }
  }

  getState() {
    return {
      dirty: this.dirty,
      error: this.error,
      message: this.message,
      savedAt: this.savedAt,
      hasDraft: !!this.readDraft()
    };
  }

  publish() {
    Events.emit('scenesavestate', this.getState());
  }

  markDirty = () => {
    if (this.suspended || !this.scene) return;
    if (!this.dirty) {
      this.dirty = true;
      this.message = '';
      this.publish();
    }
  };

  beforeUnload = (event) => {
    if (!this.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  };

  serialize() {
    [this.scene, ...this.scene.querySelectorAll('*')].forEach((element) =>
      element.flushToDOM?.()
    );
    const template = document.createElement('template');
    template.innerHTML = getEntityClipboardRepresentation(this.scene);
    const copy = template.content.querySelector('a-scene');
    copy
      .querySelectorAll(
        '[data-aframe-inspector], [data-aframe-canvas], [aframe-injected]'
      )
      .forEach((element) => element.remove());
    // The editor deactivates the user's camera only for the duration of editing.
    copy
      .querySelectorAll('[data-aframe-inspector-original-camera]')
      .forEach((camera) => {
        const current = camera.getAttribute('camera') || '';
        camera.setAttribute(
          'camera',
          current.replace(/active\s*:\s*false/g, 'active: true') +
            '; active: true'
        );
        camera.removeAttribute('data-aframe-inspector-original-camera');
      });
    if (copy.hasAttribute('aframe-inspector-removed-embedded'))
      copy.setAttribute('embedded', '');
    copy.removeAttribute('aframe-inspector-removed-embedded');
    return copy.outerHTML;
  }

  saveDraft() {
    try {
      const savedAt = new Date().toISOString();
      localStorage.setItem(
        this.key(),
        JSON.stringify({ version: 1, savedAt, scene: this.serialize() })
      );
      this.dirty = false;
      this.savedAt = savedAt;
      this.error = '';
      this.message = 'Draft saved in this browser.';
      this.publish();
      return true;
    } catch (error) {
      this.error =
        'The draft could not be saved in this browser. Download the scene HTML to keep your work.';
      this.publish();
      return false;
    }
  }

  async restoreDraft() {
    const draft = this.readDraft();
    if (!draft) return false;
    const parsed = new DOMParser().parseFromString(draft.scene, 'text/html');
    const savedScene = parsed.querySelector('a-scene');
    if (!savedScene) {
      this.error = 'This draft is invalid. Your current scene has been kept.';
      this.publish();
      return false;
    }
    this.suspended = true;
    const previous = this.scene;
    const replacement = document.importNode(savedScene, true);
    const wasDirty = this.dirty;
    this.bindScene(null);
    try {
      previous.replaceWith(replacement);
      if (!(await this.inspector.reload()))
        throw new Error('Scene did not initialize');
      this.bindScene(replacement);
      this.dirty = false;
      this.savedAt = draft.savedAt;
      this.error = '';
      this.message = 'Saved draft restored.';
      return true;
    } catch (error) {
      replacement.replaceWith(previous);
      await this.inspector.reload();
      this.bindScene(previous);
      this.dirty = wasDirty;
      this.error =
        'The draft could not be opened. Your previous scene has been restored.';
      return false;
    } finally {
      this.suspended = false;
      this.publish();
    }
  }

  download() {
    try {
      const output = document.implementation.createHTMLDocument(
        document.title || 'A-Frame scene'
      );
      const charset = output.createElement('meta');
      charset.setAttribute('charset', 'utf-8');
      output.head.prepend(charset);
      const base = output.createElement('base');
      base.href = document.baseURI;
      output.head.appendChild(base);
      const afterScene = [];
      // Preserve script order relative to the scene as well as dependency URLs.
      document
        .querySelectorAll('script:not([data-webpack]), link[rel="stylesheet"]')
        .forEach((element) => {
          if (element.closest('#aframeInspector, [data-aframe-inspector]'))
            return;
          const copy = output.importNode(element, true);
          if (element.src) copy.src = element.src;
          if (element.href) copy.href = element.href;
          if (document.head.contains(element)) output.head.appendChild(copy);
          else if (
            element.compareDocumentPosition(this.scene) &
            Node.DOCUMENT_POSITION_FOLLOWING
          )
            output.body.appendChild(copy);
          else afterScene.push(copy);
        });
      const scene = new DOMParser()
        .parseFromString(this.serialize(), 'text/html')
        .querySelector('a-scene');
      output.body.appendChild(output.importNode(scene, true));
      afterScene.forEach((element) => output.body.appendChild(element));
      const name = (this.scene.id || 'scene').replace(/[^a-z0-9_-]/gi, '-');
      saveString(
        '<!doctype html>\n' + output.documentElement.outerHTML,
        name + '.html',
        'text/html'
      );
      this.error = '';
      this.message =
        'HTML download started. External assets must remain accessible.';
      // Download initiation is not proof that the user saved the file.
      this.publish();
    } catch (error) {
      this.error =
        'The scene could not be downloaded. Try saving a browser draft instead.';
      this.publish();
    }
  }

  dispose() {
    this.events.dispose();
    window.removeEventListener('beforeunload', this.beforeUnload);
    this.bindScene(null);
  }
}
