/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import JeepworkLoginPage from "@/app/jeepwork/login/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

test("Jeepwork login exposes the password recovery entry", () => {
  render(<JeepworkLoginPage />);

  expect(
    screen.getByRole("link", { name: "忘记管理员密码？" }),
  ).toHaveAttribute("href", "/forgot-password");
});
