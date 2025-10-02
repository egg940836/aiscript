import React from 'react';
// FIX: Correctly import StoryboardScene and StoryboardFrame as types.
import { type Script, type StoryboardScene, type StoryboardFrame } from '../types';
import { FilmIcon } from './icons/FilmIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface StoryboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    script: Script;
    onApply: (storyboard: StoryboardScene[]) => void;
}

const SuggestionTag: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex items-start text-xs">
        <span className="font-semibold text-gray-500 w-20 flex-shrink-0">{label}</span>
        <span className="text-gray-700">{value}</span>
    </div>
);

const SketchPlaceholder: React.FC = () => (
    <div className="w-full aspect-video bg-gray-200 rounded-md flex items-center justify-center animate-pulse">
        <SpinnerIcon className="w-8 h-8 text-gray-400" />
    </div>
);

const FrameCard: React.FC<{ frame: StoryboardFrame, isGenerating: boolean, frameNumber: number }> = ({ frame, isGenerating, frameNumber }) => (
    <div className="flex flex-col">
        <div className="w-full aspect-video bg-gray-100 rounded-lg border border-gray-200 overflow-hidden mb-2">
            {isGenerating && !frame.sketch ? (
                <SketchPlaceholder />
            ) : frame.sketch?.base64Image ? (
                <img 
                    src={`data:image/png;base64,${frame.sketch.base64Image}`} 
                    alt={`Storyboard frame ${frameNumber}`}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-center text-gray-500 text-xs p-2">
                    草圖尚未生成
                </div>
            )}
        </div>
        <div className="bg-white p-3 rounded-md border border-gray-200 flex-grow">
            <h4 className="font-semibold text-indigo-700 text-sm mb-2">分鏡格 {frameNumber}</h4>
            <div className="space-y-1.5">
                <SuggestionTag label="鏡頭/角度" value={`${frame.suggestion.shotType} / ${frame.suggestion.cameraAngle}`} />
                <SuggestionTag label="運動/構圖" value={`${frame.suggestion.cameraMovement} / ${frame.suggestion.composition}`} />
                <SuggestionTag label="光線氛圍" value={frame.suggestion.lighting} />
                <div className="pt-1">
                    <p className="text-xs font-semibold text-gray-500">描述</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{frame.suggestion.description}</p>
                </div>
            </div>
        </div>
    </div>
);

const StoryboardModal: React.FC<StoryboardModalProps> = ({ isOpen, onClose, script, onApply }) => {
    if (!isOpen) return null;

    const storyboard = script.storyboard;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <FilmIcon className="w-6 h-6 mr-3 text-indigo-600" />
                        分鏡 Pro (Pro Max) 預覽
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow bg-gray-50">
                    {storyboard && storyboard.length > 0 ? (
                        <div className="space-y-8">
                            {storyboard.map((scene, sceneIndex) => {
                                const originalScene = script.scenes.find(s => s.id === scene.sceneId);
                                if (!originalScene) return null;

                                return (
                                <div key={scene.sceneId} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                                        {`場景 ${sceneIndex + 1}: ${originalScene.timecode}`}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {scene.frames.map((frame, frameIndex) => (
                                            <FrameCard 
                                                key={frame.id}
                                                frame={frame}
                                                isGenerating={script.isGeneratingSketches || false}
                                                frameNumber={frameIndex + 1}
                                            />
                                        ))}
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p className="text-gray-700">沒有可顯示的分鏡資料。</p>
                            <p className="text-sm text-gray-500 mt-2">請先返回腳本卡片點擊「衍生文字分鏡」。</p>
                        </div>
                    )}
                </div>
                
                {storyboard && storyboard.length > 0 && !script.isGeneratingSketches && (
                    <div className="p-4 bg-white border-t border-gray-200 flex justify-end items-center space-x-3 flex-shrink-0">
                         <p className="text-sm text-gray-600 mr-auto">提示：套用後將會更新原始腳本的 Shot 與 B-Roll 描述。</p>
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            關閉
                        </button>
                        <button 
                            onClick={() => onApply(storyboard)}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            套用至腳本
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryboardModal;
