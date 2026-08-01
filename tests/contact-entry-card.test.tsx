/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContactEntryCard, ContactEntryDialog } from "@/components/share/ContactEntryCard";
import ContactEntriesClient from "@/components/console/ContactEntriesClient";

const teamEntry = {
  id: "11111111-1111-4111-8111-111111111111",
  profileId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  title: "销售顾问",
  description: "工作日在线回复",
  targetUrl: "https://work.weixin.qq.com/ca/example",
  payload: JSON.stringify({ version: 1, channel: "wecom", targetUrl: "https://work.weixin.qq.com/ca/example" }),
  isActive: true,
  position: 0,
};

afterEach(() => {
  jest.restoreAllMocks();
  delete (global as { fetch?: unknown }).fetch;
});

test("the AI handoff dialog preserves an explicit verified team host", () => {
  render(<ContactEntryDialog entry={teamEntry} publicBaseUrl="https://team.example.com" onClose={() => undefined} />);

  expect(screen.getByRole("dialog").querySelector("a")).toHaveAttribute(
    "href",
    "https://team.example.com/connect/11111111-1111-4111-8111-111111111111",
  );
});

test("team card does not create a QR code or direct link before host verification", () => {
  render(<ContactEntryCard entry={teamEntry} publicBaseUrl={null} />);

  expect(screen.getByText("等待团队域名验证")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "直接添加企业微信" })).not.toBeInTheDocument();
  expect(screen.queryByRole("img", { name: "扫描二维码添加企业微信" })).not.toBeInTheDocument();
});

test("team card builds its direct link from the verified team host", () => {
  render(<ContactEntryCard entry={teamEntry} publicBaseUrl="https://team.example.com" />);

  expect(screen.getByRole("link", { name: "直接添加企业微信" }))
    .toHaveAttribute("href", "https://team.example.com/connect/11111111-1111-4111-8111-111111111111");
  expect(screen.getByRole("img", { name: "扫描二维码添加企业微信" })).toBeInTheDocument();
});

test("team console ignores a delayed domain response from the previously selected workspace", async () => {
  const secondWorkspaceId = "55555555-5555-4555-8555-555555555555";
  const secondEntry = { ...teamEntry, id: "66666666-6666-4666-8666-666666666666", workspaceId: secondWorkspaceId, title: "Second entry" };
  let resolveFirstDomains: (value: Response) => void = () => undefined;
  const firstDomains = new Promise<Response>((resolve) => { resolveFirstDomains = resolve; });
  const fetchMock = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/contact-entries") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          personalEntries: [],
          teamEntries: [teamEntry, secondEntry],
          workspaces: [
            { id: teamEntry.workspaceId, name: "First", workspaceType: "team", role: "admin", status: "active", publicHost: "first.example.com", publicHostStatus: "verified" },
            { id: secondWorkspaceId, name: "Second", workspaceType: "team", role: "admin", status: "active", publicHost: null, publicHostStatus: "missing" },
          ],
        }),
      } as Response);
    }
    if (url.includes(`/api/dashboard/domains?workspaceId=${teamEntry.workspaceId}`)) return firstDomains;
    if (url.includes(`/api/dashboard/domains?workspaceId=${secondWorkspaceId}`)) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, domains: [] }) } as Response);
    }
    if (url.includes("/leads?assignment=unclaimed")) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, leads: [] }) } as Response);
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  Object.defineProperty(global, "fetch", { configurable: true, value: fetchMock });

  render(<ContactEntriesClient />);
  await screen.findByRole("combobox");
  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes(`workspaceId=${teamEntry.workspaceId}`))).toBe(true);
  });

  fireEvent.change(screen.getByRole("combobox"), { target: { value: secondWorkspaceId } });
  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes(`workspaceId=${secondWorkspaceId}`))).toBe(true);
  });
  resolveFirstDomains({
    ok: true,
    json: async () => ({ success: true, domains: [{ id: "old-domain", domain: "first.example.com", domainType: "custom", status: "verified", cnameTarget: "token.cname.link168.me" }] }),
  } as Response);

  await waitFor(() => {
    expect(screen.getByRole("combobox")).toHaveValue(secondWorkspaceId);
    expect(document.querySelector('a[href*="/connect/"]')).toBeNull();
  });
});

test("team console updates the preview when an entry is selected", async () => {
  const secondEntry = { ...teamEntry, id: "44444444-4444-4444-8444-444444444444", title: "售后顾问" };
  const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/contact-entries") {
      return {
        ok: true,
        json: async () => ({
          success: true,
          personalEntries: [],
          teamEntries: [teamEntry, secondEntry],
          workspaces: [{
            id: teamEntry.workspaceId,
            name: "Link168 团队",
            workspaceType: "team",
            role: "admin",
            status: "active",
            publicHost: "team.example.com",
            publicHostStatus: "verified",
          }],
        }),
      } as Response;
    }
    if (url.includes("/api/dashboard/domains")) {
      return {
        ok: true,
        json: async () => ({ success: true, domains: [{ id: "domain-1", domain: "team.example.com", domainType: "custom", status: "verified", cnameTarget: "token.cname.link168.me" }] }),
      } as Response;
    }
    if (url.includes("/leads?assignment=unclaimed")) {
      return { ok: true, json: async () => ({ success: true, leads: [] }) } as Response;
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  Object.defineProperty(global, "fetch", { configurable: true, value: fetchMock });

  render(<ContactEntriesClient />);

  await screen.findByText("实时分享预览");
  const entryButton = screen.getByText("售后顾问").closest("button");
  expect(entryButton).not.toBeNull();
  fireEvent.click(entryButton!);

  await waitFor(() => {
    expect(screen.getByRole("link", { name: "直接添加企业微信" }))
      .toHaveAttribute("href", "https://team.example.com/connect/44444444-4444-4444-8444-444444444444");
  });
});
