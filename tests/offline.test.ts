import { describe, expect, it } from "vitest";
import { isNetworkError, parsePending } from "@/lib/offline";

describe("offline grocery ticks", () => {
  it("reads the queued ticks, ignoring anything malformed", () => {
    expect(parsePending('{"a":true,"b":false}')).toEqual({ a: true, b: false });
    expect(parsePending("[1,2]")).toEqual({});
    expect(parsePending("not json")).toEqual({});
    expect(parsePending("null")).toEqual({});
  });

  it("tells a dropped connection apart from a refusal", () => {
    expect(isNetworkError({ message: "TypeError: Failed to fetch" })).toBe(true);
    expect(isNetworkError({ message: "Load failed" })).toBe(true); // Safari
    expect(isNetworkError({ message: "NetworkError when attempting to fetch resource." })).toBe(true); // Firefox
    expect(isNetworkError({ message: "permission denied for table grocery_list_items" })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
