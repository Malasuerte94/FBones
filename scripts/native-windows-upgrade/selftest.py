"""Pure NSIS listing/PE bounds and own saved fixture validation; no native APIs."""
from pathlib import Path
import ast,base64,hashlib,importlib.util,json,struct,subprocess,sys,tempfile
sys.dont_write_bytecode=True
BASE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('own_target',BASE/'prepare-target.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
head='Path = own-installer.exe\nType = Nsis\n----------\n';entry='Path = fbones.exe\nSize = \nAttributes = \nMethod = LZMA:23\n'
assert m.parse_listing(head+entry)['Path']=='fbones.exe'
for raw in [head+entry+'\n'+entry,head+entry.replace('fbones.exe','../fbones.exe'),head+entry+'Symbolic Link = other\n',head+entry+'Folder = +\n',head.replace('Nsis','zip')+entry]:
 try:m.parse_listing(raw)
 except ValueError:pass
 else:raise AssertionError('Unqualified NSIS member accepted')
pe=bytearray(512);pe[:2]=b'MZ';struct.pack_into('<I',pe,60,128);pe[128:132]=b'PE\0\0';struct.pack_into('<H',pe,132,0x8664);struct.pack_into('<H',pe,134,1);struct.pack_into('<H',pe,148,240);struct.pack_into('<H',pe,152,0x20b);struct.pack_into('<II',pe,408,512,512);m.validate_pe(pe,1024)
for prefix,count in[(b'bad',1024),(pe[:256],1024),(pe,1023),(pe,64*1024*1024+1)]:
 try:m.validate_pe(prefix,count)
 except ValueError:pass
 else:raise AssertionError('Invalid/truncated/oversized PE member accepted')
fixture=json.loads((BASE/'own-existing-project.json').read_text());raw=base64.b64decode(fixture['base64'],validate=True);assert len(raw)==405 and hashlib.sha256(raw).hexdigest()==fixture['sha256']=='e74a15b08b9cbc85f943ddde46c37c5cbceed3eb70968932ccd416697c6ecb5d'
with tempfile.TemporaryDirectory(prefix='own-windows-fixture-',dir=BASE)as folder:
 path=Path(folder)/'own.fbones';path.write_bytes(raw);result=subprocess.run([sys.executable,str(BASE/'own-minimal-checkpoint.py'),str(path),'--project-name',fixture['projectName'],'--bone-name',fixture['boneName'],'--root-x','37.5','--out',str(Path(folder)/'checkpoint.json')],capture_output=True,timeout=10);assert result.returncode==0,result.stderr.decode();proof=json.loads((Path(folder)/'checkpoint.json').read_text());assert proof['passed']and proof['sha256']==fixture['sha256']
pointer=(BASE/'owned-rect-click.cs').read_text();assert 'permitted=new HashSet<string>{"old-open","old-updates","clean-install","automatic-updates","fresh-open","fresh-updates"}'in pointer
for path in BASE.glob('*.py'):ast.parse(path.read_text())
print(json.dumps({'passed':True,'scope':'pure uniqueNSISmember/PEbounds/ownportablefixtureCRCfulltypedsemantic/PythonAST','nativeApiCalls':0,'targetExecutions':0,'networkOperations':0,'temporaryOwnFilesCleaned':True}))
