import {
  ALL_COMPONENT_TYPES,
  FREE_COMPONENT_TYPES,
  PAID_COMPONENT_TYPES,
  isFreeComponentType,
  validateComponentType,
  LEAD_STATUS_MAP,
  OLD_LEAD_STATUS_MAP,
  normalizeLeadStatus,
  ALL_LEAD_SOURCES,
  validateLeadSource,
  ALL_MEDIA_PURPOSES,
  validateMediaPurpose,
  ALL_ICON_TYPES,
  validateIconType,
} from "../src/lib/contracts";

describe("Component Type Contracts", () => {
  it("should have all required component types", () => {
    expect(ALL_COMPONENT_TYPES).toContain("link");
    expect(ALL_COMPONENT_TYPES).toContain("text");
    expect(ALL_COMPONENT_TYPES).toContain("group-title");
    expect(ALL_COMPONENT_TYPES).toContain("qr");
    expect(ALL_COMPONENT_TYPES).toContain("wechat");
    expect(ALL_COMPONENT_TYPES).toContain("phone");
    expect(ALL_COMPONENT_TYPES).toContain("email");
    expect(ALL_COMPONENT_TYPES).toContain("address");
    expect(ALL_COMPONENT_TYPES).toContain("product-card");
    expect(ALL_COMPONENT_TYPES).toContain("service-card");
    expect(ALL_COMPONENT_TYPES).toContain("offer");
    expect(ALL_COMPONENT_TYPES).toContain("booking");
    expect(ALL_COMPONENT_TYPES).toContain("quote");
    expect(ALL_COMPONENT_TYPES).toContain("contact-form");
    expect(ALL_COMPONENT_TYPES).toContain("map");
    expect(ALL_COMPONENT_TYPES).toContain("copy-text");
    expect(ALL_COMPONENT_TYPES).toContain("cover-image");
    expect(ALL_COMPONENT_TYPES).toContain("popup-image");
    expect(ALL_COMPONENT_TYPES).toContain("carousel");
    expect(ALL_COMPONENT_TYPES).toContain("ai-chat");
  });

  it("should mark correct components as free", () => {
    expect(FREE_COMPONENT_TYPES).toContain("product-card");
    expect(FREE_COMPONENT_TYPES).toContain("service-card");
    expect(FREE_COMPONENT_TYPES).toContain("offer");
    expect(FREE_COMPONENT_TYPES).toContain("booking");
    expect(FREE_COMPONENT_TYPES).toContain("quote");
    expect(FREE_COMPONENT_TYPES).toContain("contact-form");
  });

  it("should mark media and AI components as paid", () => {
    expect(PAID_COMPONENT_TYPES).toContain("cover-image");
    expect(PAID_COMPONENT_TYPES).toContain("popup-image");
    expect(PAID_COMPONENT_TYPES).toContain("carousel");
    expect(PAID_COMPONENT_TYPES).toContain("ai-chat");
  });

  it("should correctly identify free component types", () => {
    expect(isFreeComponentType("product-card")).toBe(true);
    expect(isFreeComponentType("service-card")).toBe(true);
    expect(isFreeComponentType("offer")).toBe(true);
    expect(isFreeComponentType("booking")).toBe(true);
    expect(isFreeComponentType("quote")).toBe(true);
    expect(isFreeComponentType("contact-form")).toBe(true);
    expect(isFreeComponentType("ai-chat")).toBe(false);
    expect(isFreeComponentType("carousel")).toBe(false);
  });

  it("should validate component types", () => {
    expect(validateComponentType("product-card")).toBe(true);
    expect(validateComponentType("invalid-type")).toBe(false);
  });
});

describe("Lead Status Contracts", () => {
  it("should have correct status map", () => {
    expect(LEAD_STATUS_MAP["new"]).toBe("新线索");
    expect(LEAD_STATUS_MAP["viewed"]).toBe("已查看");
    expect(LEAD_STATUS_MAP["following_up"]).toBe("跟进中");
    expect(LEAD_STATUS_MAP["won"]).toBe("已成交");
    expect(LEAD_STATUS_MAP["closed"]).toBe("已关闭");
  });

  it("should have correct old status mapping", () => {
    expect(OLD_LEAD_STATUS_MAP["contacted"]).toBe("viewed");
    expect(OLD_LEAD_STATUS_MAP["following"]).toBe("following_up");
    expect(OLD_LEAD_STATUS_MAP["converted"]).toBe("won");
    expect(OLD_LEAD_STATUS_MAP["qualified"]).toBe("following_up");
    expect(OLD_LEAD_STATUS_MAP["lost"]).toBe("closed");
  });

  it("should normalize lead status correctly", () => {
    expect(normalizeLeadStatus("new")).toBe("new");
    expect(normalizeLeadStatus("contacted")).toBe("viewed");
    expect(normalizeLeadStatus("following")).toBe("following_up");
    expect(normalizeLeadStatus("converted")).toBe("won");
    expect(normalizeLeadStatus("qualified")).toBe("following_up");
    expect(normalizeLeadStatus("lost")).toBe("closed");
    expect(normalizeLeadStatus("unknown")).toBe("new");
  });
});

describe("Lead Source Contracts", () => {
  it("should have all required lead sources", () => {
    expect(ALL_LEAD_SOURCES).toContain("product_card");
    expect(ALL_LEAD_SOURCES).toContain("service_card");
    expect(ALL_LEAD_SOURCES).toContain("booking");
    expect(ALL_LEAD_SOURCES).toContain("offer");
    expect(ALL_LEAD_SOURCES).toContain("quote");
    expect(ALL_LEAD_SOURCES).toContain("contact_form");
    expect(ALL_LEAD_SOURCES).toContain("ai_chat");
    expect(ALL_LEAD_SOURCES).toContain("human_handoff");
    expect(ALL_LEAD_SOURCES).toContain("direct");
  });

  it("should validate lead sources", () => {
    expect(validateLeadSource("product_card")).toBe(true);
    expect(validateLeadSource("invalid_source")).toBe(false);
  });
});

describe("Media Purpose Contracts", () => {
  it("should have all required media purposes", () => {
    expect(ALL_MEDIA_PURPOSES).toContain("avatar");
    expect(ALL_MEDIA_PURPOSES).toContain("background");
    expect(ALL_MEDIA_PURPOSES).toContain("cover");
    expect(ALL_MEDIA_PURPOSES).toContain("carousel");
    expect(ALL_MEDIA_PURPOSES).toContain("popup");
    expect(ALL_MEDIA_PURPOSES).toContain("product_cover");
    expect(ALL_MEDIA_PURPOSES).toContain("service_cover");
    expect(ALL_MEDIA_PURPOSES).toContain("enterprise_logo");
    expect(ALL_MEDIA_PURPOSES).toContain("enterprise_public_image");
    expect(ALL_MEDIA_PURPOSES).toContain("custom_link_icon");
  });

  it("should validate media purposes", () => {
    expect(validateMediaPurpose("avatar")).toBe(true);
    expect(validateMediaPurpose("invalid_purpose")).toBe(false);
  });
});

describe("Icon Type Contracts", () => {
  it("should have all required icon types", () => {
    expect(ALL_ICON_TYPES).toContain("default");
    expect(ALL_ICON_TYPES).toContain("emoji");
    expect(ALL_ICON_TYPES).toContain("custom");
    expect(ALL_ICON_TYPES).toContain("favicon");
    expect(ALL_ICON_TYPES).toContain("platform");
  });

  it("should validate icon types", () => {
    expect(validateIconType("platform")).toBe(true);
    expect(validateIconType("invalid_icon")).toBe(false);
  });
});
