import React from 'react';

export default function Logo({ size = "md", showText = true }) {
  // Size variants
  const isSm = size === "sm";
  const iconSize = isSm ? "w-7 h-7" : "w-8 h-8";

  return (
    <div className="flex items-center gap-2.5">
      {/* FinSight F Monogram with Rising Financial Bars */}
      <svg 
        className={`${iconSize} flex-shrink-0`} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Upper F curve / swoosh */}
        <path 
          d="M26 18C44 18 64 20 74 30C78 34 76 42 70 44C62 47 48 44 38 46C30 48 26 56 26 66V18Z" 
          fill="#2563EB" 
        />
        {/* Inner crossbar / teal wave */}
        <path 
          d="M26 44C38 44 54 43 64 49C67 51 66 56 62 58C55 61 40 60 32 62C27 63 26 68 26 74V44Z" 
          fill="#087F8C" 
        />
        {/* 3 Rising Growth Bars */}
        <rect x="42" y="66" width="7" height="18" rx="3.5" fill="#168A5B" />
        <rect x="53" y="58" width="7" height="26" rx="3.5" fill="#168A5B" />
        <rect x="64" y="50" width="7" height="34" rx="3.5" fill="#168A5B" />
      </svg>

      {showText && (
        <div className="flex items-baseline">
          <span className="text-xl font-bold tracking-tight text-[#172033]">
            Fin
          </span>
          <span className="text-xl font-bold tracking-tight text-[#087F8C]">
            Sight
          </span>
        </div>
      )}
    </div>
  );
}
