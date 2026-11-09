"""One SDK-associated own GTK file row selection, then one enabled native Open."""
from pathlib import Path
import hashlib,json,time

def require(ok,message):
 if not ok:raise ValueError(message)

def own_file(picker,destination,expected_sha):
 p=Path(destination);own_user_home=Path.home().resolve();require(p.is_absolute()and p.parent==picker.root/'projects'and p.suffix=='.fbones','Exact own Open project path required');require(p.resolve()==p and p.is_file()and p.parent.is_relative_to(own_user_home),'Canonical own saved file under unchanged HOME required');size=p.stat().st_size;require(0<size<=1024*1024,'Own Open file size bound');digest=hashlib.sha256(p.read_bytes()).hexdigest();require(digest==expected_sha,'Own Open checkpoint hash changed');location=p.parent.relative_to(own_user_home).as_posix();require(location and not location.startswith('/')and '..'not in Path(location).parts,'Exact HOME-relative own location required');require((own_user_home/location/p.name).resolve()==p,'Native location/basename does not resolve to own path');return{'path':str(p),'basename':p.name,'home':str(own_user_home),'location':location,'size':size,'sizeLabel':str(size)+' bytes','sha256':digest}

def structural_open(rows):
 matches=[r for r in rows if r['role']=='push button'and r['name']=='Open'and r['showing']and r['visible']and r['clickActions']==[0]]
 require(len(matches)==1,'Unique structural Open button required (disabled allowed before selection only)');return matches[0]

def prepare_open(picker):
 require(picker.kind=='Open','Table strategy is Open-only');buttons=structural_open(picker.rows);tables=[r for r in picker.rows if r['role']=='table'and r['name']=='Files'and r['showing']and r['visible']and r['enabled']and r['sensitive']];require(len(tables)==1,'Unique owned visible Files table required');row=tables[0];picker.open_table_context={'path':row['path'],'node':picker.nodes[tuple(row['path'])],'dialog':picker.dialog};picker.output('open-table-strategy.json',{'strategy':'SDK_TABLE_ROW_ONLY_NO_ENTRY_OR_KEYBOARD_FALLBACK','initialOpen':buttons,'table':row,'selectionAttempts':0,'openAttempts':0})

def table_in_current_modal(picker,table,proof,deadline):
 dialog=picker.describe(picker.dialog,picker.dialog_path);proof['currentDialog']=dialog;require(dialog['role']=='file chooser'and dialog['name']=='Open a project'and all(dialog[k]for k in['modal','showing','visible','enabled','sensitive']),'Current own modal Open chooser changed');cursor=table;rooted=False
 for _ in range(16):
  require(time.monotonic()<deadline and cursor is not None and cursor.get_process_id()==picker.pid,'Table/modal parent ownership/time bound')
  if cursor==picker.dialog:rooted=True;break
  cursor=cursor.get_parent()
 require(rooted,'Files table left retained same modal dialog');proof['tableSameModalAncestor']=True

def cell_leaf_names(picker,node,table,detail,deadline):
 queue=[(node,[])];detail.update(nodes=[],leaves=[])
 while queue:
  require(len(detail['nodes'])<16 and time.monotonic()<deadline,'Table cell subtree count/time cap');current,path=queue.pop(0);require(current.get_process_id()==picker.pid,'Table cell outside owned main PID');role=current.get_role_name();require(role not in ['password text','protected text'],'Protected table cell refused');value=current.get_name()or'';require(len(value)<=512,'Table cell text cap');state=current.get_state_set();count=current.get_child_count();require(0<=count<=16 and len(path)<=6,'Table cell child/depth cap');shown=state.contains(picker.a.StateType.SHOWING)and state.contains(picker.a.StateType.VISIBLE);detail['nodes'].append({'path':path,'role':role,'name':value,'showingVisible':shown,'children':count})
  if count==0 and shown and value:detail['leaves'].append(value)
  queue.extend((current.get_child_at_index(i),path+[i])for i in range(count))
 cursor=node;rooted=False
 for _ in range(16):
  require(time.monotonic()<deadline and cursor is not None and cursor.get_process_id()==picker.pid,'Table cell parent ownership/time bound')
  if cursor==table:rooted=True;break
  cursor=cursor.get_parent()
 require(rooted,'SDK table cell is not rooted in same table');detail['sameTableAncestor']=True
 return detail['leaves']

