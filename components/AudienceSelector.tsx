
import React from 'react';
// FIX: Removed unused and undefined imports: AudienceContext, Budget, Household, Space. All related logic has been removed.
import { type AudienceIntent } from '../types';
// FIX: Removed unused and undefined imports: BUDGET_OPTIONS, HOUSEHOLD_OPTIONS, SPACE_OPTIONS.
import { CORE_AUDIENCES } from '../constants';

interface AudienceSelectorProps {
  intent: AudienceIntent;
  onChange: (intent: AudienceIntent) => void;
}

const AudienceSelector: React.FC<AudienceSelectorProps> = ({ intent, onChange }) => {
  const selectedIds = intent.personas.map(p => p.id);

  const handleSelectAudience = (audienceId: string) => {
    const isSelected = selectedIds.includes(audienceId);
    let newSelectedIds = [...selectedIds];

    if (isSelected) {
      newSelectedIds = newSelectedIds.filter(id => id !== audienceId);
    } else if (selectedIds.length < 3) {
      newSelectedIds.push(audienceId);
    } else {
        // Optional: Add a user feedback like a toast message
        console.log("Maximum of 3 audiences can be selected.");
        return;
    }
    
    const newPersonas = newSelectedIds.map((id, index) => ({
      id,
      weight: index === 0 ? 1.0 : (index === 1 ? 0.7 : 0.5)
    }));

    onChange({ ...intent, personas: newPersonas });
  };
  
  // FIX: Removed handleContextChange function and related JSX as it was using non-existent types.
  
  return (
    <div>
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">核心受眾 (最多選3個，點擊順序代表優先級)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {CORE_AUDIENCES.map((audience) => {
                const selectionIndex = selectedIds.indexOf(audience.id);
                const isSelected = selectionIndex !== -1;
                return (
                    <button
                        type="button"
                        key={audience.id}
                        onClick={() => handleSelectAudience(audience.id)}
                        title={audience.description}
                        className={`relative text-left p-3 border rounded-lg transition-all duration-200 ${
                        isSelected
                            ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300'
                            : 'bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                    >
                        {isSelected && (
                            <span className="absolute top-1.5 right-1.5 bg-indigo-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                {selectionIndex + 1}
                            </span>
                        )}
                        <p className="font-semibold text-sm text-gray-800">{audience.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{audience.keywords.join(' / ')}</p>
                    </button>
                );
            })}
            </div>
        </div>
    </div>
  );
};

export default AudienceSelector;