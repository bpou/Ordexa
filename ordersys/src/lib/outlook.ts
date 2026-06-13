import { EventVisibility, Track } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const OUTLOOK_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
  "Calendars.ReadWrite",
];

const OUTLOOK_SYNC_LOOKBACK_DAYS = 30;
const OUTLOOK_SYNC_LOOKAHEAD_DAYS = Number.parseInt(
  process.env.OUTLOOK_SYNC_LOOKAHEAD_DAYS ?? "90",
  10
);
const OUTLOOK_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;
const OUTLOOK_SUBSCRIPTION_RENEW_BEFORE_MS = 12 * 60 * 60 * 1000;
const OUTLOOK_SUBSCRIPTION_TTL_MS = 2 * 24 * 60 * 60 * 1000;

type OutlookConfig = {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GraphProfile = {
  id?: string;
  displayName?: string;
  mail?: string | null;
  userPrincipalName?: string | null;
};

type GraphCalendarViewResponse = {
  value?: GraphEvent[];
  "@odata.nextLink"?: string;
};

type GraphSubscription = {
  id?: string;
  expirationDateTime?: string;
  clientState?: string;
};

type GraphCalendar = {
  id?: string;
  name?: string | null;
  color?: string | null;
  isDefaultCalendar?: boolean;
};

type GraphEvent = {
  id?: string;
  iCalUId?: string;
  subject?: string | null;
  isAllDay?: boolean;
  isCancelled?: boolean;
  webLink?: string | null;
  showAs?: string | null;
  location?: { displayName?: string | null } | null;
  bodyPreview?: string | null;
  organizer?: {
    emailAddress?: {
      name?: string | null;
      address?: string | null;
    } | null;
  } | null;
  start?: {
    dateTime?: string | null;
    timeZone?: string | null;
  } | null;
  end?: {
    dateTime?: string | null;
    timeZone?: string | null;
  } | null;
};

type SyncResult = {
  connected: boolean;
  skipped?: boolean;
  created: number;
  updated: number;
  deleted: number;
};

type PersonalEventForOutlook = {
  id: string;
  title: string;
  notes: string | null;
  allDay: boolean;
  start: Date | null;
  end: Date | null;
  visibility: EventVisibility;
  ownerUserId: string | null;
  outlookSync?: {
    id: string;
    externalEventId: string;
    connectionId: string;
  } | null;
};

type OutlookWebhookNotification = {
  subscriptionId?: string;
  clientState?: string;
  changeType?: string;
  resource?: string;
};

type TrackCalendarEventForOutlook = {
  id: string;
  title: string;
  notes: string | null;
  start: Date;
  end: Date;
  track: Track;
  orderId: string;
  outlookTrackSync?: {
    id: string;
    externalEventId: string;
    connectionId: string;
    calendarId: string;
  } | null;
};

export function isOutlookSchemaMissingError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeCode = "code" in error ? (error as { code?: unknown }).code : undefined;
  const maybeMessage =
    "message" in error ? String((error as { message?: unknown }).message ?? "") : "";

  if (maybeCode === "P2021") {
    return maybeMessage.includes("OutlookCalendarConnection") || maybeMessage.includes("OutlookCalendarSync");
  }

  return false;
}

function getOutlookConfig(origin?: string): OutlookConfig | null {
  const clientId = process.env.OUTLOOK_CLIENT_ID?.trim();
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET?.trim();
  const tenantId = process.env.OUTLOOK_TENANT_ID?.trim() || "common";
  const redirectUri =
    process.env.OUTLOOK_REDIRECT_URI?.trim() ||
    (process.env.NEXTAUTH_URL?.trim()
      ? `${process.env.NEXTAUTH_URL.trim().replace(/\/$/, "")}/api/account/outlook/oauth/callback`
      : origin
        ? `${origin.replace(/\/$/, "")}/api/account/outlook/oauth/callback`
        : "");

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, tenantId, redirectUri };
}

export function isOutlookConfigured(origin?: string) {
  return Boolean(getOutlookConfig(origin));
}

function requireOutlookConfig(origin?: string): OutlookConfig {
  const config = getOutlookConfig(origin);
  if (!config) {
    throw new Error(
      "Outlook integration is not configured. Set OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET and OUTLOOK_REDIRECT_URI."
    );
  }
  return config;
}

function getOutlookWebhookUrl(origin?: string) {
  const base =
    process.env.OUTLOOK_WEBHOOK_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    origin?.trim() ||
    "";

  if (!base) {
    return "";
  }

  return `${base.replace(/\/$/, "")}/api/account/outlook/notifications`;
}

function requireOutlookWebhookUrl(origin?: string) {
  const url = getOutlookWebhookUrl(origin);
  if (!url) {
    throw new Error(
      "Outlook webhook URL is not configured. Set OUTLOOK_WEBHOOK_URL or NEXTAUTH_URL."
    );
  }
  return url;
}

function getSharedOutlookSyncUserEmail() {
  return process.env.OUTLOOK_SHARED_SYNC_USER_EMAIL?.trim().toLowerCase() || null;
}

function getTrackCalendarId(track: Track) {
  switch (track) {
    case Track.A:
      return process.env.OUTLOOK_TRACK_A_CALENDAR_ID?.trim() || null;
    case Track.B:
      return process.env.OUTLOOK_TRACK_B_CALENDAR_ID?.trim() || null;
    case Track.C:
      return process.env.OUTLOOK_TRACK_C_CALENDAR_ID?.trim() || null;
    case Track.D:
      return process.env.OUTLOOK_TRACK_D_CALENDAR_ID?.trim() || null;
    default:
      return null;
  }
}

function isOutlookTrack(track: Track): track is "A" | "B" | "C" | "D" {
  return track === Track.A || track === Track.B || track === Track.C || track === Track.D;
}

