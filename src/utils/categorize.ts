/**
 * Auto-categorization for Instalog — v3 scoring engine.
 *
 * Scores every category using weighted signals and picks the highest.
 * Features:
 *  - Pre-compiled regexes (built once at module load)
 *  - Word boundaries on ALL keywords including multi-word
 *  - Position bonus: keyword in first 2 words scores higher
 *  - Length scaling: short texts amplify, long texts dampen
 *  - Negation awareness: "don't need to" suppresses the scores it would give
 *  - Multi-language: English + Spanish + Thai keyword sets
 *  - User bias: learns from inbox corrections
 */

import {LogItemType} from '../models/types';
import {storage, STORAGE_KEYS} from '../storage/mmkv';

export type ConfirmableType = Exclude<LogItemType, null>;

// ─── Score weights ────────────────────────────────────────────────────────────

const W = {
  STRUCTURAL:     12,  // Structural pattern match (regex on sentence shape)
  KEYWORD:         3,  // Each keyword hit
  KEYWORD_CAP:     9,  // Max score from keywords alone (3 hits)
  POSITION_BONUS:  4,  // Keyword appears in first 2 words
  NEGATION_PENALTY: -6, // Negated keyword dampens that category
  USER_BIAS:       5,   // Bonus from learned corrections
} as const;

// Tie-break priority (higher = preferred when scores are equal)
const PRIORITY: Record<ConfirmableType, number> = {
  task: 5,
  idea: 4,
  mood: 3,
  note: 2,
  thought: 1,
};

// ─── Keyword lists (English) ──────────────────────────────────────────────────

const TASK_KEYWORDS_EN = [
  'buy', 'call', 'email', 'send', 'schedule', 'finish', 'pay', 'book',
  'pick up', 'meet', 'remind', 'fix', 'reply', 'follow up', 'submit',
  'apply', 'order', 'renew', 'update', 'clean', 'check', 'register',
  'sign up', 'download', 'install', 'return', 'prepare',
  'confirm', 'contact', 'draft', 'edit', 'revise', 'approve', 'cancel',
  'reschedule', 'move', 'transfer', 'deposit', 'withdraw', 'file', 'sign',
  'ship', 'track', 'deliver', 'collect', 'arrange', 'organize', 'sort',
  'backup', 'sync', 'upgrade', 'replace', 'repair', 'test', 'deploy',
  'migrate', 'document', 'announce', 'notify', 'ping', 'message',
  'dm', 'reach out', 'check in', 'follow through', 'circle back',
  'wrap up', 'close out', 'hand off', 'delegate', 'assign', 'set up',
  'drop off', 'fill out', 'fill in', 'look into', 'look up',
  'figure out', 'sort out', 'work on', 'get started', 'kick off',
  'todo', 'to do', 'to-do', 'need to', 'have to', 'must',
  'got to', 'gotta', 'go to', "don't forget", 'dont forget',
  'remember to', 'make sure', 'be sure to',
  'action item', 'next step', 'next steps', 'follow-up', 'asap',
  'by end of day', 'by eod', 'by tomorrow', 'before i forget',
  'i need to', 'i have to', 'i must', 'we need to',
  'we have to', 'get this done', 'get done',
];

const IDEA_KEYWORDS_EN = [
  'idea', 'ideas', 'concept', 'feature', 'features',
  'project', 'proposal', 'prototype', 'mvp', 'pitch', 'experiment',
  'innovation', 'opportunity', 'vision', 'strategy',
  'start a', 'start an', 'create a', 'build a', 'make a',
  'should build', 'could build', 'want to build', 'what if we built',
  'what if', 'could be', 'might be', 'what about', 'how about',
  'imagine if', 'imagine a', 'would be cool', 'would be great',
  'would be interesting', 'would be awesome', 'maybe we could',
  'we could', 'we should try', 'we should make',
  'it would be cool', 'it would be nice',
  'startup', 'business idea', 'side project', 'side hustle',
  'app idea', 'product idea',
  'revenue', 'monetize', 'growth', 'scale', 'pivot',
  'brainstorm', 'riff', 'hypothesize', 'theory',
  'solution', 'alternative', 'better way', 'different way',
];

