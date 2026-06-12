import ArchivedClient from "./ArchivedClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ArchivedPage() {
  return <ArchivedClient />;
}