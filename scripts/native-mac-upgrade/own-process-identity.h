#ifndef OWN_PROCESS_IDENTITY_H
#define OWN_PROCESS_IDENTITY_H
#include <stdint.h>
#define OWN_PROCESS_PATH_CAPACITY 4096
typedef struct {
 int32_t requestedPid, observedPid, infoBytes, infoError, pathBytes, pathError;
 int32_t expectedStatError, actualStatError;
 uint32_t infoValid, pathValid, fileIdentityValid, sameFile;
 uint64_t startSeconds, startMicroseconds, expectedDevice, expectedInode, actualDevice, actualInode;
 char actualPath[OWN_PROCESS_PATH_CAPACITY];
} OwnProcessIdentity;
// Caller supplies ONLY a retained freshly-created own child OR a qualified exact
// own-bundle NSWorkspace notification app, with known own image. No PID discovery.
// No process selector, target memory, privilege, write, injection, launch or close.
int32_t OwnReadProcessIdentity(int32_t pid, const char *expectedPath, OwnProcessIdentity *result);
#endif
