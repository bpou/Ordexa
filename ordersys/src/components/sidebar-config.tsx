import * as React from "react";
import {
  BookOpenIcon,
  CalendarIcon,
  ClipboardListIcon,
  FileTextIcon,
  FlaskConicalIcon,
  Gamepad2Icon,
  LayoutDashboardIcon,
  Settings2Icon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";

type SidebarSubItem = {
  title: string;
  url: string;
};

export type SidebarMainItem = {
  title: string;
  url: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  items?: SidebarSubItem[];
};

type SidebarProjectItem = {
  name: string;
  url: string;
  icon: React.ReactNode;
};

type SidebarTeam = {
  name: string;
  logo: React.ReactNode;
  plan: string;
};

export type SidebarConfig = {
  teams: SidebarTeam[];
  navMain: SidebarMainItem[];
  projects: SidebarProjectItem[];
};

const teams: SidebarTeam[] = [
  {
    name: "Ordina Kärna",
    logo: <LayoutDashboardIcon />,
    plan: "Drift",
  },
  {
    name: "Ordina Sälj",
    logo: <UsersIcon />,
    plan: "Försäljning",
  },
  {
    name: "Ordina Labb",
    logo: <FlaskConicalIcon />,
    plan: "Testmiljö",
  },
];

const sectionMap: Record<
  string,
  {
    navMain: SidebarMainItem[];
    projects: SidebarProjectItem[];
  }
> = {
  dashboard: {
    navMain: [
      {
        title: "Översikt",
        url: "/dashboard",
        icon: <LayoutDashboardIcon />,
        items: [
          { title: "Hem", url: "/" },
          { title: "Orderöversikt", url: "/orders/overview" },
          { title: "Kalender", url: "/personal-calendar" },
        ],
      },
      {
        title: "Ordrar",
        url: "/orders",
        icon: <ClipboardListIcon />,
        items: [
          { title: "Översikt", url: "/orders/overview" },
          { title: "Ny order", url: "/orders/new" },
          { title: "Ny offert", url: "/quotes/new" },
          { title: "Arkiverade", url: "/orders/archived" },
          { title: "Slutförda", url: "/orders/completed" },
        ],
      },
      {
        title: "Kunder",
        url: "/customers",
        icon: <UsersIcon />,
        items: [
          { title: "Kundlista", url: "/customers" },
          { title: "Ny kund", url: "/customers/new" },
        ],
      },
      {
        title: "Artiklar",
        url: "/articles",
        icon: <BookOpenIcon />,
        items: [
          { title: "Alla artiklar", url: "/articles" },
          { title: "Ny artikel", url: "/articles/new" },
        ],
      },
    ],
    projects: [
      { name: "Offerter", url: "/quotes/new", icon: <FileTextIcon /> },
      { name: "Komponentlabb", url: "/component-lab", icon: <FlaskConicalIcon /> },
      { name: "Snake", url: "/snake", icon: <Gamepad2Icon /> },
    ],
  },
  orders: {
    navMain: [
      {
        title: "Ordrar",
        url: "/orders",
        icon: <ClipboardListIcon />,
        items: [
          { title: "Översikt", url: "/orders/overview" },
          { title: "Ny order", url: "/orders/new" },
          { title: "Spårtavla", url: "/orders/track/B_TEAM" },
          { title: "Arkiverade", url: "/orders/archived" },
          { title: "Slutförda", url: "/orders/completed" },
        ],
      },
      {
        title: "Kunder",
        url: "/customers",
        icon: <UsersIcon />,
        items: [
          { title: "Kundlista", url: "/customers" },
          { title: "Ny kund", url: "/customers/new" },
        ],
      },
      {
        title: "Översikt",
        url: "/dashboard",
        icon: <LayoutDashboardIcon />,
        items: [{ title: "Till översikten", url: "/dashboard" }],
      },
    ],
    projects: [
      { name: "Offerter", url: "/quotes/new2.0", icon: <FileTextIcon /> },
      { name: "Kalender", url: "/personal-calendar", icon: <CalendarIcon /> },
      { name: "Konto", url: "/account", icon: <UserCogIcon /> },
    ],
  },
  customers: {
    navMain: [
      {
        title: "Kunder",
        url: "/customers",
        icon: <UsersIcon />,
        items: [
          { title: "Kundlista", url: "/customers" },
          { title: "Ny kund", url: "/customers/new" },
        ],
      },
      {
        title: "Ordrar",
        url: "/orders",
        icon: <ClipboardListIcon />,
        items: [
          { title: "Översikt", url: "/orders/overview" },
          { title: "Ny order", url: "/orders/new" },
        ],
      },
      {
        title: "Översikt",
        url: "/dashboard",
        icon: <LayoutDashboardIcon />,
        items: [{ title: "Till översikten", url: "/dashboard" }],
      },
    ],
    projects: [
      { name: "Artiklar", url: "/articles", icon: <BookOpenIcon /> },
      { name: "Offerter", url: "/quotes/new", icon: <FileTextIcon /> },
      { name: "Kalender", url: "/personal-calendar", icon: <CalendarIcon /> },
    ],
  },
  articles: {
    navMain: [
      {
        title: "Artiklar",
        url: "/articles",
        icon: <BookOpenIcon />,
        items: [
          { title: "Alla artiklar", url: "/articles" },
          { title: "Ny artikel", url: "/articles/new" },
        ],
      },
      {
        title: "Kunder",
        url: "/customers",
        icon: <UsersIcon />,
        items: [{ title: "Kundlista", url: "/customers" }],
      },
      {
        title: "Översikt",
        url: "/dashboard",
        icon: <LayoutDashboardIcon />,
        items: [{ title: "Till översikten", url: "/dashboard" }],
      },
    ],
    projects: [
      { name: "Offerter", url: "/quotes/new", icon: <FileTextIcon /> },
      { name: "Komponentlabb", url: "/component-lab", icon: <FlaskConicalIcon /> },
      { name: "Konto", url: "/account", icon: <UserCogIcon /> },
    ],
  },
  calendar: {
    navMain: [
      {
        title: "Kalender",
        url: "/personal-calendar",
        icon: <CalendarIcon />,
        items: [
          { title: "Personlig kalender", url: "/personal-calendar" },
          { title: "Spårkalender", url: "/calendar/B_TEAM" },
        ],
      },
      {
        title: "Ordrar",
        url: "/orders",
        icon: <ClipboardListIcon />,
        items: [{ title: "Översikt", url: "/orders/overview" }],
      },
      {
        title: "Översikt",
        url: "/dashboard",
        icon: <LayoutDashboardIcon />,
        items: [{ title: "Till översikten", url: "/dashboard" }],
      },
    ],
    projects: [
      { name: "Kunder", url: "/customers", icon: <UsersIcon /> },
      { name: "Artiklar", url: "/articles", icon: <BookOpenIcon /> },
      { name: "Konto", url: "/account", icon: <UserCogIcon /> },
    ],
  },
  account: {
    navMain: [
      {
        title: "Konto",
        url: "/account",
        icon: <UserCogIcon />,
        items: [{ title: "Profil och säkerhet", url: "/account" }],
      },
      {
        title: "Översikt",
        url: "/dashboard",
        icon: <LayoutDashboardIcon />,
        items: [{ title: "Till översikten", url: "/dashboard" }],
      },
      {
        title: "Inställningar",
        url: "/sakerhet",
        icon: <Settings2Icon />,
        items: [
          { title: "Säkerhet", url: "/sakerhet" },
          { title: "Integritet", url: "/integritet" },
          { title: "Villkor", url: "/villkor" },
        ],
      },
    ],
    projects: [
      { name: "Ordrar", url: "/orders/overview", icon: <ClipboardListIcon /> },
      { name: "Kunder", url: "/customers", icon: <UsersIcon /> },
      { name: "Artiklar", url: "/articles", icon: <BookOpenIcon /> },
    ],
  },
};

function isPathMatch(pathname: string, target: string) {
  return pathname === target || pathname.startsWith(`${target}/`);
}

function withActiveState(navMain: SidebarMainItem[], pathname: string) {
  return navMain.map((item) => {
    const subItemMatch = item.items?.some((subItem) =>
      isPathMatch(pathname, subItem.url)
    );
    const ownMatch = isPathMatch(pathname, item.url);

    return {
      ...item,
      isActive: Boolean(subItemMatch || ownMatch),
    };
  });
}

function getSectionKey(pathname: string) {
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/articles")) return "articles";
  if (pathname.startsWith("/calendar") || pathname.startsWith("/personal-calendar")) {
    return "calendar";
  }
  if (pathname.startsWith("/account") || pathname.startsWith("/sakerhet")) {
    return "account";
  }

  return "dashboard";
}

export function getSidebarConfig(pathname: string): SidebarConfig {
  const key = getSectionKey(pathname);
  const section = sectionMap[key] ?? sectionMap.dashboard;

  return {
    teams,
    navMain: withActiveState(section.navMain, pathname),
    projects: section.projects,
  };
}
