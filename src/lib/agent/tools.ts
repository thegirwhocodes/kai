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
];

export const AGENT_TOOL_NAMES = new Set(AGENT_TOOLS.map((t) => t.name));
