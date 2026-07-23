/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearancePanel } from "@/components/dashboard-v1/AppearancePanel";

function makeProps() {
  return {
    theme: "自然绿",
    template: "business",
    customThemes: [] as string[],
    customTheme: null,
    isPublic: true,
    language: "zh",
    contactVisibility: "public",
    saving: false,
    onSave: jest.fn(async () => true),
    onSaveCustom: jest.fn(async () => true),
    onSaveSystem: jest.fn(async () => true),
    onPreviewChange: jest.fn(),
    onUpgrade: jest.fn(),
  };
}

test("custom controls update preview and save exact values", async () => {
  const user = userEvent.setup();
  const props = makeProps();
  render(<AppearancePanel {...props} />);

  await user.click(screen.getByRole("button", { name: "自定义" }));
  const opacity = screen.getByRole("slider", { name: "卡片透明度" });
  opacity.focus();
  await user.keyboard("{ArrowLeft}");
  fireEvent.change(opacity, { target: { value: "99" } });

  expect(props.onPreviewChange).toHaveBeenCalled();
  const preview = props.onPreviewChange.mock.calls.at(-1)?.[0];
  expect(JSON.parse(preview.customTheme)).toMatchObject({ cardOpacity: 99 });
  expect(screen.getByRole("button", { name: "晨雾森林" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "晨雾森林" }));
  await user.click(screen.getByRole("radio", { name: "企业标志" }));
  await user.click(screen.getByRole("button", { name: "保存自定义主题" }));

  expect(props.onSaveCustom).toHaveBeenCalledWith(expect.objectContaining({
    backgroundType: "image",
    backgroundValue: "/wallpapers/mist-forest.webp",
    cardOpacity: 99,
    avatarMode: "logo",
  }));
});

test("public switch keeps the saved state when persistence fails", async () => {
  const user = userEvent.setup();
  const props = makeProps();
  props.onSaveSystem.mockResolvedValueOnce(false);
  render(<AppearancePanel {...props} />);

  await user.click(screen.getByRole("button", { name: "系统设置" }));
  const publicSwitch = screen.getByRole("switch", { name: "公开主页" });
  await user.click(publicSwitch);
  expect(publicSwitch).not.toBeChecked();

  await user.click(screen.getByRole("button", { name: "保存设置" }));
  expect(props.onSaveSystem).toHaveBeenCalledWith({
    isPublic: false,
    language: "zh",
    contactVisibility: "public",
  });
  expect(screen.getByRole("switch", { name: "公开主页" })).toBeChecked();
});

test("saving disables the whole panel until a deferred persistence request settles", async () => {
  let resolveSave: (saved: boolean) => void = () => undefined;
  const pendingSave = new Promise<boolean>((resolve) => { resolveSave = resolve; });
  const props = makeProps();
  props.onSaveSystem.mockReturnValueOnce(pendingSave);
  const user = userEvent.setup();
  const view = render(<AppearancePanel {...props} />);

  await user.click(screen.getByRole("button", { name: "系统设置" }));
  const publicSwitch = screen.getByRole("switch", { name: "公开主页" });
  await user.click(publicSwitch);
  await user.click(screen.getByRole("button", { name: "保存设置" }));

  view.rerender(<AppearancePanel {...props} saving />);
  expect(publicSwitch).toBeDisabled();
  expect(screen.getByRole("button", { name: "自定义" })).toBeDisabled();

  await user.click(publicSwitch);
  await user.click(screen.getByRole("button", { name: "自定义" }));
  expect(publicSwitch).not.toBeChecked();
  expect(screen.getByRole("heading", { name: "系统设置" })).toBeInTheDocument();

  resolveSave(false);
  await waitFor(() => expect(screen.getByRole("switch", { name: "公开主页" })).toBeChecked());
});
