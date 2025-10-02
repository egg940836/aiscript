import React from 'react';
import { PendingScript } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface PendingScriptCardProps {
  pendingScript: PendingScript;
}

const PendingScriptCard: React.FC<PendingScriptCardProps> = ({ pendingScript }) => {
  const isCharged = pendingScript.isCharged;

  const containerClasses = isCharged
    ? 'p-6 rounded-lg shadow-md border bg-gradient-to-br from-yellow-50/50 via-amber-100/50 to-yellow-100/50 border-amber-400 animate-ssr-glow'
    : 'bg-white p-6 rounded-lg shadow-sm border border-dashed border-gray-300';
  
  const iconAndTextClasses = isCharged ? 'text-amber-700' : 'text-blue-600';

  const statusMessage = isCharged
    ? 'SSR 蓄力召喚！正在穿越卡池搜尋神話級靈感...'
    : pendingScript.statusMessage;
  
  const batchMessageClasses = isCharged ? 'text-amber-600' : 'text-blue-500';


  return (
    <div className={containerClasses}>
      <div className={`flex items-center ${iconAndTextClasses}`}>
        <SpinnerIcon className="w-5 h-5 mr-3" />
        <div className="flex-grow">
          <h3 className="font-semibold">{statusMessage}</h3>
          {pendingScript.batchTotal > 1 && (
            <p className={`text-sm ${batchMessageClasses}`}>
              批次任務進度: {pendingScript.batchCurrent} / {pendingScript.batchTotal}
            </p>
          )}
        </div>
      </div>
       <div className="space-y-3 mt-4 animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
};

export default PendingScriptCard;