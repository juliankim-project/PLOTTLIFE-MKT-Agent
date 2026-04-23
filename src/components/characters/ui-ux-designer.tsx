export function UiUxDesignerCharacter({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Body */}
      <ellipse cx="100" cy="165" rx="45" ry="25" fill="#CFFAFE" />
      <rect x="70" y="120" width="60" height="50" rx="12" fill="#06B6D4" />

      {/* Turtleneck */}
      <rect x="88" y="115" width="24" height="10" rx="4" fill="#0891B2" />

      {/* Head */}
      <circle cx="100" cy="85" r="35" fill="#FDE68A" />

      {/* Hair - creative and colorful with highlights */}
      <path d="M65 80 Q68 42 100 38 Q132 42 135 80" fill="#155E75" />
      <path d="M70 65 Q80 48 95 45" stroke="#0E7490" strokeWidth="4" fill="none" />
      <path d="M120 55 Q128 50 132 60" stroke="#22D3EE" strokeWidth="3" fill="none" />

      {/* Paint splatter on hair */}
      <circle cx="75" cy="58" r="3" fill="#F472B6" opacity="0.7" />
      <circle cx="125" cy="52" r="2.5" fill="#A78BFA" opacity="0.7" />

      {/* Eyes - creative sparkle */}
      <circle cx="88" cy="85" r="4.5" fill="#1E293B" />
      <circle cx="112" cy="85" r="4.5" fill="#1E293B" />
      <circle cx="90" cy="83" r="2" fill="white" />
      <circle cx="114" cy="83" r="2" fill="white" />
      {/* Star sparkle in eyes */}
      <path d="M86 82 L87 80 L88 82 L90 81 L88 82.5 L87 84 L86 82.5 L84 81 Z" fill="white" opacity="0.5" />

      {/* Excited smile */}
      <path d="M88 97 Q100 108 112 97" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M90 97 Q100 105 110 97" fill="#FDE68A" />

      {/* Blush */}
      <ellipse cx="78" cy="93" rx="5" ry="3" fill="#67E8F9" opacity="0.4" />
      <ellipse cx="122" cy="93" rx="5" ry="3" fill="#67E8F9" opacity="0.4" />

      {/* Left hand with color palette */}
      <circle cx="55" cy="142" r="8" fill="#FDE68A" />
      <ellipse cx="42" cy="135" rx="14" ry="10" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
      <circle cx="36" cy="132" r="3" fill="#EF4444" />
      <circle cx="42" cy="128" r="3" fill="#3B82F6" />
      <circle cx="48" cy="132" r="3" fill="#FBBF24" />
      <circle cx="38" cy="138" r="3" fill="#10B981" />
      <circle cx="46" cy="138" r="3" fill="#8B5CF6" />
      {/* Thumb hole */}
      <ellipse cx="42" cy="142" rx="3" ry="4" fill="#E5E7EB" />

      {/* Right hand with pen stylus */}
      <circle cx="145" cy="140" r="8" fill="#FDE68A" />
      <rect x="143" y="118" width="4" height="28" rx="2" fill="#0891B2" transform="rotate(15, 145, 132)" />
      <polygon points="141,117 145,110 149,117" fill="#06B6D4" transform="rotate(15, 145, 114)" />

      {/* Floating design elements */}
      <rect x="148" y="108" width="12" height="12" rx="2" stroke="#22D3EE" strokeWidth="1.5" fill="none" transform="rotate(15, 154, 114)" />
      <circle cx="160" cy="125" r="5" stroke="#A78BFA" strokeWidth="1.5" fill="none" />
      <polygon points="162,105 165,112 158,112" stroke="#F472B6" strokeWidth="1" fill="none" />
    </svg>
  );
}
