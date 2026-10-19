// Camada de dados: transforma o JSON bruto do SRD 5.2 (Open5e) em tipos usados pelo app.
import rawClasses from './srd/classes.json';
import rawSpecies from './srd/species.json';
import rawBackgrounds from './srd/backgrounds.json';
import rawFeats from './srd/feats.json';
import rawSpells from './srd/spells.json';
import rawWeapons from './srd/weapons.json';
import rawArmor from './srd/armor.json';
import { translation } from './translations';

/* ---------- Atributos e perícias ---------- */

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export const ABILITIES: { key: AbilityKey; en: string; pt: string; short: string }[] = [
  { key: 'str', en: 'Strength', pt: 'Força', short: 'FOR' },
  { key: 'dex', en: 'Dexterity', pt: 'Destreza', short: 'DES' },
  { key: 'con', en: 'Constitution', pt: 'Constituição', short: 'CON' },
  { key: 'int', en: 'Intelligence', pt: 'Inteligência', short: 'INT' },
  { key: 'wis', en: 'Wisdom', pt: 'Sabedoria', short: 'SAB' },
  { key: 'cha', en: 'Charisma', pt: 'Carisma', short: 'CAR' },
];

export const abilityLabel = (k: AbilityKey) => ABILITIES.find((a) => a.key === k)!.pt;
export const abilityShort = (k: AbilityKey) => ABILITIES.find((a) => a.key === k)!.short;

function abilityFromName(name: string): AbilityKey | null {
  const n = name.trim().toLowerCase();
  return ABILITIES.find((a) => a.en.toLowerCase() === n)?.key ?? null;
}

export type SkillKey =
  | 'acrobatics' | 'animalHandling' | 'arcana' | 'athletics' | 'deception' | 'history'
  | 'insight' | 'intimidation' | 'investigation' | 'medicine' | 'nature' | 'perception'
  | 'performance' | 'persuasion' | 'religion' | 'sleightOfHand' | 'stealth' | 'survival';

export const SKILLS: { key: SkillKey; en: string; pt: string; ability: AbilityKey }[] = [
  { key: 'acrobatics', en: 'Acrobatics', pt: 'Acrobacia', ability: 'dex' },
  { key: 'animalHandling', en: 'Animal Handling', pt: 'Lidar com Animais', ability: 'wis' },
  { key: 'arcana', en: 'Arcana', pt: 'Arcanismo', ability: 'int' },
  { key: 'athletics', en: 'Athletics', pt: 'Atletismo', ability: 'str' },
  { key: 'deception', en: 'Deception', pt: 'Enganação', ability: 'cha' },
  { key: 'history', en: 'History', pt: 'História', ability: 'int' },
  { key: 'insight', en: 'Insight', pt: 'Intuição', ability: 'wis' },
  { key: 'intimidation', en: 'Intimidation', pt: 'Intimidação', ability: 'cha' },
  { key: 'investigation', en: 'Investigation', pt: 'Investigação', ability: 'int' },
  { key: 'medicine', en: 'Medicine', pt: 'Medicina', ability: 'wis' },
  { key: 'nature', en: 'Nature', pt: 'Natureza', ability: 'int' },
  { key: 'perception', en: 'Perception', pt: 'Percepção', ability: 'wis' },
  { key: 'performance', en: 'Performance', pt: 'Atuação', ability: 'cha' },
  { key: 'persuasion', en: 'Persuasion', pt: 'Persuasão', ability: 'cha' },
  { key: 'religion', en: 'Religion', pt: 'Religião', ability: 'int' },
  { key: 'sleightOfHand', en: 'Sleight of Hand', pt: 'Prestidigitação', ability: 'dex' },
  { key: 'stealth', en: 'Stealth', pt: 'Furtividade', ability: 'dex' },
  { key: 'survival', en: 'Survival', pt: 'Sobrevivência', ability: 'wis' },
];

export const skillLabel = (k: SkillKey) => SKILLS.find((s) => s.key === k)!.pt;

// Os dados têm erros de digitação ("Na ture", "In sight"), então comparamos sem espaços.
const squash = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
function skillsInText(text: string): SkillKey[] {
  const t = squash(text);
  return SKILLS.filter((s) => t.includes(squash(s.en))).map((s) => s.key);
}

export const proficiencyBonus = (level: number) => Math.ceil(level / 4) + 1;
export const modifier = (score: number) => Math.floor((score - 10) / 2);
export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/* ---------- Tipos do modelo ---------- */

export interface Feature {
  key: string;
  name: string;
  desc: string;
  levels: number[];
}

