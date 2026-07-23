import { describe, expect, it } from "vitest";
import { migratePersisted } from "../store";

describe("migratePersisted (v0 -> v1)", () => {
  it("flips a stuck adaptive=true to classic for pre-v1 saves", () => {
    const out = migratePersisted(
      { settings: { adaptive: true, baselineFocusSec: 1500 } },
      0,
    );
    expect(out.settings?.adaptive).toBe(false);
    // other settings are preserved
    expect(out.settings?.baselineFocusSec).toBe(1500);
  });

  it("leaves v1+ saves untouched (respects a real user choice)", () => {
    const out = migratePersisted({ settings: { adaptive: true } }, 1);
    expect(out.settings?.adaptive).toBe(true);
  });

  it("is safe when there are no persisted settings", () => {
    expect(() => migratePersisted({}, 0)).not.toThrow();
    expect(() => migratePersisted(null, 0)).not.toThrow();
  });
});
