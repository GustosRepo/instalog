//
//  WidgetPresetsModule.m
//  Instalog
//
//  Objective-C bridge file for WidgetPresetsModule
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetPresetsModule, NSObject)

// Expose setWidgetConfig method to JavaScript
RCT_EXTERN_METHOD(setWidgetConfig:(NSString *)configJson
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

// Expose loadWidgetConfig method to JavaScript
RCT_EXTERN_METHOD(loadWidgetConfig:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

// Expose saveTasks method to JavaScript
RCT_EXTERN_METHOD(saveTasks:(NSString *)tasksJson
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

// Expose loadTasks method to JavaScript
RCT_EXTERN_METHOD(loadTasks:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

// Expose completeWidgetTask method to JavaScript
RCT_EXTERN_METHOD(completeWidgetTask:(NSString *)taskId
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

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

// Expose syncSubscriptionStatus method to JavaScript
RCT_EXTERN_METHOD(syncSubscriptionStatus:(BOOL)isPro
                  totalLogCount:(NSInteger)totalLogCount
                  freeLogLimit:(NSInteger)freeLogLimit
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
