

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// FIX: Imported missing `StyleDirectives` type.
import { type Brief, type ScriptType, type PricingTier, type Preset, Presenter, type CardPool, DuelTactic, type StyleDirectives, HookConciseness, BriefWizardProps, FeaturedProduct, ActorRole, SavedActor, VisualStyle, AdPlacement, AdDuration } from '../types';
import {
  INITIAL_BRIEF,
  DUEL_TACTIC_OPTIONS,
  ACTOR_ROLE_OPTIONS,
  VISUAL_STYLE_OPTIONS,
  STRATEGIC_DURATION_OPTIONS,
} from '../constants';
import { SparklesIcon } from './icons/SparklesIcon';
import StyleTuner from './StyleTuner';
import { SaveIcon } from './icons/SaveIcon';
import { TrashIcon } from './icons/TrashIcon';
import { extractSellingPoints } from '../services/geminiService';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { HammerIcon } from './icons/HammerIcon';
import VirtualCastingRoom from './VirtualCastingRoom';
import { UsersIcon } from './icons/UsersIcon';
import { DiceIcon } from './icons/DiceIcon';
import { KaleidoscopeIcon } from './icons/KaleidoscopeIcon';
import { PencilIcon } from './icons/PencilIcon';

// --- Helper Components ---

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement> & {isOpen: boolean}> = ({ isOpen, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`transition-transform duration-300 ${isOpen ? '' : '-rotate-90'}`}
    {...props}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);


const FormSection: React.FC<{ title: string; children: React.ReactNode, headerContent?: React.ReactNode; isOpen: boolean; onToggle: () => void; }> = React.memo(({ title, children, headerContent, isOpen, onToggle }) => (
    <div className="bg-white/80 rounded-lg shadow-sm mb-6 border border-gray-200/50 overflow-hidden transition-all duration-300">
      <div className="flex justify-between items-center p-6 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            <ChevronDownIcon isOpen={isOpen} className="w-5 h-5 ml-3 text-gray-500" />
        </div>
        <div onClick={(e) => e.stopPropagation()}>
            {headerContent}
        </div>
      </div>
       <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-6">
         {children}
        </div>
      </div>
    </div>
));


const InputField: React.FC<{ label: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string, name?: string }> = React.memo(({ label, value, onChange, placeholder, name }) => (
    <div className="mb-4 w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white/70"
      />
    </div>
));

