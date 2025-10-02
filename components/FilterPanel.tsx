import React from 'react';
import { type Script, type Rarity } from '../types';
import { FilterIcon } from './icons/FilterIcon';

interface FilterPanelProps {
  scripts: Script[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (category: string, value: string) => void;
}

const getUniqueValues = <T, K extends keyof T>(items: T[], key: K): string[] => {
  return [...new Set(items.map(item => String(item[key])))].sort();
};

const getUniqueRarities = (items: Script[]): Rarity[] => {
    const raritiesInOrder: Rarity[] = ['SSR', 'SR', 'R', 'N'];
    const presentRarities = new Set(items.map(item => item.scoreCard.rarity));
    return raritiesInOrder.filter(r => presentRarities.has(r));
};

const FilterCheckbox: React.FC<{ label: string; value: string; isChecked: boolean; onChange: () => void; }> = ({ label, value, isChecked, onChange }) => (
    <label htmlFor={`filter-${value}`} className="flex items-center text-sm text-gray-600 cursor-pointer">
      <input
        id={`filter-${value}`}
        type="checkbox"
        checked={isChecked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span className="ml-3">{label}</span>
    </label>
);

const FilterPanel: React.FC<FilterPanelProps> = ({ scripts, activeFilters, onFilterChange }) => {
  const durationOptions = getUniqueValues(scripts, 'duration');
  const rarityOptions = getUniqueRarities(scripts);

  const hasFavorites = scripts.some(s => s.isFavorited);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-2 sr-only">
        <FilterIcon className="w-5 h-5 mr-2 text-gray-500" />
        篩選條件
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-6">
        {hasFavorites && (
             <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">收藏</h4>
              <div className="space-y-2">
{/*
* FIX: Refactored to use optional chaining (`?.`) and nullish coalescing (`??`) to safely check for inclusion.
* This avoids creating an intermediate variable with `[]` which can be inferred as `never[]`, causing the type error.
*/}
                  <FilterCheckbox label="只顯示收藏" value="favorited" isChecked={activeFilters['isFavorited']?.includes('favorited') ?? false} onChange={() => onFilterChange('isFavorited', 'favorited')} />
              </div>
            </div>
        )}
        {rarityOptions.length > 0 && (
             <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">稀有度</h4>
              <div className="space-y-2">
                 {rarityOptions.map(option => (
                    <FilterCheckbox key={option} label={`稀有度 ${option}`} value={option} isChecked={activeFilters['rarity']?.includes(option) ?? false} onChange={() => onFilterChange('rarity', option)} />
                ))}
              </div>
            </div>
        )}
        {durationOptions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">時長</h4>
            <div className="space-y-2">
              {durationOptions.map(option => (
                <FilterCheckbox key={option} label={option} value={option} isChecked={activeFilters['duration']?.includes(option) ?? false} onChange={() => onFilterChange('duration', option)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;