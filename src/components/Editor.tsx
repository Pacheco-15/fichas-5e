// Formulário de criação/edição do personagem.
import { useMemo, useState, type ReactNode } from 'react';
import {
  ABILITIES, ARMOR, BACKGROUNDS, CLASSES, FEATS, SKILLS, SPECIES, SPELLS, WEAPONS,
  abilityLabel, byKey, modifier, signed, skillLabel,
  type AbilityKey, type SkillKey,
} from '../data/rules';
import { featSlots, isWeaponProficient, maxSpellLevel, type Character, type Sheet } from '../engine/character';

interface Props {
  c: Character;
  sheet: Sheet;
  update: (patch: Partial<Character>) => void;
}

function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="section" open={open}>
      <summary>{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export function Editor({ c, sheet, update }: Props) {
  const cls = sheet.cls;
  const bg = sheet.background;
  const species = byKey(SPECIES, c.speciesKey);

  return (
    <div className="editor">
      <Section title="1. Básico">
        <div className="grid2">
          <Field label="Nome do personagem">
            <input value={c.name} onChange={(e) => update({ name: e.target.value })} />
          </Field>
          <Field label="Jogador">
            <input value={c.player} onChange={(e) => update({ player: e.target.value })} />
          </Field>
          <Field label="Classe">
            <select
              value={c.classKey}
              onChange={(e) => update({ classKey: e.target.value, subclassKey: null, classSkills: [], feats: {} })}
            >
              {CLASSES.map((x) => <option key={x.key} value={x.key}>{x.pt} ({x.name})</option>)}
            </select>
          </Field>
          <Field label="Nível">
            <input
              type="number" min={1} max={20} value={c.level}
              onChange={(e) => update({ level: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
            />
          </Field>
          <Field label="Subclasse" hint={c.level < 3 ? 'Disponível a partir do nível 3.' : undefined}>
            <select
              value={c.subclassKey ?? ''} disabled={c.level < 3}
              onChange={(e) => update({ subclassKey: e.target.value || null })}
            >
              <option value="">—</option>
              {cls.subclasses.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Alinhamento">
            <input value={c.alignment} onChange={(e) => update({ alignment: e.target.value })} />
          </Field>
          <Field label="Espécie">
            <select value={c.speciesKey} onChange={(e) => update({ speciesKey: e.target.value })}>
              {SPECIES.map((x) => <option key={x.key} value={x.key}>{x.pt} ({x.name})</option>)}
            </select>
          </Field>
          <Field label="Antecedente">
            <select value={c.backgroundKey} onChange={(e) => update({ backgroundKey: e.target.value, backgroundBonus: {} })}>
              {BACKGROUNDS.map((x) => <option key={x.key} value={x.key}>{x.pt} ({x.name})</option>)}
            </select>
          </Field>
        </div>
        {species && (
          <Field
            label="Escolhas da espécie (linhagem, ancestralidade, tamanho…)"
            hint={`Traços com escolha: ${species.traits.filter((t) => /choose|choice/i.test(t.desc)).map((t) => t.name).join(', ') || 'nenhum'}`}
          >
            <input value={c.speciesNotes} onChange={(e) => update({ speciesNotes: e.target.value })} placeholder="Ex.: Ancestral Vermelho (Fire)" />
          </Field>
        )}
      </Section>

      <Section title="2. Atributos">
        <p className="hint">Digite os valores base. O bônus do antecedente {bg ? `(${bg.pt}: ${bg.abilities.map(abilityLabel).join(', ')})` : ''} é +2/+1 ou +1/+1/+1.</p>
        <table className="ability-table">
          <thead>
            <tr><th>Atributo</th><th>Base</th><th>Antecedente</th><th>Feats</th><th>Total</th><th>Mod</th></tr>
          </thead>
          <tbody>
            {ABILITIES.map((a) => {
              const fromFeats = sheet.scores[a.key] - c.baseScores[a.key] - (c.backgroundBonus[a.key] ?? 0);
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
                        <option value={1}>+1</option>
                        <option value={2}>+2</option>
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
      </Section>

      <Section title="3. Perícias">
        <SkillPicker
          title={`Perícias da classe: escolha ${cls.skillChoice.count}`}
          options={cls.skillChoice.options}
          selected={c.classSkills}
          max={cls.skillChoice.count}
          locked={bg?.skills ?? []}
          onChange={(classSkills) => update({ classSkills })}
        />
        <p className="hint">Do antecedente ({bg?.pt}): {bg?.skills.map(skillLabel).join(', ')}</p>
        <SkillPicker
          title="Outras perícias (Humano: Skillful, Elfo: Keen Senses, feat Skilled, subclasse…)"
          options={SKILLS.map((s) => s.key)}
          selected={c.extraSkills}
          locked={[...(bg?.skills ?? []), ...c.classSkills]}
          onChange={(extraSkills) => update({ extraSkills })}
        />
        <SkillPicker
          title="Especialização (Expertise)"
          options={sheet.skills.filter((s) => s.proficient).map((s) => s.key)}
          selected={c.expertise}
          onChange={(expertise) => update({ expertise })}
        />
        <p className="hint">
          Ladino: 2 no nível 1 e 2 no 6 · Bardo: 2 no nível 2 e 2 no 9 · Patrulheiro: 1 no nível 2 e 2 no 9 · Mago (Scholar): 1 no nível 2.
        </p>
      </Section>

      <Section title="4. Feats">
        <FeatSection c={c} update={update} />
      </Section>

      <Section title="5. Pontos de vida">
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
      </Section>

      <Section title="6. Equipamento" open={false}>
        <div className="grid2">
          <Field label="Armadura" hint={`Treinamento: ${cls.armorText}`}>
            <select value={c.armorKey ?? ''} onChange={(e) => update({ armorKey: e.target.value || null })}>
              <option value="">Nenhuma</option>
              {ARMOR.filter((a) => a.category !== 'shield').map((a) => (
                <option key={a.key} value={a.key}>{a.name} ({a.category}, CA {a.acBase}{a.addDex ? (a.dexCap ? ` + DES máx ${a.dexCap}` : ' + DES') : ''})</option>
              ))}
            </select>
          </Field>
          <Field label="Escudo">
            <label className="row"><input type="checkbox" checked={c.shield} onChange={(e) => update({ shield: e.target.checked })} /> Usa escudo (+2 CA)</label>
          </Field>
        </div>
        <p className="field-label">Armas <span className="hint">(proficiência: {cls.weaponText})</span></p>
        <div className="check-grid">
          {WEAPONS.map((w) => (
            <label key={w.key} className={isWeaponProficient(cls, w) ? '' : 'muted'}>
              <input type="checkbox" checked={c.weaponKeys.includes(w.key)} onChange={() => update({ weaponKeys: toggle(c.weaponKeys, w.key) })} />
              {w.name}
            </label>
          ))}
        </div>
        <Field label="Equipamento e dinheiro" hint={<>Classe: {cls.equipmentText}<br />Antecedente: {bg?.equipmentText}</>}>
          <textarea rows={4} value={c.equipment} onChange={(e) => update({ equipment: e.target.value })} />
        </Field>
        <div className="grid2">
          <Field label="Ferramentas" hint={[cls.toolText, bg?.toolText].filter(Boolean).join(' · ')}>
            <input value={c.tools} onChange={(e) => update({ tools: e.target.value })} />
          </Field>
          <Field label="Idiomas" hint="Common + 2 idiomas à escolha.">
            <input value={c.languages} onChange={(e) => update({ languages: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section title="7. Magias" open={false}>
        <SpellSection c={c} sheet={sheet} update={update} />
      </Section>

      <Section title="8. Personalidade e notas" open={false}>
        <Field label="Personalidade, aparência, história">
          <textarea rows={4} value={c.personality} onChange={(e) => update({ personality: e.target.value })} />
        </Field>
        <Field label="Notas">
          <textarea rows={4} value={c.notes} onChange={(e) => update({ notes: e.target.value })} />
        </Field>
      </Section>
    </div>
  );
}

function SkillPicker({ title, options, selected, onChange, max, locked = [] }: {
  title: string;
  options: SkillKey[];
  selected: SkillKey[];
  onChange: (v: SkillKey[]) => void;
  max?: number;
  locked?: SkillKey[];
}) {
  return (
    <div className="picker">
      <p className="field-label">{title}{max !== undefined && ` (${selected.length}/${max})`}</p>
      <div className="check-grid">
        {options.map((k) => {
          const isLocked = locked.includes(k) && !selected.includes(k);
          const full = max !== undefined && selected.length >= max && !selected.includes(k);
          return (
            <label key={k} className={isLocked || full ? 'muted' : ''}>
              <input
                type="checkbox" checked={selected.includes(k)} disabled={isLocked || full}
                onChange={() => onChange(toggle(selected, k))}
              />
              {skillLabel(k)}
            </label>
          );
        })}
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
            <Field label={slot.label}>
              {slot.fixedKey !== undefined ? (
                <input value={feat?.name ?? '—'} disabled />
              ) : (
                <select value={choice.featKey ?? ''} onChange={(e) => setChoice({ featKey: e.target.value || null, abilities: [] })}>
                  <option value="">—</option>
                  {FEATS.filter((f) => slot.allowed.includes(f.type)).map((f) => (
                    <option key={f.key} value={f.key}>{f.name} ({f.type})</option>
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
            {feat && <p className="hint feat-desc">{feat.benefits.join(' ') || feat.desc}</p>}
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
    <div>
      {cls.casterType === 'NONE' ? (
        <p className="hint">{cls.pt} não conjura magias. Use isto para magias de feats (Magic Initiate) ou subclasses.</p>
      ) : (
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
          <label key={s.key} title={s.desc}>
            <input type="checkbox" checked={c.spellKeys.includes(s.key)} onChange={() => update({ spellKeys: toggle(c.spellKeys, s.key) })} />
            <span className="spell-level">{s.level === 0 ? 'T' : s.level}</span>
            {s.name}
            <span className="muted"> · {s.school}{s.concentration ? ' · C' : ''}{s.ritual ? ' · R' : ''}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
