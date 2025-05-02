import React from 'react';

const PerspectiveIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Simple Cube Outline */}
    <path d="M 5 5 L 19 5 L 19 19 L 5 19 Z" /> {/* Front Face */}
    <path d="M 5 5 L 10 2 L 24 2 L 19 5" /> {/* Top Face */}
    <path d="M 19 5 L 24 2 L 24 16 L 19 19" /> {/* Right Face */}
    {/* Optional: Add inner lines for perspective effect if needed */}
    {/* <path d="M 5 19 L 10 16 L 10 2" /> */}
    {/* <path d="M 10 16 L 24 16" /> */}
  </svg>
);

export default PerspectiveIcon;
