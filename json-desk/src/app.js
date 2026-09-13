(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const source = $('source');
  let output = '', revision = 0, lastError = null;
  const sample = '{"project":"JSON Desk","author":{"name":"VIL","handle":"sqlmapmeow"},"stack":["HTML","CSS","JavaScript"],"features":{"format":true,"validate":true,"minify":true,"serverRequired":false},"version":1,"note":null}';
  const bytes = text => new TextEncoder().encode(text).length;
  const size = text => bytes(text) < 1024 ? `${bytes(text)} bytes` : `${(bytes(text) / 1024).toFixed(1)} KiB`;
  const countLines = text => text.split('\n').length;
  function numbers(text) {
    const count = countLines(text);
    // Limit gutter DOM/text work for documents containing many empty lines.
    return Array.from({ length: Math.min(count, 10000) }, (_, i) => i + 1).join('\n');
  }
  function status(message, kind = '', error = null) {
    $('status').className = 'status' + (kind ? ` ${kind}` : '');
    $('status-text').textContent = message;
    $('status-icon').textContent = kind === 'success' ? '✓' : kind === 'error' ? '!' : kind === 'warning' ? '△' : '○';
    lastError = error;
    $('error-jump').hidden = !error;
    source.setAttribute('aria-invalid', kind === 'error' && error ? 'true' : 'false');
  }
  function inputStats() {
    $('input-stats').textContent = `${size(source.value)} · ${countLines(source.value)} ${countLines(source.value) === 1 ? 'line' : 'lines'}`;
    $('input-lines').textContent = numbers(source.value);
    $('input-lines').scrollTop = source.scrollTop;
  }
  function invalidate() {
    revision++; output = ''; $('output').replaceChildren(); $('output-lines').textContent = '1';
    $('empty-output').hidden = false; $('copy').disabled = true; $('download').disabled = true;
    $('output-stats').textContent = 'Waiting for processing'; $('output-mode').textContent = 'READ ONLY';
    inputStats(); status(source.value.trim() ? 'Input changed. Format, minify or validate to continue.' : 'Ready when you are. Paste JSON or load an example.');
  }
  function render(text) {
    output = text; const container = $('output'); container.replaceChildren();
    const parsed = JsonDesk.parse(text);
    if (parsed.tokens.length > 12000) container.textContent = text;
    else {
      const fragment = document.createDocumentFragment(); let cursor = 0;
      parsed.tokens.forEach(token => {
        fragment.append(document.createTextNode(text.slice(cursor, token.start)));
        const span = document.createElement('span'); span.className = `token-${token.kind}`;
        span.textContent = token.text; fragment.append(span); cursor = token.start + token.text.length;
      });
      fragment.append(document.createTextNode(text.slice(cursor))); container.append(fragment);
    }
    $('empty-output').hidden = true; $('output-lines').textContent = numbers(text);
    $('output-stats').textContent = `${size(text)} · ${countLines(text)} ${countLines(text) === 1 ? 'line' : 'lines'}`;
    $('copy').disabled = false; $('download').disabled = false;
    $('output-scroll').scrollTop = 0; $('output-scroll').scrollLeft = 0;
  }
  function process(mode) {
    try {
      const result = JsonDesk.transform(source.value, mode === 'minify' ? 'minify' : 'format', Number($('indent').value));
      // Validation deliberately leaves any current, same-input output unchanged.
      if (mode !== 'validate') { render(result.output); $('output-mode').textContent = mode === 'minify' ? 'MINIFIED' : 'FORMATTED'; }
      if (result.duplicates.length) status(`Valid syntax · ${result.duplicates.length} duplicate ${result.duplicates.length === 1 ? 'key' : 'keys'} preserved. Some consumers keep only the last value.`, 'warning');
      else status(`Valid JSON · ${result.values} ${result.values === 1 ? 'value' : 'values'} · ${mode === 'validate' ? 'Validation complete' : mode === 'minify' ? 'Whitespace removed' : 'Ready to read'}`, 'success');
    } catch (error) {
      output = ''; $('output').replaceChildren(); $('output-lines').textContent = '1';
      $('empty-output').hidden = false; $('copy').disabled = true; $('download').disabled = true;
      $('output-stats').textContent = 'No output'; $('output-mode').textContent = 'READ ONLY';
      if (error instanceof JsonDesk.JsonError) status(`Line ${error.line}, column ${error.column} · ${error.message}`, 'error', error);
      else status('Could not process this document. Try a smaller input.', 'error');
    }
  }
  source.addEventListener('input', invalidate);
  source.addEventListener('scroll', () => { $('input-lines').scrollTop = source.scrollTop; });
  source.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); process('format'); }
    // Tab retains normal keyboard focus navigation; no editor focus trap.
  });
  $('format').addEventListener('click', () => process('format'));
  $('minify').addEventListener('click', () => process('minify'));
  $('validate').addEventListener('click', () => process('validate'));
  $('indent').addEventListener('change', () => { if (output && $('output-mode').textContent === 'FORMATTED') process('format'); });
  $('sample').addEventListener('click', () => {
    if (source.value && source.value !== sample && !confirm('Replace the current input with the example?')) return;
    source.value = sample; invalidate(); process('format'); status('Example loaded · Try formatting, minifying or editing a value.', 'success');
  });
  $('clear').addEventListener('click', () => {
    if (source.value && !confirm('Clear the input and output?')) return;
    source.value = ''; invalidate(); source.focus();
  });
  $('open').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', async () => {
    const file = $('file').files[0]; $('file').value = ''; if (!file) return;
    if (file.size > JsonDesk.MAX_BYTES) { status('File exceeds the 1 MiB limit. Current input was kept.', 'error'); return; }
    if (source.value && !confirm('Replace the current input with this file?')) return;
    const requestRevision = ++revision;
    try {
      const content = await file.text();
      if (requestRevision !== revision) return;
      source.value = content; invalidate(); process('format');
    } catch { if (requestRevision === revision) status('Could not read this file. Current input was kept.', 'error'); }
  });
  $('error-jump').addEventListener('click', () => {
    if (!lastError) return;
    source.focus(); source.setSelectionRange(lastError.position, Math.min(lastError.position + 1, source.value.length));
    source.scrollTop = Math.max(0, (lastError.line - 4) * 23); $('input-lines').scrollTop = source.scrollTop;
  });
  $('copy').addEventListener('click', async () => {
    if (!output) return;
    const content = output, copyRevision = revision;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(content);
      if (copyRevision === revision) status('Output copied to clipboard.', 'success');
    } catch {
      if (copyRevision !== revision) return;
      const range = document.createRange(); range.selectNodeContents($('output'));
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      status('Clipboard access unavailable. Output selected: press Ctrl+C or ⌘C.', 'warning');
    }
  });
  $('download').addEventListener('click', () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = $('output-mode').textContent === 'MINIFIED' ? 'data.min.json' : 'data.formatted.json';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    status('Download prepared. Check your browser downloads.', 'success');
  });
  source.value = sample; invalidate(); process('format');
  status('Example JSON loaded · Replace the input with your own data.', 'success');
})();
