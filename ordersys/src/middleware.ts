import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any;
    const role = token?.role as string | undefined;
    const { pathname } = req.nextUrl;

    // Exempel: endast SALJARE eller ADMIN får dessa
    if (pathname.startsWith("/orders/new") || pathname.startsWith("/sales")) {
      if (role !== "SALJARE" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/403", req.url));
      }
    }

    // Exempel: endast ADMIN
    if (pathname.startsWith("/admin")) {
      if (role !== "ADMIN") {
        return NextResponse.redirect(new URL("/403", req.url));
      }
    }
  },
  {
    callbacks: {
      // kräver inloggning för alla matcher nedan
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login", // om ej inloggad
    },
  }
);

// vilka routes som skyddas av middleware
export const config = {
  matcher: [
    "/orders/new",
    "/orders/archived",
    "/sales/:path*",
    "/admin/:path*",
  ],
};
