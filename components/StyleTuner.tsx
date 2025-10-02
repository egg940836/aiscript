import React from 'react';
import { type StyleDirectives, HookMethod, CtaMethod, CardPool, HookConciseness } from '../types';
import { HOOK_METHOD_OPTIONS, CTA_METHOD_OPTIONS, HOOK_CONCISENESS_OPTIONS } from '../constants';

const DescriptiveSlider: React.FC<{
  label: string;
  value: number;
  lowLabel: string;
  highLabel: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, value, lowLabel, highLabel, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input 
            type="range" 
            min="0" 
            max="3" 
            step="1"
            value={value} 
            onChange={onChange} 
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{lowLabel}</span>
            <span>{highLabel}</span>
        </div>
    </div>
);


const Select: React.FC<{ 
    label: string; 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
    options: string[];
    disabled?: boolean;
}> = ({ label, value, onChange, options, disabled = false }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select 
            value={value} 
            onChange={onChange} 
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

interface StyleTunerProps {
  directives: StyleDirectives;
  onChange: (directives: StyleDirectives) => void;
  cardPool: CardPool;
  hookConciseness: HookConciseness;
  onHookConcisenessChange: (conciseness: HookConciseness) => void;
}

const StyleTuner: React.FC<StyleTunerProps> = ({ directives, onChange, cardPool, hookConciseness, onHookConcisenessChange }) => {
    
    const handleSelectChange = (field: 'hookMethod' | 'ctaMethod', value: string) => {
        onChange({ ...directives, [field]: value });
    };

    const handleSliderChange = (field: 'orality' | 'emotion', value: string) => {
        onChange({ ...directives, [field]: parseInt(value, 10) });
    };

    const CONFLICTING_POOLS: CardPool[] = ['showdown', 'strategy', 'drama', 'taiwanese', 'meme'];
    const areMethodsDisabled = CONFLICTING_POOLS.includes(cardPool);
    const isViolentOpening = directives.emotion === 4 && directives.orality === 3;

  return (
    <div>
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-600 mb-3">Hook 鍛造風格</h4>
        <div className="flex flex-wrap gap-3">
            {HOOK_CONCISENESS_OPTIONS.map((option) => (
                <button
                    type="button"
                    key={option.value}
                    onClick={() => onHookConcisenessChange(option.value)}
                    className={`text-center p-3 border rounded-lg transition-all duration-200 flex-1 min-w-[120px] ${
                        hookConciseness === option.value
                            ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200'
                            : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    <p className="font-semibold text-sm text-gray-800">{option.label.split(' ')[0]}</p>
                    <p className="text-xs text-gray-500 mt-1">{option.label.split(' ')[1]}</p>
                </button>
            ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">選擇不同的開頭策略與時長，以應對不同情境，並為『靈感召喚』提供開頭風格建議 (高階卡池除外)。</p>
      </div>

      <hr className="my-6 border-gray-200" />

      <div>
        <h4 className="text-sm font-semibold text-gray-600 mb-3">完整腳本生成設定</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
                label="HOOK生成法" 
                value={directives.hookMethod} 
                onChange={(e) => handleSelectChange('hookMethod', e.target.value as HookMethod)} 
                options={HOOK_METHOD_OPTIONS}
                disabled={areMethodsDisabled}
            />
            <Select 
                label="CTA生成法" 
                value={directives.ctaMethod} 
                onChange={(e) => handleSelectChange('ctaMethod', e.target.value as CtaMethod)} 
                options={CTA_METHOD_OPTIONS}
                disabled={areMethodsDisabled}
            />
        </div>
        
        {areMethodsDisabled && (
            <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-r-lg">
                <p><strong>提示</strong>：當前選擇的創意卡池擁有自己固定的腳本框架，因此會自動決定開頭 (Hook) 與結尾 (CTA) 的生成方式。此處的手動設定將被 AI 忽略。</p>
            </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <DescriptiveSlider 
                label="口語度" 
                value={directives.orality} 
                onChange={(e) => handleSliderChange('orality', e.target.value)}
                lowLabel="書面語"
                highLabel="大白話"
            />
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">情緒</label>
                <div className="relative">
                    <input 
                        type="range" 
                        min="0" 
                        max="4"
                        step="1"
                        value={directives.emotion} 
                        onChange={(e) => handleSliderChange('emotion', e.target.value)} 
                        className={`emotion-slider w-full ${directives.emotion === 4 ? 'is-crazy' : ''}`}
                    />
                     {isViolentOpening ? (
                        <span className="absolute -top-5 right-[-12px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 animate-crazy-label">暴力開場!</span>
                     ) : directives.emotion === 4 && (
                        <span className="absolute -top-5 right-[-12px] font-bold text-red-500 animate-crazy-label">瘋狂!</span>
                    )}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>冷靜客觀</span>
                    <span>熱情奔放</span>
                </div>
            </div>
        </div>
        {isViolentOpening && (
          <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-400 text-red-800 text-sm rounded-r-lg animate-reveal">
              <p><strong>隱藏彩蛋已觸發：暴力開場！</strong></p>
              <p className="text-xs mt-1">AI 將會創造一個極端暴力的開頭來「模式中斷」觀眾，以達成最高的吸睛效果。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StyleTuner;