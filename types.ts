

export type AdPlacement = 'feed' | 'reels' | 'stories' | 'instream';
export type AdDuration = '6-10s' | '10-15s' | '15-30s' | '30-60s';


export enum Metric {
    CTR = "CTR",
    VTR = "VTR",
    CPA = "CPA",
}

// New creative method enums
export enum HookMethod {
    Automatic = "自動",
    Conflict = "衝突先行",
    Question = "疑問",
    Comparison = "對比",
    Challenge = "挑戰",
    Benefit = "益處直擊",
    MythBusting = "迷思破解",
    Storytelling = "故事開頭",
    SurprisingStat = "驚人數據",
    NegativeToPositive = "負轉正",
}

export enum CtaMethod {
    Automatic = "自動",
    Direct = "直接命令",
    Urgency = "限時急迫",
    Benefit = "益處導向",
    Scarcity = "稀有訴求",
    SocialProof = "社群認同",
    Question = "引導提問",
    Community = "社群邀請",
    Cliffhanger = "懸念引導",
    ValueStack = "價值疊加",
}

export type SceneRefinementAction = 'condense' | 'expand' | 'polish';


export type ModelTier = 'flash' | 'pro';


export interface Persona {
  id: string;
  painPoint: string;
  benefit: string;
}

// New Types for Audience Selector v2
export interface CoreAudience {
  id:string;
  name: string;
  keywords: string[];
  description: string;
  defaultHook: string;
  defaultBenefit: string;
}

export interface PersonaPick {
  id: string; // Corresponds to CoreAudience.id
  weight: number;
}


export interface AudienceIntent {
  personas: PersonaPick[];
}
// End New Types

// Keyword & Style Studio v2.0 Types
export type KeywordCategory = 'core' | 'context' | 'benefit' | 'proof';
export interface KeywordAnalysis {
    core: string[];
    context: string[];
    benefit: string[];
    proof: string[];
}

// FIX: Added missing KeywordProfile interface to resolve import error in KeywordStudio.tsx.
export interface KeywordProfile {
  core: string[];
  context: string[];
  benefit: string[];
  proof: string[];
  avoid: string;
  autoExpand: boolean;
}

export interface Keyword {
  value: string;
  reason: string;
}

// Updated StyleDirectives to remove frameworks/voices and add creative methods
export interface StyleDirectives {
    hookMethod: HookMethod;
    ctaMethod: CtaMethod;
    // Knobs (0-3)
    orality: number; // 口語度
    emotion: number; // 情緒
}

export interface KeywordSuggestions {
    core: Keyword[];
    context: Keyword[];
    benefit: Keyword[];
    proof: Keyword[];
    avoid: Keyword[];
}
// End v2.0 Types

export type ScriptType = 'product' | 'store';
export type PricingTier = 'budget' | 'premium';

export enum ActorRole {
    KOC = "KOC (意見消費者)",
    KOL = "KOL (意見領袖)",
    Amateur = "素人 (一般人)",
    Customer = "顧客 (真實用戶)",
    Star = "明星/藝人",
    HiddenCamera = "藏鏡人 (不露臉)",
    Expert = "專家/達人",
    StoreManager = "店長",
    BrandRep = "品牌代表",
    VoiceOver = "旁白 (畫外音)",
}

// --- Presenter / Actor Types ---
export interface Presenter {
    id: string;
    name: string;
    role: ActorRole;
}
// --- End Presenter Types ---

// --- Actor Creator (Virtual Casting Room) Types ---
// Pro v2 Definition
export type GenderExpression = '男' | '女';
export type SkinTone = 'I 亮白' | 'II 白皙' | 'III 自然白' | 'IV 蜜棕' | 'V 深棕' | 'VI 黑褐';
export type FacialFeatureTemplate = '台灣人' | '日本人' | '韓國人' | '東亞' | '東南亞' | '南亞' | '東歐/中歐' | '南歐/地中海' | '北歐' | '斯拉夫' | '中東/波斯' | '北非' | '東非' | '西非' | '南非' | '拉丁美洲' | '原住民族系';
export type BodyShape = '沙漏' | '倒三角' | '梨形' | '蘋果' | '直筒' | '健美' | '纖細';
export type BustSize = '自然' | '適中' | '豐滿' | '巨乳' | '動漫級';
export type Aura = '清冷' | '溫柔' | '陽光' | '書卷' | '可愛' | '性感' | '嫵媚' | '中性酷' | '古典' | '精靈系' | '元氣' | '厭世' | '邪魅' | '成熟穩重' | '憂鬱' | '俏皮' | '高冷貴氣' | '鄰家' | '幹練' | '治癒';
export type HairLength = '平頭' | '短' | '中' | '長' | '超長';
export type HairStyle = '直' | '自然捲' | '大波浪' | '玉米鬚' | '包頭' | '馬尾' | '雙馬尾' | '公主切' | '狼尾' | '法式捲' | '油頭';
export type ClothingStyle = '日系簡約' | '韓系極簡' | '學院' | '街頭' | '工裝' | '運動機能' | '商務休閒' | '西裝正裝' | '小禮服' | '優雅洋裝' | '龐克' | '哥德' | '賽博龐克' | 'Techwear';


