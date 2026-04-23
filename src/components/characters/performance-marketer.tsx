export function PerformanceMarketerCharacter({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Body */}
      <ellipse cx="100" cy="165" rx="45" ry="25" fill="#DDD6FE" />
      <rect x="70" y="120" width="60" height="50" rx="12" fill="#8B5CF6" />

      {/* Shirt collar */}
      <path d="M82 120 L100 130 L118 120" stroke="#7C3AED" strokeWidth="2" fill="none" />

      {/* Head */}
      <circle cx="100" cy="85" r="35" fill="#FDE68A" />

      {/* Hair - stylish side part */}
      <path d="M65 78 Q70 45 105 40 Q135 45 135 78" fill="#6B21A8" />
      <path d="M65 78 Q68 60 80 52" stroke="#581C87" strokeWidth="3" fill="none" />
      <path d="M80 50 Q95 42 110 48" stroke="#581C87" strokeWidth="2" fill="none" />

      {/* Headset */}
      <path d="M62 80 Q62 60 100 58 Q138 60 138 80" stroke="#4C1D95" strokeWidth="3" fill="none" />
      <rect x="56" y="76" width="10" height="14" rx="5" fill="#4C1D95" />
      <rect x="134" y="76" width="10" height="14" rx="5" fill="#4C1D95" />
      <circle cx="61" cy="96" r="4" fill="#6D28D9" />
      <line x1="61" y1="96" x2="68" y2="102" stroke="#6D28D9" strokeWidth="2" />

      {/* Eyes */}
      <circle cx="88" cy="85" r="4" fill="#1E293B" />
      <circle cx="112" cy="85" r="4" fill="#1E293B" />
      <circle cx="89.5" cy="83.5" r="1.5" fill="white" />
      <circle cx="113.5" cy="83.5" r="1.5" fill="white" />

      {/* Focused expression */}
      <path d="M92 97 L108 97" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
      <line x1="82" y1="76" x2="94" y2="78" stroke="#1E293B" strokeWidth="1.5" />
      <line x1="118" y1="76" x2="106" y2="78" stroke="#1E293B" strokeWidth="1.5" />

      {/* Dashboard screens floating around */}
      <rect x="135" y="115" width="28" height="20" rx="3" fill="white" stroke="#A78BFA" strokeWidth="1.5" />
      <rect x="139" y="119" width="8" height="5" rx="1" fill="#8B5CF6" opacity="0.5" />
      <rect x="149" y="119" width="10" height="5" rx="1" fill="#C4B5FD" />
      <rect x="139" y="126" width="20" height="2" rx="1" fill="#DDD6FE" />
      <rect x="139" y="130" width="14" height="2" rx="1" fill="#EDE9FE" />

      {/* Left hand with tablet */}
      <circle cx="60" cy="145" r="8" fill="#FDE68A" />
      <rect x="42" y="128" width="22" height="30" rx="3" fill="#1E1B4B" />
      <rect x="45" y="131" width="16" height="20" rx="1" fill="#312E81" />
      {/* Graph on tablet */}
      <polyline points="47,146 51,142 55,144 59,138" stroke="#A78BFA" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
