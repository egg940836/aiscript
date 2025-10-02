

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { type Script, type Scene, type ComplianceResult, type KeywordAnalysis, type KeywordCategory, HookMethod, type GeneratedHook, DialogueLine, SceneRefinementAction, AdPlacement, AdDuration } from '../types';
import { checkCompliance, refineSceneText, generateCtaSuggestions } from '../services/geminiService';
import { VOICE_PROFILE_TO_PACE_KEY, DURATION_LABELS } from '../constants';
import { estimateSeconds, PaceSelection, speakingPaceProfiles } from '../lib/pacing';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { TrashIcon } from './icons/TrashIcon';
import { StarIcon } from './icons/StarIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { PencilIcon } from './icons/PencilIcon';
import QualityScoreDisplay from './QualityScoreDisplay';
import { ClockIcon } from './icons/ClockIcon';
import { HammerIcon } from './icons/HammerIcon';
import HookForgeModal from './HookForgeModal';
import { GlobeIcon } from './icons/GlobeIcon';
import { CopyIcon } from './icons/CopyIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import CtaForgeModal from './CtaForgeModal';
import { ArrowInwardIcon } from './icons/ArrowInwardIcon';
import { ArrowOutwardIcon } from './icons/ArrowOutwardIcon';
import { WandIcon } from './icons/WandIcon';
import { ClapperboardIcon } from './icons/ClapperboardIcon';
import VideoSceneGeneratorModal from './VideoSceneGeneratorModal';
// FIX: Imported SpinnerIcon to resolve missing component error.
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ABTestIcon } from './icons/ABTestIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';

interface ScriptCardProps {
  script: Script;
  onUpdateScript: (script: Script) => void;
  onDeleteScript: (scriptId: string) => void;
  isProMode: boolean;
  onContinueScript: (script: Script) => void;
  onGenerateABVersion: (script: Script) => void;
  onToggleDirectorMode: (scriptId: string) => void;
  onGenerateShorterVersion: (scriptId: string, targetDuration: AdDuration) => void;
}

const Tag: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={`inline-block bg-gray-100 text-gray-700 text-xs font-medium mr-2 px-2.5 py-1 rounded-full ${className}`}>
    {children}
  </span>
);

