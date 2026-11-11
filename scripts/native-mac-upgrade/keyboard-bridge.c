// Same reviewed application-scoped public API; no global event source or lookup.
#include "keyboard-bridge.h"
#include <Carbon/Carbon.h>
#include <limits.h>
#include <string.h>
int32_t OwnPostScopedKeyboard(AXUIElementRef application,int32_t expectedPid,CGKeyCode key,int32_t down,OwnKeyboardPostResult *out){
 if(!out)return 0;
 memset(out,0,sizeof(*out));out->expectedPid=expectedPid;out->keyCode=(uint32_t)key;out->keyDown=down;out->apiError=INT32_MIN;
 if(!application||expectedPid<=0||CFGetTypeID(application)!=AXUIElementGetTypeID()||(down!=0&&down!=1)){out->refusal=1;return 0;}
 if(key!=kVK_Command&&key!=kVK_Shift&&key!=kVK_ANSI_G){out->refusal=2;return 0;}out->keyWhitelisted=1;
 pid_t pid=0;AXError owner=AXUIElementGetPid(application,&pid);out->ownerError=(int32_t)owner;out->observedPid=(int32_t)pid;
 if(owner!=kAXErrorSuccess||pid!=expectedPid){out->refusal=3;return 0;}
 CFTypeRef role=NULL;AXError roleError=AXUIElementCopyAttributeValue(application,kAXRoleAttribute,&role);out->roleError=(int32_t)roleError;
 int applicationRole=roleError==kAXErrorSuccess&&role&&CFGetTypeID(role)==CFStringGetTypeID()&&CFEqual(role,kAXApplicationRole);
 if(role)CFRelease(role);
 if(!applicationRole){out->refusal=4;return 0;}out->applicationRoleVerified=1;
 pid=0;owner=AXUIElementGetPid(application,&pid);out->ownerError=(int32_t)owner;out->observedPid=(int32_t)pid;
 if(owner!=kAXErrorSuccess||pid!=expectedPid){out->refusal=5;return 0;}
 out->attempted=1;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
 AXError result=AXUIElementPostKeyboardEvent(application,0,key,(Boolean)down);
#pragma clang diagnostic pop
 out->returned=1;out->hasApiResult=1;out->apiError=(int32_t)result;return 1;
}
