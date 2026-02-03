//
//  StoreKitModule.m
//  Instalog
//
//  Objective-C bridge for StoreKitModule
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(StoreKitModule, NSObject)

RCT_EXTERN_METHOD(loadProducts:(RCTPromiseResolveBlock)resolver rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(purchase:(NSString *)productId resolver:(RCTPromiseResolveBlock)resolver rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(restorePurchases:(RCTPromiseResolveBlock)resolver rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(checkSubscriptionStatus:(RCTPromiseResolveBlock)resolver rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(startTransactionListener)

@end
