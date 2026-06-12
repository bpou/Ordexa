import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { authenticator } from "otplib";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  isEncryptedTotpSecret,
} from "@/lib/totp-secrets";

authenticator.options = { window: 1 };

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Email & Losenord",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Losenord", type: "password" },
        otp: { label: "Engangskod", type: "text" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;

        const email = creds.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
          console.warn("[auth] Credentials rejected: user or password hash missing", { email });
          return null;
        }

        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) {
          console.warn("[auth] Credentials rejected: password mismatch", { email });
          return null;
        }

        let totpSecret: string | null = null;
        try {
          totpSecret = decryptTotpSecret(user.totpSecret);
        } catch (error) {
          console.error("Failed to decrypt stored TOTP secret", error);
          throw new Error("MFA_UNAVAILABLE");
        }

        if (user.totpSecret && !isEncryptedTotpSecret(user.totpSecret) && totpSecret) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { totpSecret: encryptTotpSecret(totpSecret) },
            });
          } catch (error) {
            console.error("Failed to re-encrypt TOTP secret during login", error);
            throw new Error("MFA_UNAVAILABLE");
          }
        }

        const requiresTotp = Boolean(user.totpEnabled && totpSecret);
        const otp = typeof creds.otp === "string" ? creds.otp.trim() : "";

        if (requiresTotp) {
          if (!otp) {
            console.warn("[auth] Credentials rejected: MFA required", { email });
            throw new Error("MFA_REQUIRED");
          }
          const otpValid = authenticator.verify({ token: otp, secret: totpSecret! });
          if (!otpValid) {
            console.warn("[auth] Credentials rejected: invalid MFA code", { email });
            throw new Error("INVALID_OTP");
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          totpEnabled: user.totpEnabled,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.role = (user as any).role as Role;
        token.picture = (user as any).image ?? null;
        (token as any).mfaEnabled = Boolean((user as any).totpEnabled);
        return token;
      }

      const tokenUserId = ((token as any).uid as string | undefined) ?? token.sub;
      if (tokenUserId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: tokenUserId },
          select: { role: true, totpEnabled: true, image: true, name: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.picture = dbUser.image ?? null;
          token.name = dbUser.name ?? token.name;
          (token as any).mfaEnabled = dbUser.totpEnabled;
        }
      }

      if (!token.role) token.role = Role.SALJARE;
      if (typeof (token as any).mfaEnabled === "undefined") {
        (token as any).mfaEnabled = false;
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.uid) (session.user as any).id = token.uid as string;
      (session.user as any).role = (token as any).role ?? Role.SALJARE;
      (session.user as any).mfaEnabled = Boolean((token as any).mfaEnabled);
      session.user.image = (token.picture as string | null | undefined) ?? null;
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
};

