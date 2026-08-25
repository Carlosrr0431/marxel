import { cookies } from "next/headers";

export async function requireCrmSession() {
  const password = process.env.CRM_PASSWORD || "";
  if (!password) return false;
  const expected = Buffer.from(`marxel:${password}`).toString("base64url");
  const session = (await cookies()).get("marxel_crm_session")?.value;
  return session === expected;
}
