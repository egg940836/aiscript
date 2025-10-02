


import React, { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { type Brief, type Script, type PendingScript, type FailedScript, ProgressCallback, GeneratedHook, HookConciseness, type BriefWizardProps, CardPool, Scene, Presenter, AdPlacement, AdDuration, HookMethod, HookStressTestResult, SavedHook } from './types';
import BriefWizard from './components/BriefWizard';
import ResultsView from './components/ResultsView';
// FIX: Removed non-existent `checkProductionFeasibility` from import.
import { generateSingleScript, generateHooks, addDirectorNotes, generateShorterScriptVersion } from './services/geminiService';
import BottomNavBar from './components/BottomNavBar';
import HookForgeResultModal from './components/HookForgeResultModal';
import ContinueWritingModal from './components/ContinueWritingModal';
import HookStressTestModal from './components/HookStressTestModal';
import { HOOK_METHOD_OPTIONS } from './constants';
import ManualHookModal from './components/ManualHookModal';


type MobileTab = 'brief' | 'results';

const App: React.FC = () => {
  const [generatedScripts, setGeneratedScripts] = useState<Script[]>(() => {
    try {
        const saved = localStorage.getItem('gachaScripts_v1');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Failed to load scripts from localStorage", e);
        return [];
    }
  });
  const [pendingScripts, setPendingScripts] = useState<PendingScript[]>([]);
  const [failedScripts, setFailedScripts] = useState<FailedScript[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('brief');
  const [isProMode, setIsProMode] = useState(false);
  
  const isCurrentlyProcessing = useRef(false);

  // Effect to save scripts to localStorage whenever they change
  useEffect(() => {
    try {
        localStorage.setItem('gachaScripts_v1', JSON.stringify(generatedScripts));
    } catch (e) {
        console.error("Failed to save scripts to localStorage", e);
    }
  }, [generatedScripts]);

  // New state for Hook Forge
  const [isHookForgeModalOpen, setIsHookForgeModalOpen] = useState(false);
  const [forgedHooks, setForgedHooks] = useState<GeneratedHook[]>([]);
  const [isForgingHooks, setIsForgingHooks] = useState(false);
  const [hookForgeError, setHookForgeError] = useState<string | null>(null);
  const [hookForgeBrief, setHookForgeBrief] = useState<Brief | null>(null);

  // New state for Continue Writing
  const [scriptToContinue, setScriptToContinue] = useState<Script | null>(null);

  // New state for Hook Stress Test
  const [isHookStressTestModalOpen, setIsHookStressTestModalOpen] = useState(false);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressTestResults, setStressTestResults] = useState<HookStressTestResult | null>(null);
  const [stressTestError, setStressTestError] = useState<string | null>(null);
  const [savedHooks, setSavedHooks] = useState<SavedHook[]>(() => {
    try {
        const saved = localStorage.getItem('gachaSavedHooks_v1');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Failed to load saved hooks from localStorage", e);
        return [];
    }
  });

  const [isManualHookModalOpen, setIsManualHookModalOpen] = useState(false);
  const [manualHookBrief, setManualHookBrief] = useState<Brief | null>(null);

  useEffect(() => {
    try {
        localStorage.setItem('gachaSavedHooks_v1', JSON.stringify(savedHooks));
    } catch (e) {
        console.error("Failed to save hooks to localStorage", e);
    }
  }, [savedHooks]);
  
  const handleUpdateScript = useCallback((updatedScript: Script) => {
    setGeneratedScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s));
  }, []);

  const handleGenerateScripts = useCallback((brief: Brief, count: number = 1, hookConciseness: HookConciseness, isCharged: boolean = false) => {
    setError(null);
    if (window.innerWidth < 1024) {
      setActiveMobileTab('results');
    }

    const batchId = uuidv4();
    const newTasks: PendingScript[] = Array.from({ length: count }, (_, i) => ({
      id: uuidv4(),
      batchId: batchId,
      batchCurrent: i + 1,
      batchTotal: count,
      brief: brief,
      hookConciseness: hookConciseness,
      isCharged: isCharged,
      statusMessage: '正在準備召喚...',
    }));

    setPendingScripts(prev => [...prev, ...newTasks]);
  }, []);
  
  // New handler for generating hooks
  const handleGenerateHooks = useCallback(async (brief: Brief, conciseness: HookConciseness) => {
    setError(null);
    setHookForgeError(null);
    setForgedHooks([]);
    setHookForgeBrief(brief);
    setIsForgingHooks(true);
    setIsHookForgeModalOpen(true);

    try {
        const hooks = await generateHooks(brief, { conciseness });
        setForgedHooks(hooks);
    } catch (err) {
        const message = err instanceof Error ? err.message : '鍛造 Hooks 時發生未知錯誤。';
        setHookForgeError(message);
    } finally {
        setIsForgingHooks(false);
    }
  }, []);
  
  const handleStressTestHooks = useCallback(async (brief: Brief) => {
    setStressTestError(null);
    setStressTestResults(null);
    setIsStressTesting(true);
    setIsHookStressTestModalOpen(true);

    try {
        const methodsToTest = HOOK_METHOD_OPTIONS.filter(m => m !== HookMethod.Automatic);
        
        const promises = methodsToTest.map(method => 
            generateHooks(brief, { method, count: 3 })
                .then(hooks => ({ method, hooks }))
        );
        
        const results = await Promise.all(promises);

        const formattedResults: HookStressTestResult = results.reduce((acc, result) => {
            acc[result.method] = result.hooks;
            return acc;
        }, {} as HookStressTestResult);
        
        setStressTestResults(formattedResults);
    } catch (err) {
        const message = err instanceof Error ? err.message : '壓力測試時發生未知錯誤。';
        setStressTestError(message);
    } finally {
        setIsStressTesting(false);
    }
  }, []);

  const handleToggleSavedHook = useCallback((hook: GeneratedHook, method: HookMethod) => {
    setSavedHooks(prev => {
        const hookId = `${method}-${hook.vo.slice(0, 10)}`;
        const existingIndex = prev.findIndex(h => h.id === hookId);

        if (existingIndex > -1) {
            return prev.filter(h => h.id !== hookId);
        } else {
            const newSavedHook: SavedHook = {
                ...hook,
                id: hookId,
                method: method,
                createdAt: Date.now()
            };
            return [newSavedHook, ...prev];
        }
    });
}, []);


  // New handler for selecting a generated hook
  const handleSelectHook = useCallback((hook: GeneratedHook) => {
    if (!hookForgeBrief) return;

    const newScript: Script = {
        id: uuidv4(),
        brief: hookForgeBrief,
        framework: 'Hook Concept',
        voice: 'N/A',
        duration: hookForgeBrief.duration,
        scenes: [{
            id: uuidv4(),
            timecode: '0-5s',
            shot: '待填寫...',
            dialogue: [{ speaker: hookForgeBrief.presenters[0]?.name || '旁白', line: hook.vo }],
            onScreenText: hook.onScreenText,
            sfx: '待填寫...',
            bRoll: '待填寫...',
        }],
        presenters: hookForgeBrief.presenters,
        cta: '待續寫...',
        isCompliant: null,
        title: `${hookForgeBrief.productName || hookForgeBrief.storeName || '新腳本'} - 開頭靈感`,
        isFavorited: false,
        keywordAnalysis: { core: [], context: [], benefit: [], proof: [] },
        scoreCard: {
            scriptId: '', // will be set below
            subscores: {
                hookStrength: { name: '開場鉤子強度', value: 0, reason: '概念' },
                strategyExecution: { name: '策略執行度', value: 0, reason: '概念' },
                clarity: { name: '訊息清晰度', value: 0, reason: '概念' },
                emotionalResonance: { name: '情感共鳴度', value: 0, reason: '概念' },
                ctaStrength: { name: 'CTA強度', value: 0, reason: '概念' },
                brandConsistency: { name: '品牌一致性', value: 0, reason: '概念' },
            },
            overallScore: 0,
            grade: 'D',
            rarity: 'N',
            critique: '這是一張僅包含開頭 (Hook) 的概念卡，請基於此靈感繼續完成腳本。',
            topFixes: ['續寫腳本內容', '完成 CTA 設計'],
        },
        createdAt: Date.now(),
        cardPool: hookForgeBrief.cardPool,
        seed: hookForgeBrief.seed,
    };
    newScript.scoreCard.scriptId = newScript.id;

    setGeneratedScripts(prev => [newScript, ...prev]);
    setIsHookForgeModalOpen(false);
    if (window.innerWidth < 1024) {
      setActiveMobileTab('results');
    }

  }, [hookForgeBrief]);

    const handleOpenManualHook = useCallback((brief: Brief) => {
        setManualHookBrief(brief);
        setIsManualHookModalOpen(true);
    }, []);

    const handleManualHookSubmit = useCallback((hook: GeneratedHook) => {
        if (!manualHookBrief) return;

        const newScript: Script = {
            id: uuidv4(),
            brief: manualHookBrief,
            framework: 'Hook Concept',
            voice: 'N/A',
            duration: manualHookBrief.duration,
            scenes: [{
                id: uuidv4(),
                timecode: '0-3s',
                shot: '待填寫...',
                dialogue: [{ speaker: manualHookBrief.presenters[0]?.name || '旁白', line: hook.vo }],
                onScreenText: hook.onScreenText,
                sfx: '待填寫...',
                bRoll: '待填寫...',
            }],
            presenters: manualHookBrief.presenters,
            cta: '待續寫...',
            isCompliant: null,
            title: `${manualHookBrief.productName || manualHookBrief.storeName || '新腳本'} - 手動開頭靈感`,
            isFavorited: false,
            keywordAnalysis: { core: [], context: [], benefit: [], proof: [] },
            scoreCard: {
                scriptId: '', // will be set below
                subscores: { hookStrength: { name: '開場鉤子強度', value: 0, reason: '概念' }, strategyExecution: { name: '策略執行度', value: 0, reason: '概念' }, clarity: { name: '訊息清晰度', value: 0, reason: '概念' }, emotionalResonance: { name: '情感共鳴度', value: 0, reason: '概念' }, ctaStrength: { name: 'CTA強度', value: 0, reason: '概念' }, brandConsistency: { name: '品牌一致性', value: 0, reason: '概念' }, },
                overallScore: 0, grade: 'D', rarity: 'N',
                critique: '這是一張僅包含開頭 (Hook) 的概念卡，請基於此靈感繼續完成腳本。',
                topFixes: ['續寫腳本內容', '完成 CTA 設計'],
            },
            createdAt: Date.now(),
            cardPool: manualHookBrief.cardPool,
            seed: manualHookBrief.seed,
        };
        newScript.scoreCard.scriptId = newScript.id;

        setGeneratedScripts(prev => [newScript, ...prev]);
        setIsManualHookModalOpen(false);
        if (window.innerWidth < 1024) {
          setActiveMobileTab('results');
        }
    }, [manualHookBrief]);

    // New handler for starting the continuation process
    const handleContinueScript = useCallback((originalScript: Script, newCardPool: CardPool) => {
        if (!hookForgeBrief || !originalScript.scenes[0]) return;

        // 1. Remove the old concept card
        setGeneratedScripts(prev => prev.filter(s => s.id !== originalScript.id));
        setScriptToContinue(null);

        // 2. Create a new pending task for continuation
        const newBrief = { ...hookForgeBrief, cardPool: newCardPool };
        const continuationTask: PendingScript = {
            id: uuidv4(),
            batchId: uuidv4(),
            batchCurrent: 1,
            batchTotal: 1,
            brief: newBrief,
            statusMessage: '正在準備續寫...',
            continuationScene: originalScript.scenes[0],
        };

        setPendingScripts(prev => [...prev, continuationTask]);
        
        if (window.innerWidth < 1024) {
            setActiveMobileTab('results');
        }
    }, [hookForgeBrief]);

    const handleGenerateABVersion = useCallback((originalScript: Script) => {
        if (window.innerWidth < 1024) {
            setActiveMobileTab('results');
        }
        const newTask: PendingScript = {
            id: uuidv4(),
            batchId: `ab-${originalScript.id.substring(0, 8)}`,
            batchCurrent: 1,
            batchTotal: 1,
            brief: originalScript.brief,
            statusMessage: `正在為 "${originalScript.title}" 生成 A/B 版本...`,
            abTestOriginalScript: originalScript,
        };
        setPendingScripts(prev => [newTask, ...prev]);
    }, []);

    const handleToggleDirectorMode = useCallback(async (scriptId: string) => {
        const targetScript = generatedScripts.find(s => s.id === scriptId);
        if (!targetScript) return;

        const isTurningOn = !targetScript.isDirectorMode;
        
        const needsGeneration = isTurningOn && !targetScript.scenes.some(s => s.dialogue.some(d => d.directorNote));

        if (needsGeneration) {
            handleUpdateScript({ ...targetScript, isAddingDirectorNotes: true });
            try {
                const scenesWithNotes = await addDirectorNotes(targetScript.scenes);
                handleUpdateScript({ 
                    ...targetScript, 
                    scenes: scenesWithNotes, 
                    isDirectorMode: true, 
                    isAddingDirectorNotes: false 
                });
            } catch (error) {
                console.error("Failed to add director notes:", error);
                alert("導演模式筆記生成失敗！");
                handleUpdateScript({ ...targetScript, isAddingDirectorNotes: false });
            }
        } else {
            handleUpdateScript({ ...targetScript, isDirectorMode: isTurningOn });
        }
    }, [generatedScripts, handleUpdateScript]);

     const handleGenerateShorterVersion = useCallback(async (scriptId: string, targetDuration: AdDuration) => {
        const targetScript = generatedScripts.find(s => s.id === scriptId);
        if (!targetScript || targetScript.isGeneratingDuration) return;

        handleUpdateScript({ ...targetScript, isGeneratingDuration: targetDuration });

        try {
            const shorterScenes = await generateShorterScriptVersion(targetScript, targetDuration);
            handleUpdateScript({
                ...targetScript,
                isGeneratingDuration: false,
                durationVersions: {
                    ...targetScript.durationVersions,
                    [targetDuration]: shorterScenes,
                }
            });
        } catch (error) {
            console.error(`Failed to generate shorter version for ${targetDuration}:`, error);
            alert(`腳本裁切 (${targetDuration}) 失敗！`);
            handleUpdateScript({ ...targetScript, isGeneratingDuration: false });
        }
    }, [generatedScripts, handleUpdateScript]);

    const handleImportScripts = useCallback((importedScripts: Script[]) => {
      if (!Array.isArray(importedScripts)) {
          alert("匯入的檔案格式不正確。");
          return;
      }
      
      setGeneratedScripts(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newScripts = importedScripts.filter(s => s.id && !existingIds.has(s.id));
          
          if (newScripts.length === 0) {
              alert("沒有新的腳本可匯入 (可能所有腳本的 ID 都已存在)。");
              return prev;
          } else {
              alert(`成功匯入 ${newScripts.length} 個新腳本！`);
          }
  
          const scriptsToImport = newScripts.map(s => ({ ...s, isFavorited: true }));
  
          return [...scriptsToImport, ...prev];
      });
    }, []);


  // Queue Processor
  useEffect(() => {
    const processQueue = async () => {
      if (isCurrentlyProcessing.current || pendingScripts.length === 0) {
        return;
      }
      
      isCurrentlyProcessing.current = true;
      
      const task = pendingScripts[0];
      const { brief, continuationScene, hookConciseness, isCharged, abTestOriginalScript } = task;

      const handleProgressUpdate: ProgressCallback = (update) => {
        setPendingScripts(prev => 
            prev.map(p => p.id === task.id ? { ...p, statusMessage: update.statusMessage } : p)
        );
      };
      
      try {
        const script = await generateSingleScript(brief, task.batchCurrent, task.batchTotal, handleProgressUpdate, continuationScene, hookConciseness, isCharged, abTestOriginalScript);
        
        // FIX: Removed call to non-existent `checkProductionFeasibility` and related logic.
        setGeneratedScripts(prev => [script, ...prev]);
        setPendingScripts(prev => prev.slice(1));
      } catch (err) {
        const message = err instanceof Error ? err.message : `腳本 #${task.batchCurrent}/${task.batchTotal} 生成失敗。`;
        console.error(err);
        const failedTask: FailedScript = {
          id: task.id,
          brief: brief,
          error: message,
          batchId: task.batchId,
          batchCurrent: task.batchCurrent,
          batchTotal: task.batchTotal
        };
        setFailedScripts(prev => [failedTask, ...prev]);
        setPendingScripts(prev => prev.slice(1));
      } finally {
        isCurrentlyProcessing.current = false;
      }
    };
    
    processQueue();
  }, [pendingScripts]);

  const handleRetryScript = useCallback((failedScriptId: string) => {
    const failedTask = failedScripts.find(s => s.id === failedScriptId);
    if (failedTask) {
        const newTask: PendingScript = {
            id: uuidv4(),
            batchId: failedTask.batchId || uuidv4(),
            batchCurrent: failedTask.batchCurrent || 1,
            batchTotal: failedTask.batchTotal || 1,
            brief: failedTask.brief,
            statusMessage: '正在準備重試...',
        };

        setFailedScripts(prev => prev.filter(s => s.id !== failedScriptId));
        setPendingScripts(prev => [...prev, newTask]);
    }
  }, [failedScripts]);

  const handleRemoveFailedScript = useCallback((failedScriptId: string) => {
    setFailedScripts(prev => prev.filter(s => s.id !== failedScriptId));
  }, []);

  const handleCancelAllPending = useCallback(() => {
    setPendingScripts([]);
  }, []);


  const handleClearScripts = () => {
    const scriptsToClear = generatedScripts.filter(s => !s.isFavorited);
    
    if (scriptsToClear.length === 0 && failedScripts.length === 0) {
        alert("沒有可清空的卡牌 (已收藏的卡牌會被保留)。");
        return;
    }

    const hasHighRarity = scriptsToClear.some(s => s.scoreCard.rarity === 'SSR' || s.scoreCard.rarity === 'SR');

    let confirmed = true;
    if (hasHighRarity) {
        confirmed = window.confirm("您即將刪除稀有度為 SSR 或 SR 的卡牌，確定要繼續嗎？(已收藏的卡牌會被保留)");
    }

    if (confirmed) {
        setGeneratedScripts(prev => prev.filter(s => s.isFavorited));
        setFailedScripts([]);
        setError(null);
    }
  };
  
  const handleDeleteScript = useCallback((scriptId: string) => {
      setGeneratedScripts(prev => prev.filter(s => s.id !== scriptId));
  }, []);


  const Header = () => (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-20 border-b border-gray-200/50">
      <div className="max-w-screen-2xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              廣告腳本扭蛋系統 <span className="text-sm font-normal text-gray-500">v0.5.0</span>
            </h1>
          </div>
          <div className="border-l border-gray-300 pl-4">
            <label htmlFor="pro-mode-toggle" title="啟用後，可在腳本卡上使用「影片場景生成器」，並繞過 Brief 填寫驗證" className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="pro-mode-toggle" className="sr-only peer" checked={isProMode} onChange={() => setIsProMode(!isProMode)} />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                <span className="ml-3 text-sm font-semibold text-gray-800">專業版</span>
            </label>
          </div>
        </div>
      </div>
    </header>
  );

  const briefWizardProps: BriefWizardProps = {
    onGenerate: handleGenerateScripts,
    onGenerateHooks: handleGenerateHooks,
    onStressTestHooks: handleStressTestHooks,
    onOpenManualHook: handleOpenManualHook,
    isQueueProcessing: pendingScripts.length > 0 || isCurrentlyProcessing.current,
    isProMode: isProMode
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-screen-2xl mx-auto sm:px-6 lg:px-8 pb-20 lg:pb-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4 mx-4 sm:mx-0 whitespace-pre-wrap" role="alert">
            <div className="flex justify-between items-center">
              <div>
                <strong className="font-bold">發生錯誤!</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
              <button onClick={() => setError(null)} className="p-1 text-red-700 hover:bg-red-200 rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Desktop Layout */}
        <div className="hidden lg:flex flex-col lg:flex-row lg:space-x-8 lg:items-start pt-6">
          <div className="lg:w-2/5 xl:w-1/3">
            <BriefWizard {...briefWizardProps} />
          </div>
          
          <div className="lg:w-3/5 xl:w-2/3 mt-8 lg:mt-0">
            <ResultsView
              scripts={generatedScripts}
              pendingScripts={pendingScripts}
              failedScripts={failedScripts}
              onClear={handleClearScripts}
              onUpdateScript={handleUpdateScript}
              onDeleteScript={handleDeleteScript}
              onRetryScript={handleRetryScript}
              onRemoveFailedScript={handleRemoveFailedScript}
              onCancelAllPending={handleCancelAllPending}
              isProMode={isProMode}
              onContinueScript={setScriptToContinue}
              onGenerateABVersion={handleGenerateABVersion}
              onToggleDirectorMode={handleToggleDirectorMode}
              onGenerateShorterVersion={handleGenerateShorterVersion}
              onImportScripts={handleImportScripts}
            />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden p-4">
            {activeMobileTab === 'brief' && (
                <BriefWizard {...briefWizardProps} />
            )}
            {activeMobileTab === 'results' && (
                <ResultsView
                  scripts={generatedScripts}
                  pendingScripts={pendingScripts}
                  failedScripts={failedScripts}
                  onClear={handleClearScripts}
                  onUpdateScript={handleUpdateScript}
                  onDeleteScript={handleDeleteScript}
                  onRetryScript={handleRetryScript}
                  onRemoveFailedScript={handleRemoveFailedScript}
                  onCancelAllPending={handleCancelAllPending}
                  isProMode={isProMode}
                  onContinueScript={setScriptToContinue}
                  onGenerateABVersion={handleGenerateABVersion}
                  onToggleDirectorMode={handleToggleDirectorMode}
                  onGenerateShorterVersion={handleGenerateShorterVersion}
                  onImportScripts={handleImportScripts}
                />
            )}
        </div>

      </main>
      <BottomNavBar activeTab={activeMobileTab} setActiveTab={setActiveMobileTab} />
       <HookForgeResultModal
        isOpen={isHookForgeModalOpen}
        onClose={() => setIsHookForgeModalOpen(false)}
        isLoading={isForgingHooks}
        error={hookForgeError}
        hooks={forgedHooks}
        onSelectHook={handleSelectHook}
      />
      <HookStressTestModal
        isOpen={isHookStressTestModalOpen}
        onClose={() => setIsHookStressTestModalOpen(false)}
        isLoading={isStressTesting}
        error={stressTestError}
        results={stressTestResults}
        savedHooks={savedHooks}
        onToggleSave={handleToggleSavedHook}
      />
      {scriptToContinue && (
        <ContinueWritingModal
            isOpen={!!scriptToContinue}
            onClose={() => setScriptToContinue(null)}
            script={scriptToContinue}
            onContinue={handleContinueScript}
        />
      )}
      <ManualHookModal
        isOpen={isManualHookModalOpen}
        onClose={() => setIsManualHookModalOpen(false)}
        onSubmit={handleManualHookSubmit}
      />
      <footer className="fixed bottom-2 right-4 text-xs text-gray-400 z-40">
        天御集團 資訊部
      </footer>
    </div>
  );
};

export default App;