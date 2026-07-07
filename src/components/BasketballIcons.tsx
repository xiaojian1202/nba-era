import React from 'react';

/**
 * BasketballOutlined Icon Component
 * A clean, stroke-based basketball icon matching Lucide style.
 * Adapts to the current text color and accepts standard SVG props.
 */
export const BasketballOutlined: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <title>Basketball (Outlined)</title>
    <circle cx="12" cy="12" r="10" />
    <path d="M6.2 6.2c2.4 2.4 2.4 9.2 0 11.6" />
    <path d="M17.8 6.2c-2.4 2.4-2.4 9.2 0 11.6" />
    <path d="M2 12h20" />
    <path d="M12 2v20" />
  </svg>
);

/**
 * BasketballFlat Icon Component
 * A filled, solid basketball icon styled in the Hardwood Classic rust orange color.
 * Designed to look premium and themed out of the box.
 */
export const BasketballFlat: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    fill="none"
    {...props}
  >
    <title>Basketball (Flat Hardwood)</title>
    {/* Ball body */}
    <circle cx="50" cy="50" r="45" fill="#C2410C" stroke="#0F172A" strokeWidth="4" />
    {/* Seams */}
    <path d="M50 5v90" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
    <path d="M5 50h90" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
    <path d="M18.2 18.2c12 12 12 51.6 0 63.6" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
    <path d="M81.8 18.2c-12 12-12 51.6 0 63.6" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
    {/* Subtle shine */}
    <path d="M20 35 A 35 35 0 0 1 50 12 A 40 40 0 0 0 20 35" fill="#FFFFFF" opacity="0.15" />
  </svg>
);

/**
 * BasketballGradient Icon Component
 * A rich, three-dimensional radial gradient basketball icon with polished gloss effects.
 */
export const BasketballGradient: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    fill="none"
    {...props}
  >
    <title>Basketball (Premium Gradient)</title>
    <defs>
      <radialGradient id="basketballRadial" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#FFA366" />
        <stop offset="50%" stopColor="#EA580C" />
        <stop offset="100%" stopColor="#9A2E00" />
      </radialGradient>
    </defs>
    {/* Ball body with radial gradient */}
    <circle cx="50" cy="50" r="45" fill="url(#basketballRadial)" stroke="#1E293B" strokeWidth="3" />
    {/* Seams with slight opacity to blend with shading */}
    <path d="M50 5v90" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
    <path d="M5 50h90" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
    <path d="M18.2 18.2c12 12 12 51.6 0 63.6" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
    <path d="M81.8 18.2c-12 12-12 51.6 0 63.6" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
    {/* Sleek glass crescent highlight */}
    <path d="M12 32 A 40 40 0 0 1 50 8 A 45 45 0 0 0 12 32" fill="#FFFFFF" opacity="0.15" />
  </svg>
);

/**
 * BasketballNeon Icon Component
 * A high-tech cyberpunk / dark-mode gaming icon with multi-level neon glow effects.
 */
export const BasketballNeon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    fill="none"
    {...props}
  >
    <title>Basketball (Neon Glow)</title>
    <defs>
      {/* Neon Glow Filter */}
      <filter id="neonGlowEffect" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4.5" result="blur1" />
        <feGaussianBlur stdDeviation="9" result="blur2" />
        <feMerge>
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Ambient outer backdrop glow */}
    <circle cx="50" cy="50" r="43" stroke="#F97316" strokeWidth="2" opacity="0.3" filter="url(#neonGlowEffect)" />
    
    {/* Neon Seam Elements */}
    <g filter="url(#neonGlowEffect)" stroke="#F97316" strokeWidth="3" strokeLinecap="round">
      <circle cx="50" cy="50" r="42" stroke="#FF8A3D" strokeWidth="3.5" />
      <path d="M50 8v84" />
      <path d="M8 50h84" />
      <path d="M19.7 19.7c11 11 11 49.6 0 60.6" />
      <path d="M80.3 19.7c-11 11-11 49.6 0 60.6" />
    </g>
    
    {/* Electric Blue center core ring for an premium dual-neon accent */}
    <circle cx="50" cy="50" r="42" stroke="#38BDF8" strokeWidth="1.2" opacity="0.5" />
  </svg>
);
