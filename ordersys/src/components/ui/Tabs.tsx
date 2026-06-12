import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Tab {
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultActiveTab?: number;
}

const Tabs: React.FC<TabsProps> = ({ tabs, defaultActiveTab = 0 }) => {
  const [activeTab, setActiveTab] = useState(defaultActiveTab);
  const [direction, setDirection] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabClick = (index: number) => {
    setDirection(index > activeTab ? 1 : -1);
    setActiveTab(index);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'ArrowRight') {
      const nextIndex = (index + 1) % tabs.length;
      handleTabClick(nextIndex);
      tabRefs.current[nextIndex]?.focus();
    } else if (event.key === 'ArrowLeft') {
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      handleTabClick(prevIndex);
      tabRefs.current[prevIndex]?.focus();
    }
  };

  return (
    <div className="tabs">
      <div className="tab-buttons" role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={index}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`tabpanel-${index}`}
            id={`tab-${index}`}
            onClick={() => handleTabClick(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`tab-button ${activeTab === index ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
        <motion.div
          className="tab-indicator"
          animate={{ x: `${(activeTab / tabs.length) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={activeTab}
          custom={direction}
          initial={{ opacity: 0, x: direction * 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * 100 }}
          transition={{ duration: 0.3 }}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          id={`tabpanel-${activeTab}`}
        >
          {tabs[activeTab].content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Tabs;