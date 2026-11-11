#ifndef OWN_SCOPED_KEYBOARD_H
#define OWN_SCOPED_KEYBOARD_H
#include <stdint.h>
#include <ApplicationServices/ApplicationServices.h>
typedef struct {
 int32_t expectedPid,observedPid,ownerError,roleError;
 int32_t applicationRoleVerified,keyWhitelisted;
 int32_t attempted,returned,hasApiResult,apiError;
 uint32_t keyCode;
 int32_t keyDown,refusal;
} OwnKeyboardPostResult;
// Caller has already proved exact own child kernel/argv and focused modal window.
// Return1 means SDK call returned; caller STILL requires hasApiResult1/apiError0.
// On uncalled failure apiError=INT32_MIN is an OWN marker, never an AX error.
int32_t OwnPostScopedKeyboard(AXUIElementRef application,int32_t expectedPid,CGKeyCode key,int32_t down,OwnKeyboardPostResult *result);
#endif
