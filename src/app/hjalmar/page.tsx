'use client';

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Flame, Mail, Phone, Rocket, Sparkles } from "lucide-react";

const statHighlights = [
  { label: "Rocket stoves levererade", value: "392" },
  { label: "År av prototypande", value: "14+" },
  { label: "Återvunnen värme per år", value: "1.8 GWh" },
];

const timeline = [
  {
    year: "2012",
    title: "Fjällidéerna",
    description:
      "Hjalmar skissar första värmekärnan under midnattsol i Umeå och gör sina egna materialtester i ett gammalt garage.",
  },
  {
    year: "2017",
    title: "Aurora Forge Series",
    description:
      "Lanserar modulära rocket stoves med keramisk aerogel och öppnar sitt mikrolabb längs Umeälven.",
  },
  {
    year: "2024",
    title: "Nebula Reactors",
    description:
      "Integrerar AI-styrd förbränningslogik, realtidsdata i molnet och utsläpp så låga att Norrlands skogar blir extra stolta.",
  },
];

const gallery = [
  {
    title: "Aurora Core v5",
    description: "Transparent flödeskanal + polarisationsglas.",
    image: "/hjalmar-aurora.svg",
  },
  {
    title: "Nebula Lab",
    description: "Roterande testbädd med IR-kameror och drönarsyn.",
    image: "/hjalmar-lab.svg",
  },
  {
    title: "Solar Forge",
    description: "Hybridugn som lirar med midnattssolen.",
    image: "/hjalmar-forge.svg",
  },
];

const contactActions = [
  {
    label: "Skriv till Hjalmar",
    href: "mailto:hej@hjalmarsrocket.se",
    icon: Mail,
  },
  {
    label: "Ring laboratoriet",
    href: "tel:+4690123456",
    icon: Phone,
  },
];

const floatingBadges = [
  { emoji: "🚀", text: "Plasmaglimmande munstycken" },
  { emoji: "🔥", text: "98% förbränningseffektivitet" },
  { emoji: "🧊", text: "Umeås kalla luft → varmt hem" },
  { emoji: "🌌", text: "Aurorainsprutad design" },
];

export default function HjalmarPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712] text-white">
      <AnimatedBackground />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 py-16 sm:px-10 lg:py-24">
        <Hero />
        <Biography />
        <Timeline />
        <Gallery />
        <Contact />
      </main>
    </div>
  );
}

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <motion.div
        className="absolute left-[-10%] top-[-5%] h-80 w-80 rounded-full bg-pink-500/20 blur-[120px]"
        animate={{ y: [0, 40, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-5%] top-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-[120px]"
        animate={{ y: [0, -30, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,0.1),_transparent_60%)]" />
    </div>
  );
}

