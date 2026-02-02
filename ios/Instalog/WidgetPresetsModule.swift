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
  
  // MARK: - React Native Configuration
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false // Can run on background queue
  }
}
