import { NextResponse } from "next/server";
import {
  calendarConfigured,
  createEvent,
  freeSlots,
  listEvents,
} from "@/lib/google/calendar";

export const runtime = "nodejs";

// Calendar actions for Kai's agent. The browser never sees Google secrets — it
// posts an action here and gets back plain data the agent can reason about.
//
// Body: { action: "schedule" | "list" | "free", ... }

export async function POST(req: Request) {
  if (!calendarConfigured()) {
    return NextResponse.json(
      { error: "calendar_not_connected" },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const action = body.action;

  try {
    if (action === "list") {
      const { timeMin, timeMax } = body as { timeMin: string; timeMax: string };
      const events = await listEvents(timeMin, timeMax);
      return NextResponse.json({ events });
    }

    if (action === "search") {
      const {
        anchorISO,
        pastDays,
        futureDays,
        query,
        maxResults,
      } = body as {
        anchorISO?: string;
        pastDays?: number;
        futureDays?: number;
        query?: string;
        maxResults?: number;
      };
      const anchor = anchorISO ? new Date(anchorISO) : new Date();
      if (Number.isNaN(anchor.getTime())) {
        return NextResponse.json({ error: "invalid_anchor" }, { status: 400 });
      }
      const from = new Date(
        anchor.getTime() - clamp(pastDays ?? 14, 0, 365) * 24 * 60 * 60_000,
      );
      const to = new Date(
        anchor.getTime() + clamp(futureDays ?? 30, 0, 730) * 24 * 60 * 60_000,
      );
      const events = await listEvents(from.toISOString(), to.toISOString());
      const needle = query?.trim().toLowerCase();
      const filtered = needle
        ? events.filter((event) => event.summary.toLowerCase().includes(needle))
        : events;
      return NextResponse.json({
        events: filtered.slice(0, clamp(maxResults ?? 50, 1, 100)),
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
      });
    }

    if (action === "free") {
      const { timeMin, timeMax, minMinutes } = body as {
        timeMin: string;
        timeMax: string;
        minMinutes: number;
      };
      const events = await listEvents(timeMin, timeMax);
      const slots = freeSlots(timeMin, timeMax, events, minMinutes ?? 25);
      return NextResponse.json({ slots, busy: events });
    }

    if (action === "schedule") {
      const { summary, start, end } = body as {
        summary: string;
        start: string;
        end: string;
      };
      if (!summary || !start || !end) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      }
      const created = await createEvent({ summary, start, end });
      return NextResponse.json({ created });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "calendar_error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