def matching_rows(rows,file):
 return[r for r in rows if r['cells']['Name']['leaves']==[file['basename']]and r['cells']['Location']['leaves']==[file['location']]and r['cells']['Size']['leaves']==[file['sizeLabel']]]

def bounded_table_proof(proof):
 if len(json.dumps(proof,ensure_ascii=True).encode())<=500*1024:return proof
 proof['complete']=False;proof['diagnosticByteCapHit']=True;proof['diagnosticTruncated']=True;proof['originalRecordedRows']=len(proof['rows']);proof['originalRecordedCellNodes']=sum(len(c.get('nodes',[]))for r in proof['rows']for c in r.get('cells',{}).values())
 if not proof.get('error'):proof['error']='Native table diagnostic byte cap; truncated scope cannot qualify'
 while len(json.dumps(proof,ensure_ascii=True).encode())>490*1024 and proof['rows']:proof['rows'].pop()
 proof['retainedRecordedRows']=len(proof['rows']);proof['retainedRecordedCellNodes']=sum(len(c.get('nodes',[]))for r in proof['rows']for c in r.get('cells',{}).values());require(len(json.dumps(proof,ensure_ascii=True).encode())<=500*1024,'Fixed table metadata envelope exceeds cap');return proof

def table_snapshot(picker,destination,expected_sha):
 proof={'complete':False,'error':None,'headers':[],'rows':[],'selectedRows':None};table_iface=None;end=time.monotonic()+15
 try:
  file=own_file(picker,destination,expected_sha);proof['file']=file;picker.bound();require(picker.x_dialog()==picker.x,'Open modal/transient identity changed');ctx=picker.open_table_context;require(picker.dialog==ctx['dialog']and picker.nodes[tuple(ctx['path'])]==ctx['node'],'Owned table/dialog object changed');table=ctx['node'];desc=picker.describe(table,ctx['path']);proof['table']=desc;require(desc['role']=='table'and desc['name']=='Files'and all(desc[k]for k in['showing','visible','enabled','sensitive']),'Files table no longer qualified');table_in_current_modal(picker,table,proof,end);table_iface=table.get_table_iface();proof['tableInterfaceAvailable']=table_iface is not None;require(table_iface is not None,'Actual native Table interface unavailable');nr,nc=table_iface.get_n_rows(),table_iface.get_n_columns();proof.update(rowCount=nr,columnCount=nc);require(type(nr)is int and type(nc)is int and 1<=nr<=128 and 3<=nc<=16,'SDK table dimension bound')
  for column in range(nc):
   require(time.monotonic()<end,'SDK table metadata time cap');header=table_iface.get_column_header(column);require(header is not None and header.get_process_id()==picker.pid,'SDK header owner unavailable');name=header.get_name()or'';require(len(name)<=512 and header.get_role_name()=='table column header','SDK column header shape/text cap');proof['headers'].append({'column':column,'name':name})
  columns={}
  for name in['Name','Location','Size']:
   found=[r['column']for r in proof['headers']if r['name']==name];require(len(found)==1,'Missing/ambiguous SDK '+name+' header');columns[name]=found[0]
  for row in range(nr):
   rd={'row':row,'cells':{}};proof['rows'].append(rd)
   for name,column in columns.items():
    require(time.monotonic()<end,'SDK table metadata time cap');cell=table_iface.get_accessible_at(row,column);require(cell is not None,'SDK row/column cell unavailable');detail={'sdkRow':row,'sdkColumn':column};rd['cells'][name]=detail;cell_leaf_names(picker,cell,table,detail,end)
   require(len(json.dumps(proof,ensure_ascii=True).encode())<450*1024,'SDK table diagnostic byte cap')
  matched=matching_rows(proof['rows'],file);require(len(matched)==1,'Exact own filename/location/current-size SDK row missing or ambiguous');row=matched[0]['row'];proof['matchedRow']=row;selected=table_iface.get_selected_rows();require(isinstance(selected,(list,tuple))and len(selected)<=128 and all(type(v)is int and 0<=v<nr for v in selected)and len(set(selected))==len(selected),'SDK selected-row result shape/bounds');proof['selectedRows']=list(selected);proof['matchedRowSelected']=table_iface.is_row_selected(row);require(type(proof['matchedRowSelected'])is bool,'SDK is_row_selected type unknown');require(own_file(picker,destination,expected_sha)==file,'Own Open file changed during native metadata');picker.bound();require(picker.x_dialog()==picker.x,'Native Open modal changed after metadata');table_in_current_modal(picker,table,proof,end);require(time.monotonic()<end,'SDK table metadata acceptance deadline');proof['complete']=True
 except Exception as error:proof['error']=(type(error).__name__+': '+str(error))[:512]
 return bounded_table_proof(proof),table_iface

