import { NextResponse } from "next/server";
import {
  createEmailDraft,
  getEmailById,
  gmailConfigured,
  searchEmailHistory,
  updateEmailDraft,
  type DraftInput,
} from "@/lib/google/gmail";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!gmailConfigured()) {
    return NextResponse.json({ error: "gmail_not_connected" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    if (body.action === "search") {
      const query = String(body.query ?? "").trim();
      const emails = await searchEmailHistory({
        query,
        maxResults: Number(body.maxResults ?? 10),
        includeBody: body.includeBody === true,
      });
      return NextResponse.json({ emails });
    }

    if (body.action === "get") {
      const id = String(body.id ?? "").trim();
      if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
      const email = await getEmailById(id, { includeBody: body.includeBody !== false });
      return NextResponse.json({ email });
    }

    if (body.action === "create_draft") {
      const input = draftInput(body);
      const draft = await createEmailDraft(input);
      return NextResponse.json({ draft });
    }

    if (body.action === "update_draft") {
      const draftId = String(body.draftId ?? "").trim();
      if (!draftId) {
        return NextResponse.json({ error: "missing_draft_id" }, { status: 400 });
      }
      const input = draftInput(body);
      const draft = await updateEmailDraft(draftId, input);
      return NextResponse.json({ draft });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "gmail_error" },
      { status: 502 },
    );
  }
}

function draftInput(body: Record<string, unknown>): DraftInput {
  const to = String(body.to ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const draftBody = String(body.body ?? "").trim();
  if (!to || !subject || !draftBody) {
    throw new Error("Draft needs to, subject, and body.");
  }
  return {
    to,
    subject,
    body: draftBody,
    cc: optionalString(body.cc),
    bcc: optionalString(body.bcc),
    threadId: optionalString(body.threadId),
    inReplyTo: optionalString(body.inReplyTo),
    references: optionalString(body.references),
  };
}

function optionalString(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}
