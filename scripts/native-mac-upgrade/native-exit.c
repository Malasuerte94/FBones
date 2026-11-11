// Exact-known-own native process only. Actual Darwin SDK ABI; never signals/attach.
#include "native-exit.h"
#include <sys/event.h>
#include <sys/proc_info.h>
#include <sys/proc.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <libproc.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <limits.h>
#include <stddef.h>
#include <string.h>
#include <time.h>
typedef struct {uint32_t uid;uint64_t seconds,micros,device,inode;int infoBytes,pathBytes;} OwnExitIdentity;
static int own_identity(int32_t pid,const char *expected,OwnExitIdentity *out){
 struct proc_bsdinfo info;char actual[PROC_PIDPATHINFO_MAXSIZE];struct stat known,observed;
 memset(&info,0,sizeof(info));memset(actual,0,sizeof(actual));memset(out,0,sizeof(*out));
 if(pid<=0||!expected||expected[0]!='/'||strnlen(expected,4096)>=4096)return 0;
 out->infoBytes=proc_pidinfo(pid,PROC_PIDTBSDINFO,0,&info,(int)sizeof(info));
 out->pathBytes=proc_pidpath(pid,actual,(uint32_t)sizeof(actual));size_t length=strnlen(actual,sizeof(actual));
 if(out->infoBytes!=(int)sizeof(info)||info.pbi_pid!=(uint32_t)pid||info.pbi_uid!=getuid()||info.pbi_status==SZOMB||info.pbi_start_tvsec==0||info.pbi_start_tvusec>=1000000||out->pathBytes<=0||length==0||length>=sizeof(actual)||actual[0]!='/')return 0;
 if(lstat(expected,&known)!=0||stat(actual,&observed)!=0||!S_ISREG(known.st_mode)||!S_ISREG(observed.st_mode)||known.st_ino==0||observed.st_ino==0||known.st_dev!=observed.st_dev||known.st_ino!=observed.st_ino)return 0;
 out->uid=info.pbi_uid;out->seconds=info.pbi_start_tvsec;out->micros=info.pbi_start_tvusec;out->device=(uint64_t)observed.st_dev;out->inode=(uint64_t)observed.st_ino;return 1;
}
static int same_identity(const OwnExitIdentity *a,const OwnExitIdentity *b){return a->uid==b->uid&&a->seconds==b->seconds&&a->micros==b->micros&&a->device==b->device&&a->inode==b->inode;}
void OwnCloseNativeExit(OwnNativeExitRegistration *r){if(r&&r->active==1){int fd=r->queueFd;r->active=0;r->queueFd=-1;if(fd>=0)(void)close(fd);}}
static int32_t refuse(OwnNativeExitRegistration *r,int32_t error){int saved=errno;r->error=error;r->systemError=saved;OwnCloseNativeExit(r);return 0;}
int32_t OwnRegisterNativeExit(int32_t pid,uint64_t seconds,uint64_t micros,const char *expected,OwnNativeExitRegistration *r){
 if(!r)return 0;if(r->attempted!=0)return 0;
 memset(r,0,sizeof(*r));r->attempted=1;r->queueFd=-1;r->pid=pid;r->registrationReturn=-1;
 r->sdkNoteExit=NOTE_EXIT;r->sdkNoteExitStatus=NOTE_EXITSTATUS;r->sdkEventError=EV_ERROR;r->sdkEventReceipt=EV_RECEIPT;r->sdkFilterProc=EVFILT_PROC;r->sdkSizeofKevent=(int32_t)sizeof(struct kevent);
 OwnExitIdentity before,after;errno=0;
 if(seconds==0||micros>=1000000||!own_identity(pid,expected,&before))return refuse(r,1);
 r->infoBytes=before.infoBytes;r->pathBytes=before.pathBytes;r->uid=before.uid;r->startSeconds=before.seconds;r->startMicroseconds=before.micros;r->device=before.device;r->inode=before.inode;
 if(before.seconds!=seconds||before.micros!=micros)return refuse(r,2);
 errno=0;r->queueFd=kqueue();if(r->queueFd<0)return refuse(r,3);r->active=1;
 int flags=fcntl(r->queueFd,F_GETFD);if(flags<0||fcntl(r->queueFd,F_SETFD,flags|FD_CLOEXEC)<0)return refuse(r,4);
 struct kevent change,receipt;struct timespec zero={0,0};memset(&receipt,0,sizeof(receipt));
 EV_SET(&change,(uintptr_t)pid,EVFILT_PROC,EV_ADD|EV_ENABLE|EV_ONESHOT|EV_RECEIPT,NOTE_EXIT|NOTE_EXITSTATUS,0,NULL);
 errno=0;r->registrationReturn=kevent(r->queueFd,&change,1,&receipt,1,&zero);r->registrationError=errno;
 r->receiptIdent=(uint64_t)receipt.ident;r->receiptFilter=receipt.filter;r->receiptFlags=receipt.flags;r->receiptFflags=receipt.fflags;r->receiptData=(int64_t)receipt.data;
 if(r->registrationReturn!=1||receipt.ident!=(uintptr_t)pid||receipt.filter!=EVFILT_PROC||(receipt.flags&EV_ERROR)==0||receipt.data!=0)return refuse(r,5);
 errno=0;if(!own_identity(pid,expected,&after)||!same_identity(&before,&after))return refuse(r,6);
 r->postRegistrationIdentityVerified=1;
 struct timespec now;if(clock_gettime(CLOCK_MONOTONIC,&now)!=0||now.tv_sec<0||now.tv_nsec<0||now.tv_nsec>=1000000000)return refuse(r,7);
 r->registeredMonotonicNanoseconds=(uint64_t)now.tv_sec*UINT64_C(1000000000)+(uint64_t)now.tv_nsec;r->registered=1;return 1;
}
int32_t OwnPollNativeExit(OwnNativeExitRegistration *r,int32_t timeoutMilliseconds,OwnNativeExitResult *out){
 if(!out)return OWN_NATIVE_EXIT_ERROR;memset(out,0,sizeof(*out));out->state=OWN_NATIVE_EXIT_ERROR;out->exitCode=-1;out->apiReturn=-1;
 if(!r||r->registered!=1||r->active!=1||r->queueFd<0||r->terminalConsumed!=0||timeoutMilliseconds<0||timeoutMilliseconds>200){out->error=1;return out->state;}
 out->pid=r->pid;struct timespec timeout={0,(long)timeoutMilliseconds*1000000L};struct kevent event;memset(&event,0,sizeof(event));
 errno=0;out->apiReturn=kevent(r->queueFd,NULL,0,&event,1,&timeout);out->systemError=errno;
 if(out->apiReturn==0){out->state=OWN_NATIVE_EXIT_PENDING;return out->state;}
 if(out->apiReturn!=1){out->error=2;return out->state;}
 out->eventIdent=(uint64_t)event.ident;out->eventFilter=event.filter;out->eventFlags=event.flags;out->eventFflags=event.fflags;out->eventData=(int64_t)event.data;
 r->terminalConsumed=1;
 if(event.ident!=(uintptr_t)r->pid||event.filter!=EVFILT_PROC||(event.fflags&NOTE_EXIT)==0||(event.flags&EV_ERROR)!=0||event.data<INT_MIN||event.data>INT_MAX){out->error=3;return out->state;}
 int status=(int)event.data;out->terminalObserved=1;out->normalExit=WIFEXITED(status)?1:0;if(out->normalExit)out->exitCode=WEXITSTATUS(status);out->state=OWN_NATIVE_EXIT_TERMINAL;return out->state;
}
