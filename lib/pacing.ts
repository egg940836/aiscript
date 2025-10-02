export type PaceProfile = { cps: number; pauseComma: number; pausePeriod: number; pauseEllipsis: number; };

// New pace selection type
export type PaceSelection = 'slow' | 'medium' | 'fast';

// New pace profiles for user selection
export const speakingPaceProfiles: Record<PaceSelection, PaceProfile> = {
  slow:   { cps: 3.5, pauseComma: 0.2, pausePeriod: 0.3, pauseEllipsis: 0.6 },  // 慢速
  medium: { cps: 4.0, pauseComma: 0.15, pausePeriod: 0.25, pauseEllipsis: 0.5 }, // 中速
  fast:   { cps: 4.5, pauseComma: 0.1, pausePeriod: 0.2, pauseEllipsis: 0.4 },  // 快速
};

export const pacePresets: Record<string, PaceProfile> = {
  V0: { cps: 3.6, pauseComma: 0.15, pausePeriod: 0.25, pauseEllipsis: 0.5 },   // V0｜品牌官宣
  V1: { cps: 3.8, pauseComma: 0.15, pausePeriod: 0.25, pauseEllipsis: 0.5 },   // V1｜教學顧問
  V1_5: { cps: 3.7, pauseComma: 0.15, pausePeriod: 0.25, pauseEllipsis: 0.5 },// V1.5｜社群對話
  V2: { cps: 4.2, pauseComma: 0.12, pausePeriod: 0.2, pauseEllipsis: 0.45 },  // V2｜節奏帶動
  V2_5: { cps: 4.0, pauseComma: 0.18, pausePeriod: 0.28, pauseEllipsis: 0.55 },// V2.5｜議題挑戰
};

export function estimateSeconds(vo: string, profile: PaceProfile): number {
  if (!vo) return 0;
  
  // This regex matches CJK characters (Chinese, Japanese, Korean).
  const zhChars = (vo.match(/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/g) ?? []).length;
  // Matches ASCII letters.
  const ascii = (vo.match(/[a-zA-Z]/g) ?? []).length;
  // Matches digits.
  const digits = (vo.match(/\d/g) ?? []).length;
  // Matches different types of commas.
  const commas = (vo.match(/[,，、]/g) ?? []).length;
  // Matches different types of periods/question marks/exclamation marks.
  const periods = (vo.match(/[.。\?？!！]/g) ?? []).length;
  // Matches ellipsis.
  const ellipses = (vo.match(/…|\.{3}/g) ?? []).length;

  const characterUnits = zhChars + 0.5 * ascii + 1.1 * digits;
  const speakTime = characterUnits / profile.cps;
  const pauseTime = commas * profile.pauseComma + periods * profile.pausePeriod + ellipses * profile.pauseEllipsis;
  
  return speakTime + pauseTime;
}