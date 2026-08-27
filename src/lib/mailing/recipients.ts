export type MailRecipient = {
  email: string;
  name: string;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const EMAIL_KEYS = ["email", "mail", "correo", "e-mail", "e_mail", "correo electronico", "correo electrónico"];
const NAME_KEYS = ["nombre", "name", "apellido", "full name", "nombre y apellido", "cliente"];

export function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(String(value || "").trim());
}

function keyName(key: string) {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

const EMAIL_KEY_SET = new Set(EMAIL_KEYS.map(keyName));
const NAME_KEY_SET = new Set(NAME_KEYS.map(keyName));

function pickByKeys(row: Record<string, unknown>, keys: Set<string>) {
  for (const [rawKey, rawVal] of Object.entries(row)) {
    if (!keys.has(keyName(rawKey))) continue;
    const text = String(rawVal || "").trim();
    if (text) return text;
  }
  return "";
}

function emailsIn(value: string) {
  return String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
}

function firstEmailIn(value: string) {
  const match = emailsIn(value)[0];
  return match ? normalizeEmail(match) : "";
}

export function parseRecipientsFromText(text: string) {
  const recipients: MailRecipient[] = [];
  const seen = new Set<string>();
  for (const line of String(text || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const emails = emailsIn(trimmed);
    if (!emails.length) continue;
    const withoutEmails = trimmed
      .replace(new RegExp(EMAIL_RE.source, "gi"), " ")
      .replace(/[,;|<>]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    for (const raw of emails) {
      const email = normalizeEmail(raw);
      if (!isValidEmail(email) || seen.has(email)) continue;
      seen.add(email);
      recipients.push({ email, name: withoutEmails });
    }
  }
  return recipients;
}

export function parseRecipientsFromRows(rows: Record<string, unknown>[]) {
  const recipients: MailRecipient[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    let email = firstEmailIn(pickByKeys(row, EMAIL_KEY_SET));
    if (!email) {
      for (const value of Object.values(row)) {
        email = firstEmailIn(String(value || ""));
        if (email) break;
      }
    }
    if (!isValidEmail(email) || seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      email,
      name: pickByKeys(row, NAME_KEY_SET),
    });
  }

  return recipients;
}

export function mergeRecipients(lists: MailRecipient[][]) {
  const seen = new Set<string>();
  const out: MailRecipient[] = [];
  for (const list of lists) {
    for (const item of list) {
      const email = normalizeEmail(item.email);
      if (!isValidEmail(email) || seen.has(email)) continue;
      seen.add(email);
      out.push({ email, name: String(item.name || "").trim() });
    }
  }
  return out;
}
