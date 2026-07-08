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
  calendarId?: string;
  summary: string;
  start: string; // ISO
  end: string; // ISO
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
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

/** Events between two ISO times on a calendar, sorted by start. */
export async function listEvents(
  timeMin: string,
  timeMax: string,
  calendarId = "primary",
): Promise<CalEvent[]> {
  const token = await accessToken();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
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
      calendarId,
      summary: e.summary ?? "(busy)",
      start: e.start.dateTime,
      end: e.end.dateTime,
    }));
}

export async function listCalendars(): Promise<CalendarListEntry[]> {
  const token = await accessToken();
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`listCalendars failed: ${data.error?.message ?? res.status}`);
  return (data.items ?? []).map(
    (cal: { id: string; summary?: string; primary?: boolean }) => ({
      id: cal.id,
      summary: cal.summary ?? cal.id,
      primary: cal.primary,
    }),
  );
}

export async function ensureCalendar(summary: string): Promise<CalendarListEntry> {
  const clean = summary.trim();
  if (!clean) throw new Error("Calendar name is required.");
  const existing = (await listCalendars()).find(
    (cal) => cal.summary.trim().toLowerCase() === clean.toLowerCase(),
  );
  if (existing) return existing;

  const token = await accessToken();
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ summary: clean }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`createCalendar failed: ${data.error?.message ?? res.status}`);
  return { id: data.id, summary: data.summary ?? clean };
}

/** Create a timed event. Defaults to primary calendar. */
export async function createEvent(ev: CalEvent, calendarId = "primary"): Promise<CalEvent> {
  const token = await accessToken();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
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
  return { id: data.id, calendarId, summary: data.summary, start: ev.start, end: ev.end };
}

export async function updateEventTime(
  calendarId: string,
  eventId: string,
  start: string,
  end: string,
): Promise<CalEvent> {
  const token = await accessToken();
  const getRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const existing = await getRes.json();
  if (!getRes.ok) throw new Error(`getEvent failed: ${existing.error?.message ?? getRes.status}`);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: { ...existing.start, dateTime: start },
        end: { ...existing.end, dateTime: end },
      }),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`updateEvent failed: ${data.error?.message ?? res.status}`);
  return {
    id: data.id,
    calendarId,
    summary: data.summary ?? "(busy)",
    start: data.start.dateTime,
    end: data.end.dateTime,
  };
}

export interface RescheduleMove {
  id: string;
  calendarId: string;
  summary: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
}

export function planSpacedReschedule({
  events,
  busy = [],
  targetStart,
  targetEnd,
  dayStartHour = 9,
  dayEndHour = 18,
  gapMinutes = 30,
}: {
  events: CalEvent[];
  busy?: CalEvent[];
  targetStart: string;
  targetEnd: string;
  dayStartHour?: number;
  dayEndHour?: number;
  gapMinutes?: number;
}): RescheduleMove[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  const targetEndMs = new Date(targetEnd).getTime();
  const busyIntervals = busy
    .map((event) => ({
      start: new Date(event.start).getTime(),
      end: new Date(event.end).getTime(),
    }))
    .filter((event) => Number.isFinite(event.start) && Number.isFinite(event.end))
    .sort((a, b) => a.start - b.start);
  let cursor = firstWorkCursor(new Date(targetStart), dayStartHour);
  return sorted.flatMap((event) => {
    if (!event.id) return [];
    const duration = Math.max(
      15 * 60_000,
      new Date(event.end).getTime() - new Date(event.start).getTime(),
    );
    cursor = fitOpenCursor(cursor, duration, busyIntervals, dayStartHour, dayEndHour);
    if (cursor.getTime() + duration > targetEndMs) return [];
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + duration);
    const newBusy = { start: start.getTime(), end: end.getTime() };
    busyIntervals.push(newBusy);
    busyIntervals.sort((a, b) => a.start - b.start);
    cursor = new Date(end.getTime() + gapMinutes * 60_000);
    return [
      {
        id: event.id,
        calendarId: event.calendarId ?? "primary",
        summary: event.summary,
        oldStart: event.start,
        oldEnd: event.end,
        newStart: start.toISOString(),
        newEnd: end.toISOString(),
      },
    ];
  });
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

function firstWorkCursor(date: Date, dayStartHour: number): Date {
  const cursor = new Date(date);
  if (cursor.getHours() < dayStartHour) {
    cursor.setHours(dayStartHour, 0, 0, 0);
  }
  return cursor;
}

function fitCursor(
  cursor: Date,
  durationMs: number,
  dayStartHour: number,
  dayEndHour: number,
): Date {
  const next = new Date(cursor);
  const endOfDay = new Date(next);
  endOfDay.setHours(dayEndHour, 0, 0, 0);
  if (next.getHours() < dayStartHour) {
    next.setHours(dayStartHour, 0, 0, 0);
  }
  if (next.getTime() + durationMs > endOfDay.getTime()) {
    next.setDate(next.getDate() + 1);
    next.setHours(dayStartHour, 0, 0, 0);
  }
  return next;
}

function fitOpenCursor(
  cursor: Date,
  durationMs: number,
  busy: { start: number; end: number }[],
  dayStartHour: number,
  dayEndHour: number,
): Date {
  let next = fitCursor(cursor, durationMs, dayStartHour, dayEndHour);
  for (let attempts = 0; attempts < 500; attempts++) {
    const start = next.getTime();
    const end = start + durationMs;
    const conflict = busy.find((event) => start < event.end && end > event.start);
    if (!conflict) return next;
    next = fitCursor(new Date(conflict.end + 15 * 60_000), durationMs, dayStartHour, dayEndHour);
  }
  return next;
}
