import type { KaiCommand, KaiRecommendation } from "@/lib/types";

type CommandDraft = Omit<KaiCommand, "id" | "createdAt">;

const globalForKai = globalThis as unknown as {
  __kaiCommands?: KaiCommand[];
};

function queue(): KaiCommand[] {
  if (!globalForKai.__kaiCommands) globalForKai.__kaiCommands = [];
  return globalForKai.__kaiCommands;
}

export function pushKaiCommand(draft: CommandDraft): KaiCommand {
  const createdAt = Date.now();
  const command: KaiCommand = {
    ...draft,
    id: `cmd-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
  };
  const commands = queue();
  commands.push(command);
  if (commands.length > 100) commands.splice(0, commands.length - 100);
  return command;
}

export function listKaiCommands(after = 0): KaiCommand[] {
  return queue().filter((command) => command.createdAt > after);
}

export function commandForRecommendation(
  recommendation: KaiRecommendation,
  type: KaiCommand["type"],
  source: KaiCommand["source"],
  spoken?: string,
): KaiCommand {
  return pushKaiCommand({ type, source, recommendation, spoken });
}
