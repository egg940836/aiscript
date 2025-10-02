

import React from 'react';
import { type Script, type PendingScript, type FailedScript, AdDuration } from '../types';
import ScriptCard from './ScriptCard';
import PendingScriptCard from './PendingScriptCard';
import FailedScriptCard from './FailedScriptCard';

interface ScriptViewerProps {
  scripts: Script[];
  pendingScripts: PendingScript[];
  failedScripts: FailedScript[];
  onUpdateScript: (script: Script) => void;
  onDeleteScript: (scriptId: string) => void;
  onRetryScript: (scriptId: string) => void;
  onRemoveFailedScript: (scriptId: string) => void;
  isProMode: boolean;
  onContinueScript: (script: Script) => void;
  onGenerateABVersion: (script: Script) => void;
  onToggleDirectorMode: (scriptId: string) => void;
  onGenerateShorterVersion: (scriptId: string, targetDuration: AdDuration) => void;
}

const ScriptViewer: React.FC<ScriptViewerProps> = ({ 
  scripts, 
  pendingScripts, 
  failedScripts, 
  onUpdateScript, 
  onDeleteScript,
  onRetryScript,
  onRemoveFailedScript,
  isProMode,
  onContinueScript,
  onGenerateABVersion,
  onToggleDirectorMode,
  onGenerateShorterVersion,
}) => {
  const showEmptyView = scripts.length === 0 && pendingScripts.length === 0 && failedScripts.length === 0;

  return (
    <div className="space-y-6">
      {/* Render failed scripts first so they are prominent */}
      {failedScripts.map((script) => (
        <FailedScriptCard 
          key={script.id} 
          failedScript={script} 
          onRetry={onRetryScript} 
          onRemove={onRemoveFailedScript}
        />
      ))}
      
      {/* Then, render pending scripts */}
      {pendingScripts.map((script) => (
        <PendingScriptCard key={script.id} pendingScript={script} />
      ))}

      {/* Render successfully generated scripts */}
      {scripts.map((script) => (
        <ScriptCard 
          key={script.id} 
          script={script} 
          onUpdateScript={onUpdateScript} 
          onDeleteScript={onDeleteScript}
          isProMode={isProMode}
          onContinueScript={onContinueScript}
          onGenerateABVersion={onGenerateABVersion}
          onToggleDirectorMode={onToggleDirectorMode}
          onGenerateShorterVersion={onGenerateShorterVersion}
        />
      ))}

      {/* Handle empty states when no content or placeholders are present */}
      {showEmptyView && (
         <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
            </svg>
            <h3 className="mt-2 text-xl font-medium text-gray-900">你的靈感卡庫空空如也</h3>
            <p className="mt-1 text-sm text-gray-500">請設定召喚條件，或調整篩選器！</p>
        </div>
      )}
    </div>
  );
};

export default ScriptViewer;