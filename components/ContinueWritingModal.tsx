
import React, { useState } from 'react';
import { type Script, type CardPool } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';

interface ContinueWritingModalProps {
    isOpen: boolean;
    onClose: () => void;
    script: Script;
    onContinue: (originalScript: Script, newCardPool: CardPool) => void;
}

const CARD_POOL_CONFIG: Record<string, { name: string; description: string; baseClasses: string; selectedClasses: string; }> = {
    normal: { name: '普通卡池', description: '標準引擎，速度快。', baseClasses: 'border-slate-300', selectedClasses: 'border-indigo-500 ring-2 ring-indigo-300 bg-indigo-50/70' },
    rare: { name: '稀有卡池', description: '深度思考，品質更高。', baseClasses: 'border-purple-300', selectedClasses: 'border-purple-500 ring-2 ring-purple-300 bg-purple-100/70' },
    showdown: { name: '王牌對決', description: '經典 AB 對比。', baseClasses: 'border-red-300', selectedClasses: 'border-red-600 ring-2 ring-red-300 bg-red-100/70' },
    strategy: { name: '王牌策略', description: '高轉換框架。', baseClasses: 'border-cyan-300', selectedClasses: 'border-cyan-500 ring-2 ring-cyan-300 bg-cyan-100/70' },
    legendary: { name: '傳說卡池', description: '連結 Google 搜尋。', baseClasses: 'border-teal-300', selectedClasses: 'border-teal-500 ring-2 ring-teal-300 bg-teal-100/70' },
    mythical: { name: '神話卡池', description: '深度思考 + 搜尋。', baseClasses: 'border-amber-400', selectedClasses: 'border-amber-500 ring-2 ring-amber-400 animate-ssr-glow' },
    drama: { name: '豪門恩怨', description: '八點檔戲劇化。', baseClasses: 'border-rose-300', selectedClasses: 'border-rose-600 ring-2 ring-rose-300 bg-rose-100/70' },
    taiwanese: { name: '強效台味', description: '在地化強效鉤子。', baseClasses: 'border-orange-300', selectedClasses: 'border-orange-500 ring-2 ring-orange-300 bg-orange-100/70' },
    meme: { name: '迷因模仿', description: '模仿時下熱梗。', baseClasses: 'border-lime-300', selectedClasses: 'border-lime-500 ring-2 ring-lime-300 bg-lime-100/70' },
};
const CARD_POOL_OPTIONS = Object.keys(CARD_POOL_CONFIG) as CardPool[];


const ContinueWritingModal: React.FC<ContinueWritingModalProps> = ({ isOpen, onClose, script, onContinue }) => {
    const [selectedCardPool, setSelectedCardPool] = useState<CardPool>('rare');
    const hookScene = script.scenes[0];

    const handleContinue = () => {
        onContinue(script, selectedCardPool);
    };

    if (!isOpen) {
        return null;
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <SparklesIcon className="w-6 h-6 mr-2 text-green-500" />
                        續寫腳本設定
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-2">1. 確認開頭場景</h3>
                        <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 text-sm space-y-1">
                            <p className="text-gray-800"><strong className="font-semibold text-gray-500 w-20 inline-block">Timecode:</strong> {hookScene.timecode}</p>
                            <p className="text-gray-800"><strong className="font-semibold text-gray-500 w-20 inline-block">Dialogue:</strong> {hookScene.dialogue.map(d => d.line).join(' ')}</p>
                            <p className="text-gray-800"><strong className="font-semibold text-gray-500 w-20 inline-block">On-Screen:</strong> {hookScene.onScreenText}</p>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-3">2. 選擇續寫的創意引擎</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {CARD_POOL_OPTIONS.map(pool => {
                                const config = CARD_POOL_CONFIG[pool];
                                const isSelected = selectedCardPool === pool;
                                return (
                                    <div 
                                        key={pool} 
                                        onClick={() => setSelectedCardPool(pool)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all duration-200 text-center border ${config.baseClasses} ${isSelected ? config.selectedClasses : 'hover:shadow-md'}`}
                                    >
                                        <p className="text-md font-semibold">{config.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button
                        onClick={handleContinue}
                        className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                    >
                        開始續寫
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ContinueWritingModal;