function getAuthorizeEndpoint(tenantId: string) {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
}

function getTokenEndpoint(tenantId: string) {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
}

export function buildOutlookAuthorizeUrl(state: string, origin?: string) {
  const config = requireOutlookConfig(origin);
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    response_mode: "query",
    scope: OUTLOOK_SCOPES.join(" "),
    state,
    prompt: "select_account",
  });

  return `${getAuthorizeEndpoint(config.tenantId)}?${params.toString()}`;
}

async function postForTokens(
  body: URLSearchParams,
  origin?: string
): Promise<TokenResponse> {
  const config = requireOutlookConfig(origin);
  const res = await fetch(getTokenEndpoint(config.tenantId), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        `Outlook token request failed (${res.status})`
    );
  }
  return data;
}

export async function exchangeOutlookCodeForTokens(code: string, origin?: string) {
  const config = requireOutlookConfig(origin);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    scope: OUTLOOK_SCOPES.join(" "),
  });

  const data = await postForTokens(body, origin);
  if (!data.refresh_token) {
    throw new Error("Outlook did not return a refresh token. Ensure offline_access is granted.");
  }
  return data;
}

async function refreshOutlookTokens(connectionId: string) {
  const connection = await prisma.outlookCalendarConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) {
    throw new Error("Outlook connection not found.");
  }
  if (!connection.refreshToken) {
    throw new Error("Outlook refresh token is missing.");
  }

  const config = requireOutlookConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: connection.refreshToken,
    redirect_uri: config.redirectUri,
    scope: OUTLOOK_SCOPES.join(" "),
  });

  const data = await postForTokens(body);
  const expiresAt = new Date(Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000);

  return prisma.outlookCalendarConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: data.access_token!,
      refreshToken: data.refresh_token ?? connection.refreshToken,
      tokenType: data.token_type ?? connection.tokenType,
      scope: data.scope ?? connection.scope,
      expiresAt,
      syncError: null,
    },
  });
}

export async function getValidAccessToken(connectionId: string) {
  const connection = await prisma.outlookCalendarConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new Error("Outlook connection not found.");
  }

  if (connection.expiresAt.getTime() > Date.now() + 60_000) {
    return { connection, accessToken: connection.accessToken };
  }

  const refreshed = await refreshOutlookTokens(connectionId);
  return { connection: refreshed, accessToken: refreshed.accessToken };
}

async function graphFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data?.error?.message || `Microsoft Graph request failed (${res.status})`);
  }

  return data;
}

async function graphVoidFetch(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<void> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (res.ok || res.status === 204) {
    return;
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
  };

  throw new Error(data?.error?.message || `Microsoft Graph request failed (${res.status})`);
}

export async function fetchOutlookProfile(accessToken: string) {
  const profile = await graphFetch<GraphProfile>(
    "/me?$select=id,displayName,mail,userPrincipalName",
    accessToken
  );

  return {
    providerUserId: profile.id ?? null,
    providerEmail: profile.mail || profile.userPrincipalName || null,
    displayName: profile.displayName ?? null,
  };
}

export async function fetchOutlookCalendars(accessToken: string) {
  const response = await graphFetch<{ value?: GraphCalendar[] }>("/me/calendars", accessToken);
  return response.value || [];
}

export async function updateOutlookCalendarId(connectionId: string, calendarId: string) {
  await prisma.outlookCalendarConnection.update({
    where: { id: connectionId },
    data: { calendarId },
  });
}

function getSubscriptionExpirationDate() {
  return new Date(Date.now() + OUTLOOK_SUBSCRIPTION_TTL_MS);
}

function shouldRenewSubscription(expiresAt?: Date | null) {
  if (!expiresAt) return true;
  return expiresAt.getTime() <= Date.now() + OUTLOOK_SUBSCRIPTION_RENEW_BEFORE_MS;
}

async function createGraphSubscription(
  accessToken: string,
  notificationUrl: string,
  clientState: string
) {
  return graphFetch<GraphSubscription>("/subscriptions", accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      changeType: "created,updated,deleted",
      notificationUrl,
      resource: "/me/events",
      expirationDateTime: getSubscriptionExpirationDate().toISOString(),
      clientState,
      latestSupportedTlsVersion: "v1_2",
    }),
  });
}

async function renewGraphSubscription(
  accessToken: string,
  subscriptionId: string
) {
  return graphFetch<GraphSubscription>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    accessToken,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expirationDateTime: getSubscriptionExpirationDate().toISOString(),
      }),
    }
  );
}

async function deleteGraphSubscription(accessToken: string, subscriptionId: string) {
  await graphVoidFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, accessToken, {
    method: "DELETE",
  });
}

async function getSharedTrackOutlookConnection() {
  const email = getSharedOutlookSyncUserEmail();
  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  return prisma.outlookCalendarConnection.findUnique({
    where: { userId: user.id },
  });
}

function toOutlookDateTime(date: Date) {
  return date.toISOString().slice(0, 19);
}

function toOutlookAllDayDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildOutlookEventPayload(event: PersonalEventForOutlook) {
  const start = event.start;
  const end = event.end;

  if (!start || !end) {
    throw new Error("Personal calendar event is missing start or end time.");
  }

  if (event.allDay) {
    const startDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const endDateSource = end > start ? end : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    const endDate = new Date(
      Date.UTC(endDateSource.getUTCFullYear(), endDateSource.getUTCMonth(), endDateSource.getUTCDate())
    );

    if (endDate <= startDate) {
      endDate.setUTCDate(endDate.getUTCDate() + 1);
    }

    return {
      subject: event.title,
      isAllDay: true,
      body: event.notes
        ? {
            contentType: "text" as const,
            content: event.notes,
          }
        : undefined,
      start: {
        dateTime: `${toOutlookAllDayDate(startDate)}T00:00:00`,
        timeZone: "UTC",
      },
      end: {
        dateTime: `${toOutlookAllDayDate(endDate)}T00:00:00`,
        timeZone: "UTC",
      },
    };
  }

  return {
    subject: event.title,
    isAllDay: false,
    body: event.notes
      ? {
          contentType: "text" as const,
          content: event.notes,
        }
      : undefined,
    start: {
      dateTime: toOutlookDateTime(start),
      timeZone: "UTC",
    },
    end: {
      dateTime: toOutlookDateTime(end),
      timeZone: "UTC",
    },
  };
}

