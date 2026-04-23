export function SeoExpertCharacter({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Body */}
      <ellipse cx="100" cy="165" rx="45" ry="25" fill="#BFDBFE" />
      <rect x="70" y="120" width="60" height="50" rx="12" fill="#3B82F6" />

      {/* Tie */}
      <path d="M100 120 L95 135 L100 150 L105 135 Z" fill="#1D4ED8" />

      {/* Head */}
      <circle cx="100" cy="85" r="35" fill="#FDE68A" />

      {/* Hair - neat and professional */}
      <path d="M65 80 Q68 48 100 42 Q132 48 135 80" fill="#1E293B" />
      <path d="M65 80 Q65 70 70 65" stroke="#0F172A" strokeWidth="2" fill="none" />

      {/* Glasses */}
      <circle cx="88" cy="85" r="10" stroke="#1E293B" strokeWidth="2.5" fill="white" fillOpacity="0.3" />
      <circle cx="112" cy="85" r="10" stroke="#1E293B" strokeWidth="2.5" fill="white" fillOpacity="0.3" />
      <line x1="98" y1="85" x2="102" y2="85" stroke="#1E293B" strokeWidth="2.5" />
      <line x1="65" y1="82" x2="78" y2="85" stroke="#1E293B" strokeWidth="2" />
      <line x1="135" y1="82" x2="122" y2="85" stroke="#1E293B" strokeWidth="2" />

      {/* Eyes behind glasses */}
      <circle cx="88" cy="86" r="3" fill="#1E293B" />
      <circle cx="112" cy="86" r="3" fill="#1E293B" />
      <circle cx="89.5" cy="84.5" r="1" fill="white" />
      <circle cx="113.5" cy="84.5" r="1" fill="white" />

      {/* Confident smile */}
      <path d="M92 98 Q100 103 108 98" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Left hand holding magnifying glass */}
      <circle cx="58" cy="140" r="8" fill="#FDE68A" />
      <circle cx="48" cy="125" r="12" stroke="#60A5FA" strokeWidth="3" fill="none" />
      <line x1="56" y1="133" x2="62" y2="140" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />

      {/* Right hand with chart */}
      <circle cx="142" cy="140" r="8" fill="#FDE68A" />
      <rect x="132" y="125" width="24" height="20" rx="2" fill="white" stroke="#93C5FD" strokeWidth="1.5" />
      {/* Mini bar chart */}
      <rect x="136" y="138" width="3" height="4" fill="#3B82F6" />
      <rect x="141" y="134" width="3" height="8" fill="#60A5FA" />
      <rect x="146" y="130" width="3" height="12" fill="#2563EB" />
      <polyline points="136,137 141,133 146,129 151,127" stroke="#EF4444" strokeWidth="1" fill="none" />
    </svg>
  );
}
