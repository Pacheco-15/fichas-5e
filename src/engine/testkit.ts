// Ajudas para os testes de regras: montar personagens e fazer escolhas pelo nome.
import { BACKGROUNDS, CLASSES, FEATS, SPECIES, WEAPONS, type AbilityKey } from '../data/rules';
import { ITEMS } from '../data/equipment';
import { spellByName } from '../data/features';
import { computeSheet, newCharacter, type Character } from './character';
import { resolveChoices } from './choices';

export const classKey = (name: string) => CLASSES.find((c) => c.name === name)!.key;
export const subKey = (name: string) => CLASSES.flatMap((c) => c.subclasses).find((s) => s.name === name)!.key;
export const speciesKey = (name: string) => SPECIES.find((s) => s.name === name)!.key;
export const bgKey = (name: string) => BACKGROUNDS.find((b) => b.name === name)!.key;
export const featKey = (name: string) => FEATS.find((f) => f.name === name)!.key;
export const spellKey = (name: string) => spellByName(name)!.key;
export const weaponKey = (name: string) => WEAPONS.find((w) => w.name === name)!.key;
export const itemKey = (name: string) => ITEMS.find((i) => i.name === name)!.key;

export interface Make extends Partial<Character> {
  cls?: string;
  sub?: string;
  species?: string;
  bg?: string;
}

/** Personagem válido por padrão (Humano Soldado), com as trocas pedidas. */
export function make({ cls, sub, species, bg, ...patch }: Make = {}): Character {
  return {
    ...newCharacter(),
    ...(cls && { classKey: classKey(cls) }),
    ...(sub && { subclassKey: subKey(sub) }),
    ...(species && { speciesKey: speciesKey(species) }),
    ...(bg && { backgroundKey: bgKey(bg) }),
    ...patch,
  };
}

export const withPicks = (c: Character, picks: Record<string, string[]>): Character => ({ ...c, picks: { ...c.picks, ...picks } });

export const withFeat = (c: Character, slot: string, name: string | null, abilities: AbilityKey[] = []): Character => ({
  ...c,
  feats: { ...c.feats, [slot]: { featKey: name && (FEATS.find((f) => f.name === name)?.key ?? name), abilities } },
});

export const resolve = (c: Character) => resolveChoices(c);
export const sheet = (c: Character) => computeSheet(c);
export const slot = (c: Character, id: string) => resolveChoices(c).slots.find((s) => s.id === id);
export const slotIds = (c: Character) => resolveChoices(c).slots.map((s) => s.id);
export const picked = (c: Character, id: string) => resolveChoices(c).picks[id] ?? [];
export const warnings = (c: Character) => computeSheet(c).warnings.map((w) => w.text);
