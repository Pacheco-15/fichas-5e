// Espaços de escolha da criação: quantas escolhas cada regra dá e de quais opções (docs/REGRAS.md).
// O motor só aceita o que cabe nos espaços; a tela usa os mesmos espaços para desativar o resto.
import {
  ABILITIES, BACKGROUNDS, CLASSES, FEATS, SKILLS, SPECIES, SPELLS, WEAPONS,
  abilityLabel, byKey, modifier, skillLabel,
  type AbilityKey, type ClassDef, type FeatDef, type FeatType, type SkillKey, type SpellDef,
} from '../data/rules';
import {
  BACKGROUND_EQUIPMENT, CLASS_EQUIPMENT, RARE_LANGUAGES, STANDARD_LANGUAGES, TOOLS, entryLabel, gearName, languageName, toolName, toolsOf,
  type EquipmentOption,
} from '../data/equipment';
import { propertyPt, spellLabel, spellText } from '../data/terms';
import {
  CLASS_SPELLS, FEATURE_CHOICES, INVOCATIONS, LAND_SPELLS, METAMAGIC, SUBCLASS_SPELLS, metamagicCount, speciesSpells,
  type GrantedSpell,
} from '../data/features';
import type { Character, FeatChoice, Scores } from './character';

/* ---------- Tipos ---------- */

/** Passo da criação onde a escolha aparece. */
export type SlotArea = 'basic' | 'abilities' | 'skills' | 'feats' | 'equipment' | 'spells';

export interface SlotOption {
  value: string;
  label: string;
  desc?: string;
  /** Motivo de a opção não poder ser escolhida (pré-requisito, nível…). */
  disabled?: string;
  /** Grupo da opção, quando o espaço mistura grupos (Skilled: perícias e ferramentas). */
  group?: string;
}

export interface ChoiceSlot {
  id: string;
  area: SlotArea;
  label: string;
  /** De onde vem a escolha, ex.: "Ladino, nível 1". */
  source: string;
  count: number;
  options: SlotOption[];
  /** Escolhas do mesmo grupo não se repetem entre espaços (perícias, idiomas, magias…). */
  group?: string;
}

export interface SlotIssue {
  slotId: string;
  area: SlotArea;
  text: string;
}

export interface ResolvedFeat {
  slot: FeatSlot;
  feat?: FeatDef;
  abilities: AbilityKey[];
  /** Opções do seletor deste espaço, com o motivo das desativadas. */
  options: SlotOption[];
  /** Fighting Style trocado por Blessed Warrior / Druidic Warrior. */
  warrior?: 'cleric' | 'druid';
}

export interface Resolution {
  slots: ChoiceSlot[];
  /** Só as escolhas válidas de cada espaço. */
  picks: Record<string, string[]>;
  issues: SlotIssue[];
  /** Valor já escolhido em outro espaço do mesmo grupo → nome desse espaço. */
  taken: Record<string, Record<string, string>>;
  feats: ResolvedFeat[];
  /** Valores do antecedente e da espécie depois das regras, antes dos feats. */
  scoresBeforeFeats: Scores;
  scores: Scores;
  skills: Set<SkillKey>;
  expertise: Set<SkillKey>;
  tools: string[];
  languages: string[];
  /** Escolhas de características: id → nome da opção. */
  features: Record<string, string>;
  armorTraining: { light: boolean; medium: boolean; heavy: boolean; shield: boolean };
  martialWeapons: 'class' | 'all';
  equipment: { cls?: EquipmentOption; bg?: EquipmentOption };
  /** Magias sempre preparadas (classe, subclasse, espécie); não contam no limite (R-MAG-3). */
  granted: GrantedSpell[];
}

/* ---------- Feats ---------- */

export interface FeatSlot {
  id: string;
  label: string;
  level: number;
  allowed: FeatType[];
  /** Feat fixo (o do antecedente). */
  fixedKey?: string | null;
  /** Lista do Magic Initiate que o antecedente fixa, ex.: Acólito → Cleric. */
  fixedList?: SpellList;
}

export type SpellList = 'cleric' | 'druid' | 'wizard';
const SPELL_LISTS: SpellList[] = ['cleric', 'druid', 'wizard'];
const LIST_CLASS: Record<SpellList, string> = { cleric: 'srd-2024_cleric', druid: 'srd-2024_druid', wizard: 'srd-2024_wizard' };
const LIST_PT: Record<SpellList, string> = { cleric: 'Clérigo', druid: 'Druida', wizard: 'Mago' };

