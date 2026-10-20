// Escolhas que as características de classe e subclasse pedem, e magias sempre preparadas.
import rawClasses from './srd/classes.json';
import { CLASSES, SPECIES, SPELLS, type SpellDef } from './rules';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

const feature = (ownerKey: string, name: string): Raw | undefined =>
  (rawClasses as Raw[]).find((c) => c.key === ownerKey)?.features.find((f: Raw) => f.name === name);

const clsKey = (name: string) => CLASSES.find((c) => c.name === name)!.key;
const subKey = (name: string) => CLASSES.flatMap((c) => c.subclasses).find((s) => s.name === name)!.key;

/* ---------- Opções de características (uma escolha cada) ---------- */

export interface FeatureOption {
  name: string;
  desc: string;
}

export interface FeatureChoice {
  id: string;
  /** Classe ou subclasse dona da característica. */
  owner: string;
  feature: string;
  level: number;
  options: FeatureOption[];
}

/** Opções escritas como "**Protector.** Trained for battle…". */
function boldOptions(desc: string): FeatureOption[] {
  return [...desc.matchAll(/\*\*(.+?)\.\*\*\s*(.*?)(?=\s*\*\*[^*]+\.\*\*|$)/gs)].map((m) => ({
    name: m[1].trim(),
    desc: m[2].replace(/\*/g, '').trim(),
  }));
}

function choice(id: string, owner: string, featureName: string, level: number, options?: FeatureOption[]): FeatureChoice {
  return { id, owner, feature: featureName, level, options: options ?? boldOptions(feature(owner, featureName)?.desc ?? '') };
}

const typeOptions = (names: string[], what: string) => names.map((name) => ({ name, desc: `${what}: ${name}.` }));

export const FEATURE_CHOICES: FeatureChoice[] = [
  choice('divine-order', clsKey('Cleric'), 'Divine Order', 1),
  choice('primal-order', clsKey('Druid'), 'Primal Order', 1),
  choice('blessed-strikes', clsKey('Cleric'), 'Blessed Strikes', 7),
  choice('elemental-fury', clsKey('Druid'), 'Elemental Fury', 7),
  choice('hunters-prey', subKey('Hunter'), "Hunter's Prey", 3),
  choice('defensive-tactics', subKey('Hunter'), 'Defensive Tactics', 7),
  choice('elemental-affinity', subKey('Draconic Sorcery'), 'Elemental Affinity', 6,
    typeOptions(['Acid', 'Cold', 'Fire', 'Lightning', 'Poison'], 'Resistência e bônus de dano')),
  choice('land-type', subKey('Circle of the Land'), 'Circle of the Land Spells', 3,
    typeOptions(['Arid', 'Polar', 'Temperate', 'Tropical'], 'Tipo de terra')),
];

/* ---------- Listas de opções: Metamagic e Eldritch Invocations ---------- */

export interface ListOption {
  name: string;
  desc: string;
  /** Nível mínimo na classe, quando o pré-requisito pede. */
  minLevel: number;
  /** Outras opções da mesma lista que precisam vir antes, ex.: "Pact of the Blade". */
  requires: string[];
  prerequisite: string | null;
  repeatable: boolean;
}

