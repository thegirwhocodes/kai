// Server-side Gmail signal reader for Kai.
//
// It deliberately reads metadata only (sender, subject, date, labels), not
// message bodies. Kai needs enough signal to decide whether an email should
// shape the next focus block without turning the focus app into an inbox.

import type { EmailCategory, EmailSignal, TaskPriority } from "@/lib/types";

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessageMetadata {
  id: string;
  labelIds?: string[];
  payload?: { headers?: GmailHeader[] };
}

const CLIENT_ID =
  process.env.GOOGLE_GMAIL_CLIENT_ID ?? process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CLIENT_SECRET =
  process.env.GOOGLE_GMAIL_CLIENT_SECRET ??
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const REFRESH_TOKEN =
  process.env.GOOGLE_GMAIL_REFRESH_TOKEN ??
  process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

export function gmailConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

async function accessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    refresh_token: REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Google token refresh failed: ${data.error ?? res.status} ${data.error_description ?? ""}`,
    );
  }
  return data.access_token as string;
}

export async function listEmailSignals(max = 12): Promise<EmailSignal[]> {
  const token = await accessToken();
  const q = [
    "in:inbox",
    "newer_than:30d",
    "-category:promotions",
    "-category:social",
  ].join(" ");
  const listUrl =
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?" +
    new URLSearchParams({
      maxResults: String(Math.min(30, Math.max(max, 12))),
      q,
    });
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json();
  if (!listRes.ok) {
    throw new Error(`Gmail list failed: ${listData.error?.message ?? listRes.status}`);
  }

  const messages = (listData.messages ?? []) as { id: string }[];
  const details = await Promise.all(
    messages.slice(0, Math.min(24, messages.length)).map(async (m) => {
      const detailUrl =
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?` +
        new URLSearchParams({
          format: "metadata",
          metadataHeaders: "From",
        }) +
        "&metadataHeaders=Subject&metadataHeaders=Date";
      const res = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return null;
      return data as GmailMessageMetadata;
    }),
  );

  return details
    .filter((m): m is GmailMessageMetadata => !!m)
    .map(toSignal)
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
    .slice(0, max);
}

function toSignal(message: GmailMessageMetadata): EmailSignal {
  const header = (name: string) =>
    message.payload?.headers?.find(
      (h) => h.name.toLowerCase() === name.toLowerCase(),
    )?.value ?? "";
  const from = header("From") || "(unknown sender)";
  const subject = header("Subject") || "(no subject)";
  const date = header("Date") || undefined;
  const labelIds = message.labelIds ?? [];
  const classified = classifyEmail(from, subject, labelIds);
  return {
    id: message.id,
    from,
    subject,
    date,
    category: classified.category,
    priority: classified.priority,
    reason: classified.reason,
  };
}

function classifyEmail(
  from: string,
  subject: string,
  labelIds: string[],
): { category: EmailCategory; priority: TaskPriority; reason: string } {
  const text = `${from} ${subject}`.toLowerCase();
  const important = labelIds.includes("IMPORTANT");
  const unread = labelIds.includes("UNREAD");

  if (matches(text, ["linkedin", "wayfair", "glassdoor", "adzuna", "indeed"])) {
    return {
      category: "noise",
      priority: "low",
      reason: "looks like a low-signal opportunity or promotion",
    };
  }
  if (
    matches(text, [
      "sabi",
      "education for equality",
      "lagos",
      "nigeria",
      "africa's talking",
      "africastalking",
      "mtn",
      "airtel",
      "twilio",
      "elevenlabs",
      "grant",
      "unicef",
      "mit",
    ])
  ) {
    return {
      category: "sabi",
      priority: important || unread ? "urgent" : "high",
      reason: "ties to Sabi or Education for Equality",
    };
  }
  if (matches(text, ["wesleyan", "class", "professor", "assignment", "course"])) {
    return {
      category: "school",
      priority: important || unread ? "high" : "medium",
      reason: "school or class context",
    };
  }
  if (matches(text, ["mom", "sonia", "family", "grace", "dad"])) {
    return {
      category: "family",
      priority: important || unread ? "high" : "medium",
      reason: "family or relationship context",
    };
  }
  if (matches(text, ["kai", "cortex", "codex", "anthropic", "openai", "vercel"])) {
    return {
      category: "kai",
      priority: important ? "high" : "medium",
      reason: "Kai/Cortex/build tooling context",
    };
  }
  if (matches(text, ["bethel", "bible", "church", "prayer"])) {
    return {
      category: "faith",
      priority: "medium",
      reason: "faith or restoration context",
    };
  }
  if (important || unread) {
    return {
      category: "admin",
      priority: important ? "high" : "medium",
      reason: important ? "Gmail marked it important" : "unread inbox item",
    };
  }
  return {
    category: "unknown",
    priority: "low",
    reason: "general inbox signal",
  };
}

function matches(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n));
}

function priorityRank(priority: TaskPriority): number {
  return { low: 1, medium: 2, high: 3, urgent: 4 }[priority];
}
