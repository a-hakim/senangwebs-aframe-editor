import React from 'react';
import PropTypes from 'prop-types';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from '../AwesomeIcon';
import Events from '../../lib/Events';
import Modal from './Modal';
import { insertNewAsset } from '../../lib/assetsUtils';

// Regex compiled once for performance
const VALID_ID_REGEX = /^[A-Za-z]+[\w-]*$/;

const getFilename = (url, converted = false) => {
  const filename = url.split('/').pop();
  return converted ? getValidId(filename) : filename;
};

const isValidId = (id) => VALID_ID_REGEX.test(id);

const getValidId = (name) =>
  name
    .split('.')
    .shift()
    .replace(/\s/, '-')
    .replace(/^\d+\s*/, '')
    .replace(/[\W]/, '')
    .toLowerCase();

// Default preview state - reusable constant
const DEFAULT_PREVIEW = {
  width: 0,
  height: 0,
  src: 'https://use.senangwebs.com/img/app_icon.png',
  id: '',
  name: '',
  filename: '',
  type: '',
  value: '',
  loaded: false
};

// Reusable ImageItem component to prevent repeated JSX
const ImageItem = React.memo(({ image, onClick, isSelected }) => (
  <div
    onClick={onClick}
    className={`gallery-item${isSelected ? ' selected' : ''}`}
  >
    <img width="155px" height="155px" src={image.src} alt={image.name} />
    <div className="detail">
      <span className="title">{image.name}</span>
      <span>{getFilename(image.src)}</span>
      <span>
        {image.width} x {image.height}
      </span>
    </div>
  </div>
));

