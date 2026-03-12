//
//  NLClassifierModule.m
//  Instalog
//
//  Objective-C bridge for NLClassifierModule
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(NLClassifierModule, NSObject)

RCT_EXTERN_METHOD(classifyText:(NSString *)text
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
