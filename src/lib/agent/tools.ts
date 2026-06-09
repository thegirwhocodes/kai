// Tool surface the voice agent uses to drive the session. These map 1:1 onto
// the store actions, so a spoken "pause" and a clicked Pause do the same thing.
// The client executes the tool call against the zustand store and feeds the
// result back to the model.

import type Anthropic from "@anthropic-ai/sdk";

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "start_focus",
    description:
      "Begin a focus block. The adaptive engine picks the length; you don't specify it. Optionally target a task by id.",
    input_schema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Optional task id to direct this focus block at.",
        },
      },
    },
  },
  {
    name: "start_break",
    description:
      "Begin a break. The engine decides short vs long based on the user's focus streak.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "pause",
    description: "Pause the currently running block.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "resume",
    description: "Resume a paused block.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "complete_block",
    description:
      "Mark the active block finished early (user says they're done).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "skip_block",
    description: "Abandon/skip the active block.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "rate_focus",
    description:
      "Record the user's self-reported focus for the just-finished block, 1 (scattered) to 5 (deep flow). Feeds the adaptive engine.",
    input_schema: {
      type: "object",
      properties: {
        rating: { type: "integer", minimum: 1, maximum: 5 },
      },
      required: ["rating"],
    },
  },
  {
    name: "add_task",
    description: "Add a task to the list.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        estimateBlocks: {
          type: "integer",
          description: "Optional rough number of focus blocks expected.",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task done by id.",
    input_schema: {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"],
    },
  },
  {
    name: "get_schedule",
    description:
      "Read the user's Google Calendar between two ISO datetimes and get the free gaps. Use this to see what they have on before scheduling focus time. Returns busy events and free slots.",
    input_schema: {
      type: "object",
      properties: {
        timeMin: { type: "string", description: "ISO start of the window." },
        timeMax: { type: "string", description: "ISO end of the window." },
        minMinutes: {
          type: "integer",
          description: "Minimum length (minutes) for a usable free slot. Default 25.",
        },
      },
      required: ["timeMin", "timeMax"],
    },
  },
  {
    name: "schedule_event",
    description:
      "Create an event on the user's Google Calendar — e.g. a focus block — at a specific time. Times are ISO datetimes with timezone offset.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Event title, e.g. 'Focus: grant draft'." },
        start: { type: "string", description: "ISO start datetime." },
        end: { type: "string", description: "ISO end datetime." },
      },
      required: ["summary", "start", "end"],
    },
  },
  {
    name: "play_music",
    description:
      "Play music on the user's Spotify. IMPORTANT: by default this searches ONLY the user's own library (saved tracks). If the song isn't in their library, it returns notInLibrary WITHOUT playing — you must then ASK the user whether to search the wider Spotify catalog, and only if they say yes, call again with allowCatalog=true.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to play — song and/or artist." },
        allowCatalog: {
          type: "boolean",
          description:
            "Only set true AFTER the user has confirmed they want a catalog (non-library) search.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "pause_music",
    description: "Pause Spotify playback.",
    input_schema: { type: "object", properties: {} },
  },
];

export const AGENT_TOOL_NAMES = new Set(AGENT_TOOLS.map((t) => t.name));
