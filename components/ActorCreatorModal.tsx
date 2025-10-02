
import React, { useState, useCallback, useMemo } from 'react';
import { type ActorDefinition, GenderExpression, SkinTone, FacialFeatureTemplate, BodyShape, Aura, HairLength, HairStyle, ClothingStyle, BustSize } from '../types';
import { generateActorPortrait } from '../services/geminiService';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { RefreshCwIcon } from './icons/RefreshCwIcon';
import { BODY_SHAPES, BUST_SIZES } from '../constants';


interface ActorCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    actorName: string;
    initialDefinition: ActorDefinition;
    onFinalize: (result: { file: File; definition: ActorDefinition; saveToCollection: boolean; name?: string; }) => void;
    context?: 'script' | 'casting_room';
}

const base64toBlob = (base64: string, mimeType: string = 'image/jpeg'): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

// --- Pro v2 UI Components ---
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <details open className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <summary className="font-semibold cursor-pointer p-3 bg-gray-50 text-gray-700">{title}</summary>
        <div className="p-4 space-y-4">
            {children}
        </div>
    </details>
);

const ButtonSelector = <T extends string | number>({ label, options, selectedValue, onChange }: { label: string; options: readonly { label: string; value: T }[]; selectedValue: T; onChange: (value: T) => void; }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="flex flex-wrap gap-2">
            {options.map(option => {
                const isSelected = selectedValue === option.value;
                return (
                    <button
                        type="button"
                        key={option.label}
                        onClick={() => onChange(option.value)}
                        className={`px-3 py-1.5 border rounded-full text-sm font-medium transition-colors duration-200 ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    </div>
);


const TagSelector = <T extends string>({ label, options, selected, onToggle, max = 3, disabledOptions = new Set() }: { label: string; options: readonly T[]; selected: T[]; onToggle: (option: T) => void; max?: number; disabledOptions?: Set<T> }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="flex flex-wrap gap-2">
            {options.map(option => {
                const isSelected = selected.includes(option);
                const isDisabled = disabledOptions.has(option);
                return (
                    <button
                        type="button"
                        key={option}
                        onClick={() => {
                            if (isDisabled) return;
                            
                            if (max === 1) {
                                if (!isSelected) {
                                    onToggle(option);
                                }
                                // If already selected in single-select mode, do nothing.
                                return;
                            }

                            // For multi-select
                            if (!isSelected && selected.length >= max) {
                                alert(`最多選擇 ${max} 個標籤。`);
                                return;
                            }
                            onToggle(option);
                        }}
                        title={isDisabled ? "此選項與目前的設定不相容" : undefined}
                        className={`px-3 py-1.5 border rounded-full text-sm font-medium transition-colors duration-200 ${
                            isDisabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
    </div>
);


// --- Options Constants ---
const GENDER_EXPRESSIONS: readonly GenderExpression[] = ['男', '女'];
const SKIN_TONES: readonly SkinTone[] = ['I 亮白', 'II 白皙', 'III 自然白', 'IV 蜜棕', 'V 深棕', 'VI 黑褐'];
const FACIAL_FEATURE_TEMPLATES: readonly FacialFeatureTemplate[] = ['台灣人', '日本人', '韓國人', '東亞', '東南亞', '南亞', '東歐/中歐', '南歐/地中海', '北歐', '斯拉夫', '中東/波斯', '北非', '東非', '西非', '南非', '拉丁美洲', '原住民族系'];
const AURAS: readonly Aura[] = ['清冷', '溫柔', '陽光', '書卷', '可愛', '性感', '嫵媚', '中性酷', '古典', '精靈系', '元氣', '厭世', '邪魅', '成熟穩重', '憂鬱', '俏皮', '高冷貴氣', '鄰家', '幹練', '治癒'];
const HAIR_LENGTHS: readonly HairLength[] = ['平頭', '短', '中', '長', '超長'];
const HAIR_STYLES: readonly HairStyle[] = ['直', '自然捲', '大波浪', '玉米鬚', '包頭', '馬尾', '雙馬尾', '公主切', '狼尾', '法式捲', '油頭'];
const CLOTHING_STYLES: readonly ClothingStyle[] = ['日系簡約', '韓系極簡', '學院', '街頭', '工裝', '運動機能', '商務休閒', '西裝正裝', '小禮服', '優雅洋裝', '龐克', '哥德', '賽博龐克', 'Techwear'];

// Button options
const AGE_OPTIONS = [{label: '18-24', value: 18}, {label: '25-30', value: 25}, {label: '31-40', value: 31}, {label: '41-50', value: 41}, {label: '50+', value: 50}];
const MUSCLE_TONE_OPTIONS = [{label: '無', value: 0}, {label: '低 (25%)', value: 25}, {label: '中 (50%)', value: 50}, {label: '高 (75%)', value: 75}];
const HEIGHT_OPTIONS_FEMALE = [{label: '嬌小 (~155cm)', value: 155}, {label: '標準 (~165cm)', value: 165}, {label: '高挑 (~175cm)', value: 175}];
const HEIGHT_OPTIONS_MALE = [{label: '標準 (~175cm)', value: 175}, {label: '高大 (~185cm)', value: 185}, {label: '巨人 (~195cm)', value: 195}];


const ActorCreatorModal: React.FC<ActorCreatorModalProps> = ({ isOpen, onClose, actorName, initialDefinition, onFinalize, context = 'script' }) => {
    const [definition, setDefinition] = useState<ActorDefinition>(initialDefinition);
    const [generatedImage, setGeneratedImage] = useState<{ file: File, url: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDefinitionChange = <K extends keyof ActorDefinition>(field: K, value: ActorDefinition[K]) => {
        setDefinition(prev => ({ ...prev, [field]: value }));
    };
    
    const handleTagToggle = <K extends keyof ActorDefinition>(field: K, option: ActorDefinition[K] extends (infer U)[] ? U : never) => {
        setDefinition(prev => {
            const current = (prev[field] as any[]) || [];
            const newValues = current.includes(option) ? current.filter(item => item !== option) : [...current, option];
            return { ...prev, [field]: newValues };
        });
    };

    const handleGenerate = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const base64Image = await generateActorPortrait(definition);
            const blob = base64toBlob(base64Image);
            const file = new File([blob], "ai_actor.jpg", { type: "image/jpeg" });
            setGeneratedImage({ file, url: URL.createObjectURL(file) });
        } catch (err) {
            const message = err instanceof Error ? err.message : '形象生成失敗，請稍後再試。';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [definition]);
    
    const handleUseForThisScript = () => {
        if (generatedImage) {
            onFinalize({ ...generatedImage, definition, saveToCollection: false });
        }
    };
    
    const handleSaveToCollection = () => {
        if (generatedImage) {
            const name = prompt("請為這位演員命名 (例如：陽光KOC小安):", actorName);
            if (name && name.trim()) {
                onFinalize({ ...generatedImage, definition, saveToCollection: true, name: name.trim() });
            }
        }
    };
    
    const disabledOptions = useMemo(() => {
        const disabled = {
            clothingStyle: new Set<ClothingStyle>(),
            aura: new Set<Aura>(),
            bustSize: new Set<BustSize>(),
        };
        if (definition.gender === '男') {
            disabled.clothingStyle.add('小禮服');
            disabled.clothingStyle.add('優雅洋裝');
            disabled.bustSize.add('巨乳');
            disabled.bustSize.add('動漫級');
        }
        if (definition.age < 18) {
            disabled.aura.add('性感');
            disabled.aura.add('嫵媚');
            disabled.aura.add('邪魅');
            disabled.aura.add('成熟穩重');
            disabled.clothingStyle.add('小禮服');
        }
        return disabled;
    }, [definition.gender, definition.age]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80] p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">塑造演員形象：{actorName}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Controls */}
                    <div className="w-1/2 p-4 border-r overflow-y-auto space-y-4 bg-gray-50/50">
                       <Section title="性別與年齡">
                            <TagSelector label="性別" options={GENDER_EXPRESSIONS} selected={[definition.gender]} onToggle={(opt) => handleDefinitionChange('gender', opt)} max={1} />
                            <ButtonSelector label="外觀年齡" options={AGE_OPTIONS} selectedValue={definition.age} onChange={(val) => handleDefinitionChange('age', val)} />
                       </Section>
                       
                       <Section title="外觀特徵">
                            <TagSelector label="膚色" options={SKIN_TONES} selected={[definition.skinTone]} onToggle={(opt) => handleDefinitionChange('skinTone', opt)} max={1} />
                            <TagSelector label="臉部特徵模板 (風格參考)" options={FACIAL_FEATURE_TEMPLATES} selected={definition.facialFeaturesTemplate} onToggle={(opt) => handleTagToggle('facialFeaturesTemplate', opt)} max={2} />
                            <TagSelector label="體型" options={BODY_SHAPES} selected={definition.bodyShape} onToggle={(opt) => handleTagToggle('bodyShape', opt)} max={2} />
                            <TagSelector label="胸圍" options={BUST_SIZES} selected={[definition.bustSize]} onToggle={(opt) => handleDefinitionChange('bustSize', opt)} max={1} disabledOptions={disabledOptions.bustSize} />
                            <ButtonSelector label="肌肉線條強度" options={MUSCLE_TONE_OPTIONS} selectedValue={definition.muscleTone} onChange={(val) => handleDefinitionChange('muscleTone', val)} />
                            <ButtonSelector label="身高" options={definition.gender === '女' ? HEIGHT_OPTIONS_FEMALE : HEIGHT_OPTIONS_MALE} selectedValue={definition.height} onChange={(val) => handleDefinitionChange('height', val)} />
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">臉部細節 (自由填寫)</label>
                                <input type="text" value={definition.facialDetails} onChange={e => handleDefinitionChange('facialDetails', e.target.value)} placeholder="e.g., 鼻梁有顆痣, 深邃的雙眼皮" className="w-full p-2 border border-gray-300 rounded-md"/>
                             </div>
                       </Section>
                       
                       <Section title="風格與造型">
                            <TagSelector label="氣質" options={AURAS} selected={definition.aura} onToggle={(opt) => handleTagToggle('aura', opt)} max={3} disabledOptions={disabledOptions.aura} />
                            <TagSelector label="髮長" options={HAIR_LENGTHS} selected={[definition.hairLength]} onToggle={(opt) => handleDefinitionChange('hairLength', opt)} max={1} />
                            <TagSelector label="髮型" options={HAIR_STYLES} selected={[definition.hairStyle]} onToggle={(opt) => handleDefinitionChange('hairStyle', opt)} max={1} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">髮色</label>
                                <input type="text" value={definition.hairColor} onChange={e => handleDefinitionChange('hairColor', e.target.value)} placeholder="e.g., 深棕色帶點亞麻挑染" className="w-full p-2 border border-gray-300 rounded-md"/>
                             </div>
                            <TagSelector label="服裝風格" options={CLOTHING_STYLES} selected={definition.clothingStyle} onToggle={(opt) => handleTagToggle('clothingStyle', opt)} max={3} disabledOptions={disabledOptions.clothingStyle} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">配件 (自由填寫)</label>
                                <input type="text" value={definition.accessories} onChange={e => handleDefinitionChange('accessories', e.target.value)} placeholder="e.g., 金絲眼鏡, 銀色耳環" className="w-full p-2 border border-gray-300 rounded-md"/>
                             </div>
                       </Section>
                    </div>

                    {/* Right Panel: Preview */}
                    <div className="w-1/2 p-6 bg-gray-100 flex flex-col items-center justify-center">
                        <div className="w-full max-w-sm aspect-[9/16] bg-gray-300 rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
                            {isLoading ? (
                                <SpinnerIcon className="w-12 h-12 text-white" />
                            ) : generatedImage ? (
                                <img src={generatedImage.url} alt="Generated Actor" className="w-full h-full object-cover" />
                            ) : (
                                <p className="text-gray-500 text-center p-4">預覽形象將顯示於此</p>
                            )}
                        </div>
                        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
                        <button onClick={handleGenerate} disabled={isLoading} className="w-full max-w-sm mt-4 inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400">
                             {isLoading ? <SpinnerIcon className="w-5 h-5 mr-2" /> : (generatedImage ? <RefreshCwIcon className="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />)}
                             {isLoading ? '生成中...' : (generatedImage ? '重新生成' : '生成形象')}
                        </button>
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50 border-t flex justify-end items-center space-x-3">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        取消
                    </button>
                    {context === 'script' && (
                        <button onClick={handleUseForThisScript} disabled={!generatedImage} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300">
                            僅用於此腳本
                        </button>
                    )}
                    <button onClick={handleSaveToCollection} disabled={!generatedImage} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300">
                        儲存至選角室
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActorCreatorModal;
