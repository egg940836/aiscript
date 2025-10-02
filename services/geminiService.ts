

import { v4 as uuidv4 } from 'uuid';
import { 
    type Brief, type Script, type Scene, type ComplianceResult, type CondenseOptions, 
    type AudienceIntent, type StyleDirectives, type KeywordAnalysis, type PersonaPick, 
    type ScoreCard, type Subscore, type SubscoreName, HookMethod, CtaMethod,
    type KeywordSuggestions, type Keyword, Rarity, ComplianceIssue, GeneratedHook, DialogueLine,
    CardPool,
    DuelTactic,
    SceneRefinementAction,
    ProgressCallback,
    VideoScene,
    HookConciseness,
    ActorDefinition,
    Presenter,
    ActorRole,
    VisualStyle,
    AdPlacement,
    AdDuration
} from '../types';
import { CORE_AUDIENCES, VOICE_PROFILE_TO_PACE_KEY, DUEL_TACTIC_OPTIONS } from '../constants';
import { estimateSeconds, pacePresets } from '../lib/pacing';
import { GoogleGenAI, GenerateContentResponse, Type, GenerateImagesResponse, Modality } from "@google/genai";

// --- AI Client Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// --- Retry Helper ---
const withRetry = async <T>(fn: () => Promise<T>, retries = 6, delay = 2000): Promise<T> => {
    let lastError: Error = new Error("Retry logic failed to execute.");
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            const errorMessage = (lastError.message || '').toLowerCase();
            if (errorMessage.includes('500') || errorMessage.includes('internal') || errorMessage.includes('503') || errorMessage.includes('unavailable')) {
                if (i < retries - 1) {
                    const currentDelay = delay * Math.pow(2, i);
                    console.log(`Attempt ${i + 1} failed with a retriable server error. Retrying in ${currentDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, currentDelay));
                }
            } else {
                console.warn(`Attempt ${i + 1} failed with a non-retriable error:`, lastError);
                break;
            }
        }
    }
    throw lastError;
};


// --- AI-POWERED CREATIVE ENGINE (V3 - Single Atomic Task) ---
const availableVoices = Object.keys(VOICE_PROFILE_TO_PACE_KEY);
const validCardPools: CardPool[] = ['normal', 'rare', 'showdown', 'strategy', 'legendary', 'mythical', 'drama', 'taiwanese', 'meme'];

// --- Schemas for AI ---
const dialogueSchema = { type: Type.ARRAY, description: "場景中的對白/獨白，以講者和台詞物件的陣列呈現。", items: { type: Type.OBJECT, properties: { speaker: { type: Type.STRING, description: "講者的名字，必須與 Brief 中提供的名字完全匹配。" }, line: { type: Type.STRING, description: "該講者說的台詞。" } }, required: ["speaker", "line"] } };
const sceneSchema = { type: Type.OBJECT, properties: { timecode: { type: Type.STRING, description: "格式為 '開始秒數-結束秒數s', e.g., '0-4s'" }, shot: { type: Type.STRING, description: "鏡頭描述" }, dialogue: dialogueSchema, onScreenText: { type: Type.STRING, description: "螢幕上的文字" }, sfx: { type: Type.STRING, description: "音效或背景音樂" }, bRoll: { type: Type.STRING, description: "補充畫面" }, }, required: ["timecode", "shot", "dialogue", "onScreenText", "sfx", "bRoll"] };
const scriptSchema = { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "腳本標題" }, framework: { type: Type.STRING, description: "使用的創意策略 (e.g., Problem-Agitate-Solve)" }, voice: { type: Type.STRING, enum: availableVoices, description: "從提供的列表中選擇的腳本語氣" }, duration: { type: Type.STRING, description: "腳本總時長 (e.g., '10-15s')" }, scenes: { type: Type.ARRAY, items: sceneSchema, }, cta: { type: Type.STRING, description: "Call-to-Action 文案" }, keywordAnalysis: { type: Type.OBJECT, properties: { core: { type: Type.ARRAY, items: { type: Type.STRING } }, context: { type: Type.ARRAY, items: { type: Type.STRING } }, benefit: { type: Type.ARRAY, items: { type: Type.STRING } }, proof: { type: Type.ARRAY, items: { type: Type.STRING } }, }, required: ["core", "context", "benefit", "proof"] }, strategyUsed: { type: Type.STRING, description: "如果使用了策略卡池，標示出具體使用的策略框架名稱 (e.g., 'SPARK', 'SLAM')" }, duelTacticUsed: { type: Type.STRING, enum: DUEL_TACTIC_OPTIONS, description: "如果使用了王牌對決卡池，請標示出具體使用的對決招式名稱。" }, }, required: ["title", "framework", "voice", "duration", "scenes", "cta", "keywordAnalysis"] };

const subscoreSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        value: { type: Type.NUMBER, description: "0-100的分數" },
        reason: { type: Type.STRING, description: "給予此分數的具體、簡潔的理由。" }
    },
    required: ["name", "value", "reason"]
};

const scoreCardSchema = {
    type: Type.OBJECT,
    properties: {
        subscores: {
            type: Type.OBJECT,
            properties: {
                hookStrength: subscoreSchema,
                strategyExecution: subscoreSchema,
                clarity: subscoreSchema,
                emotionalResonance: subscoreSchema,
                ctaStrength: subscoreSchema,
                brandConsistency: subscoreSchema,
            },
            required: ["hookStrength", "strategyExecution", "clarity", "emotionalResonance", "ctaStrength", "brandConsistency"]
        },
        overallScore: { type: Type.NUMBER, description: "基於各項子分數的綜合評分 (0-100)。" },
        grade: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] },
        rarity: { type: Type.STRING, enum: ['SSR', 'SR', 'R', 'N'] },
        critique: { type: Type.STRING, description: "對腳本的總體評論，點出優點與最大的問題點。" },
        topFixes: {
            type: Type.ARRAY,
            description: "提供 2-3 個最關鍵、可執行的具體修改建議。",
            items: { type: Type.STRING }
        }
    },
    required: ["subscores", "overallScore", "grade", "rarity", "critique", "topFixes"]
};

// ** NEW V3 ATOMIC SCHEMA **
const scriptAndScoreCardSchema = {
    type: Type.OBJECT,
    properties: {
        script: scriptSchema,
        scoreCard: scoreCardSchema
    },
    required: ["script", "scoreCard"]
};

async function getNetworkedInspiration(prompt: string): Promise<{ inspirationText: string; groundingSources?: { title: string; uri: string }[] }> {
    const apiCall = () => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { tools: [{ googleSearch: {} }], } });
    const response: GenerateContentResponse = await withRetry(apiCall);
    const inspirationText = response.text ?? "";
    if (!inspirationText || inspirationText.trim().length < 10) { throw new Error("趨勢分析員未能從網路獲取足夠的靈感。"); }
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let groundingSources: { title: string; uri: string }[] | undefined = undefined;
    if (groundingChunks && Array.isArray(groundingChunks)) {
        groundingSources = groundingChunks.map(chunk => chunk.web && { title: chunk.web.title, uri: chunk.web.uri }).filter((source): source is { title: string; uri: string } => !!(source && source.uri && source.title));
    }
    return { inspirationText, groundingSources };
}

function getDuelTacticInstruction(tactic: DuelTactic): string {
    switch (tactic) {
        case DuelTactic.SplitScreen: return "請設計一個畫面分割的場景，同步對比我方產品與競品或舊方法的表現。";
        case DuelTactic.Stopwatch: return "請設計一個使用碼錶計時的競賽場景，直觀地展示我方產品在效率上的優勢。";
        case DuelTactic.TortureTriple: return "請設計連續三個不同層面的極限測試場景（如耐用、防水、抗污），並逐一展示我方產品的卓越表現。";
        case DuelTactic.BlindTest: return "請設計一個盲測場景，讓受測者在不知情的狀況下體驗並給出真實回饋，最後再揭曉品牌。";
        case DuelTactic.DbQuiet: return "請設計一個使用分貝計的場景，對比我方產品與競品在運作時的安靜程度。";
        case DuelTactic.Thermal: return "請設計一個使用熱像儀或溫度計的場景，展示我方產品在散熱或保溫上的優越性能。";
        case DuelTactic.TCOWallet: return "請設計一個不僅比較購買價格，更包含長期使用成本（如電費、維護費、壽命）的總成本對決場景。";
        case DuelTactic.MythReality: return "請先陳述一個普遍的行業迷思或錯誤觀念，然後透過實際測試來證明我方產品如何打破這個迷思。";
        case DuelTactic.BeforeAfter: return "請設計一個經典的前後對比場景，並在最後將 Before/After 畫面並陳，強化效果衝擊力。";
        case DuelTactic.OneTake: return "請設計一個一鏡到底的連續操作場景，無剪輯地展示產品從頭到尾的流暢使用體驗或多功能操作。";
        default: return "";
    }
}

function briefToPrompt(brief: Brief, iteration?: number, total?: number, continuationScene?: Scene, hookConciseness?: HookConciseness, isCharged?: boolean, abTestOriginalScript?: Script): string {
    const { scriptType, productName, productFeatures, storeName, storeFeatures, featuredProducts, brandName, pricingTier, price, duration, presenters, styleDirectives, cardPool, duelTactic, visualStyle, seed } = brief;
    
    const isMemeLordMode = cardPool === 'meme' && seed === 8787;

    let mainInfo = '';
    let featuredProductInfo = '';
    
    if (scriptType === 'product') { 
        mainInfo = `- **腳本主體**: 產品介紹\n- **產品名稱**: ${productName || '未提供'}\n- **產品特色**:\n${productFeatures ? productFeatures.split('\n').map(f => `  - ${f}`).join('\n') : '  - 未提供'}\n- **產品定位**: ${pricingTier === 'budget' ? '價格導向' : '價值導向'}\n${price ? `- **產品價格**: ${price}` : ''}`; 
    } else { 
        mainInfo = `- **腳本主體**: 門市介紹\n- **門市名稱**: ${storeName || '未提供'}\n- **門市特色**:\n${storeFeatures ? storeFeatures.split('\n').map(f => `  - ${f}`).join('\n') : '  - 未提供'}`; 
        if (featuredProducts && featuredProducts.length > 0) {
            const productList = featuredProducts.map(p => `    - **${p.name}**: ${p.features}`).join('\n');
            featuredProductInfo = `\n- **主打產品 (請在腳本中自然帶到)**:\n${productList}`;
        }
    }
    
    const placementInstruction = `腳本必須具備高度通用性，能夠同時適用於 Facebook 動態時報 (Feed) 和 Reels。這代表腳本的**前 3 秒必須極度吸睛、節奏明快**，以抓住垂直影音觀眾的注意力，但中段又應具備足夠的資訊量，以滿足動態時報的瀏覽習慣。`;
    const specInfo = `- **腳本時長**: 請創作一個 **${duration}** 的腳本。\n- **投放策略**: ${placementInstruction}`;

    const roleInstructions = `\n  - **角色策略指導**: 請根據每個角色的定位來分配戲份與台詞風格：
      - **KOC (意見消費者)**: 像朋友一樣分享，強調真實體驗。
      - **KOL (意見領袖)**: 具影響力，適合新品背書、引爆話題。
      - **素人 (一般人)**: 代表路人視角，貼近生活，可用於街訪或情境劇。
      - **顧客 (真實用戶)**: 最強的見證，著重於使用前後的改變與痛點解決。
      - **明星/藝人**: 具備大眾公信力與流量，適合品牌形象廣告。
      - **專家/達人**: 提供專業背書，解釋技術細節，建立權威感。
      - **店長**: 代表第一線服務，帶有「人情味」，適合介紹產品或門市。
      - **品牌代表**: 品牌的靈魂人物 (如創辦人)，傳遞願景與價值。
      - **藏鏡人 (不露臉)**: 不露臉的提問者或揭秘者，用來製造劇情張力與懸念。
      - **旁白 (畫外音)**: 純聲音，用於串連場景、解釋畫面或補充資訊。
      - **重要**: 「旁白 (畫外音)」這個角色，**不應**出現在鏡頭描述('shot')裡。「藏鏡人 (不露臉)」通常不露全臉，但可以描述他/她的手、腳或持有的道具出現在鏡頭中（例如：一隻手將產品遞出），因為藏鏡人就是掌鏡者。`;
    const presenterInfo = `- **演員/講者**: \n${presenters.map(p => `  - ${p.role}: "${p.name}"`).join('\n')}${roleInstructions}\n- **對白指示**: 請為以上指定的「演員/講者」創作對白。JSON中的 'speaker' 欄位必須與提供的名字完全一致。`;
    
    let hookStyleInfo = '';
    const CONFLICTING_POOLS: CardPool[] = ['showdown', 'strategy', 'drama', 'taiwanese', 'meme'];
    if (hookConciseness && !CONFLICTING_POOLS.includes(brief.cardPool)) {
        let strategyInstruction = '';
        switch (hookConciseness) {
            case 'instantKill': 
                strategyInstruction = '「瞬殺鉤 (1-2s)」策略：開頭必須在 1-2 秒內以極致的視覺或聽覺衝擊抓住眼球。使用一句極短的驚人陳述，或一個讓人錯愕的畫面。'; 
                break;
            case 'suspense': 
                strategyInstruction = '「懸念鉤 (3-5s)」策略：開頭需建立一個微型的情境或故事，然後在最高潮處中斷，讓觀眾為了想知道结局而停下來。'; 
                break;
            case 'standard': 
            default: 
                strategyInstruction = '「標準鉤 (2-3s)」策略：開頭用一個與目標受眾切身相關的問題或痛點陳述，引發「這是在說我」の共鳴。'; 
                break;
        }
        hookStyleInfo = `\n  - **Hook 風格指引**: 請嚴格採用 ${strategyInstruction} 為核心內容和 CTA 留出足夠空間。`;
    }

    let emotionText: string | number = styleDirectives.emotion;
    const isViolentOpening = styleDirectives.emotion === 4 && styleDirectives.orality === 3;
    if (isViolentOpening) {
        emotionText = `4 (暴力開場彩蛋已觸發！指令：你必須創造一個極端暴力的開頭來「模式中斷」觀眾。使用以下至少兩種技巧：聽覺衝擊 (巨響/尖銳音效)、視覺衝擊 (極速剪輯/不協調畫面)、認知衝擊 (極具爭議性或違反直覺的陳述)、或打破第四面牆 (直接對觀眾說話)。)`;
    } else if (styleDirectives.emotion === 4) {
        emotionText = `4 (瘋狂模式！指令：你的語氣要像發現了世紀大秘密一樣，迫不及待要分享給觀眾，甚至可以帶點陰謀論的感覺來誇大產品效果。盡情使用驚嘆號、誇張形容詞、重複句式與戲劇性停頓，創造出令人難忘的、極具記憶點的瘋狂腳本！)`;
    }
    const styleInfo = `- **風格指示 (手動)**:\n  - **Hook生成法**: ${styleDirectives.hookMethod}\n  - **CTA生成法**: ${styleDirectives.ctaMethod}\n  - **口語度 (0:書面語, 3:大白話)**: ${styleDirectives.orality}\n  - **情緒 (0:冷靜, 3:熱情, 4:瘋狂)**: ${emotionText}${hookStyleInfo}`;
    
    let visualStyleInfo = '';
    if (visualStyle && visualStyle !== VisualStyle.Automatic) {
        let styleDescription = '';
        switch(visualStyle) {
            case VisualStyle.Bright: styleDescription = '整體風格要求「明亮通透」。請在鏡頭描述中使用大量自然光、白色或淺色背景、乾淨的畫面構圖，營造清新、開闊、無壓力的氛圍。'; break;
            case VisualStyle.Cinematic: styleDescription = '整體風格要求「電影感」。請在鏡頭描述中使用淺景深、戲劇性的光影對比、慢動作或有故事性的運鏡 (如推軌、環繞)，強調質感與情感。'; break;
            case VisualStyle.Muji: styleDescription = '整體風格要求「日系無印風」。請在鏡頭描述中多使用木質元素、低飽和度的色彩、溫暖的自然光線，營造簡約、溫馨、有質感的居家生活感。'; break;
            case VisualStyle.Retro: styleDescription = '整體風格要求「復古懷舊」。請在鏡頭描述中加入暖色調濾鏡、輕微的畫面顆粒感，並可搭配經典的懷舊道具或服裝元素，營造溫暖、有故事性的氛圍。'; break;
            case VisualStyle.Luxury: styleDescription = '整體風格要求「高奢質感」。請在鏡頭描述中多使用暗色調背景、金屬或絲絨等高光澤材質的細節特寫、精緻的慢鏡頭，營造高級、神秘、有品味的感覺。'; break;
        }
        if (styleDescription) {
            visualStyleInfo = `\n- **視覺風格指定 (專業版)**: ${styleDescription} 這將直接影響所有場景的 'shot' 描述。`;
        }
    }

    let cardPoolInfo = '';
    const poolMap: Record<CardPool, string> = { normal: '普通卡池 (標準模型)', rare: '稀有卡池 (深度思考模型)', showdown: '王牌對決卡池 (深度思考模型)', strategy: '王牌策略卡池 (深度思考模型)', legendary: '傳說卡池 (標準模型 + Google 搜尋)', mythical: '神話卡池 (深度思考模型 + Google 搜尋)', drama: '豪門恩怨卡池 (深度思考模型)', taiwanese: '強效台味卡池 (深度思考模型)', meme: '迷因模仿卡池 (深度思考模型)', };
    cardPoolInfo += `\n- **創意卡池**: ${poolMap[brief.cardPool]}`;
    switch(brief.cardPool) {
        case 'rare': cardPoolInfo += '\n- **特別指令**: 請啟用深度思考，發揮更強的創意能力，生成具備 SR 潛力的腳本。'; break;
        case 'showdown': cardPoolInfo += `\n    - **特別指令 (王牌對決模式)**:\n    您已啟用深度思考模型。請嚴格遵循「雷軍演講法」的核心策略來創作腳本。這是一種極具說服力與話題性的風格。\n      - **開頭 (Hook)**: 使用「一句話命題」，直接點出觀眾最在意的痛點或競品的明顯弱點。\n      - **核心 (Body)**:\n        - **強力對比**: 創造清晰的 A/B 對比情境。A 是痛點/競品方案，B 是我們的完美解決方案。\n        - **數據支撐**: 在對比中，至少引用一項具體的數據、規格或看得見的測試結果（例如：耐用度測試、清潔測試）。\n        - **故事包裝**: 如果合適，可以融入一個簡短的、真誠的創辦故事或用戶故事來建立信任感。\n      - **記憶點 (Golden Phrase)**: 創造一句簡短、有力、可重複的「金句」，總結產品的核心價值。\n      - **結尾 (CTA)**: 提供一個明確、可立即執行的行動呼籲，並強調其價值（例如：到店體驗無與倫比的舒適度、私訊領取新品專屬優惠）。`;
            if (brief.duelTactic !== DuelTactic.Automatic) { cardPoolInfo += `\n    - **對決招式指定**: 本次對決的核心證明環節，**必須嚴格採用『${brief.duelTactic}』的形式**。${getDuelTacticInstruction(brief.duelTactic)}\n    - **JSON輸出要求**: 請務必在輸出的 JSON 中，將 'duelTacticUsed' 欄位的值設為 "${brief.duelTactic}"。`; } 
            else { cardPoolInfo += `\n    - **對決招式**: AI 自動判斷。請根據產品特性，從 'duelTacticUsed' 欄位的可用選項中選擇一個最適合的對比方式，但**絕不能選擇 "AI 自動判斷"**。請在 JSON 輸出的 'duelTacticUsed' 欄位中回報你選擇的**具體招式名稱**。`; } break;
        case 'strategy':
            const frameworks = ['SPARK', 'SLAM', 'DART', 'QUIZPOP', 'LOOP']; const chosenFramework = frameworks[Math.floor(Math.random() * frameworks.length)];
            let frameworkInstructions = '';
            switch(chosenFramework) {
                case 'SPARK': frameworkInstructions = `\n    您已啟用深度思考模型，並隨機抽取到「SPARK」強效框架。這是一種為高轉換率設計的快節奏、高衝擊力模型。請嚴格遵循以下結構：\n      - **Stopper (0-2s 急停畫面)**: 開頭第一秒必須有一個「會動、會痛」的視覺衝擊畫面，瞬間抓住眼球。\n      - **Pain flip (3-8s 痛點反轉)**: 用一句話，將使用者常見的抱怨或痛點，巧妙地轉化為一個笑點或強烈的共鳴點。\n      - **Actual proof (9-18s 真實證明)**: 設計一個「一鏡到底」的真實對比測試鏡頭，不靠剪輯，直接展示產品的強大效果。\n      - **Risk-reversal (19-25s 風險反轉)**: 立即提供一個具體、可驗證的承諾來消除顧客的購買疑慮（例如：30天滿意保證、免費試用、到店體驗承諾）。\n      - **Kick (26-30s 強力行動)**: 結尾的行動呼籲 (CTA) 必須同時以「口頭講述」、「畫面字幕」和「置中大字」三種形式強力呈現。`; break;
                case 'SLAM': frameworkInstructions = `\n    您已啟用深度思考模型，並隨機抽取到「SLAM」靜音殺框架。這專為社群「靜音」播放環境設計，強調視覺敘事。請嚴格遵循以下結構：\n      - **Silent-first (0-3s 靜音優先)**: 開頭畫面必須在沒有聲音的情況下也能完整傳達核心衝突或亮點。大量使用視覺元素、誇張表情或清晰的字幕。\n      - **Label pain (4-8s 標籤痛點)**: 用最簡潔的文字（最好是置中大字），直接點名觀眾的痛點。\n      - **Actual demo (9-20s 真實演示)**: 直接展示產品如何解決被標籤的痛點。畫面需清晰、易於理解。\n      - **Motivate (21-30s 激勵行動)**: CTA 不僅是命令，更是激勵。告訴觀眾行動後能獲得的美好改變或體驗。`; break;
                case 'DART': frameworkInstructions = `\n    您已啟用深度思考模型，並隨機抽取到「DART」靶心框架。此框架適用於效果驚豔、有 "Wow" 點的產品，強調開門見山。請嚴格遵循以下結構：\n      - **Demo (0-5s 直接演示)**: 省略所有鋪陳，影片開頭直接展示產品最令人驚訝、最吸睛的核心效果。\n      - **Anchor value (6-12s 價值錨定)**: 在觀眾被效果震撼後，立刻拋出價值主張（如：驚人的價格、前後對比、效率提升數據），將 "Wow" 與具體利益綁定。\n      - **Risk-reversal (13-22s 風險反轉)**: 提供強力的購買保障或承諾，消除觀眾的猶豫。\n      - **Traffic (23-30s 引導流量)**: CTA 的主要目標是引導點擊流量，例如「點擊探索更多顏色」、「官網下單享優惠」。`; break;
                case 'QUIZPOP': frameworkInstructions = `\n    您已啟用深度思考模型，並隨機抽取到「QUIZPOP」互動鉤框架。此框架透過「參與感」來降低廣告感，提升觀眾投入度。請嚴格遵循以下結構：\n      - **Question interaction (0-8s 問題互動)**: 以一個有趣的問題、投票或二選一測驗開頭，引導觀眾思考並參與互動。\n      - **Instant proof (9-20s 即時證明)**: 將產品或其效果作為問題的「答案」或「解決方案」揭曉，給予觀眾恍然大悟的感覺。\n      - **Redeem action (21-30s 兌換行動)**: CTA 被包裝成一種「獎勵」或「兌換」。例如「答對了嗎？點擊領取你的專屬折扣！」、「現在你知道了，點擊解鎖秘密武器」。`; break;
                case 'LOOP': frameworkInstructions = `\n    您已啟用深度思考模型，並隨機抽取到「LOOP」懸念環框架。這是一種高級敘事框架，透過製造懸念來鎖定觀眾注意力。請嚴格遵循以下結構：\n      - **Show the end (0-4s 展示結局)**: 影片開頭直接展示使用產品後的完美結果（如：一塵-bẩn的家、完美妝容），讓觀眾產生「怎麼辦到的？」的好奇心。\n      - **Rewind to solve (5-25s 倒帶解謎)**: 透過「倒帶」或回憶的方式，展示達成完美结局前的困境，然後揭示產品是解決問題的關鍵「英雄」。\n      - **Action (26-30s 揭秘行動)**: CTA 呼應解謎過程，邀請觀眾「點擊探索秘密」、「立即獲取你的解決方案」。`; break;
            }
            cardPoolInfo += `\n    - **特別指令 (王牌策略模式)**:\n    ${frameworkInstructions}\n    - **JSON輸出要求**: 請務必在輸出的 JSON 中，將 'strategyUsed' 欄位的值設為 "${chosenFramework}"。`; break;
        case 'drama': cardPoolInfo += `\n    - **特別指令 (豪門恩怨模式)**:\n    您已啟用深度思考模型。請扮演一位頂級的台灣八點檔編劇。你的任務是將產品置入一場充滿戲劇性衝突的迷你劇中。\n      - **核心元素**: 劇本必須包含至少兩項經典八點檔元素，例如：**身世之謎、失憶、談判破裂、關鍵證物、浮誇的肢體與台詞** (e.g., "你...你怎麼可以這樣對我！")。\n      - **產品角色**: 最關鍵的一點，是將 Brief 中的**產品**設定為**解決這一切狗血衝突的「英雄」或「關鍵證物」**。\n      - **情節反差**: 利用戲劇化的情節，與產品帶來的平靜、解決方案形成巨大反差，以此創造記憶點。`; break;
        case 'taiwanese': cardPoolInfo += `\n    - **特別指令 (強效台味模式)**:\n    您已啟用深度思考模型。請扮演一位深諳社群操作的台灣在地行銷高手。你的任務是創作一個既有濃濃人情味，又具備高轉換潛力的腳本。\n      - **語言要求**: 腳本對白必須使用流暢、自然的**台語口語**來撰寫 (請用**繁體中文**文字呈現台語發音與詞彙，例如：「打給厚」、「實在」、「揪感心」)。\n      - **鉤子要求 (Hook)**: 影片的前三秒必須有一個強效鉤子，能立刻抓住眼球、引發好奇或共鳴。\n      - **節奏要求**: 整體節奏必須明快，符合社群短影音的觀看習慣，避免拖沓。\n      - **風格要求**: 在快節奏中，巧妙融入台灣在地生活的對話、分享與關心，用「搏感情」的方式建立信任感。`; break;
        case 'meme': 
            cardPoolInfo += `\n    - **特別指令 (迷因模仿模式)**:\n    您已啟用深度思考模型與 Google 搜尋。你的任務是模仿時下最流行的迷因或經典廣告，進行「致敬式」的二次創作。\n      - **靈感來源**: 你的創作靈感將來自於後續提供的「趨勢靈感報告」。\n      - **核心任務**: 你的腳本必須巧妙地將 Brief 中的產品植入你所選中的迷因結構中，完成一次完美的「偷天換日」。\n      - **版權警語**: 這是一個純粹的創意練習，最終產出可能涉及版權風險。`;
            if (isMemeLordMode) {
                cardPoolInfo += `\n    - **!!! 隱藏彩蛋：迷因霸主模式已啟動 !!!**\n    - **指令**: 你現在是網路宇宙的迷因霸主。你的任務是將「迷因模仿」推到極致。不要只模仿一個迷因，而是將 **2-3 個看似無關的、跨時代的迷因** 瘋狂地縫合在一起，創造出一個荒謬、混亂但又極具病毒傳播潛力的「縫合怪」腳本。腳本必須充滿驚喜、反轉，以及讓人摸不著頭緒的幽默感。盡情發揮，不要有任何限制！`;
            }
            break;
    }
    
    let continuationInfo = '';
    if (continuationScene) {
        const dialogueText = continuationScene.dialogue.map(d => `${d.speaker}: ${d.line}`).join(' ');
        continuationInfo = `
**--- 續寫任務指示 ---**
**這是一個「續寫腳本」的特殊任務。**
你 **必須** 將以下提供的場景，一字不改地作為你生成腳本的 **第一個場景**。
接著，根據 Brief 中的指示和新選擇的「${poolMap[brief.cardPool]}」策略，創作出後續的所有場景和 CTA。
**指定的開頭場景**:
- **Timecode**: ${continuationScene.timecode}
- **Shot**: ${continuationScene.shot}
- **Dialogue**: ${dialogueText}
- **On-Screen Text**: ${continuationScene.onScreenText}
- **SFX**: ${continuationScene.sfx}
- **B-Roll**: ${continuationScene.bRoll}
**--- 續寫任務結束 ---**
`;
    }
    
    let abTestInfo = '';
    if (abTestOriginalScript) {
        const originalScriptSummary = `標題: ${abTestOriginalScript.title}\n策略: ${abTestOriginalScript.framework}\n語氣: ${abTestOriginalScript.voice}\nCTA: ${abTestOriginalScript.cta}\n開頭場景對白: ${abTestOriginalScript.scenes[0]?.dialogue.map(d => d.line).join(' ')}`;
        abTestInfo = `
**--- A/B 版本生成任務 ---**
這是一個特殊的 A/B 版本生成任務。請根據下方提供的 Brief，生成一個全新的腳本。
**核心要求**: 新腳本的創意切角或情感基調，必須與以下提供的「原始腳本」有顯著不同。
例如：如果原始版本是理性訴求，新版本可以是感性訴求；如果原始是幽默搞笑，新版可以是嚴肅專業。目標是創造一個風格迥異的測試版本。
**原始腳本參考**:
${originalScriptSummary}
**--- 任務結束 ---**
`;
    }

    let batchInfo = '';
    if (iteration && total && total > 1) { batchInfo = `\n- **批次資訊**: 這是 ${total} 個腳本生成任務中的第 ${iteration} 個。請務必確保這個版本的創意與其他版本完全不同，尤其是開頭的 Hook。`; }
    
    let chargedInfo = '';
    if (isCharged) {
        chargedInfo = `\n\n**--- SSR 蓄力召喚 ---**\n這是一次使用者蓄力後發動的「SSR 級召喚」！請務必動用你最強大的創意能量與最頂級的策略思維，生成一張具備 SSR 潛力的腳本！腳本必須具備極高的記憶點、強烈的情感共鳴、或意想不到的驚人反轉。`;
    }
    
    return `
${continuationInfo}${abTestInfo}${chargedInfo}
**--- SCRIPT BRIEF ---**

**1. 核心資訊**
- **品牌名稱**: ${brandName || '未提供，請自行判斷是否需要'}
${mainInfo}
${featuredProductInfo}

**2. 規格要求**
${specInfo}${batchInfo}

**3. 演員與呈現**
${presenterInfo}

**4. 風格與創意**
${styleInfo}${visualStyleInfo}
${cardPoolInfo}

**5. 創意策略指導**
- **任務**: 請為腳本選擇一種獨特的創意策略/框架，並從以下列表中選擇一個最匹配的「腳本語氣 (voice)」。
- **可選語氣**: ${availableVoices.join('、')}
- **要求**: 確保你生成的腳本在策略、語氣和內容上都有明顯區別。不要重複使用相同的想法。

**--- END BRIEF ---**

請開始根據以上 Brief 進行創作。
    `;
}

export const generateSingleScript = async (
  brief: Brief,
  iteration: number, 
  total: number,
  onProgress: ProgressCallback,
  continuationScene?: Scene,
  hookConciseness?: HookConciseness,
  isCharged?: boolean,
  abTestOriginalScript?: Script,
): Promise<Script> => {
    onProgress({ statusMessage: '解構創意簡報...' });
    
    const { cardPool, seed } = brief;
    
    const aiShouldUseSearch = () => {
        return cardPool === 'legendary' || cardPool === 'mythical' || cardPool === 'meme';
    };

    const isPro = cardPool === 'rare' || cardPool === 'mythical' || cardPool === 'showdown' || cardPool === 'strategy' || cardPool === 'drama' || cardPool === 'taiwanese' || cardPool === 'meme';
    
    // NEW V3 SYSTEM INSTRUCTION
    const systemInstruction = `你是一位擁有雙重人格的頂級 AI 創意專家，在台灣為家具品牌服務。你的任務是根據一份「Brief」，在一次呼叫中完成兩項工作：
    
    **第一人格：頂級廣告腳本創意總監**
    - **職責**: 專門撰寫高轉換率的 Facebook/Instagram 影片廣告腳本。你的創作必須充滿創意、策略性，並使用台灣在地化的繁體中文。
    - **規則**:
      1. 嚴格遵循 Brief 中的所有指示，特別是「創意卡池」和「投放策略」的策略要求。
      2. 根據 Brief 中的「演員/講者」設定，生成對白或獨白。
      3. 'dialogue' 陣列中 'speaker' 欄位的值，必須與 Brief 中提供的演員名字完全一致。
      4. 台詞 ('line') 中絕不能包含任何非語音的註釋，如 \`(快節奏)\` 或 \`(充滿信任感)\`。
      5. 如果這是一個「續寫任務」，你必須將指定的開頭場景原封不動地放在腳本的最前面。
    
    **第二人格：世界頂級、眼光銳利的廣告創意總監**
    - **職責**: 在完成腳本創作後，你必須**立刻**切換到這個人格，對你**剛剛**生成的腳本進行一次專業、深入、客觀的批判性審查。
    - **審查維度**:
      1.  **hookStrength (開場鉤子強度)**: 前 3 秒是否有效？
      2.  **strategyExecution (策略執行度)**: 是否完美執行了 Brief 中的「創意卡池」策略？(此項最重要)
      3.  **clarity (訊息清晰度)**: 賣點是否清晰？
      4.  **emotionalResonance (情感共鳴度)**: 是否能觸動目標受眾？
      5.  **ctaStrength (CTA強度)**: 行動呼籲是否有力？
      6.  **brandConsistency (品牌一致性)**: 語氣風格是否符合品牌定位？
    - **評分要求**:
      1.  為上述 6 個維度各給出 0-100 的分數及簡潔的評分理由 ('reason')。
      2.  給出加權後的綜合評分 ('overallScore')。
      3.  根據綜合評分定級 (A: 90+, B: 80-89, C: 70-79, D: <70) 和稀有度 (A=SSR, B=SR, C=R, D=N)。
      4.  在 'critique' 中撰寫總體評論。
      5.  在 'topFixes' 中提供 2-3 條可執行的修改建議。

    **最終輸出**:
    你的最終輸出**必須**是一個單一的 JSON 物件，該物件包含 'script' 和 'scoreCard' 兩個根層級的鍵，並嚴格遵守指定的 JSON Schema 格式。不要有任何額外的文字或解釋。`;

    const modelName = 'gemini-2.5-flash';

    let genResult: any;
    let groundingSources: { title: string; uri: string }[] | undefined = undefined;
    const singleScriptPrompt = briefToPrompt(brief, iteration, total, continuationScene, hookConciseness, isCharged, abTestOriginalScript);
    const usedSeed = seed ?? Math.floor(Math.random() * 1000000);

    if (aiShouldUseSearch()) {
        onProgress({ statusMessage: '趨勢分析員出動... 正在掃描網路熱點...' });
        let inspirationPrompt = '';
        const subject = brief.scriptType === 'product' ? `產品 "${brief.productName}"` : `門市 "${brief.storeName}"`;
        inspirationPrompt = `你是一位頂尖的社群趨勢分析師與網路文化專家。你的任務是使用 Google 搜尋，為一個廣告活動尋找高品質、高多樣性的靈感。\n\n**廣告主題**: 關於 ${subject}\n**主題特色**: ${brief.scriptType === 'product' ? brief.productFeatures : brief.storeFeatures}\n\n**你的任務**:\n請為這個主題，在台灣的網路社群 (Dcard, PTT, YouTube, Threads, Instagram) 上，尋找 3 個**風格迥異、可被二次創作**的靈感。\n靈感類型可以是：近期爆紅迷因、經典廣告橋段、社群挑戰/格式、或任何高話題性的網路熱点。\n\n**輸出要求**:\n1.  **多樣性與時效性**: 提供的 3 個靈感必須在類型上有所區別，並排除過時的建議。\n2.  **可操作性**: 為每個靈感附上一句「這個熱点可以如何與我們的產品結合」的簡短理由。\n3.  **格式**: 以簡潔的條列式報告回傳。\n\n請直接開始回報，不要有任何開場白。`;
        
        const inspirationResult = await getNetworkedInspiration(inspirationPrompt);
        const inspirationText = inspirationResult.inspirationText;
        groundingSources = inspirationResult.groundingSources;

        onProgress({ statusMessage: '建立神經連結... AI 正在高速撰寫中...' });

        const creativeDirectorPrompt = `你是一位擁有雙重人格的 AI 創意專家。你的任務是根據一份 Brief 和一份趨勢靈感報告，來創作一個完整的廣告腳本並為其評分。\n\n**--- SCRIPT BRIEF ---**\n${singleScriptPrompt} \n\n**--- 趨勢靈感報告 (由趨勢分析員提供) ---**\n${inspirationText}\n**--- END REPORT ---**\n\n**你的核心任務**:\n請仔細閱讀 Brief 中的指令。如果 Brief 指示你扮演「首席創意總監」(AI 自動抽卡模式)，請從「趨勢靈感報告」和你的策略庫中選擇最適合的靈感與策略來創作。如果 Brief 指定了具體的卡池 (例如 'meme' 或 'legendary')，請優先使用報告中的靈感來執行該策略。\n你的產出必須是一個包含 'script' 和 'scoreCard' 的單一 JSON 物件，並嚴格遵守指定的 Schema 格式。`;
        const creativeApiCall = () => ai.models.generateContent({ model: modelName, contents: creativeDirectorPrompt, config: { systemInstruction, responseMimeType: "application/json", responseSchema: scriptAndScoreCardSchema, seed: usedSeed } });
        const response: GenerateContentResponse = await withRetry(creativeApiCall);
        const responseText = response.text;
        if (!responseText) {
            throw new Error("AI response did not contain any text content.");
        }
        genResult = JSON.parse(responseText);

    } else {
        onProgress({ statusMessage: '建立神經連結... AI 正在高速撰寫中...' });
        const config: any = { systemInstruction, responseMimeType: "application/json", responseSchema: scriptAndScoreCardSchema, seed: usedSeed };
        if (!isPro) { config.thinkingConfig = { thinkingBudget: 0 }; }
        const apiCall = () => ai.models.generateContent({ model: modelName, contents: singleScriptPrompt, config: config, });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const responseText = response.text;
        if (!responseText) {
            throw new Error("AI response did not contain any text content.");
        }
        genResult = JSON.parse(responseText);
    }

    onProgress({ statusMessage: '靈感塑形中... 正在進行總監複審...' });

    if (!genResult || typeof genResult !== 'object' || !genResult.script || !genResult.scoreCard) { 
        throw new Error("AI 返回了無效的資料結構，缺少 'script' 或 'scoreCard'。"); 
    }

    const { script: genScript, scoreCard } = genResult;

    const validatedScenes = (Array.isArray(genScript.scenes) ? genScript.scenes : []).map((s: any): Scene | null => {
        if (!s || typeof s !== 'object') return null;
        const dialogue = (Array.isArray(s.dialogue) ? s.dialogue : []).map((d: any) => ({ speaker: d?.speaker || brief.presenters[0]?.name || '旁白', line: d?.line || '' })).filter(d => d.speaker && typeof d.line === 'string');
        if (dialogue.length === 0 && typeof s.vo === 'string' && s.vo.trim()) { dialogue.push({ speaker: brief.presenters[0]?.name || '旁白', line: s.vo }); }
        return { id: uuidv4(), timecode: s.timecode || '0-4s', shot: s.shot || '未提供', dialogue: dialogue, onScreenText: s.onScreenText || '', sfx: s.sfx || '未提供', bRoll: s.bRoll || '未提供', };
    }).filter((s): s is Scene => s !== null);
    
    // If it was a continuation, ensure the original scene ID is preserved
    if (continuationScene && validatedScenes.length > 0) {
        validatedScenes[0].id = continuationScene.id;
    }

    const finalCardPool: CardPool = brief.cardPool;
    const scriptId = uuidv4();
    
    const partialScriptForAnalysis: Omit<Script, 'productionWarnings'> = {
        id: scriptId,
        brief: brief,
        presenters: brief.presenters,
        cardPool: finalCardPool,
        framework: genScript.framework || "AI-Generated",
        voice: genScript.voice || availableVoices[2],
        duration: genScript.duration || brief.duration,
        title: genScript.title || `${brief.productName || brief.storeName} Script`,
        scenes: validatedScenes,
        cta: genScript.cta || "點擊下方連結了解更多！",
        isCompliant: null,
        isFavorited: false,
        keywordAnalysis: genScript.keywordAnalysis || { core: [], context: [], benefit: [], proof: [] },
        strategyFramework: genScript.strategyUsed,
        duelTacticUsed: genScript.duelTacticUsed,
        copyrightNotice: finalCardPool === 'meme' ? '此腳本為模仿創意，請注意版權風險並諮詢法務意見。' : undefined,
        scoreCard: { ...scoreCard, scriptId },
        createdAt: Date.now() - Math.floor(Math.random() * 1000),
        groundingSources,
        seed: usedSeed,
    };

    onProgress({ statusMessage: '製片審查中...' });
    const productionWarnings = await checkProductionFeasibility(partialScriptForAnalysis as Script);

    onProgress({ statusMessage: '召喚完成!' });

    return {
        ...partialScriptForAnalysis,
        productionWarnings,
    };
};

export const generateShorterScriptVersion = async (script: Script, targetDuration: AdDuration): Promise<Scene[]> => {
    const systemInstruction = `You are an expert AI video editor specializing in creating shorter, punchier versions of ad scripts for A/B testing. Your task is to shorten a script to a specific target duration while preserving its core message and structure.`;
    const prompt = `**Task**: Shorten the following script from its original duration of **${script.duration}** to a new target duration of **${targetDuration}**.

**Core Shortening Rules**:
1.  **Preserve Structure**: The shortened script MUST maintain the original's core structure (Hook -> Value Proposition / Pain Point -> CTA). The essence of each scene should be kept.
2.  **Condense Language**:
    - Prioritize verbs and strong nouns.
    - Remove filler words, redundant phrases, and adjectives that don't add critical value.
    - Shorten sentences.
3.  **Merge Scenes (If Necessary)**: If simple text condensation is not enough, you may merge two adjacent scenes into one, combining their key messages.
4.  **Adhere to Timecodes**: The new timecodes must logically fit within the new, shorter duration.

**Original Script**:
${JSON.stringify(script.scenes)}

**Your Output**:
Your output MUST be a valid JSON array of Scene objects, conforming to the provided schema. Do not include any other text or explanations.
`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            scenes: {
                type: Type.ARRAY,
                items: sceneSchema
            }
        },
        required: ["scenes"]
    };

    try {
        const apiCall = () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction, responseMimeType: "application/json", responseSchema }
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const responseText = response.text;
        if (!responseText) {
            throw new Error("AI did not return any text content for script shortening.");
        }
        const result = JSON.parse(responseText);
        if (!result.scenes || !Array.isArray(result.scenes)) {
            throw new Error("AI returned an invalid scene structure.");
        }
        // Add back IDs to the scenes
        return result.scenes.map((s: Scene) => ({ ...s, id: uuidv4() }));
    } catch (error) {
        console.error(`Error generating shorter script version for ${targetDuration}:`, error);
        throw new Error(`AI 腳本裁切 (${targetDuration}) 失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
};

export const generateActorPortrait = async (definition: ActorDefinition): Promise<string> => {
    // Step 1: Use a text model to generate a high-quality "mega-prompt" for the image model.
    const systemInstruction = `You are a world-class Character Concept Artist and Photography Director's Assistant. Your task is to take a set of character attributes (an ActorDefinition) and translate it into a detailed, evocative, and technically precise "Photographer's Brief" prompt for an advanced text-to-image AI like Imagen 4. Your output must be a single JSON object with one key: "imagePrompt". Do not add any other text or explanations.`;

    const promptGenerationPrompt = `
**Objective:** Create a master prompt for generating a photorealistic, 9:16 portrait.

**Actor Definition:**
${JSON.stringify(definition, null, 2)}

**Your Task:**
1.  **Synthesize & Harmonize:** Analyze all attributes. If there are conflicting concepts (e.g., 'punk' clothing with 'gentle' aura), creatively merge them into a cohesive vision (e.g., 'a person with a gentle face wearing a soft, high-fashion punk-inspired outfit').
2.  **Elaborate with Detail:** Expand on the provided tags. Instead of just "street style," describe *what kind* of street style. Add details about textures, materials, and specific items.
3.  **Construct the "Mega-Prompt":** Create a single, powerful prompt string in English. It should include:
    *   A core description of the person, synthesizing all their physical and stylistic traits (e.g., "ultra-photorealistic 9:16 portrait photo of a 25-year-old Taiwanese woman with an androgynous-leaning feminine appearance...").
    *   A description of the setting and lighting (default to a clean, professional studio portrait with a neutral gray background unless the style implies otherwise).
    *   Technical photographic details (e.g., 'masterpiece, best quality, shot on Canon EOS R5 with a 85mm f/1.2 L lens, shot at F1.2, ISO 100').
    *   Crucial negative prompts to avoid common AI pitfalls (e.g., '(worst quality, low quality, bad art:1.4), (watermark, signature, text:1.2), (3d, cgi, render, plastic, doll, uncanny valley:1.3)').
4.  **Format:** Return only a JSON object following the schema.
`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            imagePrompt: { type: Type.STRING, description: "The final, detailed prompt for the image generation model." }
        },
        required: ["imagePrompt"]
    };

    const promptGenApiCall = () => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptGenerationPrompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });

    let finalImagePrompt: string;
    try {
        const response: GenerateContentResponse = await withRetry(promptGenApiCall);
        const responseText = response.text;
        if (!responseText) {
            throw new Error("AI prompt generator returned no text.");
        }
        const parsedResult = JSON.parse(responseText);
        if (!parsedResult.imagePrompt) {
            throw new Error("AI prompt generator returned an invalid structure.");
        }
        finalImagePrompt = parsedResult.imagePrompt;
    } catch (error) {
         console.error("Error generating detailed image prompt:", error);
        throw new Error(`AI 詠唱者設定失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }

    // Step 2: Use the generated mega-prompt to generate the image.
    const imageGenApiCall = () => ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: finalImagePrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '9:16',
        },
    });
    try {
        const response: GenerateImagesResponse = await withRetry(imageGenApiCall);
        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("AI did not return an actor image.");
        }
        return response.generatedImages[0].image.imageBytes;
    } catch (error) {
        console.error("Error generating actor image:", error);
        throw new Error(`AI 演員生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
}

export const generateSingleKeyframe = async (
    actorImage: { data: string; mimeType: string; }, // base64 data
    sceneDescription: string,
    frameType: 'start' | 'end',
    previousFrame?: { data: string; mimeType: string; }
): Promise<string> => {
    let prompt: string;
    const parts: any[] = [{ inlineData: { data: actorImage.data, mimeType: actorImage.mimeType } }];

    if (previousFrame && frameType === 'start') {
        parts.push({ inlineData: { data: previousFrame.data, mimeType: previousFrame.mimeType } });
        prompt = `You are a film director. Create a photorealistic 9:16 cinematic shot.
**CONTEXT:** You are creating a continuous shot. The first image provided is the ACTOR for reference. The second image provided is the FINAL FRAME of the PREVIOUS scene.
**YOUR TASK:** Generate the VERY FIRST FRAME of the NEXT scene, which is described as: "${sceneDescription}".
The action must flow seamlessly from the provided previous frame. Maintain the actor's appearance, the environment, and lighting for a smooth, continuous transition.
**ABSOLUTE RULES:** Single clean photographic shot. 9:16 aspect ratio. NO text, logos, graphics, borders.`;
    } else {
        prompt = `You are a film director. Create a photorealistic 9:16 cinematic shot.
**CONTEXT:** You are creating a keyframe for a scene. The provided image is the ACTOR for reference.
**YOUR TASK:** Generate the **${frameType === 'start' ? 'very beginning' : 'concluding'} moment** of a scene described as: "${sceneDescription}".
Maintain the actor's appearance. You must imagine the product and setting based on the text description.
**ABSOLUTE RULES:** Single clean photographic shot. 9:16 aspect ratio. NO text, logos, graphics, borders.`;
    }
    
    parts.push({ text: prompt });

    const contents = { parts };

    const apiCall = () => ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents,
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    try {
        const response: GenerateContentResponse = await withRetry(apiCall);
        const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
        if (!imagePart || !imagePart.inlineData) {
            throw new Error("AI did not return an image. It might be due to safety policies or model limitations.");
        }
        return imagePart.inlineData.data;
    } catch (error) {
        console.error("Error generating keyframe image:", error);
        throw new Error(`關鍵影格生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
};

export const rewriteHook = async (script: Script): Promise<Scene> => { /* ... */ return {} as Scene };

const generatedHookSchema = {
    type: Type.OBJECT,
    properties: {
        vo: { type: Type.STRING, description: "開頭的旁白或對白" },
        onScreenText: { type: Type.STRING, description: "畫面上的文字" },
    },
    required: ["vo", "onScreenText"]
};

export const generateHooks = async (
    source: Brief | Script,
    options: { conciseness?: HookConciseness, method?: HookMethod, count?: number } = {}
): Promise<GeneratedHook[]> => {
    let prompt: string;
    const { conciseness, method, count = 5 } = options;

    if ('scenes' in source) {
        // It's a Script object, for rewriting/refining a hook
        const script = source as Script;
        const originalHook = script.scenes[0];
        const originalVo = originalHook.dialogue.map(d => d.line).join('\n');
        const originalText = originalHook.onScreenText;
        const methodToUse = method || HookMethod.Automatic;

        const methodInstruction = (methodToUse && methodToUse !== HookMethod.Automatic)
            ? `請嚴格使用「${methodToUse}」的策略來重寫這個 Hook，生成 ${count} 個新版本。`
            : `請用多種不同風格重寫這個 Hook，生成 ${count} 個新版本。`;

        prompt = `你是一位頂尖的廣告文案專家，專門優化高點擊率的短影音開頭 (Hook)。

**任務**: 根據以下原始 Hook，為我創作出 ${count} 組更具吸引力的開頭版本。

**原始 Hook 資訊**:
- 腳本標題: ${script.title}
- 原始旁白/對白: ${originalVo}
- 原始畫面文字: ${originalText}

**優化指令**:
${methodInstruction}

**要求**:
1. **包含元素**: 每組新 Hook 都必須包含「旁白/對白 (vo)」和「畫面文字 (onScreenText)」。
2. **輸出格式**: 你的回覆必須是嚴格遵守指定 Schema 的 JSON 陣列，不包含任何額外文字。`;

    } else {
        // It's a Brief object, for initial hook generation
        const brief = source as Brief;
        const { scriptType, productName, productFeatures, storeName, storeFeatures } = brief;
        let mainInfo = '';
        if (scriptType === 'product') {
            mainInfo = `主題是為產品「${productName}」製作廣告，其特色為：\n${productFeatures}`;
        } else {
            mainInfo = `主題是為門市「${storeName}」製作廣告，其特色為：\n${storeFeatures}`;
        }
        
        let strategyInstruction = '';
        if (method && method !== HookMethod.Automatic) {
            strategyInstruction = `4. **策略**: 請嚴格採用「${method}」的策略來創作。`;
        } else if (conciseness) {
             switch (conciseness) {
                case 'instantKill':
                    strategyInstruction = '4. **策略與長度**: 請採用「瞬殺鉤 (1-2s)」策略。每個 Hook 必須在 1-2 秒內以極致的視覺或聽覺衝擊抓住眼球。使用一句極短的驚人陳述，或一個讓人錯愕的畫面。';
                    break;
                case 'suspense':
                    strategyInstruction = '4. **策略與長度**: 請採用「懸念鉤 (3-5s)」策略。每個 Hook 需建立一個微型的情境或故事，然後在最高潮處中斷，讓觀眾為了想知道结局而停下來。';
                    break;
                case 'standard':
                default:
                    strategyInstruction = '4. **策略與長度**: 請採用「標準鉤 (2-3s)」策略。每個 Hook 需用一個與目標受眾切身相關的問題或痛點陳述，引發「這是在說我」的共鳴。';
                    break;
            }
        }

        prompt = `你是一位頂尖的廣告文案專家，專門創造高點擊率的短影音開頭 (Hook)。
    
**任務**: 根據以下簡報，為我創作出 ${count} 組風格完全不同、極具吸引力的開頭。

**簡報**:
${mainInfo}

**要求**:
1.  **多樣性**: 每一組 Hook 的切入點和風格都必須有明顯區別 (例如：一個是提問，一個是數據，一個是情境劇)。
2.  **包含元素**: 每組 Hook 都必須包含「旁白/對白 (vo)」和「畫面文字 (onScreenText)」。
3.  **輸出格式**: 你的回覆必須是嚴格遵守指定 Schema 的 JSON 陣列，不包含任何額外文字。
${strategyInstruction}`;
    }

    try {
        const apiCall = () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: generatedHookSchema
                },
                thinkingConfig: { thinkingBudget: 0 } // Speed is key here
            }
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const responseText = response.text;
        if (!responseText) {
            throw new Error("AI did not return any text content for hooks.");
        }
        const result = JSON.parse(responseText);
        
        if (!Array.isArray(result) || result.length === 0) {
            throw new Error("AI 未能生成任何有效的 Hook。");
        }
        
        return result as GeneratedHook[];
    } catch (error) {
        console.error("Error generating hooks:", error);
        throw new Error(`AI Hook 鍛造失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
    }
};

const getSceneDescriptionForAnalysis = (scene: Scene): string => {
    return `Dialogue: ${scene.dialogue.map(d => `${d.speaker} says '${d.line}'`).join('. ')}. Visuals: ${scene.shot}. On-screen text: ${scene.onScreenText}. B-Roll: ${scene.bRoll}.`;
};

export const analyzeSceneTransitions = async (scenes: Scene[]): Promise<('CONTINUOUS' | 'CUT')[]> => {
    if (scenes.length <= 1) {
        return [];
    }
    const sceneDescriptions = scenes.map((s, i) => `Scene ${i + 1} (${s.timecode}): ${getSceneDescriptionForAnalysis(s)}`).join('\n\n');
    const prompt = `You are a professional film editor AI. Your task is to analyze the transitions between a series of scenes in an ad script. For each transition, determine if it's a "CONTINUOUS" action or a "CUT" to a new context.

- **CONTINUOUS**: The action flows directly from the end of one scene to the beginning of the next. The character, location, and time are the same. Example: A person stands up from a sofa (Scene 1) and walks towards the window (Scene 2).
- **CUT**: There is a distinct break in time, location, or subject. Example: A close-up of a product (Scene 1) cuts to a user smiling (Scene 2).

Analyze the following scenes and provide your analysis as a JSON array of strings, with one entry for each transition. There are ${scenes.length - 1} transitions.

**Scenes:**
${sceneDescriptions}

Your output MUST be a JSON array of strings with exactly ${scenes.length - 1} elements, where each element is either "CONTINUOUS" or "CUT". Do not include any other text.`;

    const apiCall = () => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING, enum: ['CONTINUOUS', 'CUT'] }
            }
        }
    });
    const response: GenerateContentResponse = await withRetry(apiCall);
    const responseText = response.text;
    if (!responseText) {
        throw new Error('AI transition analysis returned no text.');
    }
    const result = JSON.parse(responseText);
    if (!Array.isArray(result) || result.length !== scenes.length - 1) {
        throw new Error('AI transition analysis returned an invalid format.');
    }
    return result as ('CONTINUOUS' | 'CUT')[];
};


