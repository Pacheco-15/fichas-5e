// Criação/edição do personagem, dividida em passos.
import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon, LockSimpleIcon, PlusIcon, PrinterIcon, StarFourIcon, WarningCircleIcon,
} from '@phosphor-icons/react';
import {
  ABILITIES, ARMOR, BACKGROUNDS, CLASSES, FEATS, SKILLS, SPECIES, SPELLS, WEAPONS,
  abilityLabel, byKey, modifier, signed, skillLabel,
  type AbilityKey, type SkillKey,
} from '../data/rules';
import {
  backgroundBonusProblem, featSlots, isWeaponProficient, maxSpellLevel,
  type Character, type Sheet, type WarningArea,
} from '../engine/character';
import { labelPt, translation } from '../data/translations';
import { Markdown } from './Markdown';
import { ALIGNMENTS, FEAT_HELP, HELP, SPECIES_CHOICE_HELP } from './help';

interface Props {
  c: Character;
  sheet: Sheet;
  update: (patch: Partial<Character>) => void;
}

type StepId = WarningArea | 'feats' | 'hp' | 'story' | 'review';

const STEPS: { id: StepId; title: string }[] = [
  { id: 'basic', title: 'Básico' },
  { id: 'abilities', title: 'Atributos' },
  { id: 'skills', title: 'Perícias' },
  { id: 'feats', title: 'Feats' },
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

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

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

function StepBody({ id, c, sheet, update, go }: Props & { id: StepId; go: (i: number) => void }) {
  const cls = sheet.cls;
  const bg = sheet.background;
  const species = byKey(SPECIES, c.speciesKey);
  const bonus = Object.fromEntries(sheet.skills.map((s) => [s.key, s.bonus])) as Record<SkillKey, number>;

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
                onChange={(e) => update({ classKey: e.target.value, subclassKey: null, classSkills: [], feats: {} })}
              >
                {CLASSES.map((x) => <option key={x.key} value={x.key}>{x.pt} ({x.name})</option>)}
              </select>
            </Field>
            <Field label="Nível" help={HELP.level}>
              <input
                type="number" min={1} max={20} value={c.level}
                onChange={(e) => update({ level: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
              />
            </Field>
            <Field label="Subclasse" help={HELP.subclass} hint={c.level < 3 ? 'Disponível a partir do nível 3.' : undefined}>
              <select
                value={c.subclassKey ?? ''} disabled={c.level < 3}
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
        </>
      );

    case 'abilities':
      return (
        <>
          <Intro>
            Os seis atributos dizem o quanto o personagem é forte, ágil, resistente, esperto, atento e carismático. Um jeito
            simples é distribuir <strong>15, 14, 13, 12, 10 e 8</strong>, com os maiores em {cls.primaryAbility}, o atributo
            principal do {cls.pt}. Depois some os pontos do antecedente{bg ? ` (${bg.abilities.map(abilityLabel).join(', ')})` : ''}:
            +2 num e +1 noutro, ou +1 em três.
          </Intro>
          <table className="table ability-table">
            <thead>
              <tr><th>Atributo</th><th>Base</th><th>Antecedente</th><th>Feats</th><th>Total</th><th>Mod</th></tr>
            </thead>
            <tbody>
              {ABILITIES.map((a) => {
                const fromFeats = sheet.scores[a.key] - c.baseScores[a.key] - (sheet.backgroundBonus[a.key] ?? 0);
                // Desativa o que quebraria a regra; se a ficha já estiver inválida, deixa tudo livre para corrigir.
                const alreadyInvalid = !!bg && backgroundBonusProblem(c.backgroundBonus, bg.abilities) !== null;
                const allowed = (n: number) =>
                  !bg || alreadyInvalid || backgroundBonusProblem({ ...c.backgroundBonus, [a.key]: n }, bg.abilities) === null;
                return (
                  <tr key={a.key}>
                    <td>{a.pt}</td>
                    <td>
                      <input
                        type="number" min={1} max={30} value={c.baseScores[a.key]}
                        onChange={(e) => update({ baseScores: { ...c.baseScores, [a.key]: Number(e.target.value) || 0 } })}
                      />
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
            Antecedente: só um atributo pode receber +2, e o total é 3 pontos. Para mudar o +2 de lugar, tire-o primeiro do
            atributo onde ele está.
          </p>
          <p className="hint">{HELP.modifier}</p>
        </>
      );

    case 'skills':
      return (
        <>
          <Intro>
            Perícias são as coisas em que o personagem é treinado, como Furtividade ou Persuasão. O antecedente já dá
            {bg ? ` ${bg.skills.map(skillLabel).join(' e ')}` : ' duas'}. Agora escolha as da classe.
          </Intro>
          <SkillPicker
            title="Perícias da classe"
            help={HELP.skills}
            options={cls.skillChoice.options}
            selected={c.classSkills}
            max={cls.skillChoice.count}
            locked={bg?.skills ?? []}
            lockedBy={bg?.pt}
            bonus={bonus}
            onChange={(classSkills) => update({ classSkills })}
          />
          <SkillPicker
            title="Outras perícias"
            help={HELP.extraSkills}
            options={SKILLS.map((s) => s.key)}
            selected={c.extraSkills}
            locked={[...(bg?.skills ?? []), ...c.classSkills]}
            bonus={bonus}
            grid
            onChange={(extraSkills) => update({ extraSkills })}
          />
          <SkillPicker
            title="Especialização (Expertise)"
            help={HELP.expertise}
            options={sheet.skills.filter((s) => s.proficient).map((s) => s.key)}
            selected={c.expertise}
            bonus={bonus}
            expertise
            onChange={(expertise) => update({ expertise })}
          />
          <p className="hint">
            Ladino: 2 no nível 1 e 2 no 6 · Bardo: 2 no nível 2 e 2 no 9 · Patrulheiro: 1 no nível 2 e 2 no 9 · Mago (Scholar): 1 no nível 2.
          </p>
        </>
      );

    case 'feats':
      return (
        <>
          <Intro>
            Feats são talentos especiais. O antecedente já dá um; outros chegam com o nível ou com a classe. Escolha um em
            cada espaço que aparecer abaixo.
          </Intro>
          <FeatSection c={c} update={update} />
        </>
      );

    case 'hp':
      return (
        <>
          <Intro>
            Pontos de vida (PV) mostram quanto dano o personagem aguenta antes de cair. Na <strong>média</strong> você ganha um
            valor fixo a cada nível, sem sorte nem azar. Em <strong>rolados</strong> você rola o dado de vida (d{cls.hitDie}) a cada
            nível e digita o resultado. Se não sabe qual escolher, fique com a média.
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
                      hpRolls[i] = Math.min(cls.hitDie, Math.max(1, Number(e.target.value) || 1));
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
      return (
        <>
          <Intro>
            Escolha armadura e armas. As armas em cinza são as que a classe não sabe usar bem: dá para pegar, mas sem o bônus
            de proficiência.
          </Intro>
          <div className="grid2">
            <Field label="Armadura" help={HELP.armor} hint={`Treinamento: ${cls.armorText}`}>
              <select value={c.armorKey ?? ''} onChange={(e) => update({ armorKey: e.target.value || null })}>
                <option value="">Nenhuma</option>
                {ARMOR.filter((a) => a.category !== 'shield').map((a) => (
                  <option key={a.key} value={a.key}>{a.name} ({a.category}, CA {a.acBase}{a.addDex ? (a.dexCap ? ` + DES máx ${a.dexCap}` : ' + DES') : ''})</option>
                ))}
              </select>
            </Field>
            <Field label="Escudo" help={HELP.shield}>
              <label className="row"><input type="checkbox" checked={c.shield} onChange={(e) => update({ shield: e.target.checked })} /> Usa escudo (+2 CA)</label>
            </Field>
          </div>
          <FieldHead label="Armas" help={HELP.weapons} />
          <p className="hint">Proficiência da classe: {cls.weaponText}</p>
          <div className="check-grid">
            {WEAPONS.map((w) => (
              <label key={w.key} className={isWeaponProficient(cls, w) ? '' : 'muted'}>
                <input type="checkbox" checked={c.weaponKeys.includes(w.key)} onChange={() => update({ weaponKeys: toggle(c.weaponKeys, w.key) })} />
                {w.name}
              </label>
            ))}
          </div>
          <Field label="Equipamento e dinheiro" help={HELP.equipment} hint={<>Classe: {cls.equipmentText}<br />Antecedente: {bg?.equipmentText}</>}>
            <textarea rows={4} value={c.equipment} onChange={(e) => update({ equipment: e.target.value })} />
          </Field>
          <div className="grid2">
            <Field label="Ferramentas" help={HELP.tools} hint={[cls.toolText, bg?.toolText].filter(Boolean).join(' · ')}>
              <input value={c.tools} onChange={(e) => update({ tools: e.target.value })} />
            </Field>
            <Field label="Idiomas" help={HELP.languages}>
              <input value={c.languages} onChange={(e) => update({ languages: e.target.value })} />
            </Field>
          </div>
        </>
      );

    case 'spells':
      return (
        <>
          <Intro>
            {cls.casterType === 'NONE'
              ? <>O {cls.pt} não conjura magias, então pode pular este passo. Ele só serve para magias de feats, como Magic Initiate.</>
              : <><strong>Truques</strong> podem ser usados à vontade. As outras magias gastam <strong>espaços de magia</strong>, que voltam depois de um descanso longo.</>}
          </Intro>
          <SpellSection c={c} sheet={sheet} update={update} />
        </>
      );

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

/** Perícias como fichas clicáveis, com o bônus atual de cada uma. */
function SkillPicker({ title, help, options, selected, onChange, bonus, max, locked = [], lockedBy, grid, expertise }: {
  title: string;
  help?: ReactNode;
  options: SkillKey[];
  selected: SkillKey[];
  onChange: (v: SkillKey[]) => void;
  bonus: Record<SkillKey, number>;
  max?: number;
  locked?: SkillKey[];
  /** De onde vêm as perícias travadas, ex.: o antecedente. */
  lockedBy?: string;
  grid?: boolean;
  expertise?: boolean;
}) {
  return (
    <div className="picker">
      <div className="picker-head">
        <FieldHead label={title} help={help} />
        {max !== undefined && <span className="tag tag-outline">{selected.length}/{max}</span>}
      </div>
      <div className={`chips${grid ? ' grid' : ''}`}>
        {options.map((k) => {
          const isSelected = selected.includes(k);
          const isLocked = locked.includes(k) && !isSelected;
          const full = !isLocked && max !== undefined && selected.length >= max && !isSelected;
          const state = isSelected ? 'selected' : isLocked ? 'locked' : full ? 'full' : '';
          return (
            <button
              key={k} type="button" className={`chip ${state}`} aria-pressed={isSelected} disabled={isLocked || full}
              title={isLocked ? `Já vem ${lockedBy ? `de ${lockedBy}` : 'de outra escolha'}` : undefined}
              onClick={() => onChange(toggle(selected, k))}
            >
              {isSelected ? (expertise ? <StarFourIcon className="lead" /> : <CheckIcon className="lead" />)
                : isLocked ? <LockSimpleIcon className="lead" />
                : full ? null
                : grid || expertise ? <span className="lead" /> : <PlusIcon className="lead" />}
              {skillLabel(k)}
              <span className="bonus">{isLocked && lockedBy && !grid ? lockedBy : signed(bonus[k])}</span>
            </button>
          );
        })}
        {options.length === 0 && <span className="hint">Nenhuma perícia proficiente ainda.</span>}
      </div>
    </div>
  );
}

function FeatSection({ c, update }: { c: Character; update: (p: Partial<Character>) => void }) {
  const cls = byKey(CLASSES, c.classKey)!;
  const slots = featSlots(c, cls, byKey(BACKGROUNDS, c.backgroundKey), byKey(SPECIES, c.speciesKey));
  return (
    <div className="feats">
      {slots.map((slot) => {
        const choice = c.feats[slot.id] ?? { featKey: null, abilities: [] };
        const featKey = slot.fixedKey !== undefined ? slot.fixedKey : choice.featKey;
        const feat = byKey(FEATS, featKey);
        const setChoice = (patch: Partial<typeof choice>) =>
          update({ feats: { ...c.feats, [slot.id]: { ...choice, ...patch } } });
        return (
          <div key={slot.id} className="feat-slot">
            <Field label={slot.label} help={FEAT_HELP[slot.allowed[0]]}>
              {slot.fixedKey !== undefined ? (
                <input value={feat ? labelPt(feat.key, feat.name) : '—'} disabled />
              ) : (
                <select value={choice.featKey ?? ''} onChange={(e) => setChoice({ featKey: e.target.value || null, abilities: [] })}>
                  <option value="">—</option>
                  {FEATS.filter((f) => slot.allowed.includes(f.type)).map((f) => (
                    <option key={f.key} value={f.key}>{labelPt(f.key, f.name)} · {f.type}</option>
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
                    onChange={(e) => {
                      const abilities = [...choice.abilities];
                      abilities[i] = e.target.value as AbilityKey;
                      setChoice({ abilities: abilities.filter(Boolean) });
                    }}
                  >
                    <option value="">+1 em…</option>
                    {ABILITIES.map((a) => <option key={a.key} value={a.key}>+1 {a.pt}</option>)}
                  </select>
                ))}
                <span className="hint">Máx. {feat.maxScore}{feat.name === 'Ability Score Improvement' ? '. Repita o atributo para +2.' : ''}</span>
              </div>
            )}
            {feat && (
              <div className="hint feat-desc">
                <Markdown text={translation(feat.key)?.desc ?? (feat.benefits.join('\n\n') || feat.desc)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SpellSection({ c, sheet, update }: Props) {
  const cls = sheet.cls;
  const [onlyClass, setOnlyClass] = useState(true);
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  const max = cls.casterType === 'NONE' ? 1 : maxSpellLevel(cls, c.level);

  const list = useMemo(
    () =>
      SPELLS.filter(
        (s) =>
          (!onlyClass || s.classes.includes(cls.key)) &&
          s.level <= Math.max(max, onlyClass ? max : 9) &&
          (levelFilter === 'all' || s.level === levelFilter) &&
          s.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [onlyClass, cls.key, max, levelFilter, query],
  );

  const sc = sheet.spellcasting;
  return (
    <div className="step-body">
      {cls.casterType !== 'NONE' && (
        <p className="hint">
          Truques: {sc?.cantrips ?? 0} · Magias preparadas: {sc?.prepared ?? 0} · Nível máx. de magia: {max}
        </p>
      )}
      <div className="row">
        <label><input type="checkbox" checked={onlyClass} onChange={(e) => setOnlyClass(e.target.checked)} /> Só a lista do {cls.pt}</label>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">Todos os círculos</option>
          {Array.from({ length: 10 }, (_, i) => <option key={i} value={i}>{i === 0 ? 'Truques' : `${i}º círculo`}</option>)}
        </select>
        <input placeholder="Buscar magia…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <p className="hint">Selecionadas: {c.spellKeys.length}. Desmarque "só a lista" para adicionar magias de Magic Initiate, domínio ou patrono.</p>
      <div className="spell-list">
        {list.map((s) => (
          <label key={s.key} className="spell-row" title={s.desc}>
            <input type="checkbox" checked={c.spellKeys.includes(s.key)} onChange={() => update({ spellKeys: toggle(c.spellKeys, s.key) })} />
            <span className="spell-level">{s.level === 0 ? 'T' : s.level}</span>
            {s.name}
            <span className="school">{s.school}</span>
            <span className="flags">
              {s.concentration && <span className="tag tag-neutral" title="Concentração">C</span>}
              {s.ritual && <span className="tag tag-neutral" title="Ritual">R</span>}
            </span>
          </label>
        ))}
        {list.length === 0 && <p className="hint">Nenhuma magia encontrada.</p>}
      </div>
    </div>
  );
}
