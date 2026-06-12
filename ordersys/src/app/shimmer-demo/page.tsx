import { ShimmerDemo } from "@/components/ShimmerDemo";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shimmer Animation Demo",
  description: "Demo of the fixed pill shimmer animation effect",
};

export default function ShimmerDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <ShimmerDemo />
      </div>
    </div>
  );
}