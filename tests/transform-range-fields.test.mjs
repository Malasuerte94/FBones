import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRangeBits,rangeBitsText,rangeBits} from '../src/domain/transformRangeFields.ts';
test('Endpoint numeric transport preserves signed zero and smallest subnormal without null/zero coercion',()=>{
 assert.equal(parseRangeBits('-0'),0x80000000);assert.equal(parseRangeBits('+0'),0);assert.equal(parseRangeBits('1e-45'),1);assert.equal(parseRangeBits('-1e-45'),0x80000001);
 for(const text of['','  ','NaN','Infinity','0x10','1e40','1,5','1e'])assert.equal(parseRangeBits(text),null,text);
 assert.equal(parseRangeBits(' -1.5e+2 '),0xc3160000);assert.equal(rangeBits(Number.POSITIVE_INFINITY),null);
});
test('Endpoint display roundtrips precise f32 bits instead of authoring rounded decimals',()=>{
 for(const bits of[0,0x80000000,1,0x80000001,0x3dcccccd,0x7f7fffff])assert.equal(parseRangeBits(rangeBitsText(bits)),bits);
 assert.equal(rangeBitsText(0x80000000),'-0');assert.equal(rangeBitsText(0),'0');
});
