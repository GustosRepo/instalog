/**
 * Auto-categorization for Instalog.
 *
 * Runs lightweight keyword rules on raw text to suggest a LogItemType.
 * This is never forced on the user — it's a suggestion shown in Inbox.
 */

import {LogItemType} from '../models/types';

export type ConfirmableType = Exclude<LogItemType, null>;

// ─── Keyword rules ────────────────────────────────────────────────────────────

interface Rule {
  type: ConfirmableType;
  keywords: string[];
}

const RULES: Rule[] = [
  {
    type: 'task',
    keywords: [
      // Core action verbs
      'buy', 'call', 'email', 'send', 'schedule', 'finish', 'pay', 'book',
      'pick up', 'meet', 'remind', 'fix', 'reply', 'follow up', 'submit',
      'apply', 'order', 'renew', 'update', 'clean', 'check', 'register',
      'sign up', 'download', 'install', 'return', 'review', 'prepare',
      'confirm', 'contact', 'write', 'read', 'watch', 'listen', 'research',
      'complete', 'print', 'upload', 'share', 'post', 'publish', 'draft',
      'edit', 'revise', 'approve', 'cancel', 'reschedule', 'move', 'transfer',
      'deposit', 'withdraw', 'file', 'sign', 'notarize', 'ship', 'track',
      'deliver', 'collect', 'arrange', 'organize', 'sort', 'label', 'archive',
      'delete', 'backup', 'sync', 'update', 'upgrade', 'replace', 'repair',
      'service', 'charge', 'refill', 'restock', 'measure', 'test', 'deploy',
      'launch', 'migrate', 'document', 'announce', 'notify', 'ping', 'message',
      'text', 'dm', 'reach out', 'check in', 'follow through', 'circle back',
      'wrap up', 'close out', 'hand off', 'delegate', 'assign', 'set up',
      'tear down', 'drop off', 'pick up', 'fill out', 'fill in', 'look into',
      'look up', 'figure out', 'sort out', 'work on', 'get started', 'kick off',
      // Obligation phrases
      'todo', 'to do', 'to-do', 'need to', 'have to', 'must', 'should',
      'got to', "gotta", 'get to', 'go to', "don't forget", 'dont forget',
      'remember to', 'make sure', 'be sure to', 'dont miss', "don't miss",
      'action item', 'next step', 'next steps', 'follow-up', 'asap',
      'by end of day', 'by eod', 'by tomorrow', 'before i forget',
      'i need to', 'i have to', 'i should', 'i must', 'we need to',
      'we should', 'we have to', 'get this done', 'get done',
    ],
  },
  {
    type: 'idea',
    keywords: [
      // Core idea triggers
      'idea', 'ideas', 'concept', 'concepts', 'feature', 'features',
      'project', 'proposal', 'prototype', 'mvp', 'pitch', 'experiment',
      'innovation', 'opportunity', 'vision', 'strategy', 'plan',
      // Build/create language
      'build', 'create', 'make', 'design', 'develop', 'invent',
      'start a', 'start an', 'create a', 'build a', 'make a',
      'should build', 'could build', 'want to build', 'what if we built',
      // Speculative phrases
      'what if', 'could be', 'might be', 'what about', 'how about',
      'imagine if', 'imagine a', 'would be cool', 'would be great',
      'would be interesting', 'would be awesome', 'maybe we could',
      'we could', 'we should try', 'we should make', 'what if we',
      'it would be cool', 'it would be nice', 'it would be good',
      // Business / product
      'startup', 'business idea', 'side project', 'side hustle',
      'app idea', 'product idea', 'product', 'launch', 'go to market',
      'market', 'audience', 'user', 'users', 'customer', 'customers',
      'revenue', 'monetize', 'growth', 'scale', 'pivot',
      // Creative
      'brainstorm', 'riff', 'explore', 'try out', 'test out',
      'hypothesize', 'theory', 'angle', 'approach', 'framework',
      'model', 'solution', 'solve', 'hack', 'workaround', 'shortcut',
      'alternative', 'better way', 'different way',
    ],
  },
  {
    type: 'mood',
    keywords: [
      // Direct mood/feeling words
      'feeling', 'felt', 'feel like', 'i feel', 'im feeling', "i'm feeling",
      'not feeling', 'been feeling', 'feel so', 'really feeling',
      // Energy states
      'tired', 'exhausted', 'drained', 'burned out', 'burnt out',
      'low energy', 'high energy', 'wired', 'sluggish', 'dead tired',
      'wiped out', 'running on empty', 'no energy', 'so tired',
      'worn out', 'run down', 'zapped', 'fatigued',
      // Positive emotions
      'happy', 'excited', 'motivated', 'inspired', 'grateful',
      'content', 'hopeful', 'confident', 'proud', 'pumped',
      'stoked', 'energized', 'fired up', 'optimistic', 'joyful',
      'elated', 'great today', 'amazing today', 'killing it',
      'on fire', 'in flow', 'in the zone',
      // Negative emotions
      'sad', 'stressed', 'anxious', 'depressed', 'frustrated',
      'angry', 'nervous', 'lonely', 'bored', 'disconnected',
      'restless', 'numb', 'overwhelmed', 'scattered', 'unfocused',
      'down today', 'off today', 'not okay', 'not great',
      'struggling', 'spiraling', 'in my head', 'overthinking',
      'can\'t focus', 'cant focus', 'losing it', 'on edge',
      'irritable', 'irritated', 'moody', 'blah', 'meh',
      // Neutral states
      'calm', 'neutral', 'okay today', 'fine today', 'all good',
      // Day quality
      'good day', 'bad day', 'rough day', 'great day', 'long day',
      'hard day', 'better today', 'worse today', 'productive day',
      'slow day', 'weird day', 'crazy day', 'wild day',
      'draining day', 'solid day', 'decent day', 'tough day',
      // Misc
      'mood', 'headspace', 'mindset', 'vibes', 'vibe', 'in a mood',
      'not myself', 'off today', 'just ugh', 'ugh',
    ],
  },
  {
    type: 'note',
    keywords: [
      // Direct note signals
      'note', 'notes', 'note to self', 'jotting', 'jot down',
      'writing down', 'logging', 'fyi', 'for the record',
      // Memory aids
      'remember', 'dont forget', "don't forget", 'keep in mind',
      'heads up', 'reminder', 'worth remembering', 'important to remember',
      // Observation / learning
      'noticed', 'notice that', 'realized', 'realize that', 'discovered',
      'found out', 'learned', 'learning', 'read that', 'read somewhere',
      'heard that', 'heard somewhere', 'someone said', 'apparently',
      'turns out', 'interesting that', 'interesting fact', 'fun fact',
      'did you know', 'according to', 'study says', 'research says',
      // Reference material
      'reference', 'info', 'information', 'link', 'resource', 'source',
      'article', 'book', 'podcast', 'video', 'course', 'tutorial',
      'documentation', 'docs', 'tip', 'trick', 'hack', 'shortcut',
      'key takeaway', 'takeaway', 'summary', 'recap', 'tldr', 'tl;dr',
      // Insights
      'insight', 'observation', 'spotted', 'worth noting',
      'important', 'critical', 'key point', 'main point', 'highlight',
      'for reference', 'heads up', 'password', 'login', 'credentials',
      'account', 'number', 'code', 'pin', 'address', 'contact info',
      // Capture phrases
      'keeping track', 'tracking', 'documenting', 'making note',
      'putting this here', 'saving this', 'storing this',
    ],
  },
];