ImageItem.displayName = 'ImageItem';

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
    isGalleryLoading: false,
    preview: { ...DEFAULT_PREVIEW }
  };

  imageName = React.createRef();
  previewImg = React.createRef();

  componentDidMount() {
    Events.on('assetsimagesload', this.handleAssetsImagesLoad);
    this.generateFromAssets();
  }

  componentWillUnmount() {
    Events.off('assetsimagesload', this.handleAssetsImagesLoad);
  }

  componentDidUpdate(prevProps) {
    const { isOpen } = this.props;
    if (isOpen && !AFRAME.INSPECTOR.assetsLoader.hasLoaded) {
      AFRAME.INSPECTOR.assetsLoader.load();
    }
    if (isOpen && isOpen !== prevProps.isOpen) {
      this.generateFromAssets();
    }
  }

  handleAssetsImagesLoad = () => {
    this.generateFromRegistry();
  };

  onClose = () => {
    this.props.onClose?.();
  };

  selectTexture = (image) => {
    this.props.onClose?.(image);
  };

  generateFromRegistry = () => {
    const images = AFRAME.INSPECTOR.assetsLoader.images;
    const newImages = [];
    let loadedCount = 0;

    if (images.length === 0) {
      this.setState({ registryImages: [], isGalleryLoading: false });
      return;
    }

    this.setState({ isGalleryLoading: true });

    images.forEach((imageData) => {
      const image = new Image();
      image.onload = () => {
        newImages.push({
          id: imageData.id,
          src: imageData.fullPath,
          width: imageData.width,
          height: imageData.height,
          name: imageData.id,
          type: 'registry',
          tags: imageData.tags,
          value: `url(${imageData.fullPath})`
        });
        loadedCount++;
        // Batch update when all images are loaded
        if (loadedCount === images.length) {
          this.setState({ registryImages: newImages, isGalleryLoading: false });
        }
      };
      image.src = imageData.fullThumbPath;
    });
  };

  generateFromAssets = () => {
    const assets = Array.from(document.querySelectorAll('a-assets img'));
    const newImages = [];
    const seenIds = new Set();
    let loadedCount = 0;

    if (assets.length === 0) {
      this.setState({ assetsImages: [] });
      return;
    }

    assets.forEach((asset) => {
      const image = new Image();
      image.onload = () => {
        // Prevent duplicates
        if (!seenIds.has(asset.id)) {
          seenIds.add(asset.id);
          newImages.push({
            id: asset.id,
            src: image.src,
            width: image.width,
            height: image.height,
            name: asset.id,
            type: 'asset',
            value: '#' + asset.id
          });
        }
        loadedCount++;
        // Batch update when all images are loaded
        if (loadedCount === assets.length) {
          this.setState({ assetsImages: newImages });
        }
      };
      image.src = asset.src;
    });
  };

  onNewUrl = (event) => {
    if (event.keyCode !== 13) return;
    this.loadImageFromUrl();
  };

  loadImageFromUrl = () => {
    const url = this.state.newUrl;
    if (!url) return;

    const previewEl = this.previewImg.current;
    const handleLoad = () => {
      const src = previewEl.src;
      this.setState({
        preview: {
          width: previewEl.naturalWidth,
          height: previewEl.naturalHeight,
          src,
          id: '',
          name: getFilename(src, true),
          filename: getFilename(src),
          type: 'new',
          loaded: true,
          value: `url(${src})`
        }
      });
      previewEl.removeEventListener('load', handleLoad);
    };

    previewEl.addEventListener('load', handleLoad);
    previewEl.src = url;
    this.imageName.current?.focus();
  };

  onNameKeyUp = (event) => {
    if (event.keyCode === 13 && this.isValidAsset()) {
      this.addNewAsset();
    }
  };

  onNameChanged = (event) => {
    this.setState((prevState) => ({
      preview: { ...prevState.preview, name: event.target.value }
    }));
  };

  toggleNewDialog = () => {
    this.setState((prevState) => ({
      addNewDialogOpened: !prevState.addNewDialogOpened
    }));
  };

  clear = () => {
    this.setState({
      preview: { ...DEFAULT_PREVIEW },
      newUrl: ''
    });
  };

  onUrlChange = (e) => {
    this.setState({ newUrl: e.target.value });
  };

  isValidAsset = () => {
    const { preview } = this.state;
    return preview.loaded && isValidId(preview.name);
  };

  addNewAsset = () => {
    this.setState({ isLoading: true });
    const { preview } = this.state;

    insertNewAsset('img', preview.name, preview.src, true, () => {
      this.generateFromAssets();
      this.setState({ addNewDialogOpened: false, isLoading: false });
      this.clear();
    });
  };

  onChangeFilter = (e) => {
    this.setState({ filterText: e.target.value });
  };

  selectRegistryImage = (image) => {
    this.setState({
      preview: {
        width: image.width,
        height: image.height,
        src: image.src,
        id: '',
        name: getFilename(image.name, true),
        filename: getFilename(image.src),
        type: 'registry',
        loaded: true,
        value: `url(${image.src})`
      }
    });
    this.imageName.current?.focus();
  };

  getFilteredRegistryImages = () => {
    const filterText = this.state.filterText.toUpperCase();
    if (!filterText) return this.state.registryImages;

    return this.state.registryImages.filter(
      (image) =>
        image.id.toUpperCase().includes(filterText) ||
        image.name.toUpperCase().includes(filterText) ||
        image.tags.includes(filterText)
    );
  };

  getSortedAssetImages = () => {
    return [...this.state.assetsImages].sort((a, b) =>
      a.id.localeCompare(b.id)
    );
  };

  render() {
    const { isOpen, selectedTexture } = this.props;
    const { preview, addNewDialogOpened, newUrl, filterText, isLoading } =
      this.state;

    const validUrl = isValidId(preview.name);
    const validAsset = this.isValidAsset();
    const addNewAssetButton = addNewDialogOpened ? 'BACK' : 'LOAD TEXTURE';

    return (
      <Modal
        id="textureModal"
        title="Textures"
        isOpen={isOpen}
        onClose={this.onClose}
        closeOnClickOutside={false}
      >
        {/* Toolbar */}
        <div className="texture-toolbar">
          <button onClick={this.toggleNewDialog}>{addNewAssetButton}</button>
          {addNewDialogOpened && (
            <div className="url-input-group">
              <input
                type="text"
                className="imageUrl"
                placeholder="Paste image URL"
                value={newUrl}
                onChange={this.onUrlChange}
                onKeyUp={this.onNewUrl}
              />
              <button
                className="load-url-btn"
                onClick={this.loadImageFromUrl}
                disabled={!newUrl}
              >
                LOAD
              </button>
            </div>
          )}
        </div>

        {/* Add New Texture Dialog */}
        <div className={addNewDialogOpened ? '' : 'hide'}>
          <div className="newimage">
            <div className="new_asset_options">
              <div className="registry-section">
                <span className="section-label">
                  Select from assets registry:
                </span>
                <div className="assets search">
                  <input
                    placeholder="Filter textures..."
                    value={filterText}
                    onChange={this.onChangeFilter}
                  />
                  <AwesomeIcon icon={faSearch} />
                </div>
              </div>
              <div className="gallery">
                {this.state.isGalleryLoading ? (
                  <div className="loading-indicator">Loading textures...</div>
                ) : (
                  this.getFilteredRegistryImages().map((image) => (
                    <ImageItem
                      key={image.src}
                      image={image}
                      onClick={() => this.selectRegistryImage(image)}
                    />
                  ))
                )}
              </div>
            </div>
            <div className="preview">
              <span className="section-label">Name:</span>
              <input
                ref={this.imageName}
                className={preview.name.length > 0 && !validUrl ? 'error' : ''}
                type="text"
                placeholder="Enter texture name"
                value={preview.name}
                onChange={this.onNameChanged}
                onKeyUp={this.onNameKeyUp}
              />
              <img
                ref={this.previewImg}
                width="242px"
                height="242px"
                src={preview.src}
                alt="Preview"
              />
              {preview.loaded && (
                <div className="detail">
                  <span className="title" title={preview.filename}>
                    {preview.filename}
                  </span>
                  <span className="dimensions">
                    {preview.width} x {preview.height}
                  </span>
                </div>
              )}
              <button
                disabled={!validAsset || isLoading}
                onClick={this.addNewAsset}
              >
                {isLoading ? 'LOADING...' : 'LOAD THIS TEXTURE'}
              </button>
            </div>
          </div>
        </div>

        {/* Asset Gallery */}
        <div className={addNewDialogOpened ? 'hide' : ''}>
          <div className="gallery">
            {this.getSortedAssetImages().map((image) => (
              <ImageItem
                key={image.id}
                image={image}
                onClick={() => this.selectTexture(image)}
                isSelected={selectedTexture === '#' + image.id}
              />
            ))}
          </div>
        </div>
      </Modal>
    );
  }
}
