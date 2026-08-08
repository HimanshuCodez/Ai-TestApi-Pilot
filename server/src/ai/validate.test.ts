import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { callAndValidate } from "./validate.js";
import { AppError } from "../utils/errors.js";

describe("callAndValidate", () => {
  const schema = z.object({ name: z.string() });

  it("returns parsed data when the first attempt is valid", async () => {
    const fn = vi.fn().mockResolvedValue({ name: "ok" });
    const result = await callAndValidate(fn, schema, "test");
    expect(result).toEqual({ name: "ok" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries once on invalid output before succeeding", async () => {
    const fn = vi.fn().mockResolvedValueOnce({ name: 123 }).mockResolvedValueOnce({ name: "ok" });
    const result = await callAndValidate(fn, schema, "test");
    expect(result).toEqual({ name: "ok" });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("never trusts AI output blindly — throws a friendly AppError after exhausting all attempts", async () => {
    const fn = vi.fn().mockResolvedValue({ name: 123 });
    await expect(callAndValidate(fn, schema, "test")).rejects.toBeInstanceOf(AppError);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respects a custom attempt count", async () => {
    const fn = vi.fn().mockResolvedValue({ name: 123 });
    await expect(callAndValidate(fn, schema, "test", 4)).rejects.toBeInstanceOf(AppError);
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
