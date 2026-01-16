import PropTypes from 'prop-types';
import PrimitiveIcon from '../icons/Primitives';

const PRIMITIVES = [
  { type: 'a-box', label: 'Box', icon: PrimitiveIcon.BOX },
  {
    type: 'a-sphere',
    label: 'Sphere',
    icon: PrimitiveIcon.SPHERE
  },
  {
    type: 'a-cylinder',
    label: 'Cylinder',
    icon: PrimitiveIcon.CYLINDER
  },
  {
    type: 'a-cone',
    label: 'Cone',
    icon: PrimitiveIcon.CONE
  },
  {
    type: 'a-torus',
    label: 'Torus',
    icon: PrimitiveIcon.TORUS
  },
  {
    type: 'a-plane',
    label: 'Plane',
    icon: PrimitiveIcon.PLANE
  },
  {
    type: 'a-image',
    label: 'Image',
    icon: PrimitiveIcon.IMAGE
  },
  {
    type: 'a-text',
    label: 'Text',
    icon: PrimitiveIcon.TEXT
  },
  {
    type: 'a-light',
    label: 'Light',
    icon: PrimitiveIcon.LIGHT
  },
  {
    type: 'a-entity',
    label: 'Empty Entity',
    icon: PrimitiveIcon.EMPTY
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
                {typeof primitive.icon === 'string' ? (
                  <div
                    style={{ width: '50px', height: '50px', margin: '0 auto' }}
                    dangerouslySetInnerHTML={{ __html: primitive.icon }}
                  />
                ) : (
                  primitive.icon
                )}
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
