import Events from './Events';

const assetsBaseUrl =
  window.AFRAME_SAMPLE_ASSETS_ROOT || 'https://aframe.io/sample-assets/';
const assetsRelativeUrl = { images: 'dist/images.json' };
const collectionAssetsRoot = window.COLLECTION_ASSETS_ROOT;

/**
 * Asynchronously load and register components from the registry.
 */
export function AssetsLoader() {
  this.images = [];
  this.hasLoaded = false;
}

AssetsLoader.prototype = {
  /**
   * XHR the assets JSON.
   */
  load: function () {
    if (collectionAssetsRoot) {
      this.loadCollection();
      return;
    }

    var xhr = new XMLHttpRequest();
    var url = assetsBaseUrl + assetsRelativeUrl.images;

    // @todo Remove the sync call and use a callback
    xhr.open('GET', url);

    xhr.onload = () => {
      var data = JSON.parse(xhr.responseText);
      this.images = data.images;
      this.images.forEach((image) => {
        image.fullPath = assetsBaseUrl + data.basepath.images + image.path;
        image.fullThumbPath =
          assetsBaseUrl + data.basepath.images_thumbnails + image.thumbnail;
      });
      Events.emit('assetsimagesload', this.images);
    };
    xhr.onerror = () => {
      console.error('Error loading registry file.');
    };
    xhr.send();

    this.hasLoaded = true;
  },

  /**
   * XHR the collection assets JSON.
   */
  loadCollection: function () {
    if (!collectionAssetsRoot) return;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', collectionAssetsRoot);

    xhr.onload = () => {
      try {
        var data = JSON.parse(xhr.responseText);
        if (Array.isArray(data)) {
          // Clear all existing assets including those loaded from load()
          this.images = [];

          data.forEach((item) => {
            // Extract filename from URL to use as ID
            var filename = item.src.split('/').pop() || '';
            var id =
              filename
                .split('.')
                .shift()
                .replace(/\s/, '-')
                .replace(/^\d+\s*/, '')
                .replace(/[\W]/, '')
                .toLowerCase() || 'img' + Math.floor(Math.random() * 10000);

            var isDuplicate = this.images.some(function (existingImage) {
              return (
                existingImage.id === id || existingImage.fullPath === item.src
              );
            });

            if (!isDuplicate) {
              this.images.push({
                id: id,
                fullPath: item.src,
                fullThumbPath: item.src,
                tags: []
              });
            }
          });
          Events.emit('assetsimagesload', this.images);
        }
      } catch (e) {
        console.error('Error parsing collection file.', e);
      }
    };
    xhr.onerror = () => {
      console.error('Error loading collection file.');
    };
    xhr.send();

    this.hasLoaded = true;
  }
};
