

import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { type Script, type Scene, type VideoScene, DialogueLine, Presenter, ActorDefinition, ActorRole, SavedActor, ActorImageData } from '../types';
import { generateSingleKeyframe, generateVideoPromptForScene, analyzeSceneTransitions } from '../services/geminiService';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { CopyIcon } from './icons/CopyIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClapperboardIcon } from './icons/ClapperboardIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { RefreshCwIcon } from './icons/RefreshCwIcon';
import ActorCreatorModal from './ActorCreatorModal';
import VirtualCastingRoom from './VirtualCastingRoom';
import { UsersIcon } from './icons/UsersIcon';
import { DEFAULT_ACTOR_DEFINITION } from '../constants';

interface VideoSceneGeneratorModalProps {
    isOpen: boolean;
    onClose: (updatedScript?: Script) => void;
    script: Script;
}

// --- Helper Components ---

const ChainIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/>
  </svg>
);

const ScissorsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
    <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
    <line x1="8.12" y1="8.12" x2="12" y2="12"/>
  </svg>
);

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToUrl = (base64: string, mimeType: string = 'image/jpeg'): string => {
    return `data:${mimeType};base64,${base64}`;
}

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const getSceneDescription = (scene: Scene): string => {
    return `Dialogue: ${scene.dialogue.map(d => `${d.speaker} says '${d.line}'`).join('. ')}. Visuals: ${scene.shot}. On-screen text: ${scene.onScreenText}. B-Roll: ${scene.bRoll}.`;
};

// --- Main Component ---

