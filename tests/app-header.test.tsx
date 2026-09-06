/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppHeader } from "@/components/AppHeader";

describe("AppHeader", () => {
  it("keeps the current navigation items and anchors in the mobile menu", async () => {
    render(<AppHeader />);
    const trigger = screen.getByRole("button", { name: "打开导航菜单" });
    fireEvent.click(trigger);
    const menu = await screen.findByRole("navigation", { name: "移动端导航" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(menu.getAttribute("id")).toBe("mobile-header-menu");
    expect(within(menu).getByRole("link", { name: "功能" }).getAttribute("href")).toBe("#features");
    expect(within(menu).getByRole("link", { name: "适用人群" }).getAttribute("href")).toBe("#cases");
    expect(within(menu).getByRole("link", { name: "版本" }).getAttribute("href")).toBe("#pricing");
    expect(within(menu).getByRole("link", { name: "如何开始" }).getAttribute("href")).toBe("#help");
  });

  it("closes with Escape and restores focus to the trigger", async () => {
    render(<AppHeader />);
    const trigger = screen.getByRole("button", { name: "打开导航菜单" });
    fireEvent.click(trigger);
    await screen.findByRole("navigation", { name: "移动端导航" });
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("navigation", { name: "移动端导航" })).toBeNull();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(trigger.getAttribute("aria-label")).toBe("打开导航菜单");
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("traps Tab and Shift+Tab within the open mobile menu", async () => {
    render(<AppHeader />);
    const trigger = screen.getByRole("button", { name: "打开导航菜单" });
    fireEvent.click(trigger);
    const menu = await screen.findByRole("navigation", { name: "移动端导航" });
    const focusableItems = Array.from(menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
    const first = focusableItems[0];
    const last = focusableItems[focusableItems.length - 1];
    expect(document.activeElement).toBe(first);
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
