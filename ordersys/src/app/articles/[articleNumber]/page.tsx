import { notFound } from "next/navigation";
import { getFortnoxArticle } from "@/lib/fortnox";
import ArticleDetailClient from "./ArticleDetailClient";

type ArticleDetailPageProps = {
  params: { articleNumber: string };
};

export const dynamic = "force-dynamic";

export default async function ArticleDetailPage({
  params,
}: ArticleDetailPageProps) {
  const articleNumber = decodeURIComponent(params?.articleNumber ?? "").trim();
  if (!articleNumber) {
    notFound();
  }

  try {
    const article = await getFortnoxArticle({ articleNumber });
    return (
      <main className="min-h-[calc(100vh-6rem)] px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-8xl space-y-6">
          <ArticleDetailClient
            articleNumber={articleNumber}
            initialArticle={article}
          />
        </div>
      </main>
    );
  } catch (error) {
    console.error(
      "[ArticleDetailPage] Failed to load article",
      articleNumber,
      error
    );
    notFound();
  }
}

