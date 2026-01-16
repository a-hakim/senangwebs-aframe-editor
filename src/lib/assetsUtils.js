export function insertNewAsset(
  type,
  id,
  src,
  anonymousCrossOrigin,
  onLoadedCallback
) {
  var element = null;
  switch (type) {
    case 'img':
      {
        element = document.createElement('img');
        element.id = id;
        element.src = src;
        if (anonymousCrossOrigin) {
          element.crossOrigin = 'anonymous';
        }
      }
      break;
  }

  if (element) {
    element.onload = function () {
      if (onLoadedCallback) {
        onLoadedCallback();
      }
    };

    // Get or create the a-assets container
    let assetsContainer = document.querySelector('a-assets');
    if (!assetsContainer) {
      assetsContainer = document.createElement('a-assets');
      const scene = document.querySelector('a-scene');
      if (scene) {
        scene.insertBefore(assetsContainer, scene.firstChild);
      } else {
        console.warn('No a-scene found to insert a-assets');
        return;
      }
    }
    assetsContainer.appendChild(element);
  }
}
