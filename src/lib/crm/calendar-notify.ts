import { cookies } from "next/headers";

export const CALENDAR_NOTIFY_COOKIE = "marxel_cal_notify";
export const NOTIFY_MINUTES = [0, 10, 30, 60, 1440] as const;

export type CalendarNotify = {
  googleMinutes: (typeof NOTIFY_MINUTES)[number];
  whatsapp: boolean;
};

export const DEFAULT_CALENDAR_NOTIFY: CalendarNotify = {
  googleMinutes: 30,
  whatsapp: true,
};

export function parseCalendarNotify(raw: string | undefined): CalendarNotify {
  if (!raw) return DEFAULT_CALENDAR_NOTIFY;
  try {
    const parsed = JSON.parse(raw) as Partial<CalendarNotify>;
    const googleMinutes = NOTIFY_MINUTES.includes(parsed.googleMinutes as CalendarNotify["googleMinutes"])
      ? (parsed.googleMinutes as CalendarNotify["googleMinutes"])
      : DEFAULT_CALENDAR_NOTIFY.googleMinutes;
    return { googleMinutes, whatsapp: parsed.whatsapp !== false };
  } catch {
    return DEFAULT_CALENDAR_NOTIFY;
  }
}

export async function readCalendarNotify() {
  const raw = (await cookies()).get(CALENDAR_NOTIFY_COOKIE)?.value;
  return parseCalendarNotify(raw);
}
