import Events from './Events';
import { record } from './history';

export function insertNewAsset(
  type,
  id,
  src,
  anonymousCrossOrigin,
  onLoadedCallback,
  onErrorCallback
) {
  if (type !== 'img') return;
  const scene = AFRAME.INSPECTOR?.sceneEl || document.querySelector('a-scene');
  if (!scene) {
    onErrorCallback?.(new Error('No scene is available.'));
    return;
  }
  const element = document.createElement('img');
  const history = AFRAME.INSPECTOR?.history;
  const generation = history?.generation;
  element.id = id;
  if (anonymousCrossOrigin) element.crossOrigin = 'anonymous';
  let timer;
  const finish = () => {
    clearTimeout(timer);
    element.onload = element.onerror = null;
  };
  const fail = () => {
    finish();
    element.remove();
    onErrorCallback?.(
      new Error(
        'The image could not be loaded. Check its URL and cross-origin permissions.'
      )
    );
  };
  element.onload = () => {
    finish();
    if (
      !scene.isConnected ||
      history?.disposed ||
      generation !== history?.generation
    ) {
      onErrorCallback?.(
        new Error('The scene changed before the image loaded.')
      );
      return;
    }
    try {
      record('Add texture asset', () => {
        let assets = scene.querySelector('a-assets');
        if (!assets) {
          assets = document.createElement('a-assets');
          scene.insertBefore(assets, scene.firstChild);
        }
        assets.appendChild(element);
        onLoadedCallback?.(element);
        Events.emit('scenechanged');
      });
    } catch (error) {
      onErrorCallback?.(error);
    }
  };
  element.onerror = fail;
  timer = setTimeout(fail, 15000);
  // Load off-scene: failures leave neither a history entry nor an empty a-assets.
  element.src = src;
  return element;
}