const PacingOverview: React.FC<{ script: Script, scenes: Scene[] }> = ({ script, scenes }) => {
    const [pace, setPace] = useState<PaceSelection>('medium');

    const { totalEstimatedSeconds, totalDuration, ratio } = useMemo(() => {
        const paceProfile = speakingPaceProfiles[pace];
        if (!paceProfile) return { totalEstimatedSeconds: 0, totalDuration: 0, ratio: 0};

        const totalEstimated = scenes.reduce((total, scene) => total + estimateSeconds(scene.dialogue.map(d => d.line).join(' '), paceProfile), 0);
        
        const durationMatch = script.duration.match(/\d+/g);
        const totalDur = durationMatch ? parseInt(durationMatch[durationMatch.length - 1], 10) : 15;

        const currentRatio = totalDur > 0 ? totalEstimated / totalDur : 0;
        return { totalEstimatedSeconds: totalEstimated, totalDuration: totalDur, ratio: currentRatio };
    }, [pace, script.duration, scenes]);

    let barColor = 'bg-green-500';
    if (ratio > 1.05) barColor = 'bg-red-500';
    else if (ratio > 0.9) barColor = 'bg-orange-400';

    return (
        <div className="my-2">
            <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                <span className="font-medium">全片節奏總覽</span>
                <span className={`${ratio > 1.05 ? 'text-red-600 font-bold' : ''}`}>{totalEstimatedSeconds.toFixed(1)}s / {totalDuration}s</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                    className={`${barColor} h-1.5 rounded-full transition-all duration-500`} 
                    style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                ></div>
            </div>
             <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">語速預估</span>
                <div className="flex items-center space-x-1">
                    {(['slow', 'medium', 'fast'] as PaceSelection[]).map(p => (
                        <button 
                            key={p} 
                            onClick={() => setPace(p)}
                            title={{slow: '慢速', medium: '中速', fast: '快速'}[p]}
                            className={`px-2 py-0.5 text-xs rounded-full transition-colors ${pace === p ? 'bg-indigo-600 text-white font-semibold' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            { {slow: '慢', medium: '中', fast: '快'}[p] }
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const KeywordAnalysisDisplay: React.FC<{ analysis: KeywordAnalysis }> = ({ analysis }) => {
    const categories: { title: string; key: KeywordCategory, color: string }[] = [
        { title: '核心詞', key: 'core', color: 'bg-blue-100 text-blue-800' },
        { title: '情境詞', key: 'context', color: 'bg-green-100 text-green-800' },
        { title: '利益詞', key: 'benefit', color: 'bg-yellow-100 text-yellow-800' },
        { title: '證據詞', key: 'proof', color: 'bg-purple-100 text-purple-800' },
    ];
    
    return (
        <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                <ClipboardListIcon className="w-5 h-5 mr-2 text-gray-500" />
                AI 關鍵字分析
            </h4>
            <div className="space-y-2">
                {categories.map(cat => (
                     analysis[cat.key] && analysis[cat.key].length > 0 && (
                        <div key={cat.key} className="flex items-start">
                            <span className="text-xs font-bold text-gray-500 w-16 flex-shrink-0 pt-1">{cat.title}</span>
                            <div className="flex flex-wrap gap-2">
                                {analysis[cat.key].map(keyword => (
                                    <span key={keyword} className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.color}`}>
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}

const EditableText: React.FC<{
    text: string;
    onSave: (newText: string) => void;
    isItalic?: boolean;
    className?: string;
    children?: React.ReactNode;
}> = ({ text, onSave, isItalic = false, className = '', children }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditing]);
    
    useEffect(() => {
        setEditText(text);
    }, [text]);

    const handleSave = () => {
        if (editText.trim() !== text) {
            onSave(editText);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditText(text); // Revert changes
        }
    };
    
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditText(e.target.value);
        // Auto-resize
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    }

    if (isEditing) {
        return (
            <textarea
                ref={textareaRef}
                value={editText}
                onChange={handleTextareaChange}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className={`w-full border-none focus:ring-1 focus:ring-indigo-500 bg-indigo-50 rounded p-1 resize-none ${className}`}
                rows={1}
            />
        );
    }

    return (
        <span
            onClick={() => setIsEditing(true)}
            className={`editable-field group relative cursor-pointer hover:bg-indigo-50 rounded p-1 -m-1 transition-colors ${isItalic ? 'italic' : ''} ${className}`}
        >
            {text}{children}
            <PencilIcon className="w-3 h-3 absolute top-1 right-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
    );
};


const ScriptCard: React.FC<ScriptCardProps> = ({ 
    script: initialScript, 
    onUpdateScript, 
    onDeleteScript, 
    isProMode, 
    onContinueScript,
    onGenerateABVersion,
    onToggleDirectorMode,
    onGenerateShorterVersion,
}) => {
  const [script, setScript] = useState<Script>(initialScript);
  const [activeDuration, setActiveDuration] = useState<AdDuration>(initialScript.duration);
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
  const [refiningSceneInfo, setRefiningSceneInfo] = useState<{ sceneId: string; action: SceneRefinementAction } | null>(null);
  const [isComplianceDetailsOpen, setIsComplianceDetailsOpen] = useState(false);
  const [isForgeOpen, setIsForgeOpen] = useState(false);
  const [isCtaForgeOpen, setIsCtaForgeOpen] = useState(false);
  const [isVideoSceneModalOpen, setIsVideoSceneModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  React.useEffect(() => {
    setScript(initialScript);
  }, [initialScript]);

  const isConceptCard = script.framework === 'Hook Concept';
  
  // FIX: Always show original scenes for the original duration.
  // This prevents showing a newly generated (and different) version if the user
  // clicks away and then back to the original duration tab.
  const displayedScenes = activeDuration === script.duration 
    ? script.scenes 
    : script.durationVersions?.[activeDuration] ?? script.scenes;

  const handleUpdateHook = (newHook: GeneratedHook) => {
    const updatedScenes = [...script.scenes];
    if (updatedScenes.length > 0) {
        // Replace the dialogue of the first scene with the new hook's VO
        updatedScenes[0] = { 
            ...updatedScenes[0], 
            dialogue: [{ speaker: updatedScenes[0].dialogue[0]?.speaker || 'KOC', line: newHook.vo }],
            onScreenText: newHook.onScreenText 
        };
        onUpdateScript({ ...script, scenes: updatedScenes });
    }
    setIsForgeOpen(false);
  };
  
  const handleUpdateCta = (newCta: string) => {
    onUpdateScript({ ...script, cta: newCta });
    setIsCtaForgeOpen(false);
  };

  const handleComplianceCheck = useCallback(async () => {
    setIsCheckingCompliance(true);
    try {
      const result: ComplianceResult = await checkCompliance(script);
      const updatedScript = { ...script, isCompliant: result.isCompliant, complianceIssues: result.issues };
      onUpdateScript(updatedScript);
      if (result.isCompliant === false && result.issues && result.issues.length > 0) {
        setIsComplianceDetailsOpen(true);
      }
    } catch (error) {
      console.error("Failed to check compliance:", error);
    } finally {
      setIsCheckingCompliance(false);
    }
  }, [script, onUpdateScript]);
  
  const handleRefineScene = useCallback(async (sceneToRefine: Scene, action: SceneRefinementAction) => {
    setRefiningSceneInfo({ sceneId: sceneToRefine.id, action });
    try {
        const refinedDialogue = await refineSceneText(sceneToRefine, script, action);
        const updatedScenes = displayedScenes.map(s => 
            s.id === sceneToRefine.id ? { ...s, dialogue: refinedDialogue } : s
        );
        // When refining a shorter version, update it specifically
        if (activeDuration !== script.duration) {
            onUpdateScript({ 
                ...script, 
                durationVersions: { ...script.durationVersions, [activeDuration]: updatedScenes } 
            });
        } else {
             onUpdateScript({ ...script, scenes: updatedScenes });
        }
    } catch (error) {
        console.error(`Failed to ${action} scene:`, error);
        alert(`場景 ${action} 失敗。`);
    } finally {
        setRefiningSceneInfo(null);
    }
  }, [script, onUpdateScript, activeDuration, displayedScenes]);


  const handleSceneUpdate = (sceneId: string, field: keyof Scene, value: string) => {
      const updatedScenes = displayedScenes.map(s => 
        s.id === sceneId ? { ...s, [field]: value } : s
      );
      if (activeDuration !== script.duration) {
          onUpdateScript({ ...script, durationVersions: { ...script.durationVersions, [activeDuration]: updatedScenes } });
      } else {
          onUpdateScript({ ...script, scenes: updatedScenes });
      }
  };
  
  const handleDialogueUpdate = (sceneId: string, lineIndex: number, field: 'speaker' | 'line', value: string) => {
    const updatedScenes = displayedScenes.map(s => {
        if (s.id === sceneId) {
            const newDialogue = s.dialogue.map((dialogueLine, idx) => {
                if (idx === lineIndex) {
                    return { ...dialogueLine, [field]: value };
                }
                return dialogueLine;
            });
            return { ...s, dialogue: newDialogue };
        }
        return s;
    });
     if (activeDuration !== script.duration) {
        onUpdateScript({ ...script, durationVersions: { ...script.durationVersions, [activeDuration]: updatedScenes } });
    } else {
        onUpdateScript({ ...script, scenes: updatedScenes });
    }
};

  const handleCtaUpdate = (value: string) => {
      onUpdateScript({ ...script, cta: value });
  };
  
  const handleToggleFavorite = () => {
    onUpdateScript({ ...script, isFavorited: !script.isFavorited });
  };

  const handleDurationTabClick = (duration: AdDuration) => {
      setActiveDuration(duration);
      // FIX: Only generate a shorter version if the selected duration is NOT the original one
      // and it hasn't been generated yet. This prevents re-generating the original version.
      if (duration !== script.duration && !script.durationVersions?.[duration]) {
          onGenerateShorterVersion(script.id, duration);
      }
  };

  const getComplianceStatus = () => {
    if (script.isCompliant === true) {
      return <div className="flex items-center text-green-600"><CheckCircleIcon className="w-4 h-4 mr-1" /> 已通過</div>;
    }
    if (script.isCompliant === false) {
      return (
        <div className="flex items-center">
          <div className="flex items-center text-red-600"><ExclamationTriangleIcon className="w-4 h-4 mr-1" /> 未通過</div>
          {script.complianceIssues && script.complianceIssues.length > 0 && (
            <button onClick={() => setIsComplianceDetailsOpen(prev => !prev)} className="ml-2 text-xs text-indigo-600 hover:underline focus:outline-none">
              {isComplianceDetailsOpen ? '收合詳情' : '顯示詳情'}
            </button>
          )}
        </div>
      );
    }
    return <div className="flex items-center text-gray-500">尚未檢查</div>;
  };
  
  const formatScriptForCopy = (scriptToCopy: Script): string => {
    let scriptText = `標題: ${scriptToCopy.title}\n`;
    if (!isConceptCard) {
        scriptText += `(時長: ${activeDuration})\n`;
    }
    scriptText += "========================================\n\n";

    displayedScenes.forEach(scene => {
        const dialogueText = scene.dialogue.map(d => {
            let line = `  ${d.speaker}: ${d.line}`;
            if (scriptToCopy.isDirectorMode && d.directorNote) {
                line += ` (${d.directorNote})`;
            }
            return line;
        }).join('\n');
        scriptText += `[${scene.timecode}]\n`;
        scriptText += `鏡頭: ${scene.shot}\n`;
        if (dialogueText.trim()) {
            scriptText += `對白:\n${dialogueText}\n`;
        }
        if (scene.onScreenText) {
            scriptText += `畫面文字: ${scene.onScreenText}\n`;
        }
        if (scene.sfx) {
            scriptText += `音效/BGM: ${scene.sfx}\n`;
        }
        if (scene.bRoll) {
            scriptText += `B-Roll: ${scene.bRoll}\n`;
        }
        scriptText += `\n`;
    });

    scriptText += "========================================\n";
    scriptText += `CTA: ${scriptToCopy.cta}\n`;

    return scriptText;
  };

  const handleCopyScript = () => {
    const scriptText = formatScriptForCopy(script);
    navigator.clipboard.writeText(scriptText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }, (err) => {
        console.error('Could not copy text: ', err);
        alert('複製失敗！');
    });
  };
  
  const formattedDate = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(script.createdAt));

  const DURATION_HIERARCHY: AdDuration[] = ['30-60s', '15-30s', '10-15s', '6-10s'];

  const availableDurations = useMemo(() => {
      const originalIndex = DURATION_HIERARCHY.indexOf(script.duration);
      if (originalIndex === -1) return [script.duration];
      return DURATION_HIERARCHY.slice(originalIndex);
  }, [script.duration]);

  return (
    <>
    <div className={`bg-white p-6 rounded-lg shadow-sm border ${isConceptCard ? 'border-dashed border-indigo-400 bg-indigo-50/50' : 'border-gray-200'} animate-reveal`}>
      <div className="border-b border-gray-200 pb-4 mb-4">
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-gray-900 pr-4">{script.title}</h3>
            <div className="flex items-center space-x-2 flex-shrink-0">
                {script.productionWarnings && script.productionWarnings.length > 0 && (
                    <div className="group relative">
                        <LightbulbIcon className="w-5 h-5 text-yellow-500 animate-pulse" />
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-10 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                            <h4 className="font-bold text-yellow-800 text-sm mb-2">製片審查提醒</h4>
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                                {script.productionWarnings.map((warning, i) => <li key={i}>{warning}</li>)}
                            </ul>
                            <div className="arrow absolute bottom-full right-4 w-3 h-3 bg-white border-t border-l border-gray-200 transform rotate-45 -mb-1.5"></div>
                        </div>
                    </div>
                )}
                <QualityScoreDisplay scoreCard={script.scoreCard} />
                <button onClick={handleCopyScript} title={isCopied ? "已複製!" : "複製腳本"} className="text-gray-400 hover:text-indigo-600 transition-colors disabled:text-gray-300">
                    {isCopied ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                </button>
                <button onClick={handleToggleFavorite} title={script.isFavorited ? '取消收藏' : '收藏'} className="text-gray-400 hover:text-yellow-500 transition-colors">
                    <StarIcon className={`w-5 h-5 ${script.isFavorited ? 'text-yellow-400' : ''}`} filled={script.isFavorited} />
                </button>
                <button onClick={() => onDeleteScript(script.id)} title="刪除腳本" className="text-gray-400 hover:text-red-600 transition-colors">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
        <div className="flex justify-between items-center">
             <div className="flex flex-wrap items-center gap-2">
                 {!isConceptCard && availableDurations.length > 1 ? (
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                        {availableDurations.map((duration, index) => {
                            const isLoading = script.isGeneratingDuration === duration;
                            return (
                                <button
                                    key={duration}
                                    type="button"
                                    onClick={() => handleDurationTabClick(duration)}
                                    disabled={isLoading}
                                    className={`px-3 py-1 text-xs font-medium border border-gray-200 transition-colors duration-150
                                        ${activeDuration === duration ? 'bg-indigo-50 text-indigo-700 z-10' : 'bg-white text-gray-700 hover:bg-gray-50'}
                                        ${index === 0 ? 'rounded-l-full' : ''}
                                        ${index === availableDurations.length - 1 ? 'rounded-r-full' : ''}
                                        ${isLoading ? 'cursor-not-allowed' : ''}
                                    `}
                                >
                                    {isLoading ? <SpinnerIcon className="w-3 h-3"/> : (DURATION_LABELS[duration] ?? duration)}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <Tag className="bg-indigo-100 text-indigo-800">{DURATION_LABELS[script.duration] ?? script.duration}</Tag>
                )}
                <Tag className="bg-slate-100 text-slate-800 capitalize">卡池: {script.cardPool}</Tag>
                {script.seed && (
                  <Tag className="bg-gray-100 text-gray-700">🌱 {script.seed}</Tag>
                )}
                {script.strategyFramework && (
                  <Tag className="bg-cyan-100 text-cyan-800 font-semibold">策略: {script.strategyFramework}</Tag>
                )}
                {script.duelTacticUsed && (
                  <Tag className="bg-red-100 text-red-800 font-semibold">招式: {script.duelTacticUsed}</Tag>
                )}
                {!isConceptCard && <span className="text-xs text-gray-400">AI 生成於 {script.voice} / {script.framework}</span>}
            </div>
        </div>
        {!isConceptCard && <PacingOverview script={script} scenes={displayedScenes} />}
      </div>
      
      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">腳本分鏡</h4>
        <div className="space-y-4">
            {displayedScenes.map((scene, index) => {
                const isRefining = refiningSceneInfo?.sceneId === scene.id;

              return (
                <div key={scene.id} className="flex gap-x-4 border-b border-gray-100 pb-3 last:border-b-0">
                    <div className="w-16 flex-shrink-0 pt-1 text-sm"><EditableText text={scene.timecode} onSave={(val) => handleSceneUpdate(scene.id, 'timecode', val)} className="font-bold text-indigo-600" /></div>
                    <div className="flex-grow space-y-1.5">
                        <p className="text-xs"><strong className="font-semibold text-gray-500">Shot:</strong> <EditableText text={scene.shot} onSave={(val) => handleSceneUpdate(scene.id, 'shot', val)} /></p>
                        
                        <div className="group relative text-base text-gray-800 leading-relaxed space-y-2">
                           <div className="flex items-start">
                                <div className="w-full">
                                {scene.dialogue.map((dialogueLine, lineIndex) => {
                                    return (
                                        <div key={lineIndex} className="flex items-baseline gap-2">
                                            <EditableText 
                                                text={dialogueLine.speaker} 
                                                onSave={(val) => handleDialogueUpdate(scene.id, lineIndex, 'speaker', val)}
                                                className="font-bold text-gray-600 w-20 flex-shrink-0 text-left"
                                            />
                                            <div className="flex-grow">
                                                <EditableText 
                                                    text={dialogueLine.line} 
                                                    onSave={(val) => handleDialogueUpdate(scene.id, lineIndex, 'line', val)}
                                                >
                                                    {script.isDirectorMode && dialogueLine.directorNote && (
                                                        <span className="text-gray-500 italic ml-2 text-sm">({dialogueLine.directorNote})</span>
                                                    )}
                                                </EditableText>
                                            </div>
                                        </div>
                                    )
                                })}
                                </div>
                                {!isConceptCard && index === 0 && (
                                    <button
                                        onClick={() => setIsForgeOpen(true)}
                                        title="HOOK 優化室"
                                        className="ml-2 inline-block text-gray-500 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0 pt-1"
                                    >
                                        <HammerIcon className="w-4 h-4" />
                                    </button>
                                )}
                           </div>

                            {!isConceptCard && <div className="absolute top-0 right-0 -mt-1 -mr-1 flex items-center space-x-1 bg-white bg-opacity-80 backdrop-blur-sm p-1.5 rounded-full shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {isRefining ? (
                                    <div className="p-1"><SpinnerIcon className="w-4 h-4 text-indigo-600" /></div>
                                ) : (
                                    <>
                                        <button onClick={() => handleRefineScene(scene, 'condense')} title="精簡" className="text-gray-500 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-100"><ArrowInwardIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleRefineScene(scene, 'expand')} title="擴寫" className="text-gray-500 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-100"><ArrowOutwardIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleRefineScene(scene, 'polish')} title="潤飾" className="text-gray-500 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-100"><WandIcon className="w-4 h-4" /></button>
                                    </>
                                )}
                            </div>}
                        </div>
                        
                        <p className="text-xs"><strong className="font-semibold text-gray-500">Text:</strong> <EditableText text={scene.onScreenText} onSave={(val) => handleSceneUpdate(scene.id, 'onScreenText', val)} isItalic={true} /></p>
                        <p className="text-xs text-gray-500"><strong className="font-semibold">SFX/BGM:</strong> <EditableText text={scene.sfx} onSave={(val) => handleSceneUpdate(scene.id, 'sfx', val)} /></p>
                        <p className="text-xs text-gray-500"><strong className="font-semibold">B-Roll:</strong> <EditableText text={scene.bRoll} onSave={(val) => handleSceneUpdate(scene.id, 'bRoll', val)} /></p>
                    </div>
                </div>
              );
            })}
             <div className="flex items-center gap-x-4 text-sm font-semibold pt-2">
                <div className="w-16 flex-shrink-0 text-green-600">CTA</div>
                <div className="flex-grow flex items-center gap-2">
                    <EditableText text={script.cta} onSave={handleCtaUpdate} />
                     {!isConceptCard && (
                        <button
                            onClick={() => setIsCtaForgeOpen(true)}
                            title="CTA 優化室"
                            className="text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        >
                            <SparklesIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
             </div>
        </div>
      </div>

      {!isConceptCard && script.keywordAnalysis && <KeywordAnalysisDisplay analysis={script.keywordAnalysis} />}
      
      {isComplianceDetailsOpen && script.isCompliant === false && script.complianceIssues && script.complianceIssues.length > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 p-4 rounded-md">
            <h4 className="font-semibold text-yellow-800 mb-2">合規風險</h4>
            <ul className="space-y-3">
                {script.complianceIssues.map(issue => (
                    <li key={issue.id} className="text-sm">
                        <p className="text-red-700"><strong>原文:</strong> "{issue.text}"</p>
                        <p className="text-yellow-900"><strong>原因:</strong> {issue.reason}</p>
                        <p className="text-green-800"><strong>建議:</strong> "{issue.suggestion}"</p>
                    </li>
                ))}
            </ul>
        </div>
      )}

      {script.copyrightNotice && (
        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
                <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                        {script.copyrightNotice}
                    </p>
                </div>
            </div>
        </div>
      )}

      {script.groundingSources && script.groundingSources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
            <GlobeIcon className="w-4 h-4 mr-2 text-gray-500" />
            資料來源 (由 Google 搜尋提供)
            </h4>
            <ul className="list-disc list-inside space-y-1">
            {script.groundingSources.map((source, index) => (
                <li key={index} className="text-sm">
                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline hover:text-indigo-800 break-words">
                    {source.title}
                </a>
                </li>
            ))}
            </ul>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <ClockIcon className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
            </div>
            {!isConceptCard && <div className="text-sm font-medium text-gray-600">
              合規狀態: {getComplianceStatus()}
            </div>}
        </div>
        {isConceptCard ? (
             <button
                onClick={() => onContinueScript(script)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
            >
                <SparklesIcon className="w-5 h-5 mr-2" />
                續寫腳本
            </button>
        ) : (
            <div className="flex items-center space-x-3">
                {isProMode && (
                    <button
                        onClick={() => setIsVideoSceneModalOpen(true)}
                        className="inline-flex items-center px-3 py-1.5 border border-purple-300 text-sm font-medium rounded-md shadow-sm text-purple-700 bg-purple-50 hover:bg-purple-100"
                    >
                        <ClapperboardIcon className="w-4 h-4 mr-2" />
                        生成影片場景
                    </button>
                )}
                 <button
                    onClick={() => onGenerateABVersion(script)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                    <ABTestIcon className="w-4 h-4 mr-2" />
                    生成 A/B 版本
                </button>
                <div className="flex items-center space-x-2 pl-2 border-l">
                    {script.isAddingDirectorNotes ? (<SpinnerIcon className="w-5 h-5 text-indigo-600" />) :
                    (<label htmlFor={`director-mode-${script.id}`} className="relative inline-flex items-center cursor-pointer" title="導演模式">
                        <input type="checkbox" id={`director-mode-${script.id}`} className="sr-only peer" checked={script.isDirectorMode} onChange={() => onToggleDirectorMode(script.id)} />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>)}
                     <ClapperboardIcon className={`w-5 h-5 ${script.isDirectorMode ? 'text-indigo-600' : 'text-gray-400'}`} />
                </div>
                <button
                    onClick={handleComplianceCheck}
                    disabled={isCheckingCompliance}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                    <ShieldCheckIcon className="w-4 h-4 mr-2" />
                    {isCheckingCompliance ? '檢查中...' : '合規自查'}
                </button>
            </div>
        )}
      </div>
    </div>
    {isForgeOpen && (
        <HookForgeModal
            isOpen={isForgeOpen}
            onClose={() => setIsForgeOpen(false)}
            script={script}
            onHookSelect={handleUpdateHook}
        />
    )}
    {isCtaForgeOpen && (
        <CtaForgeModal
            isOpen={isCtaForgeOpen}
            onClose={() => setIsCtaForgeOpen(false)}
            script={script}
            onCtaSelect={handleUpdateCta}
        />
    )}
    {isVideoSceneModalOpen && (
        <VideoSceneGeneratorModal
            isOpen={isVideoSceneModalOpen}
            onClose={(updatedScript) => {
                if (updatedScript) {
                    onUpdateScript(updatedScript);
                }
                setIsVideoSceneModalOpen(false);
            }}
            script={script}
        />
    )}
    </>
  );
};

export default ScriptCard;