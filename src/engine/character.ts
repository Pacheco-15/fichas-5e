// Estado salvo de um personagem e o cálculo de tudo que aparece na ficha.
// As regras de escolha (o que pode ser escolhido e quanto) ficam em choices.ts; ver docs/REGRAS.md.
import {
  ABILITIES, ARMOR, BACKGROUNDS, CLASSES, SKILLS, SPECIES, SPELLS, WEAPONS,
  byKey, proficiencyBonus,
  type AbilityKey, type ArmorDef, type BackgroundDef, type ClassDef, type FeatDef,
  type Feature, type SkillKey, type SpeciesDef, type SpellDef, type SubclassDef, type WeaponDef,
} from '../data/rules';
import { ITEMS, gearName, itemName, languageName, toolName, type ItemDef } from '../data/equipment';
import { ARMOR_CATEGORY_PT, damagePt, propertyPt, weaponProfPt, weaponRangePt } from '../data/terms';
import { FEATURE_CHOICES } from '../data/features';
import { translation } from '../data/translations';
import {
  STANDARD_ARRAY, baseScoresProblem, backgroundBonusProblem, featSlots, maxSpellLevel, mods as modsOf, resolveChoices,
  type AbilityMethod, type FeatSlot, type Resolution, type SlotArea,
} from './choices';

export { backgroundBonusProblem, featSlots, maxSpellLevel };
export type { FeatSlot };

export type Scores = Record<AbilityKey, number>;

export interface FeatChoice {
  featKey: string | null;
  /** Um +1 por item; repetir o atributo dá +2. */
  abilities: AbilityKey[];
}

export interface Purchase {
  itemKey: string;
  qty: number;
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
  abilityMethod: AbilityMethod;
  baseScores: Scores;
  /** Bônus do antecedente: +2/+1 ou +1/+1/+1 entre os 3 atributos do antecedente. */
  backgroundBonus: Partial<Scores>;
  /** Escolhas de cada espaço (id do espaço em choices.ts → valores). */
  picks: Record<string, string[]>;
  /** Perícias e Especializações a mais dadas pelo mestre, fora das regras de criação. */
  extraSkillBonus: number;
  expertiseBonus: number;
  feats: Record<string, FeatChoice>;
  hpMethod: 'average' | 'rolled';
  /** Resultado do dado de vida para os níveis 2..20 (índice 0 = nível 2). */
  hpRolls: number[];
  /** Itens comprados com o ouro do equipamento inicial. */
  purchases: Purchase[];
  /** Ouro extra dado pelo mestre (começo em nível alto, R-EQU-7). */
  extraGold: number;
  armorKey: string | null;
  shield: boolean;
  alignment: string;
  /** Outros itens e anotações de equipamento. */
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
    abilityMethod: 'standard',
    baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    backgroundBonus: {},
    picks: {},
    extraSkillBonus: 0,
    expertiseBonus: 0,
    feats: {},
    hpMethod: 'average',
    hpRolls: [],
    purchases: [],
    extraGold: 0,
    armorKey: null,
    shield: false,
    alignment: '',
    equipment: '',
    personality: '',
    notes: '',
  };
}

/* ---------- Migração de fichas antigas ---------- */

/** Campos de versões anteriores, que guardavam escolhas soltas sem dizer de qual regra vinham. */
interface Legacy {
  speciesNotes?: string;
  classSkills?: SkillKey[];
  extraSkills?: SkillKey[];
  expertise?: SkillKey[];
  spellKeys?: string[];
  weaponKeys?: string[];
  languages?: string;
  tools?: string;
}

/** Põe cada valor antigo no primeiro espaço que o aceita e ainda tem lugar. */
function distribute(c: Character, values: string[], area: SlotArea, prefer?: string) {
  for (const v of values) {
    const r = resolveChoices(c);
    const fits = r.slots.filter((s) => s.area === area && s.options.some((o) => o.value === v && !o.disabled));
    const slot = fits.find((s) => s.id === prefer && (r.picks[s.id]?.length ?? 0) < s.count)
      ?? fits.find((s) => (r.picks[s.id]?.length ?? 0) < s.count);
    if (slot && !(c.picks[slot.id] ?? []).includes(v)) c.picks = { ...c.picks, [slot.id]: [...(c.picks[slot.id] ?? []), v] };
  }
}

