import React from 'react';
import PropTypes from 'prop-types';
import { createEventScope } from '../../lib/Events';
import Modal from './Modal';
import { insertNewAsset } from '../../lib/assetsUtils';

const validId = (id) => /^[A-Za-z][\w-]*$/.test(id);
function filename(src) {
  try {
    return decodeURIComponent(
      new URL(src, document.baseURI).pathname.split('/').pop()
    );
  } catch (error) {
    return '';
  }
}
function assetName(src) {
  return (
    filename(src)
      .replace(/\.[^.]*$/, '')
      .replace(/[^\w-]/g, '-')
      .replace(/^[^A-Za-z]+/, '') || 'texture'
  );
}
const emptyPreview = () => ({
  src: '',
  name: '',
  width: 0,
  height: 0,
  loaded: false
});

function ImageItem({ image, onClick, isSelected }) {
  const src = image.type === 'registry' ? image.thumbnail : image.src;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Select ${image.name}`}
      aria-pressed={!!isSelected}
      className={`gallery-item${isSelected ? ' selected' : ''}`}
    >
      {src && (
        <img
          width="155"
          height="155"
          loading="lazy"
          decoding="async"
          src={src}
          alt=""
        />
      )}
      <span className="detail">
        <span className="title">{image.name}</span>
        <span>{filename(image.src)}</span>
        {image.width > 0 && (
          <span>
            {image.width} x {image.height}
          </span>
        )}
      </span>
    </button>
  );
}
ImageItem.propTypes = {
  image: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
  isSelected: PropTypes.bool
};

export default class ModalTextures extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    selectedTexture: PropTypes.string
  };
  state = {
    filterText: '',
    assetsImages: [],
    registryImages: [],
    addNewDialogOpened: false,
    newUrl: '',
    isLoading: false,
    isPreviewLoading: false,
    isGalleryLoading: false,
    error: '',
    registryError: '',
    assetError: '',
    preview: emptyPreview()
  };

  imageName = React.createRef();
  events = createEventScope();
  previewVersion = 0;
  assetWatchers = [];

  componentDidMount() {
    this.mounted = true;
    this.events.on('assetsimagesload', this.generateFromRegistry);
    this.events.on('assetsimagesloading', () =>
      this.setState({ isGalleryLoading: true, registryError: '' })
    );
    this.events.on('assetsimageserror', (registryError) =>
      this.setState({ isGalleryLoading: false, registryError })
    );
    if (this.props.isOpen) this.generateFromAssets();
  }

  componentDidUpdate(prevProps) {
    if (this.props.isOpen && !prevProps.isOpen) {
      this.setState({
        addNewDialogOpened: false,
        error: '',
        preview: emptyPreview(),
        isLoading: false,
        isPreviewLoading: false
      });
      this.generateFromAssets();
    }
    if (!this.props.isOpen && prevProps.isOpen) {
      this.cancelPreview?.();
      this.clearAssetWatchers();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    this.cancelPreview?.();
    this.clearAssetWatchers();
    this.events.dispose();
  }

  clearAssetWatchers = () => {
    this.assetWatchers.splice(0).forEach((remove) => remove());
    clearTimeout(this.assetTimer);
  };

  generateFromAssets = () => {
    this.clearAssetWatchers();
    const assets = [
      ...AFRAME.INSPECTOR.sceneEl.querySelectorAll('a-assets img')
    ];
    const ready = assets.filter(
      (asset) => asset.complete && asset.naturalWidth > 0 && asset.id
    );
    const pending = assets.filter((asset) => !asset.complete);
    const broken = assets.some(
      (asset) => asset.complete && !asset.naturalWidth
    );
    this.setState({
      assetsImages: ready.map((asset) => ({
        id: asset.id,
        src: asset.src,
        name: asset.id,
        width: asset.naturalWidth,
        height: asset.naturalHeight,
        type: 'asset',
        value: '#' + asset.id
      })),
      assetError: broken
        ? 'Some project images could not be loaded. Check their URLs, then retry.'
        : ''
    });
    pending.forEach((asset) => {
      asset.addEventListener('load', this.generateFromAssets);
      asset.addEventListener('error', this.generateFromAssets);
      this.assetWatchers.push(() => {
        asset.removeEventListener('load', this.generateFromAssets);
        asset.removeEventListener('error', this.generateFromAssets);
      });
    });
    if (pending.length) {
      this.assetTimer = setTimeout(() => {
        if (this.mounted && this.props.isOpen)
          this.setState({
            assetError:
              'Some project images are taking too long to load. Check their URLs, then retry.'
          });
      }, 15000);
    }
  };

  generateFromRegistry = () => {
    this.setState({
      registryImages: AFRAME.INSPECTOR.assetsLoader.images.map((image) => ({
        id: image.id,
        src: image.fullPath,
        thumbnail: image.fullThumbPath,
        name: image.id,
        width: image.width,
        height: image.height,
        tags: image.tags || [],
        type: 'registry'
      })),
      isGalleryLoading: false,
      registryError: ''
    });
  };

  ensureRegistry = () => {
    const loader = AFRAME.INSPECTOR.assetsLoader;
    if (loader.hasLoaded) this.generateFromRegistry();
    else loader.load();
  };

  toggleNewDialog = () => {
    this.cancelPreview?.();
    this.setState(
      (state) => ({
        addNewDialogOpened: !state.addNewDialogOpened,
        isPreviewLoading: false,
        error: '',
        preview: emptyPreview()
      }),
      () => {
        if (this.state.addNewDialogOpened) this.ensureRegistry();
      }
    );
  };

  loadPreview = (src, suggestedName) => {
    this.cancelPreview?.();
    const version = ++this.previewVersion;
    const image = new Image();
    let timer;
    const clear = () => {
      clearTimeout(timer);
      image.onload = image.onerror = null;
    };
    this.cancelPreview = () => {
      this.previewVersion++;
      clear();
    };
    this.setState({
      preview: emptyPreview(),
      isPreviewLoading: true,
      error: ''
    });
    const fail = () => {
      clear();
      if (
        this.mounted &&
        this.props.isOpen &&
        version === this.previewVersion
      ) {
        this.setState({
          isPreviewLoading: false,
          error:
            'The image could not be loaded. Check the URL and image permissions, then retry.'
        });
      }
    };
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      clear();
      if (
        !this.mounted ||
        !this.props.isOpen ||
        version !== this.previewVersion
      )
        return;
      this.setState(
        {
          isPreviewLoading: false,
          preview: {
            src: image.src,
            name: suggestedName || assetName(src),
            width: image.naturalWidth,
            height: image.naturalHeight,
            loaded: true
          }
        },
        () => this.imageName.current?.focus()
      );
    };
    image.onerror = fail;
    timer = setTimeout(fail, 15000);
    image.src = src;
  };

  loadImageFromUrl = () => {
    const src = this.state.newUrl.trim();
    if (src) this.loadPreview(src);
  };

  validAsset = () => {
    const { preview, isLoading, isPreviewLoading } = this.state;
    const existing = document.getElementById(preview.name);
    return (
      preview.loaded &&
      validId(preview.name) &&
      !isLoading &&
      !isPreviewLoading &&
      (!existing ||
        (existing.tagName === 'IMG' && existing.src === preview.src))
    );
  };

  addNewAsset = () => {
    if (!this.validAsset()) return;
    const { preview } = this.state;
    if (document.getElementById(preview.name)) {
      this.setState({ addNewDialogOpened: false, preview: emptyPreview() });
      this.generateFromAssets();
      return;
    }
    this.setState({ isLoading: true, error: '' });
    insertNewAsset(
      'img',
      preview.name,
      preview.src,
      true,
      () => {
        if (!this.mounted || !this.props.isOpen) return;
        this.setState({
          addNewDialogOpened: false,
          isLoading: false,
          preview: emptyPreview()
        });
        this.generateFromAssets();
      },
      (error) => {
        if (this.mounted && this.props.isOpen)
          this.setState({ isLoading: false, error: error.message });
      }
    );
  };

  render() {
    if (!this.props.isOpen) return null;
    const {
      preview,
      addNewDialogOpened,
      filterText,
      newUrl,
      isLoading,
      isPreviewLoading,
      isGalleryLoading,
      error,
      registryError,
      assetError
    } = this.state;
    const filter = filterText.toLowerCase();
    const images = this.state.registryImages.filter((image) =>
      [image.id, ...image.tags].some((text) =>
        String(text).toLowerCase().includes(filter)
      )
    );
    const existing = document.getElementById(preview.name);
    const nameConflict =
      !!preview.name &&
      (!validId(preview.name) || (existing && existing.src !== preview.src));
    return (
      <Modal
        id="textureModal"
        title="Textures"
        isOpen={this.props.isOpen}
        onClose={this.props.onClose}
        closeOnClickOutside={false}
      >
        <div className="texture-toolbar">
          <button type="button" onClick={this.toggleNewDialog}>
            {addNewDialogOpened ? 'Back' : 'Load texture'}
          </button>
          {addNewDialogOpened && (
            <div className="url-input-group">
              <input
                type="url"
                aria-label="Image URL"
                placeholder="Paste image URL"
                value={newUrl}
                onChange={(event) => {
                  this.cancelPreview?.();
                  this.setState({
                    newUrl: event.target.value,
                    preview: emptyPreview(),
                    isPreviewLoading: false,
                    error: ''
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    this.loadImageFromUrl();
                  }
                }}
              />
              <button
                type="button"
                disabled={!newUrl.trim() || isPreviewLoading || isLoading}
                onClick={this.loadImageFromUrl}
              >
                Load
              </button>
            </div>
          )}
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {addNewDialogOpened ? (
          <div className="newimage">
            <div className="new_asset_options">
              <p className="section-label">
                Choose a library texture or enter an image URL.
              </p>
              <input
                aria-label="Filter textures"
                placeholder="Filter textures..."
                value={filterText}
                onChange={(event) =>
                  this.setState({ filterText: event.target.value })
                }
              />
              {registryError && (
                <p role="alert" className="form-error">
                  {registryError} Go back and choose Load texture to retry.
                </p>
              )}
              <div className="gallery" aria-busy={isGalleryLoading}>
                {isGalleryLoading ? (
                  <p role="status">Loading texture library...</p>
                ) : (
                  images.map((image) => (
                    <ImageItem
                      key={image.src}
                      image={image}
                      onClick={() =>
                        this.loadPreview(image.src, assetName(image.src))
                      }
                    />
                  ))
                )}
                {!isGalleryLoading && !registryError && !images.length && (
                  <p>No matching textures.</p>
                )}
              </div>
            </div>
            <div className="preview" aria-busy={isPreviewLoading || isLoading}>
              <label htmlFor="texture-name">Texture name</label>
              <input
                id="texture-name"
                ref={this.imageName}
                type="text"
                value={preview.name}
                aria-invalid={nameConflict}
                aria-describedby={
                  nameConflict ? 'texture-name-error' : undefined
                }
                onChange={(event) =>
                  this.setState({
                    preview: { ...preview, name: event.target.value }
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    this.addNewAsset();
                  }
                }}
              />
              {nameConflict && (
                <p id="texture-name-error" className="form-error">
                  Use a unique name starting with a letter; letters, numbers,
                  hyphens and underscores are allowed.
                </p>
              )}
              {isPreviewLoading && <p role="status">Loading image...</p>}
              {preview.loaded && (
                <>
                  <img
                    width="242"
                    height="242"
                    src={preview.src}
                    alt="Selected texture preview"
                  />
                  <p>
                    {preview.width} x {preview.height}
                  </p>
                </>
              )}
              <button
                type="button"
                disabled={!this.validAsset()}
                onClick={this.addNewAsset}
              >
                {isLoading ? 'Adding texture...' : 'Load this texture'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="section-label">Project textures</p>
            {assetError && (
              <p role="alert" className="form-error">
                {assetError} Close and reopen Textures to retry.
              </p>
            )}
            <div className="gallery">
              {[...this.state.assetsImages]
                .sort((a, b) => a.id.localeCompare(b.id))
                .map((image) => (
                  <ImageItem
                    key={image.id}
                    image={image}
                    isSelected={this.props.selectedTexture === image.value}
                    onClick={() => this.props.onClose?.(image)}
                  />
                ))}
            </div>
            {!this.state.assetsImages.length && (
              <p>No project textures yet. Choose Load texture to add one.</p>
            )}
          </div>
        )}
      </Modal>
    );
  }
}
