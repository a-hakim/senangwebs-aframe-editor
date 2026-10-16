import React from 'react';
import PropTypes from 'prop-types';
import Events from '../../lib/Events';
import { insertNewAsset } from '../../lib/assetsUtils';

function normalize(value) {
  if (value instanceof HTMLImageElement || value instanceof HTMLVideoElement) {
    return value.id ? '#' + value.id : value.src;
  }
  return typeof value === 'string' ? value : '';
}

export default class TextureWidget extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    label: PropTypes.string,
    componentname: PropTypes.string,
    entity: PropTypes.object,
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func,
    value: PropTypes.oneOfType([PropTypes.object, PropTypes.string])
  };

  state = { value: normalize(this.props.value) };
  canvas = React.createRef();
  previewVersion = 0;

  componentDidMount() {
    this.paintPreview();
  }

  componentDidUpdate(prevProps, prevState) {
    const value = normalize(this.props.value);
    // A-Frame may resolve '#id' to an image; compare canonical strings.
    if (
      value !== normalize(prevProps.value) ||
      this.props.entity !== prevProps.entity
    ) {
      if (value !== this.state.value) {
        this.setState({ value });
        return;
      }
      this.paintPreview();
    } else if (prevState.value !== this.state.value) {
      this.paintPreview();
    }
  }

  componentWillUnmount() {
    this.previewVersion++;
    this.cancelImage?.();
  }

  paintPreview() {
    const canvas = this.canvas.current;
    if (!canvas) return;
    this.cancelImage?.();
    const version = ++this.previewVersion;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    const value = this.state.value;
    const asset = value.startsWith('#')
      ? document.getElementById(value.slice(1))
      : null;
    if (asset instanceof HTMLVideoElement || !value) return;
    const url =
      asset?.src ||
      (value.startsWith('#') ? '' : AFRAME.utils.srcLoader.parseUrl(value));
    if (!url) return;
    const image = new Image();
    const clear = () => {
      image.onload = image.onerror = null;
    };
    this.cancelImage = clear;
    image.onload = () => {
      if (
        version === this.previewVersion &&
        this.canvas.current &&
        image.naturalWidth
      ) {
        const ratio = Math.min(
          canvas.width / image.naturalWidth,
          canvas.height / image.naturalHeight
        );
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(
          image,
          0,
          0,
          image.naturalWidth * ratio,
          image.naturalHeight * ratio
        );
      }
      clear();
    };
    image.onerror = clear;
    image.src = url;
  }

  changeValue = (value) => {
    this.setState({ value });
    this.props.onChange?.(this.props.name, value);
  };

  openDialog = () => {
    Events.emit('opentexturesmodal', this.state.value, (image) => {
      if (!image || !this.canvas.current) return;
      if (image.type === 'asset') {
        this.changeValue(image.value);
        return;
      }
      const assets = [
        ...this.props.entity.sceneEl.querySelectorAll('a-assets img')
      ];
      const existing = assets.find((asset) => asset.src === image.src);
      if (existing) {
        this.changeValue('#' + existing.id);
        return;
      }
      const base =
        'texture-' +
        (image.id || image.name || 'image').replace(/[^\w-]/g, '-');
      let id = base;
      let suffix = 2;
      while (document.getElementById(id)) id = base + '-' + suffix++;
      insertNewAsset('img', id, image.src, true, () => {
        if (this.canvas.current) this.changeValue('#' + id);
      });
    });
  };

  render() {
    const label = this.props.label || this.props.name;
    return (
      <span className="texture">
        <input
          id={this.props.id}
          aria-label={label}
          className="map_value string"
          type="text"
          value={this.state.value}
          onChange={(event) => this.changeValue(event.target.value)}
        />
        <button
          type="button"
          className="texture-picker"
          onClick={this.openDialog}
          aria-label={`Choose ${label} texture`}
          title="Choose texture"
        >
          <canvas ref={this.canvas} width="32" height="16" aria-hidden="true" />
        </button>
      </span>
    );
  }
}