const VideoSceneGeneratorModal: React.FC<VideoSceneGeneratorModalProps> = ({ isOpen, onClose, script: initialScript }) => {
    const [script, setScript] = useState<Script>(initialScript);
    
    const [sceneLoadingState, setSceneLoadingState] = useState<Record<string, 'start' | 'end' | 'prompt' | 'both' | false>>({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    
    const [error, setError] = useState<string | null>(null);
    const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
    const [copiedDialogueId, setCopiedDialogueId] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    
    const [isActorCreatorOpen, setIsActorCreatorOpen] = useState(false);
    const [isCastingRoomOpen, setIsCastingRoomOpen] = useState(false);
    const [editingActorId, setEditingActorId] = useState<string | null>(null);

    const visiblePresenters = initialScript.presenters.filter(p => p.role !== ActorRole.VoiceOver && p.role !== ActorRole.HiddenCamera);

    useEffect(() => {
        if (isOpen) {
            setScript(initialScript);
            if (!initialScript.videoScenes || initialScript.videoScenes.length !== initialScript.scenes.length) {
                setScript(prev => ({
                    ...prev,
                    videoScenes: prev.scenes.map(scene => ({ sceneId: scene.id }))
                }));
            }
            const analyze = async () => {
                if (initialScript.videoScenes?.every(vs => vs.transitionToNext !== undefined)) return;
                setIsAnalyzing(true); setError(null);
                try {
                    const transitions = await analyzeSceneTransitions(initialScript.scenes);
                    const updatedVideoScenes = initialScript.scenes.map((scene, index) => ({
                        ...(initialScript.videoScenes?.find(vs => vs.sceneId === scene.id) || { sceneId: scene.id }),
                        transitionToNext: index < transitions.length ? transitions[index] : undefined
                    }));
                    setScript(prev => ({ ...prev, videoScenes: updatedVideoScenes }));
                } catch (err) {
                    setError("AI 轉場分析失敗，將預設為 CUT。");
                    const updatedVideoScenes = initialScript.scenes.map(scene => ({ ...(initialScript.videoScenes?.find(vs => vs.sceneId === scene.id) || { sceneId: scene.id }), transitionToNext: 'CUT' as const }));
                    setScript(prev => ({ ...prev, videoScenes: updatedVideoScenes }));
                } finally {
                    setIsAnalyzing(false);
                }
            };
            analyze();
        } else {
            setError(null);
        }
    }, [isOpen, initialScript]);

    const updatePresenterImage = (presenterId: string, imageData: ActorImageData) => {
        setScript(prev => ({
            ...prev,
            presenterImageMap: {
                ...prev.presenterImageMap,
                [presenterId]: imageData,
            }
        }));
    };
    
    const handleOpenActorCreator = (actorId: string) => {
        setEditingActorId(actorId);
        setIsActorCreatorOpen(true);
    };

    const handleOpenCastingRoom = (actorId: string) => {
        setEditingActorId(actorId);
        setIsCastingRoomOpen(true);
    };

    const handleActorSelectedFromCastingRoom = (actor: SavedActor) => {
        if (editingActorId) {
            updatePresenterImage(editingActorId, {
                base64Image: actor.base64Image,
                definition: actor.definition
            });
        }
        setIsCastingRoomOpen(false);
        setEditingActorId(null);
    };
    
    const handleActorFinalized = async (result: { file: File; definition: ActorDefinition; saveToCollection: boolean; name?: string }) => {
        if (editingActorId) {
            const base64Image = await blobToBase64(result.file);
            updatePresenterImage(editingActorId, { base64Image, definition: result.definition });
            
            if (result.saveToCollection && result.name) {
                try {
                    const savedActorsRaw = localStorage.getItem('virtualCastingRoom_v1');
                    const savedActors: SavedActor[] = savedActorsRaw ? JSON.parse(savedActorsRaw) : [];
                    const newActor: SavedActor = {
                        id: uuidv4(),
                        name: result.name,
                        definition: result.definition,
                        base64Image: base64Image
                    };
                    localStorage.setItem('virtualCastingRoom_v1', JSON.stringify([newActor, ...savedActors]));
                } catch (error) {
                    console.error("Failed to save actor to collection:", error);
                    setError("儲存演員至收藏失敗。");
                }
            }
        }
        setIsActorCreatorOpen(false);
        setEditingActorId(null);
    };

    const handleActorFileChange = async (actorId: string, file: File) => {
        const base64Image = await blobToBase64(file);
        const currentDefinition = script.presenterImageMap?.[actorId]?.definition;
        if (currentDefinition) {
            updatePresenterImage(actorId, { base64Image, definition: currentDefinition });
        }
    };
    
    const updateVideoScene = (sceneId: string, updates: Partial<VideoScene>) => {
        setScript(prev => ({
            ...prev,
            videoScenes: (prev.videoScenes || []).map(vs => 
                vs.sceneId === sceneId ? { ...vs, ...updates } : vs
            )
        }));
    };
    
    const handleGenerateSceneFrames = useCallback(async (scene: Scene, index: number) => {
        const primaryActorId = visiblePresenters[0]?.id;
        const primaryActorImage = primaryActorId ? script.presenterImageMap?.[primaryActorId]?.base64Image : null;

        if (!primaryActorImage) { setError("請先為主要演員 (演員1) 上傳或生成參考圖片。"); return; }
        
        setSceneLoadingState(prev => ({ ...prev, [scene.id]: 'both' })); setError(null);
        try {
            const actorImage = { data: primaryActorImage, mimeType: 'image/jpeg' };
            const sceneDescription = getSceneDescription(scene);
            
            const prevVideoScene = index > 0 ? script.videoScenes?.find(vs => vs.sceneId === script.scenes[index - 1].id) : undefined;
            const isContinuousTransition = index > 0 && prevVideoScene?.transitionToNext === 'CONTINUOUS';

            if (isContinuousTransition && prevVideoScene?.endFrame) {
                updateVideoScene(scene.id, { startFrame: prevVideoScene.endFrame });
            } else {
                const startFrame = await generateSingleKeyframe(actorImage, sceneDescription, 'start', undefined);
                updateVideoScene(scene.id, { startFrame });
            }

            setSceneLoadingState(prev => ({ ...prev, [scene.id]: 'end' }));
            
            const endFrame = await generateSingleKeyframe(actorImage, sceneDescription, 'end');
            updateVideoScene(scene.id, { endFrame });
        } catch (err) {
            setError(err instanceof Error ? err.message : `場景 ${scene.timecode} 生成失敗。`);
        } finally {
            setSceneLoadingState(prev => ({ ...prev, [scene.id]: false }));
        }
    }, [script, visiblePresenters]);

    const handleGenerateAllFrames = async () => {
        const primaryActorId = visiblePresenters[0]?.id;
        const primaryActorImage = primaryActorId ? script.presenterImageMap?.[primaryActorId]?.base64Image : null;
        if (!primaryActorImage) { setError("請先為主要演員 (演員1) 上傳或生成參考圖片。"); return; }
        
        setIsGeneratingAll(true);
        for (let i = 0; i < script.scenes.length; i++) {
            await handleGenerateSceneFrames(script.scenes[i], i);
        }
        setIsGeneratingAll(false);
    };

    const handleGenerateVideoPrompt = async (scene: Scene) => {
        const videoScene = script.videoScenes?.find(vs => vs.sceneId === scene.id);
        if (!videoScene?.startFrame || !videoScene?.endFrame) { setError("請先為此場景生成首幀與尾幀圖片。"); return; }
        setSceneLoadingState(prev => ({ ...prev, [scene.id]: 'prompt' })); setError(null);
        try {
            const prompt = await generateVideoPromptForScene(scene, videoScene.startFrame, videoScene.endFrame);
            updateVideoScene(scene.id, { videoPrompt: prompt });
        } catch (err) {
            setError(err instanceof Error ? err.message : "提示詞生成失敗。");
        } finally {
            setSceneLoadingState(prev => ({ ...prev, [scene.id]: false }));
        }
    };
    
    const handleCopyPrompt = (sceneId: string, prompt: string | undefined) => {
        if (!prompt) return;
        navigator.clipboard.writeText(prompt).then(() => {
            setCopiedPromptId(sceneId);
            setTimeout(() => setCopiedPromptId(null), 2000);
        });
    };

    const handleCopyDialogue = (dialogue: DialogueLine[], sceneId: string) => {
        if (!dialogue || dialogue.length === 0) return;
        const textToCopy = dialogue.map(d => `${d.speaker}: ${d.line}`).join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopiedDialogueId(sceneId);
            setTimeout(() => setCopiedDialogueId(null), 2000);
        });
    };

    const handleToggleTransition = (sceneIndex: number) => {
        const videoScene = script.videoScenes?.[sceneIndex];
        if (!videoScene) return;
        const newTransition = videoScene.transitionToNext === 'CUT' ? 'CONTINUOUS' : 'CUT';
        updateVideoScene(videoScene.sceneId, { transitionToNext: newTransition });
    };

    const handleClose = () => { onClose(script); };
    if (!isOpen) return null;
    
    return (
    <>
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={handleClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <ClapperboardIcon className="w-6 h-6 mr-2 text-purple-600" />
                        影片場景生成器 (專業版)
                    </h2>
                    <div className="flex items-center gap-4">
                        <button onClick={handleGenerateAllFrames} disabled={isGeneratingAll || isAnalyzing || !(visiblePresenters.length > 0 && script.presenterImageMap?.[visiblePresenters[0].id])} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300">
                            {isGeneratingAll ? <><SpinnerIcon className="w-4 h-4 mr-2" />全部生成中...</> : '一鍵生成全部影格'}
                        </button>
                        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-1/3 p-6 border-r overflow-y-auto space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">1. 演員設定</h3>
                             <div className="space-y-4">
                                {visiblePresenters.map((presenter, index) => {
                                    const actorImageDataBase64 = script.presenterImageMap?.[presenter.id]?.base64Image;
                                    const previewUrl = actorImageDataBase64 ? base64ToUrl(actorImageDataBase64) : null;
                                    return (
                                        <div key={presenter.id}>
                                            <h4 className="block text-sm font-semibold text-gray-700 mb-2">{`演員 ${index + 1}: ${presenter.name} (${presenter.role})`}</h4>
                                            
                                            <div className="mt-3">
                                                <div className={`relative w-full aspect-[9/16] border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${previewUrl ? 'border-indigo-300' : 'border-gray-300 hover:border-indigo-400 bg-gray-50'}`}>
                                                    {previewUrl ? <img src={previewUrl} alt="Actor preview" className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => previewUrl && setZoomedImage(previewUrl)} /> : <div className="text-center text-gray-500 p-2"><UploadIcon className="mx-auto h-8 w-8 text-gray-400" /><p className="mt-2 text-xs">上傳或生成形象</p></div>}
                                                    <input type="file" accept="image/png, image/jpeg, image/webp" onChange={(e) => e.target.files && handleActorFileChange(presenter.id, e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                <button onClick={() => handleOpenCastingRoom(presenter.id)} className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50">
                                                    <UsersIcon className="w-4 h-4 mr-2" />
                                                    從選角室選擇
                                                </button>
                                                <button onClick={() => handleOpenActorCreator(presenter.id)} className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700">
                                                    <SparklesIcon className="w-4 h-4 mr-2" />
                                                    塑造演員形象
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                                {visiblePresenters.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-4">此腳本無須出鏡演員 (例如: 僅旁白)。</p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-2/3 p-6 overflow-y-auto bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">2. 逐場景生成</h3>
                        {error && <div className="mb-4 p-3 bg-red-100 border border-red-300 text-sm text-red-700 rounded-md"><strong>錯誤：</strong>{error}</div>}
                        <div className="space-y-2">
                            {script.scenes.map((scene, index) => {
                                const videoScene = script.videoScenes?.find(vs => vs.sceneId === scene.id);
                                const isLoading = sceneLoadingState[scene.id];
                                
                                const prevVideoScene = index > 0 ? script.videoScenes?.find(vs => vs.sceneId === script.scenes[index - 1].id) : undefined;
                                const isContinuousFromPrev = index > 0 && prevVideoScene?.transitionToNext === 'CONTINUOUS';
                                const isPrevFrameMissing = isContinuousFromPrev && !prevVideoScene?.endFrame;
                                
                                const isButtonDisabled = !!isLoading || !(visiblePresenters.length > 0 && script.presenterImageMap?.[visiblePresenters[0].id]) || isGeneratingAll || isPrevFrameMissing;
                                const buttonDisabledTitle = isPrevFrameMissing ? "此場景為連續動作，請先生成前一個場景的影格。" : "";

                                return (
                                <>
                                    <div key={scene.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <h4 className="font-bold text-gray-800 mb-3">{`場景 ${index + 1}: ${scene.timecode}`}</h4>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            <div className="space-y-4">
                                                <div className="flex gap-4">
                                                    <div>
                                                        <p className="text-sm font-semibold text-center mb-1">首幀</p>
                                                        <div className="w-full aspect-[9/16] bg-gray-200 rounded-md flex items-center justify-center">
                                                            {isLoading === 'both' || isLoading === 'start' ? <SpinnerIcon className="w-6 h-6 text-gray-400" /> : videoScene?.startFrame ? <img src={base64ToUrl(videoScene.startFrame)} alt="Start frame" className="w-full h-full object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedImage(base64ToUrl(videoScene.startFrame!))} /> : <p className="text-xs text-gray-500">待生成</p>}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-center mb-1">尾幀</p>
                                                        <div className="w-full aspect-[9/16] bg-gray-200 rounded-md flex items-center justify-center">
                                                           {isLoading === 'both' || isLoading === 'end' ? <SpinnerIcon className="w-6 h-6 text-gray-400" /> : videoScene?.endFrame ? <img src={base64ToUrl(videoScene.endFrame)} alt="End frame" className="w-full h-full object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedImage(base64ToUrl(videoScene.endFrame!))} /> : <p className="text-xs text-gray-500">待生成</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleGenerateSceneFrames(scene, index)} 
                                                    disabled={isButtonDisabled}
                                                    title={buttonDisabledTitle}
                                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed">
                                                    {isLoading === 'both' || isLoading === 'start' || isLoading === 'end' ? <><SpinnerIcon className="w-4 h-4 mr-2" />生成中...</> : videoScene?.startFrame ? <><RefreshCwIcon className="w-4 h-4 mr-2" />重新生成影格</> : '生成此場景影格'}
                                                </button>
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="relative flex-grow flex flex-col">
                                                    <textarea readOnly value={videoScene?.videoPrompt || ''} placeholder={isLoading === 'prompt' ? "AI 正在撰寫中..." : "生成影格後，可生成影片提示詞..."} className="w-full flex-grow p-2 text-xs font-mono bg-white border border-gray-200 rounded-md resize-none" />
                                                    {videoScene?.videoPrompt && (
                                                        <button onClick={() => handleCopyPrompt(scene.id, videoScene.videoPrompt)} title={copiedPromptId === scene.id ? "已複製!" : "複製提示詞"} className="absolute top-2 right-2 p-1.5 text-gray-500 rounded-full hover:bg-indigo-100">
                                                            {copiedPromptId === scene.id ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                                <button onClick={() => handleGenerateVideoPrompt(scene)} disabled={!!isLoading || !videoScene?.startFrame || !videoScene?.endFrame || isGeneratingAll} className="w-full inline-flex items-center justify-center mt-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300">
                                                    {isLoading === 'prompt' ? <><SpinnerIcon className="w-4 h-4 mr-2" />生成中...</> : videoScene?.videoPrompt ? <><RefreshCwIcon className="w-4 h-4 mr-2" />重新生成提示詞</> : '生成此場景提示詞'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <h5 className="text-sm font-semibold text-gray-700">場景對白/旁白</h5>
                                                <button onClick={() => handleCopyDialogue(scene.dialogue, scene.id)} title={copiedDialogueId === scene.id ? "已複製!" : "複製對白"} className="p-1.5 text-gray-500 rounded-full hover:bg-indigo-100">
                                                    {copiedDialogueId === scene.id ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-md text-xs space-y-1 max-h-32 overflow-y-auto">
                                                {scene.dialogue.length > 0 ? scene.dialogue.map((d, i) => (
                                                    <p key={i}><strong className="font-semibold">{d.speaker}:</strong> {d.line}</p>
                                                )) : <p className="text-gray-500 italic">無對白</p>}
                                            </div>
                                        </div>
                                    </div>
                                    {index < script.scenes.length - 1 && (
                                        <div className="flex justify-center items-center my-2">
                                            {isAnalyzing ? (
                                                <SpinnerIcon className="w-5 h-5 text-gray-400" />
                                            ) : (
                                            <button onClick={() => handleToggleTransition(index)} title={`切換轉場模式: 目前為 ${script.videoScenes?.[index]?.transitionToNext === 'CONTINUOUS' ? '連續動作' : '硬切'}`} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                                                {script.videoScenes?.[index]?.transitionToNext === 'CONTINUOUS' ? <ChainIcon className="w-5 h-5 text-green-600" /> : <ScissorsIcon className="w-5 h-5 text-red-600" />}
                                            </button>
                                            )}
                                        </div>
                                    )}
                                </>
                                );
                            })}
                        </div>
                    </div>
                </div>
                
                {zoomedImage && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
                        <img src={zoomedImage} alt="Zoomed view" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()} />
                    </div>
                )}
            </div>
        </div>
        {editingActorId && isActorCreatorOpen && (
            <ActorCreatorModal
                isOpen={isActorCreatorOpen}
                onClose={() => setIsActorCreatorOpen(false)}
                actorName={initialScript.presenters.find(p => p.id === editingActorId)?.name || '演員'}
                initialDefinition={script.presenterImageMap?.[editingActorId]?.definition || DEFAULT_ACTOR_DEFINITION}
                onFinalize={handleActorFinalized}
                context="script"
            />
        )}
         {editingActorId && isCastingRoomOpen && (
            <VirtualCastingRoom
                isOpen={isCastingRoomOpen}
                onClose={() => setIsCastingRoomOpen(false)}
                onSelect={handleActorSelectedFromCastingRoom}
            />
        )}
    </>
    );
};

export default VideoSceneGeneratorModal;