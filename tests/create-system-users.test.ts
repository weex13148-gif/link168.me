const {
  assertStrongBootstrapPassword,
  assertValidBootstrapEmail,
  upsertUser,
} = require("../scripts/db/create-system-users.js") as {
  assertStrongBootstrapPassword: (password: string) => void;
  assertValidBootstrapEmail: (email: string) => void;
  upsertUser: (prisma: unknown, spec: unknown) => Promise<boolean>;
};

const spec = {
  role: "super_admin",
  emailEnv: "SUPER_ADMIN_EMAIL",
  passwordEnv: "SUPER_ADMIN_PASSWORD",
  isSystem: true,
  bio: "system",
};

describe("super-admin bootstrap credential policy", () => {
  test.each(["@", "admin@", "admin.example.com", "admin @example.com"])(
    "rejects invalid email %s",
    (email) => {
      expect(() => assertValidBootstrapEmail(email)).toThrow("SUPER_ADMIN_EMAIL");
    },
  );

  test.each([
    "x",
    "replace-with-strong-password",
    "superadmin-password-1234",
    "onlylowercaseletterslong",
  ])("rejects weak password %s", (password) => {
    expect(() => assertStrongBootstrapPassword(password)).toThrow(
      "SUPER_ADMIN_PASSWORD",
    );
  });

  test("accepts an explicit strong bootstrap password", () => {
    expect(() => assertStrongBootstrapPassword("Link168@Testnet#2026")).not.toThrow();
  });

  describe("existing-account boundary", () => {
    const originalEmail = process.env.SUPER_ADMIN_EMAIL;
    const originalPassword = process.env.SUPER_ADMIN_PASSWORD;

    beforeEach(() => {
      process.env.SUPER_ADMIN_EMAIL = "ops@example.com";
      process.env.SUPER_ADMIN_PASSWORD = "Link168@Testnet#2026";
    });

    afterEach(() => {
      if (originalEmail === undefined) delete process.env.SUPER_ADMIN_EMAIL;
      else process.env.SUPER_ADMIN_EMAIL = originalEmail;
      if (originalPassword === undefined) delete process.env.SUPER_ADMIN_PASSWORD;
      else process.env.SUPER_ADMIN_PASSWORD = originalPassword;
    });

    test("refuses to promote an ordinary existing user", async () => {
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: "ordinary-user",
            role: "user",
            isSystem: false,
          }),
          update: jest.fn(),
        },
        session: { deleteMany: jest.fn() },
        $transaction: jest.fn(),
      };

      await expect(upsertUser(prisma, spec)).rejects.toThrow("拒绝将其提升");
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    test("rotates an existing system account and revokes sessions atomically", async () => {
      const update = jest.fn().mockResolvedValue({ id: "system-user" });
      const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: "system-user",
            role: "super_admin",
            isSystem: true,
          }),
          update,
        },
        session: { deleteMany },
        $transaction: jest.fn(async (callback: (tx: unknown) => Promise<void>) =>
          callback({ user: { update }, session: { deleteMany } }),
        ),
      };

      await expect(upsertUser(prisma, spec)).resolves.toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "system-user" },
          data: expect.objectContaining({
            role: "super_admin",
            isSystem: true,
            emailVerified: true,
            accountStatus: "active",
            passwordHash: expect.any(String),
          }),
        }),
      );
      expect(deleteMany).toHaveBeenCalledWith({ where: { userId: "system-user" } });
    });
  });
});
