// Estado salvo de um personagem e o cálculo de tudo que aparece na ficha.
import {
  ABILITIES, ARMOR, BACKGROUNDS, CLASSES, FEATS, SKILLS, SPECIES, SPELLS, WEAPONS,
  byKey, modifier, proficiencyBonus,
  type AbilityKey, type ArmorDef, type BackgroundDef, type ClassDef, type FeatDef, type FeatType,
  type Feature, type SkillKey, type SpeciesDef, type SpellDef, type SubclassDef, type WeaponDef,
} from '../data/rules';
import { translation } from '../data/translations';

export type Scores = Record<AbilityKey, number>;

export interface FeatChoice {
  featKey: string | null;
  /** Um +1 por item; repetir o atributo dá +2. */
  abilities: AbilityKey[];
}

export interface Character {
  id: string;
  name: string;
  player: string;
  level: number;
  classKey: string;
  subclassKey: string | null;
  speciesKey: string;
  /** Opção escolhida em cada escolha da espécie (chave de SpeciesChoice → nome da opção). */
  speciesChoices: Record<string, string>;
  backgroundKey: string;
  baseScores: Scores;
  /** Bônus do antecedente: +2/+1 ou +1/+1/+1 entre os 3 atributos do antecedente. */
  backgroundBonus: Partial<Scores>;
  classSkills: SkillKey[];
  /** Perícias de espécie (Humano, Elfo), do feat Skilled etc. */
  extraSkills: SkillKey[];
  expertise: SkillKey[];
  /** Perícias e Especializações a mais dadas fora das regras de criação (mestre, item mágico). */
  extraSkillBonus: number;
  expertiseBonus: number;
  feats: Record<string, FeatChoice>;
  hpMethod: 'average' | 'rolled';
  /** Resultado do dado de vida para os níveis 2..20 (índice 0 = nível 2). */
  hpRolls: number[];
  armorKey: string | null;
  shield: boolean;
  weaponKeys: string[];
  spellKeys: string[];
  alignment: string;
  languages: string;
  tools: string;
  equipment: string;
  personality: string;
  notes: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function newCharacter(): Character {
  return {
    id: uid(),
    name: 'Novo personagem',
    player: '',
    level: 1,
    classKey: CLASSES.find((c) => c.name === 'Fighter')!.key,
    subclassKey: null,
    speciesKey: SPECIES.find((s) => s.name === 'Human')!.key,
    speciesChoices: {},
    backgroundKey: BACKGROUNDS.find((b) => b.name === 'Soldier')!.key,
    baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    backgroundBonus: {},
    classSkills: [],
    extraSkills: [],
    expertise: [],
    extraSkillBonus: 0,
    expertiseBonus: 0,
    feats: {},
    hpMethod: 'average',
    hpRolls: [],
    armorKey: null,
    shield: false,
    weaponKeys: [],
    spellKeys: [],
    alignment: '',
    languages: 'Common',
    tools: '',
    equipment: '',
    personality: '',
    notes: '',
  };
}

/** Garante campos novos em fichas salvas por versões antigas do app. */
export function normalizeCharacter(raw: Partial<Character>): Character {
  const c: Character & { speciesNotes?: string } = { ...newCharacter(), ...raw, id: raw.id ?? uid() };
  // Versões antigas guardavam as escolhas da espécie como texto livre: vai para as notas.
  if (c.speciesNotes) c.notes = [`Espécie: ${c.speciesNotes}`, c.notes].filter(Boolean).join('\n\n');
  delete c.speciesNotes;
  return c;
}

/* ---------- Bônus do antecedente ---------- */

/**
 * Regra de 2024: +2 num atributo e +1 noutro, ou +1 em três, só entre os atributos do antecedente.
 * Devolve o problema da combinação, ou null se ela é válida (mesmo incompleta).
 */
export function backgroundBonusProblem(bonus: Partial<Scores>, abilities: AbilityKey[]): string | null {
  const picked = (Object.entries(bonus) as [AbilityKey, number | undefined][]).filter(([, n]) => n);
  if (picked.some(([k, n]) => !abilities.includes(k) || n! < 0 || n! > 2)) return 'só os atributos do antecedente podem receber bônus.';
  if (picked.filter(([, n]) => n === 2).length > 1) return 'só um atributo pode receber +2.';
  if (picked.reduce((s, [, n]) => s + n!, 0) > 3) return 'o antecedente dá só 3 pontos no total.';
  return null;
}

/* ---------- Espaços de feat ---------- */

export interface FeatSlot {
  id: string;
  label: string;
  level: number;
  allowed: FeatType[];
  /** Feat fixo (o do antecedente). */
  fixedKey?: string | null;
}

export function featSlots(c: Character, cls: ClassDef, bg: BackgroundDef | undefined, species: SpeciesDef | undefined): FeatSlot[] {
  const slots: FeatSlot[] = [];
  if (bg) slots.push({ id: 'background', label: `Antecedente (${bg.pt})`, level: 1, allowed: ['Origin'], fixedKey: bg.featKey });
  if (species?.name === 'Human') slots.push({ id: 'human', label: 'Humano: Versatile', level: 1, allowed: ['Origin'] });

  const fightingStyle: Record<string, number[]> = { Fighter: [1], Paladin: [2], Ranger: [2] };
  for (const lvl of fightingStyle[cls.name] ?? []) {
    if (c.level >= lvl) slots.push({ id: `style-${lvl}`, label: `Fighting Style (nível ${lvl})`, level: lvl, allowed: ['Fighting Style'] });
  }
  const sub = byKey(cls.subclasses, c.subclassKey);
  if (sub?.name === 'Champion' && c.level >= 7) {
    slots.push({ id: 'style-7', label: 'Additional Fighting Style (nível 7)', level: 7, allowed: ['Fighting Style'] });
  }
  for (const lvl of cls.featLevels) {
    if (c.level < lvl) continue;
    slots.push(
      lvl === 19
        ? { id: `feat-${lvl}`, label: `Epic Boon (nível ${lvl})`, level: lvl, allowed: ['Epic Boon', 'General'] }
        : { id: `feat-${lvl}`, label: `Feat (nível ${lvl})`, level: lvl, allowed: ['General'] },
    );
  }
  return slots;
}

/* ---------- Limites de escolha ---------- */

/** Quantas escolhas o personagem pode fazer e de onde cada uma vem. */
export interface PickBudget {
  total: number;
  sources: { label: string; count: number }[];
}

function budget(sources: [string, number][]): PickBudget {
  const list = sources.filter(([, n]) => n > 0).map(([label, count]) => ({ label, count }));
  return { total: list.reduce((s, x) => s + x.count, 0), sources: list };
}

/* ---------- Ficha calculada ---------- */

export interface SkillRow {
  key: SkillKey;
  label: string;
  ability: AbilityKey;
  proficient: boolean;
  expertise: boolean;
  bonus: number;
}

export interface AttackRow {
  name: string;
  bonus: number;
  damage: string;
  notes: string;
  proficient: boolean;
}

export interface SheetFeature {
  name: string;
  /** Nome em inglês, quando o item foi traduzido. */
  original?: string;
  source: string;
  level: number;
  desc: string;
}

/** Parte da criação onde o aviso se resolve. */
export type WarningArea = 'basic' | 'abilities' | 'skills' | 'equipment' | 'spells';

export interface Warning {
  area: WarningArea;
  text: string;
}

export interface Sheet {
  cls: ClassDef;
  subclass?: SubclassDef;
  species?: SpeciesDef;
  /** Espécie com as escolhas principais, ex.: "Elfo (Drow)". */
  speciesLabel: string;
  background?: BackgroundDef;
  armor?: ArmorDef;
  pb: number;
  scores: Scores;
  mods: Scores;
  /** Bônus do antecedente que entrou na conta (vazio se a combinação escolhida for inválida). */
  backgroundBonus: Partial<Scores>;
  saves: { key: AbilityKey; proficient: boolean; bonus: number }[];
  skills: SkillRow[];
  passivePerception: number;
  initiative: number;
  ac: number;
  acNote: string;
  speed: number;
  hpMax: number;
  hitDice: string;
  attacks: AttackRow[];
  resources: { name: string; value: string }[];
  features: SheetFeature[];
  feats: { slot: FeatSlot; feat?: FeatDef; abilities: AbilityKey[] }[];
  /** Perícias além das da classe e do antecedente (espécie, feats, subclasse). */
  extraSkillBudget: PickBudget;
  expertiseBudget: PickBudget;
  spellcasting?: {
    ability: AbilityKey;
    dc: number;
    attack: number;
    cantrips: number;
    prepared: number;
    slots: number[];
    pact?: { count: number; level: number };
    maxSpellLevel: number;
    spells: SpellDef[];
    /** Quantas das magias escolhidas são truques / magias de nível 1+ da lista da classe. */
    chosenCantrips: number;
    chosenPrepared: number;
  };
  warnings: Warning[];
}

const column = (cls: ClassDef, name: string, level: number) => cls.columns.find((c) => c.name === name)?.values[level];

const SPELL_COLUMNS = new Set(['Cantrips', 'Prepared Spells', 'Spell Slots', 'Slot Level']);

export function maxSpellLevel(cls: ClassDef, level: number): number {
  if (cls.casterType === 'PACT') return parseInt(column(cls, 'Slot Level', level) ?? '0', 10) || 0;
  const slots = cls.spellSlots[level] ?? [];
  let max = 0;
  slots.forEach((n, i) => { if (n > 0) max = i + 1; });
  return max;
}

export function isWeaponProficient(cls: ClassDef, w: WeaponDef): boolean {
  if (w.simple) return cls.weaponRule.simple;
  switch (cls.weaponRule.martial) {
    case 'all': return true;
    case 'light': return w.light;
    case 'finesseOrLight': return w.light || w.finesse;
    default: return false;
  }
}

export function computeSheet(c: Character): Sheet {
  const cls = byKey(CLASSES, c.classKey) ?? CLASSES[0];
  const subclass = c.level >= 3 ? byKey(cls.subclasses, c.subclassKey) : undefined;
  const species = byKey(SPECIES, c.speciesKey);
  const background = byKey(BACKGROUNDS, c.backgroundKey);
  const level = Math.min(20, Math.max(1, c.level));
  const pb = proficiencyBonus(level);
  const warnings: Warning[] = [];
  const warn = (area: WarningArea, text: string) => warnings.push({ area, text });

  /* Escolhas da espécie */
  const speciesPicks = (species?.choices ?? []).map((choice) => ({
    choice,
    option: choice.options.find((o) => o.name === c.speciesChoices[choice.key]),
  }));
  for (const { choice, option } of speciesPicks) if (!option) warn('basic', `Escolha da espécie: ${choice.label}.`);
  const picked = (key: string) => speciesPicks.find((p) => p.choice.key === key)?.option;
  const labelParts = speciesPicks
    .filter((p) => p.option && p.choice.kind !== 'ability')
    // "Elfo da Floresta (Wood Elf)" → "Elfo da Floresta"
    .map((p) => p.option!.label.replace(/ \(.*\)$/, ''));
  const speciesLabel = species ? `${species.pt}${labelParts.length ? ` (${labelParts.join(', ')})` : ''}` : '';

  /* Feats e atributos */
  const slots = featSlots(c, cls, background, species);
  const feats = slots.map((slot) => {
    const choice = c.feats[slot.id];
    const featKey = slot.fixedKey !== undefined ? slot.fixedKey : choice?.featKey;
    const feat = byKey(FEATS, featKey);
    const abilities = feat ? (choice?.abilities ?? []).slice(0, feat.abilityPicks) : [];
    return { slot, feat, abilities };
  });
  const hasFeat = (name: string) => feats.some((f) => f.feat?.name === name);

  const bgProblem = background ? backgroundBonusProblem(c.backgroundBonus, background.abilities) : null;
  const backgroundBonus: Partial<Scores> = {};
  const scores = { ...c.baseScores };
  if (background && !bgProblem) {
    for (const a of background.abilities) {
      // O bônus do antecedente não leva nenhum atributo acima de 20.
      const bonus = Math.min(c.backgroundBonus[a] ?? 0, Math.max(0, 20 - scores[a]));
      if (bonus) backgroundBonus[a] = bonus;
      scores[a] += bonus;
    }
  }
  for (const { feat, abilities } of feats) {
    for (const a of abilities) scores[a] = Math.min(feat!.maxScore, scores[a] + 1);
  }
  const mods = Object.fromEntries(ABILITIES.map((a) => [a.key, modifier(scores[a.key])])) as Scores;

  const bonusTotal = Object.values(c.backgroundBonus).reduce((s, n) => s + (n ?? 0), 0);
  if (bgProblem) {
    warn('abilities', `Bônus do antecedente inválido: ${bgProblem} Use +2/+1 ou +1/+1/+1; até corrigir, ele não entra na ficha.`);
  } else if (background && bonusTotal !== 3) {
    warn('abilities', `Distribua 3 pontos do antecedente (+2/+1 ou +1/+1/+1). Atual: ${bonusTotal}.`);
  }

  /* Salvaguardas e perícias */
  const saves = ABILITIES.map((a) => {
    const proficient = cls.saves.includes(a.key);
    return { key: a.key, proficient, bonus: mods[a.key] + (proficient ? pb : 0) };
  });

  // Perícias extras e Especialização: só o que as regras do SRD dão; o excesso não entra na ficha.
  const skilledFeats = feats.filter((f) => f.feat?.name === 'Skilled').length;
  const extraSkillBudget = budget([
    ['Humano (Habilidoso)', species?.name === 'Human' ? 1 : 0],
    ['Elfo (Sentidos Aguçados)', species?.name === 'Elf' ? 1 : 0],
    ['Talentoso (perícias ou ferramentas)', skilledFeats * 3],
    ['Bárbaro (Conhecimento Primitivo)', cls.name === 'Barbarian' && level >= 3 ? 1 : 0],
    ['Colégio do Conhecimento (Proficiências Adicionais)', subclass?.name === 'College of Lore' ? 3 : 0],
    ['Outras fontes', Math.max(0, c.extraSkillBonus)],
  ]);
  const expertiseBudget = budget([
    ['Ladino (Especialização)', cls.name === 'Rogue' ? (level >= 6 ? 4 : 2) : 0],
    ['Bardo (Especialização)', cls.name === 'Bard' && level >= 2 ? (level >= 9 ? 4 : 2) : 0],
    ['Patrulheiro (Explorador Hábil)', cls.name === 'Ranger' && level >= 2 ? 1 : 0],
    ['Patrulheiro (Especialização)', cls.name === 'Ranger' && level >= 9 ? 2 : 0],
    ['Mago (Erudito)', cls.name === 'Wizard' && level >= 2 ? 1 : 0],
    ['Outras fontes', Math.max(0, c.expertiseBonus)],
  ]);
  const extraSkills = c.extraSkills.slice(0, extraSkillBudget.total);
  const expertiseSkills = c.expertise.slice(0, expertiseBudget.total);
  if (c.extraSkills.length > extraSkillBudget.total) {
    warn('skills', `Outras perícias: ${c.extraSkills.length} escolhidas, mas o limite é ${extraSkillBudget.total}. As que passam do limite não entram na ficha.`);
  }
  if (c.expertise.length > expertiseBudget.total) {
    warn('skills', `Especialização: ${c.expertise.length} escolhidas, mas o limite é ${expertiseBudget.total}. As que passam do limite não entram na ficha.`);
  }

  const profSkills = new Set<SkillKey>([...c.classSkills, ...(background?.skills ?? []), ...extraSkills]);
  const jackOfAllTrades = cls.name === 'Bard' && level >= 2;
  const skills: SkillRow[] = SKILLS.map((s) => {
    const proficient = profSkills.has(s.key);
    const expertise = proficient && expertiseSkills.includes(s.key);
    const profPart = expertise ? pb * 2 : proficient ? pb : jackOfAllTrades ? Math.floor(pb / 2) : 0;
    return { key: s.key, label: s.pt, ability: s.ability, proficient, expertise, bonus: mods[s.ability] + profPart };
  });
  if (c.classSkills.length !== cls.skillChoice.count) {
    warn('skills', `Escolha ${cls.skillChoice.count} perícias da classe (escolhidas: ${c.classSkills.length}).`);
  }
  const perception = skills.find((s) => s.key === 'perception')!.bonus;

  /* Armadura */
  const armor = byKey(ARMOR, c.armorKey);
  const unarmored: { ac: number; note: string }[] = [{ ac: 10 + mods.dex, note: 'Sem armadura' }];
  if (cls.name === 'Barbarian') unarmored.push({ ac: 10 + mods.dex + mods.con, note: 'Unarmored Defense' });
  if (cls.name === 'Monk' && !c.shield) unarmored.push({ ac: 10 + mods.dex + mods.wis, note: 'Unarmored Defense' });
  if (subclass?.name === 'Draconic Sorcery') unarmored.push({ ac: 10 + mods.dex + mods.cha, note: 'Draconic Resilience' });
  let ac: number;
  let acNote: string;
  if (armor) {
    const dex = armor.addDex ? (armor.dexCap === null ? mods.dex : Math.min(armor.dexCap, mods.dex)) : 0;
    ac = armor.acBase + dex;
    acNote = armor.name;
    if (hasFeat('Defense')) { ac += 1; acNote += ' + Defense'; }
    if (!cls.armor[armor.category as 'light' | 'medium' | 'heavy']) warn('equipment', `A classe não tem treinamento em armadura ${armor.category}.`);
    if (armor.strRequired && scores.str < armor.strRequired) warn('equipment', `${armor.name} pede Força ${armor.strRequired}: −10 pés de deslocamento.`);
  } else {
    const best = unarmored.reduce((a, b) => (b.ac > a.ac ? b : a));
    ac = best.ac;
    acNote = best.note;
  }
  if (c.shield) {
    ac += 2;
    acNote += ' + Escudo';
    if (!cls.armor.shield) warn('equipment', 'A classe não tem treinamento com Escudo.');
  }

  /* Deslocamento */
  let speed = species?.speed ?? 30;
  // Ex.: Elfo da Floresta: "Your Speed increases to 35 feet".
  for (const { option } of speciesPicks) {
    const fromChoice = Number(option?.desc.match(/Speed increases to (\d+) feet/)?.[1]);
    if (fromChoice > speed) speed = fromChoice;
  }
  if (cls.name === 'Monk' && !armor && !c.shield) {
    speed += level >= 18 ? 30 : level >= 14 ? 25 : level >= 10 ? 20 : level >= 6 ? 15 : level >= 2 ? 10 : 0;
  }
  if (cls.name === 'Barbarian' && level >= 5 && armor?.category !== 'heavy') speed += 10;
  if (armor?.strRequired && scores.str < armor.strRequired) speed -= 10;

  /* Pontos de vida */
  const avg = Math.floor(cls.hitDie / 2) + 1;
  let hpMax = cls.hitDie + mods.con;
  for (let lvl = 2; lvl <= level; lvl++) {
    const roll = c.hpMethod === 'rolled' ? c.hpRolls[lvl - 2] || avg : avg;
    hpMax += Math.max(1, roll + mods.con);
  }
  if (species?.name === 'Dwarf') hpMax += level;
  if (subclass?.name === 'Draconic Sorcery') hpMax += level;
  hpMax = Math.max(1, hpMax);

  /* Ataques */
  const isMonk = cls.name === 'Monk';
  const martialArts = column(cls, 'Martial Arts', level);
  const attacks: AttackRow[] = [];
  for (const key of c.weaponKeys) {
    const w = byKey(WEAPONS, key);
    if (!w) continue;
    const proficient = isWeaponProficient(cls, w);
    const monkWeapon = isMonk && !w.ranged && (w.simple || w.light);
    const ability: AbilityKey = w.ranged ? 'dex' : w.finesse || monkWeapon ? (mods.dex > mods.str ? 'dex' : 'str') : 'str';
    const archery = w.ranged && hasFeat('Archery') ? 2 : 0;
    const mod = mods[ability];
    const dice = monkWeapon && martialArts && dieSize(martialArts) > dieSize(w.damage) ? martialArts : w.damage;
    const notes = [
      w.versatile && `Versátil ${w.versatile}`,
      w.rangeText && `Alcance ${w.rangeText}`,
      ...w.properties.filter((p) => p.mastery).map((p) => `Maestria: ${p.name}`),
    ].filter(Boolean).join(' · ');
    attacks.push({
      name: w.name,
      bonus: mod + (proficient ? pb : 0) + archery,
      damage: `${dice}${mod ? (mod > 0 ? `+${mod}` : mod) : ''} ${w.damageType.toLowerCase()}`,
      notes,
      proficient,
    });
  }
  const unarmedMod = isMonk ? Math.max(mods.str, mods.dex) : mods.str;
  attacks.push({
    name: 'Unarmed Strike',
    bonus: unarmedMod + pb,
    damage: isMonk && martialArts ? `${martialArts}${unarmedMod >= 0 ? '+' : ''}${unarmedMod} bludgeoning` : `${Math.max(1, 1 + unarmedMod)} bludgeoning`,
    notes: '',
    proficient: true,
  });

  /* Recursos de classe (colunas da tabela) */
  const resources = cls.columns
    .filter((col) => !SPELL_COLUMNS.has(col.name))
    .map((col) => ({ name: translation(`${cls.key}/${col.name}`)?.name ?? col.name, value: col.values[level] ?? '—' }))
    .filter((r) => r.value && r.value !== '—' && r.value !== '0');

  /* Características */
  const features: SheetFeature[] = [];
  const pushFeatures = (list: Feature[], source: string) => {
    for (const f of list) {
      const reached = f.levels.filter((l) => l <= level);
      if (!reached.length) continue;
      const pt = translation(f.key);
      features.push({ name: pt?.name ?? f.name, original: pt && f.name, source, level: reached[0], desc: pt?.desc ?? f.desc });
    }
  };
  pushFeatures(cls.features, cls.pt);
  if (subclass) pushFeatures(subclass.features, subclass.pt);
  features.sort((a, b) => a.level - b.level);
  for (const t of species?.traits ?? []) {
    const option = picked(t.name);
    const ability = picked(`${t.name}:ability`);
    const pt = translation(`${species!.key}/${t.name}`);
    const name = pt?.name ?? t.name;
    const optionDesc = option && (translation(`${species!.key}/${t.name}/${option.name}`)?.desc ?? option.desc);
    features.push({
      name: option ? `${name}: ${option.label}` : name,
      original: pt && t.name,
      source: species!.pt,
      level: 1,
      desc: option
        ? [optionDesc, ability && `Atributo de conjuração: ${ability.label}.`].filter(Boolean).join('\n')
        : pt?.desc ?? t.desc,
    });
  }
  if (level >= 3 && !subclass && cls.subclasses.length) warn('basic', 'Escolha uma subclasse (nível 3+).');

  /* Magias */
  let spellcasting: Sheet['spellcasting'];
  if (cls.spellAbility && cls.casterType !== 'NONE') {
    const ab = cls.spellAbility;
    const max = maxSpellLevel(cls, level);
    const pactCount = cls.casterType === 'PACT' ? parseInt(column(cls, 'Spell Slots', level) ?? '0', 10) : 0;
    spellcasting = {
      ability: ab,
      dc: 8 + pb + mods[ab],
      attack: pb + mods[ab],
      cantrips: parseInt(column(cls, 'Cantrips', level) ?? '0', 10) || 0,
      prepared: parseInt(column(cls, 'Prepared Spells', level) ?? '0', 10) || 0,
      slots: cls.casterType === 'PACT' ? [] : cls.spellSlots[level] ?? [],
      pact: cls.casterType === 'PACT' ? { count: pactCount, level: max } : undefined,
      maxSpellLevel: max,
      spells: c.spellKeys.map((k) => byKey(SPELLS, k)).filter((s): s is SpellDef => !!s),
      chosenCantrips: 0,
      chosenPrepared: 0,
    };
    const chosenCantrips = spellcasting.spells.filter((s) => s.level === 0 && s.classes.includes(cls.key)).length;
    const chosenLeveled = spellcasting.spells.filter((s) => s.level > 0 && s.classes.includes(cls.key)).length;
    spellcasting.chosenCantrips = chosenCantrips;
    spellcasting.chosenPrepared = chosenLeveled;
    if (chosenCantrips > spellcasting.cantrips) warn('spells', `Truques da classe: ${chosenCantrips} de ${spellcasting.cantrips}.`);
    if (chosenLeveled > spellcasting.prepared) warn('spells', `Magias preparadas da classe: ${chosenLeveled} de ${spellcasting.prepared}.`);
  } else if (c.spellKeys.length) {
    // Magias de feats (Magic Initiate) sem a classe ser conjuradora.
    const spells = c.spellKeys.map((k) => byKey(SPELLS, k)).filter((s): s is SpellDef => !!s);
    const ab: AbilityKey = (['int', 'wis', 'cha'] as AbilityKey[]).reduce((a, b) => (mods[b] > mods[a] ? b : a));
    spellcasting = { ability: ab, dc: 8 + pb + mods[ab], attack: pb + mods[ab], cantrips: 0, prepared: 0, slots: [], maxSpellLevel: 1, spells, chosenCantrips: 0, chosenPrepared: 0 };
  }

  return {
    cls, subclass, species, speciesLabel, background, armor, pb, scores, mods, backgroundBonus, saves, skills,
    passivePerception: 10 + perception,
    initiative: mods.dex + (hasFeat('Alert') ? pb : 0),
    ac, acNote, speed, hpMax,
    hitDice: `${level}d${cls.hitDie}`,
    attacks, resources, features, feats, extraSkillBudget, expertiseBudget, spellcasting, warnings,
  };
}

function dieSize(dice: string): number {
  return parseInt(dice.match(/d(\d+)/)?.[1] ?? '0', 10);
}