function Hero() {
  return (
    <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-8"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm uppercase tracking-[0.3em] text-cyan-200">
          <Sparkles className="h-4 w-4 text-cyan-300" aria-hidden="true" />
          Umeå · Rocket Stove Arkitekt
        </span>
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            Hjalmar bygger futuristiska rocket stoves som låter Norrland bo bland stjärnorna.
          </h1>
          <p className="text-lg leading-relaxed text-slate-200">
            Från sitt neonbelysta labb vid Umeälven formar han reaktorer som brinner renare, smartare och snyggare än något annat på marknaden.
            Varje stove är handkalibrerad med kvant-noggrann sensorteknik och sveps in i en design som ser importerad från Mars.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {statHighlights.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
            >
              <p className="text-2xl font-semibold text-white">{stat.value}</p>
              <p className="text-sm text-slate-300">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {contactActions.map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-gradient-to-r from-rose-500/70 to-orange-400/70 px-5 py-3 text-sm font-semibold uppercase tracking-wide shadow-[0_20px_60px_-30px_rgba(251,113,133,0.8)] transition hover:scale-[1.02]"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
          <Link
            href="/orders/new2.0"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-wide backdrop-blur transition hover:bg-white/20"
          >
            <Rocket className="h-4 w-4" aria-hidden="true" />
            Se produkterna
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative rounded-[32px] border border-white/15 bg-white/5 p-8 backdrop-blur-xl"
      >
        <motion.div
          animate={{ rotate: [0, 2, -2, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="mx-auto h-40 w-40 rounded-full border border-white/10 bg-gradient-to-b from-rose-400 via-amber-300 to-fuchsia-500 p-1 shadow-[0_30px_120px_-60px_rgba(248,113,113,1)]"
        >
          <Image
            src="https://i.pravatar.cc/400?img=68"
            alt="Hjalmar"
            width={320}
            height={320}
            className="h-full w-full rounded-full object-cover"
          />
        </motion.div>
        <div className="mt-8 space-y-4 text-center">
          <p className="text-xl font-semibold text-white">Hjalmar Nordin</p>
          <p className="text-sm uppercase tracking-[0.4em] text-rose-200">Rocket Stove Visionär</p>
          <p className="text-sm leading-relaxed text-slate-200">
            "Jag vill att varje låga ska dansa som norrskenet: fullt av energi, men kontrollerad med laserskarp precision."
          </p>
        </div>
        <div className="mt-10 grid gap-3">
          {floatingBadges.map((badge) => (
            <motion.div
              key={badge.text}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
            >
              <span className="text-lg">{badge.emoji}</span>
              {badge.text}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function Biography() {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-slate-900/80 p-8 md:p-12">
      <div className="absolute inset-y-0 right-0 w-1/2 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0.12),_transparent_60%)]" />
      </div>
      <div className="relative z-10 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.4em] text-rose-300">Biografi</p>
          <h2 className="text-3xl font-semibold text-white">Från snöhögar till hyperlabb i Umeå</h2>
          <p className="text-base leading-relaxed text-slate-100">
            Hjalmar växte upp i ett garage som alltid var kallare än utomhus. För att trotsa vintrarna byggde han sina första
            rocket stoves av tegel, återvunna radiatorer och spillmaterial från industrin i Holmsund. I dag driver han ett
            avancerat mikrofabrikationslabb, där AI-optimerade flamlinser möter hantverksmässiga svetsar.
          </p>
          <p className="text-base leading-relaxed text-slate-100">
            När han inte gjuter keramik och slipar rostfritt stål testflyger han drönare över Umeälven, mäter utsläpp i realtid
            och tar emot lokala byggare som vill ha en stove som både värmer och visar att framtiden redan är här.
          </p>
        </div>
        <div className="space-y-6">
          <FeatureCard
            title="Materialkemi + Northern vibes"
            description="Fasförändringsmaterial från återvunna satelliter möter björkfanér från Västerbotten, allt integrerat i samma kapsel."
          />
          <FeatureCard
            title="Raketer för riktiga hem"
            description="Varje stove kalibreras mot kundens planritning, väderdata och uppvärmningsbehov för att hålla jämt ljus i hela rummet."
          />
          <FeatureCard
            title="Hållbarhet på riktigt"
            description="Minimalt utsläpp, maximalt återbruk och modulära kärnor så att framtida uppgraderingar bara klickas på."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">
        <Flame className="h-4 w-4 text-rose-300" aria-hidden="true" />
        {title}
      </div>
      <p className="text-sm leading-relaxed text-slate-200">{description}</p>
    </div>
  );
}

function Timeline() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-rose-500/20 p-2 text-rose-200">
          <Rocket className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-cyan-200">Resan</p>
          <h2 className="text-3xl font-semibold text-white">En tidslinje av lågor och idéer</h2>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        {timeline.map((event, index) => (
          <motion.div
            key={event.year}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
          >
            <p className="text-sm uppercase tracking-[0.4em] text-rose-300">{event.year}</p>
            <p className="mt-4 text-xl font-semibold text-white">{event.title}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">{event.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-cyan-500/20 p-2 text-cyan-200">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-rose-200">Visuell labbjournal</p>
          <h2 className="text-3xl font-semibold text-white">Bilder från Hjalmars framtidsstudio</h2>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {gallery.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.15 }}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5"
          >
            <div className="relative h-64 w-full">
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="space-y-2 p-6">
              <p className="text-lg font-semibold text-white">{item.title}</p>
              <p className="text-sm text-slate-300">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="rounded-[32px] border border-white/10 bg-gradient-to-r from-rose-500/20 via-fuchsia-500/20 to-cyan-500/20 p-10 text-center backdrop-blur">
      <p className="text-sm uppercase tracking-[0.5em] text-white/70">Låt lågan börja</p>
      <h2 className="mt-4 text-3xl font-semibold text-white">Boka en demo i Umeå eller streama från labbet</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-100">
        Hjalmar tar emot arkitekter, byggare och värmenördar för immersiva sessioner där han tänder rocket stoves på plats,
        visar live-data och bygger mikroprototyper på 60 minuter.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {contactActions.map(({ icon: Icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-wide transition hover:bg-white/20"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
