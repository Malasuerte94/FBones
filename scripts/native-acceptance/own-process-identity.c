#include "own-process-identity.h"
#include <libproc.h>
#include <sys/proc_info.h>
#include <sys/stat.h>
#include <errno.h>
#include <string.h>
_Static_assert(PROC_PIDPATHINFO_MAXSIZE <= OWN_PROCESS_PATH_CAPACITY,"SDK path buffer must fit own result");
int32_t OwnReadProcessIdentity(int32_t pid,const char *expectedPath,OwnProcessIdentity *out) {
 if(!out)return 0;
 memset(out,0,sizeof(*out));out->requestedPid=pid;
 if(pid<=0||!expectedPath||expectedPath[0]!='/')return 0;
 struct proc_bsdinfo info;memset(&info,0,sizeof(info));errno=0;
 out->infoBytes=proc_pidinfo(pid,PROC_PIDTBSDINFO,0,&info,(int)sizeof(info));out->infoError=errno;
 if(out->infoBytes==(int)sizeof(info)){
  out->observedPid=(int32_t)info.pbi_pid;out->startSeconds=info.pbi_start_tvsec;out->startMicroseconds=info.pbi_start_tvusec;
  out->infoValid=(info.pbi_pid==(uint32_t)pid&&out->startSeconds>0&&out->startMicroseconds<1000000);
 }
 errno=0;out->pathBytes=proc_pidpath(pid,out->actualPath,sizeof(out->actualPath));out->pathError=errno;
 size_t length=strnlen(out->actualPath,sizeof(out->actualPath));out->pathValid=(out->pathBytes>0&&length>0&&length<sizeof(out->actualPath)&&out->actualPath[0]=='/');
 struct stat expected,actual;memset(&expected,0,sizeof(expected));memset(&actual,0,sizeof(actual));errno=0;
 int a=stat(expectedPath,&expected);out->expectedStatError=errno;errno=0;
 int b=out->pathValid?stat(out->actualPath,&actual):-1;out->actualStatError=errno;
 if(a==0&&b==0&&S_ISREG(expected.st_mode)&&S_ISREG(actual.st_mode)&&expected.st_ino!=0&&actual.st_ino!=0){
  out->fileIdentityValid=1;out->expectedDevice=(uint64_t)expected.st_dev;out->expectedInode=(uint64_t)expected.st_ino;out->actualDevice=(uint64_t)actual.st_dev;out->actualInode=(uint64_t)actual.st_ino;
  out->sameFile=(expected.st_dev==actual.st_dev&&expected.st_ino==actual.st_ino);
 }
 return out->infoValid&&out->pathValid&&out->fileIdentityValid&&out->sameFile;
}
