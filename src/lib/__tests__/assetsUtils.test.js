/* eslint-env jest */
import { insertNewAsset } from '../assetsUtils';
import { History } from '../history';
import { createAFrame, createDocument } from '../__fixtures__/scene';

describe('history-aware asset insertion', () => {
  let previousDocument;
  let previousAFrame;
  let history;
  let scene;
  let entity;

  beforeEach(() => {
    jest.useFakeTimers();
    previousDocument = global.document;
    previousAFrame = global.AFRAME;
    global.document = createDocument();
    global.AFRAME = createAFrame();
    scene = document.createElement('a-scene');
    scene.connectedRoot = true;
    entity = document.createElement('a-entity');
    scene.appendChild(entity);
    const inspector = {
      sceneEl: scene,
      selectedEntity: entity,
      selectEntity(value) {
        this.selectedEntity = value;
      }
    };
    history = new History(inspector);
    inspector.history = history;
    global.AFRAME.INSPECTOR = inspector;
  });

  afterEach(() => {
    history.dispose();
    global.document = previousDocument;
    global.AFRAME = previousAFrame;
    jest.useRealTimers();
  });

  it('loads off-scene, then records insertion and material assignment as one step', async () => {
    const image = insertNewAsset('img', 'texture', 'image.png', true, () => {
      entity.setAttribute('material', { src: '#texture' });
    });
    expect(scene.querySelector('a-assets')).toBeNull();
    expect(history.entries).toHaveLength(0);
    image.onload();
    expect(history.entries).toHaveLength(1);
    expect(scene.querySelector('img')).toBe(image);
    await history.undo();
    expect(scene.querySelector('a-assets')).toBeNull();
    expect(entity.hasAttribute('material')).toBe(false);
    await history.redo();
    expect(scene.querySelector('img').id).toBe('texture');
    expect(scene.querySelector('img').src).toBe('image.png');
    expect(entity.getDOMAttribute('material').src).toBe('#texture');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not create entries or a container when loading fails or times out', () => {
    const failure = jest.fn();
    const image = insertNewAsset(
      'img',
      'texture',
      'bad.png',
      true,
      null,
      failure
    );
    image.onerror();
    insertNewAsset('img', 'timeout', 'slow.png', true, null, failure);
    jest.advanceTimersByTime(15000);
    expect(failure).toHaveBeenCalledTimes(2);
    expect(history.entries).toHaveLength(0);
    expect(scene.querySelector('a-assets')).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('ignores completion from a scene that has been reset', () => {
    const loaded = jest.fn();
    const failure = jest.fn();
    const image = insertNewAsset(
      'img',
      'texture',
      'image.png',
      true,
      loaded,
      failure
    );
    history.reset();
    image.onload();
    expect(loaded).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalled();
    expect(history.entries).toHaveLength(0);
    expect(scene.querySelector('a-assets')).toBeNull();
  });
});
