import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import MobileMenu from "@/components/MobileMenu";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import HeaderUserMenu from "@/components/HeaderUserMenu";
import RegisterMenu from "@/components/RegisterMenu";
import GlobalCommandMenu from "@/components/GlobalCommandMenu";
import NotificationCenter from "@/components/NotificationCenter";
import Footer from "@/components/Footer";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { AppSessionProvider } from "@/components/AppSessionProvider";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Ordexa",
  description:
    "Ordexa - smidigt orderhanteringssystem för hantverkare som vill följa jobb från offert till faktura.",
  icons: { icon: "/favicon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

function AppShellFrame({
  authenticated,
  children,
}: {
  authenticated: boolean;
  children: React.ReactNode;
}) {
  if (!authenticated) return children;

  return (
    <SidebarProvider className="block min-h-full">
      <AppSidebar />
      {children}
    </SidebarProvider>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const needsMfa =
    Boolean(session?.user) && !Boolean((session?.user as any)?.mfaEnabled);

  return (
    <html
      lang="sv"
      className={cn("font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const stored = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    const theme = stored === "dark" ? "dark" : "light";
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    root.style.colorScheme = theme;
  } catch {}
})();`,
          }}
        />
      </head>
      <body
        className="bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <AppSessionProvider session={session}>
          <div id="top" className="min-h-dvh flex flex-col">
            <main className="flex-1 bg-background">
              <AppShellFrame authenticated={Boolean(session)}>
                <header
                  className={[
                    "sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur",
                    "supports-[backdrop-filter]:bg-card/70",
                    "pt-[env(safe-area-inset-top)]",
                  ].join(" ")}
                >
                  <div className="hidden h-18 items-center justify-between px-6 sm:flex">
                    <div className="flex items-center gap-2">
                      {!session ? <MobileMenu /> : null}
                      <Link
                        href="/"
                        className="inline-flex items-center leading-none transition hover:opacity-90"
                        aria-label="Gå till startsidan"
                      >
                        <Image
                          src="/logo.png"
                          alt="Ordina"
                          width={175}
                          height={30}
                          className="block object-contain"
                        />
                      </Link>
                    </div>

                    <div className="flex items-center gap-3">
                      <GlobalCommandMenu isLoggedIn={!!session} />
                      <NotificationCenter isLoggedIn={!!session} />
                      <RegisterMenu />
                    </div>
                  </div>

                  <div className="relative flex h-16 items-center justify-between px-3 sm:hidden">
                    <div className="z-10 -ml-1">
                      {session ? (
                        <SidebarTrigger aria-label="Öppna navigering" />
                      ) : (
                        <MobileMenu />
                      )}
                    </div>

                    <Link
                      href="/"
                      className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center leading-none transition hover:opacity-90"
                      aria-label="Gå till startsidan"
                    >
                      <Image
                        src="/logo.png"
                        alt="Ordina"
                        width={124}
                        height={26}
                        priority
                        className="block translate-y-px object-contain"
                      />
                    </Link>

                    <div className="z-10 flex items-center gap-2">
                      <GlobalCommandMenu isLoggedIn={!!session} compact />
                      <NotificationCenter isLoggedIn={!!session} compact />
                      <HeaderUserMenu
                        isLoggedIn={!!session}
                        name={session?.user?.name ?? ""}
                        email={session?.user?.email ?? ""}
                        image={
                          session?.user?.image ??
                          "/uploads/profiles/default-avatar.png"
                        }
                      />
                    </div>
                  </div>

                  {needsMfa ? (
                    <div className="border-t border-brand-200/80 bg-gradient-to-r from-brand-50 via-white to-brand-50 px-3 py-3 text-brand-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-brand-300/30 dark:from-brand-950/70 dark:via-card dark:to-brand-950/70 sm:px-6">
                      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-white text-brand-700 shadow-sm dark:border-brand-300/30 dark:bg-card">
                            <ShieldCheck className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-5 text-foreground">
                              Aktivera authenticator
                            </p>
                            <p className="text-xs leading-5 text-muted-foreground">
                              Skydda ditt konto med engångskoder innan du
                              fortsätter.
                            </p>
                          </div>
                        </div>

                        <Link
                          href="/account"
                          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:bg-brand-800 dark:bg-brand-500 dark:text-brand-950 dark:hover:bg-brand-400 sm:self-auto"
                        >
                          Starta
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </header>

                <div className="px-4 py-4 sm:p-6">{children}</div>
              </AppShellFrame>
            </main>

            <Footer />
          </div>
        </AppSessionProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
