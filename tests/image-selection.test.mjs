import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectImageKeys, imageDragKeys, parseImageDropKeys } from '../src/domain/imageSelection.ts';
const order=['arm','parts/hand','parts/head','shadow'];
test('image selection toggles, extends ranges from the anchor and drags the full selected set',()=>{
 let selection=selectImageKeys({keys:[],anchor:null},'parts/hand',order);
 selection=selectImageKeys(selection,'shadow',order,{toggle:true});
 assert.deepEqual(selection.keys,['parts/hand','shadow']);
 assert.deepEqual(imageDragKeys(selection.keys,'parts/hand',order),selection.keys);
 selection=selectImageKeys(selection,'parts/hand',order,{shift:true});
 assert.deepEqual(selection,{keys:['parts/hand','parts/head','shadow'],anchor:'shadow'});
 selection=selectImageKeys(selection,'parts/head',order,{toggle:true});
 assert.deepEqual(selection.keys,['parts/hand','shadow']);
 assert.deepEqual(imageDragKeys(selection.keys,'arm',order),['arm']);
 assert.deepEqual(selection.keys,['parts/hand','shadow']);
});
test('image ranges follow visible PNG order and can add to an existing selection',()=>{
 const visible=['arm','shadow'];
 let selection=selectImageKeys({keys:['arm'],anchor:'arm'},'shadow',visible,{shift:true});
 assert.deepEqual(selection.keys,visible);
 selection=selectImageKeys({keys:['arm'],anchor:'parts/head'},'shadow',order,{shift:true,toggle:true});
 assert.deepEqual(selection.keys,['arm','parts/head','shadow']);
 assert.deepEqual(selectImageKeys(selection,'unknown',order),selection);
});
const transfer=(values)=>({types:Object.keys(values),getData:type=>values[type]??''});
test('image drops validate batches without downgrading invalid batches to the single-image format',()=>{
 const single='application/x-fbones-image',batch='application/x-fbones-images';
 assert.deepEqual(parseImageDropKeys(transfer({[single]:'arm'}),order),['arm']);
 assert.deepEqual(parseImageDropKeys(transfer({[batch]:'["shadow","arm"]',[single]:'arm'}),order),['shadow','arm']);
 for(const value of ['invalid','[]','["arm","arm"]','["unknown"]','[null]','["arm\\n"]',JSON.stringify(Array(129).fill('arm'))]){
  assert.equal(parseImageDropKeys(transfer({[batch]:value,[single]:'arm'}),order),null);
 }
 assert.deepEqual(parseImageDropKeys(transfer({'text/plain':'arm'}),order),['arm']);
 assert.equal(parseImageDropKeys(transfer({'text/plain':'unknown'}),order),null);
 assert.equal(parseImageDropKeys(null,order),null);
});
