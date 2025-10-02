

import React from 'react';
import { type ScoreCard, type Subscore } from '../types';

interface QualityScoreDisplayProps {
  scoreCard: ScoreCard;
}

const SubscoreBar: React.FC<{ name: string; value: number }> = ({ name, value }) => {
    const barColor = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700">{name}</span>
            <div className="w-2/5 flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-1.5 flex-grow">
                    <div 
                        className={`${barColor} h-1.5 rounded-full`} 
                        style={{ width: `${value}%` }}
                    ></div>
                </div>
                <span className="text-xs font-bold text-gray-800 w-8 text-right">{value}</span>
            </div>
        </div>
    );
};


const QualityScoreDisplay: React.FC<QualityScoreDisplayProps> = ({ scoreCard }) => {
    if (!scoreCard) return null;

    const { rarity, overallScore, subscores, critique, topFixes } = scoreCard;

    const getRarityStyles = () => {
        switch (rarity) {
            case 'SSR':
                return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-yellow-600 shadow-md shadow-yellow-500/20 animate-ssr-glow';
            case 'SR':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'R':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'N':
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getRarityTextColor = () => {
        switch (rarity) {
            case 'SSR': return 'text-yellow-500';
            case 'SR': return 'text-purple-700';
            case 'R': return 'text-blue-700';
            case 'N': default: return 'text-gray-600';
        }
    };
    
    return (
        <div className="group relative">
            <div className={`flex items-center justify-center w-16 h-8 rounded-md border text-sm font-bold tracking-wider ${getRarityStyles()}`}>
                <span>{rarity}</span>
            </div>
            
            <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-10 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
                    <h4 className="font-bold text-gray-800">AI 總監複審報告</h4>
                    <span className={`text-xl font-bold ${getRarityTextColor()}`}>{overallScore}</span>
                </div>
                
                <div className="mb-3">
                    <h5 className="text-xs font-bold text-gray-600 mb-1">總監評論</h5>
                    <p className="text-xs text-gray-700 italic">"{critique}"</p>
                </div>
                
                <div className="space-y-2.5 mb-3">
                    {Object.values(subscores).map((sub: Subscore) => (
                        <div key={sub.name}>
                             <SubscoreBar name={sub.name} value={sub.value} />
                             <p className="text-xs text-gray-500 mt-0.5 pl-1 leading-tight">↳ {sub.reason}</p>
                        </div>
                    ))}
                </div>

                {topFixes && topFixes.length > 0 && (
                    <div className="border-t border-gray-200 pt-2">
                        <h5 className="text-xs font-bold text-gray-600 mb-1.5">優化建議</h5>
                        <ul className="list-disc list-inside space-y-1">
                           {topFixes.map((fix, i) => (
                                <li key={i} className="text-xs text-gray-700">{fix}</li>
                           ))}
                        </ul>
                    </div>
                )}
                 <div className="arrow absolute bottom-full right-4 w-3 h-3 bg-white border-t border-l border-gray-200 transform rotate-45 -mb-1.5"></div>
            </div>
        </div>
    );
};

export default QualityScoreDisplay;