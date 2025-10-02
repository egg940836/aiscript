
import React, { useState, useEffect } from 'react';
import { type KeywordProfile, type AudienceIntent, type KeywordSuggestions, type Keyword } from '../types';
import { getKeywordSuggestions } from '../services/geminiService';

interface KeywordStudioProps {
  profile: KeywordProfile;
  audienceIntent: AudienceIntent;
  onChange: (profile: KeywordProfile) => void;
}

const Chip: React.FC<{
  keyword: Keyword;
  isSelected: boolean;
  onClick: () => void;
}> = ({ keyword, isSelected, onClick }) => (
  <button
    type="button"
    title={keyword.reason}
    onClick={onClick}
    className={`px-3 py-1.5 border rounded-full text-sm font-medium transition-colors duration-200 ${
      isSelected
        ? 'bg-indigo-600 border-indigo-600 text-white'
        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
    }`}
  >
    {keyword.value}
  </button>
);


const KeywordCategory: React.FC<{
    title: string;
    suggestions: Keyword[];
    selected: string[];
    onToggle: (keyword: string) => void;
}> = ({ title, suggestions, selected, onToggle }) => (
    <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-600 mb-2">{title}</h4>
        <div className="flex flex-wrap gap-2">
            {suggestions.map(kw => (
                <Chip key={kw.value} keyword={kw} isSelected={selected.includes(kw.value)} onClick={() => onToggle(kw.value)} />
            ))}
        </div>
    </div>
);


const KeywordStudio: React.FC<KeywordStudioProps> = ({ profile, audienceIntent, onChange }) => {
    const [suggestions, setSuggestions] = useState<KeywordSuggestions | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if(audienceIntent.personas.length === 0) {
            setSuggestions(null);
            return;
        }
        
        const fetchSuggestions = async () => {
            setIsLoading(true);
            const result = await getKeywordSuggestions(audienceIntent);
            setSuggestions(result);
            setIsLoading(false);
        };
        fetchSuggestions();
    }, [audienceIntent]);

    const handleKeywordToggle = (category: keyof KeywordProfile, keyword: string) => {
        const currentKeywords = profile[category] as string[];
        const newKeywords = currentKeywords.includes(keyword)
            ? currentKeywords.filter(k => k !== keyword)
            : [...currentKeywords, keyword];
        
        onChange({ ...profile, [category]: newKeywords });
    };

    const handleInputChange = (field: keyof KeywordProfile, value: string | boolean) => {
        onChange({ ...profile, [field]: value });
    };

  return (
    <div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-base font-semibold text-gray-800 mb-2">AI 關鍵字建議</h4>
            {isLoading && <p className="text-sm text-gray-500">正在根據目標受眾生成建議...</p>}
            {!isLoading && !suggestions && <p className="text-sm text-gray-500">請先選擇目標受眾以獲取 AI 建議。</p>}
            {suggestions && (
                <div>
                    <KeywordCategory title="核心詞 (產品/類別)" suggestions={suggestions.core} selected={profile.core} onToggle={(kw) => handleKeywordToggle('core', kw)} />
                    <KeywordCategory title="情境詞 (生活場景/痛點)" suggestions={suggestions.context} selected={profile.context} onToggle={(kw) => handleKeywordToggle('context', kw)} />
                    <KeywordCategory title="利益詞 (可感知結果)" suggestions={suggestions.benefit} selected={profile.benefit} onToggle={(kw) => handleKeywordToggle('benefit', kw)} />
                    <KeywordCategory title="證據詞 (規格/保固/證明)" suggestions={suggestions.proof} selected={profile.proof} onToggle={(kw) => handleKeywordToggle('proof', kw)} />
                </div>
            )}
        </div>
         <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">禁用詞 (以逗號分隔)</label>
            <input
                type="text"
                value={profile.avoid}
                onChange={(e) => handleInputChange('avoid', e.target.value)}
                placeholder="e.g., 最便宜, 永久保固, 神器"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
        </div>
        <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">自動擴展同義詞</span>
             <label htmlFor="auto-expand-toggle" className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    id="auto-expand-toggle" 
                    className="sr-only peer" 
                    checked={profile.autoExpand}
                    onChange={(e) => handleInputChange('autoExpand', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
        </div>
    </div>
  );
};

export default KeywordStudio;