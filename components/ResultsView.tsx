

import React, { useState, useMemo } from 'react';
import { type Script, type PendingScript, type FailedScript, AdDuration } from '../types';
import FilterPanel from './FilterPanel';
import ScriptViewer from './ScriptViewer';
import { TrashIcon } from './icons/TrashIcon';
import { FilterIcon } from './icons/FilterIcon';
import { StopIcon } from './icons/StopIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import BackupControls from './BackupControls';

interface ResultsViewProps {
  scripts: Script[];
  pendingScripts: PendingScript[];
  failedScripts: FailedScript[];
  onClear: () => void;
  onUpdateScript: (script: Script) => void;
  onDeleteScript: (scriptId: string) => void;
  onRetryScript: (scriptId: string) => void;
  onRemoveFailedScript: (scriptId: string) => void;
  onCancelAllPending: () => void;
  isProMode: boolean;
  onContinueScript: (script: Script) => void;
  onGenerateABVersion: (script: Script) => void;
  onToggleDirectorMode: (scriptId: string) => void;
  onGenerateShorterVersion: (scriptId: string, targetDuration: AdDuration) => void;
  onImportScripts: (scripts: Script[]) => void;
}

type SortOption = 'newest' | 'oldest' | 'score-desc' | 'score-asc';

const SortControl: React.FC<{ value: SortOption, onChange: (value: SortOption) => void }> = ({ value, onChange }) => {
    const options: { value: SortOption; label: string }[] = [
        { value: 'newest', label: '最新' },
        { value: 'oldest', label: '最舊' },
        { value: 'score-desc', label: '分數 高→低' },
        { value: 'score-asc', label: '分數 低→高' },
    ];

    return (
        <div>
            <span className="text-sm font-medium text-gray-700 mr-2">排序:</span>
            <div className="inline-flex rounded-md shadow-sm bg-white" role="group">
                {options.map((opt, index) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`px-3 py-1.5 text-sm font-medium border-y border-gray-200 transition-colors duration-150
                            ${value === opt.value ? 'bg-indigo-50 text-indigo-700 z-10' : 'text-gray-700 hover:bg-gray-50'}
                            ${index === 0 ? 'rounded-l-md border-l' : ''}
                            ${index === options.length - 1 ? 'rounded-r-md border-r' : 'border-l'}
                        `}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

const ResultsView: React.FC<ResultsViewProps> = ({ 
  scripts, 
  pendingScripts, 
  failedScripts, 
  onClear, 
  onUpdateScript, 
  onDeleteScript,
  onRetryScript,
  onRemoveFailedScript,
  onCancelAllPending,
  isProMode,
  onContinueScript,
  onGenerateABVersion,
  onToggleDirectorMode,
  onGenerateShorterVersion,
  onImportScripts,
}) => {
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  const processedScripts = useMemo(() => {
    let filtered = scripts;
    if (Object.keys(activeFilters).length > 0) {
        filtered = scripts.filter(script => {
            return Object.entries(activeFilters).every(([key, values]: [string, string[]]) => {
                if (values.length === 0) return true;
                if (key === 'isFavorited') return values.includes('favorited') && script.isFavorited;
                if (key === 'rarity') return values.includes(script.scoreCard.rarity);
                const scriptValue = script[key as keyof Script];
                if(key === 'isCompliant'){
                    if(values.includes('passed') && script.isCompliant === true) return true;
                    if(values.includes('failed') && script.isCompliant === false) return true;
                    if(values.includes('unchecked') && script.isCompliant === null) return true;
                    return false;
                }
                return values.includes(String(scriptValue));
            });
        });
    }

    return [...filtered].sort((a, b) => {
        switch (sortOption) {
            case 'oldest': return a.createdAt - b.createdAt;
            case 'score-desc': return b.scoreCard.overallScore - a.scoreCard.overallScore;
            case 'score-asc': return a.scoreCard.overallScore - b.scoreCard.overallScore;
            case 'newest': default: return b.createdAt - a.createdAt;
        }
    });
  }, [scripts, activeFilters, sortOption]);

  const handleFilterChange = (category: string, value: string) => {
    setActiveFilters(prev => {
      const currentValues: string[] = prev[category] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      if(newValues.length === 0) {
        const { [category]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [category]: newValues };
    });
  };

  const activeFilterCount = Object.values(activeFilters).flat().length;
  const totalCardCount = scripts.length + pendingScripts.length + failedScripts.length;

  return (
    <div>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3 self-start">
                <h2 className="text-xl font-bold text-gray-800">靈感卡庫</h2>
                {totalCardCount > 0 && <span className="bg-indigo-100 text-indigo-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full">{totalCardCount} 張卡</span>}
            </div>
            <div className="flex items-center space-x-2 self-start">
                <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <FilterIcon className="w-4 h-4 mr-2" />
                    篩選
                    {activeFilterCount > 0 && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-indigo-600 rounded-full">
                        {activeFilterCount}
                    </span>
                    )}
                </button>
            {(scripts.length > 0 || failedScripts.length > 0) && (
                <button
                onClick={onClear}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                <TrashIcon className="w-4 h-4 mr-1" />
                清空卡庫
                </button>
            )}
            <BackupControls
              scriptsToExport={scripts.filter(s => s.isFavorited)}
              onImport={onImportScripts}
            />
            </div>
        </div>

        {isFilterOpen && (
            <FilterPanel
                scripts={scripts}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
            />
        )}
        
        {scripts.length > 0 && (
            <div className="flex justify-end">
                <SortControl value={sortOption} onChange={setSortOption} />
            </div>
        )}

        {pendingScripts.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg flex justify-between items-center">
            <div className="flex items-center">
              <SpinnerIcon className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">
                {pendingScripts.length} 個召喚任務處理中...
              </span>
            </div>
            <button
              onClick={onCancelAllPending}
              className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-800"
            >
              <StopIcon className="w-4 h-4 mr-1" />
              全部取消
            </button>
          </div>
        )}

      </div>

      <div className="mt-6">
        <ScriptViewer 
            scripts={processedScripts} 
            pendingScripts={pendingScripts}
            failedScripts={failedScripts}
            onUpdateScript={onUpdateScript}
            onDeleteScript={onDeleteScript}
            onRetryScript={onRetryScript}
            onRemoveFailedScript={onRemoveFailedScript}
            isProMode={isProMode}
            onContinueScript={onContinueScript}
            onGenerateABVersion={onGenerateABVersion}
            onToggleDirectorMode={onToggleDirectorMode}
            onGenerateShorterVersion={onGenerateShorterVersion}
        />
      </div>
    </div>
  );
};

export default ResultsView;