export const rewriteCta = async (script: Script): Promise<string> => { /* ... */ return "" };
export const generateCtaSuggestions = async (script: Script, method: CtaMethod): Promise<string[]> => { /* ... */ return [] };
export const refineSceneText = async (scene: Scene, script: Script, action: SceneRefinementAction): Promise<DialogueLine[]> => {
    const actionMap = {
        condense: '精簡並濃縮',
        expand: '擴寫並增加細節',
        polish: '潤飾並優化流暢度'
    };
    const sceneText = scene.dialogue.map(d => `${d.speaker}: ${d.line}`).join('\n');
    const prompt = `你是一位頂級的廣告腳本醫生。你的任務是根據指定的動作，修改一場戲的對白。\n\n**原始對白**:\n---\n${sceneText}\n---\n\n**修改指令**: 請為這段對白進行「${actionMap[action]}」。\n\n**重要規則**:\n1. 保持原始的講者 (speaker) 結構。\n2. 你的輸出必須是 JSON 格式的對白陣列，包含 'speaker' 和 'line' 兩個欄位。\n3. 不要添加任何額外的解釋或開場白。\n\n**修改後的對白 (JSON)**:`;
    
    try {
        const apiCall = () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        dialogue: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    speaker: { type: Type.STRING },
                                    line: { type: Type.STRING }
                                },
                                required: ['speaker', 'line']
                            }
                        }
                    },
                    required: ['dialogue']
                }
            }
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const responseText = response.text;
        if (!responseText) {
            throw new Error("AI did not return any text content for scene refinement.");
        }
        const result = JSON.parse(responseText);
        return result.dialogue || [];
    } catch (error) {
        console.error(`Error refining scene text for action "${action}":`, error);
        throw new Error(`AI 場景優化 (${actionMap[action]}) 失敗。`);
    }
};

