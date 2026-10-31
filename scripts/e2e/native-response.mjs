/** Rust JSON numbers can contain -0.0. Re-encoding a parsed response with plain
 * JSON.stringify erases its sign, unlike the native Tauri response path.
 * Input requests retain the product's ordinary JSON serialization semantics. */
export function stringifyNativeResponse(value){
 const encoded=JSON.stringify(value,(_key,item)=>typeof item==='number'&&Object.is(item,-0)?JSON.rawJSON('-0'):item);
 if(encoded===undefined)throw new TypeError('A native response must be JSON data.');
 return encoded;
}
