// Criação/edição do personagem, dividida em passos. As escolhas vêm dos espaços de choices.ts:
// a tela só mostra o que a regra permite (docs/REGRAS.md).
import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, PrinterIcon, WarningCircleIcon } from '@phosphor-icons/react';
import {
  ABILITIES, BACKGROUNDS, CLASSES, SPECIES,
  abilityLabel, byKey, modifier, signed, skillLabel,
  type AbilityKey, type SkillKey,
} from '../data/rules';
import { ITEMS, gearLabel, itemName } from '../data/equipment';
import { ARMOR_CATEGORY_PT, spellLabel } from '../data/terms';
import {
  POINT_BUDGET, POINT_COST, STANDARD_ARRAY, WARRIOR_OPTIONS, backgroundBonusProblem, pointBuyCost,
  type AbilityMethod, type ChoiceSlot, type SlotArea,
} from '../engine/choices';
import type { Character, Sheet } from '../engine/character';
import { labelPt, translation } from '../data/translations';
import { Counter } from './Counter';
import { Markdown } from './Markdown';
import { SlotPicker, type SlotPickerProps } from './SlotPicker';
import { ALIGNMENTS, FEAT_HELP, HELP, SPECIES_CHOICE_HELP } from './help';

interface Props {
  c: Character;
  sheet: Sheet;
  update: (patch: Partial<Character>) => void;
}

type StepId = SlotArea | 'hp' | 'story' | 'review';

const STEPS: { id: StepId; title: string }[] = [
  { id: 'basic', title: 'Básico' },
  { id: 'abilities', title: 'Atributos' },
  { id: 'skills', title: 'Perícias' },
  { id: 'feats', title: 'Feats e opções' },
  { id: 'hp', title: 'Pontos de vida' },
  { id: 'equipment', title: 'Equipamento' },
  { id: 'spells', title: 'Magias' },
  { id: 'story', title: 'História' },
  { id: 'review', title: 'Revisão' },
];

/** Passos que contam no progresso: história é opcional e a revisão só confere. */
const REQUIRED = STEPS.filter((s) => s.id !== 'story' && s.id !== 'review');

const pad = (n: number) => String(n).padStart(2, '0');

function Intro({ children }: { children: ReactNode }) {
  return <p className="step-intro">{children}</p>;
}

/** Nome do campo com um botão "?" que abre uma explicação curta para quem está começando. */
function FieldHead({ label, help, htmlFor }: { label: ReactNode; help?: ReactNode; htmlFor?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="field-head">
        {htmlFor ? <label className="field-label" htmlFor={htmlFor}>{label}</label> : <span className="field-label">{label}</span>}
        {help && (
          <button
            type="button" className="help-btn" aria-expanded={open} aria-label="O que é isso?" title="O que é isso?"
            onClick={() => setOpen(!open)}
          >?</button>
        )}
      </div>
      {help && open && <p className="help-text">{help}</p>}
    </>
  );
}

