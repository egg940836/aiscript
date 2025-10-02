import React from 'react';
import { type GeneratedHook, type HookStressTestResult, HookMethod, SavedHook } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { KaleidoscopeIcon } from './icons/KaleidoscopeIcon';
import { StarIcon } from './icons/StarIcon';

interface HookStressTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    error: string | null;
    results: HookStressTestResult | null;
    savedHooks: SavedHook[];
    onToggleSave: (hook: GeneratedHook, method: HookMethod) => void;
}

const HookStressTestModal: React.FC<HookStressTestModalProps> = ({
    isOpen,
    onClose,
    isLoading,
    error,
    results,
    savedHooks,
    onToggleSave
}) => {
    if (!isOpen) return null;

    const savedHookIds = new Set(savedHooks.map(h => `${h.method}-${h.vo.slice(0, 10)}`));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <KaleidoscopeIcon className="w-6 h-6 mr-3 text-teal-500" />
                        Hook 萬花筒 (全總類壓力測試)
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto bg-gray-50/50">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center text-center h-full">
                            <SpinnerIcon className="w-12 h-12 text-indigo-600" />
                            <p className="mt-4 text-lg font-semibold text-gray-700">正在進行全總類壓力測試...</p>
                            <p className="text-sm text-gray-500">AI 正在高速運轉中，請稍候。</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center h-full flex flex-col justify-center bg-red-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-red-700">發生錯誤</h3>
                            <p className="text-red-600 text-sm mt-2">{error}</p>
                        </div>
                    )}

                    {!isLoading && !error && results && (
                        <div className="space-y-6">
                            <p className="text-center text-gray-600">AI 已為您生成了 {Object.keys(results).length} 種類型的開頭，請檢視並收藏 ⭐ 您喜歡的靈感！</p>
                            
                            <div className="w-full border-collapse">
                                {Object.entries(results).map(([method, hooks]) => {
                                    // FIX: Use Array.isArray as a type guard to ensure `hooks` is an array before accessing `.length` or `.map`, resolving "does not exist on type 'unknown'" errors.
                                    if (!Array.isArray(hooks) || hooks.length === 0) return null;
                                    return (
                                        <div key={method} className="mb-6">
                                            <h3 className="text-lg font-bold text-gray-800 p-3 bg-gray-100 border-l-4 border-indigo-500 rounded-t-md sticky top-0">
                                                {method}
                                            </h3>
                                            <div className="space-y-3 p-3 bg-white rounded-b-md shadow-sm">
                                                {hooks.map((hook, index) => {
                                                    const hookId = `${method}-${hook.vo.slice(0, 10)}`;
                                                    const isSaved = savedHookIds.has(hookId);
                                                    return (
                                                        <div key={index} className="flex items-start justify-between gap-4 p-3 border-b last:border-b-0">
                                                            <div className="text-sm flex-grow">
                                                                <p className="text-gray-800"><strong className="font-semibold text-gray-500 mr-1">VO:</strong> {hook.vo}</p>
                                                                <p className="text-gray-600 italic mt-1"><strong className="font-semibold text-gray-500 not-italic mr-1">Text:</strong> {hook.onScreenText}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => onToggleSave(hook, method as HookMethod)}
                                                                title={isSaved ? "取消收藏" : "收藏"}
                                                                className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                                                            >
                                                                <StarIcon className={`w-5 h-5 ${isSaved ? 'text-yellow-400' : ''}`} filled={isSaved} />
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HookStressTestModal;