const MOOD_KEYWORDS_EN = [
  'i feel', 'im feeling', "i'm feeling", 'feeling like',
  'not feeling', 'been feeling', 'feel so', 'really feeling',
  'tired', 'exhausted', 'drained', 'burned out', 'burnt out',
  'low energy', 'high energy', 'sluggish', 'dead tired',
  'wiped out', 'running on empty', 'no energy', 'so tired',
  'worn out', 'fatigued',
  'excited', 'motivated', 'inspired', 'grateful',
  'hopeful', 'confident', 'proud', 'pumped',
  'stoked', 'energized', 'fired up', 'optimistic', 'joyful',
  'great today', 'amazing today', 'killing it',
  'on fire', 'in flow', 'in the zone',
  'stressed', 'anxious', 'depressed', 'frustrated',
  'angry', 'nervous', 'lonely', 'bored', 'disconnected',
  'restless', 'numb', 'overwhelmed', 'scattered', 'unfocused',
  'down today', 'off today', 'not okay', 'not great',
  'struggling', 'spiraling', 'in my head', 'overthinking',
  "can't focus", 'cant focus', 'losing it', 'on edge',
  'irritable', 'irritated', 'blah', 'meh',
  'okay today', 'fine today', 'all good',
  'good day', 'bad day', 'rough day', 'great day', 'long day',
  'hard day', 'better today', 'worse today', 'productive day',
  'slow day', 'weird day', 'crazy day', 'tough day',
  'headspace', 'mindset', 'vibes', 'in a mood',
  'not myself', 'just ugh', 'ugh',
];

const NOTE_KEYWORDS_EN = [
  'note to self', 'jot down', 'writing down', 'fyi', 'for the record',
  'keep in mind', 'heads up', 'worth remembering', 'important to remember',
  'noticed', 'realized', 'discovered', 'found out', 'learned',
  'read that', 'read somewhere', 'heard that', 'someone said', 'apparently',
  'turns out', 'interesting that', 'interesting fact', 'fun fact',
  'did you know', 'according to', 'study says',
  'reference', 'article', 'podcast', 'tutorial',
  'documentation', 'docs', 'key takeaway', 'takeaway', 'tldr', 'tl;dr',
  'insight', 'observation', 'worth noting',
  'for reference', 'password', 'login', 'credentials',
  'contact info',
  'keeping track', 'documenting', 'making note',
  'putting this here', 'saving this',
];

// ─── Keyword lists (Spanish) ──────────────────────────────────────────────────

const TASK_KEYWORDS_ES = [
  'comprar', 'llamar', 'enviar', 'mandar', 'pagar', 'reservar',
  'recoger', 'arreglar', 'responder', 'entregar', 'limpiar',
  'revisar', 'confirmar', 'contactar', 'cancelar', 'mover',
  'organizar', 'reparar', 'instalar', 'descargar', 'subir',
  'actualizar', 'firmar', 'preparar', 'agendar', 'programar',
  'devolver', 'reemplazar', 'depositar', 'retirar', 'ordenar',
  'tengo que', 'necesito', 'debo', 'hay que', 'toca',
  'no olvidar', 'no olvides', 'recordar que', 'pendiente',
  'hacer', 'terminar', 'completar', 'acabar',
  'ir a', 'ir al', 'pasar por', 'llevar a',
  'antes de que se me olvide', 'urgente', 'lo antes posible',
];

const IDEA_KEYWORDS_ES = [
  'idea', 'ideas', 'concepto', 'proyecto', 'propuesta',
  'prototipo', 'experimento', 'estrategia',
  'crear un', 'crear una', 'hacer un', 'hacer una',
  'construir', 'inventar', 'diseñar', 'desarrollar',
  'y si', 'qué tal si', 'qué pasaría si', 'imagina si', 'imagina que',
  'podríamos', 'deberíamos', 'sería cool', 'sería genial',
  'estaría bien', 'sería bueno',
  'negocio', 'emprendimiento', 'startup', 'app',
  'lluvia de ideas', 'alternativa', 'solución',
  'mejor manera', 'otra forma',
];

