

import { Metric, type Brief, type CoreAudience, HookMethod, CtaMethod, type CardPool, DuelTactic, HookConciseness, ActorRole, VisualStyle, AdPlacement, AdDuration, ActorDefinition, BodyShape, BustSize } from './types';

export const STRATEGIC_DURATION_OPTIONS: { value: AdDuration; name: string; description: string }[] = [
    { value: '6-10s', name: '瞬息鉤 (6-10s)', description: '適合快節奏促購' },
    { value: '10-15s', name: '黃金秒數 (10-15s)', description: 'Feed/Reels 萬用' },
    { value: '15-30s', name: '微故事 (15-30s)', description: '適合產品示範/敘事' },
    { value: '30-60s', name: '深度內容 (30-60s)', description: '適合再行銷/教學' },
];

export const DURATION_LABELS: Record<AdDuration, string> = {
    '6-10s': '瞬息鉤',
    '10-15s': '黃金秒數',
    '15-30s': '微故事',
    '30-60s': '深度內容',
};

// New creative method options for UI
export const HOOK_METHOD_OPTIONS = Object.values(HookMethod);
export const CTA_METHOD_OPTIONS = Object.values(CtaMethod);
export const DUEL_TACTIC_OPTIONS = Object.values(DuelTactic);
export const HOOK_CONCISENESS_OPTIONS: { value: HookConciseness; label: string }[] = [
  { value: 'instantKill', label: '瞬殺鉤 (1-2s)' },
  { value: 'standard', label: '標準鉤 (2-3s)' },
  { value: 'suspense', label: '懸念鉤 (3-5s)' },
];
export const ACTOR_ROLE_OPTIONS = Object.values(ActorRole);

export const VISUAL_STYLE_OPTIONS: { value: VisualStyle, name: string, description: string }[] = [
    { value: VisualStyle.Automatic, name: 'AI 自動判斷', description: '讓 AI 根據產品特性決定最佳風格。' },
    { value: VisualStyle.Bright, name: '明亮通透', description: '高光、白色系、簡潔背景，氛圍清新。' },
    { value: VisualStyle.Cinematic, name: '電影感', description: '淺景深、戲劇性光影、故事性運鏡。' },
    { value: VisualStyle.Muji, name: '日系無印風', description: '木質調、低飽和度、溫暖自然光。' },
    { value: VisualStyle.Retro, name: '復古懷舊', description: '暖色調、顆粒感、經典懷舊元素。' },
    { value: VisualStyle.Luxury, name: '高奢質感', description: '暗色調、金屬細節、精緻慢鏡頭。' },
];


