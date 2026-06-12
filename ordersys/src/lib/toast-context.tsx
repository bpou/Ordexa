"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { ToastContainer, ToastProps, ToastType } from "@/components/ui/Toast";

interface ToastContextType {
  addToast: (toast: Omit<ToastProps, "id" | "onClose">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, "id" | "onClose">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: removeToast,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

/* eslint-disable react-hooks/rules-of-hooks */
// Convenience functions for different toast types
export const toast = {
  success: (title: string, description?: string, duration?: number) =>
    useToast().addToast({ type: "success", title, description, duration }),
  error: (title: string, description?: string, duration?: number) =>
    useToast().addToast({ type: "error", title, description, duration }),
  warning: (title: string, description?: string, duration?: number) =>
    useToast().addToast({ type: "warning", title, description, duration }),
  info: (title: string, description?: string, duration?: number) =>
    useToast().addToast({ type: "info", title, description, duration }),
};
/* eslint-enable react-hooks/rules-of-hooks */