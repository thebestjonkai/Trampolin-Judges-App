// Minimal Markdown renderer — covers exactly what the guide files use:
// headings, paragraphs, bullet and numbered lists, tables, block quotes,
// horizontal rules, bold, italic, inline code and links. Nothing else.
// This keeps USAGE.md and ANLEITUNG.md the single source of the guide.

window.renderMarkdown = (function () {

  const BULLET = /^[*-]\s+/;
  const NUMBER = /^\d+\.\s+/;

  function escapeHtml(text) {
    return text.replace(/[&<>"]/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
  }

  function inline(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  function splitRow(row) {
    return row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  }

  function render(markdown) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (/^\s*$/.test(line)) { i++; continue; }

      if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        i++;
        continue;
      }

      // A table needs its separator row right underneath to count as one
      if (/^\|/.test(line) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
        const head = splitRow(line);
        i += 2;
        const body = [];
        while (i < lines.length && /^\|/.test(lines[i])) {
          body.push(splitRow(lines[i]));
          i++;
        }
        out.push(
          '<table><thead><tr>' +
          head.map((c) => `<th>${inline(c)}</th>`).join('') +
          '</tr></thead><tbody>' +
          body.map((row) =>
            '<tr>' + row.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>'
          ).join('') +
          '</tbody></table>'
        );
        continue;
      }

      if (/^>\s?/.test(line)) {
        const quoted = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quoted.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        out.push(`<blockquote>${render(quoted.join('\n'))}</blockquote>`);
        continue;
      }

      if (BULLET.test(line) || NUMBER.test(line)) {
        const ordered = NUMBER.test(line);
        const marker = ordered ? NUMBER : BULLET;
        const items = [];
        while (i < lines.length && marker.test(lines[i])) {
          let item = lines[i].replace(marker, '');
          i++;
          // indented follow-up lines belong to the same item
          while (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
            item += ' ' + lines[i].trim();
            i++;
          }
          items.push(`<li>${inline(item)}</li>`);
        }
        out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
        continue;
      }

      const paragraph = [];
      while (
        i < lines.length &&
        !/^\s*$/.test(lines[i]) &&
        !/^[#>|]/.test(lines[i]) &&
        !/^---+\s*$/.test(lines[i]) &&
        !BULLET.test(lines[i]) &&
        !NUMBER.test(lines[i])
      ) {
        paragraph.push(lines[i]);
        i++;
      }
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    }

    return out.join('\n');
  }

  return render;
})();
