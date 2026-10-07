/** Calendario cuyos eventos deben avisar al WhatsApp del productor. */
export const PRODUCER_CALENDAR_EMAIL = "marcosgonzalez@marxen.com.ar";

export function isProducerCalendarAccount(email: string | null | undefined) {
  return String(email || "").trim().toLowerCase() === PRODUCER_CALENDAR_EMAIL;
}

export function isProducerCalendarEvent(
  event: { organizerEmail?: string; creatorEmail?: string },
  accountEmail?: string | null,
) {
  const emails = [event.organizerEmail, event.creatorEmail].map((value) => String(value || "").trim().toLowerCase());
  if (emails.includes(PRODUCER_CALENDAR_EMAIL)) return true;
  return isProducerCalendarAccount(accountEmail) && emails.every((value) => !value);
}