export const CORE_AUDIENCES: CoreAudience[] = [
  { id: 'renters_small_space', name: '小坪數租屋族', keywords: ['彈性', '收納', '易搬運'], description: '在意空間利用最大化、家具是否容易搬動，且對價格敏感。', defaultHook: '走道又卡住了？你的客廳其實可以更大！', defaultBenefit: '模組化設計，不只釋放空間，更把收納變不見。' },
  { id: 'family_kids', name: '親子家庭', keywords: ['耐髒', '安全', '易清潔'], description: '首要考量材質安全無毒、結構穩固、圓角防撞，以及布料是否容易清潔。', defaultHook: '孩子是天生的藝術家，但沙發不是畫布！', defaultBenefit: '科技易潔布，果汁、蠟筆一擦就乾淨，安心又耐用。' },
  { id: 'pet_owners', name: '毛孩家庭', keywords: ['耐抓', '防潑水', '好清毛'], description: '需要耐抓的布料、抗污防潑水功能，且不易沾黏毛髮。', defaultHook: '愛貓主子，更愛沙發？你不用再二選一！', defaultBenefit: '我們的貓抓布沙發，經過萬次測試，讓毛孩磨爪，你也不心疼。' },
  { id: 'newlyweds_starter', name: '新婚/小家庭', keywords: ['風格', 'CP值', '成家'], description: '追求風格統一與高CP值，希望家具能一次購足，並適應未來家庭成員變化。', defaultHook: '成家第一件事，就是搞定客廳！', defaultBenefit: '成家套組幫你配到好，風格、預算一次到位。' },
  { id: 'elderly_friendly', name: '長輩友善', keywords: ['支撐', '易起身', '高椅腳'], description: '需要適當的座椅高度與硬度，幫助長輩輕鬆起身，並提供良好背部支撐。', defaultHook: '你家的沙發，對爸媽的膝蓋友善嗎？', defaultBenefit: '加高椅腳與強化支撐，讓長輩每次起身都輕鬆安全。' },
// FIX: Removed corrupted line causing syntax errors.
  { id: 'back_support', name: '背部支撐/久坐', keywords: ['人體工學', '護腰', '高背'], description: '長時間使用者，在意腰背部的支撑性，需要符合人體工學的設計。', defaultHook: '你坐的不是沙發，是日積累的腰酸背痛？', defaultBenefit: '人體工學曲線，完美貼合你的背部，久坐也舒適。' },
  { id: 'wfh_home_office', name: '居家辦公', keywords: ['多功能', '收納', '沙發床'], description: '需要在客廳創造工作區，家具需兼具辦公、休閒與收納等多功能。', defaultHook: '客廳一秒變辦公室，下班再變回來！', defaultBenefit: '內建邊桌與充電座，工作、追劇模式無縫切換。' },
  { id: 'style_seekers', name: '風格控/設計感', keywords: ['設計感', '材質', '色彩'], description: '極度重視家具的設計美學，追求獨特的風格、材質與顏色搭配。', defaultHook: '別讓沙發，毀了你精心設計的家。', defaultBenefit: '設計師聯名款，讓你的客廳像雜誌封面一樣美。' },
  { id: 'minimal_storage', name: '極簡收納', keywords: ['隱藏收納', '視覺整潔', '斷捨離'], description: '追求視覺上的乾淨整潔，需要強大的隱藏式收納功能。', defaultHook: '真正的極簡，是把雜物都藏起來。', defaultBenefit: '掀蓋式大容量收納，把遙控器、雜誌通通變不見。' },
  { id: 'easy_clean_hygiene', name: '易潔/衛生敏感', keywords: ['可拆洗', '防塵蟎', '快乾'], description: '對衛生要求高，需要全套可拆洗、防塵蟎的材質。', defaultHook: '你知道沙發套比馬桶蓋還髒嗎？', defaultBenefit: '全套可機洗，輕鬆維持潔淨，告別過敏原。' },
  { id: 'budget_value', name: '預算型', keywords: ['高CP值', '分期', '耐用'], description: '在有限預算內，尋找最物有所值、耐用且有基本設計感的選擇。', defaultHook: '誰說便宜，就買不到好沙發？', defaultBenefit: '萬元入門款，享免運、分期零利率，小資族也能輕鬆入手。' },
  { id: 'premium_upgrade', name: '質感升級', keywords: ['頂級材質', '工藝', '售後服務'], description: '追求頂級用料、精緻工藝與完善的售後服務，預算較為充足。', defaultHook: '你家的門面，值得最好的投資。', defaultBenefit: '進口Nappa皮革、實木框架，每個細節都是品味的展現。' },
];

export const BODY_SHAPES: readonly BodyShape[] = ['沙漏', '倒三角', '梨形', '蘋果', '直筒', '健美', '纖細'];
export const BUST_SIZES: readonly BustSize[] = ['自然', '適中', '豐滿', '巨乳', '動漫級'];

export const DEFAULT_ACTOR_DEFINITION: ActorDefinition = {
    gender: '女',
    age: 18,
    skinTone: 'III 自然白',
    facialFeaturesTemplate: ['台灣人'],
    bodyShape: ['纖細'],
    bustSize: '適中',
    muscleTone: 20,
    height: 165,
    aura: ['鄰家'],
    hairLength: '中',
    hairStyle: '直',
    hairColor: '深棕色',
    clothingStyle: ['日系簡約'],
    facialDetails: '',
    accessories: '',
};

export const INITIAL_BRIEF: Brief = {
  scriptType: 'product',
  productName: '',
  productFeatures: '',
  storeName: '',
  storeFeatures: '',
  featuredProducts: [],
  brandName: '',
  pricingTier: 'budget',
  price: '',
  duration: '10-15s',
  presenters: [{ id: 'presenter-1', name: 'KOC', role: ActorRole.KOC }],
  styleDirectives: {
    hookMethod: HookMethod.Automatic,
    ctaMethod: CtaMethod.Automatic,
    orality: 2,
    emotion: 3,
  },
  visualStyle: VisualStyle.Automatic,
  cardPool: 'rare',
  duelTactic: DuelTactic.Automatic,
  seed: undefined,
};

export const VOICE_PROFILE_TO_PACE_KEY: Record<string, string> = {
  "V0｜品牌官宣": 'V0',
  "V1｜教學顧問": 'V1',
  "V1.5｜社群对话": 'V1_5',
  "V2｜節奏帶動": 'V2',
  "V2.5｜議題挑戰": 'V2_5',
  "V3｜幽默梗": 'V2', 
};