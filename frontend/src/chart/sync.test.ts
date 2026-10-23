import { describe, expect, it } from "vitest";
import { hoveredTime } from "./sync.ts";

describe("hoveredTime", () => {
  it("reads the time under the pointer from an axis pointer update", () => {
    expect(
      hoveredTime({ axesInfo: [{ axisDim: "x", value: 1780000000000 }] }),
    ).toBe(1780000000000);
  });

  it("ignores an update without an axis value", () => {
    expect(hoveredTime({ axesInfo: [] })).toBeNull();
    expect(hoveredTime({ axesInfo: [{ value: "Jun" }] })).toBeNull();
    expect(hoveredTime(null)).toBeNull();
  });
});