export interface ActorDefinition {
    // Identity
    gender: GenderExpression;
    age: number; // 1-100

    // Appearance
    skinTone: SkinTone;
    facialFeaturesTemplate: FacialFeatureTemplate[];
    bodyShape: BodyShape[];
    bustSize: BustSize;
    muscleTone: number; // 0-100
    height: number; // in cm

    // Style
    aura: Aura[];
    hairLength: HairLength;
    hairStyle: HairStyle;
    hairColor: string;
    clothingStyle: ClothingStyle[];
    
    // Fine details
    facialDetails: string; // free text for moles, scars etc.
    accessories: string; // free text for glasses, jewelry etc.
}

export interface SavedActor {
    id: string;
    name: string;
    definition: ActorDefinition;
    base64Image: string;
}

export interface ActorImageData {
    base64Image: string;
    definition: ActorDefinition;
}
// --- End Actor Creator Types ---


export type CreativeEngine = 'standard' | 'epic';
export type CardPool = 'normal' | 'rare' | 'showdown' | 'strategy' | 'legendary' | 'mythical' | 'drama' | 'taiwanese' | 'meme';

export enum DuelTactic {
    Automatic = "AI 自動判斷",
    SplitScreen = "Split-Screen Duel (畫面分割對決)",
    Stopwatch = "Stopwatch Race (碼錶競速對決)",
    TortureTriple = "Torture Triple-KO (極限三重測試)",
    BlindTest = "Blind Test (盲測挑戰)",
    DbQuiet = "dB Quiet Duel (靜音分貝對決)",
    Thermal = "Thermal Duel (溫控對決)",
    TCOWallet = "TCO Wallet Duel (總成本對決)",
    MythReality = "Myth vs Reality (迷思破解對決)",
    BeforeAfter = "Before/After Swap (前後對比)",
    OneTake = "One-Take Proof (一鏡到底)",
}

export interface FeaturedProduct {
  id: string;
  name: string;
  features: string;
}

export enum VisualStyle {
    Automatic = "AI 自動判斷",
    Bright = "明亮通透",
    Cinematic = "電影感",
    Muji = "日系無印風",
    Retro = "復古懷舊",
    Luxury = "高奢質感",
}

export interface Brief {
  scriptType: ScriptType;
  // Product fields
  productName?: string;
  productFeatures?: string;
  pricingTier?: PricingTier;
  price?: string;
  // Store fields
  storeName?: string;
  storeFeatures?: string;
  featuredProducts?: FeaturedProduct[];
  
  brandName?: string;
  
  duration: AdDuration;

  // New Presenter fields
  presenters: Presenter[];

  // Re-added to support manual style tuning
  styleDirectives: StyleDirectives;
  cardPool: CardPool;
  duelTactic: DuelTactic;
  visualStyle?: VisualStyle;
  seed?: number;
}

export interface DialogueLine {
    speaker: string;
    line: string;
    directorNote?: string;
}

export interface Scene {
  id: string;
  timecode: string;
  shot: string;
  dialogue: DialogueLine[];
  onScreenText: string;
  sfx: string;
  bRoll: string;
}

// --- Video Scene Generation Types ---
export interface VideoScene {
  sceneId: string; // Corresponds to Scene.id
  startFrame?: string; // base64
  endFrame?: string; // base64
  videoPrompt?: string;
  transitionToNext?: 'CONTINUOUS' | 'CUT';
}
// --- End Video Scene Generation Types ---

// --- Scoring Model v2.0 (AI Director Review) ---
export type Rarity = 'SSR' | 'SR' | 'R' | 'N';

export type SubscoreName = 
  | 'hookStrength'       // 開場鉤子強度
  | 'strategyExecution'  // 策略執行度
  | 'clarity'            // 訊息清晰度
  | 'emotionalResonance' // 情感共鳴度
  | 'ctaStrength'        // CTA強度
  | 'brandConsistency';  // 品牌一致性

export interface Subscore {
  name: string; // The display name, e.g., "開場鉤子強度"
  value: number; // 0-100
  reason: string; // AI-generated reason for the score
}

