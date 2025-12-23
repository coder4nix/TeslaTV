import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function Breadcrumb({ items, onHomeClick }) {
  const { t } = useLanguage();

  // Default home item with click handler
  const breadcrumbItems = [
    {
      label: t.common.home || 'Ana Sayfa',
      onClick: onHomeClick ? () => onHomeClick('home') : undefined
    },
    ...items
  ];

  const breadcrumbContent = (
    <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-slate-400 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              {item.label}
            </button>
          ) : (
            <span className={`whitespace-nowrap ${index === breadcrumbItems.length - 1 ? 'text-white font-medium' : ''}`}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );

  const container = document.getElementById('breadcrumb-container');

  return container ? createPortal(breadcrumbContent, container) : null;
}
