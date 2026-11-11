#include "picker-child.h"
#include <libproc.h>
#include <sys/proc_info.h>
#include <sys/proc.h>
#include <sys/sysctl.h>
#include <sys/stat.h>
#include <unistd.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>
static int tuple(int pid,struct proc_bsdinfo *b){memset(b,0,sizeof(*b));return proc_pidinfo(pid,PROC_PIDTBSDINFO,0,b,(int)sizeof(*b))==(int)sizeof(*b)&&b->pbi_pid==(unsigned)pid&&b->pbi_status!=SZOMB;}
static int currentMain(int pid,uint64_t sec,uint64_t us){struct proc_bsdinfo b;return tuple(pid,&b)&&b.pbi_uid==getuid()&&b.pbi_start_tvsec==sec&&b.pbi_start_tvusec==us;}
int32_t OwnMainUser(int32_t mainPid,uint64_t seconds,uint64_t micros){return currentMain(mainPid,seconds,micros);}
int32_t OwnFindSaveChild(int32_t mainPid,uint64_t mainSeconds,uint64_t mainMicros,uint64_t afterSeconds,uint64_t afterMicros,OwnPickerChild *out){
 if(!out)return 0;memset(out,0,sizeof(*out));out->mainPid=mainPid;out->mainUid=(int32_t)getuid();
 if(mainPid<=0||!currentMain(mainPid,mainSeconds,mainMicros)){out->error=1;return 0;}
 int ids[65];memset(ids,0,sizeof(ids));int count=proc_listchildpids(mainPid,ids,(int)sizeof(ids));out->childCount=count;
 if(count<0||count>=65){out->error=2;return 0;}
 struct stat systemFile;if(stat("/usr/bin/osascript",&systemFile)!=0||!S_ISREG(systemFile.st_mode)||!systemFile.st_ino){out->error=3;return 0;}
 for(int n=0;n<count;n++){
  struct proc_bsdinfo b;char path[4096];memset(path,0,sizeof(path));
  if(ids[n]<=0||!tuple(ids[n],&b)){out->error=4;return 0;}
  if(b.pbi_ppid!=(unsigned)mainPid||b.pbi_uid!=getuid()){out->error=5;return 0;}
  int length=proc_pidpath(ids[n],path,sizeof(path));if(length<=0||strnlen(path,sizeof(path))>=sizeof(path)){out->error=6;return 0;}
  if(strcmp(path,"/usr/bin/osascript")!=0)continue;
  if(b.pbi_start_tvsec<afterSeconds||(b.pbi_start_tvsec==afterSeconds&&b.pbi_start_tvusec<afterMicros)){out->error=7;return 0;}
  struct stat actual;if(stat(path,&actual)!=0||!S_ISREG(actual.st_mode)||actual.st_dev!=systemFile.st_dev||actual.st_ino!=systemFile.st_ino){out->error=8;return 0;}
  out->candidates++;out->childPid=ids[n];out->childParent=(int32_t)b.pbi_ppid;out->childUid=(int32_t)b.pbi_uid;out->state=(int32_t)b.pbi_status;out->startSeconds=b.pbi_start_tvsec;out->startMicroseconds=b.pbi_start_tvusec;out->device=(uint64_t)actual.st_dev;out->inode=(uint64_t)actual.st_ino;memcpy(out->path,path,strlen(path)+1);
 }
 if(!currentMain(mainPid,mainSeconds,mainMicros)){out->error=9;return 0;}
 if(out->candidates!=1){out->error=10;return 0;}
 int mib[3]={CTL_KERN,KERN_PROCARGS2,out->childPid};size_t bytes=0;errno=0;if(sysctl(mib,3,NULL,&bytes,NULL,0)!=0||bytes<=sizeof(int)||bytes>65536){out->argError=errno;out->error=11;return 0;}
 char *data=calloc(1,bytes);if(!data){out->error=12;return 0;}size_t actualBytes=bytes;errno=0;
 if(sysctl(mib,3,data,&actualBytes,NULL,0)!=0||actualBytes>bytes||actualBytes<=sizeof(int)){out->argError=errno;out->error=13;free(data);return 0;}
 int argc=0;memcpy(&argc,data,sizeof(argc));out->argc=argc;if(argc<=0||argc>16){out->error=14;free(data);return 0;}
 size_t cursor=sizeof(int),end=actualBytes,used=0;while(cursor<end&&data[cursor])cursor++;if(cursor==end){out->error=15;free(data);return 0;}while(cursor<end&&!data[cursor])cursor++;
 for(int n=0;n<argc;n++){size_t start=cursor;while(cursor<end&&data[cursor])cursor++;if(cursor==end||cursor-start>4096||used+cursor-start+1>sizeof(out->argv)){out->error=16;free(data);return 0;}size_t length=cursor-start;memcpy(out->argv+used,data+start,length);used+=length;out->argv[used++]=0;cursor++;}
 out->argBytes=(int32_t)used;free(data);struct proc_bsdinfo fresh;if(!tuple(out->childPid,&fresh)||fresh.pbi_ppid!=(unsigned)mainPid||fresh.pbi_uid!=getuid()||fresh.pbi_start_tvsec!=out->startSeconds||fresh.pbi_start_tvusec!=out->startMicroseconds||!currentMain(mainPid,mainSeconds,mainMicros)){out->error=17;return 0;}out->complete=1;return 1;
}

int32_t OwnCopySaveArgv(const OwnPickerChild *value,char *destination,int32_t capacity){
 if(!value||!destination||value->complete!=1||value->argBytes<=0||value->argBytes>8192||capacity<value->argBytes||capacity>8192)return 0;
 memcpy(destination,value->argv,(size_t)value->argBytes);return value->argBytes;
}
