// Fichas salvas pela versão anterior (escolhas soltas) continuam abrindo e viram escolhas por regra.
import { describe, expect, it } from 'vitest';
import { normalizeCharacter, computeSheet } from './character';
import { classKey, bgKey, resolve, spellKey, speciesKey, weaponKey } from './testkit';

describe('Migração de fichas antigas', () => {
  const legacy = {
    id: 'velha',
    name: 'Antiga',
    level: 2,
    classKey: classKey('Rogue'),
    speciesKey: speciesKey('Elf'),
    backgroundKey: bgKey('Criminal'),
    baseScores: { str: 10, dex: 16, con: 12, int: 13, wis: 11, cha: 9 },
    classSkills: ['acrobatics', 'perception', 'insight', 'investigation'],
    extraSkills: ['survival', 'arcana'],
    expertise: ['stealth', 'perception', 'history'],
    spellKeys: [spellKey('Fire Bolt')],
    weaponKeys: [weaponKey('Rapier')],
    languages: 'Common, Elvish',
    tools: 'Dice',
    speciesNotes: 'Wood Elf',
  };

  it('põe cada escolha antiga no espaço da regra que a aceita', () => {
    const c = normalizeCharacter(legacy as never);
    const r = resolve(c);
    expect(r.picks['class-skills']).toEqual(['acrobatics', 'perception', 'insight', 'investigation']);
    // Elfo: Keen Senses aceita Survival; Arcana não tem para onde ir e é descartada
    expect(r.picks['species:keen-senses']).toEqual(['survival']);
    // Ladino 2: 2 Expertises; History não é proficiente e fica de fora
    expect(r.picks['class:expertise-1']).toEqual(['stealth', 'perception']);
  });

  it('não perde o que estava em texto: vai para as notas', () => {
    const c = normalizeCharacter(legacy as never);
    expect(c.notes).toContain('Espécie: Wood Elf');
    expect(c.notes).toContain('Idiomas (versão antiga): Common, Elvish');
    expect(c.notes).toContain('Ferramentas (versão antiga): Dice');
  });

  it('armas soltas viram compras, e a ficha avisa se passar do ouro', () => {
    const c = normalizeCharacter(legacy as never);
    expect(c.purchases).toHaveLength(1);
    const s = computeSheet(c);
    expect(s.attacks.some((a) => a.key === weaponKey('Rapier'))).toBe(true);
    expect(s.warnings.some((w) => w.text.startsWith('As compras custam'))).toBe(true);
  });

  it('descobre o método de atributos pelos valores', () => {
    expect(normalizeCharacter(legacy as never).abilityMethod).toBe('random');
    expect(normalizeCharacter({ ...legacy, baseScores: { str: 8, dex: 15, con: 13, int: 14, wis: 12, cha: 10 } } as never).abilityMethod).toBe('standard');
  });

  it('ficha nova continua igual depois de salvar e abrir de novo', () => {
    const c = normalizeCharacter(legacy as never);
    expect(normalizeCharacter(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });
});
