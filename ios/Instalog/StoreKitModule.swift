//
//  StoreKitModule.swift
//  Instalog
//
//  StoreKit 2 native module for in-app purchases
//

import Foundation
import StoreKit

@objc(StoreKitModule)
class StoreKitModule: NSObject {
  
  // MARK: - Product IDs
  private let productIds = [
    "pro_monthly",
    "pro_yearly"
  ]
  
  // MARK: - Cached Products
  private var products: [Product] = []
  
  // MARK: - React Native Bridge Methods
  
  /// Load available products from App Store
  @objc
  func loadProducts(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    Task {
      do {
        let products = try await Product.products(for: productIds)
        self.products = products
        
        let productData = products.map { product -> [String: Any] in
          return [
            "id": product.id,
            "displayName": product.displayName,
            "description": product.description,
            "price": product.price.description,
            "displayPrice": product.displayPrice,
            "type": product.type == .autoRenewable ? "subscription" : "consumable"
          ]
        }
        
        resolver(productData)
      } catch {
        rejecter("PRODUCTS_ERROR", "Failed to load products: \(error.localizedDescription)", error)
      }
    }
  }
  
  /// Purchase a product
  @objc
  func purchase(_ productId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    Task {
      do {
        // Find the product
        guard let product = products.first(where: { $0.id == productId }) else {
          // Try loading products first
          let loadedProducts = try await Product.products(for: [productId])
          guard let product = loadedProducts.first else {
            rejecter("PRODUCT_NOT_FOUND", "Product not found: \(productId)", nil)
            return
          }
          
          let result = try await purchaseProduct(product)
          resolver(result)
          return
        }
        
        let result = try await purchaseProduct(product)
        resolver(result)
      } catch {
        rejecter("PURCHASE_ERROR", "Purchase failed: \(error.localizedDescription)", error)
      }
    }
  }
  
  private func purchaseProduct(_ product: Product) async throws -> [String: Any] {
    let result = try await product.purchase()
    
    switch result {
    case .success(let verification):
      switch verification {
      case .verified(let transaction):
        // Finish the transaction
        await transaction.finish()
        
        // Save Pro status
        savePurchaseStatus(true)
        
        return [
          "success": true,
          "productId": product.id,
          "transactionId": String(transaction.id)
        ]
        
      case .unverified(_, let error):
        throw error
      }
      
    case .userCancelled:
      return [
        "success": false,
        "cancelled": true
      ]
      
    case .pending:
      return [
        "success": false,
        "pending": true
      ]
      
    @unknown default:
      return [
        "success": false,
        "unknown": true
      ]
    }
  }
  
  /// Restore purchases
  @objc
  func restorePurchases(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    Task {
      var hasActiveSubscription = false
      
      // Check current entitlements
      for await result in Transaction.currentEntitlements {
        switch result {
        case .verified(let transaction):
          if productIds.contains(transaction.productID) {
            hasActiveSubscription = true
            break
          }
        case .unverified:
          continue
        }
      }
      
      savePurchaseStatus(hasActiveSubscription)
      
      resolver([
        "restored": hasActiveSubscription,
        "hasActiveSubscription": hasActiveSubscription
      ])
    }
  }
  
  /// Check current subscription status
  @objc
  func checkSubscriptionStatus(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    Task {
      var hasActiveSubscription = false
      var subscriptionInfo: [String: Any]? = nil
      
      for await result in Transaction.currentEntitlements {
        switch result {
        case .verified(let transaction):
          if productIds.contains(transaction.productID) {
            hasActiveSubscription = true
            subscriptionInfo = [
              "productId": transaction.productID,
              "expirationDate": transaction.expirationDate?.timeIntervalSince1970 ?? 0,
              "isUpgraded": transaction.isUpgraded
            ]
            break
          }
        case .unverified:
          continue
        }
      }
      
      savePurchaseStatus(hasActiveSubscription)
      
      resolver([
        "isPro": hasActiveSubscription,
        "subscription": subscriptionInfo as Any
      ])
    }
  }
  
  // MARK: - Helpers
  
  private func savePurchaseStatus(_ isPro: Bool) {
    // Save to App Group so it persists
    let defaults = UserDefaults(suiteName: "group.com.instalog.shared")
    defaults?.set(isPro ? "pro" : "free", forKey: "@instalog/subscription_tier")
    defaults?.synchronize()
    
    // Also save to standard UserDefaults
    UserDefaults.standard.set(isPro ? "pro" : "free", forKey: "@instalog/subscription_tier")
    UserDefaults.standard.synchronize()
  }
  
  // MARK: - Transaction Listener
  
  /// Start listening for transaction updates (call on app launch)
  @objc
  func startTransactionListener() {
    Task {
      for await result in Transaction.updates {
        switch result {
        case .verified(let transaction):
          if productIds.contains(transaction.productID) {
            savePurchaseStatus(true)
            await transaction.finish()
          }
        case .unverified:
          break
        }
      }
    }
  }
  
  // MARK: - React Native Configuration
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
