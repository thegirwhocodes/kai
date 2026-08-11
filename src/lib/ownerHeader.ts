/**
 * The header the owner's browser sends to prove it may use the connected
 * accounts. Lives on its own so the client helper and the server check can
 * share it without the client importing server code.
 */
export const OWNER_HEADER = "x-kai-owner";
