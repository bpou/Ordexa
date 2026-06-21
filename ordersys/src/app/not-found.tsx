import Link from "next/link";
import { SearchX } from "lucide-react";

import { ProductEmptyState, ProductPage, ProductSection } from "@/components/product-ui";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <ProductPage className="py-10">
      <ProductSection>
        <ProductEmptyState
          icon={SearchX}
          title="Sidan finns inte"
          description="Länken kan vara gammal eller så har innehållet flyttats."
          action={<Button asChild variant="default" className="rounded-xl"><Link href="/">Till översikten</Link></Button>}
        />
      </ProductSection>
    </ProductPage>
  );
}
