import Events from './Events';

const assetsBaseUrl =
  window.AFRAME_SAMPLE_ASSETS_ROOT || 'https://aframe.io/sample-assets/';

export function AssetsLoader() {
  this.images = [];
  this.hasLoaded = false;
  this.isLoading = false;
  this.error = '';
}

AssetsLoader.prototype = {
  load: function () {
    if (this.isLoading) return;
    const collection = window.COLLECTION_ASSETS_ROOT;
    const xhr = (this.xhr = new XMLHttpRequest());
    this.isLoading = true;
    this.error = '';
    Events.emit('assetsimagesloading');
    const fail = () => {
      this.isLoading = false;
      this.hasLoaded = false;
      this.error =
        'The texture library could not be loaded. Check your connection and retry.';
      Events.emit('assetsimageserror', this.error);
    };
    xhr.open('GET', collection || assetsBaseUrl + 'dist/images.json');
    xhr.timeout = 15000;
    xhr.onerror = xhr.ontimeout = fail;
    xhr.onload = () => {
      try {
        if (xhr.status < 200 || xhr.status >= 300)
          throw new Error('HTTP ' + xhr.status);
        const data = JSON.parse(xhr.responseText);
        if (collection) {
          if (!Array.isArray(data)) throw new Error('Invalid collection');
          this.images = data
            .filter((item) => item && typeof item.src === 'string')
            .map((item, index) => ({
              id: item.id || 'image-' + index,
              fullPath: item.src,
              // Without a supplied thumbnail, defer the full image until selection.
              fullThumbPath: item.thumbnail || item.thumb || '',
              width: item.width,
              height: item.height,
              tags: item.tags || []
            }));
        } else {
          if (!Array.isArray(data.images)) throw new Error('Invalid catalog');
          this.images = data.images.map((image) => ({
            ...image,
            fullPath: assetsBaseUrl + data.basepath.images + image.path,
            fullThumbPath: image.thumbnail
              ? assetsBaseUrl +
                data.basepath.images_thumbnails +
                image.thumbnail
              : ''
          }));
        }
        this.isLoading = false;
        this.hasLoaded = true;
        Events.emit('assetsimagesload', this.images);
      } catch (error) {
        fail();
      }
    };
    xhr.send();
  },

  loadCollection: function () {
    this.load();
  },

  dispose: function () {
    this.xhr?.abort();
    this.isLoading = false;
  }
};
