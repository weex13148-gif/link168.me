/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { SharePageRenderer } from "@/components/share/SharePageRenderer";

const identity = {
  profileId: "00000000-0000-0000-0000-000000000001",
  username: "owner",
  displayName: "林溪",
  bio: "帮助本地商家把咨询变成可跟进的客户线索",
  avatarUrl: null,
  company: "林溪经营工作室",
  jobTitle: "经营顾问",
  links: [],
};

test("public mode hides empty modules and internal test usernames", () => {
  render(<SharePageRenderer {...identity} renderMode="public" />);
  expect(screen.queryByText("暂无公开内容")).not.toBeInTheDocument();
  expect(screen.queryByText("@owner")).not.toBeInTheDocument();
  expect(screen.getByText("经营顾问 · 林溪经营工作室")).toBeInTheDocument();
});

test("preview mode exposes the owner editing hint", () => {
  render(<SharePageRenderer {...identity} renderMode="preview" />);
  expect(screen.getByText("添加服务、案例或咨询组件")).toBeInTheDocument();
});

test("logo mode does not crop a wide brand mark", () => {
  render(
    <SharePageRenderer
      {...identity}
      avatarUrl="/brand.webp"
      customTheme={JSON.stringify({ avatarMode: "logo" })}
      renderMode="public"
    />,
  );
  expect(screen.getByRole("img", { name: "林溪 的企业标志" })).toHaveClass("object-contain");
});

test("a failed avatar is retried when its URL or display mode changes", () => {
  const view = render(
    <SharePageRenderer {...identity} avatarUrl="/broken.webp" customTheme={JSON.stringify({ avatarMode: "portrait" })} renderMode="public" />,
  );
  fireEvent.error(screen.getByRole("img", { name: "林溪 的头像" }));
  expect(screen.queryByRole("img", { name: "林溪 的头像" })).not.toBeInTheDocument();

  view.rerender(
    <SharePageRenderer {...identity} avatarUrl="/broken.webp" customTheme={JSON.stringify({ avatarMode: "logo" })} renderMode="public" />,
  );
  fireEvent.error(screen.getByRole("img", { name: "林溪 的企业标志" }));
  expect(screen.queryByRole("img", { name: "林溪 的企业标志" })).not.toBeInTheDocument();

  view.rerender(
    <SharePageRenderer {...identity} avatarUrl="/replacement.webp" customTheme={JSON.stringify({ avatarMode: "logo" })} renderMode="public" />,
  );
  expect(screen.getByRole("img", { name: "林溪 的企业标志" })).toHaveAttribute("src", "/replacement.webp");

  view.rerender(
    <SharePageRenderer {...identity} avatarUrl="/broken.webp" customTheme={JSON.stringify({ avatarMode: "logo" })} renderMode="public" />,
  );
  expect(screen.getByRole("img", { name: "林溪 的企业标志" })).toHaveAttribute("src", "/broken.webp");
});

test.each([
  ["circle", "rounded-full"],
  ["square", "rounded-none"],
  ["rounded", "rounded-2xl"],
  ["ring", "ring-4"],
] as const)("portrait avatarFrame %s maps to %s", (avatarFrame, expectedClass) => {
  render(
    <SharePageRenderer {...identity} avatarUrl="/portrait.webp" customTheme={JSON.stringify({ avatarFrame })} renderMode="public" />,
  );
  expect(screen.getByRole("img", { name: "林溪 的头像" })).toHaveClass(expectedClass);
});

test("the shared renderer consumes text, card, and button theme contracts", () => {
  const { container } = render(
    <SharePageRenderer
      {...identity}
      contactVisibility="public"
      links={[{ id: "text", title: "经营说明", componentType: "text", description: "正文" }]}
      customTheme={JSON.stringify({
        textColor: "#123456",
        cardStyle: "glass",
        cardOpacity: 55,
        buttonStyle: "outline",
        buttonRadius: 5,
      })}
      renderMode="public"
    />,
  );
  const root = container.querySelector<HTMLElement>("[data-profile-template]")!;
  expect(root.dataset.profileCardStyle).toBe("glass");
  expect(root.dataset.profileButtonStyle).toBe("outline");
  expect(root.style.getPropertyValue("--profile-text-color")).toBe("#123456");
  expect(root.style.getPropertyValue("--profile-card-backdrop")).toBe("blur(14px)");
  expect(root.style.getPropertyValue("--profile-button-background")).toBe("transparent");
  expect(root.style.getPropertyValue("--profile-button-radius")).toBe("5px");
  expect(container.querySelector("[data-public-profile-identity]")).toHaveStyle({ color: "#123456" });
  expect(container.querySelector("[data-public-module-surface]")?.getAttribute("style")).toContain("var(--profile-card-background");
  expect(container.querySelector("[data-public-button]")?.getAttribute("style")).toContain("var(--profile-button-background");
});

