import Events from './Events';

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
    Events.emit('scenechanged');
    onLoadedCallback?.(element);
  };
  element.onerror = fail;
  timer = setTimeout(fail, 15000);
  let assets = scene.querySelector('a-assets');
  if (!assets) {
    assets = document.createElement('a-assets');
    scene.insertBefore(assets, scene.firstChild);
  }
  assets.appendChild(element);
  element.src = src;
  return element;
}
