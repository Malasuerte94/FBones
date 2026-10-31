import type {ConstraintKeyInput,ConstraintPose} from './animationConstraints.ts';
import type {EventKeyInput,EventPatch} from './animationEvents.ts';

const negativeZero=(values:readonly number[])=>values.some(value=>Object.is(value,-0));
function bits(values:readonly number[]):number[]{const view=new DataView(new ArrayBuffer(4));return values.map(value=>{view.setFloat32(0,value,false);return view.getUint32(0,false);});}
/** Input-only restoration of f32 signs lost by JSON.stringify. Ordinary values
 * use the normal numeric path; native validates every supplied bit carrier. */
export function preserveConstraintKeyBits(key:ConstraintKeyInput):ConstraintKeyInput{
 if(key.channel==='physicsReset')return key;
 const values=key.channel==='ik'?[key.mix,key.softness]:key.channel==='transformMix'?key.values:[key.value];
 const valueBits=key.valueBits??(negativeZero(values)?bits(values):undefined);
 const controlsBits=key.controlsBits??(key.controls&&negativeZero(key.controls.flat())?(key.channel==='physics'?bits(key.controls):key.controls.map(axis=>bits(axis))):undefined);
 return valueBits||controlsBits?{...key,...(valueBits?{valueBits}:{}),...(controlsBits?{controlsBits}:{})}:key;
}
export function preserveEventKeyBits(key:EventKeyInput):EventKeyInput{
 const values=[key.float,key.volume,key.balance];
 return key.payloadBits||!negativeZero(values)?key:{...key,payloadBits:bits(values) as [number,number,number]};
}
export function preserveEventPatchBits<T extends EventPatch>(patch:T):T{
 const extra:EventPatch={};
 for(const field of ['float','volume','balance'] as const){const value=patch[field],name=`${field}Bits` as const;if(value!==undefined&&Object.is(value,-0)&&patch[name]===undefined)extra[name]=bits([value])[0]!;}
 return Object.keys(extra).length?{...patch,...extra}:patch;
}
export function preserveTemporaryConstraintZeros<T extends ConstraintPose&{negativeZeroIndices?:number[]}>(pose:T):T{
 if(pose.negativeZeroIndices!==undefined)return pose;
 const values=pose.type==='ik'?[pose.mix,pose.softness]:pose.type==='transform'?pose.mixes:[pose.inertia,pose.strength,pose.damping,pose.mass,pose.wind,pose.gravity,pose.mix];
 const indices=values.flatMap((value,index)=>Object.is(value,-0)?[index]:[]);
 return indices.length?{...pose,negativeZeroIndices:indices}:pose;
}
