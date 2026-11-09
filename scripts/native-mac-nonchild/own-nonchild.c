// One data-free owned lifecycle fixture; actual Darwin SDK types/constants only.
#include <sys/event.h>
#include <sys/proc_info.h>
#include <sys/proc.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <libproc.h>
#include <spawn.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <limits.h>
#include <stdint.h>
#include <stddef.h>
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
extern char **environ;
#define READY_MAGIC UINT32_C(0x4f574e37)
typedef struct {int32_t pid,ppid;uint32_t uid,status;uint64_t seconds,micros,device,inode;} Identity;
typedef struct {uint32_t magic;char nonce[33];Identity worker;} Ready;
static double now(void){struct timespec t;if(clock_gettime(CLOCK_MONOTONIC,&t)!=0){perror("own monotonic clock failed");_exit(96);}return(double)t.tv_sec+(double)t.tv_nsec/1e9;}
static void pause_short(void){struct timespec t={0,10000000};nanosleep(&t,NULL);}
static int path_join(char*out,size_t n,const char*root,const char*leaf){int v=snprintf(out,n,"%s/%s",root,leaf);return v>0&&(size_t)v<n;}
static int write_new(const char*path,const void*bytes,size_t n){int fd=open(path,O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600);if(fd<0)return 0;ssize_t count=write(fd,bytes,n);int ok=count==(ssize_t)n&&fsync(fd)==0;int saved=errno;if(close(fd)!=0)ok=0;errno=saved;return ok;}
static int read_exact(const char*path,void*bytes,size_t n){int fd=open(path,O_RDONLY|O_NOFOLLOW|O_CLOEXEC);if(fd<0)return 0;struct stat st;char extra;int ok=fstat(fd,&st)==0&&S_ISREG(st.st_mode)&&st.st_uid==getuid()&&st.st_size==(off_t)n&&read(fd,bytes,n)==(ssize_t)n&&read(fd,&extra,1)==0;close(fd);return ok;}
static int identity(pid_t pid,const char*image,Identity*out){struct proc_bsdinfo b;char actual[PROC_PIDPATHINFO_MAXSIZE];struct stat expected,observed;memset(&b,0,sizeof(b));memset(actual,0,sizeof(actual));memset(out,0,sizeof(*out));int info=proc_pidinfo(pid,PROC_PIDTBSDINFO,0,&b,(int)sizeof(b));int path=proc_pidpath(pid,actual,(uint32_t)sizeof(actual));size_t n=strnlen(actual,sizeof(actual));if(info!=(int)sizeof(b)||b.pbi_pid!=(uint32_t)pid||b.pbi_uid!=getuid()||b.pbi_status==SZOMB||b.pbi_start_tvsec==0||b.pbi_start_tvusec>=1000000||path<=0||n==0||n>=sizeof(actual)||stat(image,&expected)!=0||stat(actual,&observed)!=0||!S_ISREG(expected.st_mode)||!S_ISREG(observed.st_mode)||!expected.st_ino||!observed.st_ino||expected.st_dev!=observed.st_dev||expected.st_ino!=observed.st_ino)return 0;out->pid=(int32_t)b.pbi_pid;out->ppid=(int32_t)b.pbi_ppid;out->uid=b.pbi_uid;out->status=b.pbi_status;out->seconds=b.pbi_start_tvsec;out->micros=b.pbi_start_tvusec;out->device=(uint64_t)observed.st_dev;out->inode=(uint64_t)observed.st_ino;return 1;}
static int same(const Identity*a,const Identity*b){return a->pid==b->pid&&a->uid==b->uid&&a->seconds==b->seconds&&a->micros==b->micros&&a->device==b->device&&a->inode==b->inode;}
static int ready_read(const char*path,const char*nonce,Ready*out){memset(out,0,sizeof(*out));return read_exact(path,out,sizeof(*out))&&out->magic==READY_MAGIC&&out->nonce[32]==0&&memcmp(out->nonce,nonce,33)==0&&out->worker.pid>0;}
static void identity_json(FILE*f,const Identity*p){fprintf(f,"{\"pid\":%"PRId32",\"ppid\":%"PRId32",\"uid\":%"PRIu32",\"sdkStatus\":%"PRIu32",\"startSeconds\":%"PRIu64",\"startMicroseconds\":%"PRIu64",\"device\":%"PRIu64",\"inode\":%"PRIu64"}",p->pid,p->ppid,p->uid,p->status,p->seconds,p->micros,p->device,p->inode);}
static int worker(const char*root,const char*nonce,const char*image){char ready_path[PATH_MAX],ack_path[PATH_MAX],receipt_path[PATH_MAX];if(!path_join(ready_path,sizeof(ready_path),root,"ready.bin")||!path_join(ack_path,sizeof(ack_path),root,"ack")||!path_join(receipt_path,sizeof(receipt_path),root,"reports/worker-ready.json"))return 25;Ready r;memset(&r,0,sizeof(r));r.magic=READY_MAGIC;memcpy(r.nonce,nonce,33);if(!identity(getpid(),image,&r.worker)||r.worker.ppid!=(int32_t)getppid())return 26;int fd=open(receipt_path,O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600);if(fd<0)return 26;FILE*f=fdopen(fd,"w");if(!f){close(fd);return 26;}fputs("{\"originalIdentity\":",f);identity_json(f,&r.worker);fputs(",\"knownVoluntaryExit\":7,\"ackTimeoutExit\":27}\n",f);if(fclose(f)!=0||!write_new(ready_path,&r,sizeof(r)))return 26;double deadline=now()+20;char ack[33];while(now()<deadline){if(read_exact(ack_path,ack,sizeof(ack))&&memcmp(ack,nonce,33)==0)return 7;pause_short();}return 27;}
static int launcher(const char*root,const char*nonce,const char*image){char start_path[PATH_MAX],start[33];if(!path_join(start_path,sizeof(start_path),root,"controller-bound"))return 28;double start_end=now()+5;int bound=0;while(now()<start_end){if(read_exact(start_path,start,sizeof(start))&&memcmp(start,nonce,33)==0){bound=1;break;}pause_short();}if(!bound)return 28;pid_t child=fork();if(child<0)return 21;if(child==0)_exit(worker(root,nonce,image));char path[PATH_MAX],receipt[PATH_MAX];if(!path_join(path,sizeof(path),root,"ready.bin")||!path_join(receipt,sizeof(receipt),root,"reports/launcher-child.json"))return 22;Ready r;double end=now()+5;while(now()<end){if(ready_read(path,nonce,&r)&&r.worker.pid==(int32_t)child&&r.worker.ppid==(int32_t)getpid()){char data[512];int n=snprintf(data,sizeof(data),"{\"launcherPid\":%ld,\"controllerParentPid\":%ld,\"forkReturnedWorkerPid\":%ld,\"readyOriginalParent\":%"PRId32",\"exitCode\":0}\n",(long)getpid(),(long)getppid(),(long)child,r.worker.ppid);return n>0&&(size_t)n<sizeof(data)&&write_new(receipt,data,(size_t)n)?0:23;}pause_short();}return 24;}
static void event_json(FILE*f,const struct kevent*e){fprintf(f,"{\"ident\":%"PRIuPTR",\"filter\":%d,\"flags\":%u,\"fflags\":%u,\"data\":%"PRIdPTR"}",e->ident,(int)e->filter,(unsigned)e->flags,(unsigned)e->fflags,e->data);}
int main(int argc,char**argv){
 char root[PATH_MAX],image[PROC_PIDPATHINFO_MAXSIZE];memset(image,0,sizeof(image));if(!getenv("GITHUB_ACTIONS")||strcmp(getenv("GITHUB_ACTIONS"),"true")||!getenv("RUNNER_ENVIRONMENT")||strcmp(getenv("RUNNER_ENVIRONMENT"),"github-hosted")||!getenv("RUNNER_OS")||strcmp(getenv("RUNNER_OS"),"macOS"))return 90;
 int image_n=proc_pidpath(getpid(),image,(uint32_t)sizeof(image));if((argc!=2&&argc!=4)||!realpath(argc==2?argv[1]:argv[2],root)||image_n<=0||image_n>=(int)sizeof(image)||strnlen(image,sizeof(image))>=sizeof(image))return 91;char canonical_temp[PATH_MAX];const char*temp=getenv("RUNNER_TEMP");if(!temp||!realpath(temp,canonical_temp))return 92;temp=canonical_temp;size_t temp_n=strlen(temp);struct stat dir;if(!temp_n||strncmp(root,temp,temp_n)||root[temp_n]!='/'||stat(root,&dir)||!S_ISDIR(dir.st_mode)||dir.st_uid!=getuid())return 92;
 if(argc==4){if(strcmp(argv[1],"--launcher")||strlen(argv[3])!=32)return 93;return launcher(root,argv[3],image);}
 char nonce[33],ready_path[PATH_MAX],ack_path[PATH_MAX],log_path[PATH_MAX],result_path[PATH_MAX];unsigned char entropy[16];arc4random_buf(entropy,sizeof(entropy));for(int i=0;i<16;i++)snprintf(nonce+i*2,3,"%02x",entropy[i]);nonce[32]=0;
 if(!path_join(ready_path,sizeof(ready_path),root,"ready.bin")||!path_join(ack_path,sizeof(ack_path),root,"ack")||!path_join(log_path,sizeof(log_path),root,"launcher.log")||!path_join(result_path,sizeof(result_path),root,"reports/result.json"))return 94;
 int passed=0,kq=-1,spawn_code=-1,launcher_status=0,launcher_observed=0,nonchild_result=0,nonchild_errno=0,reg_count=-2,reg_errno=0,event_count=-2,event_errno=0,ack_written=0,event_valid=0,normal=0,exit_code=-1;const char*failure="initial";pid_t launcher_pid=0;Identity controller_id,launcher_id,worker_id,current;memset(&controller_id,0,sizeof(controller_id));memset(&launcher_id,0,sizeof(launcher_id));memset(&worker_id,0,sizeof(worker_id));struct kevent receipt,event;memset(&receipt,0,sizeof(receipt));memset(&event,0,sizeof(event));Ready ready;memset(&ready,0,sizeof(ready));double began=now(),registration_at=-1,ack_at=-1,event_at=-1;
 if(!identity(getpid(),image,&controller_id)){failure="controller_identity";goto done;}
 posix_spawn_file_actions_t actions;posix_spawnattr_t attr;int actions_ready=0,attr_ready=0; // disposed before any wait
 if(posix_spawn_file_actions_init(&actions)!=0){failure="spawn_actions";goto done;}actions_ready=1;
 if(posix_spawnattr_init(&attr)!=0){posix_spawn_file_actions_destroy(&actions);failure="spawn_attr";goto done;}attr_ready=1;
 if(posix_spawnattr_setflags(&attr,POSIX_SPAWN_CLOEXEC_DEFAULT)!=0||posix_spawn_file_actions_addopen(&actions,0,"/dev/null",O_RDONLY,0)!=0||posix_spawn_file_actions_addopen(&actions,1,log_path,O_WRONLY|O_CREAT|O_EXCL,0600)!=0||posix_spawn_file_actions_adddup2(&actions,1,2)!=0){failure="spawn_stdio";posix_spawn_file_actions_destroy(&actions);posix_spawnattr_destroy(&attr);goto done;}
 char*child_args[]={image,"--launcher",root,nonce,NULL};spawn_code=posix_spawn(&launcher_pid,image,&actions,&attr,child_args,environ);if(actions_ready)posix_spawn_file_actions_destroy(&actions);if(attr_ready)posix_spawnattr_destroy(&attr);if(spawn_code){failure="spawn_failure";goto done;}
 if(!identity(launcher_pid,image,&launcher_id)||launcher_id.ppid!=(int32_t)getpid()){failure="created_launcher_identity";goto done;}
 {char marker[PATH_MAX];if(!path_join(marker,sizeof(marker),root,"controller-bound")||!write_new(marker,nonce,sizeof(nonce))){failure="created_launcher_bound_marker";goto done;}}
 {double end=now()+8;while(now()<end){pid_t observed=waitpid(launcher_pid,&launcher_status,WNOHANG);if(observed==launcher_pid){launcher_observed=1;break;}if(observed<0){failure="launcher_wait_error";goto done;}pause_short();}}
 if(!launcher_observed||!WIFEXITED(launcher_status)||WEXITSTATUS(launcher_status)!=0){failure="launcher_terminal_not_zero";goto done;}
 if(!ready_read(ready_path,nonce,&ready)||ready.worker.ppid!=(int32_t)launcher_pid||!identity((pid_t)ready.worker.pid,image,&worker_id)||!same(&ready.worker,&worker_id)||worker_id.ppid==(int32_t)getpid()){failure="bound_worker_identity_or_parent";goto done;}
 errno=0;{int status=0;nonchild_result=(int)waitpid((pid_t)worker_id.pid,&status,WNOHANG);nonchild_errno=errno;}if(nonchild_result!=-1||nonchild_errno!=ECHILD){failure="not_proven_nonchild";goto done;}
 if(!identity((pid_t)worker_id.pid,image,&current)||!same(&worker_id,&current)){failure="worker_changed_before_registration";goto done;}
 kq=kqueue();if(kq<0){failure="kqueue_unavailable";goto done;}fcntl(kq,F_SETFD,FD_CLOEXEC);
 {struct kevent change;struct timespec zero={0,0};EV_SET(&change,(uintptr_t)worker_id.pid,EVFILT_PROC,EV_ADD|EV_ENABLE|EV_ONESHOT|EV_RECEIPT,NOTE_EXIT|NOTE_EXITSTATUS,0,NULL);errno=0;reg_count=kevent(kq,&change,1,&receipt,1,&zero);reg_errno=errno;registration_at=now()-began;}
 if(reg_count!=1||receipt.ident!=(uintptr_t)worker_id.pid||receipt.filter!=EVFILT_PROC||!(receipt.flags&EV_ERROR)||receipt.data!=0){failure="registration_receipt_failure";goto done;}
 if(!identity((pid_t)worker_id.pid,image,&current)||!same(&worker_id,&current)){failure="worker_changed_before_ack";goto done;}errno=0;{int status=0;int r=(int)waitpid((pid_t)worker_id.pid,&status,WNOHANG);if(r!=-1||errno!=ECHILD){failure="nonchild_changed_before_ack";goto done;}}
 ack_written=write_new(ack_path,nonce,sizeof(nonce));ack_at=now()-began;if(!ack_written){failure="one_ack_write_failed";goto done;}
 {struct timespec timeout={15,0};errno=0;event_count=kevent(kq,NULL,0,&event,1,&timeout);event_errno=errno;event_at=now()-began;}
 if(event_count!=1||event.ident!=(uintptr_t)worker_id.pid||event.filter!=EVFILT_PROC||!(event.fflags&NOTE_EXIT)||(event.flags&EV_ERROR)||event.data<INT_MIN||event.data>INT_MAX){failure="exit_event_missing_invalid_or_overflow";goto done;}
 event_valid=1;{int status=(int)event.data;normal=WIFEXITED(status);if(normal)exit_code=WEXITSTATUS(status);}if(!normal||exit_code!=7){failure="SDK_wait_macros_not_normal7";goto done;}passed=1;failure="none";
 done:
 if(kq>=0)close(kq);int fd=open(result_path,O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600);if(fd<0)return 95;FILE*f=fdopen(fd,"w");if(!f){close(fd);return 95;}
 fprintf(f,"{\"passed\":%s,\"failure\":\"%s\",\"scope\":\"OWN_known_nonchild_exit_only\",\"signalsSent\":0,\"noteTrackUsed\":false,\"controller\":",passed?"true":"false",failure);identity_json(f,&controller_id);fputs(",\"launcher\":",f);identity_json(f,&launcher_id);fputs(",\"workerOriginal\":",f);identity_json(f,&ready.worker);fputs(",\"workerAfterLauncherExit\":",f);identity_json(f,&worker_id);
 fprintf(f,",\"spawnReturn\":%d,\"launcherTerminalObserved\":%s,\"launcherRawWaitStatus\":%d,\"launcherNormalZero\":%s,\"workerWaitpidReturn\":%d,\"workerWaitpidErrno\":%d,\"sdkECHILD\":%d,\"registrationReturn\":%d,\"registrationErrno\":%d,\"registrationReceipt\":",spawn_code,launcher_observed?"true":"false",launcher_status,launcher_observed&&WIFEXITED(launcher_status)&&WEXITSTATUS(launcher_status)==0?"true":"false",nonchild_result,nonchild_errno,ECHILD,reg_count,reg_errno);event_json(f,&receipt);
 // Layout metadata below describes only our own READY protocol, never Darwin/private objects.
 fprintf(f,",\"ownProtocolLayout\":{\"readyBytes\":%zu,\"identityBytes\":%zu,\"readyNonceOffset\":%zu,\"readyWorkerOffset\":%zu}",sizeof(Ready),sizeof(Identity),offsetof(Ready,nonce),offsetof(Ready,worker));
 fprintf(f,",\"registrationAtSeconds\":%.9f,\"ackAtSeconds\":%.9f,\"eventAtSeconds\":%.9f",registration_at,ack_at,event_at);
 fprintf(f,",\"sdk\":{\"sizeofKevent\":%zu,\"sizeofEventData\":%zu,\"sizeofPid\":%zu,\"filterProc\":%d,\"noteExit\":%u,\"noteExitStatus\":%u,\"eventErrorFlag\":%u,\"eventReceiptFlag\":%u,\"intMin\":%d,\"intMax\":%d}",sizeof(struct kevent),sizeof(event.data),sizeof(pid_t),EVFILT_PROC,(unsigned)NOTE_EXIT,(unsigned)NOTE_EXITSTATUS,(unsigned)EV_ERROR,(unsigned)EV_RECEIPT,INT_MIN,INT_MAX);
 fprintf(f,",\"oneAckWritten\":%s,\"eventReturn\":%d,\"eventErrno\":%d,\"event\":",ack_written?"true":"false",event_count,event_errno);event_json(f,&event);fprintf(f,",\"sdkNormalExit\":%s,\"sdkExitCode\":%d,\"workerTerminalObserved\":%s,\"rawStatusInterpretation\":\"actual_SDK_WIFEXITED_WEXITSTATUS_on_event_data_only\",\"elapsedSeconds\":%.6f}\n",normal?"true":"false",exit_code,event_valid?"true":"false",now()-began);if(fclose(f)!=0)return 95;return passed?0:2;
}