export interface TableColumn {
  name: string;
  values: Record<number, string>;
}

export interface SubclassDef {
  key: string;
  name: string;
  pt: string;
  desc: string;
  features: Feature[];
}

export type CasterType = 'FULL' | 'HALF' | 'PACT' | 'NONE';

export interface ClassDef {
  key: string;
  name: string;
  pt: string;
  desc: string;
  hitDie: number;
  primaryAbility: string;
  saves: AbilityKey[];
  skillChoice: { count: number; options: SkillKey[] };
  weaponText: string;
  armorText: string;
  toolText: string;
  equipmentText: string;
  weaponRule: { simple: boolean; martial: 'all' | 'light' | 'finesseOrLight' | 'none' };
  armor: { light: boolean; medium: boolean; heavy: boolean; shield: boolean };
  casterType: CasterType;
  spellAbility: AbilityKey | null;
  features: Feature[];
  optionLists: { name: string; desc: string }[];
  columns: TableColumn[];
  /** spellSlots[nível do personagem][nível da magia - 1] */
  spellSlots: Record<number, number[]>;
  /** Níveis em que a classe ganha um feat (ASI e Epic Boon). */
  featLevels: number[];
  subclasses: SubclassDef[];
}

export interface ChoiceOption {
  /** Valor salvo na ficha. */
  name: string;
  label: string;
  desc: string;
}

/** Uma escolha feita ao pegar a espécie: linhagem, ancestral, tamanho ou atributo de conjuração. */
export interface SpeciesChoice {
  key: string;
  kind: 'trait' | 'ability' | 'size';
  /** Traço de origem (vazio para o tamanho). */
  trait: string;
  label: string;
  options: ChoiceOption[];
}

export interface SpeciesDef {
  key: string;
  name: string;
  pt: string;
  desc: string;
  size: string;
  speed: number;
  traits: { name: string; desc: string }[];
  choices: SpeciesChoice[];
}

export interface BackgroundDef {
  key: string;
  name: string;
  pt: string;
  abilities: AbilityKey[];
  featText: string;
  featKey: string | null;
  skills: SkillKey[];
  toolText: string;
  equipmentText: string;
}

export type FeatType = 'Origin' | 'General' | 'Fighting Style' | 'Epic Boon';

export interface FeatDef {
  key: string;
  name: string;
  type: FeatType;
  desc: string;
  prerequisite: string | null;
  benefits: string[];
  /** Quantos +1 de atributo o feat dá para o jogador distribuir. */
  abilityPicks: number;
  maxScore: number;
}

export interface SpellDef {
  key: string;
  name: string;
  level: number;
  school: string;
  classes: string[];
  castingTime: string;
  range: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  components: string;
  desc: string;
  higherLevel: string;
}

export interface WeaponDef {
  key: string;
  name: string;
  simple: boolean;
  ranged: boolean;
  damage: string;
  damageType: string;
  properties: { name: string; detail: string | null; mastery: boolean }[];
  finesse: boolean;
  light: boolean;
  versatile: string | null;
  rangeText: string | null;
}

export interface ArmorDef {
  key: string;
  name: string;
  category: 'light' | 'medium' | 'heavy' | 'shield';
  acBase: number;
  addDex: boolean;
  dexCap: number | null;
  stealthDisadvantage: boolean;
  strRequired: number | null;
}

/* ---------- Traduções de nomes ---------- */

const CLASS_PT: Record<string, string> = {
  Barbarian: 'Bárbaro', Bard: 'Bardo', Cleric: 'Clérigo', Druid: 'Druida', Fighter: 'Guerreiro',
  Monk: 'Monge', Paladin: 'Paladino', Ranger: 'Patrulheiro', Rogue: 'Ladino', Sorcerer: 'Feiticeiro',
  Warlock: 'Bruxo', Wizard: 'Mago',
};
const SPECIES_PT: Record<string, string> = {
  Dragonborn: 'Draconato', Dwarf: 'Anão', Elf: 'Elfo', Gnome: 'Gnomo', Goliath: 'Golias',
  Halfling: 'Halfling', Human: 'Humano', Orc: 'Orc', Tiefling: 'Tiefling',
};
const CHOICE_PT: Record<string, string> = {
  'Draconic Ancestry': 'Dragão ancestral', 'Elven Lineage': 'Linhagem élfica', 'Gnomish Lineage': 'Linhagem gnômica',
  'Giant Ancestry': 'Ancestral gigante', 'Fiendish Legacy': 'Legado infernal',
};
const SIZE_PT: Record<string, string> = { Medium: 'Médio', Small: 'Pequeno' };
const OPTION_PT: Record<string, string> = {
  Black: 'Preto', Blue: 'Azul', Brass: 'Latão', Bronze: 'Bronze', Copper: 'Cobre', Gold: 'Ouro', Green: 'Verde',
  Red: 'Vermelho', Silver: 'Prata', White: 'Branco',
  Drow: 'Drow', 'High Elf': 'Alto Elfo', 'Wood Elf': 'Elfo da Floresta',
  'Forest Gnome': 'Gnomo da Floresta', 'Rock Gnome': 'Gnomo das Rochas',
  Abyssal: 'Abissal', Chthonic: 'Ctônico', Infernal: 'Infernal',
};
const optionLabel = (name: string) => (OPTION_PT[name] && OPTION_PT[name] !== name ? `${OPTION_PT[name]} (${name})` : name);
const BACKGROUND_PT: Record<string, string> = {
  Acolyte: 'Acólito', Criminal: 'Criminoso', Sage: 'Sábio', Soldier: 'Soldado',
};

