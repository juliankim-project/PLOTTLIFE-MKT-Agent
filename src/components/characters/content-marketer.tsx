export function ContentMarketerCharacter({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Body */}
      <ellipse cx="100" cy="165" rx="45" ry="25" fill="#FED7AA" />
      <rect x="70" y="120" width="60" height="50" rx="12" fill="#FB923C" />

      {/* Collar / shirt detail */}
      <path d="M85 120 L100 135 L115 120" stroke="#EA580C" strokeWidth="2" fill="none" />

      {/* Head */}
      <circle cx="100" cy="85" r="35" fill="#FBBF24" />

      {/* Hair - creative messy style */}
      <path d="M65 80 Q70 45 100 40 Q130 45 135 80" fill="#92400E" />
      <path d="M68 75 Q75 50 95 48" stroke="#78350F" strokeWidth="3" fill="none" />
      <circle cx="130" cy="65" r="5" fill="#92400E" />

      {/* Beret */}
      <ellipse cx="105" cy="52" rx="30" ry="12" fill="#EA580C" />
      <circle cx="105" cy="45" r="4" fill="#C2410C" />

      {/* Eyes */}
      <circle cx="88" cy="85" r="4" fill="#1E293B" />
      <circle cx="112" cy="85" r="4" fill="#1E293B" />
      <circle cx="90" cy="83" r="1.5" fill="white" />
      <circle cx="114" cy="83" r="1.5" fill="white" />

      {/* Smile */}
      <path d="M90 97 Q100 105 110 97" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Blush */}
      <ellipse cx="78" cy="93" rx="6" ry="4" fill="#FDBA74" opacity="0.6" />
      <ellipse cx="122" cy="93" rx="6" ry="4" fill="#FDBA74" opacity="0.6" />

      {/* Left hand holding pencil */}
      <circle cx="62" cy="145" r="8" fill="#FBBF24" />
      <rect x="55" y="130" width="4" height="30" rx="2" fill="#FBBF24" transform="rotate(-20, 57, 145)" />
      <polygon points="53,125 57,123 59,130 55,130" fill="#F59E0B" />

      {/* Right hand holding notebook */}
      <circle cx="138" cy="145" r="8" fill="#FBBF24" />
      <rect x="130" y="132" width="20" height="26" rx="2" fill="white" stroke="#E5E7EB" strokeWidth="1" />
      <line x1="134" y1="139" x2="146" y2="139" stroke="#D1D5DB" strokeWidth="1" />
      <line x1="134" y1="144" x2="146" y2="144" stroke="#D1D5DB" strokeWidth="1" />
      <line x1="134" y1="149" x2="142" y2="149" stroke="#D1D5DB" strokeWidth="1" />
    </svg>
  );
}
