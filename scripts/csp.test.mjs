import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { buildPolicy, httpsOrigin, injectPolicy, inlineScriptHashes } from "./csp.mjs";

const sha = (text) => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

describe("inlineScriptHashes", () => {
  it("hashes inline scripts only, once each", () => {
    const html =
      '<script src="/a.js" async=""></script><script>one()</script><script id="_R_">two()</script><script>one()</script><script></script>';
    expect(inlineScriptHashes(html)).toEqual([sha("one()"), sha("two()")]);
  });
});

describe("httpsOrigin", () => {
  it("keeps only https origins", () => {
    expect(httpsOrigin("https://abc.supabase.co/rest/v1")).toBe("https://abc.supabase.co");
    expect(httpsOrigin("http://abc.supabase.co")).toBeNull();
    expect(httpsOrigin("not a url")).toBeNull();
    expect(httpsOrigin(undefined)).toBeNull();
  });
});

describe("buildPolicy", () => {
  it("allows only the site, its hashes, Supabase and the GitHub API", () => {
    const policy = buildPolicy({ scriptHashes: ["'sha256-x'"], supabaseOrigin: "https://abc.supabase.co", turnstile: false });
    expect(policy).toContain("script-src 'self' 'sha256-x';");
    expect(policy).toContain("connect-src 'self' https://abc.supabase.co https://api.github.com https://raw.githubusercontent.com;");
    expect(policy).toContain("frame-src 'none';");
    expect(policy).toContain("object-src 'none'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("adds Cloudflare Turnstile only when it is configured", () => {
    const policy = buildPolicy({ scriptHashes: [], supabaseOrigin: null, turnstile: true });
    expect(policy).toContain("script-src 'self' https://challenges.cloudflare.com;");
    expect(policy).toContain("frame-src https://challenges.cloudflare.com;");
  });
});

describe("injectPolicy", () => {
  it("puts the meta tag straight after the charset, before any script", () => {
    const html = '<html><head><meta charSet="utf-8"/><script>x()</script></head></html>';
    const out = injectPolicy(html, "default-src 'self'");
    expect(out).toBe(
      `<html><head><meta charSet="utf-8"/><meta http-equiv="Content-Security-Policy" content="default-src 'self'"/><script>x()</script></head></html>`,
    );
    expect(() => injectPolicy(out, "default-src 'self'")).toThrow();
  });
});
