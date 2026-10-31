import type {DeformKeyInput} from './animationGeometry.ts';

/** JSON numbers erase -0. These input-only carriers restore supported dormant
 * coordinates without changing the native file format or ordinary payloads. */
export function preserveDeformOffsetBits(key:DeformKeyInput):DeformKeyInput {
 if(key.offsetBits!==undefined||!key.offsets.some(value=>Object.is(value,-0)))return key;
 const view=new DataView(new ArrayBuffer(4));
 return {...key,offsetBits:key.offsets.map(value=>{view.setFloat32(0,value,false);return view.getUint32(0,false);})};
}
export function preserveTemporaryDeformZeros<T extends {attachment:number;offsets:number[];negativeZeroIndices?:number[]}>(pose:T):T {
 if(pose.negativeZeroIndices!==undefined)return pose;
 const indices=pose.offsets.flatMap((value,index)=>Object.is(value,-0)?[index]:[]);
 return indices.length?{...pose,negativeZeroIndices:indices}:pose;
}
