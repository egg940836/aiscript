
import React, { useRef } from 'react';
import { type Script } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';

interface BackupControlsProps {
  scriptsToExport: Script[];
  onImport: (scripts: Script[]) => void;
}

const BackupControls: React.FC<BackupControlsProps> = ({ scriptsToExport, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (scriptsToExport.length === 0) {
      alert("沒有已收藏的腳本可匯出。請先將腳本標記為收藏 (⭐)。");
      return;
    }
    const dataStr = JSON.stringify(scriptsToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gacha_scripts_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("檔案內容不是文字格式。");
        }
        const importedScripts = JSON.parse(text);
        
        if (Array.isArray(importedScripts) && (importedScripts.length === 0 || (importedScripts[0] && typeof importedScripts[0].id === 'string'))) {
          onImport(importedScripts);
        } else {
          throw new Error("無效的腳本檔案格式。");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知的錯誤";
        alert(`匯入失敗: ${message}`);
      }
    };
    reader.onerror = () => {
        alert("讀取檔案失敗。");
    }
    reader.readAsText(file);
    
    event.target.value = '';
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />
      <button 
        onClick={handleImportClick}
        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <UploadIcon className="w-4 h-4 mr-2" />
        匯入
      </button>
      <button 
        onClick={handleExport}
        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <DownloadIcon className="w-4 h-4 mr-2" />
        匯出
      </button>
    </>
  );
};

export default BackupControls;
