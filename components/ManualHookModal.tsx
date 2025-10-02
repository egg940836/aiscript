import React, { useState } from 'react';
import { type GeneratedHook } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface ManualHookModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (hook: GeneratedHook) => void;
}

const ManualHookModal: React.FC<ManualHookModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [vo, setVo] = useState('');
    const [onScreenText, setOnScreenText] = useState('');

    const handleSubmit = () => {
        if (vo.trim() || onScreenText.trim()) {
            onSubmit({ vo, onScreenText });
        } else {
            alert("請至少填寫旁白或畫面文字。");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <PencilIcon className="w-6 h-6 mr-2 text-indigo-600" />
                        手動撰寫 Hook
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">請寫下您的開頭靈感，AI 將為您續寫成完整的腳本。</p>
                    <div>
                        <label htmlFor="manual-vo" className="block text-sm font-medium text-gray-700 mb-1">旁白 (VO)</label>
                        <textarea
                            id="manual-vo"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={vo}
                            onChange={(e) => setVo(e.target.value)}
                            placeholder="e.g., 你家的沙發，真的乾淨嗎？"
                        />
                    </div>
                    <div>
                        <label htmlFor="manual-ost" className="block text-sm font-medium text-gray-700 mb-1">畫面文字 (On-Screen Text)</label>
                        <textarea
                            id="manual-ost"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={onScreenText}
                            onChange={(e) => setOnScreenText(e.target.value)}
                            placeholder="e.g., 比馬桶蓋還髒？！"
                        />
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button
                        onClick={handleSubmit}
                        className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                    >
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        使用此 Hook 續寫
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualHookModal;