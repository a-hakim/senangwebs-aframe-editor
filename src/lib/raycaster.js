import Events from './Events';

export function initRaycaster(inspector) {
  const canvas = inspector.container;
  // Use cursor="rayOrigin: mouse".
  const mouseCursor = document.createElement('a-entity');
  mouseCursor.setAttribute('id', 'aframeInspectorMouseCursor');
  mouseCursor.setAttribute('raycaster', {
    interval: 100,
    objects: 'a-scene :not([data-aframe-inspector])'
  });
  mouseCursor.setAttribute('cursor', 'rayOrigin', 'mouse');
  mouseCursor.setAttribute('data-aframe-inspector', 'true');

  // Only visible objects.
  const raycaster = mouseCursor.components.raycaster;
  const refreshObjects = raycaster.refreshObjects;
  const overrideRefresh = () => {
    refreshObjects.call(raycaster);
    const objects = raycaster.objects;
    raycaster.objects = objects.filter((node) => {
      while (node) {
        if (!node.visible) {
          return false;
        }
        node = node.parent;
      }
      return true;
    });
  };
  raycaster.refreshObjects = overrideRefresh;

  inspector.sceneEl.appendChild(mouseCursor);
  inspector.cursor = mouseCursor;

  mouseCursor.addEventListener('click', handleClick);
  mouseCursor.addEventListener('mouseenter', onMouseEnter);
  mouseCursor.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('dblclick', onDoubleClick);

  let leaveTimer;
  const onCanvasLeave = () => {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => Events.emit('raycastermouseleave', null));
  };
  canvas.addEventListener('mouseleave', onCanvasLeave);

  const onDownPosition = new THREE.Vector2();
  const onUpPosition = new THREE.Vector2();

  function onMouseEnter() {
    Events.emit(
      'raycastermouseenter',
      mouseCursor.components.cursor.intersectedEl
    );
  }

  function onMouseLeave() {
    Events.emit(
      'raycastermouseleave',
      mouseCursor.components.cursor.intersectedEl
    );
  }

  function handleClick(evt) {
    // Check to make sure not dragging.
    if (onDownPosition.distanceTo(onUpPosition) === 0) {
      inspector.selectEntity(evt.detail.intersectedEl);
    }
  }

  function onMouseDown(event) {
    if (event instanceof CustomEvent) {
      return;
    }
    event.preventDefault();
    const array = getMousePosition(
      inspector.container,
      event.clientX,
      event.clientY
    );
    onDownPosition.fromArray(array);
  }

  function onMouseUp(event) {
    if (event instanceof CustomEvent) {
      return;
    }
    event.preventDefault();
    const array = getMousePosition(
      inspector.container,
      event.clientX,
      event.clientY
    );
    onUpPosition.fromArray(array);
  }

  /**
   * Focus on double click.
   */
  function onDoubleClick(event) {
    const intersectedEl = mouseCursor.components.cursor.intersectedEl;
    if (!intersectedEl) {
      return;
    }
    Events.emit('objectfocus', intersectedEl.object3D);
  }

  return {
    el: mouseCursor,
    enable: () => {
      mouseCursor.setAttribute('raycaster', 'enabled', true);
      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('dblclick', onDoubleClick);
    },
    disable: () => {
      mouseCursor.setAttribute('raycaster', 'enabled', false);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('dblclick', onDoubleClick);
    },
    destroy: () => {
      clearTimeout(leaveTimer);
      canvas.removeEventListener('mouseleave', onCanvasLeave);
      mouseCursor.removeEventListener('click', handleClick);
      mouseCursor.removeEventListener('mouseenter', onMouseEnter);
      mouseCursor.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('dblclick', onDoubleClick);
      if (mouseCursor.parentNode) {
        mouseCursor.parentNode.removeChild(mouseCursor);
      }
    }
  };
}

function getMousePosition(dom, x, y) {
  const rect = dom.getBoundingClientRect();
  return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
}
