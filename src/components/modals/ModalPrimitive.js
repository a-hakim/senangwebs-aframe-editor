import React from 'react';
import PropTypes from 'prop-types';

const PRIMITIVES = [
  { type: 'a-box', label: 'Box' },
  { type: 'a-sphere', label: 'Sphere' },
  { type: 'a-plane', label: 'Plane' },
  { type: 'a-image', label: 'Image' },
  { type: 'a-cylinder', label: 'Cylinder' },
  { type: 'a-cone', label: 'Cone' },
  { type: 'a-torus', label: 'Torus' },
  { type: 'a-light', label: 'Light' },
  { type: 'a-entity', label: 'Empty Entity' } // Added empty entity as well
];

export default function ModalPrimitive({ isOpen, onClose, onSelectPrimitive }) {
  if (!isOpen) {
    return null;
  }

  const handleSelect = (primitiveType) => {
    onSelectPrimitive(primitiveType);
  };

  // Stop propagation to prevent closing modal when clicking inside
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" id='primitive-modal' onClick={handleModalContentClick}>
        <div className="modal-header">
          <h3>Select Primitive</h3>
          <span className="close" onClick={onClose}>×</span>
        </div>
        <div className='modal-body'>
          <div className="primitive-grid">
            {PRIMITIVES.map((primitive) => (
              <button
                key={primitive.type}
                className="primitive-button"
                onClick={() => handleSelect(primitive.type)}
                title={`Add ${primitive.label}`}
              >
                {primitive.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

ModalPrimitive.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelectPrimitive: PropTypes.func.isRequired,
};