/** Pseudo-feats do Fighting Style de Paladino e Patrulheiro (R-FEA-7). */
export const WARRIOR_OPTIONS: Record<string, { key: string; name: string; list: SpellList }> = {
  Paladin: { key: 'blessed-warrior', name: 'Blessed Warrior (2 truques de Clérigo)', list: 'cleric' },
  Ranger: { key: 'druidic-warrior', name: 'Druidic Warrior (2 truques de Druida)', list: 'druid' },
};

const REPEATABLE = new Set(['Ability Score Improvement', 'Skilled', 'Magic Initiate']);

/** Níveis em que a classe tem a característica Fighting Style. */
const FIGHTING_STYLE_LEVEL: Record<string, number> = { Fighter: 1, Paladin: 2, Ranger: 2 };

export function hasFightingStyle(cls: ClassDef, level: number) {
  const l = FIGHTING_STYLE_LEVEL[cls.name];
  return l !== undefined && level >= l;
}

export function featSlots(c: Character, cls: ClassDef): FeatSlot[] {
  const bg = byKey(BACKGROUNDS, c.backgroundKey);
  const species = byKey(SPECIES, c.speciesKey);
  const slots: FeatSlot[] = [];
  if (bg) {
    const list = bg.featText.match(/\((Cleric|Druid|Wizard)\)/)?.[1].toLowerCase() as SpellList | undefined;
    slots.push({ id: 'background', label: `Antecedente (${bg.pt})`, level: 1, allowed: ['Origin'], fixedKey: bg.featKey, fixedList: list });
  }
  if (species?.name === 'Human') slots.push({ id: 'human', label: 'Humano: Versatile', level: 1, allowed: ['Origin'] });
  const style = FIGHTING_STYLE_LEVEL[cls.name];
  if (style !== undefined && c.level >= style) {
    slots.push({ id: `style-${style}`, label: `Fighting Style (nível ${style})`, level: style, allowed: ['Fighting Style'] });
  }
  const sub = c.level >= 3 ? byKey(cls.subclasses, c.subclassKey) : undefined;
  if (sub?.name === 'Champion' && c.level >= 7) {
    slots.push({ id: 'style-7', label: 'Additional Fighting Style (nível 7)', level: 7, allowed: ['Fighting Style'] });
  }
  // R-FEA-3: no ASI vale qualquer feat que você cumpra; no 19, também um Epic Boon.
  for (const lvl of cls.featLevels) {
    if (c.level < lvl) continue;
    const allowed: FeatType[] = ['General', 'Origin', 'Fighting Style'];
    slots.push(
      lvl === 19
        ? { id: `feat-${lvl}`, label: `Epic Boon (nível ${lvl})`, level: lvl, allowed: ['Epic Boon', ...allowed] }
        : { id: `feat-${lvl}`, label: `Ability Score Improvement (nível ${lvl})`, level: lvl, allowed },
    );
  }
  return slots.sort((a, b) => a.level - b.level);
}

/** Atributos que o feat deixa aumentar, e até quanto (R-FEA-4, R-FEA-5, R-FEA-6). */
export function featAbilityOptions(feat: FeatDef): AbilityKey[] {
  if (feat.name === 'Grappler') return ['str', 'dex'];
  return feat.abilityPicks > 0 ? ABILITIES.map((a) => a.key) : [];
}

/** Pré-requisito do feat que não é cumprido, ou null (R-FEA-2). */
export function featProblem(feat: FeatDef, slotLevel: number, cls: ClassDef, scores: Scores): string | null {
  const lvl = Number(feat.prerequisite?.match(/Level (\d+)\+/)?.[1] ?? 0);
  if (lvl && slotLevel < lvl) return `pede nível ${lvl}+`;
  if (feat.name === 'Grappler' && scores.str < 13 && scores.dex < 13) return 'pede Força ou Destreza 13+';
  if (/Spellcasting Feature/i.test(feat.prerequisite ?? '') && cls.casterType === 'NONE') return 'pede a característica Spellcasting';
  if (feat.type === 'Fighting Style' && !hasFightingStyle(cls, slotLevel)) return 'pede a característica Fighting Style';
  return null;
}

/* ---------- Regras de atributos (R-ATR) ---------- */

export type AbilityMethod = 'standard' | 'pointbuy' | 'random';
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const POINT_BUDGET = 27;

export function pointBuyCost(scores: Scores): number | null {
  let total = 0;
  for (const a of ABILITIES) {
    const cost = POINT_COST[scores[a.key]];
    if (cost === undefined) return null;
    total += cost;
  }
  return total;
}

