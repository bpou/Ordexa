import Image from "next/image";
import Link from "next/link";

const columns = [
  { title: "Produkt", links: ["Order", "Kalender", "Produktion", "Fortnox"] },
  { title: "Företag", links: ["Om Ordexa", "Kontakt", "Demo"] },
  { title: "Juridiskt", links: ["Integritet", "Villkor", "Cookies", "Säkerhet"] },
] as const;

function getFooterHref(label: string) {
  if (label === "Integritet") return "/integritet";
  if (label === "Villkor") return "/villkor";
  if (label === "Cookies") return "/cookies";
  if (label === "Säkerhet") return "/sakerhet";
  return "#";
}

export default function Footer() {
  return (
    <footer className="border-t border-brand-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <Link href="/" aria-label="Gå till startsidan" className="inline-flex items-center leading-none transition hover:opacity-90">
            <Image
              src="/logo.png"
              alt="Ordina"
              width={175}
              height={30}
              className="block object-contain"
            />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-neutral-600">
            Ordexa samlar order, planering, filer och överlämningar för svenska produktionsflöden.
          </p>
          <p className="mt-6 text-sm text-neutral-500">
            © {new Date().getFullYear()} Ordexa. Alla rättigheter förbehållna.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-neutral-950">{column.title}</h3>
              <div className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <Link key={link} href={getFooterHref(link)} className="block text-sm text-neutral-600 hover:text-brand-800">
                    {link}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
