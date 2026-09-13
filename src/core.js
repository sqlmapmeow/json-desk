/* Token-based formatting preserves number precision, duplicate keys and key order. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JsonDesk = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_BYTES = 1024 * 1024;
  const MAX_DEPTH = 120;
  class JsonError extends Error {
    constructor(message, source, position) {
      super(message); this.name = 'JsonError'; this.position = position;
      const before = source.slice(0, position).split('\n');
      this.line = before.length; this.column = before.at(-1).length + 1;
    }
  }
  function parse(source) {
    if (new TextEncoder().encode(source).length > MAX_BYTES)
      throw new JsonError('This desk supports files up to 1 MiB.', source, 0);
    let i = 0, values = 0;
    const tokens = [], duplicates = [];
    const fail = (message, pos = i) => { throw new JsonError(message, source, pos); };
    const ws = () => { while (i < source.length && /[\x20\t\r\n]/.test(source[i])) i++; };
    function take(kind, start, end) {
      const token = { kind, text: source.slice(start, end), start };
      tokens.push(token); return token;
    }
    function punctuation(char) {
      ws(); if (source[i] !== char) fail(`Expected '${char}'.`);
      take('punctuation', i, ++i);
    }
    function string(kind) {
      const start = i++;
      while (i < source.length) {
        const ch = source[i++];
        if (ch === '"') return take(kind, start, i);
        if (ch.charCodeAt(0) < 32) fail('Unescaped control character in string.', i - 1);
        if (ch === '\\') {
          if (i >= source.length) fail('Incomplete escape sequence.');
          const esc = source[i++];
          if (esc === 'u') {
            if (!/^[0-9a-fA-F]{4}$/.test(source.slice(i, i + 4))) fail('Expected four hexadecimal digits after \\u.', i);
            i += 4;
          } else if (!'"\\/bfnrt'.includes(esc)) fail('Invalid escape sequence.', i - 1);
        }
      }
      fail('Unterminated string.', start);
    }
    function value(depth) {
      if (depth > MAX_DEPTH) fail(`Maximum nesting depth is ${MAX_DEPTH}.`);
      ws(); values++;
      const ch = source[i];
      if (ch === '{') {
        punctuation('{'); ws(); const keys = new Set();
        if (source[i] !== '}') {
          while (true) {
            ws(); if (source[i] !== '"') fail('Expected a double-quoted property name.');
            const token = string('key'); const key = JSON.parse(token.text);
            if (keys.has(key)) duplicates.push(token.start); else keys.add(key);
            punctuation(':'); value(depth + 1); ws();
            if (source[i] !== ',') break;
            punctuation(',');
          }
        }
        punctuation('}');
      } else if (ch === '[') {
        punctuation('['); ws();
        if (source[i] !== ']') {
          while (true) { value(depth + 1); ws(); if (source[i] !== ',') break; punctuation(','); }
        }
        punctuation(']');
      } else if (ch === '"') string('string');
      else if (ch === '-' || (ch >= '0' && ch <= '9')) {
        const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(source.slice(i));
        if (!match) fail('Invalid JSON number.');
        const start = i; i += match[0].length; take('number', start, i);
      } else {
        const literal = ['true', 'false', 'null'].find(x => source.startsWith(x, i));
        if (!literal) fail(i === source.length ? 'Expected a JSON value.' : 'Expected an object, array, string, number, true, false or null.');
        const start = i; i += literal.length; take(literal === 'null' ? 'null' : 'boolean', start, i);
      }
    }
    ws(); if (i === source.length) fail('Paste some JSON to get started.');
    value(0); ws(); if (i !== source.length) fail('Unexpected content after a JSON value.');
    return { tokens, duplicates, values };
  }
  function transform(source, mode = 'format', spaces = 2) {
    const result = parse(source);
    if (mode !== 'format' && mode !== 'minify') throw new Error('Unknown output mode.');
    if (![2,4].includes(spaces)) throw new Error('Indentation must be 2 or 4 spaces.');
    let depth = 0; const chunks = [];
    const newline = () => chunks.push('\n' + ' '.repeat(depth * spaces));
    result.tokens.forEach((token, index) => {
      const text = token.text;
      if (mode === 'minify') { chunks.push(text); return; }
      if (text === '{' || text === '[') {
        chunks.push(text); depth++;
        if (!['}', ']'].includes(result.tokens[index + 1]?.text)) newline();
      } else if (text === '}' || text === ']') {
        depth--; if (!['{', '['].includes(result.tokens[index - 1]?.text)) newline(); chunks.push(text);
      } else if (text === ',') { chunks.push(','); newline(); }
      else if (text === ':') chunks.push(': ');
      else chunks.push(text);
    });
    return { ...result, output: chunks.join('') };
  }
  return { parse, transform, JsonError, MAX_BYTES, MAX_DEPTH };
});
