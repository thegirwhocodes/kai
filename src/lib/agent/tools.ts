// Tool surface the voice agent uses to drive the session. These map 1:1 onto
// the store actions, so a spoken "pause" and a clicked Pause do the same thing.
// The client executes the tool call against the zustand store and feeds the
// result back to the model.

/**
 * Tool definitions are written in the JSON-Schema shape below and converted to
 * the provider's wire format at the edge (see `toChatTools`). Keeping our own
 * type means no vendor SDK is needed just to describe a tool.
 */
export interface AgentTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "start_focus",
    description:
      "Begin a focus block. The adaptive engine picks the length; you don't specify it. Optionally target a task by id and pass known calendar space.",
    input_schema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Optional task id to direct this focus block at.",
        },
        minutesUntilNextCommitment: {
          type: "integer",
          description:
            "Optional minutes until the next calendar commitment if already known.",
        },
      },
    },
  },
  {
    name: "suggest_next_session",
    description:
      "Ask Kai's life planner what the user should work on next. It considers open tasks, Google Calendar availability, Gmail metadata signals, and known priorities, then stores the recommendation for the UI.",
    input_schema: {
      type: "object",
      properties: {
        horizonHours: {
          type: "integer",
          description: "Optional planning window. Default is the next 10 hours.",
        },
      },
    },
  },
  {
    name: "start_recommended_focus",
    description:
      "Start the latest recommended session from suggest_next_session. If there is no recommendation yet, get one first.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "start_break",
    description:
      "Begin a break. The engine decides short vs long based on the user's focus streak.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "start_lock_in",
    description:
      "Commit to a total lock-in session of a given length. Kai lays out the whole Pomodoro plan (focus blocks + breaks, always ending on focus) across the budget and runs it hands-free to the finish. Use when the user names how long they want to work — 'lock in for 2 hours', 'a 90 minute session', 'I've got an hour'.",
    input_schema: {
      type: "object",
      properties: {
        minutes: {
          type: "integer",
          description: "Total session length in minutes (focus + breaks combined).",
        },
        taskId: {
          type: "string",
          description: "Optional task id to aim the whole lock-in at.",
        },
      },
      required: ["minutes"],
    },
  },
  {
    name: "end_lock_in",
    description:
      "Drop the active lock-in commitment. Only use when the user clearly wants to stop the whole planned session.",
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
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Optional priority if the user indicates urgency.",
        },
        dueAt: {
          type: "string",
          description: "Optional ISO datetime when this task is due.",
        },
        sphere: {
          type: "string",
          description: "Optional life/work area, e.g. Sabi, school, family.",
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
    name: "search_calendar",
    description:
      "Search the user's calendar backward and/or forward around an anchor time. Use this when the user asks what happened last week/month, what is coming up, or wants calendar context across time.",
    input_schema: {
      type: "object",
      properties: {
        anchorISO: {
          type: "string",
          description:
            "Optional ISO anchor datetime. Defaults to now from current state.",
        },
        pastDays: {
          type: "integer",
          description: "Days to look backward from anchor. Default 14.",
        },
        futureDays: {
          type: "integer",
          description: "Days to look forward from anchor. Default 30.",
        },
        query: {
          type: "string",
          description: "Optional summary text filter.",
        },
        maxResults: {
          type: "integer",
          description: "Maximum events to return. Default 50.",
        },
      },
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
    name: "create_calendar",
    description:
      "Create or find a Google Calendar by name. Use when the user asks for calendars like Savvy, Music, Content Creation, etc.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Calendar name." },
      },
      required: ["summary"],
    },
  },
  {
    name: "reschedule_calendar_events",
    description:
      "Preview or apply a spaced reschedule of timed events from one date range into another. Defaults to preview only; set apply=true only when the user clearly confirms the move.",
    input_schema: {
      type: "object",
      properties: {
        sourceTimeMin: { type: "string", description: "ISO start of source range." },
        sourceTimeMax: { type: "string", description: "ISO end of source range." },
        targetTimeMin: { type: "string", description: "ISO start of target range." },
        targetTimeMax: { type: "string", description: "ISO end of target range." },
        calendarId: { type: "string", description: "Optional calendar id; defaults to primary." },
        dayStartHour: { type: "integer", description: "Default 9." },
        dayEndHour: { type: "integer", description: "Default 18." },
        gapMinutes: { type: "integer", description: "Gap between moved events. Default 30." },
        apply: {
          type: "boolean",
          description:
            "False for preview. True applies the move to Google Calendar.",
        },
      },
      required: ["sourceTimeMin", "sourceTimeMax", "targetTimeMin", "targetTimeMax"],
    },
  },
  {
    name: "search_email_history",
    description:
      "Search the user's Gmail history with Gmail query syntax. Use this when the user asks about old emails, wants context before editing, or needs to find a thread. Returns ids that can be passed to get_email.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Gmail search query, e.g. 'from:sonia newer_than:1y', 'subject:invoice', or plain keywords.",
        },
        maxResults: {
          type: "integer",
          description: "Maximum messages to return. Default 10.",
        },
        includeBody: {
          type: "boolean",
          description:
            "Whether to include body excerpts. Use false for broad searches, true when editing needs content.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_email",
    description:
      "Fetch one Gmail message by id, including body text by default. Use after search_email_history before drafting or editing a reply.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Gmail message id." },
        includeBody: { type: "boolean", description: "Default true." },
      },
      required: ["id"],
    },
  },
  {
    name: "create_email_draft",
    description:
      "Create a Gmail draft only. Never sends email. Use when the user asks Kai to draft, edit, rewrite, or prepare a reply.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        cc: { type: "string" },
        bcc: { type: "string" },
        threadId: {
          type: "string",
          description: "Optional Gmail thread id for replies.",
        },
        inReplyTo: {
          type: "string",
          description: "Optional Message-ID header from the original email.",
        },
        references: {
          type: "string",
          description: "Optional References header.",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "update_email_draft",
    description:
      "Update an existing Gmail draft only. Never sends email. Use when the user asks to revise an already-created draft.",
    input_schema: {
      type: "object",
      properties: {
        draftId: { type: "string" },
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        cc: { type: "string" },
        bcc: { type: "string" },
        threadId: { type: "string" },
        inReplyTo: { type: "string" },
        references: { type: "string" },
      },
      required: ["draftId", "to", "subject", "body"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the live internet for current facts, docs, people, prices, news, or anything that may have changed. Return concise source-linked results.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        maxResults: { type: "integer", description: "Default 5." },
        domains: {
          type: "array",
          items: { type: "string" },
          description: "Optional domains to restrict results to.",
        },
      },
      required: ["query"],
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

/** OpenAI-compatible function-tool shape (what Groq's chat API expects). */
export interface ChatTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: AgentTool["input_schema"];
  };
}

/** Convert our tool definitions to the OpenAI/Groq `tools` wire format. */
export function toChatTools(tools: AgentTool[] = AGENT_TOOLS): ChatTool[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}
