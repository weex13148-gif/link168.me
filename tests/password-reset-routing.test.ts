const mockRateLimit = jest.fn();
const mockValidatePasswordResetToken = jest.fn();
const mockConsumePasswordResetToken = jest.fn();
const mockHash = jest.fn();
const mockUserUpdate = jest.fn();
const mockSessionDeleteMany = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
}));

jest.mock("@/lib/auth", () => ({
  validatePasswordResetToken: mockValidatePasswordResetToken,
  consumePasswordResetToken: mockConsumePasswordResetToken,
}));

jest.mock("@/lib/db", () => ({
  db: {
    user: { update: mockUserUpdate },
    session: { deleteMany: mockSessionDeleteMany },
    $transaction: mockTransaction,
  },
}));

jest.mock("bcrypt", () => ({
  __esModule: true,
  default: { hash: mockHash },
}));

import { POST } from "@/app/api/auth/reset-password/route";

function makeRequest() {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "valid-reset-token",
      password: "new-password-123",
      confirmPassword: "new-password-123",
    }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRateLimit.mockResolvedValue({ passed: true });
  mockHash.mockResolvedValue("new-password-hash");
  mockUserUpdate.mockResolvedValue({});
  mockSessionDeleteMany.mockResolvedValue({ count: 1 });
  mockTransaction.mockResolvedValue([]);
  mockConsumePasswordResetToken.mockResolvedValue(undefined);
});

test("super admin password reset returns the Jeepwork login destination", async () => {
  mockValidatePasswordResetToken.mockResolvedValue({
    id: "super-admin-1",
    email: "owner@example.com",
    role: "super_admin",
  });

  const response = await POST(makeRequest());
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toMatchObject({
    success: true,
    redirectTo: "/jeepwork/login?passwordReset=success",
  });
  expect(mockSessionDeleteMany).toHaveBeenCalledWith({
    where: { userId: "super-admin-1" },
  });
  expect(mockConsumePasswordResetToken).toHaveBeenCalledWith("valid-reset-token");
});

test("regular user password reset keeps the normal login destination", async () => {
  mockValidatePasswordResetToken.mockResolvedValue({
    id: "user-1",
    email: "user@example.com",
    role: "user",
  });

  const response = await POST(makeRequest());
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toMatchObject({
    success: true,
    redirectTo: "/login?passwordReset=success",
  });
});
