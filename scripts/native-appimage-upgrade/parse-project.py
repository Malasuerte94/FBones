from pathlib import Path
import zlib,struct,json
class Reader:
 def __init__(self,b):self.b=b;self.p=28;self.refs=[];self.domain_refs=[];self.depth=0;self.log=[]
 def vu(self):
  v=0;s=0
  while True:
   b=self.b[self.p];self.p+=1;v|=(b&127)<<s
   if b<128:return v
   s+=7
   if s>70:raise ValueError('varint too long')
 def boolean(self):
  b=self.vu()
  if b not in(0,1):raise ValueError(f'not bool {b} at {self.p-1:x}')
  return bool(b)
 def f32(self):v=struct.unpack_from('>f',self.b,self.p)[0];self.p+=4;return v
 def ref(self,fn):
  n=self.vu()
  if n==0:return None
  if n!=1:return {'ref':n-2}
  i=len(self.refs);self.refs.append(None);v=fn();self.refs[i]=v;return v
 def domain_ref(self,fn):
  n=self.vu()
  if n==0:return None
  if n!=1:return {'domain_ref':n-2}
  i=len(self.domain_refs);self.domain_refs.append(None);v=fn();self.domain_refs[i]=v;return v
 def string(self):
  def read():
   if self.b[self.p]&128:
    count=self.b[self.p]&63;flag=self.b[self.p];self.p+=1;shift=6
    while flag&64:
     flag=self.b[self.p];self.p+=1;count|=(flag&127)<<shift;shift+=7
     if flag<128:break
    if count<2:return ''
    start=self.p
    for _ in range(count-1):
     c=self.b[self.p];self.p+=1
     if c&224==192:self.p+=1
     elif c&240==224:self.p+=2
     elif c>=128:raise ValueError('unsupported UTF8 unit')
    return self.b[start:self.p].decode('utf-8')
   start=self.p
   while self.b[self.p]<128:self.p+=1
   last=self.b[self.p]&127;self.p+=1
   data=self.b[start:self.p-1]+bytes([last])
   return data.decode('ascii')
  return self.ref(read)
 def rgba(self):v=self.b[self.p:self.p+4].hex();self.p+=4;return v
 def short(self):
  v=struct.unpack_from('>H',self.b,self.p)[0];self.p+=2;return v
 def obj(self):
  c=self.vu();self.log.append((self.p-1,'class',c))
  if c==0:return None
  if c==3:return self.string()
  if c==17:return self.ref(lambda:[self.f32() for _ in range(self.vu())])
  if c==16:return self.ref(lambda:[self.vu() for _ in range(self.vu())])
  if c==47:return self.ref(lambda:[self.short() for _ in range(self.vu())])
  if c==5:return self.boolean()
  if c==30:return self.ref(self.rgba)
  if c==41:return self.ref(lambda:[self.f32(),self.f32(),self.f32()])
  if c==15:return self.ref(lambda:[self.obj() for _ in range(self.vu())])
  if c==38:return self.ref(lambda:[(self.obj(),self.obj()) for _ in range(self.vu())])
  if c==116:return self.ref(lambda:self.tagged(c))
  if c in schemas:return self.domain_ref(lambda:self.tagged(c))
  raise ValueError(f'unknown class {c} at {self.p-1:x}')
 def value(self,t):
  if t=='obj':return self.obj()
  if t=='str':return self.string()
  if t=='f32':return self.f32()
  if t=='farray':return self.ref(lambda:[self.f32() for _ in range(self.vu()-1)])
  if t=='bool':return self.boolean()
  if t=='vu':return self.vu()
  if t=='nvu':return self.ref(self.vu)
  if isinstance(t,int):return self.domain_ref(lambda:self.tagged(t))
  raise ValueError(t)
 def tagged(self,c):
  count=self.vu();self.log.append((self.p-1,'fields',c,count));out={}
  for _ in range(count):
   at=self.p;tag=self.vu();self.log.append((at,'tag',c,tag))
   if tag in out:raise ValueError(f'duplicate tag {tag} class {c} at {at:x}')
   if tag not in schemas[c]:raise ValueError(f'unknown tag {tag} class {c} at {at:x}: {self.b[self.p:self.p+16].hex()}')
   out[tag]=self.value(schemas[c][tag])
  return {'class':c,'fields':out}
schemas={
 54:{0:'obj',1:'obj'},
 71:{0:'obj',1:'obj',2:'obj'},
 46:{16:'f32',12:'obj',13:'obj',27:'obj',26:'obj',36:'bool',17:'f32',34:'bool',14:'str',30:'bool',20:'f32',21:'f32',8:'obj',31:'obj',28:'obj',9:'obj',7:'vu',19:'f32',37:'vu',8:'obj',1:'str',32:'bool',5:'bool',0:'vu',4:'vu',33:'bool',35:'bool'},
 13:{1:'str',5:'obj',2:12,16:'obj',12:'bool',14:'nvu',9:'obj',15:'f32',13:'bool',3:'vu',8:'bool',7:'nvu',0:'vu',11:'obj',126:'vu'},
 43:{10:'f32',15:'bool',11:'f32',8:'f32',9:'f32',14:'obj',6:'f32',13:'str',12:'f32',7:'f32',1:'str',32:'bool',5:'bool',0:'vu',4:'vu',33:'bool',35:'bool'},
 'Project':{20:'str',30:'obj',17:'f32',41:'vu',45:'bool',16:'obj',13:'bool',8:'f32',4:'obj',2:'f32',0:'obj',36:'obj',32:'f32',42:'bool',31:'obj',19:'bool',14:'obj',40:'bool',35:'bool',43:'bool',44:'bool',29:'obj',15:'f32',34:'f32',28:'bool',33:'obj',7:'obj',1:'vu'},
 116:{},
 18:{1:'str',5:'bool',9:'vu',3:'bool',10:'obj',8:'obj',6:'bool',2:'obj',0:'vu',7:'obj'},
 11:{50:'bool',7:'obj',13:'obj',47:'bool',40:'obj',48:'bool',43:'obj',24:'farray',52:'bool',16:'obj',2:'bool',29:'obj',41:'obj',36:'obj',14:'obj',38:'obj',35:'bool',42:'bool',23:'obj',33:'vu',37:'obj',8:'obj',3:'str',45:'obj',0:'vu',22:'obj',51:'obj',32:'obj',10:'obj',53:'bool',31:'obj',46:'f32',44:'obj',34:'str',26:'obj',27:'obj',30:'obj',4:'obj',1:'str',6:'obj',49:'obj',28:'obj',126:'bool'},
 85:{1:'obj',0:'vu'},86:{0:'str',1:'vu',2:'bool'},
 108:{3:'bool',2:'vu',0:'bool',5:'obj',1:'obj',6:'obj'},80:{0:'bool'},
 12:{30:'bool',13:'f32',34:'f32',11:'f32',12:'f32',1:'str',27:'nvu',2:'bool',28:'str',29:'bool',14:'f32',0:'vu',33:'f32',10:'f32',31:'obj',23:'f32',25:'f32',9:'f32',3:12,17:'obj',126:'obj'},
 1000:{2:'bool'},
}
if __name__=='__main__':
 b=zlib.decompress(Path('updates/fixtures/blank-4.3.26.spine').read_bytes(),-15);r=Reader(b)
 try:res=r.domain_ref(lambda:r.tagged('Project'));print('SUCCESS',r.p,len(b),len(r.refs));print(json.dumps(res))
 except Exception as e:print(type(e).__name__,str(e))
 for row in r.log[-20:]:print(row)
