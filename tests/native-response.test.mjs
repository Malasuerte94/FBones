import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stringifyNativeResponse} from '../scripts/e2e/native-response.mjs';

test('test HTTP responses preserve Rust negative-zero numbers without rewriting strings or f64 precision',()=>{
 const value=JSON.parse('{"result":{"float":-0.0,"volume":0.0,"nested":[-0.0,2.000000000001],"string":"-0.0 and \\"float\\":-0"}}');
 const wire=stringifyNativeResponse(value),parsed=JSON.parse(wire);
 assert.ok(Object.is(parsed.result.float,-0));assert.ok(Object.is(parsed.result.nested[0],-0));assert.ok(Object.is(parsed.result.volume,0));assert.equal(parsed.result.nested[1],2.000000000001);assert.equal(parsed.result.string,value.result.string);assert.deepEqual(parsed,value);
 assert.equal(stringifyNativeResponse({string:'{"result":-0}',ordinary:3.125}),JSON.stringify({string:'{"result":-0}',ordinary:3.125}));
});
