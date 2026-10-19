// Mostra o pouco de Markdown que vem nos textos do SRD: parágrafos, **negrito**, *itálico*, listas e tabelas.
// Gera elementos React (nada de innerHTML), então o texto nunca vira HTML executável.
import type { ReactNode } from 'react';

const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|(?<!\w)_(.+?)_(?!\w)/g;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] !== undefined ? <strong key={m.index}>{inline(m[1])}</strong> : <em key={m.index}>{m[2] ?? m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Kind = 'table' | 'list' | 'heading' | 'text';

const kindOf = (line: string): Kind =>
  line.startsWith('|') ? 'table' : /^[-*] /.test(line) ? 'list' : /^#+ /.test(line) ? 'heading' : 'text';

const cells = (line: string) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function Block({ kind, lines }: { kind: Kind; lines: string[] }) {
  switch (kind) {
    case 'table': {
      const [head, ...rows] = lines.filter((l) => !/^\|?\s*:?-{2,}/.test(l)).map(cells);
      return (
        <table className="md-table">
          <thead><tr>{head.map((c, i) => <th key={i}>{inline(c)}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
        </table>
      );
    }
    case 'list':
      return <ul>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^[-*] /, ''))}</li>)}</ul>;
    case 'heading':
      return <>{lines.map((l, i) => <p key={i} className="md-heading">{inline(l.replace(/^#+ /, ''))}</p>)}</>;
    default:
      return <p>{lines.flatMap((l, i) => (i ? [<br key={i} />, ...inline(l)] : inline(l)))}</p>;
  }
}

export function Markdown({ text }: { text: string }) {
  // Agrupa linhas seguidas do mesmo tipo; linha em branco separa parágrafos.
  const blocks: { kind: Kind; lines: string[] }[] = [];
  let prev: { kind: Kind; lines: string[] } | undefined;
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) { prev = undefined; continue; }
    const kind = kindOf(line);
    if (prev && prev.kind === kind && kind !== 'heading') prev.lines.push(line);
    else blocks.push((prev = { kind, lines: [line] }));
  }
  return <div className="md">{blocks.map((b, i) => <Block key={i} {...b} />)}</div>;
}
