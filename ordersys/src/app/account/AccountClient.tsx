"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Bell,
  Link2,
  Check,
  LogOut,
  Mail,
  RefreshCw,
  Upload,
  X,
  ZoomIn,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserCircle,
} from "lucide-react";
import Button from "@/components/ui/button";
import { OrdinaLogoSpinner } from "@/components/OrdinaLoader";
import { Switch } from "@/components/unlumen-ui/switch";
import {
  applyThemePreference,
  isThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

type AccountClientProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
    mfaEnabled: boolean;
  };
};

type NotificationPrefs = typeof notificationDefaults;

type TotpSetupState = {
  qrCode: string;
  manualKey: string;
};

type FortnoxConnectionStatus = {
  connected: boolean;
  tenantId: string | null;
  companyName: string | null;
  organizationNumber: string | null;
  databaseNumber: number | null;
  expiresAt: string | null;
  updatedAt: string | null;
  error?: string;
};

type OutlookConnectionStatus = {
  configured: boolean;
  connected: boolean;
  displayName: string | null;
  providerEmail: string | null;
  expiresAt: string | null;
  lastSyncedAt: string | null;
  syncError: string | null;
};

const notificationDefaults = {
  orderUpdates: true,
  calendarDigest: true,
  securityAlerts: true,
};

const notificationCopy = [
  {
    key: "orderUpdates" as const,
    label: "Orderuppdateringar",
    description: "Meddela mig när orderstatus eller filer uppdateras i mina spår.",
  },
  {
    key: "calendarDigest" as const,
    label: "Kalender",
    description: "Sammanfattning varje morgon med dagens beläggning och deadlines.",
  },
  {
    key: "securityAlerts" as const,
    label: "Säkerhet",
    description: "Snabba varningar om vi ser inloggningar eller ändringar från nya enheter.",
  },
];

const CROP_BOX_SIZE = 280;
const AVATAR_OUTPUT_SIZE = 512;

