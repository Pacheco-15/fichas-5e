// Resumo ao vivo da ficha, ao lado do passo atual.
import { ArrowUpRightIcon, StarFourIcon } from '@phosphor-icons/react';
import { ABILITIES, signed } from '../data/rules';
import type { Character, Sheet } from '../engine/character';

export function Summary({ c, s, onOpenSheet }: { c: Character; s: Sheet; onOpenSheet: () => void }) {
  const line = [`${s.cls.pt} ${c.level}`, s.subclass?.pt, s.speciesLabel, s.background?.pt].filter(Boolean).join(' · ');
  const proficient = s.skills.filter((sk) => sk.proficient);
  // De onde veio a perícia: antecedente, classe, espécie… (nome do espaço de escolha).
  const source = (key: string) => (s.choices.taken.skills?.[key] ?? '').replace(/^antecedente \((.*)\)$/, '$1').replace(/^Perícias do /, '');

  return (
    <aside className="summary" aria-label="Resumo da ficha">
      <div className="summary-head">
        <span className="kicker">Ficha ao vivo</span>
        <button type="button" className="ghost" onClick={onOpenSheet}>Ver ficha<ArrowUpRightIcon /></button>
      </div>
      <div>
        <div className="summary-name">{c.name || 'Sem nome'}</div>
        <div className="summary-line">{line}</div>
      </div>
      <div className="summary-stats">
        <div><strong>{s.ac}</strong><span>CA</span></div>
        <div><strong>{s.hpMax}</strong><span>PV</span></div>
        <div><strong>{signed(s.initiative)}</strong><span>INIC.</span></div>
        <div><strong>{s.passivePerception}</strong><span>PERC.</span></div>
      </div>
      <div className="summary-abilities">
        {ABILITIES.map((a) => (
          <div key={a.key}><span>{a.short}</span><strong>{signed(s.mods[a.key])}</strong></div>
        ))}
      </div>
      <div>
        <div className="kicker">Perícias proficientes · {proficient.length}</div>
        <ul className="summary-skills">
          {proficient.map((sk) => (
            <li key={sk.key}>
              {sk.expertise ? <StarFourIcon weight="fill" size={11} /> : <span className="pip" />}
              <span>{sk.label}</span>
              <span className="src">{source(sk.key)}</span>
              <span className="num">{signed(sk.bonus)}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