export const addDirectorNotes = async (scenes: Scene[]): Promise<Scene[]> => {
    const systemInstruction = `You are an experienced film director AI. Your task is to add concise, actionable performance notes (in Traditional Chinese) to each line of dialogue in a script. The note should guide the actor on tone, emotion, and physical action. Your output must be a JSON object containing an array of scenes in the exact same structure, but with the \`directorNote\` field populated for each dialogue line. Do not modify any other field.`;
    const prompt = `Please add a \`directorNote\` to each dialogue object in the following scenes:\n\n${JSON.stringify(scenes.map(s => ({...s, dialogue: s.dialogue.map(({directorNote, ...rest}) => rest)})))}`; // Remove existing notes before sending

    const directorNoteDialogueSchema = {
      type: Type.OBJECT,
      properties: {
        speaker: { type: Type.STRING },
        line: { type: Type.STRING },
        directorNote: { type: Type.STRING, description: "給演員的表演提示(語氣、情緒、動作)" },
      },
      required: ["speaker", "line", "directorNote"],
    };

    const scenePropertiesWithNote = {
        timecode: { type: Type.STRING },
        shot: { type: Type.STRING },
        dialogue: { type: Type.ARRAY, items: directorNoteDialogueSchema },
        onScreenText: { type: Type.STRING },
        sfx: { type: Type.STRING },
        bRoll: { type: Type.STRING },
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: scenePropertiesWithNote,
            required: ["timecode", "shot", "dialogue", "onScreenText", "sfx", "bRoll"]
          }
        }
      },
      required: ["scenes"]
    };

    try {
        const apiCall = () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction, responseMimeType: "application/json", responseSchema }
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const responseText = response.text;
         if (!responseText) {
            throw new Error("AI did not return any text content for director notes.");
        }
        const result = JSON.parse(responseText);
        if (!result.scenes) throw new Error("AI did not return scenes with director notes.");
        
        // Merge notes back into original scenes to preserve IDs
        return scenes.map((originalScene, index) => {
            const aiScene = result.scenes[index];
            if (aiScene && originalScene.id === scenes[index].id) { // Basic check
                return {
                    ...originalScene,
                    dialogue: originalScene.dialogue.map((originalDialogue, dIndex) => ({
                        ...originalDialogue,
                        directorNote: aiScene.dialogue?.[dIndex]?.directorNote || '...'
                    }))
                };
            }
            return originalScene;
        });

    } catch (error) {
        console.error("Error adding director notes:", error);
        throw new Error(`AI 導演筆記生成失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
    }
};


export const checkCompliance = async (script: Script): Promise<ComplianceResult> => {
    const systemInstruction = `你是一位專業的廣告合規審查 AI，專精於台灣地區的 Facebook、Instagram 和 YouTube 廣告規範。你的任務是審查一份廣告腳本，找出任何可能違反廣告法規或平台政策的內容。

審查重點包括但不限於：
1.  **誇大不實的宣稱**：避免使用「最」、「第一」、「100%」、「保證」等絕對性詞語，除非有強力的第三方證據支持。
2.  **醫療效能宣稱**：非醫療器材或藥品，不得宣稱具有治療、預防或診斷疾病的效果。例如「治癒」、「預防掉髮」。
3.  **誤導性前後對比**：使用前後對比時，應註明「效果因人而異」等警語。
4.  **價格標示不清楚**：折扣、優惠價需清楚標示規則。
5.  **侵犯版權**：提及或暗示使用未經授權的音樂、影視角色或名人肖像。
6.  **敏感內容**：避免歧視、暴力、或過度裸露的內容。

你的任務是回傳一個 JSON 物件，其中包含：
- 'isCompliant' (boolean): 腳本是否完全合規。
- 'issues' (array): 所有發現的違規問題。每個問題都必須包含違規文本、原因和修改建議。

如果沒有發現任何問題，'issues' 陣列應為空，且 'isCompliant' 應為 true。`;

    const scriptText = script.scenes.map((scene, index) => {
        const dialogue = scene.dialogue.map(d => `${d.speaker}: ${d.line}`).join('\n');
        return `
---
場景 ${index + 1} (ID: ${scene.id})
Timecode: ${scene.timecode}
鏡頭描述: ${scene.shot}
對白:
${dialogue}
畫面文字: ${scene.onScreenText}
---
        `;
    }).join('');

    const prompt = `請根據您的專業知識，審查以下廣告腳本，並以指定的 JSON 格式回報結果。

**腳本內容**:
${scriptText}

**CTA**: ${script.cta}
`;

    const issueSchema = {
        type: Type.OBJECT,
        properties: {
            sceneId: { type: Type.STRING, description: "問題所在的場景 ID" },
            text: { type: Type.STRING, description: "腳本中具體有問題的文字" },
            reason: { type: Type.STRING, description: "違反了哪條規則，為什麼有問題" },
            suggestion: { type: Type.STRING, description: "如何修改以符合規範的具體建議" },
        },
        required: ["sceneId", "text", "reason", "suggestion"],
    };

    const complianceSchema = {
        type: Type.OBJECT,
        properties: {
            isCompliant: { type: Type.BOOLEAN, description: "腳本是否整體合規" },
            issues: {
                type: Type.ARRAY,
                description: "所有發現的合規問題列表",
                items: issueSchema,
            },
        },
        required: ["isCompliant", "issues"],
    };

    try {
        const apiCall = () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: complianceSchema,
            }
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const responseText = response.text;
        if (!responseText) {
            throw new Error("AI 合規檢查未返回任何內容。");
        }
        const result = JSON.parse(responseText);

        if (typeof result.isCompliant !== 'boolean' || !Array.isArray(result.issues)) {
             throw new Error("AI 合規檢查返回了無效的資料結構。");
        }
        
        const issuesWithIds: ComplianceIssue[] = result.issues.map((issue: any) => ({
            ...issue,
            id: uuidv4(),
        }));

        return {
            isCompliant: result.isCompliant,
            issues: issuesWithIds,
        };

    } catch (error) {
        console.error("Error during compliance check:", error);
        return {
            isCompliant: false,
            issues: [{
                id: uuidv4(),
                sceneId: script.scenes[0]?.id || 'general',
                text: "系統錯誤",
                reason: "無法完成 AI 合規檢查。",
                suggestion: `請稍後再試。錯誤訊息: ${error instanceof Error ? error.message : '未知錯誤'}`,
            }]
        };
    }
};

export const checkProductionFeasibility = async (script: Script): Promise<string[] | undefined> => {
    const systemInstruction = `You are an experienced AI line producer. Your task is to review a script and flag potential production challenges based on feasibility and budget. Be concise and practical in Traditional Chinese.

Your analysis should focus on:
- **Long single shots**: Flag any single 'shot' description that implies a continuous take longer than 5 seconds which could be difficult to execute.
- **Hard-to-source props**: Identify props that are rare, expensive, or require special handling (e.g., 'a vintage 1920s gramophone', 'a live falcon').
- **Location conflicts or high cost**: Note if scenes require locations that are difficult to secure or expensive (e.g., 'an airport runway', 'the top of Taipei 101').

Your output must be a JSON object with a single key "warnings", which is an array of strings. Each string is a specific, actionable warning. If there are no issues, return an empty array.`;

    const scriptText = script.scenes.map((scene, index) => `Scene ${index + 1} (${scene.timecode}): ${scene.shot}`).join('\n');

    const prompt = `Review the following script scenes for production feasibility:\n\n${scriptText}\n\nReturn your warnings in the specified JSON format.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            warnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
        required: ["warnings"]
    };

    try {
        const apiCall = () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction, responseMimeType: "application/json", responseSchema }
        });
        // FIX: Add explicit type annotation to resolve type inference issue.
        const response: GenerateContentResponse = await withRetry(apiCall, 3, 1000); // Fewer retries for this secondary check
        const responseText = response.text;
        if (!responseText) return undefined;

        const result = JSON.parse(responseText);
        if (result.warnings && Array.isArray(result.warnings) && result.warnings.length > 0) {
            return result.warnings;
        }
        return undefined;
    } catch (error) {
        console.warn("Production feasibility check failed:", error);
        return undefined; // Non-critical, so we don't throw
    }
};


