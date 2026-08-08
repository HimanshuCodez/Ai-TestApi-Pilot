import { describe, it, expect } from "vitest";
import { isBlockedIp, assertSafeUrl } from "./ssrf.js";

describe("isBlockedIp", () => {
  it.each([
    ["127.0.0.1", true],
    ["10.0.0.5", true],
    ["172.16.0.1", true],
    ["172.31.255.255", true],
    ["192.168.1.1", true],
    ["169.254.169.254", true],
    ["100.64.0.1", true],
    ["0.0.0.0", true],
    ["8.8.8.8", false],
    ["1.1.1.1", false],
    ["172.32.0.1", false],
  ])("classifies IPv4 %s as blocked=%s", (ip, expected) => {
    expect(isBlockedIp(ip)).toBe(expected);
  });

  it("blocks IPv6 loopback, link-local, and unique-local addresses", () => {
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("fe80::1")).toBe(true);
    expect(isBlockedIp("fd00::1")).toBe(true);
  });

  it("allows a public IPv6 address", () => {
    expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
  });

  it("treats a non-IP string as unsafe", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });
});

describe("assertSafeUrl", () => {
  it("rejects non-http(s) protocols", async () => {
    await expect(assertSafeUrl("ftp://example.com/spec.json")).rejects.toThrow(/INVALID_URL/);
  });

  it("rejects malformed URLs", async () => {
    await expect(assertSafeUrl("not a url")).rejects.toThrow(/INVALID_URL/);
  });

  it("rejects IP-literal URLs pointing at loopback addresses", async () => {
    await expect(assertSafeUrl("http://127.0.0.1:4000/spec.json")).rejects.toThrow(/SSRF_BLOCKED/);
  });

  it("rejects IP-literal URLs pointing at the cloud metadata address", async () => {
    await expect(assertSafeUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow(/SSRF_BLOCKED/);
  });

  it("rejects the blocked hostname localhost outright", async () => {
    await expect(assertSafeUrl("http://localhost:3000")).rejects.toThrow(/SSRF_BLOCKED/);
  });

  it("accepts a public IP-literal URL", async () => {
    const result = await assertSafeUrl("https://8.8.8.8/spec.json");
    expect(result.resolvedIps).toEqual(["8.8.8.8"]);
  });
});
