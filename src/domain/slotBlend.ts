import type {SlotBlendMode} from './project.ts';
/** Preserve slot draw order; blend modes must never regroup the scene. */
export function pixiSlotBlend(mode:SlotBlendMode|undefined):'normal'|'add'|'multiply'|'screen'{
  switch(mode){
    case undefined:case 'normal':return 'normal';
    case 'additive':return 'add';
    case 'multiply':return 'multiply';
    case 'screen':return 'screen';
    default:throw Error('Unsupported slot blend mode.');
  }
}
