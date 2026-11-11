#ifndef OWN_NATIVE_EXIT_H
#define OWN_NATIVE_EXIT_H
#include <stdint.h>
enum { OWN_NATIVE_EXIT_ERROR=-1, OWN_NATIVE_EXIT_PENDING=0, OWN_NATIVE_EXIT_TERMINAL=1 };
typedef struct {
 int32_t attempted,active,registered,queueFd,pid;
 uint32_t uid;
 uint64_t startSeconds,startMicroseconds,device,inode;
 int32_t error,systemError,infoBytes,pathBytes;
 int32_t registrationReturn,registrationError,postRegistrationIdentityVerified;
 uint64_t receiptIdent;
 int32_t receiptFilter;
 uint32_t receiptFlags,receiptFflags;
 int64_t receiptData;
 uint64_t registeredMonotonicNanoseconds;
 uint32_t sdkNoteExit,sdkNoteExitStatus,sdkEventError,sdkEventReceipt;
 int32_t sdkFilterProc,sdkSizeofKevent,terminalConsumed;
} OwnNativeExitRegistration;
typedef struct {
 int32_t state,error,apiReturn,systemError,pid;
 uint64_t eventIdent;
 int32_t eventFilter;
 uint32_t eventFlags,eventFflags;
 int64_t eventData;
 int32_t terminalObserved,normalExit,exitCode;
} OwnNativeExitResult;
// Zero-initialize registration. ONE register attempt for the already-qualified own app.
// Returns1 only after successful EV_RECEIPT plus stable post-registration identity.
int32_t OwnRegisterNativeExit(int32_t pid,uint64_t seconds,uint64_t micros,const char *expectedPath,OwnNativeExitRegistration *registration);
// <=200ms; ERROR=-1, PENDING=0, TERMINAL=1. Terminal does NOT imply normal0:
// caller requires terminalObserved==1,normalExit==1,exitCode==0 from SDK decoding.
int32_t OwnPollNativeExit(OwnNativeExitRegistration *registration,int32_t timeoutMilliseconds,OwnNativeExitResult *result);
// Closes only this controller-owned kqueue; no signals or target process operation.
void OwnCloseNativeExit(OwnNativeExitRegistration *registration);
#endif