// O SRD não traz o atributo de conjuração num campo estruturado.
const SPELL_ABILITY: Record<string, AbilityKey> = {
  Bard: 'cha', Cleric: 'wis', Druid: 'wis', Paladin: 'cha', Ranger: 'wis',
  Sorcerer: 'cha', Warlock: 'cha', Wizard: 'int',
};

/* ---------- Normalização ---------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

function parseTraitTable(desc: string): Record<string, string> {
  const rows: Record<string, string> = {};
  for (const line of desc.split('\n')) {
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length === 2 && cells[0] && !cells[0].startsWith('-')) rows[cells[0]] = cells[1];
  }
  return rows;
}

/**
 * Opções de um traço com escolha. O SRD usa três formatos: tabela (a 1ª coluna é o nome),
 * parágrafo começando em negrito ("**Forest Gnome.** ...") e lista ("- **Cloud's Jaunt**. ...").
 */
function parseOptions(desc: string): ChoiceOption[] {
  const rows = desc.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'));
  if (rows.length > 2) {
    const cells = (l: string) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const head = cells(rows[0]);
    return rows.slice(2).map(cells).map(([name, ...rest]) => ({
      name,
      label: optionLabel(name),
      desc: rest.map((v, i) => `${head[i + 1]}: ${v}`).join('\n'),
    }));
  }
  return [...desc.matchAll(/^(?:- )?\*\*(.+?)\.?\*\*\.?\s*(.*)$/gm)].map((m) => ({
    name: m[1],
    label: optionLabel(m[1]),
    desc: m[2].replace(/\*/g, ''),
  }));
}

function speciesChoices(traits: { name: string; desc: string; type: string | null }[]): SpeciesChoice[] {
  const choices: SpeciesChoice[] = [];
  for (const t of traits.filter((x) => x.type === null && /\bchoose\b/i.test(x.desc))) {
    const options = parseOptions(t.desc);
    if (options.length < 2) continue;
    const label = CHOICE_PT[t.name] ? `${CHOICE_PT[t.name]} (${t.name})` : t.name;
    choices.push({ key: t.name, kind: 'trait', trait: t.name, label, options });
    if (/choose the ability/i.test(t.desc)) {
      choices.push({
        key: `${t.name}:ability`,
        kind: 'ability',
        trait: t.name,
        label: 'Atributo de conjuração da espécie',
        options: (['int', 'wis', 'cha'] as AbilityKey[]).map((k) => ({ name: k, label: abilityLabel(k), desc: '' })),
      });
    }
  }
  // "Medium (about 4–7 feet tall) or Small (about 2–4 feet tall), chosen when you select this species"
  const size = traits.find((t) => t.type === 'SIZE')?.desc ?? '';
  if (/ or /.test(size)) {
    const options = size.replace(/,.*$/, '').split(/ or /).map((part) => {
      const name = part.trim().split(' ')[0];
      return { name, label: SIZE_PT[name] ?? name, desc: part.trim().slice(name.length).trim().replace(/^\(|\)$/g, '') };
    });
    choices.push({ key: 'size', kind: 'size', trait: '', label: 'Tamanho', options });
  }
  return choices;
}

// Níveis errados nos dados do Open5e, conferidos no PDF do SRD 5.2.1.
const LEVEL_FIXES: Record<string, number[]> = {
  'srd-2024_monk_deflect-attacks': [3], // vem sem nível e nunca aparecia na ficha
  'srd-2024_monk_stunning-strike': [5], // vem como 3 e 5
};

