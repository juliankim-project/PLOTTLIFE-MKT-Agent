export function ServicePlannerCharacter({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Body */}
      <ellipse cx="100" cy="165" rx="45" ry="25" fill="#A7F3D0" />
      <rect x="70" y="120" width="60" height="50" rx="12" fill="#10B981" />

      {/* Collar */}
      <rect x="92" y="120" width="16" height="8" rx="2" fill="white" />
      <circle cx="100" cy="126" r="2" fill="#059669" />

      {/* Head */}
      <circle cx="100" cy="85" r="35" fill="#FDE68A" />

      {/* Hair - smart bob cut */}
      <path d="M65 82 Q65 45 100 40 Q135 45 135 82" fill="#064E3B" />
      <path d="M65 82 Q60 90 62 98" stroke="#064E3B" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M135 82 Q140 90 138 98" stroke="#064E3B" strokeWidth="8" fill="none" strokeLinecap="round" />

      {/* Small glasses */}
      <rect x="80" y="80" width="16" height="12" rx="6" stroke="#374151" strokeWidth="2" fill="white" fillOpacity="0.2" />
      <rect x="104" y="80" width="16" height="12" rx="6" stroke="#374151" strokeWidth="2" fill="white" fillOpacity="0.2" />
      <line x1="96" y1="86" x2="104" y2="86" stroke="#374151" strokeWidth="1.5" />

      {/* Eyes */}
      <circle cx="88" cy="86" r="3" fill="#1E293B" />
      <circle cx="112" cy="86" r="3" fill="#1E293B" />
      <circle cx="89" cy="84.5" r="1" fill="white" />
      <circle cx="113" cy="84.5" r="1" fill="white" />

      {/* Thinking smile */}
      <path d="M93 98 Q100 103 107 98" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Left hand with clipboard */}
      <circle cx="58" cy="142" r="8" fill="#FDE68A" />
      <rect x="42" y="125" width="20" height="28" rx="2" fill="#D1FAE5" stroke="#6EE7B7" strokeWidth="1.5" />
      <rect x="48" y="122" width="8" height="6" rx="1" fill="#059669" />
      {/* Checklist */}
      <rect x="46" y="132" width="4" height="4" rx="0.5" stroke="#10B981" strokeWidth="1" fill="none" />
      <path d="M47 134 L48 135 L50 133" stroke="#10B981" strokeWidth="1" />
      <line x1="52" y1="134" x2="58" y2="134" stroke="#6EE7B7" strokeWidth="1" />
      <rect x="46" y="139" width="4" height="4" rx="0.5" stroke="#10B981" strokeWidth="1" fill="none" />
      <path d="M47 141 L48 142 L50 140" stroke="#10B981" strokeWidth="1" />
      <line x1="52" y1="141" x2="58" y2="141" stroke="#6EE7B7" strokeWidth="1" />
      <rect x="46" y="146" width="4" height="4" rx="0.5" stroke="#D1D5DB" strokeWidth="1" fill="none" />
      <line x1="52" y1="148" x2="56" y2="148" stroke="#D1D5DB" strokeWidth="1" />

      {/* Right hand waving */}
      <circle cx="142" cy="138" r="8" fill="#FDE68A" />
      {/* Lightbulb */}
      <circle cx="148" cy="120" r="8" fill="#FEF3C7" stroke="#FBBF24" strokeWidth="1.5" />
      <line x1="148" y1="128" x2="148" y2="132" stroke="#FBBF24" strokeWidth="1.5" />
      <path d="M144 118 L148 122 L152 118" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
      {/* Rays */}
      <line x1="148" y1="108" x2="148" y2="105" stroke="#FCD34D" strokeWidth="1" />
      <line x1="156" y1="112" x2="159" y2="110" stroke="#FCD34D" strokeWidth="1" />
      <line x1="140" y1="112" x2="137" y2="110" stroke="#FCD34D" strokeWidth="1" />
    </svg>
  );
}
