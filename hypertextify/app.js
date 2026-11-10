(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const input = $('input'), output = $('output'), format = $('format'), status = $('status');
  let converted = false;

  function showView(preview) {
    output.hidden = preview;
    $('preview').hidden = !preview;
    $('html-view').setAttribute('aria-pressed', String(!preview));
    $('preview-view').setAttribute('aria-pressed', String(preview));
  }
  function markChanged() {
    if (converted) status.textContent = 'Input changed. Click HyperTextify to update the output.';
  }
  function convert() {
    if (!input.value.trim()) { status.textContent = 'Paste some HTML or Markdown first.'; input.focus(); return; }
    try {
      const html = format.value === 'markdown' ? marked.parse(input.value, { gfm: true, breaks: false }) : input.value;
      const result = HyperTextify.cleanHTML(html);
      output.value = result.html;
      $('copy').disabled = !result.html;
      const preview = document.createElement('template');
      preview.innerHTML = result.html;
      for (const el of preview.content.querySelectorAll('[src], [href]')) {
        el.removeAttribute('src');
        el.removeAttribute('href');
      }
      const previewHTML = [...preview.content.childNodes].map(node => node.nodeType === 1 ? node.outerHTML : node.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('');
      $('preview').srcdoc = '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src \'none\'; style-src \'none\'; base-uri \'none\'; form-action \'none\'"></head><body>' + previewHTML + '</body></html>';
      converted = true;
      status.textContent = result.html ? `Converted locally · ${result.removed} markup item${result.removed === 1 ? '' : 's'} removed.` : 'Cleanup complete. No content remained after removing unsupported markup.';
    } catch (error) {
      status.textContent = 'Conversion failed. Try a smaller snippet or check the markup.';
    }
  }
  $('convert').addEventListener('click', convert);
  input.addEventListener('input', markChanged);
  format.addEventListener('change', () => {
    $('input-hint').textContent = format.value === 'html' ? 'Paste raw HTML. Styling and unnecessary markup will be removed.' : 'Paste Markdown. Tables, code blocks, strikethrough, and task lists are supported.';
    input.placeholder = format.value === 'html' ? '<p style="color: purple">Hello <strong>world</strong>.</p>' : '# Hello world\n\nKeep **the meaning**, lose the styling.';
    markChanged();
  });
  $('html-view').addEventListener('click', () => showView(false));
  $('preview-view').addEventListener('click', () => showView(true));
  $('clear').addEventListener('click', () => {
    input.value = ''; output.value = ''; $('preview').removeAttribute('srcdoc');
    $('copy').disabled = true; converted = false; status.textContent = 'Cleared. Nothing has been saved.';
    showView(false); input.focus();
  });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(output.value); status.textContent = 'HTML copied to clipboard.'; }
    catch { showView(false); output.focus(); output.select(); status.textContent = 'Press ⌘C or Ctrl+C to copy the selected HTML.'; }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); convert(); }
  });
})();
