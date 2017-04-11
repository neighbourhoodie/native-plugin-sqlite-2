/*
 * Author: Nolan Lawson & Neighbourhoodie Software
 * License: Apache 2
 */

#import <Foundation/Foundation.h>
struct sqlite3; // remove dep on sqlite3.h in this .h file

@interface SQLitePlugin : NSObject {
}

@property (nonatomic, copy) NSMutableDictionary *cachedDatabases;

-(void) exec: (NSArray *)command;
-(void) exec: (NSArray *)command withBlock:(void (^)(NSMutableArray *))callback;
-(void) pluginInitialize;

@end