/** Garante campos novos em fichas salvas por versões antigas do app. */
export function normalizeCharacter(raw: Partial<Character> & Legacy): Character {
  const { speciesNotes, classSkills, extraSkills, expertise, spellKeys, weaponKeys, languages, tools, ...rest } = raw;
  const c: Character = { ...newCharacter(), ...rest, id: raw.id ?? uid(), picks: { ...(raw.picks ?? {}) } };
  if (!raw.abilityMethod) {
    const values = ABILITIES.map((a) => c.baseScores[a.key]).sort((a, b) => b - a);
    c.abilityMethod = values.every((v, i) => v === STANDARD_ARRAY[i]) ? 'standard' : 'random';
  }
  const notes: string[] = [];
  if (speciesNotes) notes.push(`Espécie: ${speciesNotes}`);
  if (languages && languages.trim() && languages.trim() !== 'Common') notes.push(`Idiomas (versão antiga): ${languages}`);
  if (tools?.trim()) notes.push(`Ferramentas (versão antiga): ${tools}`);
  if (notes.length) c.notes = [...notes, c.notes].filter(Boolean).join('\n\n');

  if (classSkills?.length) distribute(c, classSkills, 'skills', 'class-skills');
  if (extraSkills?.length) distribute(c, extraSkills, 'skills');
  if (expertise?.length) distribute(c, expertise, 'skills');
  if (spellKeys?.length) {
    const byLevel = [...spellKeys].sort((a, b) => (byKey(SPELLS, a)?.level ?? 0) - (byKey(SPELLS, b)?.level ?? 0));
    distribute(c, byLevel, 'spells');
  }
  // Armas escolhidas soltas viram compras; se passarem do ouro, a ficha avisa.
  for (const key of weaponKeys ?? []) {
    const item = ITEMS.find((i) => i.weaponKey === key);
    if (item && !c.purchases.some((p) => p.itemKey === item.key)) c.purchases = [...c.purchases, { itemKey: item.key, qty: 1 }];
  }
  return c;
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
  /** Chave da arma no SRD, ou "unarmed" para o Ataque Desarmado. */
  key: string;
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
export type WarningArea = SlotArea;

export interface Warning {
  area: WarningArea;
  text: string;
}

export interface InventoryLine {
  item?: ItemDef;
  text: string;
  qty: number;
  from: 'classe' | 'antecedente' | 'compra';
}

export interface SpellLine {
  spell: SpellDef;
  /** De onde a magia vem: classe, Magic Initiate, sempre preparada… */
  source: string;
  alwaysPrepared: boolean;
}

export interface Sheet {
  cls: ClassDef;
  subclass?: SubclassDef;
  species?: SpeciesDef;
  /** Espécie com as escolhas principais, ex.: "Elfo (Drow)". */
  speciesLabel: string;
  background?: BackgroundDef;
  armor?: ArmorDef;
  choices: Resolution;
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
  armorText: string;
  weaponText: string;
  languages: string[];
  tools: string[];
  inventory: InventoryLine[];
  /** Ouro dos pacotes + extra do mestre, gasto nas compras, e o que sobra. */
  gold: { total: number; spent: number; left: number };
  /** Armaduras e escudo que o personagem tem e pode vestir (R-EQU-3). */
  ownedArmor: ArmorDef[];
  hasShield: boolean;
  /** Tipos de arma com maestria escolhida (R-CLA-6). */
  masteries: string[];
  canCast: boolean;
  spellcasting?: {
    ability: AbilityKey;
    dc: number;
    attack: number;
    cantrips: number;
    prepared: number;
    slots: number[];
    pact?: { count: number; level: number };
    maxSpellLevel: number;
    spells: SpellLine[];
    chosenCantrips: number;
    chosenPrepared: number;
  };
  warnings: Warning[];
}

const column = (cls: ClassDef, name: string, level: number) => cls.columns.find((c) => c.name === name)?.values[level];

const SPELL_COLUMNS = new Set(['Cantrips', 'Prepared Spells', 'Spell Slots', 'Slot Level']);

export function isWeaponProficient(cls: ClassDef, w: WeaponDef, martial: 'class' | 'all' = 'class'): boolean {
  if (w.simple) return cls.weaponRule.simple;
  if (martial === 'all') return true;
  switch (cls.weaponRule.martial) {
    case 'all': return true;
    case 'light': return w.light;
    case 'finesseOrLight': return w.light || w.finesse;
    default: return false;
  }
}

export function computeSheet(c: Character): Sheet {
  const cls = byKey(CLASSES, c.classKey) ?? CLASSES[0];
  const level = Math.min(20, Math.max(1, c.level));
  const subclass = level >= 3 ? byKey(cls.subclasses, c.subclassKey) : undefined;
  const species = byKey(SPECIES, c.speciesKey);
  const background = byKey(BACKGROUNDS, c.backgroundKey);
  const pb = proficiencyBonus(level);
  const choices = resolveChoices(c);
  const warnings: Warning[] = choices.issues.map((i) => ({ area: i.area, text: i.text }));
  const warn = (area: WarningArea, text: string) => warnings.push({ area, text });

  /* Escolhas da espécie (R-ESP-1) */
  const speciesPicks = (species?.choices ?? []).map((choice) => ({
    choice,
    option: choice.options.find((o) => o.name === c.speciesChoices[choice.key]),
  }));
  for (const { choice, option } of speciesPicks) if (!option) warn('basic', `Escolha da espécie: ${choice.label}.`);
  const picked = (key: string) => speciesPicks.find((p) => p.choice.key === key)?.option;
  const labelParts = speciesPicks
    .filter((p) => p.option && p.choice.kind !== 'ability')
    .map((p) => p.option!.label.replace(/ \(.*\)$/, ''));
  const speciesLabel = species ? `${species.pt}${labelParts.length ? ` (${labelParts.join(', ')})` : ''}` : '';

  if (level >= 3 && !subclass && cls.subclasses.length) warn('basic', 'Escolha uma subclasse (nível 3+).');

  /* Atributos (R-ATR, R-ANT-1, R-ANT-2) */
  const baseProblem = baseScoresProblem(c.abilityMethod, c.baseScores);
  if (baseProblem) warn('abilities', `Valores base inválidos: ${baseProblem}`);
  const bgProblem = background ? backgroundBonusProblem(c.backgroundBonus, background.abilities) : null;
  const backgroundBonus: Partial<Scores> = {};
  for (const a of ABILITIES) {
    const n = choices.scoresBeforeFeats[a.key] - c.baseScores[a.key];
    if (n) backgroundBonus[a.key] = n;
  }
  const bonusTotal = Object.values(c.backgroundBonus).reduce((s, n) => s + (n ?? 0), 0);
  if (bgProblem) {
    warn('abilities', `Bônus do antecedente inválido: ${bgProblem} Use +2/+1 ou +1/+1/+1; até corrigir, ele não entra na ficha.`);
  } else if (background && bonusTotal !== 3) {
    warn('abilities', `Distribua 3 pontos do antecedente (+2/+1 ou +1/+1/+1). Atual: ${bonusTotal}.`);
  }
  const scores = choices.scores;
  const mods = modsOf(scores);
  const hasFeat = (name: string) => choices.feats.some((f) => f.feat?.name === name);

  /* Salvaguardas (R-SAL) */
  const saveProf = new Set<AbilityKey>(cls.saves);
  if (cls.name === 'Monk' && level >= 14) for (const a of ABILITIES) saveProf.add(a.key);
  if (cls.name === 'Rogue' && level >= 15) { saveProf.add('wis'); saveProf.add('cha'); }
  const saves = ABILITIES.map((a) => {
    const proficient = saveProf.has(a.key);
    return { key: a.key, proficient, bonus: mods[a.key] + (proficient ? pb : 0) };
  });

  /* Perícias (R-PER-9 a R-PER-11) */
  const jackOfAllTrades = cls.name === 'Bard' && level >= 2;
  const skills: SkillRow[] = SKILLS.map((s) => {
    const proficient = choices.skills.has(s.key);
    const expertise = proficient && choices.expertise.has(s.key);
    const profPart = expertise ? pb * 2 : proficient ? pb : jackOfAllTrades ? Math.floor(pb / 2) : 0;
    return { key: s.key, label: s.pt, ability: s.ability, proficient, expertise, bonus: mods[s.ability] + profPart };
  });
  const perception = skills.find((s) => s.key === 'perception')!.bonus;

  /* Equipamento (R-EQU-1 a R-EQU-3) */
  const inventory: InventoryLine[] = [];
  const instrument = choices.picks['equipment:instrument']?.[0];
  const classTool = choices.picks['class:tools']?.[0];
  const gamingSet = choices.picks['background:tool']?.[0];
  for (const [pkg, from] of [[choices.equipment.cls, 'classe'], [choices.equipment.bg, 'antecedente']] as const) {
    for (const e of pkg?.entries ?? []) {
      const text = e.pick === 'instrument' ? (instrument ? toolName(instrument) : 'Instrumento (escolha)')
        : e.pick === 'class-tool' ? (classTool ? toolName(classTool) : 'Ferramenta (escolha)')
        : e.pick === 'gaming-set' ? (gamingSet ? toolName(gamingSet) : 'Gaming Set (escolha)')
        : e.item ? itemName(e.item) : e.text;
      inventory.push({ item: e.item, text, qty: e.qty, from });
    }
  }
  const goldTotal = (choices.equipment.cls?.gold ?? 0) + (choices.equipment.bg?.gold ?? 0) + Math.max(0, c.extraGold);
  let spent = 0;
  for (const p of c.purchases) {
    const item = byKey(ITEMS, p.itemKey);
    if (!item || p.qty <= 0) continue;
    spent += item.cost * p.qty;
    inventory.push({ item, text: itemName(item), qty: p.qty, from: 'compra' });
  }
  spent = Math.round(spent * 100) / 100;
  const gold = { total: goldTotal, spent, left: Math.round((goldTotal - spent) * 100) / 100 };
  if (gold.left < 0) warn('equipment', `As compras custam ${spent} PO, mas você tem ${goldTotal} PO.`);

  const ownedArmor = ARMOR.filter((a) => a.category !== 'shield' && inventory.some((l) => l.item?.armorKey === a.key));
  const hasShield = inventory.some((l) => l.item?.armorKey === 'srd-2024_shield');
  const armor = ownedArmor.find((a) => a.key === c.armorKey);
  if (c.armorKey && !armor) warn('equipment', 'A armadura vestida não está no seu equipamento.');
  const shield = c.shield && hasShield;
  if (c.shield && !hasShield) warn('equipment', 'Você marcou escudo, mas não tem um no equipamento.');

  /* Armadura (R-NUM-4, R-NUM-5, R-EQU-4, R-EQU-5) */
  const training = choices.armorTraining;
  const unarmored: { ac: number; note: string }[] = [{ ac: 10 + mods.dex, note: 'Sem armadura' }];
  if (cls.name === 'Barbarian') unarmored.push({ ac: 10 + mods.dex + mods.con, note: 'Defesa sem Armadura' });
  if (cls.name === 'Monk' && !shield) unarmored.push({ ac: 10 + mods.dex + mods.wis, note: 'Defesa sem Armadura' });
  if (subclass?.name === 'Draconic Sorcery') unarmored.push({ ac: 10 + mods.dex + mods.cha, note: 'Resiliência Dracônica' });
  let ac: number;
  let acNote: string;
  let canCast = true;
  if (armor) {
    const dex = armor.addDex ? (armor.dexCap === null ? mods.dex : Math.min(armor.dexCap, mods.dex)) : 0;
    ac = armor.acBase + dex;
    acNote = gearName(armor.key, armor.name);
    if (hasFeat('Defense')) { ac += 1; acNote += ' + Defesa'; }
    if (!training[armor.category as 'light' | 'medium' | 'heavy']) {
      canCast = false;
      warn('equipment', `Sem treinamento em armadura ${ARMOR_CATEGORY_PT[armor.category]}: Desvantagem em testes de FOR e DES, e você não pode conjurar magias.`);
    }
  } else {
    const best = unarmored.reduce((a, b) => (b.ac > a.ac ? b : a));
    ac = best.ac;
    acNote = best.note;
  }
  if (shield) {
    if (training.shield) {
      ac += 2;
      acNote += ' + Escudo';
    } else {
      warn('equipment', 'Sem treinamento com Escudo: ele não dá o +2 na CA.');
    }
  }

  /* Deslocamento (R-ESP-6, R-NUM-9, R-EQU-6) */
  let speed = species?.speed ?? 30;
  for (const { option } of speciesPicks) {
    const fromChoice = Number(option?.desc.match(/Speed increases to (\d+) feet/)?.[1]);
    if (fromChoice > speed) speed = fromChoice;
  }
  if (cls.name === 'Monk' && !armor && !shield) {
    speed += level >= 18 ? 30 : level >= 14 ? 25 : level >= 10 ? 20 : level >= 6 ? 15 : level >= 2 ? 10 : 0;
  }
  if (cls.name === 'Barbarian' && level >= 5 && armor?.category !== 'heavy') speed += 10;
  if (armor?.strRequired && scores.str < armor.strRequired) {
    speed -= 10;
    warn('equipment', `${gearName(armor.key, armor.name)} pede Força ${armor.strRequired}: −10 ft de deslocamento.`);
  }

  /* Pontos de vida (R-NUM-1, R-NUM-2, R-ESP-7) */
  const avg = Math.floor(cls.hitDie / 2) + 1;
  let hpMax = cls.hitDie + mods.con;
  for (let lvl = 2; lvl <= level; lvl++) {
    const rolled = c.hpRolls[lvl - 2];
    const roll = c.hpMethod === 'rolled' && rolled >= 1 && rolled <= cls.hitDie ? rolled : avg;
    hpMax += Math.max(1, roll + mods.con);
  }
  if (c.hpMethod === 'rolled') {
    const missing = Array.from({ length: level - 1 }, (_, i) => c.hpRolls[i]).filter((r) => !(r >= 1 && r <= cls.hitDie)).length;
    if (missing) warn('basic', `PV rolados: falta${missing > 1 ? 'm' : ''} ${missing} resultado${missing > 1 ? 's' : ''} (usando a média até lá).`);
  }
  if (species?.name === 'Dwarf') hpMax += level;
  if (subclass?.name === 'Draconic Sorcery') hpMax += level;
  hpMax = Math.max(1, hpMax);

  /* Ataques (R-NUM-6, R-NUM-7, R-FEA-9, R-CLA-6) */
  const masteries = choices.picks['class:weapon-mastery'] ?? [];
  const isMonk = cls.name === 'Monk';
  const martialArts = column(cls, 'Martial Arts', level);
  const attacks: AttackRow[] = [];
  const weaponsOwned = WEAPONS.filter((w) => inventory.some((l) => l.item?.weaponKey === w.key));
  for (const w of weaponsOwned) {
    const proficient = isWeaponProficient(cls, w, choices.martialWeapons);
    const monkWeapon = isMonk && !w.ranged && (w.simple || w.light);
    const ability: AbilityKey = w.ranged ? 'dex' : w.finesse || monkWeapon ? (mods.dex > mods.str ? 'dex' : 'str') : 'str';
    const archery = w.ranged && hasFeat('Archery') ? 2 : 0;
    const mod = mods[ability];
    const dice = monkWeapon && martialArts && dieSize(martialArts) > dieSize(w.damage) ? martialArts : w.damage;
    const notes = [
      w.versatile && `Versátil ${w.versatile}`,
      w.rangeText && (/^Range/.test(w.rangeText) ? weaponRangePt(w.rangeText) : `Alcance ${weaponRangePt(w.rangeText)}`),
      ...(masteries.includes(w.key) ? w.properties.filter((p) => p.mastery).map((p) => `Maestria: ${propertyPt(p.name)}`) : []),
    ].filter(Boolean).join(' · ');
    attacks.push({
      key: w.key,
      name: gearName(w.key, w.name),
      bonus: mod + (proficient ? pb : 0) + archery,
      damage: `${dice}${mod ? (mod > 0 ? `+${mod}` : mod) : ''} ${damagePt(w.damageType)}`,
      notes,
      proficient,
    });
  }
  const unarmedMod = isMonk ? Math.max(mods.str, mods.dex) : mods.str;
  attacks.push({
    key: 'unarmed',
    name: 'Ataque Desarmado',
    bonus: unarmedMod + pb,
    damage: isMonk && martialArts ? `${martialArts}${unarmedMod >= 0 ? '+' : ''}${unarmedMod} contundente` : `${Math.max(1, 1 + unarmedMod)} contundente`,
    notes: '',
    proficient: true,
  });

  /* Recursos de classe (R-NIV-4) */
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
  for (const fc of FEATURE_CHOICES) {
    const v = choices.features[fc.id];
    const f = features.find((x) => x.original === fc.feature || x.name === fc.feature);
    if (v && f) f.name = `${f.name}: ${v}`;
  }
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

  /* Magias (R-MAG, R-NUM-8) */
  const spellLines: SpellLine[] = [];
  const seenSpell = new Set<string>();
  const addSpell = (key: string, source: string, alwaysPrepared: boolean) => {
    const spell = byKey(SPELLS, key);
    if (!spell || seenSpell.has(key)) return;
    seenSpell.add(key);
    spellLines.push({ spell, source, alwaysPrepared });
  };
  // Fora da lista de preparadas da classe, as magias de nível 1+ escolhidas ficam sempre preparadas
  // (Magic Initiate, Magical Discoveries); truques não se preparam.
  for (const slot of choices.slots.filter((s) => s.area === 'spells')) {
    for (const v of choices.picks[slot.id] ?? []) {
      addSpell(v, slot.label, slot.id !== 'spells:prepared' && (byKey(SPELLS, v)?.level ?? 0) > 0);
    }
  }
  for (const g of choices.granted) addSpell(g.spell.key, g.source, g.spell.level > 0);
  spellLines.sort((a, b) => a.spell.level - b.spell.level || a.spell.name.localeCompare(b.spell.name));

  let spellcasting: Sheet['spellcasting'];
  const cantripSlot = choices.slots.find((s) => s.id === 'spells:cantrips');
  const preparedSlot = choices.slots.find((s) => s.id === 'spells:prepared');
  if (cls.spellAbility && cls.casterType !== 'NONE') {
    const ab = cls.spellAbility;
    const max = maxSpellLevel(cls, level);
    spellcasting = {
      ability: ab,
      dc: 8 + pb + mods[ab],
      attack: pb + mods[ab],
      cantrips: cantripSlot?.count ?? 0,
      prepared: preparedSlot?.count ?? 0,
      slots: cls.casterType === 'PACT' ? [] : cls.spellSlots[level] ?? [],
      pact: cls.casterType === 'PACT' ? { count: parseInt(column(cls, 'Spell Slots', level) ?? '0', 10) || 0, level: max } : undefined,
      maxSpellLevel: max,
      spells: spellLines,
      chosenCantrips: choices.picks['spells:cantrips']?.length ?? 0,
      chosenPrepared: choices.picks['spells:prepared']?.length ?? 0,
    };
  } else if (spellLines.length) {
    // Magias de espécie ou de feats (Magic Initiate) sem a classe ser conjuradora.
    const miAbility = Object.entries(choices.picks).find(([k]) => k.endsWith(':mi-ability'))?.[1][0] as AbilityKey | undefined;
    const speciesAbility = species?.choices.find((ch) => ch.kind === 'ability');
    const ab = miAbility ?? (speciesAbility && (c.speciesChoices[speciesAbility.key] as AbilityKey)) ?? 'cha';
    spellcasting = {
      ability: ab, dc: 8 + pb + mods[ab], attack: pb + mods[ab], cantrips: 0, prepared: 0, slots: [], maxSpellLevel: 0,
      spells: spellLines, chosenCantrips: 0, chosenPrepared: 0,
    };
  }
  if (!canCast && spellcasting) warn('spells', 'Com a armadura atual (sem treinamento), você não pode conjurar magias.');

  /* Proficiências em texto */
  const armorText = [
    training.light && 'leve', training.medium && 'média', training.heavy && 'pesada',
  ].filter(Boolean).join(', ').replace(/^$/, 'nenhuma') + (training.shield ? ' e escudo' : '');
  const weaponText = weaponProfPt(choices.martialWeapons === 'all' ? 'Simple and Martial weapons' : cls.weaponText);

  return {
    cls, subclass, species, speciesLabel, background, armor, choices, pb, scores, mods, backgroundBonus, saves, skills,
    passivePerception: 10 + perception,
    initiative: mods.dex + (hasFeat('Alert') ? pb : 0),
    ac, acNote, speed, hpMax,
    hitDice: `${level}d${cls.hitDie}`,
    attacks, resources, features,
    feats: choices.feats.map(({ slot, feat, abilities }) => ({ slot, feat, abilities })),
    armorText: `Armadura: ${armorText}`, weaponText,
    languages: choices.languages.map(languageName), tools: choices.tools.map(toolName),
    inventory, gold, ownedArmor, hasShield, masteries, canCast,
    spellcasting, warnings,
  };
}

function dieSize(dice: string): number {
  return parseInt(dice.match(/d(\d+)/)?.[1] ?? '0', 10);
}
