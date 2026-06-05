"use client";

// Client-side agent loop. Sends the conversation + a live state snapshot to
// /api/agent, executes any tool calls against the store, feeds the results
// back, and repeats until the model stops calling tools. Returns the final
// spoken text plus the updated message history.

import { buildStateSnapshot, executeToolCall, type ToolCall } from "./executeTool";

// Loosely-typed Anthropic message shapes — enough for the wire format without
// pulling the SDK into the browser bundle.
type ContentBlock = Record<string, unknown> & { type: string };
export interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface AgentResponse {
  say: string;
  toolCalls: ToolCall[];
  stopReason: string | null;
  assistant: ContentBlock[];
  error?: string;
}

const MAX_TOOL_ROUNDS = 5; // safety bound on the act→confirm loop

async function callRoute(messages: Message[]): Promise<AgentResponse> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, state: buildStateSnapshot() }),
  });
  const data = (await res.json()) as AgentResponse;
  if (!res.ok) throw new Error(data.error || `Agent route ${res.status}`);
  return data;
}

/**
 * Run one user turn to completion. `history` is the running conversation;
 * `userText` is what the user just said. Returns everything said this turn
 * (joined) and the new history to keep for the next turn.
 */
export async function runUserTurn(
  history: Message[],
  userText: string,
): Promise<{ said: string; history: Message[] }> {
  const messages: Message[] = [
    ...history,
    { role: "user", content: userText },
  ];
  const spoken: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const resp = await callRoute(messages);
    if (resp.say) spoken.push(resp.say);

    // Record the assistant turn verbatim so tool_results line up by id.
    messages.push({ role: "assistant", content: resp.assistant });

    if (!resp.toolCalls?.length) break;

    // Execute each tool against the store and send results back.
    const toolResults: ContentBlock[] = resp.toolCalls.map((call) => {
      let content: string;
      try {
        content = executeToolCall(call);
      } catch (e) {
        content = `Error: ${e instanceof Error ? e.message : "tool failed"}`;
      }
      return { type: "tool_result", tool_use_id: call.id, content };
    });
    messages.push({ role: "user", content: toolResults });
  }

  return { said: spoken.join(" ").trim(), history: messages };
}