export const condenseText = async (options: CondenseOptions): Promise<string> => { /* ... */ return "" };
export const getKeywordSuggestions = async (audienceIntent: AudienceIntent): Promise<KeywordSuggestions> => { /* ... */ return {} as KeywordSuggestions };
export const extractSellingPoints = async (featuresText: string): Promise<string> => {
    if (!featuresText.trim()) {
        return featuresText;
    }
    const prompt = `你是一位頂級的廣告文案專家與行銷策略師。請將以下提供的原始產品/門市特色，提煉成 3-5 個最核心、最吸引消費者的「賣點」。

**任務要求**:
1.  **提煉核心**: 找出真正能打動人心的關鍵優勢，而不是單純的規格條列。
2.  **轉化語言**: 將技術性或平鋪直敘的描述，轉化為消費者能立即感受到的「利益點」。
3.  **保持格式**: 以簡潔的條列式 (bullet points) 格式回傳。
4.  **直接產出**: 不要任何開場白或結語，直接提供條列式結果。

**原始特色**:
${featuresText}

**提煉後的賣點**:`;
    
    try {
        const apiCall = () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 } // Fast response needed
            }
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const text = response.text;
        return (text || '').trim();
    } catch (error) {
        console.error("Error extracting selling points:", error);
        throw new Error("AI 賣點提煉功能暫時無法使用，請稍後再試。");
    }
};

