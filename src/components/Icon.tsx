import type { ReactNode } from "react";

type IconName =
  | "shield"
  | "heart"
  | "plane"
  | "car"
  | "bike"
  | "home"
  | "briefcase"
  | "users"
  | "medical"
  | "factory"
  | "star";

const paths: Record<IconName, ReactNode> = {
  shield: (
    <path
      d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6l7-3z"
      stroke="currentColor"
      strokeWidth="1.7"
      fill="none"
    />
  ),
  heart: (
    <path
      d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
      stroke="currentColor"
      strokeWidth="1.7"
      fill="none"
    />
  ),
  plane: (
    <path
      d="M10 12L3 9l1-2 8 2 5.5-6.5 2 1L15 12l6 2-2 1-6-1-3 5-2-.5 2-4.5z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      strokeLinejoin="round"
    />
  ),
  car: (
    <>
      <path
        d="M4 15l1.5-5A2 2 0 0 1 7.4 8.5h9.2A2 2 0 0 1 18.5 10l1.5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        fill="none"
      />
      <path d="M4 15h16v2.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V15z" stroke="currentColor" strokeWidth="1.7" fill="none" />
      <circle cx="7.5" cy="18.5" r="1.2" fill="currentColor" />
      <circle cx="16.5" cy="18.5" r="1.2" fill="currentColor" />
    </>
  ),
  bike: (
    <>
      <circle cx="6.5" cy="16.5" r="2.5" stroke="currentColor" strokeWidth="1.7" fill="none" />
      <circle cx="17.5" cy="16.5" r="2.5" stroke="currentColor" strokeWidth="1.7" fill="none" />
      <path
        d="M6.5 16.5L10 9h4l3.5 7.5M10 9l2 4h3"
        stroke="currentColor"
        strokeWidth="1.7"
        fill="none"
        strokeLinejoin="round"
      />
    </>
  ),
  home: (
    <path
      d="M4 11.5L12 5l8 6.5M7 10.5V19h10v-8.5"
      stroke="currentColor"
      strokeWidth="1.7"
      fill="none"
      strokeLinejoin="round"
    />
  ),
  briefcase: (
    <>
      <rect x="3.5" y="8" width="17" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" fill="none" />
      <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" stroke="currentColor" strokeWidth="1.7" fill="none" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.7" fill="none" />
      <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" fill="none" />
      <path d="M4.5 18c.8-2.5 2.7-3.8 4.5-3.8S12.7 15.5 13.5 18" stroke="currentColor" strokeWidth="1.7" fill="none" />
      <path d="M13.2 14.5c1.1-.6 2.3-.7 3.5.1 1.3.9 2 2.2 2.3 3.4" stroke="currentColor" strokeWidth="1.7" fill="none" />
    </>
  ),
  medical: (
    <>
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </>
  ),
  factory: (
    <path
      d="M3 20h18M5 20V10l5 3V10l5 3V8h4v12"
      stroke="currentColor"
      strokeWidth="1.7"
      fill="none"
      strokeLinejoin="round"
    />
  ),
  star: (
    <path
      d="M12 3.5l2.2 4.6 5.1.7-3.7 3.6.9 5.1L12 15.4 7.5 17.5l.9-5.1L4.7 8.8l5.1-.7L12 3.5z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      strokeLinejoin="round"
    />
  ),
};

export function Icon({
  name,
  className = "h-6 w-6",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

export const seguroIconMap: Record<string, IconName> = {
  "autos-y-motos": "car",
  "accidentes-personales": "users",
  "integral-comercios": "briefcase",
  art: "factory",
  "mala-praxis": "medical",
  hogar: "home",
};