function buildTrackOutlookEventPayload(event: TrackCalendarEventForOutlook) {
  return {
    subject: event.title,
    isAllDay: false,
    body: event.notes
      ? {
          contentType: "text" as const,
          content: event.notes,
        }
      : undefined,
    start: {
      dateTime: toOutlookDateTime(event.start),
      timeZone: "UTC",
    },
    end: {
      dateTime: toOutlookDateTime(event.end),
      timeZone: "UTC",
    },
  };
}

async function createOutlookEvent(
  accessToken: string,
  calendarId: string,
  event: PersonalEventForOutlook
) {
  const path =
    calendarId && calendarId !== "primary"
      ? `/me/calendars/${encodeURIComponent(calendarId)}/events`
      : "/me/events";

  return graphFetch<{ id?: string; iCalUId?: string | null }>(path, accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: 'outlook.timezone="UTC"',
    },
    body: JSON.stringify(buildOutlookEventPayload(event)),
  });
}

async function updateOutlookEvent(
  accessToken: string,
  calendarId: string,
  externalEventId: string,
  event: PersonalEventForOutlook
) {
  const path =
    calendarId && calendarId !== "primary"
      ? `/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalEventId)}`
      : `/me/events/${encodeURIComponent(externalEventId)}`;

  await graphVoidFetch(path, accessToken, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: 'outlook.timezone="UTC"',
    },
    body: JSON.stringify(buildOutlookEventPayload(event)),
  });
}

async function deleteOutlookEvent(
  accessToken: string,
  calendarId: string,
  externalEventId: string
) {
  const path =
    calendarId && calendarId !== "primary"
      ? `/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalEventId)}`
      : `/me/events/${encodeURIComponent(externalEventId)}`;

  await graphVoidFetch(path, accessToken, { method: "DELETE" });
}

async function createOutlookTrackEvent(
  accessToken: string,
  calendarId: string,
  event: TrackCalendarEventForOutlook
) {
  const path = `/me/calendars/${encodeURIComponent(calendarId)}/events`;

  return graphFetch<{ id?: string; iCalUId?: string | null }>(path, accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: 'outlook.timezone="UTC"',
    },
    body: JSON.stringify(buildTrackOutlookEventPayload(event)),
  });
}

async function updateOutlookTrackEvent(
  accessToken: string,
  calendarId: string,
  externalEventId: string,
  event: TrackCalendarEventForOutlook
) {
  const path = `/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalEventId)}`;
  await graphVoidFetch(path, accessToken, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: 'outlook.timezone="UTC"',
    },
    body: JSON.stringify(buildTrackOutlookEventPayload(event)),
  });
}

async function deleteOutlookTrackEvent(
  accessToken: string,
  calendarId: string,
  externalEventId: string
) {
  const path = `/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalEventId)}`;
  await graphVoidFetch(path, accessToken, { method: "DELETE" });
}

function parseGraphDateTime(
  value: GraphEvent["start"] | GraphEvent["end"],
  fallbackAllDay = false
) {
  const raw = value?.dateTime?.trim();
  if (!raw) return null;

  if (fallbackAllDay && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00.000Z`);
  }

  const parsed = parseGraphDateTimeWithZone(raw, value?.timeZone ?? null);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00.000Z`);
  }

  return null;
}

const WINDOWS_TIMEZONE_TO_IANA: Record<string, string> = {
  UTC: "UTC",
  "GMT Standard Time": "Europe/London",
  "W. Europe Standard Time": "Europe/Stockholm",
  "Central Europe Standard Time": "Europe/Budapest",
  "Romance Standard Time": "Europe/Paris",
  "Central European Standard Time": "Europe/Warsaw",
  "E. Europe Standard Time": "Europe/Bucharest",
  "FLE Standard Time": "Europe/Helsinki",
  "Turkey Standard Time": "Europe/Istanbul",
  "Israel Standard Time": "Asia/Jerusalem",
  "Arabian Standard Time": "Asia/Dubai",
  "India Standard Time": "Asia/Kolkata",
  "China Standard Time": "Asia/Shanghai",
  "Tokyo Standard Time": "Asia/Tokyo",
  "Korea Standard Time": "Asia/Seoul",
  "AUS Eastern Standard Time": "Australia/Sydney",
  "New Zealand Standard Time": "Pacific/Auckland",
  "Atlantic Standard Time": "America/Halifax",
  "Eastern Standard Time": "America/New_York",
  "Central Standard Time": "America/Chicago",
  "Mountain Standard Time": "America/Denver",
  "Pacific Standard Time": "America/Los_Angeles",
  "Alaskan Standard Time": "America/Anchorage",
  "Hawaiian Standard Time": "Pacific/Honolulu",
};

function normalizeGraphTimeZone(timeZone?: string | null) {
  const value = timeZone?.trim();
  if (!value) return null;
  return WINDOWS_TIMEZONE_TO_IANA[value] ?? value;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number.parseInt(part.value, 10)])
  ) as Record<string, number>;

  const asUtc = Date.UTC(
    values.year,
    (values.month ?? 1) - 1,
    values.day ?? 1,
    values.hour ?? 0,
    values.minute ?? 0,
    values.second ?? 0,
    0
  );

  return asUtc - date.getTime();
}

