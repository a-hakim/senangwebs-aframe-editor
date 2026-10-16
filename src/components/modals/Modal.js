import React from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

const stack = [];
const background = new Map();
let nextId = 0;
const focusable =
  'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';

function updateBackground() {
  background.forEach((inert, node) => {
    node.inert = inert;
  });
  background.clear();
  const top = stack[stack.length - 1];
  let branch = top?.self.current;
  while (branch && branch !== document.body) {
    const parent = branch.parentElement;
    if (!parent) break;
    [...parent.children]
      .filter((node) => node !== branch)
      .forEach((node) => {
        background.set(node, node.inert);
        node.inert = true;
      });
    branch = parent;
  }
}

export default class Modal extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    children: PropTypes.node.isRequired,
    isOpen: PropTypes.bool,
    extraCloseKeyCode: PropTypes.number,
    closeOnClickOutside: PropTypes.bool,
    onClose: PropTypes.func,
    title: PropTypes.string
  };

  static defaultProps = { closeOnClickOutside: true };
  self = React.createRef();
  titleId = 'inspector-dialog-' + ++nextId;

  componentDidMount() {
    if (this.props.isOpen) this.activate();
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.isOpen && this.props.isOpen) this.activate();
    if (prevProps.isOpen && !this.props.isOpen) this.deactivate();
  }

  componentWillUnmount() {
    this.deactivate();
  }

  activate() {
    this.opener = document.activeElement;
    stack.push(this);
    updateBackground();
    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('keyup', this.onKeyUp, true);
    document.addEventListener('focusin', this.onFocus, true);
    this.focusFirst();
  }

  deactivate() {
    const index = stack.indexOf(this);
    if (index === -1) return;
    const wasTop = index === stack.length - 1;
    stack.splice(index, 1);
    document.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('keyup', this.onKeyUp, true);
    document.removeEventListener('focusin', this.onFocus, true);
    updateBackground();
    if (wasTop && this.opener?.isConnected && !this.opener.closest('[inert]')) {
      this.opener.focus();
    }
  }

  isTop = () => stack[stack.length - 1] === this;
  getControls = () =>
    [...(this.self.current?.querySelectorAll(focusable) || [])].filter(
      (node) => node.getClientRects().length && !node.closest('[inert]')
    );
  focusFirst = () => (this.getControls()[0] || this.self.current)?.focus();

  onFocus = (event) => {
    if (this.isTop() && !this.self.current?.contains(event.target))
      this.focusFirst();
  };

  onKeyDown = (event) => {
    if (!this.isTop()) return;
    // Stop global editor shortcuts without suppressing the controls' own handlers.
    if (event.key === 'Tab') {
      const controls = this.getControls();
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        this.self.current?.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          !this.self.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  onKeyUp = (event) => {
    if (!this.isTop()) return;
    if (
      event.key === 'Escape' ||
      (this.props.extraCloseKeyCode &&
        event.keyCode === this.props.extraCloseKeyCode &&
        !event.target.matches('input, textarea, select'))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.props.onClose?.();
    }
  };

  render() {
    if (!this.props.isOpen) return null;
    return createPortal(
      <div
        id={this.props.id}
        className="modal"
        onMouseDown={(event) => {
          if (
            event.target === event.currentTarget &&
            this.props.closeOnClickOutside &&
            this.isTop()
          )
            this.props.onClose?.();
        }}
      >
        <div
          className="modal-content"
          ref={this.self}
          role="dialog"
          aria-modal="true"
          aria-labelledby={this.titleId}
          tabIndex="-1"
        >
          <div className="modal-header">
            <h3 id={this.titleId}>{this.props.title}</h3>
            <button
              type="button"
              className="close"
              aria-label={`Close ${this.props.title || 'dialog'}`}
              onClick={this.props.onClose}
            >
              &times;
            </button>
          </div>
          <div className="modal-body">{this.props.children}</div>
        </div>
      </div>,
      document.getElementById('aframeInspector') || document.body
    );
  }
}
