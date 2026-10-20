// Ficha pronta, com layout para tela e para impressão (A4).
import type { ReactNode } from 'react';
import { ABILITIES, abilityShort, signed, type AbilityKey } from '../data/rules';
import { translation } from '../data/translations';
import { gearName } from '../data/equipment';
import { spellText } from '../data/terms';
import type { Character, Sheet as SheetData } from '../engine/character';
import { Markdown } from './Markdown';

const ORDINAL = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º'];

function Box({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="stat-box">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

/** Quadradinhos para marcar os espaços de magia gastos. */
function Pips({ n }: { n: number }) {
  return <span className="slot-pips" aria-label={`${n} espaços`}>{Array.from({ length: n }, (_, i) => <span key={i} />)}</span>;
}

export function Sheet({ c, s }: { c: Character; s: SheetData }) {
  const sc = s.spellcasting;
  const classLine = `${s.cls.pt} ${c.level}${s.subclass ? ` · ${s.subclass.pt}` : ''}`;
  const featsTaken = s.feats.filter((f) => f.feat);

  return (
    <div className="sheet">
      {/* ---------- Página 1 ---------- */}
      <section className="page">
        <header className="sheet-header">
          <div>
            <h1>{c.name || 'Sem nome'}</h1>
            <div className="class-line">{classLine}</div>
          </div>
          <dl className="header-meta">
            <div><dt>Espécie</dt><dd>{s.speciesLabel}</dd></div>
            <div><dt>Antecedente</dt><dd>{s.background?.pt}</dd></div>
            <div><dt>Alinhamento</dt><dd>{c.alignment || '—'}</dd></div>
            <div><dt>Jogador</dt><dd>{c.player || '—'}</dd></div>
          </dl>
        </header>

        <div className="sheet-cols">
          <div className="col-abilities">
            {ABILITIES.map((a) => (
              <div key={a.key} className="ability">
                <div className="ability-name">{a.pt}</div>
                <div className="ability-mod">{signed(s.mods[a.key])}</div>
                <div className="ability-score">{s.scores[a.key]}</div>
              </div>
            ))}
            <div className="small-box">
              <span>Bônus de proficiência</span><strong>{signed(s.pb)}</strong>
            </div>
            <div className="small-box">
              <span>Percepção passiva</span><strong>{s.passivePerception}</strong>
            </div>
          </div>

          <div className="col-skills">
            <h3>Salvaguardas</h3>
            <ul className="prof-list">
              {s.saves.map((sv) => (
                <li key={sv.key}>
                  <span className={`dot ${sv.proficient ? 'on' : ''}`} />
                  <span className="num">{signed(sv.bonus)}</span>
                  {ABILITIES.find((a) => a.key === sv.key)!.pt}
                </li>
              ))}
            </ul>
            <h3>Perícias</h3>
            <ul className="prof-list">
              {s.skills.map((sk) => (
                <li key={sk.key}>
                  <span className={`dot ${sk.expertise ? 'exp' : sk.proficient ? 'on' : ''}`} />
                  <span className="num">{signed(sk.bonus)}</span>
                  {sk.label} <span className="muted">({abilityShort(sk.ability as AbilityKey)})</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-combat">
            <div className="stat-row">
              <Box label="Classe de Armadura" value={s.ac} sub={s.acNote} />
              <Box label="Iniciativa" value={signed(s.initiative)} />
              <Box label="Deslocamento" value={`${s.speed} ft`} />
            </div>
            <div className="stat-row">
              <Box label="PV máximo" value={s.hpMax} />
              <Box label="PV atuais" value={<span className="blank" />} />
              <Box label="Dados de vida" value={s.hitDice} />
            </div>

            <h3>Ataques</h3>
            <table className="table attacks">
              <thead><tr><th>Nome</th><th>Bônus</th><th>Dano</th></tr></thead>
              <tbody>
                {s.attacks.map((a) => (
                  <tr key={a.name}>
                    <td>{a.name}{a.notes && <div className="muted tiny">{a.notes}</div>}</td>
                    <td>{signed(a.bonus)}{!a.proficient && <span title="Sem proficiência">*</span>}</td>
                    <td>{a.damage}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {s.resources.length > 0 && (
              <>
                <h3>Recursos de classe</h3>
                <ul className="resources">
                  {s.resources.map((r) => <li key={r.name}><span>{r.name}</span><strong>{r.value}</strong></li>)}
                </ul>
              </>
            )}

            <h3>Proficiências</h3>
            <div className="proficiencies">
              <p><strong>Armaduras:</strong> {s.armorText.replace(/^Armadura: /, '')}</p>
              <p><strong>Armas:</strong> {s.weaponText}</p>
              <p><strong>Ferramentas:</strong> {s.tools.join(', ') || '—'}</p>
              <p><strong>Idiomas:</strong> {s.languages.join(', ') || '—'}</p>
              {featsTaken.length > 0 && (
                <p><strong>Feats:</strong> {featsTaken.map((f) => translation(f.feat!.key)?.name ?? f.feat!.name).join(', ')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="sheet-bottom">
          <div>
            <h3>Equipamento</h3>
            <p>
              {s.inventory.map((l) => `${l.qty > 1 ? `${l.qty}× ` : ''}${l.text}`).join(', ') || '—'}
              {s.armor && <><br /><strong>Vestindo:</strong> {gearName(s.armor.key, s.armor.name)}{c.shield && s.hasShield ? ' e Escudo' : ''}</>}
              <br /><strong>Ouro:</strong> {s.gold.left} PO
            </p>
            {c.equipment && <p className="pre">{c.equipment}</p>}
          </div>
          <div>
            <h3>Personalidade</h3>
            <p className="pre">{c.personality || '—'}</p>
          </div>
        </div>
      </section>

      {/* ---------- Página 2: características ---------- */}
      <section className="page">
        <h2>Características e traços</h2>
        <div className="features">
          {s.features.map((f) => (
            <article key={`${f.source}-${f.name}`} className="feature">
              <h4>
                {f.name}
                {f.original && <span className="original"> ({f.original})</span>}
                <span className="muted"> · {f.source}{f.level > 1 ? `, nível ${f.level}` : ''}</span>
              </h4>
              <Markdown text={f.desc} />
            </article>
          ))}
          {featsTaken.map(({ slot, feat, abilities }) => {
            const pt = translation(feat!.key);
            return (
              <article key={slot.id} className="feature">
                <h4>
                  {pt?.name ?? feat!.name}
                  {pt && <span className="original"> ({feat!.name})</span>}
                  <span className="muted"> · Feat ({slot.label}){abilities.length ? ` · +1 ${abilities.map(abilityShort).join(', +1 ')}` : ''}</span>
                </h4>
                <Markdown text={pt?.desc ?? (feat!.benefits.join('\n\n') || feat!.desc)} />
              </article>
            );
          })}
        </div>
        {c.notes && (
          <>
            <h3>Notas</h3>
            <p className="pre">{c.notes}</p>
          </>
        )}
      </section>

      {/* ---------- Página 3: magias ---------- */}
      {sc && (
        <section className="page">
          <h2>Magias</h2>
          <div className="stat-row">
            <Box label="Atributo" value={abilityShort(sc.ability)} />
            <Box label="CD de resistência" value={sc.dc} />
            <Box label="Bônus de ataque" value={signed(sc.attack)} />
            {sc.cantrips > 0 && <Box label="Truques" value={sc.cantrips} />}
            {sc.prepared > 0 && <Box label="Preparadas" value={sc.prepared} />}
          </div>
          <div className="slots">
            <span className="kicker">Espaços</span>
            {sc.pact
              ? <span className="slot">Pact Magic, {ORDINAL[sc.pact.level - 1]} círculo<Pips n={sc.pact.count} /></span>
              : sc.slots.map((n, i) => n > 0 && (
                <span key={i} className="slot">{ORDINAL[i]}<Pips n={n} /></span>
              ))}
          </div>
          <table className="table spells">
            <thead>
              <tr><th>Nv</th><th>Magia</th><th>Tempo</th><th>Alcance</th><th>Duração</th><th>Comp.</th></tr>
            </thead>
            <tbody>
              {sc.spells.map(({ spell: sp, source, alwaysPrepared }) => {
                const t = spellText(sp);
                return (
                  <tr key={sp.key}>
                    <td>{sp.level === 0 ? 'T' : sp.level}</td>
                    <td>
                      <strong>{t.name}</strong>
                      {t.original && <span className="original"> ({t.original})</span>}
                      <span className="muted"> · {t.school}{sp.concentration ? ' · Concentração' : ''}{sp.ritual ? ' · Ritual' : ''}</span>
                      <div className="muted tiny">{source}{alwaysPrepared ? ' · sempre preparada' : ''}</div>
                    </td>
                    <td>{t.castingTime}</td>
                    <td>{t.range}</td>
                    <td>{t.duration}</td>
                    <td>{t.components}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="spell-descs">
            {sc.spells.map(({ spell: sp }) => {
              const t = spellText(sp);
              return (
                <article key={sp.key} className="feature">
                  <h4>
                    {t.name}
                    {t.original && <span className="original"> ({t.original})</span>}
                    <span className="muted"> · {t.levelLabel} de {t.school}</span>
                  </h4>
                  <p className="tiny muted">{t.castingTime} · {t.range} · {t.components} · {t.duration}</p>
                  <Markdown text={t.higherLevel ? `${t.desc}\n\n**${sp.level === 0 ? 'Melhoria de truque' : 'Em círculos superiores'}.** ${t.higherLevel}` : t.desc} />
                </article>
              );
            })}
          </div>
        </section>
      )}

      <footer className="attribution tiny muted">
        Inclui material do System Reference Document 5.2 ("SRD 5.2") da Wizards of the Coast LLC, licenciado sob CC-BY-4.0.
        Parte dos textos foi traduzida para o português pelo projeto Fichas 5.5e (tradução não oficial).
      </footer>
    </div>
  );
}
