interface WheelPreview<Context> {
  context:Context;
  value:number;
}

interface WheelBurst<Context> extends WheelPreview<Context> {
  baseline:number;
  ticks:number;
}

interface WheelBurstOptions<Context> {
  isCurrent:(context:Context)=>boolean;
  matches:(started:Context,current:Context)=>boolean;
  commit:(context:Context,value:number)=>Promise<boolean>;
  changed:(preview:WheelPreview<Context>|null)=>void;
  idleMs?:number;
  ticksPerUnit?:number;
}

export function createBoneWheelBurst<Context>(options:WheelBurstOptions<Context>){
  let pending:WheelBurst<Context>|null=null;
  let timer:ReturnType<typeof setTimeout>|undefined;

  function cancel(){
    clearTimeout(timer);
    timer=undefined;
    if(!pending)return;
    pending=null;
    options.changed(null);
  }

  function check(){
    if(pending&&!options.isCurrent(pending.context))cancel();
  }

  function flush():Promise<boolean>{
    const completed=pending;
    cancel();
    if(!completed||completed.value===completed.baseline||!options.isCurrent(completed.context))return Promise.resolve(true);
    return options.commit(completed.context,completed.value);
  }

  function step(context:Context,baseline:number,ticks:number){
    check();
    if(!ticks||!Number.isFinite(ticks)||!Number.isFinite(baseline)||!options.isCurrent(context))return false;
    const active=pending&&options.matches(pending.context,context)?pending:null;
    const start=active?.baseline??baseline;
    const total=(active?.ticks??0)+ticks;
    const value=start+total/(options.ticksPerUnit??1);
    if(!Number.isFinite(value))return false;

    const captured=active?active.context:context;
    const staged={context:captured,baseline:start,ticks:total,value};
    pending=staged;
    clearTimeout(timer);
    timer=setTimeout(()=>{if(pending===staged)void flush();},options.idleMs??140);
    options.changed({context:captured,value});
    return true;
  }

  return {step,check,flush,cancel};
}