function parseNaiveDateTimeInTimeZone(raw: string, timeZone: string) {
  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?$/
  );
  if (!match) {
    return new Date(Number.NaN);
  }

  const [
    ,
    year,
    month,
    day,
    hour,
    minute,
    second = "0",
    fraction = "0",
  ] = match;

  const milliseconds = Number.parseInt(fraction.padEnd(3, "0").slice(0, 3), 10);
  const utcGuess = Date.UTC(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
    Number.parseInt(hour, 10),
    Number.parseInt(minute, 10),
    Number.parseInt(second, 10),
    milliseconds
  );

  let candidate = new Date(utcGuess);
  let offset = getTimeZoneOffsetMs(candidate, timeZone);
  candidate = new Date(utcGuess - offset);

  const correctedOffset = getTimeZoneOffsetMs(candidate, timeZone);
  if (correctedOffset !== offset) {
    candidate = new Date(utcGuess - correctedOffset);
  }

  return candidate;
}

function parseGraphDateTimeWithZone(raw: string, timeZone?: string | null) {
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)) {
    return new Date(raw);
  }

  const normalizedTimeZone = normalizeGraphTimeZone(timeZone);
  if (normalizedTimeZone) {
    try {
      return parseNaiveDateTimeInTimeZone(raw, normalizedTimeZone);
    } catch {
      // Fall back to native parsing below.
    }
  }

  return new Date(raw);
}

function buildSyncedNotes(event: GraphEvent) {
  const parts: string[] = [];
  const location = event.location?.displayName?.trim();
  const organizerName = event.organizer?.emailAddress?.name?.trim();
  const organizerAddress = event.organizer?.emailAddress?.address?.trim();
  const bodyPreview = event.bodyPreview?.trim();
  const webLink = event.webLink?.trim();

  if (location) parts.push(`Plats: ${location}`);
  if (organizerName || organizerAddress) {
    parts.push(
      `Organisatör: ${[organizerName, organizerAddress].filter(Boolean).join(" ")}`
    );
  }
  if (bodyPreview) parts.push(bodyPreview.slice(0, 500));
  if (webLink) parts.push(`Outlook: ${webLink}`);

  return parts.length ? parts.join("\n\n") : null;
}

