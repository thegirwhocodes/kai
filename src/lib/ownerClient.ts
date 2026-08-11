"use client";

// The browser half of owner gating (see lib/server/owner.ts). The owner pastes
// their token into Customize once; it lives in this browser and rides along on
// requests to the routes that touch connected accounts. Everyone else simply
// never sends it and gets the account-free app.

import { OWNER_HEADER } from "@/lib/ownerHeader";

export const OWNER_STORAGE_KEY = "kai:owner-token";

export function getOwnerToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(OWNER_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setOwnerToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    const clean = token.trim();
    if (clean) window.localStorage.setItem(OWNER_STORAGE_KEY, clean);
    else window.localStorage.removeItem(OWNER_STORAGE_KEY);
  } catch {
    // storage disabled; the token just won't persist
  }
}

/** fetch(), plus the owner header when this browser has one. */
export function kaiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = getOwnerToken();
  if (!token) return fetch(input, init);
  const headers = new Headers(init.headers);
  headers.set(OWNER_HEADER, token);
  return fetch(input, { ...init, headers });
}
