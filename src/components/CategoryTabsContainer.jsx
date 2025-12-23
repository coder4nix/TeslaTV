import React from 'react';

/**
 * Shared category tabs container component used across Movies and Series pages
 * Ensures consistent styling and responsive behavior
 */
export default function CategoryTabsContainer({ categories, selectedCategory, onCategoryChange }) {
  return (
    <div className="sticky top-[56px] sm:top-[64px] z-10 bg-slate-950 pb-3 sm:pb-4 mb-4 sm:mb-6">
      <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-2 -mx-3 sm:mx-0 px-3 sm:px-0">
        {categories.map((category) => (
          <button
            key={category.category_id ?? 'all'}
            onClick={() => onCategoryChange(category.category_id)}
            className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              selectedCategory === category.category_id
                ? 'bg-white text-slate-900'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            {category.category_name}
          </button>
        ))}
      </div>
    </div>
  );
}
