jest.mock("@/lib/domains", () => ({
  resolveDomain: jest.fn(),
  WORKSPACE_RESERVED_SLUGS: new Set([
    "products",
    "contact",
    "about",
    "employees",
    "ai",
  ]),
}));

import { NextRequest } from "next/server";
import { resolveDomain } from "@/lib/domains";
import { proxy } from "@/proxy";
import {
  WORKSPACE_ROUTING_HOST_HEADER,
  WORKSPACE_ROUTING_PROOF_HEADER,
  verifyWorkspaceRoutingProof,
} from "@/lib/workspace-routing-proof";

const mockResolveDomain = resolveDomain as jest.MockedFunction<typeof resolveDomain>;

describe("workspace proxy Host preservation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveDomain.mockResolvedValue({
      kind: "workspace",
      workspaceId: "workspace-1",
      workspaceSlug: "workspace-one",
    });
  });

  test.each([
    ["/", "/__w/workspace-1"],
    ["/products", "/__w/workspace-1/products"],
    ["/alice", "/__w/workspace-1/p/alice"],
  ])("preserves the verified Host while rewriting %s", async (pathname, targetPath) => {
    const request = new NextRequest(`http://localhost:3000${pathname}`, {
      headers: { host: "Brand.Example.COM:443" },
    });

    const response = await proxy(request);

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      `http://localhost:3000${targetPath}`,
    );
    const routedHost = response.headers.get(
      `x-middleware-request-${WORKSPACE_ROUTING_HOST_HEADER}`,
    );
    const proof = response.headers.get(
      `x-middleware-request-${WORKSPACE_ROUTING_PROOF_HEADER}`,
    );
    expect(routedHost).toBe("brand.example.com");
    expect(verifyWorkspaceRoutingProof("workspace-1", routedHost, proof)).toBe(true);
    expect(verifyWorkspaceRoutingProof("workspace-2", routedHost, proof)).toBe(false);
  });

  test("strips a forged routing proof on the platform Host", async () => {
    const request = new NextRequest("https://link168.me/__w/workspace-1", {
      headers: {
        host: "link168.me",
        [WORKSPACE_ROUTING_HOST_HEADER]: "brand.example.com",
        [WORKSPACE_ROUTING_PROOF_HEADER]: "forged",
      },
    });

    const response = await proxy(request);
    const overridden = response.headers.get("x-middleware-override-headers");

    expect(overridden).not.toBeNull();
    expect(overridden).not.toContain(WORKSPACE_ROUTING_HOST_HEADER);
    expect(overridden).not.toContain(WORKSPACE_ROUTING_PROOF_HEADER);
    expect(
      response.headers.get(`x-middleware-request-${WORKSPACE_ROUTING_HOST_HEADER}`),
    ).toBeNull();
    expect(
      response.headers.get(`x-middleware-request-${WORKSPACE_ROUTING_PROOF_HEADER}`),
    ).toBeNull();
    expect(mockResolveDomain).not.toHaveBeenCalled();
  });

  test("treats the configured testnet Host as a platform entry", async () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://testnet.example.com";

    try {
      const request = new NextRequest("https://testnet.example.com/console", {
        headers: { host: "testnet.example.com" },
      });

      const response = await proxy(request);

      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(mockResolveDomain).not.toHaveBeenCalled();
    } finally {
      if (previousAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
      }
    }
  });

  test("preserves a valid proof across the internal rewrite pass", async () => {
    const firstRequest = new NextRequest("http://localhost:3000/", {
      headers: { host: "brand.example.com" },
    });
    const firstResponse = await proxy(firstRequest);
    const routedHost = firstResponse.headers.get(
      `x-middleware-request-${WORKSPACE_ROUTING_HOST_HEADER}`,
    );
    const proof = firstResponse.headers.get(
      `x-middleware-request-${WORKSPACE_ROUTING_PROOF_HEADER}`,
    );
    jest.clearAllMocks();

    const internalRequest = new NextRequest(
      "http://localhost:3000/__w/workspace-1",
      {
        headers: {
          host: "localhost:3000",
          [WORKSPACE_ROUTING_HOST_HEADER]: routedHost || "",
          [WORKSPACE_ROUTING_PROOF_HEADER]: proof || "",
        },
      },
    );
    const internalResponse = await proxy(internalRequest);

    expect(internalResponse.headers.get("x-middleware-rewrite")).toBeNull();
    expect(
      internalResponse.headers.get(
        `x-middleware-request-${WORKSPACE_ROUTING_HOST_HEADER}`,
      ),
    ).toBe("brand.example.com");
    expect(mockResolveDomain).not.toHaveBeenCalled();
  });
});
