import { describe, expect, it, beforeEach, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "../../utils/prisma-mock";

const {
  getServerSessionMock,
} = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(async () => true),
  },
}));
vi.mock("@/lib/totp-secrets", () => ({
  decryptTotpSecret: vi.fn(),
  encryptTotpSecret: vi.fn(),
  isEncryptedTotpSecret: vi.fn(),
}));
vi.mock("otplib", () => ({
  authenticator: {
    verify: vi.fn(),
    options: {},
  },
}));
vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

import { authOptions } from "@/lib/auth";
import { requireRoles } from "@/lib/requireRoles";
import bcrypt from "bcrypt";
import { decryptTotpSecret, isEncryptedTotpSecret } from "@/lib/totp-secrets";
import { authenticator } from "otplib";

describe("Customer Authentication", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
    vi.mocked(bcrypt.compare).mockResolvedValue(true);
    vi.mocked(decryptTotpSecret).mockReturnValue("secret");
    vi.mocked(isEncryptedTotpSecret).mockReturnValue(true);
    vi.mocked(authenticator.verify).mockReturnValue(true);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "customer@example.com",
      name: "Customer User",
      passwordHash: "hash",
      role: "SALJARE",
      totpSecret: "encrypted",
      totpEnabled: false,
      image: null,
    } as any);
  });

  it("successful login", async () => {
    const authorize = (authOptions.providers as any)[0].authorize;
    const result = await authorize({
      email: "customer@example.com",
      password: "password",
    });
    expect(result).toEqual({
      id: "user-123",
      name: "Customer User",
      email: "customer@example.com",
      image: null,
      role: "SALJARE",
      totpEnabled: false,
    });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "customer@example.com" },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith("password", "hash");
  });

  it("successful login with TOTP", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-456",
      email: "customer2@example.com",
      name: "Customer User 2",
      passwordHash: "hash2",
      role: "ADMIN",
      totpSecret: "encrypted",
      totpEnabled: true,
      image: null,
    } as any);
    const authorize = (authOptions.providers as any)[0].authorize;
    const result = await authorize({
      email: "customer2@example.com",
      password: "password",
      otp: "123456",
    });
    expect(result).toEqual({
      id: "user-456",
      name: "Customer User 2",
      email: "customer2@example.com",
      image: null,
      role: "ADMIN",
      totpEnabled: true,
    });
  });

  it("failed login - wrong password", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false);
    const authorize = (authOptions.providers as any)[0].authorize;
    const result = await authorize({
      email: "customer@example.com",
      password: "wrongpassword",
    });
    expect(result).toBe(null);
  });

  it("failed login - TOTP required but not provided", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-456",
      email: "customer2@example.com",
      name: "Customer User 2",
      passwordHash: "hash2",
      role: "ADMIN",
      totpSecret: "encrypted",
      totpEnabled: true,
      image: null,
    } as any);
    const authorize = (authOptions.providers as any)[0].authorize;
    try {
      await authorize({
        email: "customer2@example.com",
        password: "password",
      });
      throw new Error("Should have thrown MFA_REQUIRED");
    } catch (error: any) {
      expect(error.message).toBe("MFA_REQUIRED");
    }
  });

  it("failed login - invalid TOTP", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-456",
      email: "customer2@example.com",
      name: "Customer User 2",
      passwordHash: "hash2",
      role: "ADMIN",
      totpSecret: "encrypted",
      totpEnabled: true,
      image: null,
    } as any);
    vi.mocked(authenticator.verify).mockReturnValue(false);
    const authorize = (authOptions.providers as any)[0].authorize;
    try {
      await authorize({
        email: "customer2@example.com",
        password: "password",
        otp: "invalid",
      });
      throw new Error("Should have thrown INVALID_OTP");
    } catch (error: any) {
      expect(error.message).toBe("INVALID_OTP");
    }
  });

  it("failed login - user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = (authOptions.providers as any)[0].authorize;
    const result = await authorize({
      email: "notfound@example.com",
      password: "password",
    });
    expect(result).toBe(null);
  });

  it("role-based access control - allowed role", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "user-123",
        name: "Customer User",
        email: "customer@example.com",
        role: "SALJARE",
      },
    });
    const session = await requireRoles(["SALJARE", "ADMIN"]);
    expect(session.user.role).toBe("SALJARE");
  });

  it("role-based access control - denied role", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "user-123",
        name: "Customer User",
        email: "customer@example.com",
        role: "SALJARE",
      },
    });
    await expect(requireRoles(["ADMIN"])).rejects.toThrow();
  });
});