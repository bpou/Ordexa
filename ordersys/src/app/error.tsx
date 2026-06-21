"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { ProductEmptyState, ProductPage, ProductSection } from "@/components/product-ui";
import { Button } from "@/components/ui/button";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ProductPage className="py-10">
      <ProductSection>
        <ProductEmptyState
          icon={AlertTriangle}
          title="Något gick fel"
          description="Sidan kunde inte visas. Försök igen; om felet kvarstår finns felkoden i serverloggen."
          action={<Button onClick={reset} variant="default" className="rounded-xl"><RotateCcw /> Försök igen</Button>}
        />
      </ProductSection>
    </ProductPage>
  );
}
