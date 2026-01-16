const BackViewIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Cube Outline (adjust perspective for back view) */}
    {/* Draw the back face first */}
    <path d="M 10 2 L 24 2 L 24 16 L 10 16 Z" fill="#00ff99" />{' '}
    {/* Back Face Highlighted */}
    {/* Draw visible edges from back view */}
    <path d="M 5 5 L 10 2" /> {/* Top-Left Edge */}
    <path d="M 5 5 L 5 19" /> {/* Front-Left Edge */}
    <path d="M 5 19 L 10 16" /> {/* Bottom-Left Edge */}
    <path d="M 19 5 L 24 2" /> {/* Top-Right Edge */}
    <path d="M 19 5 L 19 19" /> {/* Front-Right Edge */}
    <path d="M 19 19 L 24 16" /> {/* Bottom-Right Edge */}
  </svg>
);

export default BackViewIcon;
