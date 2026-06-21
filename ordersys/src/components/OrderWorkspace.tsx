"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, ClipboardCheck, MessageSquareText, Plus, Send, Trash2 } from "lucide-react";

import { ProductEmptyState, ProductSection } from "@/components/product-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  createdByName: string;
  createdAt: string;
};

type Comment = {
  id: string;
  body: string;
  authorName: string;
  authorImage: string | null;
  createdAt: string;
};

export default function OrderWorkspace({ orderId }: { orderId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/workspace`, { cache: "no-store" });
    if (!response.ok) throw new Error("Arbetsytan kunde inte hämtas.");
    const data = (await response.json()) as { tasks?: Task[]; comments?: Comment[] };
    setTasks(data.tasks ?? []);
    setComments(data.comments ?? []);
  }, [orderId]);

  useEffect(() => {
    let active = true;
    void load()
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "Tekniskt fel."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  async function create(kind: "task" | "comment") {
    const value = kind === "task" ? taskTitle.trim() : commentBody.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/workspace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "task" ? { kind, title: value } : { kind, body: value }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Kunde inte spara.");
      if (kind === "task") setTaskTitle("");
      else setCommentBody("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tekniskt fel.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTask(task: Task) {
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item));
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/workspace`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, completed: !task.completed }),
    });
    if (!response.ok) await load();
  }

  async function deleteTask(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/workspace?taskId=${encodeURIComponent(taskId)}`, {
      method: "DELETE",
    });
    if (!response.ok) await load();
  }

  const completed = tasks.filter((task) => task.completed).length;

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1.08fr]">
      <ProductSection className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden /> Checklista
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{completed} av {tasks.length} klara</p>
          </div>
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
            {tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%
          </span>
        </div>
        <div className="p-4 sm:p-5">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void create("task");
            }}
          >
            <input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Lägg till nästa steg…"
              className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
            <Button type="submit" variant="default" size="icon" className="rounded-xl" disabled={!taskTitle.trim() || busy} aria-label="Lägg till uppgift">
              <Plus />
            </Button>
          </form>

          {loading ? <div className="mt-4 h-24 animate-pulse rounded-xl bg-muted" /> : null}
          {!loading && tasks.length === 0 ? (
            <ProductEmptyState icon={CheckCircle2} title="Ingen checklista ännu" description="Lägg till konkreta nästa steg så att alla vet vad som återstår." />
          ) : null}
          <div className="mt-4 space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="group flex items-start gap-3 rounded-xl border border-border/80 bg-background/60 p-3 transition hover:border-primary/25">
                <button type="button" onClick={() => void toggleTask(task)} className="mt-0.5 text-muted-foreground transition hover:text-primary" aria-label={task.completed ? "Återöppna uppgift" : "Slutför uppgift"}>
                  {task.completed ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium text-foreground", task.completed && "text-muted-foreground line-through")}>{task.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{task.createdByName}</p>
                </div>
                <button type="button" onClick={() => void deleteTask(task.id)} className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100" aria-label="Ta bort uppgift">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </ProductSection>

      <ProductSection className="overflow-hidden">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareText className="h-4 w-4 text-primary" aria-hidden /> Teamdialog
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Beslut och frågor kopplade till ordern.</p>
        </div>
        <div className="p-4 sm:p-5">
          <form
            className="rounded-2xl border border-input bg-background p-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10"
            onSubmit={(event) => {
              event.preventDefault();
              void create("comment");
            }}
          >
            <textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              rows={3}
              placeholder="Skriv en uppdatering till teamet…"
              className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="flex justify-end border-t border-border/70 pt-2">
              <Button type="submit" variant="default" size="sm" className="rounded-xl" disabled={!commentBody.trim() || busy}>
                Skicka <Send />
              </Button>
            </div>
          </form>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

          {!loading && comments.length === 0 ? (
            <ProductEmptyState icon={MessageSquareText} title="Dialogen är tom" description="Skriv den första uppdateringen eller frågan om ordern." />
          ) : null}
          <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {comments.map((comment) => (
              <article key={comment.id} className="flex gap-3 rounded-xl bg-muted/45 p-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/12 text-xs font-semibold text-primary">
                  {comment.authorImage ? <img src={comment.authorImage} alt="" className="h-full w-full object-cover" /> : comment.authorName.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-sm font-semibold text-foreground">{comment.authorName}</p>
                    <time className="text-[11px] text-muted-foreground">{new Date(comment.createdAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}</time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-foreground/85">{comment.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </ProductSection>
    </section>
  );
}
