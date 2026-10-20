// Desenha um espaço de escolha (choices.ts) e só deixa marcar o que a regra permite.
import { useMemo, useState, type ReactNode } from 'react';
import { CheckIcon, LockSimpleIcon, PlusIcon } from '@phosphor-icons/react';
import { optionState, type ChoiceSlot, type Resolution } from '../engine/choices';
import { Counter } from './Counter';

export interface SlotPickerProps {
  slot: ChoiceSlot;
  resolution: Resolution;
  /** Escolhas salvas do espaço (antes da validação). */
  value: string[];
  onChange: (v: string[]) => void;
  /** chips: perícias, idiomas…; list: magias e invocações (com busca); cards: opções com descrição. */
  variant?: 'chips' | 'list' | 'cards';
  /** Texto extra à direita de cada opção, ex.: o bônus da perícia. */
  aside?: (value: string) => ReactNode;
  title?: ReactNode;
  hint?: ReactNode;
}

export function SlotPicker({ slot, resolution, value, onChange, variant = 'chips', aside, title, hint }: SlotPickerProps) {
  const valid = resolution.picks[slot.id] ?? [];
  const [query, setQuery] = useState('');
  const options = useMemo(
    () => (variant === 'list' && query
      ? slot.options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
      : slot.options),
    [slot.options, variant, query],
  );

  const toggle = (v: string) => {
    if (slot.count === 1) {
      // Uma escolha só: clicar em outra opção troca (como um botão de rádio).
      onChange(valid.includes(v) ? [] : [v]);
      return;
    }
    // Guarda só as válidas: assim uma escolha que deixou de valer some ao mexer no espaço.
    onChange(valid.includes(v) ? valid.filter((x) => x !== v) : [...valid, v]);
  };

  if (slot.count <= 0) return null;

  return (
    <div className="picker">
      <div className="picker-head">
        <span className="field-label">{title ?? slot.label}</span>
        <Counter used={valid.length} total={slot.count} compact />
        {value.length > valid.length && <span className="tag tag-outline" title="Escolhas salvas que as regras não aceitam">{value.length - valid.length} ignorada{value.length - valid.length > 1 ? 's' : ''}</span>}
      </div>
      {hint && <p className="hint picker-hint">{hint}</p>}

      {variant === 'list' && (
        <>
          {slot.options.length > 12 && (
            <input className="picker-search" placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} />
          )}
          <div className="spell-list" role="group" aria-label={slot.label}>
            {options.map((o) => {
              const st = optionState(slot, resolution, valid, o.value);
              return (
                <label key={o.value} className={`spell-row${st.blocked ? ' blocked' : ''}`} title={st.reason ?? o.desc}>
                  <input
                    type={slot.count === 1 ? 'radio' : 'checkbox'} name={slot.id} checked={st.selected} disabled={st.blocked}
                    onChange={() => toggle(o.value)}
                  />
                  <span>{o.label}</span>
                  {o.desc && <span className="school">{o.desc.length > 60 ? `${o.desc.slice(0, 60)}…` : o.desc}</span>}
                  {st.reason && <span className="flags"><span className="tag tag-neutral">{st.reason}</span></span>}
                </label>
              );
            })}
            {options.length === 0 && <p className="hint">Nada encontrado.</p>}
          </div>
        </>
      )}

      {variant === 'cards' && (
        <div className="option-cards" role="radiogroup" aria-label={slot.label}>
          {options.map((o) => {
            const st = optionState(slot, resolution, valid, o.value);
            return (
              <button
                key={o.value} type="button" role={slot.count === 1 ? 'radio' : 'checkbox'} aria-checked={st.selected}
                className={`option-card${st.selected ? ' selected' : ''}`} disabled={st.blocked} title={st.reason}
                onClick={() => toggle(o.value)}
              >
                <span className="option-title">{st.selected && <CheckIcon />}{o.label}</span>
                {o.desc && <span className="option-desc">{o.desc}</span>}
                {st.reason && <span className="tag tag-neutral">{st.reason}</span>}
              </button>
            );
          })}
        </div>
      )}

      {variant === 'chips' && (
        <div className="chips">
          {options.map((o) => {
            const st = optionState(slot, resolution, valid, o.value);
            const state = st.selected ? 'selected' : st.reason ? 'locked' : st.full ? 'full' : '';
            return (
              <button
                key={o.value} type="button" className={`chip ${state}`} aria-pressed={st.selected} disabled={st.blocked}
                title={st.reason ?? o.desc} onClick={() => toggle(o.value)}
              >
                {st.selected ? <CheckIcon className="lead" /> : st.reason ? <LockSimpleIcon className="lead" /> : st.full ? null : <PlusIcon className="lead" />}
                {o.label}
                {aside && <span className="bonus">{aside(o.value)}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
