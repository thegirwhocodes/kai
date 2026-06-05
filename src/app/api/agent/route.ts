import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { SYSTEM_PROMPT, renderStateContext } from "@/lib/agent/prompt";
import { AGENT_TOOLS } from "@/lib/agent/tools";

export const runtime = "nodejs";

const MODEL = "claude-haiku-4-5-20251001"; // fast + cheap for low-latency voice turns

/**
 * One conversational turn. The client sends prior messages + a snapshot of the
 * live timer state; we return the agent's spoken text plus any tool calls for
 * the client to execute against the store, then the client posts results back.
 *
 * Body: { messages: Anthropic.MessageParam[], state: <renderStateContext arg> }
 */
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set." },
      { status: 500 },
    );
  }

  let body: {
    messages?: Anthropic.MessageParam[];
    state?: Parameters<typeof renderStateContext>[0];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  // Prepend the live state as ephemeral context so the model never asks for
  // things it already knows.
  const stateBlock = body.state
    ? renderStateContext(body.state)
    : "[current state]\nactive: none";

  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: stateBlock },
  ];

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system,
      tools: AGENT_TOOLS,
      messages,
    });

    const say = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    const toolCalls = resp.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, input: b.input }));

    return NextResponse.json({
      say,
      toolCalls,
      stopReason: resp.stop_reason,
      // Echo the assistant turn so the client can append it before sending
      // tool results back on the next call.
      assistant: resp.content,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent call failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