function parseOptionList(desc: string): ListOption[] {
  return desc.split(/^### /m).slice(1).map((block) => {
    const [title, ...rest] = block.split('\n');
    const body = rest.join('\n').trim();
    const prerequisite = body.match(/^\*Prerequisite: (.+?)\*/m)?.[1] ?? null;
    return {
      name: title.replace(/\*/g, '').trim(),
      desc: body.replace(/^\*Prerequisite: .+?\*\s*/m, '').replace(/\*/g, '').trim(),
      minLevel: Number(prerequisite?.match(/Level (\d+)\+/)?.[1] ?? 1),
      requires: [...(prerequisite ?? '').matchAll(/([A-Z][\w' ]+?) Invocation/g)].map((m) => m[1].trim()),
      prerequisite,
      repeatable: /\*\*Repeatable\.\*\*/.test(body),
    };
  });
}

const optionList = (cls: string, name: string) => parseOptionList(feature(clsKey(cls), name)?.desc ?? '');

export const METAMAGIC = optionList('Sorcerer', 'Metamagic Options');
export const INVOCATIONS = optionList('Warlock', 'Eldritch Invocation Options');

/** Feiticeiro, Metamagic: 2 opções no nível 2, mais 2 no 10 e mais 2 no 17. */
export const metamagicCount = (level: number) => (level >= 17 ? 6 : level >= 10 ? 4 : level >= 2 ? 2 : 0);

/* ---------- Magias sempre preparadas ---------- */

export const spellByName = (name: string): SpellDef | undefined => {
  const n = name.trim().toLowerCase();
  return SPELLS.find((s) => s.name.toLowerCase() === n);
};

export interface GrantedSpell {
  spell: SpellDef;
  source: string;
  /** Nível em que a magia chega (nível da classe ou do personagem). */
  level: number;
}

/** "|3|Aid, Bless, Cure Wounds|" → [{ level: 3, names: [...] }] */
function spellTable(desc: string): { level: number; names: string[] }[] {
  return desc
    .split('\n')
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((cells) => cells.length === 2 && /^\d+$/.test(cells[0]))
    .map(([lvl, names]) => ({ level: Number(lvl), names: names.split(',').map((n) => n.trim()).filter(Boolean) }));
}

const fromTable = (desc: string, source: string): GrantedSpell[] =>
  spellTable(desc).flatMap(({ level, names }) =>
    names.map((n) => ({ spell: spellByName(n)!, source, level })),
  );

/** Tabelas de magias de subclasse (domínio, juramento, patrono, linhagem dracônica). */
export const SUBCLASS_SPELLS: Record<string, GrantedSpell[]> = {
  [subKey('Life Domain')]: fromTable(feature(subKey('Life Domain'), 'Life Domain Spells')?.desc ?? '', 'Life Domain Spells'),
  [subKey('Oath of Devotion')]: fromTable(feature(subKey('Oath of Devotion'), 'Oath of Devotion Spells')?.desc ?? '', 'Oath of Devotion Spells'),
  [subKey('Fiend Patron')]: fromTable(feature(subKey('Fiend Patron'), 'Fiend Spells')?.desc ?? '', 'Fiend Spells'),
  [subKey('Draconic Sorcery')]: fromTable(feature(subKey('Draconic Sorcery'), 'Draconic Spells')?.desc ?? '', 'Draconic Spells'),
};

/** Círculo da Terra: uma tabela por tipo de terra. */
export const LAND_SPELLS: Record<string, GrantedSpell[]> = (() => {
  const desc: string = feature(subKey('Circle of the Land'), 'Circle of the Land Spells')?.desc ?? '';
  const out: Record<string, GrantedSpell[]> = {};
  for (const part of desc.split(/Table: /).slice(1)) {
    const land = part.match(/^(\w+) Land/)?.[1];
    if (land) out[land] = fromTable(part, `Circle of the Land Spells (${land})`);
  }
  return out;
})();

/** Características de classe que dão magias sempre preparadas. */
export const CLASS_SPELLS: Record<string, GrantedSpell[]> = {
  [clsKey('Druid')]: [{ spell: spellByName('Speak with Animals')!, source: 'Druidic', level: 1 }],
  [clsKey('Ranger')]: [{ spell: spellByName("Hunter's Mark")!, source: 'Favored Enemy', level: 1 }],
  [clsKey('Paladin')]: [
    { spell: spellByName('Divine Smite')!, source: "Paladin's Smite", level: 2 },
    { spell: spellByName('Find Steed')!, source: 'Faithful Steed', level: 5 },
  ],
  [clsKey('Warlock')]: [{ spell: spellByName('Contact Other Plane')!, source: 'Contact Patron', level: 9 }],
  [clsKey('Bard')]: [
    { spell: spellByName('Power Word Heal')!, source: 'Words of Creation', level: 20 },
    { spell: spellByName('Power Word Kill')!, source: 'Words of Creation', level: 20 },
  ],
};

/**
 * Magias que a espécie dá, pela opção escolhida (linhagem/legado). A tabela da espécie tem as colunas
 * "Level 1", "Level 3" e "Level 5"; o nível 1 traz o truque no texto ("You also know the X cantrip").
 */
export function speciesSpells(speciesKey: string, choices: Record<string, string>, level: number): GrantedSpell[] {
  const species = SPECIES.find((s) => s.key === speciesKey);
  if (!species) return [];
  const out: GrantedSpell[] = [];
  for (const ch of species.choices.filter((x) => x.kind === 'trait')) {
    const option = ch.options.find((o) => o.name === choices[ch.key]);
    if (!option) continue;
    const source = `${ch.trait} (${option.name})`;
    for (const line of option.desc.split('\n')) {
      const m = line.match(/^Level (\d+): (.*)$/);
      const lvl = m ? Number(m[1]) : 1;
      const text = m ? m[2] : line;
      if (lvl > level) continue;
      const names = m && lvl > 1
        ? [text.trim()]
        : [...text.matchAll(/(?:know|learn)(?:s)? the \*?([A-Z][\w' ]+?)\*? cantrip/g), ...text.matchAll(/know the \*?([A-Z][\w' ]+?)\*? and \*?([A-Z][\w' ]+?)\*? cantrips/g)]
            .flatMap((x) => x.slice(1).filter(Boolean));
      const always = [...text.matchAll(/always have the \*?([A-Z][\w' ]+?)\*? spell prepared/g)].map((x) => x[1]);
      for (const n of [...names, ...always]) {
        const spell = spellByName(n);
        if (spell) out.push({ spell, source, level: lvl });
      }
    }
  }
  // Tiefling, Otherworldly Presence: "You know the Thaumaturgy cantrip."
  for (const t of species.traits) {
    if (species.choices.some((ch) => ch.trait === t.name)) continue;
    for (const m of t.desc.matchAll(/You know the \*?([A-Z][\w' ]+?)\*? cantrip/g)) {
      const spell = spellByName(m[1]);
      if (spell) out.push({ spell, source: t.name, level: 1 });
    }
  }
  return out;
}
