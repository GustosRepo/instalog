//
//  NLClassifierModule.swift
//  Instalog
//
//  Uses Apple's NaturalLanguage framework to classify log text
//  on-device, zero latency, no API required.
//

import Foundation
import NaturalLanguage

@objc(NLClassifierModule)
class NLClassifierModule: NSObject {

  // Part-of-speech tags that indicate an action (likely a task)
  private let actionPosTags: Set<NLTag> = [.verb]

  // ─── Main classify method ───────────────────────────────────────────────────

  @objc
  func classifyText(_ text: String,
                    resolver: @escaping RCTPromiseResolveBlock,
                    rejecter: @escaping RCTPromiseRejectBlock) {
    guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      resolver("thought")
      return
    }

    DispatchQueue.global(qos: .userInitiated).async {
      let result = self.classify(text)
      resolver(result)
    }
  }

  // ─── Classification logic ───────────────────────────────────────────────────

  // Emotion vocabulary — must contain at least one to declare mood
  private let emotionWords: Set<String> = [
    // energy
    "tired", "exhausted", "drained", "burned", "burnt", "sluggish", "fatigued",
    "wiped", "weary", "energized", "pumped", "wired",
    // positive
    "happy", "excited", "motivated", "inspired", "grateful", "hopeful",
    "confident", "proud", "stoked", "joyful", "elated", "optimistic",
    "amazing", "wonderful", "fantastic", "blessed", "relieved", "cheerful",
    // negative
    "sad", "stressed", "anxious", "depressed", "frustrated", "angry",
    "nervous", "lonely", "bored", "overwhelmed", "scared", "worried",
    "irritated", "irritable", "numb", "restless", "disconnected", "moody",
    "upset", "miserable", "heartbroken", "defeated", "helpless",
    // feeling verbs/phrases
    "feeling", "felt", "vibes", "headspace", "mindset", "blah", "meh", "ugh",
  ]

  private func hasEmotionWord(_ lower: String) -> Bool {
    let words = Set(lower.components(separatedBy: .whitespacesAndNewlines)
                        .map { $0.trimmingCharacters(in: .punctuationCharacters) })
    return !words.isDisjoint(with: emotionWords)
  }

  private func classify(_ text: String) -> String {
    let lower = text.lowercased()

    // 1. Sentiment + POS analysis
    let sentiment = self.getSentimentScore(text)
    let posInfo = self.analyzePOS(text)

    // 2. Named entity check — proper nouns with verbs strongly suggest task
    let hasPersonOrOrg = self.hasNamedEntity(text, types: [.personalName, .organizationName])

    // 3. Classify based on signals

    // Strong sentiment + first person + actual emotion vocabulary = mood
    if abs(sentiment) > 0.5 && self.hasFirstPerson(lower) && self.hasEmotionWord(lower) {
      return "mood"
    }

    // Imperative structure: starts with verb, short sentence = task
    if posInfo.startsWithVerb && posInfo.tokenCount <= 12 {
      return "task"
    }

    // Question form with noun-heavy structure = idea or thought
    if posInfo.isQuestion {
      if posInfo.verbCount >= 1 && posInfo.nounCount >= 1 {
        return "idea"
      }
      return "thought"
    }

    // Long sentences that are informational (many nouns, low verb ratio) = note
    if posInfo.tokenCount > 8 && posInfo.nounCount > posInfo.verbCount * 2 {
      return "note"
    }

    // Verb-heavy shorter sentences = task
    if posInfo.verbCount >= 2 && posInfo.tokenCount <= 10 {
      return "task"
    }

    // Named person/org + verb = task (e.g. "Email Sarah", "Call Apple support")
    if hasPersonOrOrg && posInfo.verbCount >= 1 {
      return "task"
    }

    // High sentiment with emotion vocabulary = mood (no first-person required)
    if abs(sentiment) > 0.6 && self.hasEmotionWord(lower) {
      return "mood"
    }

    // Noun-phrase heavy, declarative = note
    if posInfo.nounCount >= 3 && posInfo.verbCount <= 1 {
      return "note"
    }

    return "thought"
  }

  // ─── NL Helpers ─────────────────────────────────────────────────────────────

  private struct POSInfo {
    let startsWithVerb: Bool
    let isQuestion: Bool
    let verbCount: Int
    let nounCount: Int
    let tokenCount: Int
  }

  private func analyzePOS(_ text: String) -> POSInfo {
    let tagger = NLTagger(tagSchemes: [.lexicalClass])
    tagger.string = text

    var verbCount = 0
    var nounCount = 0
    var tokenCount = 0
    var firstContentTag: NLTag? = nil
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    let isQuestion = trimmed.hasSuffix("?")

    tagger.enumerateTags(in: text.startIndex..<text.endIndex,
                         unit: .word,
                         scheme: .lexicalClass,
                         options: [.omitPunctuation, .omitWhitespace, .joinContractions]) { tag, _ in
      guard let tag = tag else { return true }
      tokenCount += 1

      if firstContentTag == nil &&
         tag != .determiner &&
         tag != .preposition &&
         tag != .conjunction {
        firstContentTag = tag
      }

      switch tag {
      case .verb:
        verbCount += 1
      case .noun, .personalName, .placeName, .organizationName:
        nounCount += 1
      default:
        break
      }
      return true
    }

    return POSInfo(
      startsWithVerb: firstContentTag == .verb,
      isQuestion: isQuestion,
      verbCount: verbCount,
      nounCount: nounCount,
      tokenCount: tokenCount
    )
  }

  private func getSentimentScore(_ text: String) -> Double {
    let tagger = NLTagger(tagSchemes: [.sentimentScore])
    tagger.string = text
    let (tag, _) = tagger.tag(at: text.startIndex, unit: .paragraph, scheme: .sentimentScore)
    return Double(tag?.rawValue ?? "0") ?? 0.0
  }

  private func hasNamedEntity(_ text: String, types: Set<NLTag>) -> Bool {
    let tagger = NLTagger(tagSchemes: [.nameType])
    tagger.string = text
    var found = false
    tagger.enumerateTags(in: text.startIndex..<text.endIndex,
                         unit: .word,
                         scheme: .nameType,
                         options: [.omitPunctuation, .omitWhitespace, .joinNames]) { tag, _ in
      if let tag = tag, types.contains(tag) {
        found = true
        return false
      }
      return true
    }
    return found
  }

  private func hasFirstPerson(_ lower: String) -> Bool {
    let patterns = ["\\bi\\b", "\\bi'm\\b", "\\bi've\\b", "\\bi feel\\b", "\\bim \\b", "^feeling"]
    return patterns.contains { pattern in
      (try? NSRegularExpression(pattern: pattern, options: []))
        .flatMap { regex in
          regex.firstMatch(in: lower, range: NSRange(lower.startIndex..., in: lower))
        } != nil
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { return false }
}
