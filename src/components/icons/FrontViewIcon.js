import React from 'react';

const FrontViewIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Cube Outline */}
    <path d="M 5 5 L 19 5 L 19 19 L 5 19 Z" fill="#00ff99" />{' '}
    {/* Front Face Highlighted */}
    <path d="M 5 5 L 10 2 L 24 2 L 19 5" /> {/* Top Edge */}
    <path d="M 19 5 L 24 2 L 24 16 L 19 19" /> {/* Right Edge */}
    <path d="M 5 19 L 10 16 L 10 2" /> {/* Left Edge */}
    <path d="M 10 16 L 24 16" /> {/* Bottom Edge */}
  </svg>
);

export default FrontViewIcon;
