import { DomainError } from "@/shared/domain-error";
import { err, ok, unwrap } from "@/shared/result";

describe("Phase 0 shared domain contracts", () => {
  it("preserves a domain error code and an immutable copy of details", () => {
    const mutableDetails = { field: "email", nested: { source: "input" } };
    const error = new DomainError(
      "VALIDATION_ERROR",
      "INVALID_EMAIL",
      mutableDetails,
    );

    mutableDetails.field = "password";

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DomainError");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("INVALID_EMAIL");
    expect(error.details).toEqual({ field: "email", nested: { source: "input" } });
    expect(Object.isFrozen(error.details)).toBe(true);
  });

  it("creates explicit success and failure results", () => {
    const success = ok({ id: "profile-1" });
    const failure = err(new Error("failed"));

    expect(success).toEqual({ ok: true, value: { id: "profile-1" } });
    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      expect(failure.error.message).toBe("failed");
    }
  });

  it("unwraps success and throws the original failure", () => {
    const original = new DomainError("NOT_FOUND", "PROFILE_NOT_FOUND");

    expect(unwrap(ok("published"))).toBe("published");
    expect(() => unwrap(err(original))).toThrow(original);
  });
});
