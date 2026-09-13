const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parse, transform, JsonError } = require('../src/core.js');
test('formats nested structures with 2 and 4 spaces', () => {
 const source='{"a":[1,{"b":true}],"empty":{},"arr":[]}';
 assert.equal(transform(source).output, '{\n  "a": [\n    1,\n    {\n      "b": true\n    }\n  ],\n  "empty": {},\n  "arr": []\n}');
 assert.equal(transform('{"a":1}', 'format',4).output,'{\n    "a": 1\n}');
});
test('minification preserves spaces and punctuation inside strings', () => {
 assert.equal(transform(' { "x" : "a b , : {} ", "y": "\\\"" } ','minify').output,'{"x":"a b , : {} ","y":"\\\""}');
});
test('preserves large numbers, exponent spelling, negative zero and numeric key order',()=>{
 const source='{"10":900719925474099312345,"2":1e+400,"z":-0,"d":1.2300}';
 assert.equal(transform(transform(source).output,'minify').output,source);
});
test('duplicate keys preserved and escaped equivalents detected',()=>{
 const source='{"x":1,"\\u0078":2}';
 assert.equal(transform(source,'minify').output,source);assert.equal(parse(source).duplicates.length,1);
 assert.equal(parse('{"a":{"x":1},"b":{"x":2}}').duplicates.length,0);
});
test('accepts scalar roots and every JSON escape',()=>{
 for(const s of ['null','true','false','"hello"','-1.5e-10','[]','{}','"\\\"\\\\\\/\\b\\f\\n\\r\\t\\u1234"','"ąčęėįšųūž😀"']){
  assert.doesNotThrow(()=>parse(s)); assert.deepEqual(JSON.parse(transform(s).output),JSON.parse(s));
 }
});
test('rejects malformed inputs',()=>{
 for(const s of ['', ' ', '{a:1}', '{"a":}', '{"a":1,}', '[1,]', '[,1]', '[1 2]', '01', '+1','1.','1e','NaN','undefined','true false','"\\x20"','"\\uXYZ1"','"abc','"a\nb"','/*comment*/{}','\uFEFF{}'])assert.throws(()=>parse(s),JsonError,s);
});
test('reports line and column, including CRLF',()=>{
 try{parse('{\r\n  "a": 1,\r\n}');assert.fail();}catch(e){assert.equal(e.line,3);assert.equal(e.column,1);}
});
test('limits depth and input bytes',()=>{
 assert.throws(()=>parse('['.repeat(122)+'0'+']'.repeat(122)),/nesting/);
 assert.throws(()=>parse('"'+'a'.repeat(1024*1024)+'"'),/1 MiB/);
});
test('does not evaluate HTML or special object keys',()=>{
 const source='{"__proto__":{"polluted":true},"html":"<img src=x onerror=alert(1)>"}';
 assert.equal(transform(source,'minify').output,source);assert.equal({}.polluted,undefined);
});
test('formatting is idempotent across representative fixtures',()=>{
 const fixtures=[{a:[1,2,null,false,{str:'hello\nworld'}],b:{}},[],[[],{},true],{unicode:'ž😀',special:'\\"/'}];
 for(const value of fixtures){const formatted=transform(JSON.stringify(value)).output;assert.equal(transform(formatted).output,formatted);assert.deepEqual(JSON.parse(formatted),value);}
});
