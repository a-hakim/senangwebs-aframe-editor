const PrimitiveIcon = {
  BOX: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
    `,
  SPHERE: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
    `,
  CYLINDER: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3h12v18H6z" style="display:none"></path>
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>

            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
    `,
  CONE: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="19" rx="9" ry="3"></ellipse>
            <path d="M3 19L12 2l9 17"></path>
        </svg>
    `,
  TORUS: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"></circle>
            <circle cx="12" cy="12" r="4"></circle>
        </svg>
    `,
  PLANE: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
        </svg>
    `,
  PYRAMID: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3 L3 17 L12 21 L21 17 Z"></path>
            <path d="M12 3 L12 21"></path>
        </svg>
    `,
  POLYGON: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z"></path>
        </svg>
    `,
  TEXT: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 7V4h16v3"></path>
            <path d="M9 20h6"></path>
            <path d="M12 4v16"></path>
        </svg>
    `,
  WEDGE: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 20h16L4 4v16z"></path>
            <path d="M4 4l16 16"></path>
        </svg>
    `,
  ROOF: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3L2 19h20L12 3z"></path>
        </svg>
    `,
  TUBE: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <ellipse cx="12" cy="5" rx="5" ry="1.5"></ellipse>
            <path d="M21 5v14c0 1.66-4 3-9 3s-9-1.34-9-3V5"></path>
            <path d="M3 19c0 1.66 4 3 9 3s9-1.34 9-3"></path>
        </svg>
    `,
  HALF_CYLINDER: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 5 A 9 3 0 0 1 21 5 L 3 5 Z"></path>
            <path d="M3 5 v 14 A 0 0 0 0 0 21 19 v -14"></path>
            <path d="M3 19 L 21 19"></path>
        </svg>
    `,
  HALF_SPHERE: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 18h18"></path>
            <path d="M4 18a8 8 0 0 1 18 0"></path>
        </svg>
    `,
  HEART: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
    `,
  TORUS_KNOT: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.8 12.0 L21.7 13.2 L21.3 14.4 L20.7 15.4 L19.9 16.4 L19.0 17.1 L18.0 17.6 L16.9 17.9 L15.8 18.1 L14.8 18.0 L13.9 17.8 L13.1 17.6 L12.3 17.2 L11.7 16.8 L11.1 16.5 L10.7 16.1 L10.2 15.8 L9.7 15.6 L9.3 15.3 L8.7 15.1 L8.2 14.8 L7.5 14.4 L6.9 14.0 L6.2 13.5 L5.6 12.8 L5.0 12.0 L4.5 11.1 L4.2 10.0 L4.1 8.9 L4.2 7.7 L4.5 6.6 L5.1 5.5 L5.8 4.5 L6.8 3.7 L7.8 3.2 L9.0 2.8 L10.2 2.7 L11.4 2.9 L12.6 3.2 L13.6 3.8 L14.4 4.5 L15.1 5.3 L15.7 6.2 L16.0 7.1 L16.2 8.0 L16.3 8.9 L16.3 9.6 L16.3 10.3 L16.3 10.9 L16.2 11.5 L16.2 12.0 L16.2 12.5 L16.3 13.1 L16.3 13.7 L16.3 14.4 L16.3 15.1 L16.2 16.0 L16.0 16.9 L15.7 17.8 L15.1 18.7 L14.4 19.5 L13.6 20.2 L12.6 20.8 L11.4 21.1 L10.2 21.3 L9.0 21.2 L7.8 20.8 L6.8 20.3 L5.8 19.5 L5.1 18.5 L4.5 17.4 L4.2 16.3 L4.1 15.1 L4.2 14.0 L4.5 12.9 L5.0 12.0 L5.6 11.2 L6.2 10.5 L6.9 10.0 L7.5 9.6 L8.2 9.2 L8.7 8.9 L9.3 8.7 L9.7 8.4 L10.2 8.2 L10.7 7.9 L11.1 7.5 L11.7 7.2 L12.3 6.8 L13.1 6.4 L13.9 6.2 L14.8 6.0 L15.8 5.9 L16.9 6.1 L18.0 6.4 L19.0 6.9 L19.9 7.6 L20.7 8.6 L21.3 9.6 L21.7 10.8 L21.8 12.0Z"></path>
        </svg>
    `,
  TETRAHEDRON: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2l10 18H2L12 2z"></path>
            <path d="M12 2v12"></path>
            <path d="M12 14l-5 6"></path>
            <path d="M12 14l5 6"></path>
        </svg>
    `,
  OCTAHEDRON: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2 L22 12 L12 22 L2 12 Z"></path>
            <path d="M12 2 L12 14 L22 12"></path>
            <path d="M12 22 L12 14 L2 12"></path>
        </svg>
    `,
  ICOSAHEDRON: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L21 7L21 17L12 22L3 17L3 7L12 2Z"></path>
            <path d="M12 22V15"></path>
            <path d="M12 15L7 9L17 9L12 15Z"></path>
            <path d="M12 2L7 9"></path>
            <path d="M12 2L17 9"></path>
            <path d="M21 7L17 9"></path>
            <path d="M21 17L17 9"></path>
            <path d="M21 17L12 15"></path>
            <path d="M3 17L12 15"></path>
            <path d="M3 17L7 9"></path>
            <path d="M3 7L7 9"></path>
        </svg>
    `,
  DODECAHEDRON: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2l8.5 6.2-3.3 10.2H6.8L3.5 8.2 12 2z"></path>
            <path d="M12 2v7"></path>
            <path d="M12 9l-6 4"></path>
            <path d="M12 9l6 4"></path>
            <path d="M6 13l2.5 5.4"></path>
            <path d="M18 13l-2.5 5.4"></path>
        </svg>
    `,
  IMAGE: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
    `,
  LIGHT: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
    `,
  EMPTY: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 4"></rect>
        </svg>
    `
};

export default PrimitiveIcon;