// ─── Sentence structure patterns ─────────────────────────────────────────────

// Imperative verb at start = almost always a task
// e.g. "Call dentist", "Fix the login bug", "Email Sarah about the contract"
const IMPERATIVE_VERBS = /^(buy|call|email|send|schedule|finish|pay|book|pick|meet|fix|reply|submit|apply|order|renew|update|clean|check|register|sign|download|install|return|review|prepare|confirm|contact|draft|edit|post|publish|ship|deploy|file|cancel|arrange|organize|sort|backup|sync|upgrade|replace|repair|test|launch|message|text|ping|notify|announce|document|deliver|collect|measure|remind|ask|tell|get|go|do|make|take|give|set|run|try|find|add|remove|move|change|request|complete|fill|look|figure|sort|work|start|finish|close|open|reach|follow|hand|drop|pull|push|merge|lead|manage|plan|build|create|write|read|watch|listen|research)\b/i;

// First-person + emotion verb = mood
// e.g. "I feel drained", "I'm so stressed today", "Feeling really off"
const FIRST_PERSON_FEELING = /^(i('m| am| feel| felt| been| was| have been)|im |feeling |felt )/i;

// Question structure = often an idea/thought
// e.g. "What if we built X?", "Could we do Y?"
const SPECULATIVE_QUESTION = /^(what if|could we|should we|why not|how about|what about|what would|how would|wouldn't it|wouldn't be|isn't there|is there a way)/i;

// "Note:" or "Remember:" prefix = note
const NOTE_PREFIX = /^(note[:\-–]|notes[:\-–]|remember[:\-–]|fyi[:\-–]|heads up[:\-–]|important[:\-–]|tip[:\-–]|reminder[:\-–])/i;

// ─── Structural analysis ──────────────────────────────────────────────────────

const analyzeStructure = (text: string): ConfirmableType | null => {
  const trimmed = text.trim();
  if (NOTE_PREFIX.test(trimmed)) return 'note';
  if (FIRST_PERSON_FEELING.test(trimmed)) return 'mood';
  if (SPECULATIVE_QUESTION.test(trimmed)) return 'idea';
  if (IMPERATIVE_VERBS.test(trimmed)) return 'task';
  return null;
};

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Analyzes raw text and returns the best matching category.
 * 1. Structural patterns (imperative verb, first-person feeling, etc.)
 * 2. Keyword rules in priority order: task → idea → mood → note
 * 3. Default: thought
 */
export const categorizeLog = (text: string): ConfirmableType => {
  if (!text?.trim()) return 'thought';

  // 1. Structural analysis — catches clear patterns keyword matching misses
  const structural = analyzeStructure(text);
  if (structural) return structural;

  const lower = text.toLowerCase();

  // 2. Keyword rules
  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      const pattern = keyword.includes(' ')
        ? keyword
        : `\\b${keyword}\\b`;
      if (new RegExp(pattern, 'i').test(lower)) {
        return rule.type;
      }
    }
  }

  return 'thought';
};

/**
 * Async NLTagger-powered classification via native module.
 * Runs on-device using Apple's NaturalLanguage framework.
 * Falls back to synchronous categorizeLog if native module unavailable.
 */
import {NativeModules, Platform} from 'react-native';

export const classifyWithNL = async (text: string): Promise<ConfirmableType> => {
  if (!text?.trim()) return 'thought';

  // Only available on iOS with the native module present
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
