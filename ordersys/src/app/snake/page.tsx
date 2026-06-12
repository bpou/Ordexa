"use client";
import { useState } from "react";
import OrdinaLoader, { OrdinaLogoSpinner } from "@/components/OrdinaLoader";

export default function OrdinaLoaderDemoPage() {
  const [show, setShow] = useState(true);
  const [ring, setRing] = useState(true);
  const [size, setSize] = useState(112);
  const [bg, setBg] = useState("bg-black");

  const startFakeLoad = (ms = 2000) => {
    setShow(true);
    setTimeout(() => setShow(false), ms);
  };

  return (
    <main className="min-h-screen bg-neutral-100 text-black p-6 flex flex-col gap-8 transition-colors duration-200">
      <header className="max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-semibold tracking-tight">Ordina Loader – Demo</h1>
        <p className="text-black/70 mt-2">
          Toggle options below and preview both the full-screen overlay and the inline spinner.
        </p>
      </header>

      {/* Controls */}
      <section className="max-w-4xl mx-auto w-full grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-black/10 p-4 bg-white/70 backdrop-blur-sm">
          <h2 className="text-xl font-medium mb-3">Controls</h2>

          <div className="flex items-center justify-between py-2">
            <label className="text-black/80">Show overlay</label>
            <button
              className="px-3 py-1.5 rounded-xl bg-black/10 hover:bg-black/20 transition"
              onClick={() => setShow((s) => !s)}
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <label className="text-black/80">Orbiting ring</label>
            <button
              className="px-3 py-1.5 rounded-xl bg-black/10 hover:bg-black/20 transition"
              onClick={() => setRing((r) => !r)}
            >
              {ring ? "On" : "Off"}
            </button>
          </div>

          <div className="py-2">
            <label className="text-black/80">Logo size: {size}px</label>
            <input
              type="range"
              min={64}
              max={192}
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-full accent-black"
            />
          </div>

          <div className="py-2">
            <label className="text-black/80">Background</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[
                { k: "bg-black", label: "Black" },
                { k: "bg-neutral-900", label: "Neutral" },
                { k: "bg-white", label: "White" },
                { k: "bg-transparent", label: "Clear" },
              ].map((opt) => (
                <button
                  key={opt.k}
                  onClick={() => setBg(opt.k)}
                  className={`px-3 py-1.5 rounded-xl border ${
                    bg === opt.k
                      ? "border-black/80 bg-black/10"
                      : "border-black/10 bg-black/5"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => startFakeLoad(1500)}
              className="px-3 py-1.5 rounded-xl bg-black text-white"
            >
              Start 1.5s load
            </button>
            <button
              onClick={() => startFakeLoad(3000)}
              className="px-3 py-1.5 rounded-xl bg-black/10 hover:bg-black/20 transition"
            >
              Start 3s load
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 p-4 bg-white/70 backdrop-blur-sm">
          <h2 className="text-xl font-medium mb-3">Inline preview</h2>
          <div className="flex items-center gap-4">
            <OrdinaLogoSpinner size={size / 2} ring={ring} />
            <span className="text-black/70">Loading content…</span>
          </div>
          <p className="text-black/60 mt-4 text-sm">
            Use this compact spinner within buttons, cards, or list items.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto w-full">
        <div className="rounded-2xl border border-black/10 p-6 bg-white/70 backdrop-blur-sm">
          <h2 className="text-xl font-medium mb-3">Overlay preview</h2>
          <p className="text-black/70">
            The full-screen overlay will appear over this page when <code>show</code> is true.
          </p>
        </div>
      </section>

      {/* The overlay itself */}
      <OrdinaLoader show={show} logoSrc="/N.svg" ring={ring} background={bg} />
    </main>
  );
}
