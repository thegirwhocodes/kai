const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

const WAITLIST_KEY = "kai:waitlist";
const META_KEY = "kai:waitlist:meta";

async function store(email: string, source: string) {
  // No store provisioned yet — log so the address is recoverable from Vercel logs.
  if (!REST_URL || !REST_TOKEN) {
    console.log(`[waitlist] (no store) ${email} via ${source}`);
    return;
  }
  const at = new Date().toISOString();
  const res = await fetch(`${REST_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["SADD", WAITLIST_KEY, email],
      ["HSET", META_KEY, email, JSON.stringify({ at, source })],
    ]),
  });
  if (!res.ok) {
    throw new Error(`upstash ${res.status}: ${await res.text()}`);
  }
}

export async function POST(req: Request) {
  let email = "";
  let source = "unknown";
  try {
    const body = (await req.json()) as { email?: string; source?: string };
    email = String(body.email ?? "").trim().toLowerCase();
    source = String(body.source ?? "unknown").slice(0, 40);
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return Response.json({ ok: false, error: "invalid email" }, { status: 422 });
  }

  try {
    await store(email, source);
    return Response.json({ ok: true });
  } catch (err) {
    // Don't lose the signup to the user; surface in logs for recovery.
    console.error("[waitlist] store failed:", err, "email:", email);
    return Response.json({ ok: true });
  }
}
