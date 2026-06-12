import type { Metadata } from "next";
import ComponentLabClient from "./ComponentLabClient";

export const metadata: Metadata = {
  title: "Component Lab",
  description: "Test page for all components",
};

export default function ComponentLabPage() {
  return <ComponentLabClient />;
}

