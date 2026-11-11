#ifndef OWN_PICKER_CHILD_H
#define OWN_PICKER_CHILD_H
#include "own-process-identity.h"
#include <stdint.h>
typedef struct {
 int32_t mainPid,mainUid,childCount,candidates,error,childPid,childParent,childUid,state;
 uint64_t startSeconds,startMicroseconds,device,inode;
 int32_t argc,argBytes,argError,complete;
 char path[4096]; char argv[8192];
} OwnPickerChild;
int32_t OwnCopySaveArgv(const OwnPickerChild *value,char *destination,int32_t capacity);
int32_t OwnMainUser(int32_t mainPid,uint64_t seconds,uint64_t micros);
int32_t OwnFindSaveChild(int32_t mainPid,uint64_t mainSeconds,uint64_t mainMicros,uint64_t afterSeconds,uint64_t afterMicros,OwnPickerChild *out);
#endif
