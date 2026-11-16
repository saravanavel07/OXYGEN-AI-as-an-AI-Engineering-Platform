import React from 'react';

interface OxygenLogoProps {
  size?: number;
  showWordmark?: boolean;
}

export const OxygenLogo: React.FC<OxygenLogoProps> = ({ size = 28, showWordmark = true }) => {
  return (
    <div className="inline-flex items-center gap-2.5 shrink-0 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Outer molecular orbit */}
        <circle cx="18" cy="18" r="14.5" stroke="#B8B8B8" strokeOpacity="0.28" strokeWidth="1.2" />
        {/* Tilted orbital ellipse */}
        <ellipse
          cx="18"
          cy="18"
          rx="14.5"
          ry="6.5"
          transform="rotate(-32 18 18)"
          stroke="#E32636"
          strokeOpacity="0.75"
          strokeWidth="1.25"
        />
        <ellipse
          cx="18"
          cy="18"
          rx="14.5"
          ry="6.5"
          transform="rotate(32 18 18)"
          stroke="#B8B8B8"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        {/* Core nucleus */}
        <circle cx="18" cy="18" r="4.2" fill="#080808" stroke="#E32636" strokeWidth="1.6" />
        <circle cx="18" cy="18" r="1.6" fill="#F5F5F5" />
        {/* Valence nodes */}
        <circle cx="29.5" cy="10.8" r="1.8" fill="#E32636" />
        <circle cx="6.5" cy="25.2" r="1.5" fill="#B8B8B8" />
      </svg>
      {showWordmark && (
        <span className="font-display text-lg font-bold tracking-[0.14em] text-[#F5F5F5] whitespace-nowrap shrink-0">
          OXYGEN <span className="text-[#E32636]">AI</span>
        </span>
      )}
    </div>
  );
};