const MOOD_KEYWORDS_ES = [
  'me siento', 'me sentia', 'me sentía', 'estoy sintiéndome',
  'ando', 'estoy',
  'cansado', 'cansada', 'agotado', 'agotada', 'sin energía',
  'muerto', 'muerta',
  'emocionado', 'emocionada', 'motivado', 'motivada',
  'inspirado', 'inspirada', 'agradecido', 'agradecida',
  'orgulloso', 'orgullosa', 'optimista', 'feliz', 'contento', 'contenta',
  'estresado', 'estresada', 'ansioso', 'ansiosa',
  'deprimido', 'deprimida', 'frustrado', 'frustrada',
  'enojado', 'enojada', 'nervioso', 'nerviosa',
  'solo', 'sola', 'aburrido', 'aburrida', 'abrumado', 'abrumada',
  'triste', 'mal hoy', 'bien hoy', 'mejor hoy', 'peor hoy',
  'buen día', 'mal día', 'día difícil', 'día largo', 'día pesado',
  'no puedo concentrarme', 'no estoy bien',
];

const NOTE_KEYWORDS_ES = [
  'nota', 'nota mental', 'apuntar', 'anotar', 'recordatorio',
  'tener en cuenta', 'aviso', 'importante recordar',
  'me di cuenta', 'descubrí', 'aprendí', 'leí que', 'escuché que',
  'resulta que', 'dato curioso', 'según',
  'referencia', 'artículo', 'podcast', 'tutorial', 'documentación',
  'clave', 'resumen', 'para referencia', 'contraseña',
];

// ─── Keyword lists (Thai) ─────────────────────────────────────────────────────

const TASK_KEYWORDS_TH = [
  'ซื้อ', 'โทร', 'โทรหา', 'ส่ง', 'ส่งอีเมล', 'จ่าย', 'จอง', 'นัด',
  'แก้', 'แก้ไข', 'ซ่อม', 'ตอบ', 'ทำ', 'เสร็จ', 'จัดการ', 'เตรียม',
  'ยืนยัน', 'ติดต่อ', 'ยกเลิก', 'เลื่อน', 'ย้าย', 'จัดเรียง',
  'อัพเดท', 'อัปเดต', 'ดาวน์โหลด', 'ติดตั้ง', 'คืน',
  'ต้อง', 'ต้องทำ', 'อย่าลืม', 'ห้ามลืม', 'ไปที่',
  'ทำให้เสร็จ', 'เร่งด่วน', 'รีบ',
  'ไป', 'เอาไป', 'รับ', 'เอามา', 'เช็ค', 'ตรวจ',
];

const IDEA_KEYWORDS_TH = [
  'ไอเดีย', 'ความคิด', 'โปรเจ็ค', 'โปรเจกต์', 'ฟีเจอร์',
  'สร้าง', 'ทำแอป', 'ทำเว็บ',
  'ถ้าหาก', 'ลองดู', 'น่าจะ', 'ถ้าเรา',
  'อาจจะ', 'คงจะ', 'น่าสนใจ', 'น่าลอง',
  'ธุรกิจ', 'สตาร์ทอัพ', 'แอป', 'โปรดักต์',
  'ทางเลือก', 'วิธีที่ดีกว่า',
];

const MOOD_KEYWORDS_TH = [
  'รู้สึก', 'เหนื่อย', 'หมดแรง', 'อ่อนเพลีย', 'ง่วง',
  'ตื่นเต้น', 'มีแรงบันดาลใจ', 'ภูมิใจ', 'ดีใจ', 'มีความสุข',
  'เครียด', 'กังวล', 'ซึมเศร้า', 'หงุดหงิด', 'โกรธ',
  'เหงา', 'เบื่อ', 'ท้อ', 'ท้อแท้', 'สับสน',
  'เศร้า', 'ไม่สบายใจ', 'ไม่โอเค', 'กลุ้มใจ',
  'วันดี', 'วันแย่', 'วันยาว', 'วันหนัก',
  'ดีขึ้น', 'แย่ลง',
];

const NOTE_KEYWORDS_TH = [
  'โน้ต', 'บันทึก', 'จดไว้', 'จำไว้', 'สำคัญ',
  'สังเกต', 'เพิ่งรู้', 'เรียนรู้', 'อ่านมา', 'ได้ยินมา',
  'ปรากฏว่า', 'ข้อมูล', 'อ้างอิง', 'บทความ',
  'รหัสผ่าน', 'สรุป',
];

// ─── Merge all languages ──────────────────────────────────────────────────────

const TASK_KEYWORDS = [...TASK_KEYWORDS_EN, ...TASK_KEYWORDS_ES, ...TASK_KEYWORDS_TH];
const IDEA_KEYWORDS = [...IDEA_KEYWORDS_EN, ...IDEA_KEYWORDS_ES, ...IDEA_KEYWORDS_TH];
const MOOD_KEYWORDS = [...MOOD_KEYWORDS_EN, ...MOOD_KEYWORDS_ES, ...MOOD_KEYWORDS_TH];
const NOTE_KEYWORDS = [...NOTE_KEYWORDS_EN, ...NOTE_KEYWORDS_ES, ...NOTE_KEYWORDS_TH];