export const generateVideoPromptForScene = async (scene: Scene, startFrame: string, endFrame: string): Promise<string> => {
    const sceneText = `Timecode ${scene.timecode}: ${scene.dialogue.map(d => d.line).join(' ')}. Visuals: ${scene.shot}. On-screen text: ${scene.onScreenText}. B-Roll: ${scene.bRoll}.`;

    const prompt = `You are an expert prompt engineer for advanced text-to-video AI models that work with start and end keyframes. Your task is to write a single, detailed prompt in ENGLISH that describes the transition and action *within* this single scene, from its beginning to its end.

**Scene Context:**
${sceneText}

**Key Instructions:**
1.  **Focus on the Transition within the Scene:** Your primary goal is to describe what happens *between* the start frame and the end frame of this specific scene. Describe the visual and emotional transformation that occurs in these few seconds.
2.  **Cinematic Language:** Use dynamic, cinematic language. Describe camera movements (e.g., "the camera slowly pushes in", "a smooth transition reveals"), changes in lighting, character expression, and how the product is used or revealed.
3.  **Single Paragraph:** The final output must be a single paragraph in ENGLISH. Do not use lists.
4.  **Be Specific:** Mention how the actor's emotion changes and the specific actions they perform with the product.

Generate the video prompt for this scene now.`;

    try {
        const apiCall = () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const text = response.text;
        if (!text?.trim()) {
          throw new Error("AI did not return a valid video prompt.");
        }
        return text.trim();
    } catch (error) {
        console.error("Error generating video prompt:", error);
        throw new Error("AI 影片提示詞生成失敗，請稍後再試。");
    }
};