/** Problema dos valores base no método escolhido, ou null. */
export function baseScoresProblem(method: AbilityMethod, scores: Scores): string | null {
  const values = ABILITIES.map((a) => scores[a.key]);
  if (method === 'standard') {
    const sorted = [...values].sort((a, b) => b - a);
    return sorted.every((v, i) => v === STANDARD_ARRAY[i])
      ? null
      : 'no conjunto padrão, use 15, 14, 13, 12, 10 e 8, cada um uma vez.';
  }
  if (method === 'pointbuy') {
    const cost = pointBuyCost(scores);
    if (cost === null) return 'na compra de pontos, cada valor fica entre 8 e 15.';
    if (cost > POINT_BUDGET) return `a compra de pontos custa ${cost}, mas o limite é ${POINT_BUDGET}.`;
    return null;
  }
  return values.every((v) => Number.isInteger(v) && v >= 3 && v <= 18) ? null : 'na rolagem (4d6), cada valor fica entre 3 e 18.';
}

/** Regra de 2024: +2 num e +1 noutro, ou +1 em três, só entre os atributos do antecedente (R-ANT-1). */
export function backgroundBonusProblem(bonus: Partial<Scores>, abilities: AbilityKey[]): string | null {
  const picked = (Object.entries(bonus) as [AbilityKey, number | undefined][]).filter(([, n]) => n);
  if (picked.some(([k, n]) => !abilities.includes(k) || n! < 0 || n! > 2 || !Number.isInteger(n))) return 'só os atributos do antecedente podem receber bônus.';
  if (picked.filter(([, n]) => n === 2).length > 1) return 'só um atributo pode receber +2.';
  if (picked.reduce((s, [, n]) => s + n!, 0) > 3) return 'o antecedente dá só 3 pontos no total.';
  return null;
}

/* ---------- Ajudas ---------- */

const column = (cls: ClassDef, name: string, level: number) => cls.columns.find((col) => col.name === name)?.values[level];
const colNum = (cls: ClassDef, name: string, level: number) => parseInt(column(cls, name, level) ?? '0', 10) || 0;

export function maxSpellLevel(cls: ClassDef, level: number): number {
  if (cls.casterType === 'PACT') return colNum(cls, 'Slot Level', level);
  let max = 0;
  (cls.spellSlots[level] ?? []).forEach((n, i) => { if (n > 0) max = i + 1; });
  return max;
}

const skillOptions = (keys: SkillKey[]): SlotOption[] => keys.map((k) => ({ value: k, label: skillLabel(k) }));
const allSkills = () => SKILLS.map((s) => s.key);
const spellOption = (s: SpellDef): SlotOption => {
  const t = spellText(s);
  return { value: s.key, label: spellLabel(s), desc: `${t.levelLabel} · ${t.school}` };
};
const classSpells = (classKeys: string[], minLevel: number, maxLevel: number) =>
  SPELLS.filter((s) => s.level >= minLevel && s.level <= maxLevel && s.classes.some((k) => classKeys.includes(k)));
const toolOptions = (keys: string[]): SlotOption[] => keys.map((k) => ({ value: k, label: toolName(k), group: 'tools' }));

/* ---------- Resolução ---------- */

