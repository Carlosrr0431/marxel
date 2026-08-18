import { cookies } from "next/headers";
import { getWhatsmeowAgentCode } from "@/lib/whatsmeow/config";
import { fetchWhatsmeowQrPng } from "@/lib/whatsmeow/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireCrm() {
  const password = process.env.CRM_PASSWORD || "";
  if (!password) return false;
  const expected = Buffer.from(`marxel:${password}`).toString("base64url");
  const session = (await cookies()).get("marxel_crm_session")?.value;
  return session === expected;
}

export async function GET() {
  if (!(await requireCrm())) {
    return new Response("No autorizado", { status: 401 });
  }

  const png = await fetchWhatsmeowQrPng(getWhatsmeowAgentCode());
  if (!png) {
    return new Response("QR no disponible", { status: 404 });
  }

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
