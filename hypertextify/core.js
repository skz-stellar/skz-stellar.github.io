(function (root) {
  'use strict';

  const allowed = new Set('p h1 h2 h3 h4 h5 h6 ul ol li dl dt dd blockquote pre code strong em b i u s del ins sub sup small mark abbr cite q br hr a img table caption thead tbody tfoot tr th td figure figcaption details summary input'.split(' '));
  const discard = new Set('script style noscript iframe frame frameset object embed applet svg math canvas template head title meta link base audio video source track form button select textarea option'.split(' '));
  const wrappers = new Set('div section article main header footer aside nav center address'.split(' '));
  const blocks = new Set('p h1 h2 h3 h4 h5 h6 ul ol li dl dt dd blockquote pre hr table caption thead tbody tfoot tr th td figure figcaption details summary'.split(' '));
  const voids = new Set(['br', 'hr', 'img', 'input']);
  const escapeText = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapeAttr = value => escapeText(value).replace(/"/g, '&quot;');

  function safeURL(value, image) {
    const compact = value.replace(/[\u0000-\u0020\u007f-\u009f]/g, '');
    const match = compact.match(/^([a-z][a-z0-9+.-]*):/i);
    return !match || (image ? /^(https?)$/i : /^(https?|mailto|tel)$/i).test(match[1]);
  }

  function cleanHTML(source) {
    // A template's contents stay inert: parsing never loads pasted images or scripts.
    const input = document.createElement('template');
    input.innerHTML = source;
    const output = document.createElement('template');
    const inert = output.content.ownerDocument;
    let removed = 0;

    function visit(node, target) {
      if (node.nodeType === 3) { target.appendChild(inert.createTextNode(node.data)); return; }
      if (node.nodeType !== 1) { removed++; return; }
      const tag = node.localName.toLowerCase();
      if (discard.has(tag)) { removed++; return; }
      if (tag === 'input' && node.getAttribute('type')?.toLowerCase() !== 'checkbox') { removed++; return; }
      if (!allowed.has(tag)) {
        removed++;
        // Retain paragraph boundaries when stripping common layout containers.
        const paragraph = wrappers.has(tag) && [...node.childNodes].some(n => n.nodeType === 3 && n.data.trim() || n.nodeType === 1)
          && ![...node.querySelectorAll('*')].some(n => blocks.has(n.localName) || wrappers.has(n.localName));
        if (paragraph) {
          const p = inert.createElement('p');
          for (const child of node.childNodes) visit(child, p);
          target.appendChild(p);
        } else { for (const child of node.childNodes) visit(child, target); }
        return;
      }
      const el = inert.createElement(tag);
      for (const attr of node.attributes) {
        const name = attr.name.toLowerCase(), value = attr.value;
        let keep = name === 'title' || name === 'lang' || name === 'dir' && /^(ltr|rtl|auto)$/.test(value);
        if (tag === 'a' && name === 'href') keep = safeURL(value, false);
        if (tag === 'img' && name === 'src') keep = safeURL(value, true);
        if (tag === 'img' && name === 'alt') keep = true;
        if ((tag === 'td' || tag === 'th') && /^(colspan|rowspan)$/.test(name)) keep = /^\d{1,4}$/.test(value);
        if (tag === 'th' && name === 'scope') keep = /^(row|col|rowgroup|colgroup)$/.test(value);
        if ((tag === 'ol' && name === 'start' || tag === 'li' && name === 'value')) keep = /^-?\d+$/.test(value);
        if (tag === 'ol' && name === 'reversed') keep = true;
        if (tag === 'input' && name === 'checked') keep = true;
        if (keep) el.setAttribute(name, value); else removed++;
      }
      if (tag === 'input') { el.setAttribute('type', 'checkbox'); el.setAttribute('disabled', ''); }
      for (const child of node.childNodes) visit(child, el);
      target.appendChild(el);
    }
    for (const node of input.content.childNodes) visit(node, output.content);

    function serialize(node, depth = 0, literal = false) {
      if (node.nodeType === 3) return escapeText(node.data);
      const tag = node.localName;
      const attrs = [...node.attributes].map(a => ` ${a.name}="${escapeAttr(a.value)}"`).join('');
      const open = `<${tag}${attrs}>`;
      if (voids.has(tag)) return open;
      const children = [...node.childNodes];
      // Indent only between block elements. Inline and preformatted whitespace is content.
      const indent = !literal && tag !== 'pre' && children.some(n => n.nodeType === 1)
        && children.every(n => n.nodeType === 3 ? !n.data.trim() : blocks.has(n.localName));
      const body = indent
        ? '\n' + children.filter(n => n.nodeType === 1).map(n => '  '.repeat(depth + 1) + serialize(n, depth + 1)).join('\n') + '\n' + '  '.repeat(depth)
        : children.map(n => serialize(n, depth + 1, literal || tag === 'pre')).join('');
      return open + body + `</${tag}>`;
    }
    const nodes = [...output.content.childNodes];
    const onlyBlocks = nodes.every(n => n.nodeType === 3 ? !n.data.trim() : blocks.has(n.localName));
    const html = onlyBlocks ? nodes.filter(n => n.nodeType === 1).map(n => serialize(n)).join('\n\n') : nodes.map(n => serialize(n)).join('');
    return { html, removed };
  }
  root.HyperTextify = Object.freeze({ cleanHTML });
})(globalThis);
