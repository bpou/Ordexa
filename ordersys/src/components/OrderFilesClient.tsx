"use client";

import { useCallback, useState } from "react";
import { useOrderRealtime } from "@/lib/useOrderRealtime";

type Props = { orderId: string; initialFiles?: any[] };

export default function OrderFilesClient({ orderId, initialFiles = [] }: Props) {
  const [files, setFiles] = useState<any[]>(initialFiles);

  const onFileCreated = useCallback((f: any) => {
    setFiles((prev) => [f, ...prev]);
  }, []);

  useOrderRealtime(orderId, onFileCreated);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/orders/${orderId}/files`, { method: "POST", body: form });
    if (!res.ok) {
      // valfri toast
      console.error("Upload failed");
    }
    (e.currentTarget as HTMLFormElement).reset();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleUpload} className="flex items-center gap-3">
        <input name="file" type="file" required />
        <button className="px-4 py-2 rounded-xl shadow">Ladda upp</button>
      </form>

      <ul className="space-y-2">
        {files.map((f) => (
          <li key={`${f.url}-${f.createdAt}`} className="p-3 rounded-xl shadow">
            <div className="font-medium">{f.name}</div>
            <div className="text-sm opacity-70">
              {(f.size / 1024).toFixed(1)} kB • {f.type}
            </div>
            <a className="underline text-sm" href={f.url} target="_blank" rel="noreferrer">
              Öppna
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