function toFeatures(raw: Raw[]): Feature[] {
  return raw
    .filter((f) => f.feature_type === 'CLASS_LEVEL_FEATURE')
    .map((f) => ({
      key: f.key,
      name: f.name,
      desc: f.desc,
      levels: LEVEL_FIXES[f.key] ?? (f.gained_at as { level: number }[]).map((g) => g.level).sort((a, b) => a - b),
    }))
    .sort((a, b) => (a.levels[0] ?? 0) - (b.levels[0] ?? 0) || a.name.localeCompare(b.name));
}

function toColumn(f: Raw): TableColumn {
  const values: Record<number, string> = {};
  for (const row of f.data_for_class_table as { level: number; column_value: string }[]) {
    values[row.level] = row.column_value;
  }
  return { name: f.name, values };
}

const num = (v: string | undefined) => {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : 0;
};

function buildClass(c: Raw, subclasses: SubclassDef[]): ClassDef {
  const core = parseTraitTable(c.features.find((f: Raw) => f.feature_type === 'CORE_TRAITS_TABLE')?.desc ?? '');
  const skillsText = core['Skill Proficiencies'] ?? '';
  const count = num(skillsText.match(/Choose (?:any )?(\d+)/)?.[1]);
  const options = /any \d+ skills/i.test(skillsText) ? SKILLS.map((s) => s.key) : skillsInText(skillsText);
  const weaponText = core['Weapon Proficiencies'] ?? '';
  const armorText = core['Armor Training'] ?? 'None';

  const columns = (c.features as Raw[]).filter((f) => f.feature_type === 'CLASS_TABLE_DATA').map(toColumn);
  const slotCols = (c.features as Raw[]).filter((f) => f.feature_type === 'SPELL_SLOTS').map(toColumn);
  const spellSlots: Record<number, number[]> = {};
  for (let lvl = 1; lvl <= 20; lvl++) spellSlots[lvl] = slotCols.map((col) => num(col.values[lvl]));

  const features = toFeatures(c.features);
  const featLevels = features
    .filter((f) => f.name === 'Ability Score Improvement' || f.name === 'Epic Boon')
    .flatMap((f) => f.levels)
    .sort((a, b) => a - b);

  return {
    key: c.key,
    name: c.name,
    pt: CLASS_PT[c.name] ?? c.name,
    desc: c.desc,
    hitDie: num(String(c.hit_dice).replace(/\D/g, '')),
    primaryAbility: core['Primary Ability'] ?? '',
    saves: (core['Saving Throw Proficiencies'] ?? '')
      .split(/,| and /)
      .map(abilityFromName)
      .filter((a): a is AbilityKey => a !== null),
    skillChoice: { count, options },
    weaponText,
    armorText,
    toolText: core['Tool Proficiencies'] ?? '',
    equipmentText: core['Starting Equipment'] ?? '',
    weaponRule: {
      simple: /simple/i.test(weaponText),
      martial: !/martial/i.test(weaponText)
        ? 'none'
        : /finesse or light/i.test(weaponText)
          ? 'finesseOrLight'
          : /light property/i.test(weaponText)
            ? 'light'
            : 'all',
    },
    armor: {
      light: /light/i.test(armorText),
      medium: /medium/i.test(armorText),
      heavy: /heavy/i.test(armorText),
      shield: /shield/i.test(armorText),
    },
    casterType: c.caster_type as CasterType,
    spellAbility: SPELL_ABILITY[c.name] ?? null,
    features,
    optionLists: (c.features as Raw[])
      .filter((f) => f.feature_type === 'CLASS_FEATURE_OPTION_LIST')
      .map((f) => ({ name: f.name, desc: f.desc })),
    columns,
    spellSlots,
    featLevels,
    subclasses,
  };
}

const subclassRaw = (rawClasses as Raw[]).filter((c) => c.subclass_of);

export const CLASSES: ClassDef[] = (rawClasses as Raw[])
  .filter((c) => !c.subclass_of)
  .map((c) =>
    buildClass(
      c,
      subclassRaw
        .filter((s) => s.subclass_of.key === c.key)
        .map((s) => ({
          key: s.key,
          name: s.name,
          pt: translation(s.key)?.name ?? s.name,
          desc: s.desc,
          features: toFeatures(s.features),
        })),
    ),
  )
  .sort((a, b) => a.pt.localeCompare(b.pt));

