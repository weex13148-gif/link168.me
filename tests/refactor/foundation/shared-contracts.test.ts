import { DomainError } from "@/shared/domain-error";
import {
  assertSingleWriter,
  getRefactorFeatureFlags,
} from "@/shared/feature-flags";
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

describe("Phase 0 refactor feature flags", () => {
  it("defaults every approved flag to false", () => {
    expect(getRefactorFeatureFlags({})).toEqual({
      newDashboard: false,
      newProfileDomain: false,
      newMediaPipeline: false,
      newAiReception: false,
      newLeadPipeline: false,
      newBilling: false,
    });
  });

  it("accepts only literal true and false values", () => {
    expect(
      getRefactorFeatureFlags({
        LINK168_NEW_DASHBOARD: "true",
        LINK168_NEW_PROFILE_DOMAIN: "false",
        LINK168_NEW_MEDIA_PIPELINE: "true",
        LINK168_NEW_AI_RECEPTION: "false",
        LINK168_NEW_LEAD_PIPELINE: "true",
        LINK168_NEW_BILLING: "false",
      }),
    ).toEqual({
      newDashboard: true,
      newProfileDomain: false,
      newMediaPipeline: true,
      newAiReception: false,
      newLeadPipeline: true,
      newBilling: false,
    });
  });

  it.each(["1", "yes", "", "TRUE"])(
    "rejects invalid feature flag value %p",
    (value) => {
      try {
        getRefactorFeatureFlags({ LINK168_NEW_DASHBOARD: value });
        throw new Error("EXPECTED_FEATURE_FLAG_FAILURE");
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe("VALIDATION_ERROR");
        expect((error as DomainError).message).toBe("INVALID_FEATURE_FLAG");
        expect((error as DomainError).details).toEqual({
          envName: "LINK168_NEW_DASHBOARD",
          value,
        });
      }
    },
  );

  it("allows zero or one writer and rejects simultaneous writers", () => {
    expect(() =>
      assertSingleWriter({
        label: "profile",
        legacyWriterEnabled: false,
        newWriterEnabled: false,
      }),
    ).not.toThrow();
    expect(() =>
      assertSingleWriter({
        label: "profile",
        legacyWriterEnabled: true,
        newWriterEnabled: false,
      }),
    ).not.toThrow();
    expect(() =>
      assertSingleWriter({
        label: "profile",
        legacyWriterEnabled: false,
        newWriterEnabled: true,
      }),
    ).not.toThrow();

    try {
      assertSingleWriter({
        label: "profile",
        legacyWriterEnabled: true,
        newWriterEnabled: true,
      });
      throw new Error("EXPECTED_SINGLE_WRITER_FAILURE");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe("CONFLICT");
      expect((error as DomainError).message).toBe("MULTIPLE_WRITERS_ENABLED");
      expect((error as DomainError).details).toEqual({ label: "profile" });
    }
  });
});
