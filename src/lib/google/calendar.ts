// Server-side Google Calendar access for Kai. Uses a stored refresh token
// (env) to mint short-lived access tokens on demand — secrets never reach the
// browser. Single-user (Naomi's own calendar) for now.
//
// Env:
//   GOOGLE_CALENDAR_CLIENT_ID
//   GOOGLE_CALENDAR_CLIENT_SECRET
//   GOOGLE_CALENDAR_REFRESH_TOKEN

export interface CalEvent {
  id?: string;
  summary: string;
  start: string; // ISO
  end: string; // ISO
}

export function calendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
  );
}

async function accessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
    refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN!,
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

/** Events between two ISO times on the primary calendar, sorted by start. */
export async function listEvents(
  timeMin: string,
  timeMax: string,
): Promise<CalEvent[]> {
  const token = await accessToken();
  const url =
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
    new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
    });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`listEvents failed: ${data.error?.message ?? res.status}`);
  return (data.items ?? [])
    .filter((e: { start?: { dateTime?: string } }) => e.start?.dateTime)
    .map((e: { id: string; summary?: string; start: { dateTime: string }; end: { dateTime: string } }) => ({
      id: e.id,
      summary: e.summary ?? "(busy)",
      start: e.start.dateTime,
      end: e.end.dateTime,
    }));
}

/** Create a timed event on the primary calendar. */
export async function createEvent(ev: CalEvent): Promise<CalEvent> {
  const token = await accessToken();
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: ev.summary,
        start: { dateTime: ev.start },
        end: { dateTime: ev.end },
      }),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`createEvent failed: ${data.error?.message ?? res.status}`);
  return { id: data.id, summary: data.summary, start: ev.start, end: ev.end };
}

/**
 * Find free gaps of at least `minMinutes` within [from,to], given busy events.
 * Returns up to `limit` slots as {start,end} ISO.
 */
export function freeSlots(
  fromISO: string,
  toISO: string,
  busy: CalEvent[],
  minMinutes: number,
  limit = 5,
): { start: string; end: string }[] {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  const minMs = minMinutes * 60_000;
  const sorted = [...busy].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  const slots: { start: string; end: string }[] = [];
  let cursor = from;
  for (const e of sorted) {
    const s = new Date(e.start).getTime();
    const en = new Date(e.end).getTime();
    if (s - cursor >= minMs) {
      slots.push({
        start: new Date(cursor).toISOString(),
        end: new Date(s).toISOString(),
      });
    }
    cursor = Math.max(cursor, en);
    if (slots.length >= limit) break;
  }
  if (slots.length < limit && to - cursor >= minMs) {
    slots.push({ start: new Date(cursor).toISOString(), end: new Date(to).toISOString() });
  }
  return slots.slice(0, limit);
}