def open_once(picker,destination,expected_sha):
 from native_access import choose
 require(picker.kind=='Open','Table Open strategy only');first,iface=table_snapshot(picker,destination,expected_sha);picker.output('open-table-before.json',first);require(first['complete']and first['selectedRows']==[]and first['matchedRowSelected']is False,'Initial exact own table row/empty selection unproved')
 picker.inventory('picker-before-selection-inventory.json');picker.cancel=choose(picker.rows,'Cancel');fresh,iface=table_snapshot(picker,destination,expected_sha);picker.output('open-table-pre-selection.json',fresh);require(fresh['complete']and fresh['matchedRow']==first['matchedRow']and fresh['selectedRows']==[]and fresh['matchedRowSelected']is False and fresh['file']==first['file'],'Own SDK row/file/empty-selection changed before action')
 picker.output('open-table-selection-intent.json',{'maximumSelections':1,'row':fresh['matchedRow'],'table':fresh['table'],'file':fresh['file'],'nativeWindow':picker.x,'noFallback':True});selection={'intentReserved':True,'returned':None,'error':None}
 try:selection['returned']=iface.add_row_selection(fresh['matchedRow'])
 except Exception as error:selection['error']=(type(error).__name__+': '+str(error))[:512]
 finally:picker.output('open-table-selection-result.json',selection)
 require(selection['error']is None and selection['returned']is True,'One native row selection failed; no retry')
 picker.inventory('picker-after-selection-inventory.json');picker.cancel=choose(picker.rows,'Cancel');after,iface=table_snapshot(picker,destination,expected_sha);picker.output('open-table-selected.json',after);require(after['complete']and after['matchedRow']==fresh['matchedRow']and after['selectedRows']==[fresh['matchedRow']]and after['matchedRowSelected']is True and after['file']==fresh['file'],'SDK exact selected own row/path/hash unproved')
 picker.accept=choose(picker.rows,'Open');node=picker.nodes[tuple(picker.accept['path'])];action=node.get_action_iface();require(action is not None,'Enabled Open Action unavailable');count=action.get_n_actions();names=[action.get_action_name(i)for i in range(count)]if type(count)is int and 0<=count<=8 else[];picker.output('open-accept-capability.json',{'accept':picker.accept,'actionCount':count,'actionNames':names});require(count==1 and names==['click'],'Enabled Open sole click[0] unavailable');picker.bound();require(picker.x_dialog()==picker.x and own_file(picker,destination,expected_sha)==fresh['file'],'Own file/modal changed before Open')
 picker.output('picker-submit-intent.json',{'kind':'Open','destination':str(destination),'ownPid':picker.pid,'startTicks':picker.start,'nativeWindow':picker.x,'acceptControl':picker.accept,'selectedRow':after['matchedRow'],'file':after['file'],'maximumAcceptActions':1});picker.submitted=True;result={'intentReserved':True,'guardedClickReturned':False,'error':None}
 try:picker.click(picker.accept);result['guardedClickReturned']=True
 except Exception as error:result['error']=(type(error).__name__+': '+str(error))[:512]
 finally:picker.output('open-accept-result.json',result)
 require(result['guardedClickReturned'],'One guarded Open did not return; no retry');picker.output('picker-submitted.json',{'kind':'Open','oneAcceptAction':True,'destination':str(destination),'actionReturned':True,'sdkSelectedRow':after['matchedRow']})
