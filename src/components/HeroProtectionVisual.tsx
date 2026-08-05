const pillars = [
  {
    key: "seguros",
    label: "Seguros",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
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
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
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
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
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
    <div className="hero-pillars" aria-hidden>
      <div className="hero-pillars__glow" />
      <div className="hero-pillars__connector" />

      <ul className="hero-pillars__list">
        {pillars.map((pillar, index) => (
          <li
            key={pillar.key}
            className={`hero-pillars__item hero-pillars__item--${index + 1}`}
          >
            <span className="hero-pillars__icon">{pillar.icon}</span>
            <span className="hero-pillars__label">{pillar.label}</span>
          </li>
        ))}
      </ul>

      <p className="hero-pillars__tag">Un solo equipo</p>
    </div>
  );
}
