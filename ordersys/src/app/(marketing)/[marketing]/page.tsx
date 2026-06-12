import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketingPageContent, MARKETING_PAGE_CONTENT } from "@/lib/marketing-pages";

type PageProps = {
  params: Promise<{ marketing: string }>;
};

export function generateStaticParams() {
  return Object.keys(MARKETING_PAGE_CONTENT).map((slug) => ({ marketing: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marketing } = await params;
  const content = getMarketingPageContent(marketing);
  if (!content) {
    return { title: "Ordina" };
  }

  return {
    title: `${content.title} | Ordina`,
    description: content.description,
  };
}

export default async function MarketingPage({ params }: PageProps) {
  const { marketing } = await params;
  const content = getMarketingPageContent(marketing);
  if (!content) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 lg:py-20">
      <header className="text-center">
        {content.kicker ? (
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {content.kicker}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">{content.title}</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">{content.description}</p>
      </header>

      {content.actions && content.actions.length > 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {content.actions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              target={action.external ? "_blank" : undefined}
              rel={action.external ? "noopener noreferrer" : undefined}
              className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground transition hover:border-brand-400 hover:text-brand-600"
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-12 space-y-10">
        {content.sections?.map((section) => (
          <section key={section.heading} className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">{section.heading}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{section.body}</p>
            {section.items && section.items.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-foreground/85">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 block h-2 w-2 rounded-full bg-brand-500" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
