import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftIcon, CopyIcon, DotsThreeIcon, DownloadSimpleIcon, PlusIcon, PrinterIcon, TrashIcon, UploadSimpleIcon,
} from '@phosphor-icons/react';
import { StepPanel, StepRail } from './components/Editor';
import { Sheet } from './components/Sheet';
import { Summary } from './components/Summary';
import { CLASSES, byKey } from './data/rules';
import { computeSheet, newCharacter } from './engine/character';
import { useCharacters } from './store';

export default function App() {
  const store = useCharacters();
  const { current: c } = store;
  const sheet = useMemo(() => computeSheet(c), [c]);
  const fileInput = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const [step, setStep] = useState(0);
  const [showSheet, setShowSheet] = useState(false);

  // Trocar de ficha volta ao primeiro passo.
  const [shownId, setShownId] = useState(c.id);
  if (shownId !== c.id) {
    setShownId(c.id);
    setStep(0);
  }

  // Fecha o menu ⋯ ao clicar fora dele.
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) menu.current.removeAttribute('open');
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const goStep = (i: number) => {
    setStep(i);
    setShowSheet(false);
  };
  const fromMenu = (action: () => void) => () => {
    menu.current?.removeAttribute('open');
    action();
  };

  return (
    <div className="app">
      <header className="toolbar">
        <strong className="brand">Fichas 5.5e</strong>
        <select value={c.id} aria-label="Ficha" onChange={(e) => store.setCurrentId(e.target.value)}>
          {store.characters.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} — {byKey(CLASSES, x.classKey)?.pt} {x.level}
            </option>
          ))}
        </select>
        <button className="ghost" onClick={() => store.add(newCharacter())}><PlusIcon />Novo</button>
        <span className="spacer" />
        <details className="menu" ref={menu}>
          <summary role="button" aria-label="Mais ações" title="Mais ações">
            <DotsThreeIcon size={18} />
          </summary>
          <div className="menu-list">
            <button onClick={fromMenu(store.duplicate)}><CopyIcon />Duplicar</button>
            <button onClick={fromMenu(store.exportJson)}><DownloadSimpleIcon />Exportar JSON</button>
            <button onClick={fromMenu(() => fileInput.current?.click())}><UploadSimpleIcon />Importar JSON</button>
            <button className="danger" onClick={fromMenu(() => confirm(`Excluir "${c.name}"?`) && store.remove())}>
              <TrashIcon />Excluir
            </button>
          </div>
        </details>
        <input
          ref={fileInput} type="file" accept="application/json" hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) store.importJson(file).catch(() => alert('Arquivo inválido.'));
            e.target.value = '';
          }}
        />
        <button className="primary" title="Imprimir / PDF" onClick={() => window.print()}><PrinterIcon /><span className="label">Imprimir / PDF</span></button>
      </header>

      <div className={`workspace${showSheet ? ' sheet-mode' : ''}`}>
        <StepRail sheet={sheet} step={step} current={!showSheet} onStep={goStep} />
        {!showSheet && (
          <>
            <StepPanel c={c} sheet={sheet} update={store.update} step={step} onStep={goStep} />
            <Summary c={c} s={sheet} onOpenSheet={() => setShowSheet(true)} />
          </>
        )}
        {/* A ficha completa fica sempre na página para a impressão; na tela, só quando aberta. */}
        <section className={`sheet-view${showSheet ? '' : ' print-only'}`}>
          <button type="button" className="ghost sheet-back" onClick={() => setShowSheet(false)}>
            <ArrowLeftIcon />Voltar para a criação
          </button>
          <Sheet c={c} s={sheet} />
        </section>
      </div>
    </div>
  );
}
