

import React, { useState } from 'react';
import { type Script } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';

interface ExportControlsProps {
  scripts: Script[];
}

const formatTimestamp = (seconds: number, useComma: boolean = true) => {
  const date = new Date(0);
  date.setSeconds(seconds);
  const timeString = date.toISOString().substr(11, 12);
  return useComma ? timeString.replace('.', ',') : timeString;
};

const parseTimecodeToSeconds = (timecode: string): { start: number, end: number } => {
    const match = timecode.match(/(\d+)-(\d+)s/);
    if (match) {
        return { start: parseInt(match[1], 10), end: parseInt(match[2], 10) };
    }
    return { start: 0, end: 0 };
};

const generateSubtitleFile = (scripts: Script[], format: 'srt' | 'vtt'): string => {
    let content = format === 'vtt' ? 'WEBVTT\n\n' : '';
    let counter = 1;

    scripts.forEach(script => {
        content += `// Script: ${script.title}\n\n`;
        script.scenes.forEach(scene => {
            const { start, end } = parseTimecodeToSeconds(scene.timecode);
            // FIX: The Scene object now has a 'dialogue' array instead of a 'vo' string.
            // We join the dialogue lines to get the full text for the subtitle.
            const dialogueText = scene.dialogue.map(d => d.line).join(' ');
            const text = scene.onScreenText || dialogueText; // Use on-screen text, fallback to dialogue

            if (end > start && text) {
                content += `${counter}\n`;
                content += `${formatTimestamp(start, format === 'srt')} --> ${formatTimestamp(end, format === 'srt')}\n`;
                content += `${text}\n\n`;
                counter++;
            }
        });
    });

    return content;
};

const ExportControls: React.FC<ExportControlsProps> = ({ scripts }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: 'csv' | 'json' | 'txt' | 'srt' | 'vtt') => {
    if (scripts.length === 0) {
      alert("沒有可匯出的腳本。");
      return;
    }
    
    let data: string = '';
    let filename: string = '';
    let mimeType: string = '';

    switch(format) {
        case 'json':
            data = JSON.stringify(scripts, null, 2);
            filename = 'scripts.json';
            mimeType = 'application/json';
            break;
        case 'csv':
            // FIX: Updated header from 'vo' to 'dialogue'.
            const header = "id,title,framework,voice,duration,timecode,shot,dialogue,onScreenText,sfx,bRoll,cta\n";
            const rows = scripts.flatMap(script => 
                script.scenes.map(scene => {
                    // FIX: The Scene object now has a 'dialogue' array. We join the lines to create a single string for the CSV cell.
                    const dialogueText = scene.dialogue.map(d => d.line).join(' ');
                    return [
                        script.id, `"${script.title}"`, script.framework, script.voice, script.duration,
                        scene.timecode, `"${scene.shot.replace(/"/g, '""')}"`, `"${dialogueText.replace(/"/g, '""')}"`,
                        `"${scene.onScreenText.replace(/"/g, '""')}"`, `"${scene.sfx.replace(/"/g, '""')}"`,
                        `"${scene.bRoll.replace(/"/g, '""')}"`, `"${script.cta.replace(/"/g, '""')}"`
                    ].join(',')
                })
            ).join('\n');
            data = '\uFEFF' + header + rows; // BOM for Excel
            filename = 'scripts.csv';
            mimeType = 'text/csv;charset=utf-8;';
            break;
        case 'srt':
            data = generateSubtitleFile(scripts, 'srt');
            filename = 'subtitles.srt';
            mimeType = 'application/x-subrip';
            break;
        case 'vtt':
            data = generateSubtitleFile(scripts, 'vtt');
            filename = 'subtitles.vtt';
            mimeType = 'text/vtt';
            break;
        case 'txt':
        default:
            data = scripts.map(script => {
                let scriptText = `標題: ${script.title}\n`;
                scriptText += `框架: ${script.framework}, 語氣: ${script.voice}, 時長: ${script.duration}\n\n`;
                script.scenes.forEach(scene => {
                    // FIX: The Scene object now has a 'dialogue' array. We format it to show both speaker and line.
                    const dialogueText = scene.dialogue.map(d => `  ${d.speaker}: ${d.line}`).join('\n');
                    scriptText += `[${scene.timecode}]\n`;
                    scriptText += `Shot: ${scene.shot}\n`;
                    scriptText += `Dialogue:\n${dialogueText}\n`;
                    scriptText += `Text: ${scene.onScreenText}\n`;
                    scriptText += `SFX: ${scene.sfx}\n`;
                    scriptText += `B-Roll: ${scene.bRoll}\n\n`;
                });
                scriptText += `CTA: ${script.cta}\n`;
                scriptText += "========================================\n\n";
                return scriptText;
            }).join('');
            filename = 'scripts.txt';
            mimeType = 'text/plain';
            break;
    }
    
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
        >
          <DownloadIcon className="w-5 h-5 mr-2" />
          匯出
          <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            <button onClick={() => handleExport('txt')} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">
              匯出 Docs (.txt)
            </button>
            <button onClick={() => handleExport('csv')} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">
              匯出 CSV
            </button>
            <button onClick={() => handleExport('srt')} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">
              匯出 SRT (字幕)
            </button>
             <button onClick={() => handleExport('vtt')} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">
              匯出 VTT (字幕)
            </button>
            <button onClick={() => handleExport('json')} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">
              匯出 JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportControls;