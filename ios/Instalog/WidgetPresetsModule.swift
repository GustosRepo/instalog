//
//  WidgetPresetsModule.swift
//  Instalog
//
//  Native module to save widget presets to App Group UserDefaults
//

import Foundation
import WidgetKit

@objc(WidgetPresetsModule)
class WidgetPresetsModule: NSObject {
  
  // MARK: - Constants
  private let appGroupIdentifier = "group.com.instalog.shared"
  private let presetsKey = "@instalog/presets"
  private let logsKey = "@instalog/logs"
  private let tasksKey = "@instalog/tasks"
  private let widgetConfigKey = "@instalog/widgetConfig"
  
  @objc
  func setWidgetConfig(_ configJson: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      rejecter("APP_GROUP_ERROR", "Failed to access App Group UserDefaults", nil)
      return
    }
    guard let configData = configJson.data(using: .utf8),
          let _ = try? JSONSerialization.jsonObject(with: configData, options: []) else {
      rejecter("JSON_ERROR", "Invalid JSON string", nil)
      return
    }
    userDefaults.set(configJson, forKey: widgetConfigKey)
    userDefaults.synchronize()
    WidgetCenter.shared.reloadAllTimelines()
    resolver(["success": true])
  }

  @objc
  func loadWidgetConfig(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      rejecter("APP_GROUP_ERROR", "Failed to access App Group UserDefaults", nil)
      return
    }
    if let configJson = userDefaults.string(forKey: widgetConfigKey) {
      resolver(configJson)
    } else {
      resolver("null")
    }
  }

  @objc
  func saveTasks(_ tasksJson: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      rejecter("APP_GROUP_ERROR", "Failed to access App Group UserDefaults", nil)
      return
    }
    userDefaults.set(tasksJson, forKey: tasksKey)
    userDefaults.synchronize()
    WidgetCenter.shared.reloadAllTimelines()
    resolver(["success": true])
  }

  @objc
  func loadTasks(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      rejecter("APP_GROUP_ERROR", "Failed to access App Group UserDefaults", nil)
      return
    }
    resolver(userDefaults.string(forKey: tasksKey) ?? "[]")
  }

  @objc
  func completeWidgetTask(_ taskId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier),
          let json = userDefaults.string(forKey: tasksKey),
          let data = json.data(using: .utf8),
          var tasks = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
      rejecter("ERROR", "Failed to read tasks", nil)
      return
    }
    let now = ISO8601DateFormatter().string(from: Date())
    tasks = tasks.map { task in
      var t = task
      if let id = t["id"] as? String, id == taskId {
        t["completedAt"] = now
      }
      return t
    }
    if let updated = try? JSONSerialization.data(withJSONObject: tasks),
       let updatedJson = String(data: updated, encoding: .utf8) {
      userDefaults.set(updatedJson, forKey: tasksKey)
      userDefaults.synchronize()
      WidgetCenter.shared.reloadAllTimelines()
    }
    resolver(["success": true])
  }

  // MARK: - React Native Bridge Methods

  @objc
  func setWidgetPresets(_ presetsJson: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    
    // 1. Get App Group UserDefaults
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      rejecter("APP_GROUP_ERROR", "Failed to access App Group UserDefaults", nil)
      return
    }
    
    // 2. Validate JSON
    guard let presetsData = presetsJson.data(using: .utf8) else {
      rejecter("JSON_ERROR", "Invalid JSON string", nil)
      return
    }
    
    // 3. Parse JSON to verify structure
    do {
      let jsonArray = try JSONSerialization.jsonObject(with: presetsData, options: [])
      guard let _ = jsonArray as? [[String: Any]] else {
        rejecter("JSON_ERROR", "Presets must be an array of objects", nil)
        return
      }
    } catch {
      rejecter("JSON_ERROR", "Failed to parse JSON: \(error.localizedDescription)", error)
      return
    }
    
    // 4. Save presets JSON string to App Group
    userDefaults.set(presetsJson, forKey: presetsKey)
    userDefaults.synchronize()
    
    // 5. Reload widget timelines
    WidgetCenter.shared.reloadAllTimelines()
    
    // 6. Success
    resolver(["success": true])
  }
  
  @objc
  func saveLogs(_ logsJson: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      rejecter("APP_GROUP_ERROR", "Failed to access App Group UserDefaults", nil)
      return
    }
    
    userDefaults.set(logsJson, forKey: logsKey)
    userDefaults.synchronize()
    
    // Reload widget to show updated count
    WidgetCenter.shared.reloadAllTimelines()
    
    resolver(["success": true])
  }
  
  @objc
  func loadLogs(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      rejecter("APP_GROUP_ERROR", "Failed to access App Group UserDefaults", nil)
      return
    }
    
    if let logsJson = userDefaults.string(forKey: logsKey) {
      resolver(logsJson)
    } else {
      resolver("[]") // Return empty array if no logs
    }
  }
  
  @objc
  func loadPresets(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      rejecter("APP_GROUP_ERROR", "Failed to access App Group UserDefaults", nil)
      return
    }
    
    if let presetsJson = userDefaults.string(forKey: presetsKey) {
      resolver(presetsJson)
    } else {
      resolver("[]") // Return empty array if no presets
    }
  }
  
  @objc
  func syncSubscriptionStatus(_ isPro: Bool, totalLogCount: Int, freeLogLimit: Int, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      rejecter("APP_GROUP_ERROR", "Failed to access App Group UserDefaults", nil)
      return
    }
    
    userDefaults.set(isPro, forKey: "@instalog/isPro")
    userDefaults.set(totalLogCount, forKey: "@instalog/totalLogCount")
    userDefaults.set(freeLogLimit, forKey: "@instalog/freeLogLimit")
    userDefaults.synchronize()
    
    // Reload widgets
    WidgetCenter.shared.reloadAllTimelines()
    
    resolver(["success": true])
  }
  
  // MARK: - React Native Configuration
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false // Can run on background queue
  }
}
