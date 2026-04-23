export function MarketingPlannerCharacter({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Body */}
      <ellipse cx="100" cy="165" rx="45" ry="25" fill="#FEF3C7" />
      <rect x="70" y="120" width="60" height="50" rx="12" fill="#F59E0B" />

      {/* Jacket lapels */}
      <path d="M82 120 L90 140 L100 128" stroke="#D97706" strokeWidth="2" fill="none" />
      <path d="M118 120 L110 140 L100 128" stroke="#D97706" strokeWidth="2" fill="none" />

      {/* Head */}
      <circle cx="100" cy="85" r="35" fill="#FDE68A" />

      {/* Hair - sharp professional */}
      <path d="M65 80 Q68 42 100 38 Q132 42 135 80" fill="#78350F" />
      <path d="M75 55 Q85 42 100 40 Q115 42 125 55" stroke="#92400E" strokeWidth="2" fill="none" />

      {/* Sunglasses (on top of head) */}
      <path d="M75 55 Q80 48 90 50" stroke="#1E293B" strokeWidth="2" />
      <path d="M110 50 Q120 48 125 55" stroke="#1E293B" strokeWidth="2" />
      <ellipse cx="85" cy="53" rx="8" ry="5" fill="#1E293B" opacity="0.7" />
      <ellipse cx="115" cy="53" rx="8" ry="5" fill="#1E293B" opacity="0.7" />
      <line x1="93" y1="53" x2="107" y2="53" stroke="#1E293B" strokeWidth="1.5" />

      {/* Eyes - strategic gaze */}
      <circle cx="88" cy="85" r="4" fill="#1E293B" />
      <circle cx="112" cy="85" r="4" fill="#1E293B" />
      <circle cx="90" cy="83.5" r="1.5" fill="white" />
      <circle cx="114" cy="83.5" r="1.5" fill="white" />

      {/* Smirk */}
      <path d="M90 97 Q100 103 112 97" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Left hand with megaphone */}
      <circle cx="58" cy="142" r="8" fill="#FDE68A" />
      <path d="M40 130 L55 138 L55 146 L40 154 Z" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
      <rect x="35" y="132" width="6" height="20" rx="3" fill="#F59E0B" />
      {/* Sound waves */}
      <path d="M56 135 Q62 138 56 142" stroke="#FCD34D" strokeWidth="1.5" fill="none" />
      <path d="M58 131 Q67 138 58 146" stroke="#FDE68A" strokeWidth="1" fill="none" />

      {/* Right hand pointing at target */}
      <circle cx="142" cy="140" r="8" fill="#FDE68A" />
      {/* Target/bullseye */}
      <circle cx="155" cy="125" r="10" fill="white" stroke="#EF4444" strokeWidth="2" />
      <circle cx="155" cy="125" r="6" fill="none" stroke="#EF4444" strokeWidth="1.5" />
      <circle cx="155" cy="125" r="2.5" fill="#EF4444" />
      {/* Arrow hitting target */}
      <line x1="142" y1="138" x2="152" y2="128" stroke="#D97706" strokeWidth="1.5" />
    </svg>
  );
}
