import React, { useState } from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/cn';

type ValidationState = 'idle' | 'error' | 'success';

type AnimatedFieldProps = {
  label: string;
  className?: string;
  children?: React.ReactNode;
  validationState?: ValidationState;
  validationMessage?: string;
};

export function AnimatedField({
  label,
  className,
  children,
  validationState = 'idle',
  validationMessage
}: AnimatedFieldProps) {
  return (
    <motion.label
      className={cn("flex flex-col gap-1", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        className="text-[13px] text-foreground/80"
        animate={{
          color: validationState === 'error' ? '#ef4444' : validationState === 'success' ? '#22c55e' : undefined
        }}
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.span>
      {children}
      <AnimatePresence>
        {validationMessage && (
          <motion.span
            className={cn(
              "text-[12px] mt-1",
              validationState === 'error' && "text-red-500",
              validationState === 'success' && "text-green-500"
            )}
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {validationMessage}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.label>
  );
}

type AnimatedInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  validationState?: ValidationState;
};

export function AnimatedInput({ validationState = 'idle', className, ...props }: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.input
      {...(props as any)}
      className={cn(
        "h-7 rounded-md border bg-white/90 px-2 text-[13px] shadow-[inset_0_1px_0_rgba(0,0,0,.03)]",
        "placeholder:text-muted/70 focus:outline-none",
        validationState === 'error' && "border-red-500",
        validationState === 'success' && "border-green-500",
        className
      )}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      animate={{
        scale: isFocused ? 1.02 : 1,
        boxShadow: isFocused
          ? "0 0 0 2px rgba(59, 130, 246, 0.5)"
          : validationState === 'error'
          ? "0 0 0 2px rgba(239, 68, 68, 0.5)"
          : validationState === 'success'
          ? "0 0 0 2px rgba(34, 197, 94, 0.5)"
          : undefined
      }}
      transition={{ duration: 0.2 }}
      whileFocus={{
        x: validationState === 'error' ? [0, -5, 5, -5, 5, 0] : 0
      }}
      whileTap={{ scale: 0.98 }}
    />
  );
}

type AnimatedSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  validationState?: ValidationState;
};

export function AnimatedSelect({ validationState = 'idle', className, ...props }: AnimatedSelectProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.select
      {...(props as any)}
      className={cn(
        "h-7 rounded-md border bg-white/90 px-2 text-[13px]",
        "focus:outline-none",
        validationState === 'error' && "border-red-500",
        validationState === 'success' && "border-green-500",
        className
      )}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      animate={{
        scale: isFocused ? 1.02 : 1,
        boxShadow: isFocused
          ? "0 0 0 2px rgba(59, 130, 246, 0.5)"
          : validationState === 'error'
          ? "0 0 0 2px rgba(239, 68, 68, 0.5)"
          : validationState === 'success'
          ? "0 0 0 2px rgba(34, 197, 94, 0.5)"
          : undefined
      }}
      transition={{ duration: 0.2 }}
      whileFocus={{
        x: validationState === 'error' ? [0, -5, 5, -5, 5, 0] : 0
      }}
      whileTap={{ scale: 0.98 }}
    />
  );
}