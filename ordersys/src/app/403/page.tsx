export default function ForbiddenPage() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="rounded-xl border bg-white p-8 shadow">
        <h1 className="text-xl font-semibold">Åtkomst nekad</h1>
        <p className="mt-2 text-neutral-600">Du har inte behörighet att visa den här sidan.</p>
      </div>
    </div>
  );
}