export const SPECIES: SpeciesDef[] = (rawSpecies as Raw[])
  .filter((s) => !s.is_subspecies)
  .map((s) => {
    const traits = s.traits as { name: string; desc: string; type: string | null }[];
    return {
      key: s.key,
      name: s.name,
      pt: SPECIES_PT[s.name] ?? s.name,
      desc: s.desc,
      size: traits.find((t) => t.type === 'SIZE')?.desc ?? '',
      speed: num(traits.find((t) => t.type === 'SPEED')?.desc.match(/\d+/)?.[0]),
      traits: traits.filter((t) => t.type === null).map((t) => ({ name: t.name, desc: t.desc })),
      choices: speciesChoices(traits),
    };
  })
  .sort((a, b) => a.pt.localeCompare(b.pt));

export const FEATS: FeatDef[] = (rawFeats as Raw[])
  .map((f) => {
    const type = f.type as FeatType;
    return {
      key: f.key,
      name: f.name,
      type,
      desc: f.desc,
      prerequisite: f.prerequisite || null,
      benefits: (f.benefits as { desc: string }[]).map((b) => b.desc),
      abilityPicks: f.name === 'Ability Score Improvement' ? 2 : type === 'General' || type === 'Epic Boon' ? 1 : 0,
      maxScore: type === 'Epic Boon' ? 30 : 20,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

export const BACKGROUNDS: BackgroundDef[] = (rawBackgrounds as Raw[])
  .map((b) => {
    const get = (type: string) =>
      (b.benefits as { type: string; desc: string }[]).find((x) => x.type === type)?.desc ?? '';
    const featText = get('feat');
    const featName = featText.replace(/\s*\(.*\)$/, '');
    return {
      key: b.key,
      name: b.name,
      pt: BACKGROUND_PT[b.name] ?? b.name,
      abilities: get('ability_score')
        .split(',')
        .map(abilityFromName)
        .filter((a): a is AbilityKey => a !== null),
      featText,
      featKey: FEATS.find((f) => f.name === featName)?.key ?? null,
      skills: skillsInText(get('skill_proficiency')),
      toolText: get('tool_proficiency'),
      equipmentText: get('equipment').replace(/\*/g, ''),
    };
  })
  .sort((a, b) => a.pt.localeCompare(b.pt));

export const SPELLS: SpellDef[] = (rawSpells as Raw[])
  .map((s) => ({
    key: s.key,
    name: s.name,
    level: s.level,
    school: s.school?.name ?? '',
    classes: (s.classes as { key: string }[]).map((c) => c.key),
    castingTime: s.casting_time,
    range: s.range_text,
    duration: s.duration,
    concentration: !!s.concentration,
    ritual: !!s.ritual,
    components: [s.verbal && 'V', s.somatic && 'S', s.material && `M${s.material_specified ? ` (${s.material_specified})` : ''}`]
      .filter(Boolean)
      .join(', '),
    desc: s.desc,
    higherLevel: s.higher_level ?? '',
  }))
  .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

export const WEAPONS: WeaponDef[] = (rawWeapons as Raw[])
  // A API também devolve as armas do SRD 5.1; ficamos só com as de 2024.
  .filter((w) => w.key.startsWith('srd-2024_'))
  .map((w) => {
    const properties = (w.properties as Raw[]).map((p) => ({
      name: p.property.name as string,
      detail: (p.detail as string | null) ?? null,
      mastery: p.property.type === 'Mastery',
    }));
    const has = (n: string) => properties.some((p) => p.name === n);
    const rangeProp = properties.find((p) => p.name === 'Ammunition' || p.name === 'Thrown');
    return {
      key: w.key,
      name: w.name,
      simple: !!w.is_simple,
      ranged: has('Ammunition'),
      damage: w.damage_dice,
      damageType: w.damage_type?.name ?? '',
      properties,
      finesse: has('Finesse'),
      light: has('Light'),
      versatile: properties.find((p) => p.name === 'Versatile')?.detail ?? null,
      rangeText: rangeProp?.detail ?? (w.range ? `${w.range}/${w.long_range}` : null),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

export const ARMOR: ArmorDef[] = (rawArmor as Raw[])
  .map((a) => ({
    key: a.key,
    name: a.name,
    // O Escudo vem marcado como "heavy" nos dados.
    category: a.name === 'Shield' ? 'shield' : a.category,
    acBase: a.ac_base,
    addDex: !!a.ac_add_dexmod,
    dexCap: a.ac_cap_dexmod ?? null,
    stealthDisadvantage: !!a.grants_stealth_disadvantage,
    strRequired: a.strength_score_required ?? null,
  }))
  .sort((a, b) => a.acBase - b.acBase);

export const byKey = <T extends { key: string }>(list: T[], key: string | null | undefined) =>
  key ? list.find((x) => x.key === key) : undefined;
