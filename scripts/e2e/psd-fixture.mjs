// Independently encoded, original test artwork. PSDv1 RGB8 section/channel
// framing follows Adobe's public specification; no Photoshop/editor asset.
// The layer records are bottom-to-top, independent of our Rust decoder.
const u16=n=>{const b=Buffer.alloc(2);b.writeUInt16BE(n);return b;};
const i16=n=>{const b=Buffer.alloc(2);b.writeInt16BE(n);return b;};
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;};
const i32=n=>{const b=Buffer.alloc(4);b.writeInt32BE(n);return b;};
const section=b=>Buffer.concat([u32(b.length),b]);
export function ownPsd({unsupported=false}={}){
  const width=160,height=120;
  const layers=[
    {name:'Back red',left:20,top:10,width:80,height:80,color:[232,62,65,255],opacity:255,hidden:false},
    {name:'Front blue',left:60,top:30,width:80,height:80,color:[55,110,225,255],opacity:255,hidden:false},
    {name:'Hidden green',left:-5,top:5,width:21,height:19,color:[55,198,100,255],opacity:128,hidden:true},
  ];
  const records=[],channels=[];
  for(const [index,layer] of layers.entries()){
    const name=Buffer.from(layer.name,'ascii'),pascal=Buffer.concat([Buffer.from([name.length]),name,Buffer.alloc((4-(name.length+1)%4)%4)]);
    const extra=Buffer.concat([u32(0),u32(0),pascal]);
    const planes=layer.color.map(value=>Buffer.concat([u16(0),Buffer.alloc(layer.width*layer.height,value)]));
    records.push(Buffer.concat([
      i32(layer.top),i32(layer.left),i32(layer.top+layer.height),i32(layer.left+layer.width),
      u16(4),...planes.map((plane,i)=>Buffer.concat([i16(i===3?-1:i),u32(plane.length)])),
      Buffer.from('8BIM'+(unsupported&&index===1?'mul ':'norm')),
      Buffer.from([layer.opacity,0,layer.hidden?2:0,0]),section(extra),
    ]));
    channels.push(...planes);
  }
  let layerInfo=Buffer.concat([i16(layers.length),...records,...channels]);
  if(layerInfo.length%2)layerInfo=Buffer.concat([layerInfo,Buffer.alloc(1)]);
  const header=Buffer.concat([Buffer.from('8BPS'),u16(1),Buffer.alloc(6),u16(3),u32(height),u32(width),u16(8),u16(3)]);
  // A full valid composite is present, although importing deliberately uses
  // layer channels. Its independently computed overlap agrees with the stack.
  const rgb=Array.from({length:3},()=>Buffer.alloc(width*height));
  for(const layer of layers)if(!layer.hidden)for(let y=Math.max(0,layer.top);y<Math.min(height,layer.top+layer.height);y++)for(let x=Math.max(0,layer.left);x<Math.min(width,layer.left+layer.width);x++)for(let c=0;c<3;c++)rgb[c][y*width+x]=layer.color[c];
  return Buffer.concat([header,u32(0),u32(0),section(Buffer.concat([section(layerInfo),u32(0)])),u16(0),...rgb]);
}
