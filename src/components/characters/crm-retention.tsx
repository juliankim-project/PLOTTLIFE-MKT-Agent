export function CrmRetentionCharacter({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Body */}
      <ellipse cx="100" cy="165" rx="45" ry="25" fill="#FBCFE8" />
      <rect x="70" y="120" width="60" height="50" rx="12" fill="#EC4899" />

      {/* Shirt V-neck */}
      <path d="M85 120 L100 132 L115 120" stroke="#DB2777" strokeWidth="2" fill="none" />

      {/* Head */}
      <circle cx="100" cy="85" r="35" fill="#FDE68A" />

      {/* Hair - elegant style */}
      <path d="M65 82 Q65 42 100 38 Q135 42 135 82" fill="#BE185D" />
      <path d="M65 82 Q62 72 65 65 Q70 55 78 50" stroke="#9D174D" strokeWidth="2" fill="none" />
      <path d="M135 82 Q138 72 135 65 Q130 55 122 50" stroke="#9D174D" strokeWidth="2" fill="none" />

      {/* Crown */}
      <polygon points="80,48 85,32 92,42 100,28 108,42 115,32 120,48" fill="#FBBF24" />
      <circle cx="100" cy="38" r="3" fill="#F59E0B" />
      <circle cx="88" cy="42" r="2" fill="#F59E0B" />
      <circle cx="112" cy="42" r="2" fill="#F59E0B" />

      {/* Eyes - warm and caring */}
      <ellipse cx="88" cy="85" rx="4" ry="4.5" fill="#1E293B" />
      <ellipse cx="112" cy="85" rx="4" ry="4.5" fill="#1E293B" />
      <circle cx="89.5" cy="83" r="1.5" fill="white" />
      <circle cx="113.5" cy="83" r="1.5" fill="white" />

      {/* Warm smile */}
      <path d="M88 97 Q100 107 112 97" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Blush */}
      <ellipse cx="78" cy="93" rx="6" ry="4" fill="#F9A8D4" opacity="0.5" />
      <ellipse cx="122" cy="93" rx="6" ry="4" fill="#F9A8D4" opacity="0.5" />

      {/* Heart icons floating */}
      <path d="M145 110 C145 106 150 104 152 108 C154 104 159 106 159 110 C159 115 152 120 152 120 C152 120 145 115 145 110Z" fill="#F472B6" opacity="0.8" />
      <path d="M50 115 C50 112 54 110 55.5 113 C57 110 61 112 61 115 C61 119 55.5 122 55.5 122 C55.5 122 50 119 50 115Z" fill="#F9A8D4" opacity="0.6" />

      {/* Hands */}
      <circle cx="62" cy="145" r="8" fill="#FDE68A" />
      <circle cx="138" cy="145" r="8" fill="#FDE68A" />

      {/* Email envelope in hand */}
      <rect x="128" y="132" width="22" height="16" rx="2" fill="white" stroke="#F9A8D4" strokeWidth="1.5" />
      <polyline points="128,132 139,142 150,132" stroke="#EC4899" strokeWidth="1.5" fill="none" />
      <path d="M128 148 L135 141" stroke="#F9A8D4" strokeWidth="1" />
      <path d="M150 148 L143 141" stroke="#F9A8D4" strokeWidth="1" />
    </svg>
  );
}