async function fetchCalendarViewEvents(accessToken: string, calendarId = "primary") {
  const start = new Date();
  start.setDate(start.getDate() - OUTLOOK_SYNC_LOOKBACK_DAYS);
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setDate(end.getDate() + Math.max(1, OUTLOOK_SYNC_LOOKAHEAD_DAYS));
  end.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    $top: "500",
    $select:
      "id,iCalUId,subject,start,end,isAllDay,isCancelled,location,bodyPreview,organizer,webLink,showAs",
  });

  const initialPath =
    calendarId && calendarId !== "primary"
      ? `/me/calendars/${encodeURIComponent(calendarId)}/calendarView?${params.toString()}`
      : `/me/calendarView?${params.toString()}`;

  const events: GraphEvent[] = [];
  let nextUrl: string | null = initialPath;

  while (nextUrl) {
    const isAbsolute = nextUrl.startsWith("https://");
    const res = await fetch(
      isAbsolute ? nextUrl : `https://graph.microsoft.com/v1.0${nextUrl}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.timezone="UTC"',
        },
        cache: "no-store",
      }
    );

    const data = (await res.json().catch(() => ({}))) as GraphCalendarViewResponse & {
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new Error(data?.error?.message || `Microsoft Graph calendar sync failed (${res.status})`);
    }

    if (Array.isArray(data.value)) {
      events.push(...data.value);
    }

    nextUrl = typeof data["@odata.nextLink"] === "string" ? data["@odata.nextLink"] : null;
  }

  return { events, rangeStart: start, rangeEnd: end };
}

async function fetchOutlookEventById(
  accessToken: string,
  calendarId: string,
  externalEventId: string
) {
  const path =
    calendarId && calendarId !== "primary"
      ? `/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalEventId)}?$select=id,iCalUId,subject,start,end,isAllDay,isCancelled,location,bodyPreview,organizer,webLink,showAs`
      : `/me/events/${encodeURIComponent(externalEventId)}?$select=id,iCalUId,subject,start,end,isAllDay,isCancelled,location,bodyPreview,organizer,webLink,showAs`;

  return graphFetch<GraphEvent>(path, accessToken, {
    headers: {
      Prefer: 'outlook.timezone="UTC"',
    },
  });
}

async function upsertLocalPersonalEventFromGraph(
  connectionId: string,
  userId: string,
  event: GraphEvent
) {
  const externalEventId = event.id?.trim();
  if (!externalEventId || event.isCancelled) {
    return { synced: false, reason: "missing_or_cancelled" as const };
  }

  const isAllDay = Boolean(event.isAllDay);
  const start = parseGraphDateTime(event.start, isAllDay);
  const end = parseGraphDateTime(event.end, isAllDay);
  if (!start || !end) {
    return { synced: false, reason: "invalid_datetime" as const };
  }

  const title = event.subject?.trim() || "Outlook-händelse";
  const notes = buildSyncedNotes(event);

  const existing = await prisma.outlookCalendarSync.findFirst({
    where: {
      connectionId,
      externalEventId,
    },
  });

  if (existing) {
    await prisma.personalCalendarEvent.update({
      where: { id: existing.personalEventId },
      data: {
        title,
        notes,
        allDay: isAllDay,
        start,
        end,
        track: Track.B,
        visibility: EventVisibility.PERSONAL,
        ownerUserId: userId,
      },
    });

    await prisma.outlookCalendarSync.update({
      where: { id: existing.id },
      data: {
        externalICalUId: event.iCalUId ?? existing.externalICalUId,
        lastSeenAt: new Date(),
      },
    });

    return { synced: true, mode: "updated" as const };
  }

  const personalEvent = await prisma.personalCalendarEvent.create({
    data: {
      track: Track.B,
      title,
      label: null,
      notes,
      allDay: isAllDay,
      start,
      end,
      visibility: EventVisibility.PERSONAL,
      ownerUserId: userId,
    },
  });

  await prisma.outlookCalendarSync.create({
    data: {
      connectionId,
      externalEventId,
      externalICalUId: event.iCalUId ?? null,
      personalEventId: personalEvent.id,
      lastSeenAt: new Date(),
    },
  });

  return { synced: true, mode: "created" as const };
}

function extractExternalEventIdFromResource(resource?: string) {
  if (!resource) return null;
  const trimmed = resource.trim();
  const slashMatch = trimmed.match(/\/events\/([^/?]+)$/i);
  if (slashMatch?.[1]) {
    return decodeURIComponent(slashMatch[1]);
  }

  const parenMatch = trimmed.match(/events\('([^']+)'\)$/i);
  if (parenMatch?.[1]) {
    return decodeURIComponent(parenMatch[1]);
  }

  return null;
}

export async function ensureOutlookSubscriptionForUser(userId: string, origin?: string) {
  if (!isOutlookConfigured(origin)) {
    return { ensured: false, reason: "not_configured" as const };
  }

  let connection;
  try {
    connection = await prisma.outlookCalendarConnection.findUnique({
      where: { userId },
    });
  } catch (error) {
    if (isOutlookSchemaMissingError(error)) {
      return { ensured: false, reason: "schema_missing" as const };
    }
    throw error;
  }

  if (!connection) {
    return { ensured: false, reason: "not_connected" as const };
  }

  if (
    connection.webhookSubscriptionId &&
    !shouldRenewSubscription(connection.webhookExpiresAt)
  ) {
    return {
      ensured: true,
      mode: "existing" as const,
      subscriptionId: connection.webhookSubscriptionId,
    };
  }

  const notificationUrl = requireOutlookWebhookUrl(origin);
  const { accessToken } = await getValidAccessToken(connection.id);

  try {
    if (connection.webhookSubscriptionId) {
      const renewed = await renewGraphSubscription(accessToken, connection.webhookSubscriptionId);
      const webhookExpiresAt = renewed.expirationDateTime
        ? new Date(renewed.expirationDateTime)
        : getSubscriptionExpirationDate();

      await prisma.outlookCalendarConnection.update({
        where: { id: connection.id },
        data: {
          webhookExpiresAt,
          syncError: null,
        },
      });

      return {
        ensured: true,
        mode: "renewed" as const,
        subscriptionId: connection.webhookSubscriptionId,
      };
    }
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (!message.includes("(404)")) {
      await prisma.outlookCalendarConnection.update({
        where: { id: connection.id },
        data: { syncError: message },
      });
      throw error;
    }
  }

  const clientState = connection.webhookClientState || crypto.randomUUID();
  const subscription = await createGraphSubscription(accessToken, notificationUrl, clientState);
  const subscriptionId = subscription.id?.trim();
  if (!subscriptionId) {
    throw new Error("Outlook webhook subscription did not return an id.");
  }

  const webhookExpiresAt = subscription.expirationDateTime
    ? new Date(subscription.expirationDateTime)
    : getSubscriptionExpirationDate();

  await prisma.outlookCalendarConnection.update({
    where: { id: connection.id },
    data: {
      webhookSubscriptionId: subscriptionId,
      webhookClientState: clientState,
      webhookExpiresAt,
      syncError: null,
    },
  });

  return { ensured: true, mode: "created" as const, subscriptionId };
}

export async function clearOutlookSubscriptionForUser(userId: string) {
  const connection = await prisma.outlookCalendarConnection.findUnique({
    where: { userId },
  });

  if (!connection?.webhookSubscriptionId || !isOutlookConfigured()) {
    return { cleared: false };
  }

  try {
    const { accessToken } = await getValidAccessToken(connection.id);
    await deleteGraphSubscription(accessToken, connection.webhookSubscriptionId);
  } catch {
    // Best effort only.
  }

  await prisma.outlookCalendarConnection.update({
    where: { id: connection.id },
    data: {
      webhookSubscriptionId: null,
      webhookClientState: null,
      webhookExpiresAt: null,
    },
  });

  return { cleared: true };
}

export async function ensureTrackOutlookSubscription(track: Track, origin?: string) {
  const calendarId = getTrackCalendarId(track);
  if (!calendarId || !isOutlookConfigured(origin)) {
    return { ensured: false, reason: "not_configured" as const };
  }

  const connection = await getSharedTrackOutlookConnection();
  if (!connection) {
    return { ensured: false, reason: "missing_shared_connection" as const };
  }

  const existing = await prisma.outlookTrackCalendarSubscription.findUnique({
    where: {
      connectionId_track: {
        connectionId: connection.id,
        track,
      },
    },
  });

  if (existing && !shouldRenewSubscription(existing.expiresAt)) {
    return { ensured: true, mode: "existing" as const };
  }

  const notificationUrl = requireOutlookWebhookUrl(origin);
  const { accessToken } = await getValidAccessToken(connection.id);

  try {
    if (existing?.subscriptionId) {
      const renewed = await renewGraphSubscription(accessToken, existing.subscriptionId);
      await prisma.outlookTrackCalendarSubscription.update({
        where: { id: existing.id },
        data: {
          expiresAt: renewed.expirationDateTime
            ? new Date(renewed.expirationDateTime)
            : getSubscriptionExpirationDate(),
        },
      });
      return { ensured: true, mode: "renewed" as const };
    }
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (!message.includes("(404)")) {
      throw error;
    }
  }

  const clientState = existing?.clientState || crypto.randomUUID();
  const subscription = await graphFetch<GraphSubscription>("/subscriptions", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      changeType: "created,updated,deleted",
      notificationUrl,
      resource: `/me/calendars/${encodeURIComponent(calendarId)}/events`,
      expirationDateTime: getSubscriptionExpirationDate().toISOString(),
      clientState,
      latestSupportedTlsVersion: "v1_2",
    }),
  });

  const subscriptionId = subscription.id?.trim();
  if (!subscriptionId) {
    throw new Error("Track Outlook subscription did not return an id.");
  }

  await prisma.outlookTrackCalendarSubscription.upsert({
    where: {
      connectionId_track: {
        connectionId: connection.id,
        track,
      },
    },
    update: {
      calendarId,
      subscriptionId,
      clientState,
      expiresAt: subscription.expirationDateTime
        ? new Date(subscription.expirationDateTime)
        : getSubscriptionExpirationDate(),
    },
    create: {
      connectionId: connection.id,
      track,
      calendarId,
      subscriptionId,
      clientState,
      expiresAt: subscription.expirationDateTime
        ? new Date(subscription.expirationDateTime)
        : getSubscriptionExpirationDate(),
    },
  });

  return { ensured: true, mode: "created" as const };
}

export async function upsertTrackEventToOutlook(calendarEventId: string) {
  const event = await prisma.calendarEvent.findUnique({
    where: { id: calendarEventId },
    include: { outlookTrackSync: true },
  });

  if (!event || !event.start || !event.end) {
    return { synced: false, reason: "missing_event" as const };
  }

  if (!isOutlookTrack(event.track)) {
    return { synced: false, reason: "unsupported_track" as const };
  }

  const calendarId = getTrackCalendarId(event.track);
  if (!calendarId) {
    return { synced: false, reason: "track_not_configured" as const };
  }

  const connection = await getSharedTrackOutlookConnection();
  if (!connection) {
    return { synced: false, reason: "missing_shared_connection" as const };
  }

  const { accessToken } = await getValidAccessToken(connection.id);

  if (event.outlookTrackSync?.externalEventId) {
    try {
      await updateOutlookTrackEvent(
        accessToken,
        event.outlookTrackSync.calendarId,
        event.outlookTrackSync.externalEventId,
        event as TrackCalendarEventForOutlook
      );
      await prisma.outlookTrackCalendarSync.update({
        where: { id: event.outlookTrackSync.id },
        data: { lastSeenAt: new Date() },
      });
      return { synced: true, mode: "updated" as const };
    } catch (error: any) {
      const message = String(error?.message ?? "");
      if (!message.includes("(404)")) {
        throw error;
      }
    }
  }

  const created = await createOutlookTrackEvent(
    accessToken,
    calendarId,
    event as TrackCalendarEventForOutlook
  );
  const externalEventId = created.id?.trim();
  if (!externalEventId) {
    throw new Error("Outlook track event did not return an event id.");
  }

  await prisma.outlookTrackCalendarSync.upsert({
    where: { calendarEventId: event.id },
    update: {
      connectionId: connection.id,
      track: event.track,
      calendarId,
      externalEventId,
      lastSeenAt: new Date(),
    },
    create: {
      connectionId: connection.id,
      track: event.track,
      calendarId,
      externalEventId,
      calendarEventId: event.id,
      lastSeenAt: new Date(),
    },
  });

  return { synced: true, mode: "created" as const };
}

export async function removeTrackEventFromOutlook(calendarEventId: string) {
  const syncRow = await prisma.outlookTrackCalendarSync.findUnique({
    where: { calendarEventId },
    include: { connection: true },
  });

  if (!syncRow) {
    return { synced: false, reason: "not_synced" as const };
  }

  const { accessToken } = await getValidAccessToken(syncRow.connection.id);
  try {
    await deleteOutlookTrackEvent(
      accessToken,
      syncRow.calendarId,
      syncRow.externalEventId
    );
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (!message.includes("(404)")) {
      throw error;
    }
  }

  await prisma.outlookTrackCalendarSync.delete({
    where: { id: syncRow.id },
  });
  return { synced: true, mode: "deleted" as const };
}

export async function handleOutlookWebhookNotification(
  notification: OutlookWebhookNotification
) {
  const subscriptionId = notification.subscriptionId?.trim();
  if (!subscriptionId) {
    return { handled: false, reason: "missing_subscription" as const };
  }

  const connection = await prisma.outlookCalendarConnection.findFirst({
    where: { webhookSubscriptionId: subscriptionId },
  });

  if (!connection) {
    return { handled: false, reason: "unknown_subscription" as const };
  }

  if (
    connection.webhookClientState &&
    notification.clientState &&
    notification.clientState !== connection.webhookClientState
  ) {
    return { handled: false, reason: "client_state_mismatch" as const };
  }

  const externalEventId = extractExternalEventIdFromResource(notification.resource);
  if (!externalEventId) {
    await syncOutlookCalendarForUser(connection.userId, { force: true });
    return { handled: true, mode: "full_sync" as const, userId: connection.userId };
  }

  if (notification.changeType?.toLowerCase() === "deleted") {
    const syncRow = await prisma.outlookCalendarSync.findFirst({
      where: {
        connectionId: connection.id,
        externalEventId,
      },
    });

    if (syncRow) {
      await prisma.$transaction([
        prisma.outlookCalendarSync.delete({
          where: { id: syncRow.id },
        }),
        prisma.personalCalendarEvent.delete({
          where: { id: syncRow.personalEventId },
        }),
      ]);
    }

    await prisma.outlookCalendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), syncError: null },
    });

    return { handled: true, mode: "deleted" as const, userId: connection.userId };
  }

  const { accessToken } = await getValidAccessToken(connection.id);
  const graphEvent = await fetchOutlookEventById(
    accessToken,
    connection.calendarId ?? "primary",
    externalEventId
  );

  await upsertLocalPersonalEventFromGraph(connection.id, connection.userId, graphEvent);
  await prisma.outlookCalendarConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date(), syncError: null },
  });

  return { handled: true, mode: "upserted" as const, userId: connection.userId };
}

export async function handleOutlookTrackWebhookNotification(
  notification: OutlookWebhookNotification
) {
  const subscriptionId = notification.subscriptionId?.trim();
  if (!subscriptionId) {
    return { handled: false, reason: "missing_subscription" as const };
  }

  const subscription = await prisma.outlookTrackCalendarSubscription.findUnique({
    where: { subscriptionId },
    include: { connection: true },
  });

  if (!subscription) {
    return { handled: false, reason: "unknown_subscription" as const };
  }

  if (notification.clientState !== subscription.clientState) {
    return { handled: false, reason: "client_state_mismatch" as const };
  }

  const externalEventId = extractExternalEventIdFromResource(notification.resource);
  if (!externalEventId) {
    return { handled: false, reason: "missing_external_event_id" as const };
  }

  const existing = await prisma.outlookTrackCalendarSync.findFirst({
    where: {
      connectionId: subscription.connectionId,
      calendarId: subscription.calendarId,
      externalEventId,
    },
  });

  if (!existing) {
    return { handled: false, reason: "not_linked" as const };
  }

  if (notification.changeType?.toLowerCase() === "deleted") {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: existing.calendarEventId },
      select: { id: true, orderId: true, track: true },
    });

    await prisma.outlookTrackCalendarSync.delete({
      where: { id: existing.id },
    });

    if (event) {
      await prisma.$transaction(async (tx) => {
        await tx.calendarEvent.delete({ where: { id: event.id } });
        await tx.orderTrack.updateMany({
          where: { orderId: event.orderId, track: event.track },
          data: { plannedStartAt: null, plannedEndAt: null },
        });
      });
    }

    return { handled: true, mode: "deleted" as const, track: subscription.track };
  }

  const { accessToken } = await getValidAccessToken(subscription.connection.id);
  const graphEvent = await fetchOutlookEventById(
    accessToken,
    subscription.calendarId,
    externalEventId
  );

  const start = parseGraphDateTime(graphEvent.start, Boolean(graphEvent.isAllDay));
  const end = parseGraphDateTime(graphEvent.end, Boolean(graphEvent.isAllDay));
  if (!start || !end) {
    return { handled: false, reason: "invalid_datetime" as const };
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.calendarEvent.update({
      where: { id: existing.calendarEventId },
      data: {
        title: graphEvent.subject?.trim() || "Kalenderhändelse",
        notes: buildSyncedNotes(graphEvent),
        start,
        end,
      },
      select: { orderId: true, track: true },
    });

    await tx.orderTrack.updateMany({
      where: { orderId: updated.orderId, track: updated.track },
      data: { plannedStartAt: start, plannedEndAt: end },
    });

    await tx.outlookTrackCalendarSync.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date() },
    });
  });

  return { handled: true, mode: "updated" as const, track: subscription.track };
}

export async function syncOutlookCalendarForUser(
  userId: string,
  options?: { force?: boolean }
): Promise<SyncResult> {
  let connection;
  try {
    connection = await prisma.outlookCalendarConnection.findUnique({
      where: { userId },
      include: {
        syncedEvents: {
          include: {
            personalEvent: true,
          },
        },
      },
    });
  } catch (error) {
    if (isOutlookSchemaMissingError(error)) {
      return { connected: false, skipped: true, created: 0, updated: 0, deleted: 0 };
    }
    throw error;
  }

  if (!connection) {
    return { connected: false, created: 0, updated: 0, deleted: 0 };
  }

  if (!isOutlookConfigured()) {
    await prisma.outlookCalendarConnection.update({
      where: { id: connection.id },
      data: {
        syncError:
          "Outlook integration is missing required environment variables on this deployment.",
      },
    });
    return { connected: true, skipped: true, created: 0, updated: 0, deleted: 0 };
  }

  const lastSyncMs = connection.lastSyncedAt?.getTime() ?? 0;
  if (!options?.force && lastSyncMs > Date.now() - OUTLOOK_SYNC_MIN_INTERVAL_MS) {
    return { connected: true, skipped: true, created: 0, updated: 0, deleted: 0 };
  }

  try {
    const { accessToken } = await getValidAccessToken(connection.id);
    const { events, rangeStart, rangeEnd } = await fetchCalendarViewEvents(
      accessToken,
      connection.calendarId ?? "primary"
    );

    const existingByExternalId = new Map(
      connection.syncedEvents.map((item) => [item.externalEventId, item])
    );
    const seenExternalIds = new Set<string>();
    let created = 0;
    let updated = 0;

    for (const event of events) {
      const externalEventId = event.id?.trim();
      if (!externalEventId || event.isCancelled) continue;

      const isAllDay = Boolean(event.isAllDay);
      const start = parseGraphDateTime(event.start, isAllDay);
      const end = parseGraphDateTime(event.end, isAllDay);
      if (!start || !end) continue;

      seenExternalIds.add(externalEventId);
      const title = event.subject?.trim() || "Outlook-händelse";
      const notes = buildSyncedNotes(event);
      const existing = existingByExternalId.get(externalEventId);

      if (existing) {
        await prisma.personalCalendarEvent.update({
          where: { id: existing.personalEventId },
          data: {
            title,
            notes,
            allDay: isAllDay,
            start,
            end,
            track: Track.B,
            visibility: EventVisibility.PERSONAL,
            ownerUserId: userId,
          },
        });

        await prisma.outlookCalendarSync.update({
          where: { id: existing.id },
          data: {
            externalICalUId: event.iCalUId ?? existing.externalICalUId,
            lastSeenAt: new Date(),
          },
        });

        updated += 1;
        continue;
      }

      const personalEvent = await prisma.personalCalendarEvent.create({
        data: {
          track: Track.B,
          title,
          label: null,
          notes,
          allDay: isAllDay,
          start,
          end,
          visibility: EventVisibility.PERSONAL,
          ownerUserId: userId,
        },
      });

      await prisma.outlookCalendarSync.create({
        data: {
          connectionId: connection.id,
          externalEventId,
          externalICalUId: event.iCalUId ?? null,
          personalEventId: personalEvent.id,
          lastSeenAt: new Date(),
        },
      });

      created += 1;
    }

    const staleItems = connection.syncedEvents.filter((item) => {
      if (seenExternalIds.has(item.externalEventId)) return false;
      const start = item.personalEvent.start;
      const end = item.personalEvent.end ?? start ?? null;
      if (!start) return true;
      if (!end) return true;
      return start <= rangeEnd && end >= rangeStart;
    });

    if (staleItems.length) {
      await prisma.$transaction([
        prisma.outlookCalendarSync.deleteMany({
          where: {
            id: { in: staleItems.map((item) => item.id) },
          },
        }),
        prisma.personalCalendarEvent.deleteMany({
          where: {
            id: { in: staleItems.map((item) => item.personalEventId) },
          },
        }),
      ]);
    }

    await prisma.outlookCalendarConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncedAt: new Date(),
        syncError: null,
      },
    });

    return {
      connected: true,
      created,
      updated,
      deleted: staleItems.length,
    };
  } catch (error: any) {
    const message = String(error?.message ?? "Outlook sync failed");
    await prisma.outlookCalendarConnection.update({
      where: { id: connection.id },
      data: {
        syncError: message,
      },
    });
    throw error;
  }
}

export async function upsertPersonalEventToOutlook(personalEventId: string) {
  const event = await prisma.personalCalendarEvent.findUnique({
    where: { id: personalEventId },
    include: {
      outlookSync: true,
    },
  });

  if (!event) {
    return { synced: false, reason: "missing_event" as const };
  }

  if (event.visibility !== EventVisibility.PERSONAL || !event.ownerUserId) {
    return { synced: false, reason: "not_personal" as const };
  }

  if (!isOutlookConfigured()) {
    return { synced: false, reason: "not_configured" as const };
  }

  let connection;
  try {
    connection = await prisma.outlookCalendarConnection.findUnique({
      where: { userId: event.ownerUserId },
    });
  } catch (error) {
    if (isOutlookSchemaMissingError(error)) {
      return { synced: false, reason: "schema_missing" as const };
    }
    throw error;
  }

  if (!connection) {
    return { synced: false, reason: "not_connected" as const };
  }

  const { accessToken } = await getValidAccessToken(connection.id);
  const calendarId = connection.calendarId ?? "primary";

  if (event.outlookSync?.externalEventId) {
    try {
      await updateOutlookEvent(
        accessToken,
        calendarId,
        event.outlookSync.externalEventId,
        event
      );

      await prisma.outlookCalendarSync.update({
        where: { id: event.outlookSync.id },
        data: {
          lastSeenAt: new Date(),
        },
      });

      await prisma.outlookCalendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date(), syncError: null },
      });

      return { synced: true, mode: "updated" as const };
    } catch (error: any) {
      const message = String(error?.message ?? "");
      if (!message.includes("(404)")) {
        await prisma.outlookCalendarConnection.update({
          where: { id: connection.id },
          data: { syncError: message },
        });
        throw error;
      }
    }
  }

  const created = await createOutlookEvent(accessToken, calendarId, event);
  const externalEventId = created.id?.trim();

  if (!externalEventId) {
    throw new Error("Outlook did not return an event id.");
  }

  await prisma.outlookCalendarSync.upsert({
    where: { personalEventId: event.id },
    update: {
      connectionId: connection.id,
      externalEventId,
      externalICalUId: created.iCalUId ?? null,
      lastSeenAt: new Date(),
    },
    create: {
      connectionId: connection.id,
      externalEventId,
      externalICalUId: created.iCalUId ?? null,
      personalEventId: event.id,
      lastSeenAt: new Date(),
    },
  });

  await prisma.outlookCalendarConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date(), syncError: null },
  });

  return { synced: true, mode: "created" as const };
}

export async function removePersonalEventFromOutlook(personalEventId: string) {
  let syncRow;
  try {
    syncRow = await prisma.outlookCalendarSync.findUnique({
      where: { personalEventId },
      include: {
        connection: true,
      },
    });
  } catch (error) {
    if (isOutlookSchemaMissingError(error)) {
      return { synced: false, reason: "schema_missing" as const };
    }
    throw error;
  }

  if (!syncRow) {
    return { synced: false, reason: "not_synced" as const };
  }

  if (!isOutlookConfigured()) {
    return { synced: false, reason: "not_configured" as const };
  }

  const { accessToken } = await getValidAccessToken(syncRow.connection.id);
  const calendarId = syncRow.connection.calendarId ?? "primary";

  try {
    await deleteOutlookEvent(accessToken, calendarId, syncRow.externalEventId);
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (!message.includes("(404)")) {
      await prisma.outlookCalendarConnection.update({
        where: { id: syncRow.connection.id },
        data: { syncError: message },
      });
      throw error;
    }
  }

  await prisma.outlookCalendarSync.delete({
    where: { id: syncRow.id },
  });

  await prisma.outlookCalendarConnection.update({
    where: { id: syncRow.connection.id },
    data: { lastSyncedAt: new Date(), syncError: null },
  });

  return { synced: true, mode: "deleted" as const };
}
