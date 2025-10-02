import React, { useState, useCallback } from 'react';
import { type Script, CtaMethod } from '../types';
import { generateCtaSuggestions } from '../services/geminiService';
import { CTA_METHOD_OPTIONS } from '../constants';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface CtaForgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    script: Script;
    onCtaSelect: (newCta: string) => void;
}

const CtaForgeModal: React.FC<CtaForgeModalProps> = ({ isOpen, onClose, script, onCtaSelect }) => {
    const [selectedMethod, setSelectedMethod] = useState<CtaMethod>(CtaMethod.Automatic);
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleForge = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSuggestions([]);
        try {
            const ctaSuggestions = await generateCtaSuggestions(script, selectedMethod);
            setSuggestions(ctaSuggestions);
        } catch (err) {
            const message = err instanceof Error ? err.message : '優化失敗，請稍後再試。';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [script, selectedMethod]);

    if (!isOpen) {
        return null;
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <SparklesIcon className="w-6 h-6 mr-2 text-indigo-600" />
                        CTA 優化室
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="mb-4">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">原始 CTA</h3>
                        <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 text-sm">
                            <p className="text-gray-800">{script.cta}</p>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="cta-method" className="block text-sm font-medium text-gray-700 mb-1">選擇優化策略</label>
                        <select
                            id="cta-method"
                            value={selectedMethod}
                            onChange={(e) => setSelectedMethod(e.target.value as CtaMethod)}
                            className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            {CTA_METHOD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={handleForge}
                            disabled={isLoading}
                            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all"
                        >
                            {isLoading ? (
                                <>
                                    <SpinnerIcon className="w-5 h-5 mr-2" />
                                    優化中...
                                </>
                            ) : (
                                "開始優化"
                            )}
                        </button>
                    </div>

                    {error && <div className="text-red-600 text-sm text-center">{error}</div>}

                    {suggestions.length > 0 && (
                        <div className="space-y-3 pt-4">
                             <h3 className="text-md font-semibold text-gray-700">優化建議：</h3>
                            {suggestions.map((suggestion, index) => (
                                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 gap-3">
                                    <div className="flex-grow text-sm">
                                        <p className="text-gray-800">{suggestion}</p>
                                    </div>
                                    <button
                                        onClick={() => onCtaSelect(suggestion)}
                                        className="w-full sm:w-auto ml-0 sm:ml-4 flex-shrink-0 px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        採用此版本
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CtaForgeModal;