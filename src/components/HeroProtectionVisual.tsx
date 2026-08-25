const pillars = [
  {
    key: "seguros",
    label: "Seguros",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
        <path
          d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6l7-3z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    ),
  },
  {
    key: "salud",
    label: "Salud",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
        <path
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    ),
  },
  {
    key: "viajero",
    label: "Viajero",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
        <path
          d="M10 12L3 9l1-2 8 2 5.5-6.5 2 1L15 12l6 2-2 1-6-1-3 5-2-.5 2-4.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const;

export function HeroProtectionVisual() {
  return (
    <div className="hero-orbit" aria-hidden>
      <div className="hero-orbit__ring" />
      <div className="hero-orbit__core">
        <img src="/brand/marxel-mark.svg" alt="" width={28} height={28} />
      </div>

      <ul className="hero-orbit__wheel">
        {pillars.map((pillar, index) => (
          <li
            key={pillar.key}
            className={`hero-orbit__node hero-orbit__node--${index + 1}`}
          >
            <div className="hero-orbit__face">
              <span className="hero-orbit__icon">{pillar.icon}</span>
              <span className="hero-orbit__label">{pillar.label}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
