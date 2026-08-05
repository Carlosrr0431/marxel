export function HeroProtectionVisual() {
  return (
    <div className="hero-protection" aria-hidden>
      <div className="hero-protection__rings">
        <span className="hero-protection__ring hero-protection__ring--a" />
        <span className="hero-protection__ring hero-protection__ring--b" />
        <span className="hero-protection__ring hero-protection__ring--c" />
      </div>

      <svg
        className="hero-protection__shield"
        viewBox="0 0 120 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="heroShieldFill"
            x1="20"
            y1="10"
            x2="100"
            y2="130"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient
            id="heroShieldStroke"
            x1="20"
            y1="8"
            x2="100"
            y2="130"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#F0D78C" />
            <stop offset="0.55" stopColor="#ffffff" />
            <stop offset="1" stopColor="#7BE0D8" />
          </linearGradient>
          <filter id="heroGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          className="hero-protection__shield-body"
          d="M60 10 L104 28 V62 C104 96 84 118 60 130 C36 118 16 96 16 62 V28 Z"
          fill="url(#heroShieldFill)"
          stroke="url(#heroShieldStroke)"
          strokeWidth="2.4"
          strokeLinejoin="round"
          filter="url(#heroGlow)"
        />

        <path
          className="hero-protection__check"
          d="M42 68 L54 80 L80 50"
          stroke="#F0D78C"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="hero-protection__orbit">
        <span className="hero-protection__slot hero-protection__slot--a">
          <span className="hero-protection__badge">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path
                d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6l7-3z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </span>
        </span>
        <span className="hero-protection__slot hero-protection__slot--b">
          <span className="hero-protection__badge">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path
                d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </span>
        </span>
        <span className="hero-protection__slot hero-protection__slot--c">
          <span className="hero-protection__badge">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path
                d="M10 12L3 9l1-2 8 2 5.5-6.5 2 1L15 12l6 2-2 1-6-1-3 5-2-.5 2-4.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
      </div>
    </div>
  );
}
