# Browser release checklist

This checklist is not a claim that the steps have already passed.

- Open `index.html` directly. Confirm the example and colored output appear.
- Run `npm start` and repeat over localhost.
- Format `{"a":[1,true,null],"b":{}}` with 2 and 4 spaces; minify it.
- Validate `42`, `null` and a quoted string as valid root values.
- Enter an invalid multiline object and use Go to error.
- Edit a previously formatted input: Copy and Download must disable immediately.
- Copy the output. If permission is denied, use the selected-output fallback.
- Download both modes and inspect the filename and file contents.
- Open a file and then edit while it loads: a late read must not replace newer input.
- Cancel the replace/clear confirmations: current content must remain.
- Try empty input, duplicate keys and a file larger than 1 MiB.
- Input `<img src=x onerror=alert(1)>` inside a JSON string; it must remain text.
- Confirm `900719925474099312345` stays exact after formatting/minifying.
- At 390 px, 768 px and 1440 px: no page-wide horizontal scrolling; panes scroll internally.
- Navigate all controls by keyboard. Tab must leave the input; Ctrl/Cmd+Enter formats.
- Check no unexpected network requests occur while processing JSON.
- Save actual desktop/mobile screenshots to docs/ once checked; do not label a mockup as a screenshot.
