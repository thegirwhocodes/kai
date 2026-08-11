import { NextResponse } from "next/server";
import { SYSTEM_PROMPT, renderStateContext } from "@/lib/agent/prompt";
import { toChatTools } from "@/lib/agent/tools";

export const runtime = "nodejs";

// Groq's OpenAI-compatible chat API. gpt-oss-120b is the strongest tool-caller
// on the account and answers a voice turn in well under a second; the 70b Llama
// is a same-shape fallback if the primary is unavailable or rate-limited.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODEL = "llama-3.3-70b-versatile";

/**
 * The app's internal message format is block-shaped (text / tool_use /
 * tool_result). It is deliberately provider-neutral: the client and the tool
 * executor speak it, and only this route translates to the vendor wire format.
 */
type ContentBlock = Record<string, unknown> & { type: string };
interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
}

const asBlocks = (content: Message["content"]): ContentBlock[] =>
  typeof content === "string" ? [{ type: "text", text: content }] : content;

const textOf = (block: ContentBlock): string =>
  typeof block.text === "string" ? block.text : "";

/** Translate our block-shaped history into OpenAI/Groq chat messages. */
function toChatMessages(messages: Message[], system: string): ChatMessage[] {
  const out: ChatMessage[] = [{ role: "system", content: system }];

  for (const message of messages) {
    const blocks = asBlocks(message.content);

    if (message.role === "assistant") {
      const text = blocks.filter((b) => b.type === "text").map(textOf).join(" ").trim();
      const toolCalls = blocks
        .filter((b) => b.type === "tool_use")
        .map((b) => ({
          id: String(b.id ?? ""),
          type: "function" as const,
          function: {
            name: String(b.name ?? ""),
            arguments: JSON.stringify(b.input ?? {}),
          },
        }));
      // An assistant turn that only called tools carries null content.
      out.push({
        role: "assistant",
        content: text || null,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      });
      continue;
    }

    // A user turn is either real speech or a batch of tool results, which the
    // chat format carries as separate `tool` messages keyed by call id.
    const results = blocks.filter((b) => b.type === "tool_result");
    for (const result of results) {
      out.push({
        role: "tool",
        tool_call_id: String(result.tool_use_id ?? ""),
        content:
          typeof result.content === "string"
            ? result.content
            : JSON.stringify(result.content ?? ""),
      });
    }
    const said = blocks.filter((b) => b.type === "text").map(textOf).join(" ").trim();
    if (said) out.push({ role: "user", content: said });
  }

  return out;
}

interface ChatCompletion {
  choices?: {
    finish_reason?: string;
    message?: {
      content?: string | null;
      tool_calls?: {
        id?: string;
        function?: { name?: string; arguments?: string };
      }[];
    };
  }[];
  error?: { message?: string };
}

async function callGroq(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<ChatCompletion> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: toChatTools(),
      tool_choice: "auto",
      temperature: 0.6,
      max_completion_tokens: 400,
      // Keep the private chain of thought short and out of the spoken reply —
      // gpt-oss returns it in a separate `reasoning` field, which we drop.
      reasoning_effort: "low",
    }),
  });

  const data = (await res.json()) as ChatCompletion;
  if (!res.ok) {
    throw new Error(data.error?.message || `Groq ${res.status}`);
  }
  return data;
}

/**
 * One conversational turn. The client sends prior messages + a snapshot of the
 * live timer state; we return the agent's spoken text plus any tool calls for
 * the client to execute against the store, then the client posts results back.
 */
export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set." },
      { status: 500 },
    );
  }

  let body: {
    messages?: Message[];
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

  // The live state rides in the system message so the model never asks for
  // something it already knows.
  const stateBlock = body.state
    ? renderStateContext(body.state)
    : "[current state]\nactive: none";
  const chatMessages = toChatMessages(
    messages,
    `${SYSTEM_PROMPT}\n\n${stateBlock}`,
  );

  let completion: ChatCompletion;
  try {
    completion = await callGroq(apiKey, MODEL, chatMessages);
  } catch (primaryError) {
    try {
      completion = await callGroq(apiKey, FALLBACK_MODEL, chatMessages);
    } catch {
      const message =
        primaryError instanceof Error
          ? primaryError.message
          : "Agent call failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const choice = completion.choices?.[0];
  const say = (choice?.message?.content ?? "").trim();
  const rawCalls = choice?.message?.tool_calls ?? [];

  const toolCalls = rawCalls.map((call, i) => ({
    id: call.id || `call_${i}`,
    name: call.function?.name ?? "",
    input: parseArguments(call.function?.arguments),
  }));

  // Echo the assistant turn in our block format so the client can append it
  // before sending tool results back on the next call.
  const assistant: ContentBlock[] = [
    ...(say ? [{ type: "text", text: say }] : []),
    ...toolCalls.map((call) => ({
      type: "tool_use",
      id: call.id,
      name: call.name,
      input: call.input,
    })),
  ];

  return NextResponse.json({
    say,
    toolCalls,
    stopReason: choice?.finish_reason ?? null,
    assistant,
  });
}

/** Tool arguments arrive as a JSON string; a malformed one must not 500. */
function parseArguments(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
