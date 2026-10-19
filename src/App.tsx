import { useMemo, useRef } from 'react';
import { Editor } from './components/Editor';
import { Sheet } from './components/Sheet';
import { CLASSES, byKey } from './data/rules';
import { computeSheet, newCharacter } from './engine/character';
import { useCharacters } from './store';

export default function App() {
  const store = useCharacters();
  const { current: c } = store;
  const sheet = useMemo(() => computeSheet(c), [c]);
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="app">
      <header className="toolbar">
        <strong className="brand">Fichas 5.5e</strong>
        <select value={c.id} onChange={(e) => store.setCurrentId(e.target.value)}>
          {store.characters.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} — {byKey(CLASSES, x.classKey)?.pt} {x.level}
            </option>
          ))}
        </select>
        <button onClick={() => store.add(newCharacter())}>Novo</button>
        <button onClick={store.duplicate}>Duplicar</button>
        <button onClick={() => confirm(`Excluir "${c.name}"?`) && store.remove()}>Excluir</button>
        <span className="spacer" />
        <button onClick={store.exportJson}>Exportar JSON</button>
        <button onClick={() => fileInput.current?.click()}>Importar JSON</button>
        <input
          ref={fileInput} type="file" accept="application/json" hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) store.importJson(file).catch(() => alert('Arquivo inválido.'));
            e.target.value = '';
          }}
        />
        <button className="primary" onClick={() => window.print()}>Imprimir / PDF</button>
      </header>

      <main className="layout">
        <aside className="editor-pane">
          {sheet.warnings.length > 0 && (
            <ul className="warnings">
              {sheet.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          <Editor c={c} sheet={sheet} update={store.update} />
        </aside>
        <section className="sheet-pane">
          <Sheet c={c} s={sheet} />
        </section>
      </main>
    </div>
  );
}
