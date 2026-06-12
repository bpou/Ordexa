import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ items, allowMultiple = true }) => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(index);
      }
      return next;
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleItem(index);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = (index + 1) % items.length;
      itemRefs.current[nextIndex]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = (index - 1 + items.length) % items.length;
      itemRefs.current[prevIndex]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      itemRefs.current[items.length - 1]?.focus();
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const open = openItems.has(index);
        return (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-brand-200/80 bg-white shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]"
          >
            <button
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70"
              onClick={() => toggleItem(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              aria-expanded={open}
              aria-controls={`accordion-panel-${index}`}
              id={`accordion-header-${index}`}
            >
              <span className="text-sm font-semibold tracking-wide text-brand-900">{item.title}</span>
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-brand-700"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.span>
            </button>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden border-t border-brand-100 bg-gradient-to-b from-brand-50/30 to-white px-4 pb-4 pt-3"
                  id={`accordion-panel-${index}`}
                  aria-labelledby={`accordion-header-${index}`}
                >
                  {item.content}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
