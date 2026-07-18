import { buildPublicProfileMetadata } from "@/lib/seo/public-profile";

const baseInput = {
  username: "private-user",
  displayName: "未发布姓名",
  bio: "未发布业务简介",
  avatarUrl: "https://example.test/private-avatar.png",
  updatedAt: new Date("2026-07-18T00:00:00.000Z"),
  pageUrl: "https://link168.me/private-user",
  appUrl: "https://link168.me",
};

describe("public-profile metadata publication consent", () => {
  it("does not leak profile content when the owner has not published", () => {
    const metadata = buildPublicProfileMetadata({
      ...baseInput,
      isPublic: false,
      isIndexable: false,
    });
    const serialized = JSON.stringify(metadata);

    expect(metadata.title).toBe("@private-user");
    expect(serialized).not.toContain(baseInput.displayName);
    expect(serialized).not.toContain(baseInput.bio);
    expect(serialized).not.toContain(baseInput.avatarUrl);
  });

  it("does not leak profile content while a published profile is access-restricted", () => {
    const metadata = buildPublicProfileMetadata({
      ...baseInput,
      isPublic: true,
      isIndexable: false,
    });
    const serialized = JSON.stringify(metadata);

    expect(metadata.title).toBe("@private-user");
    expect(serialized).not.toContain(baseInput.displayName);
    expect(serialized).not.toContain(baseInput.bio);
    expect(serialized).not.toContain(baseInput.avatarUrl);
  });

  it("uses saved profile content only after publication and visibility checks pass", () => {
    const metadata = buildPublicProfileMetadata({
      ...baseInput,
      isPublic: true,
      isIndexable: true,
    });
    const serialized = JSON.stringify(metadata);

    expect(metadata.title).toBe(baseInput.displayName);
    expect(serialized).toContain(baseInput.bio);
    expect(serialized).toContain(baseInput.avatarUrl);
  });
});
