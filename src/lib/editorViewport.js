// Move only the canvas: moving the A-Frame scene itself would reinitialize it.
export class EditorViewport {
  constructor(scene) {
    this.canvas = scene.canvas;
    this.parent = this.canvas.parentNode;
    this.next = this.canvas.nextSibling;
    this.portal = document.createElement('div');
    this.portal.id = 'aframeInspectorViewport';
    this.portal.setAttribute('data-aframe-inspector', 'viewport');
    Object.assign(this.portal.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      zIndex: '2147483000'
    });
    // A host may zoom its body; the editor uses viewport coordinates.
    const zoom = [document.body, document.documentElement].reduce(
      (value, node) => value * (parseFloat(getComputedStyle(node).zoom) || 1),
      1
    );
    this.portal.style.zoom = String(1 / zoom);
    document.body.appendChild(this.portal);
    this.portal.appendChild(this.canvas);
  }

  dispose() {
    this.parent.insertBefore(
      this.canvas,
      this.next?.parentNode === this.parent ? this.next : null
    );
    this.portal.remove();
  }
}
