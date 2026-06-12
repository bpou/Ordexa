"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastVariants = {
  initial: { opacity: 0, x: 300, scale: 0.3 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } },
};

const progressVariants = {
  initial: { width: "100%" },
  animate: { width: "0%" },
};

const typeStyles = {
  success: "bg-green-500 text-white",
  error: "bg-red-500 text-white",
  warning: "bg-yellow-500 text-black",
  info: "bg-blue-500 text-white",
};

export function Toast({
  id,
  type,
  title,
  description,
  duration = 5000,
  onClose,
}: ToastProps) {
  const [progress, setProgress] = useState(100);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, ((duration - elapsed) / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onClose(id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, id, onClose]);

  const handleClose = () => {
    onClose(id);
  };

  return (
    <motion.div
      layout
      variants={shouldReduceMotion ? {} : toastVariants}
      initial={shouldReduceMotion ? {} : "initial"}
      animate={shouldReduceMotion ? {} : "animate"}
      exit={shouldReduceMotion ? {} : "exit"}
      className={cn(
        "relative flex items-start gap-3 rounded-lg p-4 shadow-lg min-w-[320px] max-w-[480px]",
        typeStyles[type]
      )}
    >
      <div className="flex-1">
        <div className="font-semibold text-sm">{title}</div>
        {description && (
          <div className="text-sm opacity-90 mt-1">{description}</div>
        )}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
        aria-label="Close toast"
      >
        <X size={16} />
      </button>
      {duration > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-lg"
          variants={shouldReduceMotion ? {} : progressVariants}
          initial={shouldReduceMotion ? {} : "initial"}
          animate={shouldReduceMotion ? {} : "animate"}
          transition={{ duration: duration / 1000, ease: "linear" }}
        />
      )}
    </motion.div>
  );
}

export function ToastContainer({ toasts, onClose }: {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence mode={shouldReduceMotion ? "sync" : "popLayout"}>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}