// ─── Pre-compiled keyword regexes ─────────────────────────────────────────────
// Built once at module load — not per call.
// Thai doesn't use word boundaries (\b), so we use a lookaround-free approach:
// for non-Latin scripts we match the characters directly.

interface CompiledRule {
  type: ConfirmableType;
  patterns: RegExp[];
}

const HAS_LATIN = /[a-z]/i;

const compileKeywords = (keywords: string[]): RegExp[] =>
  keywords.map(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use word boundaries only for Latin-script keywords.
    // Thai and other non-Latin scripts have no concept of \b.
    if (HAS_LATIN.test(kw)) {
      return new RegExp(`\\b${escaped}\\b`, 'i');
    }
    return new RegExp(escaped, 'i');
  });

const COMPILED_RULES: CompiledRule[] = [
  { type: 'task',  patterns: compileKeywords(TASK_KEYWORDS) },
  { type: 'idea',  patterns: compileKeywords(IDEA_KEYWORDS) },
  { type: 'mood',  patterns: compileKeywords(MOOD_KEYWORDS) },
  { type: 'note',  patterns: compileKeywords(NOTE_KEYWORDS) },
];

// ─── Structural patterns ──────────────────────────────────────────────────────

// Imperative verb at start — only unambiguous action verbs
const IMPERATIVE_START = /^(buy|call|email|send|schedule|finish|pay|book|pick|meet|fix|reply|submit|apply|order|renew|update|clean|check|register|sign|download|install|return|prepare|confirm|contact|draft|edit|post|publish|ship|deploy|file|cancel|arrange|organize|sort|backup|sync|upgrade|replace|repair|test|launch|message|ping|notify|announce|document|deliver|collect|remind|ask|tell|get|go|do|take|give|set|find|add|remove|change|request|complete|fill|look|figure|work|close|open|reach|follow|hand|drop|pull|push|merge|lead|manage|plan)\b/i;

// Spanish structural: imperative at start
const IMPERATIVE_START_ES = /^(comprar|llamar|enviar|mandar|pagar|reservar|recoger|arreglar|responder|entregar|limpiar|revisar|confirmar|contactar|cancelar|mover|organizar|reparar|instalar|descargar|actualizar|firmar|preparar|agendar|devolver|ordenar|hacer|terminar|completar|acabar|ir a|pasar por|llevar)\b/i;

// Thai structural: common imperative verbs at start
const IMPERATIVE_START_TH = /^(ซื้อ|โทร|โทรหา|ส่ง|จ่าย|จอง|นัด|แก้|ซ่อม|ตอบ|ทำ|จัดการ|เตรียม|ยืนยัน|ติดต่อ|ยกเลิก|เลื่อน|ไป|รับ|เอา|เช็ค|ตรวจ)/;