function Field({ label, children, hint, help }: { label: string; children: ReactNode; hint?: ReactNode; help?: ReactNode }) {
  const id = useId();
  const control = isValidElement<{ id?: string }>(children) ? cloneElement(children, { id }) : children;
  return (
    <div className="field">
      <FieldHead label={label} help={help} htmlFor={id} />
      {control}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/** Trilho com os passos da criação, o que falta em cada um e o progresso. */
export function StepRail({ sheet, step, current, onStep }: {
  sheet: Sheet;
  step: number;
  /** Falso quando a ficha completa está aberta no lugar do passo. */
  current: boolean;
  onStep: (i: number) => void;
}) {
  const pending = (id: StepId) => sheet.warnings.filter((w) => w.area === id).length;
  const done = REQUIRED.filter((s) => pending(s.id) === 0).length;

  return (
    <nav className="step-rail" aria-label="Passos da criação">
      <div className="kicker">Criação</div>
      <ol>
        {STEPS.map((s, i) => {
          const isCurrent = current && i === step;
          const n = pending(s.id);
          return (
            <li key={s.id}>
              <button
                type="button" className={`step-link${isCurrent ? ' current' : ''}`} onClick={() => onStep(i)}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="mono-num">{pad(i + 1)}</span>
                {s.title}
                <span className="status">
                  {isCurrent ? <ArrowRightIcon />
                    : n > 0 ? <span className="tag tag-accent" title={`${n} pendência${n > 1 ? 's' : ''}`}>{n}</span>
                    : s.id === 'story' ? <span className="optional">opcional</span>
                    : s.id !== 'review' && <CheckIcon />}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="progress">
        <div className="progress-label"><span>Progresso</span><span>{done} de {REQUIRED.length}</span></div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${(done / REQUIRED.length) * 100}%` }} /></div>
      </div>
    </nav>
  );
}

/** O passo atual: título, explicação, pendências, campos e navegação. */
export function StepPanel({ c, sheet, update, step, onStep }: Props & { step: number; onStep: (i: number) => void }) {
  const main = useRef<HTMLElement>(null);
  const current = STEPS[step];
  const warnings = sheet.warnings.filter((w) => w.area === current.id);
  const prev = STEPS[step - 1];
  const next = STEPS[step + 1];

  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
    if (main.current && main.current.getBoundingClientRect().top < 0) window.scrollTo({ top: 0 });
  }, [step]);

  return (
    <main className="step-main" ref={main}>
      <section className="step">
        <header className="step-head">
          <span className="mono-num">PASSO {pad(step + 1)}</span>
          <h1>{current.title}</h1>
        </header>
        {warnings.length > 0 && (
          <ul className="warnings">
            {warnings.map((w) => <li key={w.text}><WarningCircleIcon />{w.text}</li>)}
          </ul>
        )}
        <div className="step-body">
          <StepBody id={current.id} c={c} sheet={sheet} update={update} go={onStep} />
        </div>
        <nav className="step-nav">
          {prev && <button type="button" onClick={() => onStep(step - 1)}><ArrowLeftIcon />{prev.title}</button>}
          {next ? (
            <button type="button" className="primary" onClick={() => onStep(step + 1)}>{next.title}<ArrowRightIcon /></button>
          ) : (
            <button type="button" className="primary" onClick={() => window.print()}><PrinterIcon />Imprimir / PDF</button>
          )}
        </nav>
      </section>
    </main>
  );
}

/** Liga um espaço de escolha às escolhas salvas na ficha. */
function useSlots(c: Character, sheet: Sheet, update: Props['update']) {
  const r = sheet.choices;
  return {
    of: (area: SlotArea, filter: (s: ChoiceSlot) => boolean = () => true) => r.slots.filter((s) => s.area === area && s.count > 0 && filter(s)),
    picker: (slot: ChoiceSlot, extra: Partial<SlotPickerProps> = {}) => (
      <SlotPicker
        key={slot.id} slot={slot} resolution={r} value={c.picks[slot.id] ?? []}
        onChange={(v) => update({ picks: { ...c.picks, [slot.id]: v } })}
        {...extra}
      />
    ),
  };
}

function StepBody({ id, c, sheet, update, go }: Props & { id: StepId; go: (i: number) => void }) {
  const cls = sheet.cls;
  const bg = sheet.background;
  const species = byKey(SPECIES, c.speciesKey);
  const slots = useSlots(c, sheet, update);
  const skillBonus = (v: string) => {
    const row = sheet.skills.find((s) => s.key === (v as SkillKey));
    return row ? signed(row.bonus) : '';
  };

  switch (id) {
    case 'basic':
      return (
        <>
          <Intro>
            Quem é o seu personagem? A <strong>classe</strong> é o que ele sabe fazer na aventura, a <strong>espécie</strong> traz
            traços de nascença e o <strong>antecedente</strong> conta o que ele fazia antes. Na dúvida, comece no nível 1.
          </Intro>
          <div className="grid2">
            <Field label="Nome do personagem">
              <input value={c.name} onChange={(e) => update({ name: e.target.value })} />
            </Field>
            <Field label="Jogador" help={HELP.player}>
              <input value={c.player} onChange={(e) => update({ player: e.target.value })} />
            </Field>
            <Field label="Classe" help={HELP.class} hint={`Atributo principal: ${cls.primaryAbility} · Dado de vida: d${cls.hitDie}`}>
              <select
                value={c.classKey}
                onChange={(e) => update({ classKey: e.target.value, subclassKey: null, feats: {}, armorKey: null, shield: false })}
              >
                {CLASSES.map((x) => <option key={x.key} value={x.key}>{x.pt} ({x.name})</option>)}
              </select>
            </Field>
            <Field label="Nível" help={HELP.level}>
              <input
                type="number" min={1} max={20} value={c.level}
                onChange={(e) => update({ level: Math.min(20, Math.max(1, Math.trunc(Number(e.target.value)) || 1)) })}
              />
            </Field>
            <Field label="Subclasse" help={HELP.subclass} hint={c.level < 3 ? 'Disponível a partir do nível 3.' : undefined}>
              <select
                value={c.level >= 3 ? c.subclassKey ?? '' : ''} disabled={c.level < 3}
                onChange={(e) => update({ subclassKey: e.target.value || null })}
              >
                <option value="">—</option>
                {cls.subclasses.map((s) => <option key={s.key} value={s.key}>{s.pt === s.name ? s.name : `${s.pt} (${s.name})`}</option>)}
              </select>
            </Field>
            <Field label="Alinhamento" help={HELP.alignment}>
              <input
                list="alignments" placeholder="Ex.: Neutro e Bom"
                value={c.alignment} onChange={(e) => update({ alignment: e.target.value })}
              />
            </Field>
            <datalist id="alignments">
              {ALIGNMENTS.map((a) => <option key={a} value={a} />)}
            </datalist>
            <Field
              label="Espécie" help={HELP.species}
              hint={species && [
                !species.choices.some((ch) => ch.kind === 'size') && species.size,
                `Deslocamento: ${species.speed} ft`,
              ].filter(Boolean).join(' · ')}
            >
              <select value={c.speciesKey} onChange={(e) => update({ speciesKey: e.target.value, speciesChoices: {} })}>
                {SPECIES.map((x) => <option key={x.key} value={x.key}>{x.pt === x.name ? x.pt : `${x.pt} (${x.name})`}</option>)}
              </select>
            </Field>
            <Field
              label="Antecedente"
              help={HELP.background}
              hint={bg && `Atributos: ${bg.abilities.map(abilityLabel).join(', ')} · Perícias: ${bg.skills.map(skillLabel).join(', ')} · Feat: ${bg.featText}`}
            >
              <select value={c.backgroundKey} onChange={(e) => update({ backgroundKey: e.target.value, backgroundBonus: {} })}>
                {BACKGROUNDS.map((x) => <option key={x.key} value={x.key}>{x.pt} ({x.name})</option>)}
              </select>
            </Field>
          </div>
          {species && species.choices.length > 0 && (
            <>
              <h3 className="subhead">Escolhas do {species.pt}</h3>
              <div className="grid2">
                {species.choices.map((choice) => {
                  const option = choice.options.find((o) => o.name === c.speciesChoices[choice.key]);
                  return (
                    <Field
                      key={choice.key} label={choice.label}
                      help={SPECIES_CHOICE_HELP[choice.kind === 'trait' ? choice.trait : choice.kind]}
                      hint={option?.desc && (
                        <span className="choice-desc">
                          {translation(`${species.key}/${choice.trait}/${option.name}`)?.desc ?? option.desc}
                        </span>
                      )}
                    >
                      <select
                        value={option?.name ?? ''}
                        onChange={(e) => update({ speciesChoices: { ...c.speciesChoices, [choice.key]: e.target.value } })}
                      >
                        <option value="">Escolha…</option>
                        {choice.options.map((o) => <option key={o.name} value={o.name}>{o.label}</option>)}
                      </select>
                    </Field>
                  );
                })}
              </div>
            </>
          )}
          <h3 className="subhead">Idiomas</h3>
          <p className="hint">Você já sabe: {sheet.languages.filter((l) => !Object.values(c.picks).flat().includes(l)).join(', ')}.</p>
          <div className="slot-group">{slots.of('basic').map((s) => slots.picker(s, { hint: s.id === 'origin:languages' ? HELP.languages : undefined }))}</div>
        </>
      );

    case 'abilities':
      return <AbilitiesStep c={c} sheet={sheet} update={update} />;

    case 'skills': {
      const skillSlots = slots.of('skills', (s) => s.group === 'skills' || s.id.endsWith(':skilled'));
      const expertiseSlots = slots.of('skills', (s) => s.group === 'expertise');
      const toolSlots = slots.of('skills', (s) => s.id === 'background:tool' || s.id === 'class:tools');
      return (
        <>
          <Intro>
            Perícias são as coisas em que o personagem é treinado, como Furtividade ou Persuasão. O antecedente já dá
            {bg ? ` ${bg.skills.map(skillLabel).join(' e ')}` : ' duas'}. Cada escolha abaixo vem de uma regra e só aceita as perícias
            que essa regra permite. Uma perícia que você já tem aparece com cadeado.
          </Intro>
          <div className="slot-group">
            {skillSlots.map((s) => slots.picker(s, { aside: skillBonus, hint: s.id === 'class-skills' ? HELP.skills : undefined }))}
          </div>
          <h3 className="subhead">Especialização (Expertise)</h3>
          {expertiseSlots.length ? (
            <div className="slot-group">{expertiseSlots.map((s) => slots.picker(s, { aside: skillBonus, hint: HELP.expertise }))}</div>
          ) : (
            <p className="hint">Só Ladino (nível 1), Bardo, Patrulheiro e Mago (nível 2) ganham Especialização.</p>
          )}
          <h3 className="subhead">Ferramentas</h3>
          <p className="hint">Você já tem: {sheet.tools.filter((t) => !Object.values(c.picks).flat().includes(t)).join(', ') || 'nenhuma fixa'}.</p>
          <div className="slot-group">{toolSlots.map((s) => slots.picker(s))}</div>
          <h3 className="subhead">Fora das regras de criação</h3>
          <p className="hint">Só use se o mestre der perícias ou Especializações a mais (um item mágico, uma recompensa).</p>
          <div className="row">
            <label className="other-sources">Perícias do mestre
              <input type="number" min={0} max={18} value={c.extraSkillBonus} onChange={(e) => update({ extraSkillBonus: Math.min(18, Math.max(0, Math.trunc(Number(e.target.value)) || 0)) })} />
            </label>
            <label className="other-sources">Especializações do mestre
              <input type="number" min={0} max={18} value={c.expertiseBonus} onChange={(e) => update({ expertiseBonus: Math.min(18, Math.max(0, Math.trunc(Number(e.target.value)) || 0)) })} />
            </label>
          </div>
        </>
      );
    }

    case 'feats':
      return (
        <>
          <Intro>
            Feats são talentos especiais. O antecedente já dá um; outros chegam com o nível ou com a classe. Cada espaço só
            mostra os feats cujo pré-requisito você cumpre, e um feat só se repete se ele disser "Repeatable".
          </Intro>
          <FeatSection c={c} sheet={sheet} update={update} />
          {slots.of('feats', (s) => s.id.includes(':mi-')).map((s) => slots.picker(s, { variant: 'chips' }))}
          {slots.of('feats', (s) => !s.id.includes(':mi-')).length > 0 && <h3 className="subhead">Opções da classe</h3>}
          <div className="slot-group">
            {slots.of('feats', (s) => s.id.startsWith('feature:') || s.id === 'class:metamagic').map((s) => slots.picker(s, { variant: 'cards' }))}
            {slots.of('feats', (s) => s.id === 'class:invocations').map((s) => slots.picker(s, { variant: 'list' }))}
          </div>
        </>
      );

    case 'hp':
      return (
        <>
          <Intro>
            Pontos de vida (PV) mostram quanto dano o personagem aguenta antes de cair. Na <strong>média</strong> você ganha um
            valor fixo a cada nível, sem sorte nem azar. Em <strong>rolados</strong> você rola o dado de vida (d{cls.hitDie}) a cada
            nível e digita o resultado, de 1 a {cls.hitDie}. Se não sabe qual escolher, fique com a média.
          </Intro>
          <div className="row">
            <label><input type="radio" checked={c.hpMethod === 'average'} onChange={() => update({ hpMethod: 'average' })} /> Média ({Math.floor(cls.hitDie / 2) + 1} por nível)</label>
            <label><input type="radio" checked={c.hpMethod === 'rolled'} onChange={() => update({ hpMethod: 'rolled' })} /> Rolados</label>
          </div>
          {c.hpMethod === 'rolled' && c.level > 1 && (
            <div className="hp-rolls">
              {Array.from({ length: c.level - 1 }, (_, i) => (
                <Field key={i} label={`Nv ${i + 2}`}>
                  <input
                    type="number" min={1} max={cls.hitDie}
                    value={c.hpRolls[i] ?? ''}
                    onChange={(e) => {
                      const hpRolls = [...c.hpRolls];
                      hpRolls[i] = Math.min(cls.hitDie, Math.max(1, Math.trunc(Number(e.target.value)) || 1));
                      update({ hpRolls });
                    }}
                  />
                </Field>
              ))}
            </div>
          )}
          <p className="hint">Nível 1: {cls.hitDie} + CON. PV máximo atual: <strong>{sheet.hpMax}</strong></p>
        </>
      );

    case 'equipment':
      return <EquipmentStep c={c} sheet={sheet} update={update} />;

    case 'spells':
      return <SpellsStep c={c} sheet={sheet} update={update} />;

    case 'story':
      return (
        <>
          <Intro>Tudo aqui é opcional: personalidade, aparência, história e o que mais quiser anotar.</Intro>
          <Field label="Personalidade, aparência, história">
            <textarea rows={4} value={c.personality} onChange={(e) => update({ personality: e.target.value })} />
          </Field>
          <Field label="Notas">
            <textarea rows={4} value={c.notes} onChange={(e) => update({ notes: e.target.value })} />
          </Field>
        </>
      );

    case 'review':
      return (
        <>
          <Intro>
            Confira se ficou faltando alguma escolha. A ficha já está pronta para imprimir ou salvar em PDF, e você pode voltar a
            qualquer passo pela lista ao lado.
          </Intro>
          {sheet.warnings.length > 0 ? (
            <ul className="review-list">
              {sheet.warnings.map((w) => {
                const i = STEPS.findIndex((s) => s.id === w.area);
                return (
                  <li key={w.text}>
                    <span>{w.text}</span>
                    <button type="button" onClick={() => go(i)}>Ir para {STEPS[i].title}</button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="ok"><CheckIcon />Tudo certo! Nenhuma escolha pendente.</p>
          )}
          <p className="hint">Use <strong>Exportar JSON</strong> no menu ⋯ da barra de cima para guardar uma cópia da ficha.</p>
        </>
      );
  }
}

/* ---------- Atributos ---------- */

const METHODS: { id: AbilityMethod; label: string; desc: string }[] = [
  { id: 'standard', label: 'Conjunto padrão', desc: '15, 14, 13, 12, 10 e 8, um em cada atributo.' },
  { id: 'pointbuy', label: 'Compra de pontos', desc: `${POINT_BUDGET} pontos, valores de 8 a 15.` },
  { id: 'random', label: 'Rolagem', desc: '4d6 seis vezes, descartando o menor dado. Valores de 3 a 18.' },
];

function AbilitiesStep({ c, sheet, update }: Props) {
  const cls = sheet.cls;
  const bg = sheet.background;
  const cost = pointBuyCost(c.baseScores);
  const setBase = (a: AbilityKey, v: number) => update({ baseScores: { ...c.baseScores, [a]: v } });

  const changeMethod = (m: AbilityMethod) => {
    if (m === c.abilityMethod) return;
    // Trocar de método recomeça de valores que já valem nele.
    const baseScores = m === 'standard' ? { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }
      : m === 'pointbuy' ? { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }
      : c.baseScores;
    update({ abilityMethod: m, baseScores });
  };

  return (
    <>
      <Intro>
        Os seis atributos dizem o quanto o personagem é forte, ágil, resistente, esperto, atento e carismático. Escolha como
        gerar os valores; os maiores costumam ir em {cls.primaryAbility}, o atributo principal do {cls.pt}. Depois some os
        pontos do antecedente{bg ? ` (${bg.abilities.map(abilityLabel).join(', ')})` : ''}: +2 num e +1 noutro, ou +1 em três.
      </Intro>
      <div className="option-cards" role="radiogroup" aria-label="Método de atributos">
        {METHODS.map((m) => (
          <button
            key={m.id} type="button" role="radio" aria-checked={c.abilityMethod === m.id}
            className={`option-card${c.abilityMethod === m.id ? ' selected' : ''}`} onClick={() => changeMethod(m.id)}
          >
            <span className="option-title">{c.abilityMethod === m.id && <CheckIcon />}{m.label}</span>
            <span className="option-desc">{m.desc}</span>
          </button>
        ))}
      </div>
      <div className="counters">
        {c.abilityMethod === 'pointbuy' && (
          <Counter label="Pontos da compra" used={cost ?? POINT_BUDGET + 1} total={POINT_BUDGET} invalid={cost === null} />
        )}
        {bg && (
          <Counter
            label={`Pontos do antecedente (${bg.pt})`}
            used={Object.values(c.backgroundBonus).reduce((s, n) => s + (n ?? 0), 0)}
            total={3}
            invalid={backgroundBonusProblem(c.backgroundBonus, bg.abilities) !== null}
          />
        )}
      </div>
      <table className="table ability-table">
        <thead>
          <tr><th>Atributo</th><th>Base</th><th>Antecedente</th><th>Feats</th><th>Total</th><th>Mod</th></tr>
        </thead>
        <tbody>
          {ABILITIES.map((a) => {
            const fromFeats = sheet.scores[a.key] - sheet.choices.scoresBeforeFeats[a.key];
            const alreadyInvalid = !!bg && backgroundBonusProblem(c.backgroundBonus, bg.abilities) !== null;
            const allowed = (n: number) =>
              !bg || alreadyInvalid || backgroundBonusProblem({ ...c.backgroundBonus, [a.key]: n }, bg.abilities) === null;
            const value = c.baseScores[a.key];
            // Conjunto padrão: cada valor do conjunto só pode estar num atributo.
            const usedElsewhere = (v: number) =>
              ABILITIES.filter((b) => b.key !== a.key && c.baseScores[b.key] === v).length >= STANDARD_ARRAY.filter((x) => x === v).length;
            return (
              <tr key={a.key}>
                <td>{a.pt}</td>
                <td>
                  {c.abilityMethod === 'standard' ? (
                    <select
                      value={value} aria-label={`${a.pt}: valor base`}
                      onChange={(e) => {
                        // Troca com o atributo que tinha esse valor, para o conjunto continuar completo.
                        const v = Number(e.target.value);
                        const other = ABILITIES.find((b) => b.key !== a.key && c.baseScores[b.key] === v);
                        update({ baseScores: { ...c.baseScores, [a.key]: v, ...(other && { [other.key]: value }) } });
                      }}
                    >
                      {STANDARD_ARRAY.map((v) => <option key={v} value={v}>{v}{usedElsewhere(v) ? ' (troca)' : ''}</option>)}
                    </select>
                  ) : c.abilityMethod === 'pointbuy' ? (
                    <select value={value} aria-label={`${a.pt}: valor base`} onChange={(e) => setBase(a.key, Number(e.target.value))}>
                      {Object.keys(POINT_COST).map(Number).map((v) => {
                        const next = (cost ?? 0) - (POINT_COST[value] ?? 0) + POINT_COST[v];
                        return <option key={v} value={v} disabled={cost !== null && next > POINT_BUDGET}>{v} ({POINT_COST[v]} pts)</option>;
                      })}
                    </select>
                  ) : (
                    <input
                      type="number" min={3} max={18} value={value} aria-label={`${a.pt}: valor base`}
                      onChange={(e) => setBase(a.key, Math.min(18, Math.max(3, Math.trunc(Number(e.target.value)) || 3)))}
                    />
                  )}
                </td>
                <td>
                  {bg?.abilities.includes(a.key) ? (
                    <select
                      value={c.backgroundBonus[a.key] ?? 0}
                      onChange={(e) => update({ backgroundBonus: { ...c.backgroundBonus, [a.key]: Number(e.target.value) } })}
                    >
                      <option value={0}>—</option>
                      <option value={1} disabled={!allowed(1)}>+1</option>
                      <option value={2} disabled={!allowed(2)}>+2</option>
                    </select>
                  ) : <span className="muted">—</span>}
                </td>
                <td>{fromFeats ? signed(fromFeats) : <span className="muted">—</span>}</td>
                <td><strong>{sheet.scores[a.key]}</strong></td>
                <td>{signed(modifier(sheet.scores[a.key]))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="hint">
        Antecedente: só um atributo pode receber +2, e o total é 3 pontos. Nenhum bônus leva um atributo acima de 20. Para mudar
        o +2 de lugar, tire-o primeiro do atributo onde ele está.
      </p>
      <p className="hint">{HELP.modifier}</p>
    </>
  );
}

/* ---------- Feats ---------- */

function FeatSection({ c, sheet, update }: Props) {
  const cls = sheet.cls;
  return (
    <div className="feats">
      {sheet.choices.feats.map(({ slot, feat, abilities, options, warrior }) => {
        const choice = c.feats[slot.id] ?? { featKey: null, abilities: [] };
        const setChoice = (patch: Partial<typeof choice>) => update({ feats: { ...c.feats, [slot.id]: { ...choice, ...patch } } });
        const allowedAbilities = feat?.name === 'Grappler' ? (['str', 'dex'] as AbilityKey[]) : ABILITIES.map((a) => a.key);
        return (
          <div key={slot.id} className="feat-slot">
            <Field label={slot.label} help={FEAT_HELP[slot.allowed[0]]}>
              {slot.fixedKey !== undefined ? (
                <input value={feat ? labelPt(feat.key, feat.name) : '—'} disabled />
              ) : (
                <select value={choice.featKey ?? ''} onChange={(e) => setChoice({ featKey: e.target.value || null, abilities: [] })}>
                  <option value="">—</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value} disabled={!!o.disabled}>
                      {labelPt(o.value, o.label)} · {o.desc}{o.disabled ? ` (${o.disabled})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {feat && feat.abilityPicks > 0 && (
              <div className="row">
                {Array.from({ length: feat.abilityPicks }, (_, i) => (
                  <select
                    key={i}
                    value={choice.abilities[i] ?? ''}
                    aria-label={`Ponto de atributo ${i + 1}`}
                    onChange={(e) => {
                      const next = [...choice.abilities];
                      next[i] = e.target.value as AbilityKey;
                      setChoice({ abilities: next.filter(Boolean) });
                    }}
                  >
                    <option value="">+1 em…</option>
                    {allowedAbilities.map((a) => {
                      const atMax = sheet.choices.scoresBeforeFeats[a] >= feat.maxScore && !abilities.includes(a);
                      return <option key={a} value={a} disabled={atMax}>+1 {abilityLabel(a)}{atMax ? ' (no máximo)' : ''}</option>;
                    })}
                  </select>
                ))}
                <Counter label="Pontos de atributo" used={abilities.length} total={feat.abilityPicks} compact />
                <span className="hint">
                  Máx. {feat.maxScore}
                  {feat.name === 'Ability Score Improvement' ? '. Repita o atributo para +2.' : ''}
                  {feat.name === 'Grappler' ? '. Só Força ou Destreza.' : ''}
                </span>
              </div>
            )}
            {feat && (
              <div className="hint feat-desc">
                <Markdown text={translation(feat.key)?.desc ?? (feat.benefits.join('\n\n') || feat.desc)} />
              </div>
            )}
            {warrior && <p className="hint">{WARRIOR_OPTIONS[cls.name].name}. Escolha os truques no passo Magias.</p>}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Equipamento ---------- */

const SHOP_LABEL: Record<string, string> = {
  weapon: 'Armas', armor: 'Armaduras', shield: 'Escudo', 'adventuring-gear': 'Equipamento de aventura',
  tools: 'Ferramentas', ammunition: 'Munição', 'equipment-pack': 'Pacotes', 'spellcasting-focus': 'Foco de conjuração',
};

function EquipmentStep({ c, sheet, update }: Props) {
  const cls = sheet.cls;
  const slots = useSlots(c, sheet, update);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('weapon');
  const shop = useMemo(
    () => ITEMS.filter((i) => (i.category === category || (category === 'armor' && i.category === 'shield'))
      && `${itemName(i)} ${i.name}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => itemName(a).localeCompare(itemName(b))),
    [category, query],
  );
  const buy = (itemKey: string) => {
    const existing = c.purchases.find((p) => p.itemKey === itemKey);
    update({
      purchases: existing
        ? c.purchases.map((p) => (p.itemKey === itemKey ? { ...p, qty: p.qty + 1 } : p))
        : [...c.purchases, { itemKey, qty: 1 }],
    });
  };
  const unbuy = (itemKey: string) => update({
    purchases: c.purchases.map((p) => (p.itemKey === itemKey ? { ...p, qty: p.qty - 1 } : p)).filter((p) => p.qty > 0),
  });
  const packages = slots.of('equipment', (s) => s.id === 'equipment:class' || s.id === 'equipment:background');
  const others = slots.of('equipment', (s) => s.id === 'equipment:instrument');
  const mastery = slots.of('equipment', (s) => s.id === 'class:weapon-mastery');

  return (
    <>
      <Intro>
        A classe e o antecedente dão, cada um, <strong>uma</strong> opção de equipamento inicial: um pacote pronto ou moedas
        de ouro (PO). O ouro que sobrar pode ser gasto na loja abaixo, até acabar. Depois escolha o que o personagem veste.
      </Intro>
      <div className="slot-group">{packages.map((s) => slots.picker(s, { variant: 'cards' }))}</div>
      {others.map((s) => slots.picker(s))}

      <h3 className="subhead">Ouro</h3>
      <p className={sheet.gold.left < 0 ? 'warnings' : 'hint'}>
        Total: <strong>{sheet.gold.total} PO</strong> · Gasto: <strong>{sheet.gold.spent} PO</strong> · Sobra: <strong>{sheet.gold.left} PO</strong>.
        Começando acima do nível 1, o mestre decide se o personagem ganha mais.
      </p>
      <label className="other-sources">Ouro extra dado pelo mestre
        <input type="number" min={0} value={c.extraGold} onChange={(e) => update({ extraGold: Math.max(0, Math.trunc(Number(e.target.value)) || 0) })} />
      </label>

      <h3 className="subhead">Loja</h3>
      <div className="shop">
        <div className="row">
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria">
            {Object.entries(SHOP_LABEL).filter(([k]) => k !== 'shield').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input placeholder="Buscar item…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spell-list">
          {shop.map((i) => (
            <div key={i.key} className="shop-row">
              <span>{itemName(i)}{itemName(i) !== i.name && <span className="muted"> ({i.name})</span>}</span>
              <span className="price">{i.cost} PO</span>
              <button type="button" disabled={i.cost > sheet.gold.left} title={i.cost > sheet.gold.left ? 'Ouro insuficiente' : undefined} onClick={() => buy(i.key)}>Comprar</button>
            </div>
          ))}
          {shop.length === 0 && <p className="hint">Nada encontrado.</p>}
        </div>
      </div>

      <h3 className="subhead">Seu equipamento</h3>
      {sheet.inventory.length ? (
        <ul className="inventory">
          {sheet.inventory.map((l, i) => (
            <li key={`${l.from}-${l.text}-${i}`}>
              <span>{l.qty > 1 ? `${l.qty}× ` : ''}{l.text}</span>
              <span className="from">{l.from}</span>
              {l.from === 'compra' && l.item && <button type="button" onClick={() => unbuy(l.item!.key)}>Devolver</button>}
            </li>
          ))}
        </ul>
      ) : <p className="hint">Escolha os pacotes acima para ver o equipamento.</p>}

      <h3 className="subhead">O que você veste</h3>
      <div className="grid2">
        <Field label="Armadura" help={HELP.armor} hint={`Treinamento: ${sheet.armorText.replace(/^Armadura: /, '')}`}>
          <select value={sheet.armor?.key ?? ''} onChange={(e) => update({ armorKey: e.target.value || null })}>
            <option value="">Nenhuma</option>
            {sheet.ownedArmor.map((a) => (
              <option key={a.key} value={a.key}>{gearLabel(a.key, a.name)} ({ARMOR_CATEGORY_PT[a.category]}, CA {a.acBase}{a.addDex ? (a.dexCap ? ` + DES máx ${a.dexCap}` : ' + DES') : ''})</option>
            ))}
          </select>
        </Field>
        <Field label="Escudo" help={HELP.shield} hint={!sheet.hasShield ? 'Você não tem escudo no equipamento.' : !sheet.choices.armorTraining.shield ? 'Sem treinamento: o escudo não dá CA.' : undefined}>
          <label className="row"><input type="checkbox" checked={c.shield && sheet.hasShield} disabled={!sheet.hasShield} onChange={(e) => update({ shield: e.target.checked })} /> Usa escudo (+2 CA)</label>
        </Field>
      </div>

      {mastery.map((s) => (
        <div key={s.id}>
          <h3 className="subhead">Maestria com armas</h3>
          {slots.picker(s, { hint: `Escolha os tipos de arma cujas propriedades de maestria você usa. Proficiência da classe: ${sheet.weaponText}.` })}
        </div>
      ))}

      <Field label="Outros itens e anotações" help={HELP.equipment} hint={<>Classe: {cls.equipmentText}<br />Antecedente: {sheet.background?.equipmentText}</>}>
        <textarea rows={3} value={c.equipment} onChange={(e) => update({ equipment: e.target.value })} />
      </Field>
    </>
  );
}

/* ---------- Magias ---------- */

function SpellsStep({ c, sheet, update }: Props) {
  const cls = sheet.cls;
  const slots = useSlots(c, sheet, update);
  const spellSlots = slots.of('spells');
  const granted = sheet.choices.granted;
  return (
    <>
      <Intro>
        {cls.casterType === 'NONE'
          ? <>O {cls.pt} não conjura magias. Este passo só mostra magias de feats (Magic Initiate), do Fighting Style ou da espécie.</>
          : <><strong>Truques</strong> podem ser usados à vontade. As outras magias gastam <strong>espaços de magia</strong>, que voltam depois de um descanso longo. Cada lista abaixo só mostra o que a regra daquela escolha permite.</>}
      </Intro>
      {!sheet.canCast && <p className="warnings">Com a armadura atual (sem treinamento), você não pode conjurar.</p>}
      {granted.length > 0 && (
        <>
          <h3 className="subhead">Sempre preparadas</h3>
          <p className="hint">Vêm da classe, da subclasse ou da espécie e não contam no limite de preparadas.</p>
          <ul className="granted">
            {granted.map((g) => <li key={g.spell.key} className="tag tag-neutral" title={g.source}>{g.spell.level === 0 ? 'T' : g.spell.level} · {spellLabel(g.spell)}</li>)}
          </ul>
        </>
      )}
      <div className="slot-group">
        {spellSlots.map((s) => slots.picker(s, { variant: 'list' }))}
      </div>
      {spellSlots.length === 0 && granted.length === 0 && <p className="hint">Nenhuma magia para escolher com essa combinação.</p>}
    </>
  );
}
