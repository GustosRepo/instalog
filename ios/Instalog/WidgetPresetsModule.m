//
//  WidgetPresetsModule.m
//  Instalog
//
//  Objective-C bridge file for WidgetPresetsModule
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetPresetsModule, NSObject)

// Expose setWidgetPresets method to JavaScript
RCT_EXTERN_METHOD(setWidgetPresets:(NSString *)presetsJson
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

// Expose saveLogs method to JavaScript
RCT_EXTERN_METHOD(saveLogs:(NSString *)logsJson
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

// Expose loadLogs method to JavaScript
RCT_EXTERN_METHOD(loadLogs:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

// Expose loadPresets method to JavaScript
RCT_EXTERN_METHOD(loadPresets:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
