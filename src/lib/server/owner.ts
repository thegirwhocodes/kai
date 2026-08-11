// Owner gating for the personal integrations.
//
// Kai has no accounts yet, but its Google/Spotify credentials belong to one
// real person. Without this gate, every visitor to the public deployment would
// be planning against the owner's calendar and reading their inbox metadata.
// So: the focus app is for everyone, the connected-account routes are not.
//
// The owner proves themselves with a shared token (`KAI_OWNER_TOKEN` in the
// server env, pasted once into Customize in their own browser). When the token
// is unset the routes stay open in local development and stay closed in
// production — the safe default is "locked".

import { OWNER_HEADER } from "@/lib/ownerHeader";

/** Message every gated route returns, matching the "not connected" shape. */
export const NOT_CONNECTED = {
  error: "not_connected",
  detail:
    "This Kai is running without connected accounts. The timer, focus sounds, tasks, and stats all work without one.",
} as const;

export function isOwnerRequest(req: Request): boolean {
  const expected = process.env.KAI_OWNER_TOKEN?.trim();
  if (!expected) return process.env.NODE_ENV !== "production";
  const provided = req.headers.get(OWNER_HEADER)?.trim();
  return Boolean(provided) && provided === expected;
}