const TextAreaField: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  onRefineClick?: () => void;
  isRefining?: boolean;
  refineButtonTitle?: string;
}> = React.memo(({ label, value, onChange, placeholder, rows = 3, onRefineClick, isRefining, refineButtonTitle = "AI 建議" }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
            <textarea
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white/70"
            />
            {onRefineClick && (
                <button
                    type="button"
                    onClick={onRefineClick}
                    disabled={isRefining || !value}
                    title={refineButtonTitle}
                    className="absolute top-2 right-2 p-1.5 text-gray-500 rounded-full hover:bg-indigo-100 hover:text-indigo-600 disabled:cursor-not-allowed disabled:text-gray-300 transition-colors"
                >
                    {isRefining ? <SpinnerIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                </button>
            )}
        </div>
    </div>
));

const ScriptTypeSelector: React.FC<{
  scriptType: ScriptType;
  onChange: (type: ScriptType) => void;
}> = React.memo(({ scriptType, onChange }) => (
    <div className="flex w-full bg-gray-200/80 p-1 rounded-lg">
        <button
            type="button"
            onClick={() => onChange('product')}
            className={`w-1/2 py-2.5 text-sm font-semibold rounded-md transition-colors duration-200 ${scriptType === 'product' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
        >
            產品介紹
        </button>
        <button
            type="button"
            onClick={() => onChange('store')}
            className={`w-1/2 py-2.5 text-sm font-semibold rounded-md transition-colors duration-200 ${scriptType === 'store' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
        >
            門市介紹
        </button>
    </div>
));

const ProductPositioningSelector: React.FC<{
  pricingTier?: PricingTier;
  onChange: (tier: PricingTier) => void;
}> = React.memo(({ pricingTier, onChange }) => (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">產品定位</label>
      <div className="flex w-full bg-gray-200/80 p-1 rounded-lg mb-4">
        <button
          type="button"
          onClick={() => onChange('budget')}
          className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${pricingTier === 'budget' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
        >
          價格導向
        </button>
        <button
          type="button"
          onClick={() => onChange('premium')}
          className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${pricingTier === 'premium' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
        >
          價值導向
        </button>
      </div>
    </div>
));

const CARD_POOL_CONFIG: Record<CardPool, {
    name: string;
    description: string;
    baseClasses: string;
    selectedClasses: string;
    nameClasses: string;
    descriptionClasses: string;
    buttonClasses: string;
    tenPullClasses: string;
}> = {
    normal: { name: '普通卡池', description: '標準引擎，速度快，品質穩定。', baseClasses: 'border-slate-300', selectedClasses: 'border-indigo-500 ring-2 ring-indigo-300 bg-indigo-50/70', nameClasses: 'text-slate-800', descriptionClasses: 'text-slate-600', buttonClasses: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-indigo-300', tenPullClasses: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 disabled:bg-amber-300' },
    rare: { name: '稀有卡池', description: '深度思考，創意品質更高。', baseClasses: 'border-purple-300', selectedClasses: 'border-purple-500 ring-2 ring-purple-300 bg-purple-100/70', nameClasses: 'text-purple-800', descriptionClasses: 'text-purple-600', buttonClasses: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:ring-purple-500 disabled:from-purple-400 disabled:to-indigo-400', tenPullClasses: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:ring-purple-500 disabled:from-purple-400 disabled:to-indigo-400' },
    showdown: { name: '王牌對決', description: '經典 AB 對比與數據論證，具備高度說服力。', baseClasses: 'border-red-300', selectedClasses: 'border-red-600 ring-2 ring-red-300 bg-red-100/70', nameClasses: 'text-red-800 font-bold', descriptionClasses: 'text-red-700', buttonClasses: 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 focus:ring-red-500 disabled:from-red-400 disabled:to-rose-400', tenPullClasses: 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 focus:ring-red-500 disabled:from-red-400 disabled:to-rose-400' },
    strategy: { name: '王牌策略', description: '從五種高轉換框架中隨機抽取，打造爆款腳本。', baseClasses: 'border-cyan-300', selectedClasses: 'border-cyan-500 ring-2 ring-cyan-300 bg-cyan-100/70', nameClasses: 'text-cyan-800 font-bold', descriptionClasses: 'text-cyan-700', buttonClasses: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 focus:ring-cyan-500 disabled:from-cyan-400 disabled:to-blue-400', tenPullClasses: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 focus:ring-cyan-500 disabled:from-cyan-400 disabled:to-blue-400' },
    legendary: { name: '傳說卡池', description: '連結 Google 搜尋，結合時事趨勢，創造高話題性。', baseClasses: 'border-teal-300', selectedClasses: 'border-teal-500 ring-2 ring-teal-300 bg-teal-100/70', nameClasses: 'text-teal-800', descriptionClasses: 'text-teal-600', buttonClasses: 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 focus:ring-teal-500 disabled:from-teal-400 disabled:to-cyan-400', tenPullClasses: 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 focus:ring-teal-500 disabled:from-teal-400 disabled:to-cyan-400' },
    mythical: { name: '神話卡池', description: '深度思考 + Google 搜尋，挑戰病毒式傳播極限！', baseClasses: 'border-amber-400 bg-gradient-to-br from-yellow-50/50 via-amber-100/50 to-yellow-100/50', selectedClasses: 'border-amber-500 ring-2 ring-amber-400 bg-gradient-to-br from-yellow-100/70 via-amber-200/70 to-yellow-200/70 animate-ssr-glow', nameClasses: 'text-amber-900 font-bold drop-shadow-sm', descriptionClasses: 'text-amber-800', buttonClasses: 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-500 focus:ring-amber-500 disabled:from-amber-300 disabled:to-yellow-300', tenPullClasses: 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 focus:ring-amber-500 disabled:from-amber-300 disabled:to-yellow-300' },
    drama: { name: '豪門恩怨', description: '用八點檔的巨大情節反差，創造戲劇性記憶點。', baseClasses: 'border-rose-300', selectedClasses: 'border-rose-600 ring-2 ring-rose-300 bg-rose-100/70', nameClasses: 'text-rose-800 font-bold', descriptionClasses: 'text-rose-700', buttonClasses: 'bg-gradient-to-r from-rose-600 to-pink-700 hover:from-rose-700 hover:to-pink-800 focus:ring-rose-500 disabled:from-rose-400 disabled:to-pink-400', tenPullClasses: 'bg-gradient-to-r from-rose-600 to-pink-700 hover:from-rose-700 hover:to-pink-800 focus:ring-rose-500 disabled:from-rose-400 disabled:to-pink-400' },
    taiwanese: { name: '強效台味', description: '結合在地語境、強效鉤子與快節奏，拉近距離。', baseClasses: 'border-orange-300', selectedClasses: 'border-orange-500 ring-2 ring-orange-300 bg-orange-100/70', nameClasses: 'text-orange-800 font-bold', descriptionClasses: 'text-orange-700', buttonClasses: 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 focus:ring-orange-500 disabled:from-orange-400 disabled:to-amber-400', tenPullClasses: 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 focus:ring-orange-500 disabled:from-orange-400 disabled:to-amber-400' },
    meme: { name: '迷因模仿', description: '模仿時下熱梗，創造病毒傳播潛力。(注意版權)', baseClasses: 'border-lime-300', selectedClasses: 'border-lime-500 ring-2 ring-lime-300 bg-lime-100/70', nameClasses: 'text-lime-800 font-bold', descriptionClasses: 'text-lime-700', buttonClasses: 'bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-600 hover:to-green-700 focus:ring-lime-500 disabled:from-lime-400 disabled:to-green-400', tenPullClasses: 'bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-600 hover:to-green-700 focus:ring-lime-500 disabled:from-lime-400 disabled:to-green-400' },
};

// --- Main Component ---

// FIX: Accept isQueueProcessing prop to disable buttons during generation.
const BriefWizard: React.FC<BriefWizardProps> = ({ onGenerate, onGenerateHooks, onStressTestHooks, onOpenManualHook, isProMode, isQueueProcessing }) => {
  const [brief, setBrief] = useState<Brief>(INITIAL_BRIEF);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [isRefining, setIsRefining] = useState<'productFeatures' | 'storeFeatures' | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(['brief-main']);
  const [hookConciseness, setHookConciseness] = useState<HookConciseness>('instantKill');
  const [isCastingRoomOpen, setIsCastingRoomOpen] = useState(false);

  // --- Charged Summon State ---
  const [isCharging, setIsCharging] = useState(false);
  const chargeStartRef = useRef<number>(0);

  const isMemeLordMode = brief.cardPool === 'meme' && brief.seed === 8787;

  const isBriefValid = useMemo(() => {
    if (brief.scriptType === 'product') {
        return !!(brief.productName?.trim() && brief.productFeatures?.trim());
    }
    if (brief.scriptType === 'store') {
        return !!(brief.storeName?.trim() && brief.storeFeatures?.trim());
    }
    return false;
  }, [brief.scriptType, brief.productName, brief.productFeatures, brief.storeName, brief.storeFeatures]);

  // FIX: Use isQueueProcessing to disable buttons, preventing new actions while scripts are generating.
  const isActionDisabled = (!isBriefValid && !isProMode);
  const disabledTitle = !isBriefValid && !isProMode ? "請先填寫腳本主軸的核心資訊 (產品/門市名稱與特色)" : "";

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
        prev.includes(sectionId) 
            ? prev.filter(id => id !== sectionId) 
            : [...prev, sectionId]
    );
  };


  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('scriptGenPresets_v1');
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      }
    } catch (error) {
      console.error("Failed to load presets from localStorage", error);
    }
  }, []);

  const savePresetsToStorage = (newPresets: Preset[]) => {
    try {
      localStorage.setItem('scriptGenPresets_v1', JSON.stringify(newPresets));
    } catch (error) {
      console.error("Failed to save presets to localStorage", error);
    }
  };

  const handleSaveOrUpdatePreset = () => {
    const isUpdating = selectedPresetId && presets.some(p => p.id === selectedPresetId);
    if (isUpdating) {
      const presetToUpdate = presets.find(p => p.id === selectedPresetId)!;
      const updatedPreset: Preset = { ...presetToUpdate, type: brief.scriptType, productName: brief.productName, productFeatures: brief.productFeatures, pricingTier: brief.pricingTier, price: brief.price, storeName: brief.storeName, storeFeatures: brief.storeFeatures, brandName: brief.brandName, };
      const newPresets = presets.map(p => (p.id === selectedPresetId ? updatedPreset : p));
      setPresets(newPresets); savePresetsToStorage(newPresets); alert(`模板 "${updatedPreset.name}" 已更新！`);
    } else {
      const name = prompt("請為此模板命名：");
      if (name && name.trim()) {
        const newPreset: Preset = { id: uuidv4(), name: name.trim(), type: brief.scriptType, productName: brief.productName, productFeatures: brief.productFeatures, pricingTier: brief.pricingTier, price: brief.price, storeName: brief.storeName, storeFeatures: brief.storeFeatures, brandName: brief.brandName, };
        const newPresets = [...presets, newPreset];
        setPresets(newPresets); savePresetsToStorage(newPresets); setSelectedPresetId(newPreset.id); alert(`模板 "${name}" 已儲存！`);
      }
    }
  };

  const handleLoadPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value; setSelectedPresetId(presetId);
    const selectedPreset = presets.find(p => p.id === presetId);
    if (selectedPreset) {
      setBrief(prev => ({ ...prev, scriptType: selectedPreset.type, productName: selectedPreset.productName || '', productFeatures: selectedPreset.productFeatures || '', pricingTier: selectedPreset.pricingTier || 'budget', price: selectedPreset.price || '', storeName: selectedPreset.storeName || '', storeFeatures: selectedPreset.storeFeatures || '', brandName: selectedPreset.brandName || '', }));
    } else { setBrief(prev => ({ ...prev, productName: '', productFeatures: '', price: '', storeName: '', storeFeatures: '', brandName: '' })) }
  };

  const handleDeletePreset = () => {
    if (selectedPresetId && window.confirm("確定要刪除這個模板嗎？")) {
      const newPresets = presets.filter(p => p.id !== selectedPresetId);
      setPresets(newPresets); savePresetsToStorage(newPresets); setSelectedPresetId("");
      setBrief(prev => ({ ...prev, productName: '', productFeatures: '', price: '', storeName: '', storeFeatures: '', brandName: '' }))
    }
  };

  const presetsForCurrentType = presets.filter(p => p.type === brief.scriptType);

  const handleInputChange = useCallback(<K extends keyof Brief>(field: K, value: Brief[K]) => {
    setBrief(prev => {
      const newBrief = { ...prev, [field]: value };
      if (field === 'scriptType') {
        setSelectedPresetId("");
        if (value === 'product') { newBrief.storeName = ''; newBrief.storeFeatures = ''; newBrief.featuredProducts = []; } 
        else if (value === 'store') { newBrief.productName = ''; newBrief.productFeatures = ''; newBrief.price = ''; newBrief.pricingTier = 'budget'; }
      }
      return newBrief;
    });
  }, []);
  
  const handleAddFeaturedProduct = useCallback(() => {
    const newProduct: FeaturedProduct = { id: uuidv4(), name: '', features: '' };
    setBrief(prev => ({ ...prev, featuredProducts: [...(prev.featuredProducts || []), newProduct] }));
  }, []);

  const handleRemoveFeaturedProduct = useCallback((id: string) => {
    setBrief(prev => ({ ...prev, featuredProducts: (prev.featuredProducts || []).filter(p => p.id !== id) }));
  }, []);
  
  const handleFeaturedProductChange = useCallback((id: string, field: 'name' | 'features', value: string) => {
      setBrief(prev => ({
          ...prev,
          featuredProducts: (prev.featuredProducts || []).map(p => p.id === id ? { ...p, [field]: value } : p)
      }));
  }, []);

  const handleAddPresenter = useCallback(() => {
    if (brief.presenters.length < 4) {
      const newPresenter: Presenter = {
        id: `presenter-${uuidv4()}`,
        name: `演員 ${brief.presenters.length + 1}`,
        role: ActorRole.KOC
      };
      setBrief(prev => ({ ...prev, presenters: [...prev.presenters, newPresenter] }));
    }
  }, [brief.presenters]);

  const handleRemovePresenter = useCallback((id: string) => {
    if (brief.presenters.length > 1) {
      setBrief(prev => ({ ...prev, presenters: prev.presenters.filter(p => p.id !== id) }));
    }
  }, [brief.presenters]);

  const handlePresenterChange = useCallback((id: string, field: 'name' | 'role', value: string) => {
    setBrief(prev => ({
      ...prev,
      presenters: prev.presenters.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  }, []);
  

  const handleStyleDirectivesChange = useCallback((directives: StyleDirectives) => {
    setBrief(prev => ({ ...prev, styleDirectives: directives }));
  }, []);
  
  const handleExtractFeatures = useCallback(async (field: 'productFeatures' | 'storeFeatures') => {
    const value = brief[field]; if (!value || isRefining) return;
    setIsRefining(field);
    try { const refinedText = await extractSellingPoints(value || ''); handleInputChange(field, refinedText); } 
    catch (error) { console.error(error); alert("AI 賣點提煉功能暫時無法使用，請稍後再試。"); } 
    finally { setIsRefining(null); }
  }, [brief, isRefining, handleInputChange]);

  const handleTenPull = (e: React.FormEvent) => { e.preventDefault(); onGenerate(brief, 10, hookConciseness); };
  const handleForgeHooks = (e: React.FormEvent) => { e.preventDefault(); onGenerateHooks(brief, hookConciseness); };
  const handleStressTest = (e: React.FormEvent) => { e.preventDefault(); onStressTestHooks(brief); };
  const handleManualHook = (e: React.FormEvent) => { e.preventDefault(); onOpenManualHook(brief); };
  
  const handleRandomSeed = () => {
    handleInputChange('seed', Math.floor(Math.random() * 999999));
  };
  
  // --- Charged Summon Handlers ---
  const handleSummonPress = () => {
    if (isActionDisabled) return;
    setIsCharging(true);
    chargeStartRef.current = Date.now();
  };

  const handleSummonRelease = () => {
    if (!isCharging) return;
    const chargeDuration = Date.now() - chargeStartRef.current;
    const isFullyCharged = chargeDuration >= 3000;
    
    setIsCharging(false);
    onGenerate(brief, 1, hookConciseness, isFullyCharged);
  };
  
  const handleChargeCancel = () => {
      setIsCharging(false);
  };

  const isUpdatingTemplate = selectedPresetId !== "" && presets.some(p => p.id === selectedPresetId);
  const buttonPoolConfig = CARD_POOL_CONFIG[brief.cardPool];
  const crazyModeClass = brief.styleDirectives.emotion === 4 ? 'crazy-mode-active' : '';

  return (
    <>
    <form className={crazyModeClass}>
      <FormSection
        title="1. 腳本主軸"
        isOpen={openSections.includes('brief-main')}
        onToggle={() => toggleSection('brief-main')}
        headerContent={
            <div className="flex items-center space-x-2">
                <select value={selectedPresetId} onChange={handleLoadPreset} className="flex-grow w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm">
                  <option value="">選擇模板...</option>
                  {presetsForCurrentType.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
                {selectedPresetId && (<button type="button" title="刪除模板" onClick={handleDeletePreset} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"><TrashIcon className="w-4 h-4" /></button>)}
                <button type="button" onClick={handleSaveOrUpdatePreset} title={isUpdatingTemplate ? "更新當前模板" : "儲存為新模板"} className="flex-shrink-0 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <SaveIcon className="w-4 h-4" /><span className="ml-1.5">{isUpdatingTemplate ? "更新" : "儲存"}</span>
                </button>
            </div>
        }
      >
        <div className="mb-6"><ScriptTypeSelector scriptType={brief.scriptType} onChange={handleInputChange.bind(null, 'scriptType')} /></div>
        <div>
            {brief.scriptType === 'product' ? (
                <>
                    <InputField label="產品名稱" value={brief.productName || ''} onChange={(e) => handleInputChange('productName', e.target.value)} placeholder="e.g., 睡精靈獨立筒床墊"/>
                    <TextAreaField 
                        label="產品特色 (可貼入大段文字，AI會自動提煉)" 
                        value={brief.productFeatures || ''} 
                        onChange={(e) => handleInputChange('productFeatures', e.target.value)} 
                        rows={4} 
                        placeholder="e.g.,&#10;- 我們採用了最新的獨立筒彈簧技術，可以完美支撐身體曲線，旁邊的人翻身也完全不受干擾。&#10;- 表布是高級天絲材質，不僅透氣親膚，還經過防過敏處理..."
                        onRefineClick={() => handleExtractFeatures('productFeatures')} 
                        isRefining={isRefining === 'productFeatures'}
                        refineButtonTitle="AI 提煉賣點"
                    />
                    <InputField label="品牌名 (選填)" value={brief.brandName || ''} onChange={(e) => handleInputChange('brandName', e.target.value)} placeholder="e.g., ikhouse"/>
                    <ProductPositioningSelector pricingTier={brief.pricingTier} onChange={handleInputChange.bind(null, 'pricingTier')} />
                    {brief.pricingTier === 'budget' && (<InputField label="產品價格" value={brief.price || ''} onChange={(e) => handleInputChange('price', e.target.value)} placeholder="e.g., 1999"/>)}
                </>
            ) : (
                <>
                    <InputField label="門市名稱" value={brief.storeName || ''} onChange={(e) => handleInputChange('storeName', e.target.value)} placeholder="e.g., ikhouse功能家具專賣 台中門市"/>
                    <TextAreaField 
                        label="門市特色 (可貼入大段文字，AI會自動提煉)" 
                        value={brief.storeFeatures || ''} 
                        onChange={(e) => handleInputChange('storeFeatures', e.target.value)} 
                        rows={4} 
                        placeholder="e.g.,&#10;- 我們門市有超過百坪的展示空間，採用情境式體驗設計，讓您能親身感受家具在家中的樣子。&#10;- 台中地區家具款式最多，從北歐風到工業風，風格最齊全..."
                        onRefineClick={() => handleExtractFeatures('storeFeatures')} 
                        isRefining={isRefining === 'storeFeatures'}
                        refineButtonTitle="AI 提煉賣點"
                    />
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-semibold text-gray-800">主打產品 (選填)</h4>
                            <button type="button" onClick={handleAddFeaturedProduct} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">+ 新增產品</button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">在介紹門市時，AI 會巧妙地將這些產品帶入腳本。</p>
                        <div className="space-y-4">
                            {(brief.featuredProducts || []).map((product, index) => (
                                <div key={product.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                                    <button type="button" onClick={() => handleRemoveFeaturedProduct(product.id)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                    <InputField label={`產品 ${index + 1} 名稱`} value={product.name} onChange={(e) => handleFeaturedProductChange(product.id, 'name', e.target.value)} placeholder="e.g., 貓抓布沙發"/>
                                    <TextAreaField label="特色" value={product.features} onChange={(e) => handleFeaturedProductChange(product.id, 'features', e.target.value)} rows={2} placeholder="e.g., 耐抓、防潑水"/>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
      </FormSection>

      <FormSection 
        title="2. 腳本規格"
        isOpen={openSections.includes('brief-spec')}
        onToggle={() => toggleSection('brief-spec')}
      >
         <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">時長策略</h3>
            <p className="text-sm text-gray-600 mb-4">選擇影片的主要時長，這會影響腳本的節奏與深度。</p>
            <div className="flex flex-wrap gap-3">
                {STRATEGIC_DURATION_OPTIONS.map(opt => {
                    const isSelected = brief.duration === opt.value;
                    return (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => handleInputChange('duration', opt.value)}
                            className={`text-center p-3 border rounded-lg transition-all duration-200 flex-1 min-w-[140px] ${
                                isSelected
                                    ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200'
                                    : 'bg-white border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <p className="font-semibold text-sm text-gray-800">{opt.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
                        </button>
                    );
                })}
            </div>
        </div>
        
        {isProMode && (
            <>
                <hr className="my-6 border-gray-200" />
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">視覺風格 (專業版)</h3>
                    <p className="text-sm text-gray-600 mb-4">選擇一種視覺風格，AI 將在生成鏡頭描述時注入對應的氛圍與元素。</p>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {VISUAL_STYLE_OPTIONS.map(opt => {
                            const isSelected = brief.visualStyle === opt.value;
                            return (
                                <button
                                    type="button"
                                    key={opt.value}
                                    onClick={() => handleInputChange('visualStyle', opt.value)}
                                    className={`text-left p-4 border rounded-lg transition-all duration-200 ${
                                        isSelected
                                            ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200'
                                            : 'bg-white border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <p className="font-semibold text-sm text-gray-800">{opt.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </>
        )}

        <hr className="my-6 border-gray-200" />
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-0">演員/講者設定</h3>
                <p className="text-sm text-gray-600">自由增減演員人數 (最多4位)，並為他們命名、設定角色定位。</p>
            </div>
            <button
                type="button"
                onClick={() => setIsCastingRoomOpen(true)}
                title="虛擬選角室"
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
                <UsersIcon className="w-4 h-4 mr-2" />
                選角室
            </button>
        </div>
        <div className="space-y-4">
          {brief.presenters.map((presenter, index) => (
            <div key={presenter.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-end gap-4">
              <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="mb-0">
                    <InputField 
                    label={`演員 ${index + 1} 名稱`} 
                    name={`presenter-name-${presenter.id}`} 
                    value={presenter.name} 
                    onChange={(e) => handlePresenterChange(presenter.id, 'name', e.target.value)} 
                    placeholder={`e.g., KOC 小安`}
                    />
                </div>
                <div className="mb-0">
                    <label htmlFor={`presenter-role-${presenter.id}`} className="block text-sm font-medium text-gray-700 mb-1">{`演員 ${index + 1} 角色定位`}</label>
                    <select
                        id={`presenter-role-${presenter.id}`}
                        name={`presenter-role-${presenter.id}`}
                        value={presenter.role}
                        onChange={(e) => handlePresenterChange(presenter.id, 'role', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white/70"
                    >
                        {ACTOR_ROLE_OPTIONS.map(roleOption => (
                            <option key={roleOption} value={roleOption}>
                                {roleOption}
                            </option>
                        ))}
                    </select>
                </div>
              </div>
              {brief.presenters.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemovePresenter(presenter.id)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 flex-shrink-0 mb-4"
                  title="移除演員"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {brief.presenters.length < 4 && (
          <button
            type="button"
            onClick={handleAddPresenter}
            className="mt-4 w-full text-center px-4 py-2 border border-dashed border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
          >
            + 新增演員
          </button>
        )}
      </FormSection>

      <FormSection 
        title="3. 創意引擎"
        isOpen={openSections.includes('brief-engine')}
        onToggle={() => toggleSection('brief-engine')}
      >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">創意卡池</h3>
          <div className="space-y-10">
              {[
                  { title: '基礎引擎', desc: '日常工作的核心，在「速度」與「深度」之間選擇。', pools: ['normal', 'rare'] },
                  { title: '王牌策略庫', desc: '採用高階廣告方法論，為特定目標打造高轉換腳本。', pools: ['showdown', 'strategy'] },
                  { title: '神話鑄造廠', desc: '連結 Google 搜尋，挑戰病毒式傳播的極限。', pools: ['legendary', 'mythical'] },
                  { title: '台灣味工作坊', desc: '注入在地文化靈魂，打造引發強烈共鳴的創意腳本。', pools: ['drama', 'taiwanese', 'meme'] }
              ].map(section => (
                  <div key={section.title} className="space-y-4">
                      <div><h4 className="text-md font-semibold text-gray-800">{section.title}</h4><p className="text-sm text-gray-500">{section.desc}</p></div>
                      <div className={`grid grid-cols-1 ${section.pools.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
                          {section.pools.map(pool => {
                              const config = CARD_POOL_CONFIG[pool as CardPool]; const isSelected = brief.cardPool === pool;
                              const cardElement = (<div onClick={() => handleInputChange('cardPool', pool as CardPool)} className={`p-4 rounded-xl cursor-pointer transition-all duration-200 transform hover:-translate-y-1 shadow-sm hover:shadow-lg text-center flex flex-col justify-center min-h-[140px] glass-card ${config.baseClasses} ${isSelected ? config.selectedClasses : ''}`}>
                                  <p className={`text-lg font-semibold ${config.nameClasses}`}>{config.name}</p><p className={`text-xs mt-2 ${config.descriptionClasses}`}>{config.description}</p></div>);
                              if (pool === 'showdown') {
                                  return (<div key={pool}>{cardElement}{isSelected && (<div className="mt-4 transition-all duration-300 ease-in-out animate-reveal"><label className="block text-sm font-medium text-gray-700 mb-1">對決招式 (選填)</label><select value={brief.duelTactic} onChange={(e) => handleInputChange('duelTactic', e.target.value as DuelTactic)} className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">{DUEL_TACTIC_OPTIONS.map(tactic => <option key={tactic} value={tactic}>{tactic}</option>)}</select></div>)}</div>);
                              }
                              return <div key={pool}>{cardElement}</div>
                          })}
                      </div>
                  </div>
              ))}
          </div>

          <hr className="my-8 border-gray-200" />
          
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">創意種子 (Seed)</h3>
            <p className="text-sm text-gray-600 mb-4">提供一個種子碼可以讓 AI 的隨機結果變得可重現，方便團隊回溯與評審。</p>
            <div className="flex items-center gap-3">
                <InputField 
                    label=""
                    name="seed"
                    value={brief.seed ?? ''} 
                    onChange={(e) => handleInputChange('seed', e.target.value ? parseInt(e.target.value.replace(/\D/g, ''), 10) : undefined)} 
                    placeholder={"留空則隨機"}
                />
                <button 
                    type="button" 
                    onClick={handleRandomSeed}
                    title={brief.cardPool === 'meme' ? "試試看輸入... 8787" : "隨機產生一個種子"}
                    className="p-2.5 mt-1.5 bg-gray-100 rounded-md hover:bg-gray-200 border border-gray-300"
                >
                    <DiceIcon className="w-5 h-5 text-gray-600" />
                </button>
            </div>
          </div>

          <hr className="my-8 border-gray-200" />
      
          <h3 className="text-lg font-semibold text-gray-800 mb-4">風格調諧</h3>
          <StyleTuner 
              directives={brief.styleDirectives} 
              onChange={handleStyleDirectivesChange}
              cardPool={brief.cardPool}
              hookConciseness={hookConciseness}
              onHookConcisenessChange={setHookConciseness}
          />
      </FormSection>

      <div className="flex flex-col pt-5 mt-5 border-t border-gray-200 gap-3">
        {/* Row 1: Hook Tools */}
        <div className="grid grid-cols-3 gap-3">
          <button 
              type="button" 
              onClick={handleForgeHooks} 
              disabled={isActionDisabled}
              title={disabledTitle} 
              className={`w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all bg-slate-600 hover:bg-slate-700 focus:ring-slate-500 disabled:bg-slate-300 disabled:cursor-not-allowed whitespace-nowrap`}>
              <HammerIcon className={`w-5 h-5 mr-2`} />
              鍛造 Hook
          </button>
           <button 
              type="button" 
              onClick={handleManualHook} 
              disabled={isActionDisabled}
              title={disabledTitle || "手動輸入一個 Hook，讓 AI 為您續寫"} 
              className={`w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap`}>
              <PencilIcon className={`w-5 h-5 mr-2`} />
              手動撰寫
          </button>
          <button 
            type="button" 
            onClick={handleStressTest} 
            disabled={isActionDisabled}
            title={disabledTitle} 
            className={`w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 disabled:bg-teal-300 disabled:cursor-not-allowed whitespace-nowrap`}>
            <KaleidoscopeIcon className={`w-5 h-5 mr-2`} />
            Hook 萬花筒
          </button>
        </div>

        {/* Row 2: Summoning */}
        <div className="grid grid-cols-2 gap-3">
           <button 
              type="button" 
              onMouseDown={handleSummonPress}
              onMouseUp={handleSummonRelease}
              onMouseLeave={handleChargeCancel}
              onTouchStart={handleSummonPress}
              onTouchEnd={handleSummonRelease}
              disabled={isActionDisabled} 
              title={isMemeLordMode ? "你發現了迷因霸主模式！" : (disabledTitle || "按住可蓄力召喚 SSR！")}
              className={`w-full crazy-glow-button inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform ${isCharging ? 'charge-active' : ''} ${buttonPoolConfig.buttonClasses} ${isMemeLordMode ? 'meme-lord-active' : ''} disabled:cursor-not-allowed whitespace-nowrap`}>
              <SparklesIcon className={`w-5 h-5 mr-2 ${brief.cardPool === 'mythical' ? 'text-yellow-200 drop-shadow-lg' : ''}`} />
              {isMemeLordMode ? '召喚迷因霸主' : '靈感召喚'}
          </button>
          <button 
              type="button" 
              onClick={handleTenPull} 
              disabled={isActionDisabled} 
              title={isMemeLordMode ? "你發現了迷因霸主模式！" : disabledTitle}
              className={`w-full crazy-glow-button inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${buttonPoolConfig.tenPullClasses} ${isMemeLordMode ? 'meme-lord-active' : ''} disabled:cursor-not-allowed whitespace-nowrap`}>
              <SparklesIcon className={`w-5 h-5 mr-2 ${brief.cardPool === 'mythical' ? 'text-yellow-200 drop-shadow-lg' : ''}`} />
              {isMemeLordMode ? '霸主十連召喚' : '靈感十連召喚'}
          </button>
        </div>
      </div>
    </form>
    {isCastingRoomOpen && (
        <VirtualCastingRoom
            isOpen={isCastingRoomOpen}
            onClose={() => setIsCastingRoomOpen(false)}
        />
    )}
    </>
  );
};

export default BriefWizard;