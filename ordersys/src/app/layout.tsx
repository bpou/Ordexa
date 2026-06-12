import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import MobileMenu from "@/components/MobileMenu";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import HeaderUserMenu from "@/components/HeaderUserMenu";
import RegisterMenu from "@/components/RegisterMenu";
import Footer from "@/components/Footer";
import { AlertTriangle } from "lucide-react";
import { AppSessionProvider } from "@/components/AppSessionProvider";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY } from "@/lib/theme";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Ordina",
  description:
    "Ordina – smidigt orderhanteringssystem för hantverkare som vill följa jobb från offert till faktura.",
  icons: { icon: "/favicon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const needsMfa =
    Boolean(session?.user) && !Boolean((session?.user as any)?.mfaEnabled);

  return (
    <html lang="sv" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
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
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        <AppSessionProvider session={session}>
          <div id="top" className="min-h-dvh flex flex-col">
            <main className="flex-1 bg-background">
              <header
                className={[
                  "sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur",
                  "supports-[backdrop-filter]:bg-card/70",
                  "pt-[env(safe-area-inset-top)]",
                ].join(" ")}
              >
                <div className="hidden h-18 items-center justify-between px-6 sm:flex">
                  <div className="flex items-center gap-2">
                    <MobileMenu />
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
                    <RegisterMenu />
                    <HeaderUserMenu
                      isLoggedIn={!!session}
                      name={session?.user?.name ?? ""}
                      email={session?.user?.email ?? ""}
                      image={session?.user?.image ?? "/uploads/profiles/default-avatar.png"}
                    />
                  </div>
                </div>

                <div className="relative flex h-16 items-center justify-between px-3 sm:hidden">
                  <div className="z-10 -ml-1">
                    <MobileMenu />
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
                    <HeaderUserMenu
                      isLoggedIn={!!session}
                      name={session?.user?.name ?? ""}
                      email={session?.user?.email ?? ""}
                      image={session?.user?.image ?? "/uploads/profiles/default-avatar.png"}
                    />
                  </div>
                </div>

                {needsMfa ? (
                  <div className="sm:hidden border-t border-amber-200 bg-amber-50/95 px-3 py-2.5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/80 dark:text-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <div className="flex-1 text-xs">
                        <p className="font-medium">Aktivera authenticator</p>
                        <p className="text-amber-800/80 dark:text-amber-200/80">Skydda ditt konto med engångskoder.</p>
                      </div>
                      <Link
                        href="/account"
                        className="ml-2 inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 active:bg-amber-800 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
                      >
                        Starta
                      </Link>
                    </div>
                  </div>
                ) : null}
              </header>

              <div className="px-4 py-4 sm:p-6">{children}</div>
            </main>

            <Footer />
          </div>
        </AppSessionProvider>
      </body>
    </html>
  );
}
