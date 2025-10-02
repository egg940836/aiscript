import React from 'react';
import { FailedScript } from '../types';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { RefreshCwIcon } from './icons/RefreshCwIcon';
import { TrashIcon } from './icons/TrashIcon';

interface FailedScriptCardProps {
  failedScript: FailedScript;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

const FailedScriptCard: React.FC<FailedScriptCardProps> = ({ failedScript, onRetry, onRemove }) => {
  return (
    <div className="bg-red-50 p-6 rounded-lg shadow-sm border border-red-300">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
        </div>
        <div className="ml-4 flex-grow">
          <h3 className="font-semibold text-red-800">
            腳本生成失敗
            {failedScript.batchTotal && failedScript.batchTotal > 1 && (
              <span className="text-sm font-normal text-red-600 ml-2">
                (批次任務: {failedScript.batchCurrent}/{failedScript.batchTotal})
              </span>
            )}
          </h3>
          <p className="text-sm text-red-700 mt-1 break-words">
            <strong>原因:</strong> {failedScript.error}
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end space-x-3">
        <button
          onClick={() => onRemove(failedScript.id)}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <TrashIcon className="w-4 h-4 mr-2" />
          取消
        </button>
        <button
          onClick={() => onRetry(failedScript.id)}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <RefreshCwIcon className="w-4 h-4 mr-2" />
          重試
        </button>
      </div>
    </div>
  );
};

export default FailedScriptCard;
