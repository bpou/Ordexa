"use client";

import React from "react";

import { Spinner } from "@/components/ui/spinner";

type LoaderProps = {
  show?: boolean;
  logoSrc?: string;
  background?: string; // Tailwind class or custom color
  blur?: boolean;
  ring?: boolean;
};

const OrdinaLoader: React.FC<LoaderProps> = ({
  show = true,
  logoSrc = "/N.svg",
  background = "bg-transparent",
  blur = false,
  ring = true,
}) => {
  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none ${background} ${
        blur ? "backdrop-blur-sm" : ""
      }`}
      aria-label="Loading"
      role="status"
    >
      <OrdinaLogoSpinner size={48} logoSrc={logoSrc} ring={ring} />
    </div>
  );
};

export const OrdinaLogoSpinner: React.FC<{
  logoSrc?: string;
  size?: number;
  ring?: boolean;
}> = ({ logoSrc = "/N.svg", size = 56, ring = true }) => (
  <div className="inline-flex items-center justify-center" aria-label="Loading" data-logo-src={logoSrc}>
    <Spinner
      className="text-[var(--color-brand-500)]"
      style={{ width: size, height: size, opacity: ring ? 1 : 0.7 }}
    />
  </div>
);

export default OrdinaLoader;
