"use client";

import { usePathname } from "next/navigation";

import UserMenu from "@/components/UserMenu";

export default function HeaderUserMenu(props: {
  name?: string;
  email?: string;
  image?: string;
  isLoggedIn: boolean;
}) {
  const pathname = usePathname();

  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  return <UserMenu {...props} />;
}