// First-person + explicit emotion verb = mood
const FEELING_PATTERN = /^(i\s+(feel|felt|am feeling|'m feeling)\b|im feeling\b|feeling\s+(so|really|super|very|pretty|kind of|kinda|like)\b|felt\s+(so|really|super)\b)/i;
const FEELING_PATTERN_ES = /^(me siento|estoy (sintiéndome|muy|super|bien|mal|bastante))\b/i;
const FEELING_PATTERN_TH = /^(รู้สึก)/;

// Speculative question = idea
const SPECULATIVE_Q = /^(what if|could we|should we|why not|how about|what about|what would|how would|wouldn't it|isn't there|is there a way)/i;
const SPECULATIVE_Q_ES = /^(y si|qué tal si|qué pasaría si|cómo sería|por qué no|imagina)\b/i;
const SPECULATIVE_Q_TH = /^(ถ้าหาก|ลองดู|ถ้าเรา)/;

// Note prefix = note
const NOTE_PREFIX = /^(note[:\-–]|notes[:\-–]|remember[:\-–]|fyi[:\-–]|heads up[:\-–]|important[:\-–]|tip[:\-–]|reminder[:\-–])/i;
const NOTE_PREFIX_ES = /^(nota[:\-–]|recordatorio[:\-–]|importante[:\-–]|aviso[:\-–])/i;
const NOTE_PREFIX_TH = /^(โน้ต[:\-–]|บันทึก[:\-–]|สำคัญ[:\-–])/;

// ─── Negation detection ───────────────────────────────────────────────────────

// English negation words that, when immediately preceding a keyword, flip its meaning
const NEGATION_EN = /\b(not|no|don't|dont|doesn't|doesnt|didn't|didnt|won't|wont|can't|cant|never|no longer|not really|hardly|barely)\s+/gi;
// Spanish negation
const NEGATION_ES = /\b(no|nunca|ya no|tampoco|ni|sin)\s+/gi;
// Thai negation
const NEGATION_TH = /(ไม่|ไม่ได้|ยังไม่|ไม่ต้อง)/g;

/**
 * Check if a keyword match is negated by looking at the few words before it.
 * Returns true if the keyword was preceded by a negation word.
 */
const isNegated = (text: string, keywordMatch: RegExp): boolean => {
  // Find where the keyword appears
  const match = keywordMatch.exec(text);
  if (!match) return false;
  const idx = match.index;
  // Look at the ~30 chars before the keyword
  const prefix = text.substring(Math.max(0, idx - 30), idx).toLowerCase();
  return NEGATION_EN.test(prefix) || NEGATION_ES.test(prefix) || NEGATION_TH.test(prefix);
};

// ─── User bias (learned corrections) ──────────────────────────────────────────

const BIAS_STORAGE_KEY = '@instalog/classifier_bias';

// Maps normalized text → type the user corrected it to.
// We keep the last 200 corrections to avoid unbounded growth.
interface BiasMap {
  [normalizedText: string]: ConfirmableType;
}

let biasCache: BiasMap | null = null;

const loadBias = (): BiasMap => {
  if (biasCache) return biasCache;
  const raw = storage.getString(BIAS_STORAGE_KEY);
  if (raw) {
    try {
      biasCache = JSON.parse(raw) as BiasMap;
      return biasCache;
    } catch { /* corrupted, start fresh */ }
  }
  biasCache = {};
  return biasCache;
};

const normalizeForBias = (text: string): string =>
  text.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 100);

/**
 * Record a user correction from the inbox.
 * Call this when the user overrides the suggested type.
 */
export const recordCorrection = (
  text: string,
  suggestedType: ConfirmableType,
  correctedType: ConfirmableType,
): void => {
  if (suggestedType === correctedType) return; // no correction needed
  const bias = loadBias();
  const key = normalizeForBias(text);
  if (!key) return;
  bias[key] = correctedType;
  // Cap at 200 entries — evict oldest (first keys in object)
  const keys = Object.keys(bias);
  if (keys.length > 200) {
    for (const k of keys.slice(0, keys.length - 200)) {
      delete bias[k];
    }
  }
  biasCache = bias;
  storage.setString(BIAS_STORAGE_KEY, JSON.stringify(bias));
};

/**
 * Check if we have a learned bias for this exact text.
 */
const getUserBias = (text: string): ConfirmableType | null => {
  const bias = loadBias();
  return bias[normalizeForBias(text)] ?? null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const firstNWords = (lower: string, n: number): string => {
  const words = lower.split(/\s+/);
  return words.slice(0, n).join(' ');
};

const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length;

const lengthMultiplier = (wc: number): number => {
  if (wc <= 3) return 1.5;
  if (wc <= 8) return 1.0;
  return 0.7;
};

// ─── Scoring engine ───────────────────────────────────────────────────────────

const scoreKeywords = (
  lower: string,
  firstTwo: string,
  patterns: RegExp[],
): { hits: number; hasPositionHit: boolean; negatedHits: number } => {
  let hits = 0;
  let negatedHits = 0;
  let hasPositionHit = false;
  for (const rx of patterns) {
    if (rx.test(lower)) {
      // Check if this match is negated
      if (isNegated(lower, rx)) {
        negatedHits++;
      } else {
        hits++;
        if (!hasPositionHit && rx.test(firstTwo)) {
          hasPositionHit = true;
        }
      }
      if (hits + negatedHits >= 4) break; // cap for performance
    }
  }
  return { hits, hasPositionHit, negatedHits };
};

export const categorizeLog = (text: string): ConfirmableType => {
  if (!text?.trim()) return 'thought';

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 0. Exact-match user bias — if they corrected this exact text before, use it
  const bias = getUserBias(trimmed);
  if (bias) return bias;

  const wc = wordCount(lower);
  const lenMul = lengthMultiplier(wc);
  const firstTwo = firstNWords(lower, 2);

  const scores: Record<ConfirmableType, number> = {
    task: 0,
    idea: 0,
    mood: 0,
    note: 0,
    thought: 0,
  };

  // 1. Structural boosts — all languages
  if (NOTE_PREFIX.test(trimmed) || NOTE_PREFIX_ES.test(trimmed) || NOTE_PREFIX_TH.test(trimmed)) {
    scores.note += W.STRUCTURAL;
  }
  if (FEELING_PATTERN.test(trimmed) || FEELING_PATTERN_ES.test(trimmed) || FEELING_PATTERN_TH.test(trimmed)) {
    scores.mood += W.STRUCTURAL;
  }
  if (SPECULATIVE_Q.test(trimmed) || SPECULATIVE_Q_ES.test(trimmed) || SPECULATIVE_Q_TH.test(trimmed)) {
    scores.idea += W.STRUCTURAL;
  }
  if (IMPERATIVE_START.test(trimmed) || IMPERATIVE_START_ES.test(trimmed) || IMPERATIVE_START_TH.test(trimmed)) {
    scores.task += W.STRUCTURAL;
  }

  // 2. Keyword scoring with position bonus, length scaling, and negation
  for (const rule of COMPILED_RULES) {
    const { hits, hasPositionHit, negatedHits } = scoreKeywords(lower, firstTwo, rule.patterns);
    const rawScore = Math.min(hits * W.KEYWORD, W.KEYWORD_CAP);
    scores[rule.type] += Math.round(rawScore * lenMul);
    if (hasPositionHit) {
      scores[rule.type] += W.POSITION_BONUS;
    }
    // Negated keywords dampen the score (but don't go below 0)
    if (negatedHits > 0) {
      scores[rule.type] += W.NEGATION_PENALTY;
    }
  }

  // 3. Pick the winner
  let best: ConfirmableType = 'thought';
  let bestScore = 0;

  for (const type of Object.keys(scores) as ConfirmableType[]) {
    const s = scores[type];
    if (s > bestScore || (s === bestScore && s > 0 && PRIORITY[type] > PRIORITY[best])) {
      best = type;
      bestScore = s;
    }
  }

  return best;
};

/** Whether the sync classifier produced a high-confidence result. */
export const isConfidentClassification = (text: string): boolean => {
  if (!text?.trim()) return false;
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const firstTwo = firstNWords(lower, 2);

  // User bias = confident
  if (getUserBias(trimmed)) return true;

  // Structural match = confident
  if (NOTE_PREFIX.test(trimmed) || NOTE_PREFIX_ES.test(trimmed) || NOTE_PREFIX_TH.test(trimmed) ||
      FEELING_PATTERN.test(trimmed) || FEELING_PATTERN_ES.test(trimmed) || FEELING_PATTERN_TH.test(trimmed) ||
      SPECULATIVE_Q.test(trimmed) || SPECULATIVE_Q_ES.test(trimmed) || SPECULATIVE_Q_TH.test(trimmed) ||
      IMPERATIVE_START.test(trimmed) || IMPERATIVE_START_ES.test(trimmed) || IMPERATIVE_START_TH.test(trimmed)) {
    return true;
  }

  // 2+ keyword hits in any single category = confident
  for (const rule of COMPILED_RULES) {
    if (scoreKeywords(lower, firstTwo, rule.patterns).hits >= 2) return true;
  }

  return false;
};

/**
 * Async NLTagger-powered classification via native module.
 * Runs on-device using Apple's NaturalLanguage framework.
 * Falls back to synchronous categorizeLog if native module unavailable.
 */
import {NativeModules, Platform} from 'react-native';

export const classifyWithNL = async (text: string): Promise<ConfirmableType> => {
  if (!text?.trim()) return 'thought';

  if (Platform.OS === 'ios' && NativeModules.NLClassifierModule?.classifyText) {
    try {
      const result = await NativeModules.NLClassifierModule.classifyText(text);
      if (['task', 'idea', 'mood', 'note', 'thought'].includes(result)) {
        return result as ConfirmableType;
      }
    } catch {
      // Fall through to sync fallback
    }
  }

  return categorizeLog(text);
};