export function resolveChoices(c: Character): Resolution {
  const cls = byKey(CLASSES, c.classKey) ?? CLASSES[0];
  const level = Math.min(20, Math.max(1, c.level));
  const subclass = level >= 3 ? byKey(cls.subclasses, c.subclassKey) : undefined;
  const species = byKey(SPECIES, c.speciesKey);
  const bg = byKey(BACKGROUNDS, c.backgroundKey);
  const picks = c.picks ?? {};

  const slots: ChoiceSlot[] = [];
  const resolved: Record<string, string[]> = {};
  const issues: SlotIssue[] = [];
  const taken: Record<string, Record<string, string>> = {};
  const mark = (group: string, value: string, by: string) => { (taken[group] ??= {})[value] ??= by; };

  /** Registra o espaço e guarda só as escolhas que cabem nele. */
  const take = (slot: ChoiceSlot): string[] => {
    slots.push(slot);
    if (slot.count <= 0) return (resolved[slot.id] = []);
    const raw = picks[slot.id] ?? [];
    const valid: string[] = [];
    for (const v of raw) {
      const opt = slot.options.find((o) => o.value === v);
      const group = opt?.group ?? slot.group;
      if (!opt || opt.disabled || valid.includes(v) || valid.length >= slot.count) continue;
      if (group && taken[group]?.[v] !== undefined) continue;
      valid.push(v);
    }
    for (const v of valid) {
      const group = slot.options.find((o) => o.value === v)?.group ?? slot.group;
      if (group) mark(group, v, slot.label);
    }
    const dropped = raw.length - valid.length;
    if (dropped > 0) issues.push({ slotId: slot.id, area: slot.area, text: `${slot.label}: ${dropped} escolha${dropped > 1 ? 's' : ''} fora das regras não ${dropped > 1 ? 'entram' : 'entra'} na ficha.` });
    if (valid.length < slot.count) {
      const left = slot.count - valid.length;
      issues.push({ slotId: slot.id, area: slot.area, text: `${slot.label}: falta${left > 1 ? 'm' : ''} ${left} de ${slot.count}.` });
    }
    return (resolved[slot.id] = valid);
  };
  const one = (slot: ChoiceSlot) => take(slot)[0];

  /* Características de classe com opção (R-CLA-1 a R-CLA-3) */
  const features: Record<string, string> = {};
  for (const fc of FEATURE_CHOICES) {
    const owned = fc.owner === cls.key || fc.owner === subclass?.key;
    if (!owned || level < fc.level) continue;
    const v = one({
      id: `feature:${fc.id}`, area: 'feats', label: fc.feature, source: `${fc.owner === cls.key ? cls.pt : subclass!.pt}, nível ${fc.level}`,
      count: 1, options: fc.options.map((o) => ({ value: o.name, label: o.name, desc: o.desc })),
    });
    if (v) features[fc.id] = v;
  }
  const protector = features['divine-order'] === 'Protector';
  const warden = features['primal-order'] === 'Warden';
  const armorTraining = {
    light: cls.armor.light || warden,
    medium: cls.armor.medium || warden || protector,
    heavy: cls.armor.heavy || protector,
    shield: cls.armor.shield,
  };
  const martialWeapons = protector || warden ? 'all' : 'class';

  /* Metamagic e Eldritch Invocations (R-CLA-4, R-CLA-5) */
  if (cls.name === 'Sorcerer' && level >= 2) {
    take({
      id: 'class:metamagic', area: 'feats', label: 'Metamagic', source: `${cls.pt}, níveis 2, 10 e 17`, group: 'metamagic',
      count: metamagicCount(level), options: METAMAGIC.map((m) => ({ value: m.name, label: m.name, desc: m.desc })),
    });
  }
  if (cls.name === 'Warlock') {
    const raw = picks['class:invocations'] ?? [];
    take({
      id: 'class:invocations', area: 'feats', label: 'Eldritch Invocations', source: `${cls.pt}, tabela da classe`, group: 'invocations',
      count: colNum(cls, 'Eldritch Invocations', level),
      options: INVOCATIONS.map((inv) => ({
        value: inv.name, label: inv.name, desc: [inv.prerequisite && `Pré-requisito: ${inv.prerequisite}.`, inv.desc].filter(Boolean).join(' '),
        disabled: level < inv.minLevel ? `pede Bruxo nível ${inv.minLevel}+`
          : inv.requires.find((r) => !raw.includes(r)) ? `pede ${inv.requires.find((r) => !raw.includes(r))}` : undefined,
      })),
    });
  }

  /* Atributos: base + antecedente (R-ANT-1, R-ANT-2) */
  const scores = { ...c.baseScores };
  if (bg && !backgroundBonusProblem(c.backgroundBonus, bg.abilities)) {
    for (const a of bg.abilities) scores[a] += Math.min(c.backgroundBonus[a] ?? 0, Math.max(0, 20 - scores[a]));
  }
  const scoresBeforeFeats = { ...scores };

  /* Feats, em ordem de nível, com pré-requisitos e sem repetir (R-FEA-1 a R-FEA-8) */
  const resolvedFeats: ResolvedFeat[] = [];
  const featNames: string[] = [];
  for (const slot of featSlots(c, cls)) {
    const choice: FeatChoice = c.feats[slot.id] ?? { featKey: null, abilities: [] };
    const warrior = WARRIOR_OPTIONS[cls.name];
    const options: SlotOption[] = FEATS.filter((f) => slot.allowed.includes(f.type)).map((f) => {
      const problem = featProblem(f, slot.level, cls, scores)
        ?? (!REPEATABLE.has(f.name) && featNames.includes(f.name) ? 'já escolhido em outro espaço' : null);
      return { value: f.key, label: f.name, desc: f.type, disabled: problem ?? undefined };
    });
    if (warrior && slot.allowed.includes('Fighting Style') && slot.id.startsWith('style-')) {
      options.push({ value: warrior.key, label: warrior.name, desc: 'Fighting Style' });
    }
    const wantedKey = slot.fixedKey !== undefined ? slot.fixedKey : choice.featKey;
    const option = options.find((o) => o.value === wantedKey);
    const valid = slot.fixedKey !== undefined || (option && !option.disabled);
    if (warrior && wantedKey === warrior.key && valid) {
      resolvedFeats.push({ slot, abilities: [], options, warrior: warrior.list === 'cleric' ? 'cleric' : 'druid' });
      continue;
    }
    const feat = valid ? byKey(FEATS, wantedKey) : undefined;
    if (wantedKey && !valid) issues.push({ slotId: `feat:${slot.id}`, area: 'feats', text: `${slot.label}: ${byKey(FEATS, wantedKey)?.name ?? 'feat'} ${option?.disabled ?? 'não é permitido aqui'}.` });
    if (!wantedKey) issues.push({ slotId: `feat:${slot.id}`, area: 'feats', text: `${slot.label}: escolha um feat.` });
    const abilities: AbilityKey[] = [];
    if (feat) {
      featNames.push(feat.name);
      const allowedAb = featAbilityOptions(feat);
      for (const a of (choice.abilities ?? []).slice(0, feat.abilityPicks)) {
        if (!allowedAb.includes(a)) continue;
        if (scores[a] >= feat.maxScore) continue;
        scores[a] += 1;
        abilities.push(a);
      }
      if (feat.abilityPicks > 0 && abilities.length < feat.abilityPicks) {
        issues.push({ slotId: `feat:${slot.id}`, area: 'feats', text: `${slot.label}: distribua ${feat.abilityPicks} ponto${feat.abilityPicks > 1 ? 's' : ''} de atributo (escolhidos: ${abilities.length}).` });
      }
    }
    resolvedFeats.push({ slot, feat, abilities, options });
  }

  /* Ferramentas (R-ANT-4, R-CLA-7, R-PER-5) */
  const fixedTools: string[] = [];
  const bgTool = bg?.toolText ?? '';
  if (/gaming set/i.test(bgTool)) {
    take({ id: 'background:tool', area: 'skills', label: `Ferramenta do antecedente (${bg!.pt})`, source: bg!.pt, count: 1, options: toolOptions(toolsOf('gaming')) });
  } else if (bgTool) {
    fixedTools.push(TOOLS.find((t) => t.key.toLowerCase() === bgTool.toLowerCase())?.key ?? bgTool);
  }
  if (cls.name === 'Bard') take({ id: 'class:tools', area: 'skills', label: 'Instrumentos do Bardo', source: cls.pt, count: 3, options: toolOptions(toolsOf('instrument')) });
  if (cls.name === 'Monk') take({ id: 'class:tools', area: 'skills', label: 'Ferramenta do Monge', source: cls.pt, count: 1, options: toolOptions(toolsOf('artisan', 'instrument')) });
  if (cls.name === 'Druid') fixedTools.push('Herbalism Kit');
  if (cls.name === 'Rogue') fixedTools.push("Thieves' Tools");
  for (const t of fixedTools) mark('tools', t, 'fixo');

  /* Perícias (R-PER-1 a R-PER-5) */
  for (const s of bg?.skills ?? []) mark('skills', s, `antecedente (${bg!.pt})`);
  take({
    id: 'class-skills', area: 'skills', label: `Perícias do ${cls.pt}`, source: cls.pt, group: 'skills',
    count: cls.skillChoice.count, options: skillOptions(cls.skillChoice.options),
  });
  if (species?.name === 'Human') take({ id: 'species:skillful', area: 'skills', label: 'Humano: Skillful', source: species.pt, group: 'skills', count: 1, options: skillOptions(allSkills()) });
  if (species?.name === 'Elf') take({ id: 'species:keen-senses', area: 'skills', label: 'Elfo: Keen Senses', source: species.pt, group: 'skills', count: 1, options: skillOptions(['insight', 'perception', 'survival']) });
  if (cls.name === 'Barbarian' && level >= 3) take({ id: 'class:primal-knowledge', area: 'skills', label: 'Bárbaro: Primal Knowledge', source: `${cls.pt}, nível 3`, group: 'skills', count: 1, options: skillOptions(cls.skillChoice.options) });
  if (subclass?.name === 'College of Lore') take({ id: 'subclass:bonus-proficiencies', area: 'skills', label: 'Colégio do Conhecimento: Bonus Proficiencies', source: `${subclass.pt}, nível 3`, group: 'skills', count: 3, options: skillOptions(allSkills()) });
  for (const f of resolvedFeats.filter((x) => x.feat?.name === 'Skilled')) {
    take({
      id: `feat:${f.slot.id}:skilled`, area: 'skills', label: `Skilled (${f.slot.label})`, source: f.slot.label, count: 3,
      options: [...skillOptions(allSkills()).map((o) => ({ ...o, group: 'skills' })), ...toolOptions(TOOLS.map((t) => t.key))],
    });
  }
  if (c.extraSkillBonus > 0) take({ id: 'gm:skills', area: 'skills', label: 'Perícias dadas pelo mestre', source: 'mestre', group: 'skills', count: Math.min(18, c.extraSkillBonus), options: skillOptions(allSkills()) });

  const skills = new Set<SkillKey>(Object.keys(taken.skills ?? {}) as SkillKey[]);
  const tools = Object.keys(taken.tools ?? {});

  /* Especialização (R-PER-6 a R-PER-8) */
  const proficient = SKILLS.map((s) => s.key).filter((k) => skills.has(k));
  const expertiseSlot = (id: string, label: string, source: string, count: number, only?: SkillKey[]) =>
    take({ id, area: 'skills', label, source, group: 'expertise', count, options: skillOptions(proficient.filter((k) => !only || only.includes(k))) });
  if (cls.name === 'Rogue') {
    expertiseSlot('class:expertise-1', 'Expertise (Ladino 1)', `${cls.pt}, nível 1`, 2);
    if (level >= 6) expertiseSlot('class:expertise-6', 'Expertise (Ladino 6)', `${cls.pt}, nível 6`, 2);
  }
  if (cls.name === 'Bard' && level >= 2) {
    expertiseSlot('class:expertise-2', 'Expertise (Bardo 2)', `${cls.pt}, nível 2`, 2);
    if (level >= 9) expertiseSlot('class:expertise-9', 'Expertise (Bardo 9)', `${cls.pt}, nível 9`, 2);
  }
  if (cls.name === 'Ranger' && level >= 2) {
    expertiseSlot('class:deft-explorer', 'Deft Explorer: Expertise', `${cls.pt}, nível 2`, 1);
    if (level >= 9) expertiseSlot('class:expertise-9', 'Expertise (Patrulheiro 9)', `${cls.pt}, nível 9`, 2);
  }
  if (cls.name === 'Wizard' && level >= 2) {
    expertiseSlot('class:scholar', 'Scholar', `${cls.pt}, nível 2`, 1, ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion']);
  }
  if (c.expertiseBonus > 0) expertiseSlot('gm:expertise', 'Expertise dada pelo mestre', 'mestre', Math.min(18, c.expertiseBonus));
  const expertise = new Set<SkillKey>(Object.keys(taken.expertise ?? {}) as SkillKey[]);

  /* Idiomas (R-IDI-1 a R-IDI-3) */
  mark('languages', 'Common', 'todo personagem');
  if (cls.name === 'Druid') mark('languages', 'Druidic', cls.pt);
  if (cls.name === 'Rogue') mark('languages', "Thieves' Cant", cls.pt);
  const langOptions = (list: string[]) => list.map((l) => ({ value: l, label: languageName(l) }));
  take({ id: 'origin:languages', area: 'basic', label: 'Idiomas', source: 'origem', group: 'languages', count: 2, options: langOptions(STANDARD_LANGUAGES) });
  if (cls.name === 'Rogue') take({ id: 'class:thieves-cant', area: 'basic', label: "Thieves' Cant: mais 1 idioma", source: `${cls.pt}, nível 1`, group: 'languages', count: 1, options: langOptions([...STANDARD_LANGUAGES, ...RARE_LANGUAGES]) });
  if (cls.name === 'Ranger' && level >= 2) take({ id: 'class:deft-explorer-languages', area: 'basic', label: 'Deft Explorer: idiomas', source: `${cls.pt}, nível 2`, group: 'languages', count: 2, options: langOptions([...STANDARD_LANGUAGES, ...RARE_LANGUAGES]) });
  const languages = Object.keys(taken.languages ?? {});

  /* Equipamento inicial (R-EQU-1) */
  const pkgOptions = (opts: EquipmentOption[]): SlotOption[] => opts.map((o) => ({
    value: o.id, label: o.label,
    desc: [...o.entries.map(entryLabel), o.gold ? `${o.gold} PO` : ''].filter(Boolean).join(', '),
  }));
  const clsPkgs = CLASS_EQUIPMENT[cls.key] ?? [];
  const bgPkgs = bg ? BACKGROUND_EQUIPMENT[bg.key] ?? [] : [];
  const clsPkgId = one({ id: 'equipment:class', area: 'equipment', label: `Equipamento do ${cls.pt}`, source: cls.pt, count: 1, options: pkgOptions(clsPkgs) });
  const clsPkg = clsPkgs.find((o) => o.id === clsPkgId);
  const bgPkgId = bg && one({ id: 'equipment:background', area: 'equipment', label: `Equipamento do antecedente (${bg.pt})`, source: bg.pt, count: 1, options: pkgOptions(bgPkgs) });
  const bgPkg = bgPkgs.find((o) => o.id === bgPkgId);
  if (clsPkg?.entries.some((e) => e.pick === 'instrument')) {
    take({ id: 'equipment:instrument', area: 'equipment', label: 'Instrumento do pacote do Bardo', source: cls.pt, count: 1, options: toolOptions(toolsOf('instrument')).map((o) => ({ ...o, group: undefined })) });
  }

  /* Weapon Mastery (R-CLA-6) */
  const hasMastery = cls.features.some((f) => f.name === 'Weapon Mastery');
  if (hasMastery) {
    const weaponRule = { ...cls.weaponRule, martial: martialWeapons === 'all' ? 'all' as const : cls.weaponRule.martial };
    const proficientWith = (w: (typeof WEAPONS)[number]) => w.simple ? weaponRule.simple
      : weaponRule.martial === 'all' || (weaponRule.martial === 'light' && w.light) || (weaponRule.martial === 'finesseOrLight' && (w.light || w.finesse));
    const eligible = WEAPONS.filter((w) =>
      cls.name === 'Barbarian' ? !w.ranged : cls.name === 'Fighter' ? true : proficientWith(w));
    take({
      id: 'class:weapon-mastery', area: 'equipment', label: 'Weapon Mastery', source: cls.pt, group: 'mastery',
      count: colNum(cls, 'Weapon Mastery', level) || 2,
      options: eligible.map((w) => ({ value: w.key, label: gearName(w.key, w.name), desc: w.properties.filter((p) => p.mastery).map((p) => propertyPt(p.name)).join(', ') })),
    });
  }

  /* Magias (R-MAG-1 a R-MAG-8) */
  const land = subclass?.name === 'Circle of the Land' ? features['land-type'] : undefined;
  const granted: GrantedSpell[] = [
    ...(CLASS_SPELLS[cls.key] ?? []),
    ...(subclass ? SUBCLASS_SPELLS[subclass.key] ?? [] : []),
    ...(land ? LAND_SPELLS[land] ?? [] : []),
    ...speciesSpells(c.speciesKey, c.speciesChoices, level),
  ].filter((g) => g.level <= level);
  for (const g of granted) mark('spells', g.spell.key, g.source);
  const max = maxSpellLevel(cls, level);
  const isCaster = cls.casterType !== 'NONE' && !!cls.spellAbility;
  if (isCaster) {
    const extraCantrip = features['divine-order'] === 'Thaumaturge' || features['primal-order'] === 'Magician' ? 1 : 0;
    const cantrips = colNum(cls, 'Cantrips', level) + extraCantrip;
    take({
      id: 'spells:cantrips', area: 'spells', label: `Truques do ${cls.pt}`, source: cls.pt, group: 'spells',
      count: cantrips, options: classSpells([cls.key], 0, 0).map(spellOption),
    });
    const lists = cls.name === 'Bard' && level >= 10 ? [cls.key, LIST_CLASS.cleric, LIST_CLASS.druid, LIST_CLASS.wizard] : [cls.key];
    take({
      id: 'spells:prepared', area: 'spells', label: `Magias preparadas do ${cls.pt}`, source: cls.pt, group: 'spells',
      count: colNum(cls, 'Prepared Spells', level), options: classSpells(lists, 1, Math.min(max, 9)).map(spellOption),
    });
  }
  if (cls.name === 'Warlock') {
    for (const [lvl, spellLevel] of [[11, 6], [13, 7], [15, 8], [17, 9]] as const) {
      if (level < lvl) continue;
      take({ id: `spells:arcanum-${spellLevel}`, area: 'spells', label: `Mystic Arcanum (${spellLevel}º círculo)`, source: `${cls.pt}, nível ${lvl}`, group: 'spells', count: 1, options: classSpells([cls.key], spellLevel, spellLevel).map(spellOption) });
    }
  }
  if (subclass?.name === 'College of Lore' && level >= 6) {
    take({
      id: 'subclass:magical-discoveries', area: 'spells', label: 'Magical Discoveries', source: `${subclass.pt}, nível 6`, group: 'spells', count: 2,
      options: classSpells([LIST_CLASS.cleric, LIST_CLASS.druid, LIST_CLASS.wizard], 0, max).map(spellOption),
    });
  }
  for (const f of resolvedFeats) {
    if (f.warrior) {
      take({ id: `feat:${f.slot.id}:warrior-cantrips`, area: 'spells', label: `${WARRIOR_OPTIONS[cls.name].name.replace(/ \(.*/, '')}: truques`, source: f.slot.label, group: 'spells', count: 2, options: classSpells([LIST_CLASS[f.warrior]], 0, 0).map(spellOption) });
    }
    if (f.feat?.name !== 'Magic Initiate') continue;
    const id = `feat:${f.slot.id}`;
    const usedLists = resolvedFeats
      .filter((o) => o !== f && o.feat?.name === 'Magic Initiate')
      .map((o) => (o.slot.fixedList ?? resolved[`feat:${o.slot.id}:mi-list`]?.[0]) as SpellList | undefined)
      .filter(Boolean);
    const list = (f.slot.fixedList ?? one({
      id: `${id}:mi-list`, area: 'feats', label: `Magic Initiate (${f.slot.label}): lista`, source: f.slot.label, count: 1,
      options: SPELL_LISTS.map((l) => ({ value: l, label: LIST_PT[l], disabled: usedLists.includes(l) ? 'lista já usada em outro Magic Initiate' : undefined })),
    })) as SpellList | undefined;
    take({ id: `${id}:mi-ability`, area: 'feats', label: `Magic Initiate (${f.slot.label}): atributo`, source: f.slot.label, count: 1, options: (['int', 'wis', 'cha'] as AbilityKey[]).map((a) => ({ value: a, label: abilityLabel(a) })) });
    if (list) {
      take({ id: `${id}:mi-cantrips`, area: 'spells', label: `Magic Initiate (${LIST_PT[list]}): truques`, source: f.slot.label, group: 'spells', count: 2, options: classSpells([LIST_CLASS[list]], 0, 0).map(spellOption) });
      take({ id: `${id}:mi-spell`, area: 'spells', label: `Magic Initiate (${LIST_PT[list]}): magia de nível 1`, source: f.slot.label, group: 'spells', count: 1, options: classSpells([LIST_CLASS[list]], 1, 1).map(spellOption) });
    }
  }

  return {
    slots, picks: resolved, issues, taken, feats: resolvedFeats, scoresBeforeFeats, scores,
    skills, expertise, tools, languages, features, armorTraining, martialWeapons,
    equipment: { cls: clsPkg, bg: bgPkg }, granted,
  };
}

/** Estado de uma opção para quem está escolhendo. */
export function optionState(slot: ChoiceSlot, resolution: Resolution, valid: string[], value: string) {
  const opt = slot.options.find((o) => o.value === value)!;
  const selected = valid.includes(value);
  const group = opt.group ?? slot.group;
  const takenBy = !selected && group ? resolution.taken[group]?.[value] : undefined;
  const full = !selected && valid.length >= slot.count && slot.count > 1;
  const reason = opt.disabled ?? (takenBy ? `já vem de ${takenBy}` : undefined);
  return { opt, selected, takenBy, full, reason, blocked: !selected && (!!reason || full) };
}

/**
 * Tira as escolhas que deixaram de valer (trocou de classe, baixou o nível, desmarcou a perícia de uma
 * Expertise…). Repete até estabilizar, porque um espaço pode depender de outro.
 */
export function prunePicks(c: Character): Character {
  const clean = (p: Record<string, string[]>) =>
    Object.fromEntries(Object.entries(p).filter(([, v]) => v.length).sort(([a], [b]) => a.localeCompare(b)));
  let current = c;
  for (let i = 0; i < 4; i++) {
    const next = clean(resolveChoices(current).picks);
    if (JSON.stringify(next) === JSON.stringify(clean(current.picks))) return current;
    current = { ...current, picks: next };
  }
  return current;
}

/** Modificadores dos valores. */
export const mods = (scores: Scores) => Object.fromEntries(ABILITIES.map((a) => [a.key, modifier(scores[a.key])])) as Scores;
