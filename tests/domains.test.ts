import { validateCustomDomainInput, normalizeRequestHost } from "@/lib/domains";

describe("validateCustomDomainInput", () => {
  test("example.com should pass", () => {
    const result = validateCustomDomainInput("example.com");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("example.com");
  });

  test("www.example.com should pass", () => {
    const result = validateCustomDomainInput("www.example.com");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("www.example.com");
  });

  test("https://example.com should be rejected", () => {
    const result = validateCustomDomainInput("https://example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("协议");
  });

  test("http://example.com should be rejected", () => {
    const result = validateCustomDomainInput("http://example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("协议");
  });

  test("example.com/path should be rejected", () => {
    const result = validateCustomDomainInput("example.com/path");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("路径");
  });

  test("example.com:443 should be rejected", () => {
    const result = validateCustomDomainInput("example.com:443");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("端口");
  });

  test("link168.me should be rejected", () => {
    const result = validateCustomDomainInput("link168.me");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("link168.me");
  });

  test("www.link168.me should be rejected", () => {
    const result = validateCustomDomainInput("www.link168.me");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("link168.me");
  });

  test("any.link168.me should be rejected", () => {
    const result = validateCustomDomainInput("any.link168.me");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("link168.me");
  });

  test("127.0.0.1 should be rejected", () => {
    const result = validateCustomDomainInput("127.0.0.1");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("IP 地址");
  });

  test("localhost should be rejected", () => {
    const result = validateCustomDomainInput("localhost");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("localhost");
  });

  test("example.com?x=1 should be rejected", () => {
    const result = validateCustomDomainInput("example.com?x=1");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("查询参数");
  });

  test("user:pass@example.com should be rejected", () => {
    const result = validateCustomDomainInput("user:pass@example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("认证信息");
  });

  test("trim and lowercase", () => {
    const result = validateCustomDomainInput("  Example.COM  ");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("example.com");
  });

  test("trailing dot should be normalized", () => {
    const result = validateCustomDomainInput("example.com.");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("example.com");
  });
});

describe("normalizeRequestHost", () => {
  test("should remove port", () => {
    expect(normalizeRequestHost("example.com:3000")).toBe("example.com");
  });

  test("should remove trailing dot", () => {
    expect(normalizeRequestHost("example.com.")).toBe("example.com");
  });

  test("should lowercase", () => {
    expect(normalizeRequestHost("Example.COM")).toBe("example.com");
  });

  test("localhost should return null", () => {
    expect(normalizeRequestHost("localhost")).toBe(null);
  });
});