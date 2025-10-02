
import React from 'react';
import { type GeneratedHook } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { HammerIcon } from './icons/HammerIcon';

interface HookForgeResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    error: string | null;
    hooks: GeneratedHook[];
    onSelectHook: (hook: GeneratedHook) => void;
}

const HookForgeResultModal: React.FC<HookForgeResultModalProps> = ({
    isOpen,
    onClose,
    isLoading,
    error,
    hooks,
    onSelectHook
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <HammerIcon className="w-6 h-6 mr-2 text-indigo-600" />
                        Hook 鍛造坊
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center text-center h-48">
                            <SpinnerIcon className="w-12 h-12 text-indigo-600" />
                            <p className="mt-4 text-lg font-semibold text-gray-700">正在為您鍛造靈感...</p>
                            <p className="text-sm text-gray-500">AI 正在高速運轉中，請稍候。</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center h-48 flex flex-col justify-center bg-red-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-red-700">發生錯誤</h3>
                            <p className="text-red-600 text-sm mt-2">{error}</p>
                        </div>
                    )}

                    {!isLoading && !error && hooks.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-center text-gray-600">AI 已生成 {hooks.length} 組不同的開頭，請選擇一組來建立腳本卡！</p>
                            {hooks.map((hook, index) => (
                                <div key={index} className="flex flex-col sm:flex-row items-start justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 gap-3 transition-all hover:border-indigo-300 hover:shadow-sm">
                                    <div className="flex-grow text-sm">
                                        <p className="font-semibold text-gray-500 mb-1">版本 {index + 1}</p>
                                        <p className="text-gray-800"><strong className="font-semibold text-gray-600 mr-1">VO:</strong> {hook.vo}</p>
                                        <p className="text-gray-600 italic mt-1"><strong className="font-semibold text-gray-500 not-italic mr-1">Text:</strong> {hook.onScreenText}</p>
                                    </div>
                                    <button
                                        onClick={() => onSelectHook(hook)}
                                        className="w-full sm:w-auto mt-2 sm:mt-0 ml-0 sm:ml-4 flex-shrink-0 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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

export default HookForgeResultModal;