test.each([
  ["solid", "rgb(255 253 248 / var(--profile-card-opacity, 1))", "none"],
  ["glass", "rgb(255 253 248 / var(--profile-card-opacity, 1))", "blur(14px)"],
  ["outline", "transparent", "none"],
] as const)("cardStyle %s maps to the shared module surface", (cardStyle, expectedBackground, expectedBackdrop) => {
  const { container } = render(
    <SharePageRenderer
      {...identity}
      links={[{ id: "text", title: "经营说明", componentType: "text" }]}
      customTheme={JSON.stringify({ cardStyle })}
      renderMode="public"
    />,
  );
  const root = container.querySelector<HTMLElement>("[data-profile-template]")!;
  expect(root.style.getPropertyValue("--profile-card-background")).toBe(expectedBackground);
  expect(root.style.getPropertyValue("--profile-card-backdrop")).toBe(expectedBackdrop);
  expect(container.querySelector("[data-public-module-surface]")?.getAttribute("style")).toContain("var(--profile-card-background");
});

test.each([
  ["solid", "#31543D"],
  ["outline", "transparent"],
  ["soft", "rgb(49 84 61 / 0.12)"],
] as const)("buttonStyle %s maps to a public button surface", (buttonStyle, expectedBackground) => {
  const { container } = render(
    <SharePageRenderer {...identity} customTheme={JSON.stringify({ buttonStyle })} renderMode="public" />,
  );
  const root = container.querySelector<HTMLElement>("[data-profile-template]")!;
  expect(root.style.getPropertyValue("--profile-button-background")).toBe(expectedBackground);
  expect(container.querySelector("[data-public-button]")?.getAttribute("style")).toContain("var(--profile-button-background");
});

test("contact privacy hides direct fields while vCard remains available", () => {
  render(
    <SharePageRenderer
      {...identity}
      phone="13800138000"
      email="owner@example.com"
      wechat="owner-wechat"
      contactVisibility="private"
      renderMode="public"
    />,
  );
  expect(screen.queryByRole("link", { name: /13800138000/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /owner@example.com/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/owner-wechat/)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "保存到通讯录" })).toHaveAttribute(
    "href",
    "/api/public/owner/vcard",
  );
});

test("module order is preserved and zero gap remains explicit", () => {
  const { container } = render(
    <SharePageRenderer
      {...identity}
      links={[
        { id: "first", title: "第一个", componentType: "text", description: "一" },
        { id: "second", title: "第二个", componentType: "text", description: "二" },
      ]}
      customTheme={JSON.stringify({ moduleGap: 0, cardOpacity: 40, buttonRadius: 6 })}
      renderMode="public"
    />,
  );
  const modules = container.querySelector("[data-public-module-list]");
  expect(modules).toHaveStyle({ gap: "0px" });
  const legacySurface = modules?.querySelector("[data-public-module-surface]");
  expect(legacySurface?.getAttribute("style")).toContain("var(--profile-card-opacity");
  expect(legacySurface?.getAttribute("style")).toContain("var(--profile-button-radius");
  expect(container.querySelector("[data-profile-template]")).toHaveStyle({
    "--profile-card-opacity": "0.4",
    "--profile-button-radius": "6px",
  });
  const text = modules?.textContent || "";
  expect(text.indexOf("第一个")).toBeLessThan(text.indexOf("第二个"));
});

test("new business cards consume the shared surface opacity and radius", () => {
  const { container } = render(
    <SharePageRenderer
      {...identity}
      links={[{
        id: "product",
        title: "经营诊断",
        componentType: "product-card",
        payload: JSON.stringify({ name: "经营诊断", description: "梳理获客路径" }),
      }]}
      customTheme={JSON.stringify({ cardOpacity: 35, buttonRadius: 9 })}
      renderMode="public"
    />,
  );
  const productSurface = container.querySelector("[data-public-module-surface]");
  expect(productSurface).not.toBeNull();
  expect(productSurface?.getAttribute("style")).toContain("var(--profile-card-opacity");
  expect(productSurface?.getAttribute("style")).toContain("var(--profile-button-radius");
  expect(container.querySelector("[data-profile-template]")).toHaveStyle({
    "--profile-card-opacity": "0.35",
    "--profile-button-radius": "9px",
  });
});
