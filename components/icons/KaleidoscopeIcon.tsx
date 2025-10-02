import React from 'react';

export const KaleidoscopeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="m12 12 4-10 4 10-4 10-4-10z" />
    <path d="m12 12 4 10 4-10-4-10-4 10z" />
    <path d="M12 12 2 8l10 4-10 4 10-4z" />
    <path d="m12 12 10 4-10-4 10-4-10 4z" />
  </svg>
);