export interface ScoreCard {
  scriptId: string;
  subscores: Record<SubscoreName, Subscore>;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D';
  rarity: Rarity;
  critique: string; // AI Director's overall critique
  topFixes: string[]; // AI-generated, actionable top fixes
}
// --- End Scoring Model v2.0 ---

// FIX: Added missing Storyboard types to resolve errors in StoryboardModal.tsx
// --- Storyboard Pro Types ---
export interface StoryboardFrameSuggestion {
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  composition: string;
  lighting: string;
  description: string;
}

export interface StoryboardFrameSketch {
  base64Image: string;
}

export interface StoryboardFrame {
  id: string;
  suggestion: StoryboardFrameSuggestion;
  sketch?: StoryboardFrameSketch;
}

export interface StoryboardScene {
  sceneId: string; // Corresponds to Scene.id
  frames: StoryboardFrame[];
}
// --- End Storyboard Pro Types ---


export interface Script {
  id: string;
  brief: Brief;
  framework: string; // Now AI-driven, so just a string
  voice: string; // Now AI-driven, so just a string
  duration: AdDuration;
  scenes: Scene[];
  cta: string;
  isCompliant: boolean | null;
  complianceIssues?: ComplianceIssue[];
  title: string;
  isFavorited: boolean;
  keywordAnalysis: KeywordAnalysis;
  scoreCard: ScoreCard;
  createdAt: number;
  cardPool: CardPool;
  groundingSources?: { title: string; uri: string }[];
  strategyFramework?: string; // e.g., 'SPARK', 'SLAM'
  duelTacticUsed?: string; // e.g., 'Stopwatch Race (碼錶競速對決)'
  copyrightNotice?: string; // For meme pool
  presenters: Presenter[];
  videoScenes?: VideoScene[];
  presenterImageMap?: Record<string, ActorImageData>; // key is presenter.id
  // FIX: Added missing storyboard and isGeneratingSketches properties to resolve errors in StoryboardModal.tsx
  storyboard?: StoryboardScene[];
  isGeneratingSketches?: boolean;
  isDirectorMode?: boolean;
  isAddingDirectorNotes?: boolean;
  seed?: number;
  durationVersions?: Partial<Record<AdDuration, Scene[]>>;
  isGeneratingDuration?: AdDuration | false;
  productionWarnings?: string[];
}

// --- Generation Queue Types ---
export type ProgressCallback = (update: { statusMessage: string }) => void;

export interface PendingScript {
  id: string;
  batchId: string;
  batchCurrent: number;
  batchTotal: number;
  brief: Brief;
  statusMessage: string;
  continuationScene?: Scene;
  hookConciseness?: HookConciseness;
  isCharged?: boolean;
  abTestOriginalScript?: Script;
}

export interface FailedScript {
  id: string;
  brief: Brief;
  error: string;
  batchId?: string;
  batchCurrent?: number;
  batchTotal?: number;
}
// --- End Generation Queue Types ---

export interface ComplianceIssue {
  id: string;
  sceneId: string;
  text: string;
  reason: string;
  suggestion: string;
}

export interface ComplianceResult {
    isCompliant: boolean;
    issues: ComplianceIssue[];
}

export interface CondenseOptions {
  text: string;
  targetSeconds: number;
  voice: string; // VoiceProfile is no longer an enum
}

export interface Preset {
  id: string;
  name: string;
  type: ScriptType;
  // Brief fields
  productName?: string;
  productFeatures?: string;
  pricingTier?: PricingTier;
  price?: string;
  storeName?: string;
  storeFeatures?: string;
  brandName?: string;
}

export interface GeneratedHook {
    vo: string;
    onScreenText: string;
}

export type HookConciseness = 'instantKill' | 'standard' | 'suspense';

// --- Hook Stress Test Types ---
export type HookStressTestResult = Partial<Record<HookMethod, GeneratedHook[]>>;
export interface SavedHook extends GeneratedHook {
    id: string;
    method: HookMethod;
    createdAt: number;
}
// --- End Hook Stress Test Types ---


export interface BriefWizardProps {
  onGenerate: (brief: Brief, count: number | undefined, hookConciseness: HookConciseness, isCharged?: boolean) => void;
  onGenerateHooks: (brief: Brief, conciseness: HookConciseness) => void;
  onStressTestHooks: (brief: Brief) => void;
  onOpenManualHook: (brief: Brief) => void;
  isProMode: boolean;
  // FIX: Add isQueueProcessing to props to fix type error in App.tsx and allow disabling buttons during generation.
  isQueueProcessing?: boolean;
}