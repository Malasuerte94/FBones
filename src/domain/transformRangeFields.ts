/** Display/transport only; endpoint resolution and graph arithmetic belong to Rust. */
export function rangeBits(value:number):number|null{
 if(!Number.isFinite(value))return null;
 const data=new DataView(new ArrayBuffer(4));data.setFloat32(0,value,false);
 return Number.isFinite(data.getFloat32(0,false))?data.getUint32(0,false):null;
}
export function parseRangeBits(text:string):number|null{
 if(!text.trim()||!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(text.trim()))return null;
 return rangeBits(Number(text));
}
export function rangeText(value:number):string{return Object.is(value,-0)?'-0':String(value);}
export function rangeBitsText(bits:number):string{const data=new DataView(new ArrayBuffer(4));data.setUint32(0,bits,false);return rangeText(data.getFloat32(0,false));}