export default function AccountClient({ user }: AccountClientProps) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(notificationDefaults);
  const [theme, setTheme] = useState<ThemePreference>("light");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.image || "/default-avatar.png");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const cropDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState("profile.jpg");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });

  const [mfaEnabled, setMfaEnabled] = useState(Boolean(user.mfaEnabled));
  const [mfaStatusLoading, setMfaStatusLoading] = useState(true);
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [setup, setSetup] = useState<TotpSetupState | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [mfaMessage, setMfaMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [fortnoxBusy, setFortnoxBusy] = useState(false);
  const [fortnoxStatusLoading, setFortnoxStatusLoading] = useState(true);
  const [fortnoxStatus, setFortnoxStatus] = useState<FortnoxConnectionStatus | null>(null);
  const [outlookBusy, setOutlookBusy] = useState(false);
  const [outlookStatusLoading, setOutlookStatusLoading] = useState(true);
  const [outlookStatus, setOutlookStatus] = useState<OutlookConnectionStatus | null>(null);
  const [outlookMessage, setOutlookMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!isThemePreference(storedTheme)) {
      applyThemePreference("light");
      return;
    }

    setTheme(storedTheme);
    applyThemePreference(storedTheme);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/mfa/totp", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setMfaEnabled(Boolean(data.enabled));
        setMfaPending(Boolean(data.pending));
      } catch (error) {
        console.error("Kunde inte ladda MFA-status", error);
      } finally {
        if (!cancelled) setMfaStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/outlook/connection", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setOutlookStatus(data as OutlookConnectionStatus);
      } catch (error) {
        console.error("Kunde inte ladda Outlook-status", error);
      } finally {
        if (!cancelled) setOutlookStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/fortnox/connection", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setFortnoxStatus(data as FortnoxConnectionStatus);
      } catch (error) {
        console.error("Kunde inte ladda Fortnox-status", error);
      } finally {
        if (!cancelled) setFortnoxStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const roleLabel = useMemo(() => {
    switch (user.role) {
      case "ADMIN":
        return "Administratör";
      case "SALJARE":
        return "Säljare";
      case "A_TEAM":
        return "Ateljé/Bilmontage";
      case "B_TEAM":
        return "Verkstad/Montage";
      case "C_TEAM":
        return "Spår C";
      case "D_TEAM":
        return "Spår D";
      default:
        return user.role;
    }
  }, [user.role]);

  function togglePref(key: keyof NotificationPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleTheme(enabled: boolean) {
    const nextTheme: ThemePreference = enabled ? "dark" : "light";
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyThemePreference(nextTheme);
  }

  function openAvatarCrop(file: File | null | undefined) {
    if (!file) return;
    setAvatarMessage(null);

    if (!file.type.startsWith("image/")) {
      setAvatarMessage({ kind: "error", text: "Välj en bildfil." });
      return;
    }

    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    setCropFileName(file.name || "profile.jpg");
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeAvatarCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropFileName("profile.jpg");
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    cropDragRef.current = null;
  }

  function getCropMetrics() {
    const img = cropImageRef.current;
    if (!img?.naturalWidth || !img.naturalHeight) return null;

    const baseScale = Math.max(CROP_BOX_SIZE / img.naturalWidth, CROP_BOX_SIZE / img.naturalHeight);
    const scale = baseScale * cropZoom;
    const displayWidth = img.naturalWidth * scale;
    const displayHeight = img.naturalHeight * scale;
    return { img, scale, displayWidth, displayHeight };
  }

  function clampCropOffset(next: { x: number; y: number }) {
    const metrics = getCropMetrics();
    if (!metrics) return next;
    const maxX = Math.max(0, (metrics.displayWidth - CROP_BOX_SIZE) / 2);
    const maxY = Math.max(0, (metrics.displayHeight - CROP_BOX_SIZE) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }

  function beginCropDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: cropOffset.x,
      originY: cropOffset.y,
    };
  }

  function moveCropDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;
    if (!drag) return;
    setCropOffset(
      clampCropOffset({
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
      })
    );
  }

  function endCropDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (cropDragRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cropDragRef.current = null;
  }

  async function confirmAvatarCrop() {
    const metrics = getCropMetrics();
    if (!metrics) {
      setAvatarMessage({ kind: "error", text: "Kunde inte läsa bilden." });
      return;
    }

    const { img, scale, displayWidth, displayHeight } = metrics;
    const imageLeft = CROP_BOX_SIZE / 2 + cropOffset.x - displayWidth / 2;
    const imageTop = CROP_BOX_SIZE / 2 + cropOffset.y - displayHeight / 2;
    const sourceX = Math.max(0, (0 - imageLeft) / scale);
    const sourceY = Math.max(0, (0 - imageTop) / scale);
    const sourceSize = Math.min(CROP_BOX_SIZE / scale, img.naturalWidth - sourceX, img.naturalHeight - sourceY);

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) {
      setAvatarMessage({ kind: "error", text: "Kunde inte beskära bilden." });
      return;
    }

    context.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      AVATAR_OUTPUT_SIZE,
      AVATAR_OUTPUT_SIZE
    );

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setAvatarMessage({ kind: "error", text: "Kunde inte skapa profilbilden." });
      return;
    }

    const outputName = cropFileName.replace(/\.[^.]+$/, "") + "-square.jpg";
    closeAvatarCrop();
    await uploadAvatar(new File([blob], outputName, { type: "image/jpeg" }));
  }

  async function uploadAvatar(file: File | null | undefined) {
    if (!file) return;
    setAvatarMessage(null);

    if (!file.type.startsWith("image/")) {
      setAvatarMessage({ kind: "error", text: "Välj en bildfil." });
      return;
    }

    const form = new FormData();
    form.append("image", file);
    setAvatarUploading(true);

    try {
      const res = await fetch("/api/account/profile-image", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || typeof data?.image !== "string") {
        setAvatarMessage({ kind: "error", text: data?.error ?? "Kunde inte ladda upp bilden." });
        return;
      }

      setAvatarUrl(`${data.image}?v=${Date.now()}`);
      setAvatarMessage({ kind: "success", text: "Profilbilden uppdaterades." });
      router.refresh();
    } catch (error) {
      console.error("Profile image upload error", error);
      setAvatarMessage({ kind: "error", text: "Ett oväntat fel uppstod." });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function startSetup() {
    setMfaBusy(true);
    setMfaMessage(null);
    try {
      const res = await fetch("/api/account/mfa/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMfaMessage({ kind: "error", text: data?.error ?? "Kunde inte skapa ny kod." });
        return;
      }
      const data = (await res.json()) as TotpSetupState & { otpAuthUrl: string };
      setSetup({ qrCode: data.qrCode, manualKey: data.manualKey });
      setOtpCode("");
      setMfaPending(false);
    } catch (error) {
      console.error("TOTP start error", error);
      setMfaMessage({ kind: "error", text: "Ett oväntat fel uppstod." });
    } finally {
      setMfaBusy(false);
    }
  }

  async function verifySetup() {
    if (!setup) return;
    const token = otpCode.trim();
    if (!token) {
      setMfaMessage({ kind: "error", text: "Fyll i koden från din authenticator-app." });
      return;
    }

    setMfaBusy(true);
    setMfaMessage(null);
    try {
      const res = await fetch("/api/account/mfa/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMfaMessage({ kind: "error", text: data?.error ?? "Koden stämmer inte." });
        return;
      }
      setMfaEnabled(true);
      setSetup(null);
      setOtpCode("");
      setMfaMessage({ kind: "success", text: "Authenticator aktiverad." });
      router.refresh();
    } catch (error) {
      console.error("TOTP verify error", error);
      setMfaMessage({ kind: "error", text: "Ett oväntat fel uppstod." });
    } finally {
      setMfaBusy(false);
    }
  }

  async function disableMfa() {
    if (!window.confirm("Vill du stänga av authenticator?")) return;
    setMfaBusy(true);
    setMfaMessage(null);
    try {
      const res = await fetch("/api/account/mfa/totp", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMfaMessage({ kind: "error", text: data?.error ?? "Kunde inte avaktivera." });
        return;
      }
      setMfaEnabled(false);
      setMfaPending(false);
      setSetup(null);
      setOtpCode("");
      setMfaMessage({ kind: "success", text: "Authenticator avaktiverad." });
      router.refresh();
    } catch (error) {
      console.error("TOTP disable error", error);
      setMfaMessage({ kind: "error", text: "Ett oväntat fel uppstod." });
    } finally {
      setMfaBusy(false);
    }
  }

  function connectFortnox() {
    setFortnoxBusy(true);
    window.location.href = "/api/fortnox/oauth/start";
  }

  async function refreshOutlookStatus() {
    const res = await fetch("/api/account/outlook/connection", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Kunde inte hämta Outlook-status.");
    }
    const data = (await res.json()) as OutlookConnectionStatus;
    setOutlookStatus(data);
  }

  function connectOutlook() {
    setOutlookBusy(true);
    window.location.href = "/api/account/outlook/oauth/start";
  }

  async function syncOutlook() {
    setOutlookBusy(true);
    setOutlookMessage(null);
    try {
      const res = await fetch("/api/account/outlook/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOutlookMessage({ kind: "error", text: data?.error ?? "Kunde inte synka Outlook-kalendern." });
        return;
      }
      await refreshOutlookStatus();
      setOutlookMessage({ kind: "success", text: "Outlook-kalendern synkades." });
    } catch (error) {
      console.error("Outlook sync error", error);
      setOutlookMessage({ kind: "error", text: "Ett oväntat fel uppstod." });
    } finally {
      setOutlookBusy(false);
    }
  }

  async function disconnectOutlook() {
    if (!window.confirm("Vill du koppla bort Outlook och ta bort synkade kalenderposter?")) return;
    setOutlookBusy(true);
    setOutlookMessage(null);
    try {
      const res = await fetch("/api/account/outlook/connection", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOutlookMessage({ kind: "error", text: data?.error ?? "Kunde inte koppla bort Outlook." });
        return;
      }
      await refreshOutlookStatus();
      setOutlookMessage({ kind: "success", text: "Outlook-kopplingen togs bort." });
    } catch (error) {
      console.error("Outlook disconnect error", error);
      setOutlookMessage({ kind: "error", text: "Ett oväntat fel uppstod." });
    } finally {
      setOutlookBusy(false);
    }
  }

  const fortnoxRenewal = useMemo(() => {
    if (!fortnoxStatus?.expiresAt) return null;
    const date = new Date(fortnoxStatus.expiresAt);
    if (Number.isNaN(date.getTime())) return null;
    const now = Date.now();
    const diffMs = date.getTime() - now;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const minutes = Math.floor(diffMs / (60 * 1000));
    let remainingLabel = "";
    if (diffMs <= 0) {
      remainingLabel = "utgånget";
    } else if (minutes < 60) {
      remainingLabel = `${Math.max(1, minutes)} min kvar`;
    } else if (hours < 24) {
      remainingLabel = `${hours} h kvar`;
    } else {
      remainingLabel = `${days} dagar kvar`;
    }
    return {
      label: date.toLocaleString("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      expired: diffMs <= 0,
      days,
      remainingLabel,
    };
  }, [fortnoxStatus?.expiresAt]);

  const outlookRenewal = useMemo(() => {
    if (!outlookStatus?.expiresAt) return null;
    const date = new Date(outlookStatus.expiresAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [outlookStatus?.expiresAt]);

  const headerAnimation = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  } as const;
  const cropRenderMetrics = getCropMetrics();
  const cropDisplayWidth = cropRenderMetrics?.displayWidth ?? CROP_BOX_SIZE;
  const cropDisplayHeight = cropRenderMetrics?.displayHeight ?? CROP_BOX_SIZE;

  return (
    <motion.main initial="hidden" animate="visible" variants={headerAnimation} className="bg-background text-foreground">
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:space-y-12 sm:px-6 sm:py-16">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground sm:text-sm sm:tracking-wide">Personliga inställningar</p>
          <h1 className="text-3xl font-semibold">Mitt konto</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Hantera dina användaruppgifter, kontaktuppgifter och notiser. För ändringar som påverkar hela teamet kontaktar du Ordina-supporten så hjälper vi dig vidare.
          </p>
        </header>
        <section className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm sm:p-6">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full min-w-0 items-center gap-4 md:w-auto">
              <div className="relative h-16 w-16 shrink-0">
                <Image
                  src={avatarUrl}
                  alt={user.name || "Profil"}
                  fill
                  sizes="64px"
                  className="rounded-full border border-border object-cover"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground sm:flex">
                  <UserCircle className="h-4 w-4" aria-hidden />
                  <span className="truncate" title={user.id}>{user.id}</span>
                </div>
                <p className="truncate text-xl font-semibold text-foreground">{user.name || "Användare"}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex w-full flex-col items-stretch gap-3 md:w-auto md:items-end">
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-center text-sm text-primary md:text-left">
                Behörighet: <strong>{roleLabel}</strong>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => openAvatarCrop(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-center"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
              >
                {avatarUploading ? (
                  <>
                    <OrdinaLogoSpinner size={16} />
                    Laddar upp
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" aria-hidden />
                    Byt profilbild
                  </>
                )}
              </Button>
              {avatarMessage ? (
                <p
                  className={`text-xs ${
                    avatarMessage.kind === "error" ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {avatarMessage.text}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Kontoinformation</h2>
          <div className="grid gap-4 rounded-2xl border border-border bg-card/80 p-4 shadow-sm sm:p-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Namn</p>
              <p className="mt-1 text-sm text-foreground">{user.name || "Inte angivet"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">E-post</p>
              <p className="mt-1 text-sm text-foreground">{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Roll</p>
              <p className="mt-1 text-sm text-foreground">{roleLabel}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Användar-ID</p>
              <p className="mt-1 break-all text-xs text-foreground sm:text-sm">{user.id}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Behöver du uppdatera namn eller roll? Maila
            <a className="ml-1 text-primary hover:underline" href="mailto:support@ordina.se">
              support@ordina.se
            </a>
            så hjälper vi dig inom en arbetsdag.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-2xl font-semibold">Notifikationer</h2>
          </div>
          <div className="space-y-3">
            {notificationCopy.map((pref) => {
              const enabled = prefs[pref.key];
              return (
                <div
                  key={pref.key}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card/80 p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.description}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => togglePref(pref.key)}
                    aria-label={pref.label}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Dina val sparas lokalt just nu.</p>
        </section>

        {cropSrc ? (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Beskär profilbild</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Dra bilden och välj utsnittet som ska synas.</p>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={closeAvatarCrop} aria-label="Stäng">
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>

              <div className="mt-5 flex justify-center">
                <div
                  className="relative h-[280px] w-[280px] touch-none overflow-hidden rounded-2xl border border-border bg-neutral-100 shadow-inner"
                  onPointerDown={beginCropDrag}
                  onPointerMove={moveCropDrag}
                  onPointerUp={endCropDrag}
                  onPointerCancel={endCropDrag}
                >
                  <img
                    ref={cropImageRef}
                    src={cropSrc}
                    alt=""
                    draggable={false}
                    onLoad={() => setCropOffset((prev) => clampCropOffset(prev))}
                    className="absolute left-1/2 top-1/2 max-w-none select-none"
                    style={{
                      width: `${cropDisplayWidth}px`,
                      height: `${cropDisplayHeight}px`,
                      transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px)`,
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/10" />
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ZoomIn className="h-3.5 w-3.5" aria-hidden />
                    Zoom
                  </span>
                  <span>{Math.round(cropZoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={cropZoom}
                  onChange={(event) => setCropZoom(Number(event.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={closeAvatarCrop}>
                  Avbryt
                </Button>
                <Button type="button" variant="default" size="sm" onClick={() => void confirmAvatarCrop()} disabled={avatarUploading}>
                  <Check className="h-4 w-4" aria-hidden />
                  Spara bild
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Utseende</h2>
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-white/80 p-4 shadow-sm dark:bg-card/80">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Mörkt läge</p>
              <p className="text-xs text-muted-foreground">
                Växla mellan ljust och mörkt gränssnitt. Ditt val sparas lokalt på enheten.
              </p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
              aria-label="Mörkt läge"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-2xl font-semibold">Säkerhet</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Smartphone className="h-4 w-4" aria-hidden />
                Authenticator-app
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Koppla en authenticator-app för engångskoder vid inloggning och höjd säkerhet.
              </p>
              <div className="mt-4 space-y-3 text-sm">
                {mfaStatusLoading ? (
                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <OrdinaLogoSpinner size={20} />
                    <span>Hämtar status...</span>
                  </div>
                ) : mfaEnabled && !setup ? (
                  <>
                    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 text-xs">
                      <ShieldCheck className="h-4 w-4" aria-hidden />
                      Aktiv authenticator
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dina inloggningar skyddas av en authenticator-app. Behåll backup-koder på ett säkert ställe.
                    </p>

                    <Button variant="outline" size="sm" onClick={disableMfa} disabled={mfaBusy}>
                      {mfaBusy ? "Arbetar..." : "Avaktivera authenticator"}
                    </Button>
                  </>
                ) : setup ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Skanna QR-koden med din authenticator-app och mata sedan in koden nedan.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-xl border border-border bg-card p-2">
                        <img src={setup.qrCode} alt="QR-kod för authenticator" className="h-28 w-28 object-contain" />
                      </div>
                      <div className="space-y-2 text-xs">
                        <p className="text-muted-foreground">Manuell kod:</p>
                        <code className="inline-block rounded bg-background px-2 py-1 text-sm tracking-widest">
                          {setup.manualKey}
                        </code>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="otp-code" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Verifieringskod
                      </label>
                      <input
                        id="otp-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="default" size="sm" onClick={verifySetup} disabled={mfaBusy}>
                        {mfaBusy ? "Verifierar..." : "Bekräfta kod"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSetup(null);
                          setOtpCode("");
                        }}
                        disabled={mfaBusy}
                      >
                        Avbryt
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {mfaPending ? (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 text-xs">
                        <ShieldAlert className="h-4 w-4" aria-hidden />
                        Tidigare försök hittades. Starta om nedan.
                      </div>
                    ) : null}
                    <Button variant="default" size="sm" onClick={startSetup} disabled={mfaBusy}>
                      {mfaBusy ? "Skapar..." : "Aktivera authenticator"}
                    </Button>
                  </>
                )}

                {mfaMessage ? (
                  <p
                    className={`text-xs ${
                      mfaMessage.kind === "error" ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {mfaMessage.text}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Byt lösenord</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Kontakta din administratör för att återställa eller byta lösenord.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => (window.location.href = "mailto:support@ordina.se?subject=Byte%20av%20lösenord")}
              >
                <Mail className="h-4 w-4" aria-hidden />
                Maila supporten
              </Button>
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Fortnox</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Koppla eller koppla om er Fortnox-integration för att skapa och synka data.
              </p>
              <div className="mt-3 space-y-1 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                {fortnoxStatusLoading ? (
                  <p>Hämtar Fortnox-status...</p>
                ) : fortnoxStatus?.connected ? (
                  <>
                    <p>
                      Kopplat företag:{" "}
                      <span className="font-medium text-foreground">
                        {fortnoxStatus.companyName || "Okänt företag"}
                      </span>
                    </p>
                    {fortnoxStatus.organizationNumber ? (
                      <p>Org.nr: {fortnoxStatus.organizationNumber}</p>
                    ) : null}
                    <p>Tenant: {fortnoxStatus.tenantId || "Okänd"}</p>
                    <p>
                      Access-token går ut:{" "}
                      {fortnoxRenewal ? (
                        <span className={fortnoxRenewal.expired ? "text-red-600" : "text-foreground"}>
                          {fortnoxRenewal.label}
                          {` (${fortnoxRenewal.remainingLabel})`}
                        </span>
                      ) : (
                        "Okänt"
                      )}
                    </p>
                    <p>Förnyas automatiskt med refresh-token.</p>
                  </>
                ) : (
                  <p>Ingen aktiv Fortnox-koppling hittades.</p>
                )}
              </div>
              <Button variant="outline" size="sm" className="mt-4" onClick={connectFortnox} disabled={fortnoxBusy}>
                {fortnoxBusy
                  ? "Öppnar Fortnox..."
                  : fortnoxStatus?.connected
                    ? "Koppla om Fortnox"
                    : "Koppla Fortnox"}
              </Button>
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Outlook-kalender</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Koppla din Outlook-kalender och synka händelser till din personliga kalender i Ordexa.
              </p>
              <div className="mt-3 space-y-1 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                {outlookStatusLoading ? (
                  <p>Hämtar Outlook-status...</p>
                ) : !outlookStatus?.configured ? (
                  <p>Outlook är inte konfigurerat på den här miljön ännu.</p>
                ) : outlookStatus.connected ? (
                  <>
                    <p>
                      Konto:{" "}
                      <span className="font-medium text-foreground">
                        {outlookStatus.displayName || outlookStatus.providerEmail || "Outlook"}
                      </span>
                    </p>
                    {outlookStatus.providerEmail ? <p>E-post: {outlookStatus.providerEmail}</p> : null}
                    <p>Synkas till din personliga kalender som privata poster.</p>
                    <p>Token giltig till: {outlookRenewal || "Okänt"}</p>
                    <p>
                      Senaste synk:{" "}
                      {outlookStatus.lastSyncedAt
                        ? new Date(outlookStatus.lastSyncedAt).toLocaleString("sv-SE")
                        : "Inte synkad ännu"}
                    </p>
                    {outlookStatus.syncError ? (
                      <p className="text-red-600">Senaste fel: {outlookStatus.syncError}</p>
                    ) : null}
                  </>
                ) : (
                  <p>Ingen Outlook-koppling hittades.</p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={connectOutlook} disabled={outlookBusy || !outlookStatus?.configured}>
                  <Link2 className="h-4 w-4" aria-hidden />
                  {outlookStatus?.connected ? "Koppla om Outlook" : "Koppla Outlook"}
                </Button>
                {outlookStatus?.connected ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => void syncOutlook()} disabled={outlookBusy}>
                      <RefreshCw className="h-4 w-4" aria-hidden />
                      Synka nu
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void disconnectOutlook()} disabled={outlookBusy}>
                      Koppla bort
                    </Button>
                  </>
                ) : null}
              </div>
              {outlookMessage ? (
                <p
                  className={`mt-3 text-xs ${
                    outlookMessage.kind === "error" ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {outlookMessage.text}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Inloggade enheter</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Multi-faktor-autentisering via sms planeras. Tills dess kan du logga ut från andra enheter nedan.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={async () => {
                  await signOut({ callbackUrl: "/login" });
                }}
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Logga ut överallt
              </Button>
            </div>
          </div>
        </section>

        
      </div>
    </motion.main>
  );
}
