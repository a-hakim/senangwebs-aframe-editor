import React from 'react';
import PropTypes from 'prop-types';
import PrimitiveBoxIcon from '../icons/primitiveBoxIcon';
import PrimitiveConeIcon from '../icons/PrimitiveConeIcon';
import PrimitiveCylinderIcon from '../icons/PrimitiveCylinderIcon';
import PrimitiveEmptyEntityIcon from '../icons/PrimitiveEmptyEntityIcon';
import PrimitiveImageIcon from '../icons/PrimitiveImageIcon';
import PrimitiveLightIcon from '../icons/PrimitiveLightIcon';
import PrimitivePlaneIcon from '../icons/PrimitivePlaneIcon';
import PrimitiveSphereIcon from '../icons/PrimitiveSphereIcon';
import PrimitiveTorusIcon from '../icons/PrimitiveTorusIcon';
import PrimitiveTextIcon from '../icons/PrimitiveTextIcon';

const PRIMITIVES = [
  { type: 'a-box', label: 'Box', icon: <PrimitiveBoxIcon color="#ffffff" /> },
  {
    type: 'a-sphere',
    label: 'Sphere',
    icon: <PrimitiveSphereIcon color="#ffffff" />
  },
  {
    type: 'a-cylinder',
    label: 'Cylinder',
    icon: <PrimitiveCylinderIcon color="#ffffff" />
  },
  {
    type: 'a-cone',
    label: 'Cone',
    icon: <PrimitiveConeIcon color="#ffffff" />
  },
  {
    type: 'a-torus',
    label: 'Torus',
    icon: <PrimitiveTorusIcon color="#ffffff" />
  },
  {
    type: 'a-plane',
    label: 'Plane',
    icon: <PrimitivePlaneIcon color="#ffffff" />
  },
  {
    type: 'a-image',
    label: 'Image',
    icon: <PrimitiveImageIcon color="#ffffff" />
  },
  {
    type: 'a-text',
    label: 'Text',
    icon: <PrimitiveTextIcon color="#ffffff" />
  },
  {
    type: 'a-light',
    label: 'Light',
    icon: <PrimitiveLightIcon color="#ffffff" />
  },
  {
    type: 'a-entity',
    label: 'Empty Entity',
    icon: <PrimitiveEmptyEntityIcon color="#ffffff" />
  }
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
      <div
        className="modal-content"
        id="primitive-modal"
        onClick={handleModalContentClick}
      >
        <div className="modal-header">
          <h3>Select Primitive</h3>
          <span className="close" onClick={onClose}>
            ×
          </span>
        </div>
        <div className="modal-body">
          <div className="primitive-grid">
            {PRIMITIVES.map((primitive) => (
              <button
                key={primitive.type}
                className="primitive-button"
                onClick={() => handleSelect(primitive.type)}
                title={`Add ${primitive.label}`}
              >
                {primitive.icon}
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
  onSelectPrimitive: PropTypes.func.isRequired
};
