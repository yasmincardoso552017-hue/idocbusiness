import { describe, expect, it } from "vitest";
import { canExportPreview, parsePageRange } from "./pdf-selection";

describe("page selection", () => {
  it("selects exact one-based pages and removes duplicates", () => expect(parsePageRange("1-3,3,7", 7)).toEqual([0, 1, 2, 6]));
  it("rejects a huge range instead of allocating an unbounded set", () => expect(() => parsePageRange("1-999999999", 4)).toThrow());
  it("rejects malformed, reversed and missing pages", () => { for (const range of ["1abc", "3-2", "0", "5", "1-2-3", ""]) expect(() => parsePageRange(range, 4)).toThrow(); });
  it("does not allow download before every page is previewed", () => { expect(canExportPreview(true, null, 1, 2)).toBe(false); expect(canExportPreview(false, "failed", 1, 2)).toBe(false); expect(canExportPreview(false, null, 1, 2)).toBe(false); expect(canExportPreview(false, null, 2, 2)).toBe(true); });
});