// Contador de pontos ou escolhas para gastar, com uma bolinha por ponto.
import { CheckIcon, WarningCircleIcon } from '@phosphor-icons/react';

/** Acima disso as bolinhas ficam apertadas; mostra só o número. */
const MAX_PIPS = 12;

export function Counter({ label, used, total, invalid, compact }: {
  label?: string;
  used: number;
  total: number;
  /** Combinação inválida: o contador avisa em vez de contar. */
  invalid?: boolean;
  compact?: boolean;
}) {
  const left = total - used;
  const state = invalid ? 'invalid' : left === 0 ? 'done' : left < 0 ? 'over' : 'open';
  const text = invalid ? 'combinação inválida'
    : left === 0 ? (compact ? 'pronto' : 'tudo distribuído')
    : left > 0 ? `falta${left > 1 ? 'm' : ''} ${left}`
    : `${-left} a mais`;
  const pips = Math.max(total, used);

  return (
    <div className={`counter ${state}${compact ? ' compact' : ''}`} role="status" aria-live="polite">
      {label && <span className="counter-label">{label}</span>}
      {pips <= MAX_PIPS && (
        <span className="counter-pips" aria-hidden="true">
          {Array.from({ length: pips }, (_, i) => (
            <span key={i} className={`counter-pip${i < used ? ' on' : ''}${i >= total ? ' extra' : ''}`} />
          ))}
        </span>
      )}
      <span className="counter-num"><strong>{used}</strong>/{total}</span>
      <span className="counter-text">
        {state === 'done' ? <CheckIcon /> : state !== 'open' && <WarningCircleIcon />}
        {text}
      </span>
    </div>
  );
}
