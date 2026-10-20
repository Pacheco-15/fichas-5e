// Testes das regras de criação do SRD 5.2.1. Cada teste cita o código da regra em docs/REGRAS.md.
import { describe, expect, it } from 'vitest';
import { proficiencyBonus, modifier, SKILLS } from '../data/rules';
import { STANDARD_LANGUAGES } from '../data/equipment';
import { baseScoresProblem, backgroundBonusProblem, pointBuyCost } from './choices';
import {
  bgKey, featKey, itemKey, make, picked, resolve, sheet, slot, slotIds, spellKey, warnings, weaponKey, withFeat, withPicks,
} from './testkit';

const bard = (level = 1) => make({ cls: 'Bard', level, bg: 'Acolyte' });

/* ---------------- 1. Classe e nível ---------------- */

describe('1. Classe e nível', () => {
  it('R-NIV-1: o nível fica entre 1 e 20', () => {
    expect(sheet(make({ level: 0 })).hitDice).toBe('1d10');
    expect(sheet(make({ level: 25 })).hitDice).toBe('20d10');
  });

  it('R-NIV-2: subclasse só a partir do nível 3, e obrigatória a partir dele', () => {
    expect(sheet(make({ level: 2, sub: 'Champion' })).subclass).toBeUndefined();
    expect(sheet(make({ level: 3, sub: 'Champion' })).subclass?.name).toBe('Champion');
    expect(warnings(make({ level: 3 }))).toContain('Escolha uma subclasse (nível 3+).');
    expect(warnings(make({ level: 2 }))).not.toContain('Escolha uma subclasse (nível 3+).');
  });

  it('R-NIV-3: bônus de proficiência por nível', () => {
    const expected = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];
    expected.forEach((pb, i) => expect(proficiencyBonus(i + 1)).toBe(pb));
  });

  it('R-NIV-4: recursos vêm da tabela da classe no nível atual', () => {
    const rogue5 = sheet(make({ cls: 'Rogue', level: 5 }));
    expect(rogue5.resources.find((r) => /Sneak|Furtivo/i.test(r.name))?.value).toBe('3d6');
    const barb1 = sheet(make({ cls: 'Barbarian', level: 1 }));
    expect(barb1.resources.find((r) => /^Rages$|^Fúrias$/i.test(r.name))?.value).toBe('2');
  });
});

/* ---------------- 2. Origem ---------------- */

describe('2. Antecedente', () => {
  const soldier = ['str', 'dex', 'con'] as const;

  it('R-ANT-1: só +2/+1 ou +1/+1/+1 entre os atributos do antecedente', () => {
    expect(backgroundBonusProblem({ str: 2, dex: 1 }, [...soldier])).toBeNull();
    expect(backgroundBonusProblem({ str: 1, dex: 1, con: 1 }, [...soldier])).toBeNull();
    expect(backgroundBonusProblem({ str: 2, dex: 2 }, [...soldier])).not.toBeNull();
    expect(backgroundBonusProblem({ str: 3 }, [...soldier])).not.toBeNull();
    expect(backgroundBonusProblem({ str: 2, dex: 1, con: 1 }, [...soldier])).not.toBeNull();
    expect(backgroundBonusProblem({ int: 1 }, [...soldier])).not.toBeNull();
    expect(backgroundBonusProblem({ str: 1.5 }, [...soldier])).not.toBeNull();
  });

  it('R-ANT-1: combinação inválida não entra na ficha', () => {
    const s = sheet(make({ backgroundBonus: { str: 2, dex: 2 } }));
    expect(s.scores.str).toBe(15);
    expect(s.scores.dex).toBe(14);
    expect(s.warnings.some((w) => w.text.startsWith('Bônus do antecedente inválido'))).toBe(true);
  });

  it('R-ANT-2: o bônus do antecedente não passa de 20', () => {
    const s = sheet(make({ abilityMethod: 'random', baseScores: { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, backgroundBonus: { str: 2, dex: 1 } }));
    expect(s.scores.str).toBe(20);
    const s2 = sheet(make({ abilityMethod: 'random', baseScores: { str: 19, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, backgroundBonus: { str: 2, dex: 1 } }));
    expect(s2.scores.str).toBe(20); // 19 na base já é inválido na rolagem (aviso), e o +2 para em 20
    expect(s2.warnings.some((w) => w.text.startsWith('Valores base inválidos'))).toBe(true);
  });

  it('R-ANT-3: o feat do antecedente é fixo; Acólito e Sábio fixam a lista do Magic Initiate', () => {
    const r = resolve(make({ bg: 'Acolyte' }));
    expect(r.feats.find((f) => f.slot.id === 'background')?.feat?.name).toBe('Magic Initiate');
    expect(r.slots.some((s) => s.id === 'feat:background:mi-list')).toBe(false);
    expect(slot(make({ bg: 'Acolyte' }), 'feat:background:mi-cantrips')?.label).toContain('Clérigo');
    expect(slot(make({ bg: 'Sage' }), 'feat:background:mi-cantrips')?.label).toContain('Mago');
    // trocar o feat do antecedente na ficha salva não tem efeito
    expect(resolve(withFeat(make({ bg: 'Criminal' }), 'background', 'Skilled')).feats[0].feat?.name).toBe('Alert');
  });

  it('R-ANT-4: perícias do antecedente fixas e ferramenta (Soldado escolhe Gaming Set)', () => {
    const r = resolve(make({ bg: 'Criminal' }));
    expect([...r.skills]).toEqual(expect.arrayContaining(['sleightOfHand', 'stealth']));
    expect(r.tools).toContain("Thieves' Tools");
    const soldierTool = slot(make({ bg: 'Soldier' }), 'background:tool')!;
    expect(soldierTool.count).toBe(1);
    expect(soldierTool.options.every((o) => o.value.startsWith('Gaming Set'))).toBe(true);
    expect(picked(withPicks(make(), { 'background:tool': ['Lute'] }), 'background:tool')).toEqual([]);
  });

  it('R-ANT-5: equipamento do antecedente é o pacote A ou 50 GP', () => {
    for (const bg of ['Acolyte', 'Criminal', 'Sage', 'Soldier']) {
      const s = slot(make({ bg }), 'equipment:background')!;
      expect(s.count).toBe(1);
      expect(s.options.map((o) => o.value)).toEqual(['A', 'B']);
      const gold = sheet(withPicks(make({ bg }), { 'equipment:background': ['B'] })).gold.total;
      expect(gold).toBe(0 + 50);
    }
    // escolher A e B ao mesmo tempo: só o primeiro vale
    expect(picked(withPicks(make(), { 'equipment:background': ['A', 'B'] }), 'equipment:background')).toEqual(['A']);
  });
});

describe('2. Espécie', () => {
  it('R-ESP-1: cada escolha da espécie é obrigatória', () => {
    expect(warnings(make({ species: 'Elf' })).some((w) => w.startsWith('Escolha da espécie'))).toBe(true);
    const ok = make({ species: 'Elf', speciesChoices: { 'Elven Lineage': 'Drow', 'Elven Lineage:ability': 'wis' } });
    expect(warnings(ok).some((w) => w.startsWith('Escolha da espécie'))).toBe(false);
  });

  it('R-ESP-2: Humano ganha 1 perícia qualquer (Skillful)', () => {
    const s = slot(make({ species: 'Human' }), 'species:skillful')!;
    expect(s.count).toBe(1);
    expect(s.options).toHaveLength(18);
    expect(slot(make({ species: 'Dwarf' }), 'species:skillful')).toBeUndefined();
  });

  it('R-ESP-3: Humano ganha 1 feat de origem (Versatile)', () => {
    const human = resolve(make({ species: 'Human' })).feats.find((f) => f.slot.id === 'human')!;
    expect(human.slot.allowed).toEqual(['Origin']);
    expect(human.options.every((o) => o.desc === 'Origin')).toBe(true);
    expect(resolve(make({ species: 'Dwarf' })).feats.some((f) => f.slot.id === 'human')).toBe(false);
  });

  it('R-ESP-4: Elfo escolhe só entre Insight, Perception e Survival (Keen Senses)', () => {
    const elf = make({ species: 'Elf' });
    expect(slot(elf, 'species:keen-senses')!.options.map((o) => o.value)).toEqual(['insight', 'perception', 'survival']);
    expect(picked(withPicks(elf, { 'species:keen-senses': ['arcana'] }), 'species:keen-senses')).toEqual([]);
    expect(picked(withPicks(elf, { 'species:keen-senses': ['perception'] }), 'species:keen-senses')).toEqual(['perception']);
  });

  it('R-ESP-5: magias da espécie chegam nos níveis 1, 3 e 5 e não contam como preparadas', () => {
    const drow = (level: number) => make({ cls: 'Wizard', level, species: 'Elf', speciesChoices: { 'Elven Lineage': 'Drow', 'Elven Lineage:ability': 'int' } });
    const names = (level: number) => resolve(drow(level)).granted.map((g) => g.spell.name);
    expect(names(1)).toEqual(['Dancing Lights']);
    expect(names(3)).toEqual(['Dancing Lights', 'Faerie Fire']);
    expect(names(5)).toEqual(['Dancing Lights', 'Faerie Fire', 'Darkness']);
    // Faerie Fire já vem da espécie: não pode ser escolhida de novo nas preparadas
    const c = withPicks(drow(3), { 'spells:prepared': [spellKey('Faerie Fire')] });
    expect(picked(c, 'spells:prepared')).toEqual([]);
    const tiefling = resolve(make({ species: 'Tiefling', speciesChoices: { 'Fiendish Legacy': 'Infernal', 'Fiendish Legacy:ability': 'cha' } }));
    expect(tiefling.granted.map((g) => g.spell.name)).toEqual(expect.arrayContaining(['Fire Bolt', 'Thaumaturgy']));
  });

  it('R-ESP-6: deslocamento da espécie (Elfo da Floresta 35, Golias 35)', () => {
    expect(sheet(make({ species: 'Human' })).speed).toBe(30);
    expect(sheet(make({ species: 'Goliath' })).speed).toBe(35);
    expect(sheet(make({ species: 'Elf', speciesChoices: { 'Elven Lineage': 'Wood Elf' } })).speed).toBe(35);
  });

  it('R-ESP-7: Anão ganha +1 PV por nível', () => {
    const human = sheet(make({ level: 5 })).hpMax;
    expect(sheet(make({ level: 5, species: 'Dwarf' })).hpMax).toBe(human + 5);
  });
});

describe('2. Idiomas', () => {
  it('R-IDI-1: Common e mais 2 idiomas padrão', () => {
    const c = make();
    const s = slot(c, 'origin:languages')!;
    expect(s.count).toBe(2);
    expect(s.options.map((o) => o.value)).toEqual(STANDARD_LANGUAGES);
    expect(resolve(c).languages).toContain('Common');
    expect(picked(withPicks(c, { 'origin:languages': ['Elvish', 'Abyssal', 'Dwarvish', 'Orc'] }), 'origin:languages')).toEqual(['Elvish', 'Dwarvish']);
  });

  it('R-IDI-2: o mesmo idioma não é aprendido duas vezes', () => {
    const c = withPicks(make({ cls: 'Rogue' }), { 'origin:languages': ['Elvish', 'Dwarvish'], 'class:thieves-cant': ['Elvish'] });
    expect(picked(c, 'class:thieves-cant')).toEqual([]);
    expect(picked(withPicks(make(), { 'origin:languages': ['Elvish', 'Elvish'] }), 'origin:languages')).toEqual(['Elvish']);
  });

  it("R-IDI-3: Thieves' Cant (Ladino), Deft Explorer (Patrulheiro 2) e Druidic (Druida)", () => {
    const rogue = resolve(make({ cls: 'Rogue' }));
    expect(rogue.languages).toContain("Thieves' Cant");
    expect(rogue.slots.find((s) => s.id === 'class:thieves-cant')?.count).toBe(1);
    expect(slot(make({ cls: 'Ranger', level: 1 }), 'class:deft-explorer-languages')).toBeUndefined();
    expect(slot(make({ cls: 'Ranger', level: 2 }), 'class:deft-explorer-languages')?.count).toBe(2);
    expect(resolve(make({ cls: 'Druid' })).languages).toContain('Druidic');
  });
});

/* ---------------- 3. Atributos ---------------- */

describe('3. Atributos', () => {
  const sc = (str: number, dex: number, con: number, int: number, wis: number, cha: number) => ({ str, dex, con, int, wis, cha });

  it('R-ATR-1: conjunto padrão é 15, 14, 13, 12, 10, 8 em qualquer ordem', () => {
    expect(baseScoresProblem('standard', sc(8, 10, 12, 13, 14, 15))).toBeNull();
    expect(baseScoresProblem('standard', sc(15, 15, 13, 12, 10, 8))).not.toBeNull();
    expect(baseScoresProblem('standard', sc(16, 14, 13, 12, 10, 8))).not.toBeNull();
  });

  it('R-ATR-2: compra de pontos de 8 a 15 e até 27 pontos', () => {
    expect(pointBuyCost(sc(15, 15, 15, 8, 8, 8))).toBe(27);
    expect(baseScoresProblem('pointbuy', sc(15, 15, 15, 8, 8, 8))).toBeNull();
    expect(baseScoresProblem('pointbuy', sc(8, 8, 8, 8, 8, 8))).toBeNull();
    expect(baseScoresProblem('pointbuy', sc(15, 15, 15, 9, 8, 8))).not.toBeNull();
    expect(baseScoresProblem('pointbuy', sc(16, 8, 8, 8, 8, 8))).not.toBeNull();
    expect(baseScoresProblem('pointbuy', sc(7, 8, 8, 8, 8, 8))).not.toBeNull();
  });

  it('R-ATR-3: rolagem de 3 a 18', () => {
    expect(baseScoresProblem('random', sc(3, 18, 10, 10, 10, 10))).toBeNull();
    expect(baseScoresProblem('random', sc(2, 10, 10, 10, 10, 10))).not.toBeNull();
    expect(baseScoresProblem('random', sc(19, 10, 10, 10, 10, 10))).not.toBeNull();
  });

  it('R-ATR-4: modificador = (valor − 10) ÷ 2 para baixo', () => {
    expect([1, 3, 8, 9, 10, 11, 12, 15, 20, 30].map(modifier)).toEqual([-5, -4, -1, -1, 0, 0, 1, 2, 5, 10]);
  });
});

/* ---------------- 4. Perícias ---------------- */

describe('4. Perícias e especialização', () => {
  it('R-PER-1: perícias da classe na quantidade e na lista certas', () => {
    expect(slot(make({ cls: 'Fighter' }), 'class-skills')).toMatchObject({ count: 2 });
    expect(slot(make({ cls: 'Fighter' }), 'class-skills')!.options).toHaveLength(9);
    expect(slot(make({ cls: 'Rogue' }), 'class-skills')).toMatchObject({ count: 4 });
    expect(slot(bard(), 'class-skills')!.options).toHaveLength(18);
    const tooMany = withPicks(make({ cls: 'Fighter', bg: 'Sage' }), { 'class-skills': ['acrobatics', 'insight', 'perception'] });
    expect(picked(tooMany, 'class-skills')).toEqual(['acrobatics', 'insight']);
    const offList = withPicks(make({ cls: 'Fighter', bg: 'Sage' }), { 'class-skills': ['stealth', 'acrobatics'] });
    expect(picked(offList, 'class-skills')).toEqual(['acrobatics']);
  });

  it('R-PER-2: perícia que já veio de outra fonte não conta de novo', () => {
    // Soldado já dá Athletics
    const c = withPicks(make({ cls: 'Fighter', bg: 'Soldier' }), { 'class-skills': ['athletics', 'perception'] });
    expect(picked(c, 'class-skills')).toEqual(['perception']);
    const human = withPicks(make({ species: 'Human' }), { 'class-skills': ['perception', 'insight'], 'species:skillful': ['perception'] });
    expect(picked(human, 'species:skillful')).toEqual([]);
  });

  it('R-PER-3: Primal Knowledge no nível 3, só da lista do Bárbaro', () => {
    expect(slot(make({ cls: 'Barbarian', level: 2 }), 'class:primal-knowledge')).toBeUndefined();
    const s = slot(make({ cls: 'Barbarian', level: 3 }), 'class:primal-knowledge')!;
    expect(s.options.map((o) => o.value).sort()).toEqual(['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'].sort());
  });

  it('R-PER-4: Colégio do Conhecimento dá 3 perícias quaisquer no nível 3', () => {
    expect(slot(make({ cls: 'Bard', level: 3, sub: 'College of Lore' }), 'subclass:bonus-proficiencies')).toMatchObject({ count: 3 });
  });

  it('R-PER-5: Skilled dá 3 perícias ou ferramentas, em qualquer combinação', () => {
    const c = withFeat(make({ species: 'Human' }), 'human', 'Skilled');
    const s = slot(c, 'feat:human:skilled')!;
    expect(s.count).toBe(3);
    const mixed = withPicks(c, { 'feat:human:skilled': ['arcana', "Smith's Tools", 'history', 'nature'] });
    expect(picked(mixed, 'feat:human:skilled')).toEqual(['arcana', "Smith's Tools", 'history']);
    expect(resolve(mixed).tools).toContain("Smith's Tools");
  });

  it('R-PER-6: Expertise só em perícia proficiente e sem repetir', () => {
    const rogue = withPicks(make({ cls: 'Rogue', bg: 'Criminal' }), {
      'class-skills': ['acrobatics', 'athletics', 'insight', 'perception'],
      'class:expertise-1': ['stealth', 'arcana', 'stealth', 'perception'],
    });
    expect(picked(rogue, 'class:expertise-1')).toEqual(['stealth', 'perception']);
  });

  it('R-PER-7: quantidade de Expertise por classe e nível', () => {
    const count = (cls: string, level: number) =>
      resolve(make({ cls, level })).slots.filter((s) => s.group === 'expertise').reduce((n, s) => n + s.count, 0);
    expect([count('Rogue', 1), count('Rogue', 5), count('Rogue', 6)]).toEqual([2, 2, 4]);
    expect([count('Bard', 1), count('Bard', 2), count('Bard', 9)]).toEqual([0, 2, 4]);
    expect([count('Ranger', 1), count('Ranger', 2), count('Ranger', 9)]).toEqual([0, 1, 3]);
    expect([count('Wizard', 1), count('Wizard', 2)]).toEqual([0, 1]);
    expect(count('Fighter', 20)).toBe(0);
  });

  it('R-PER-8: Scholar só em Arcana, History, Investigation, Medicine, Nature ou Religion', () => {
    const c = withPicks(make({ cls: 'Wizard', level: 2, bg: 'Criminal' }), { 'class-skills': ['arcana', 'insight'] });
    expect(slot(c, 'class:scholar')!.options.map((o) => o.value)).toEqual(['arcana']);
    expect(picked(withPicks(c, { 'class:scholar': ['stealth'] }), 'class:scholar')).toEqual([]);
  });

  it('R-PER-9: Expertise dobra a proficiência', () => {
    const s = sheet(withPicks(make({ cls: 'Rogue', bg: 'Criminal' }), { 'class:expertise-1': ['stealth'] }));
    const stealth = s.skills.find((k) => k.key === 'stealth')!;
    expect(stealth.bonus).toBe(s.mods.dex + 2 * s.pb);
  });

  it('R-PER-10: Jack of All Trades (Bardo 2) soma metade da proficiência sem proficiência', () => {
    const s1 = sheet(bard(1));
    const s2 = sheet(bard(2));
    const arcana = (s: typeof s1) => s.skills.find((k) => k.key === 'athletics')!.bonus - s.mods.str;
    expect(arcana(s1)).toBe(0);
    expect(arcana(s2)).toBe(1);
  });

  it('R-PER-11: Percepção passiva = 10 + Percepção', () => {
    const s = sheet(withPicks(make(), { 'class-skills': ['perception', 'insight'] }));
    expect(s.passivePerception).toBe(10 + s.skills.find((k) => k.key === 'perception')!.bonus);
  });
});

/* ---------------- 5. Salvaguardas ---------------- */

describe('5. Salvaguardas', () => {
  const prof = (c: ReturnType<typeof make>) => sheet(c).saves.filter((s) => s.proficient).map((s) => s.key);

  it('R-SAL-1: 2 salvaguardas da classe', () => {
    expect(prof(make({ cls: 'Fighter' }))).toEqual(['str', 'con']);
    expect(prof(make({ cls: 'Wizard' }))).toEqual(['int', 'wis']);
  });
  it('R-SAL-2: Monge 14 é proficiente em todas', () => {
    expect(prof(make({ cls: 'Monk', level: 13 }))).toHaveLength(2);
    expect(prof(make({ cls: 'Monk', level: 14 }))).toHaveLength(6);
  });
  it('R-SAL-3: Ladino 15 ganha Sabedoria e Carisma', () => {
    expect(prof(make({ cls: 'Rogue', level: 15 }))).toEqual(['dex', 'int', 'wis', 'cha']);
  });
});

/* ---------------- 6. Feats ---------------- */

describe('6. Feats', () => {
  const feat = (c: ReturnType<typeof make>, slotId: string) => resolve(c).feats.find((f) => f.slot.id === slotId);
  const option = (c: ReturnType<typeof make>, slotId: string, name: string) => feat(c, slotId)!.options.find((o) => o.value === featKey(name));

  it('R-FEA-1: feat não repetível só uma vez (Criminoso já dá Alert)', () => {
    const c = withFeat(make({ species: 'Human', bg: 'Criminal' }), 'human', 'Alert');
    expect(option(c, 'human', 'Alert')!.disabled).toBeTruthy();
    expect(feat(c, 'human')!.feat).toBeUndefined();
    // ASI e Skilled são repetíveis
    const asi = withFeat(withFeat(make({ level: 8 }), 'feat-4', 'Ability Score Improvement', ['str', 'str']), 'feat-6', 'Ability Score Improvement', ['con', 'con']);
    expect(feat(asi, 'feat-6')!.feat?.name).toBe('Ability Score Improvement');
    const skilled = withFeat(withFeat(make({ species: 'Human', level: 4 }), 'human', 'Skilled'), 'feat-4', 'Skilled');
    expect(feat(skilled, 'feat-4')!.feat?.name).toBe('Skilled');
  });

  it('R-FEA-2: pré-requisitos dos feats', () => {
    // espaço de origem não oferece feats gerais
    expect(feat(make({ species: 'Human' }), 'human')!.options.some((o) => o.value === featKey('Grappler'))).toBe(false);
    // Grappler pede FOR ou DES 13+
    const weak = make({ cls: 'Wizard', level: 4, abilityMethod: 'random', baseScores: { str: 8, dex: 12, con: 14, int: 15, wis: 12, cha: 10 }, backgroundBonus: { con: 2, int: 1 }, bg: 'Sage' });
    expect(option(weak, 'feat-4', 'Grappler')!.disabled).toMatch(/13/);
    expect(option(make({ level: 4 }), 'feat-4', 'Grappler')!.disabled).toBeUndefined();
    // Boon of Spell Recall pede Spellcasting
    expect(option(make({ cls: 'Fighter', level: 19 }), 'feat-19', 'Boon of Spell Recall')!.disabled).toBeTruthy();
    expect(option(make({ cls: 'Wizard', level: 19 }), 'feat-19', 'Boon of Spell Recall')!.disabled).toBeUndefined();
    // Fighting Style pede a característica
    expect(option(make({ cls: 'Wizard', level: 4 }), 'feat-4', 'Archery')!.disabled).toBeTruthy();
    expect(option(make({ cls: 'Fighter', level: 4 }), 'feat-4', 'Archery')!.disabled).toBeUndefined();
  });

  it('R-FEA-3: no ASI vale qualquer feat que você cumpra; no 19, também Epic Boon', () => {
    const asi = feat(make({ level: 4 }), 'feat-4')!;
    expect(asi.slot.allowed).toEqual(expect.arrayContaining(['General', 'Origin', 'Fighting Style']));
    expect(asi.slot.allowed).not.toContain('Epic Boon');
    expect(feat(make({ level: 19 }), 'feat-19')!.slot.allowed).toContain('Epic Boon');
    const levels = (cls: string) => resolve(make({ cls, level: 20 })).feats.filter((f) => f.slot.id.startsWith('feat-')).map((f) => f.slot.level);
    expect(levels('Fighter')).toEqual([4, 6, 8, 12, 14, 16, 19]);
    expect(levels('Rogue')).toEqual([4, 8, 10, 12, 16, 19]);
    expect(levels('Wizard')).toEqual([4, 8, 12, 16, 19]);
    // Alert (origem) num ASI
    const c = withFeat(make({ level: 4, bg: 'Sage' }), 'feat-4', 'Alert');
    expect(feat(c, 'feat-4')!.feat?.name).toBe('Alert');
  });

  it('R-FEA-4: ASI +2 num ou +1 em dois, até 20', () => {
    const base = { abilityMethod: 'random' as const, baseScores: { str: 17, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, backgroundBonus: { str: 2, dex: 1 } };
    const c = withFeat(make({ level: 4, ...base }), 'feat-4', 'Ability Score Improvement', ['str', 'str']);
    expect(sheet(c).scores.str).toBe(20); // 17 + 2 + 1 → para em 20
    const three = withFeat(make({ level: 4 }), 'feat-4', 'Ability Score Improvement', ['str', 'dex', 'con']);
    const s = sheet(three);
    expect(s.scores.con).toBe(13); // só 2 pontos
  });

  it('R-FEA-5: Grappler só aumenta Força ou Destreza', () => {
    const c = withFeat(make({ level: 4 }), 'feat-4', 'Grappler', ['cha']);
    expect(sheet(c).scores.cha).toBe(8);
    const ok = withFeat(make({ level: 4 }), 'feat-4', 'Grappler', ['dex']);
    expect(sheet(ok).scores.dex).toBe(15);
  });

  it('R-FEA-6: Epic Boon pode levar o atributo até 30', () => {
    const base = { abilityMethod: 'random' as const, baseScores: { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, backgroundBonus: { str: 2, dex: 1 } };
    const c = withFeat(make({ level: 19, ...base }), 'feat-19', 'Boon of Combat Prowess', ['str']);
    expect(sheet(c).scores.str).toBe(21);
  });

  it('R-FEA-7: Fighting Style por classe e nível; alternativas de Paladino e Patrulheiro', () => {
    const styles = (cls: string, level: number, sub?: string) => resolve(make({ cls, level, sub })).feats.filter((f) => f.slot.id.startsWith('style-')).map((f) => f.slot.level);
    expect(styles('Fighter', 1)).toEqual([1]);
    expect(styles('Paladin', 1)).toEqual([]);
    expect(styles('Paladin', 2)).toEqual([2]);
    expect(styles('Ranger', 2)).toEqual([2]);
    expect(styles('Fighter', 7, 'Champion')).toEqual([1, 7]);
    expect(styles('Wizard', 20)).toEqual([]);
    const pal = withFeat(make({ cls: 'Paladin', level: 2 }), 'style-2', 'blessed-warrior');
    expect(slot(pal, 'feat:style-2:warrior-cantrips')).toMatchObject({ count: 2 });
    expect(slot(pal, 'feat:style-2:warrior-cantrips')!.options.some((o) => o.value === spellKey('Sacred Flame'))).toBe(true);
    expect(feat(withFeat(make({ cls: 'Fighter' }), 'style-1', 'blessed-warrior'), 'style-1')!.warrior).toBeUndefined();
  });

  it('R-FEA-8: Magic Initiate: lista, atributo, 2 truques e 1 magia de nível 1, e outra lista se repetir', () => {
    const c = withFeat(make({ species: 'Human', bg: 'Acolyte' }), 'human', 'Magic Initiate');
    const list = slot(c, 'feat:human:mi-list')!;
    expect(list.options.find((o) => o.value === 'cleric')!.disabled).toBeTruthy(); // Acólito já usa Clérigo
    const wiz = withPicks(c, { 'feat:human:mi-list': ['wizard'] });
    expect(slot(wiz, 'feat:human:mi-cantrips')).toMatchObject({ count: 2 });
    expect(slot(wiz, 'feat:human:mi-spell')).toMatchObject({ count: 1 });
    const spells = withPicks(wiz, { 'feat:human:mi-spell': [spellKey('Cure Wounds'), spellKey('Magic Missile')] });
    expect(picked(spells, 'feat:human:mi-spell')).toEqual([spellKey('Magic Missile')]);
    expect(picked(withPicks(c, { 'feat:human:mi-list': ['cleric'] }), 'feat:human:mi-list')).toEqual([]);
  });

  it('R-FEA-9: Alert, Defense e Archery', () => {
    expect(sheet(make({ bg: 'Criminal' })).initiative).toBe(2 + 2);
    const armored = withPicks(make(), { 'equipment:class': ['A'] });
    const def = withFeat({ ...armored, armorKey: 'srd-2024_chain-mail' }, 'style-1', 'Defense');
    expect(sheet(def).ac).toBe(17);
    expect(sheet(withFeat(make(), 'style-1', 'Defense')).ac).toBe(12); // sem armadura, sem +1
    const archer = withFeat(withPicks(make(), { 'equipment:class': ['B'] }), 'style-1', 'Archery');
    const bow = sheet(archer).attacks.find((a) => a.key === weaponKey('Longbow'))!;
    expect(bow.bonus).toBe(2 + 2 + 2);
  });
});

/* ---------------- 7. Características de classe ---------------- */

describe('7. Escolhas das características de classe', () => {
  it('R-CLA-1: Divine Order: Protector dá armadura pesada e armas marciais; Thaumaturge +1 truque', () => {
    const cleric = make({ cls: 'Cleric', bg: 'Acolyte' });
    expect(slot(cleric, 'feature:divine-order')!.options.map((o) => o.value)).toEqual(['Protector', 'Thaumaturge']);
    const prot = resolve(withPicks(cleric, { 'feature:divine-order': ['Protector'] }));
    expect(prot.armorTraining.heavy).toBe(true);
    expect(prot.martialWeapons).toBe('all');
    expect(resolve(cleric).armorTraining.heavy).toBe(false);
    expect(slot(withPicks(cleric, { 'feature:divine-order': ['Thaumaturge'] }), 'spells:cantrips')!.count).toBe(3 + 1);
    expect(slot(cleric, 'spells:cantrips')!.count).toBe(3);
  });

  it('R-CLA-2: Primal Order: Magician +1 truque; Warden armadura média e armas marciais', () => {
    const druid = make({ cls: 'Druid' });
    expect(slot(withPicks(druid, { 'feature:primal-order': ['Magician'] }), 'spells:cantrips')!.count).toBe(3);
    const w = resolve(withPicks(druid, { 'feature:primal-order': ['Warden'] }));
    expect(w.armorTraining.medium).toBe(true);
    expect(w.martialWeapons).toBe('all');
  });

  it('R-CLA-3: uma opção para cada característica, no nível certo', () => {
    expect(slotIds(make({ cls: 'Cleric', level: 6 }))).not.toContain('feature:blessed-strikes');
    expect(slot(make({ cls: 'Cleric', level: 7 }), 'feature:blessed-strikes')!.count).toBe(1);
    expect(slot(make({ cls: 'Druid', level: 7 }), 'feature:elemental-fury')!.options).toHaveLength(2);
    expect(slot(make({ cls: 'Ranger', level: 3, sub: 'Hunter' }), 'feature:hunters-prey')!.options).toHaveLength(2);
    expect(slot(make({ cls: 'Ranger', level: 7, sub: 'Hunter' }), 'feature:defensive-tactics')).toBeDefined();
    expect(slot(make({ cls: 'Sorcerer', level: 6, sub: 'Draconic Sorcery' }), 'feature:elemental-affinity')!.options).toHaveLength(5);
    expect(slot(make({ cls: 'Druid', level: 3, sub: 'Circle of the Land' }), 'feature:land-type')!.options).toHaveLength(4);
    const two = withPicks(make({ cls: 'Cleric', level: 7 }), { 'feature:blessed-strikes': ['Divine Strike', 'Potent Spellcasting'] });
    expect(picked(two, 'feature:blessed-strikes')).toEqual(['Divine Strike']);
  });

  it('R-CLA-4: Metamagic 2 / 4 / 6 sem repetir', () => {
    const count = (level: number) => slot(make({ cls: 'Sorcerer', level }), 'class:metamagic')?.count ?? 0;
    expect([count(1), count(2), count(9), count(10), count(17)]).toEqual([0, 2, 2, 4, 6]);
    const c = withPicks(make({ cls: 'Sorcerer', level: 2 }), { 'class:metamagic': ['Quickened Spell', 'Quickened Spell', 'Twinned Spell', 'Careful Spell'] });
    expect(picked(c, 'class:metamagic')).toEqual(['Quickened Spell', 'Twinned Spell']);
  });

  it('R-CLA-5: Eldritch Invocations pela tabela, com nível e invocações exigidas', () => {
    const w1 = make({ cls: 'Warlock', level: 1 });
    expect(slot(w1, 'class:invocations')!.count).toBe(1);
    expect(slot(make({ cls: 'Warlock', level: 5 }), 'class:invocations')!.count).toBe(5);
    expect(slot(w1, 'class:invocations')!.options.find((o) => o.value === "Devil's Sight")!.disabled).toMatch(/2\+/);
    const smite = withPicks(make({ cls: 'Warlock', level: 5 }), { 'class:invocations': ['Eldritch Smite'] });
    expect(picked(smite, 'class:invocations')).toEqual([]);
    const blade = withPicks(make({ cls: 'Warlock', level: 5 }), { 'class:invocations': ['Pact of the Blade', 'Eldritch Smite'] });
    expect(picked(blade, 'class:invocations')).toEqual(['Pact of the Blade', 'Eldritch Smite']);
  });

  it('R-CLA-6: Weapon Mastery: quantidade, armas permitidas e só os tipos escolhidos na ficha', () => {
    expect(slot(make({ cls: 'Fighter', level: 1 }), 'class:weapon-mastery')!.count).toBe(3);
    expect(slot(make({ cls: 'Fighter', level: 16 }), 'class:weapon-mastery')!.count).toBe(6);
    expect(slot(make({ cls: 'Barbarian', level: 1 }), 'class:weapon-mastery')!.count).toBe(2);
    expect(slot(make({ cls: 'Barbarian', level: 10 }), 'class:weapon-mastery')!.count).toBe(4);
    expect(slot(make({ cls: 'Paladin' }), 'class:weapon-mastery')!.count).toBe(2);
    expect(slot(make({ cls: 'Wizard' }), 'class:weapon-mastery')).toBeUndefined();
    const barb = slot(make({ cls: 'Barbarian' }), 'class:weapon-mastery')!;
    expect(barb.options.some((o) => o.value === weaponKey('Longbow'))).toBe(false);
    const rogue = slot(make({ cls: 'Rogue' }), 'class:weapon-mastery')!;
    expect(rogue.options.some((o) => o.value === weaponKey('Greatsword'))).toBe(false);
    expect(rogue.options.some((o) => o.value === weaponKey('Rapier'))).toBe(true);
    const fighter = withPicks(make({ cls: 'Fighter' }), { 'equipment:class': ['A'], 'class:weapon-mastery': [weaponKey('Greatsword')] });
    const attacks = sheet(fighter).attacks;
    expect(attacks.find((a) => a.key === weaponKey('Greatsword'))!.notes).toMatch(/Maestria/);
    expect(attacks.find((a) => a.key === weaponKey('Flail'))!.notes).not.toMatch(/Maestria/);
  });

  it('R-CLA-7: ferramentas da classe', () => {
    expect(slot(bard(), 'class:tools')).toMatchObject({ count: 3 });
    expect(slot(bard(), 'class:tools')!.options).toHaveLength(10);
    expect(slot(make({ cls: 'Monk' }), 'class:tools')).toMatchObject({ count: 1 });
    expect(resolve(make({ cls: 'Rogue', bg: 'Sage' })).tools).toContain("Thieves' Tools");
    expect(resolve(make({ cls: 'Druid' })).tools).toContain('Herbalism Kit');
  });
});

/* ---------------- 8. Equipamento ---------------- */

describe('8. Equipamento', () => {
  it('R-EQU-1: uma opção de equipamento da classe, e ela vira o inventário', () => {
    expect(slot(make({ cls: 'Fighter' }), 'equipment:class')!.options.map((o) => o.value)).toEqual(['A', 'B', 'C']);
    expect(slot(make({ cls: 'Wizard' }), 'equipment:class')!.options.map((o) => o.value)).toEqual(['A', 'B']);
    const c = withPicks(make({ cls: 'Fighter' }), { 'equipment:class': ['A', 'B'] });
    expect(picked(c, 'equipment:class')).toEqual(['A']);
    const s = sheet(c);
    expect(s.inventory.some((l) => l.item?.weaponKey === weaponKey('Greatsword'))).toBe(true);
    expect(s.inventory.some((l) => l.item?.weaponKey === weaponKey('Longbow'))).toBe(false);
    expect(s.gold.total).toBe(4);
    expect(sheet(withPicks(make({ cls: 'Fighter' }), { 'equipment:class': ['C'], 'equipment:background': ['B'] })).gold.total).toBe(155 + 50);
  });

  it('R-EQU-2: as compras não passam do ouro', () => {
    const c = { ...withPicks(make({ cls: 'Wizard', bg: 'Sage' }), { 'equipment:class': ['B'], 'equipment:background': ['B'] }), purchases: [{ itemKey: itemKey('Dagger'), qty: 2 }] };
    expect(sheet(c).gold).toEqual({ total: 105, spent: 4, left: 101 });
    const broke = { ...c, purchases: [{ itemKey: itemKey('Plate Armor'), qty: 1 }] };
    expect(sheet(broke).warnings.some((w) => w.text.startsWith('As compras custam'))).toBe(true);
  });

  it('R-EQU-3: só veste armadura e escudo que tem', () => {
    const none = sheet({ ...make(), armorKey: 'srd-2024_plate-armor', shield: true });
    expect(none.armor).toBeUndefined();
    expect(none.ac).toBe(12);
    const owned = sheet({ ...withPicks(make(), { 'equipment:class': ['A'] }), armorKey: 'srd-2024_chain-mail' });
    expect(owned.armor?.name).toBe('Chain Mail');
    expect(owned.ac).toBe(16);
  });

  it('R-EQU-4: armadura sem treinamento impede magias', () => {
    const wiz = { ...make({ cls: 'Wizard' }), purchases: [{ itemKey: itemKey('Leather Armor'), qty: 1 }], armorKey: 'srd-2024_leather-armor', extraGold: 100 };
    const s = sheet(wiz);
    expect(s.canCast).toBe(false);
    expect(s.warnings.some((w) => w.text.includes('não pode conjurar'))).toBe(true);
    const bardArmor = { ...bard(), purchases: [{ itemKey: itemKey('Leather Armor'), qty: 1 }], armorKey: 'srd-2024_leather-armor', extraGold: 100 };
    expect(sheet(bardArmor).canCast).toBe(true);
  });

  it('R-EQU-5: escudo sem treinamento não dá +2', () => {
    const wiz = { ...make({ cls: 'Wizard' }), purchases: [{ itemKey: itemKey('Shield'), qty: 1 }], shield: true, extraGold: 100 };
    expect(sheet(wiz).ac).toBe(12);
    const fighter = { ...make(), purchases: [{ itemKey: itemKey('Shield'), qty: 1 }], shield: true, extraGold: 100 };
    expect(sheet(fighter).ac).toBe(14);
  });

  it('R-EQU-6: armadura pesada sem a Força pedida tira 10 ft', () => {
    const weak = { ...make({ abilityMethod: 'random', baseScores: { str: 10, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } }), purchases: [{ itemKey: itemKey('Plate Armor'), qty: 1 }], armorKey: 'srd-2024_plate-armor', extraGold: 2000 };
    expect(sheet(weak).speed).toBe(20);
  });

  it('R-EQU-7: ouro extra do mestre', () => {
    expect(sheet({ ...make(), extraGold: 500 }).gold.total).toBe(500);
  });
});

/* ---------------- 9. Números ---------------- */

describe('9. Números da ficha', () => {
  it('R-NUM-1: PV no nível 1 = dado máximo + CON', () => {
    expect(sheet(make({ cls: 'Barbarian' })).hpMax).toBe(12 + 1);
    expect(sheet(make({ cls: 'Wizard' })).hpMax).toBe(6 + 1);
  });

  it('R-NUM-2: PV por nível: média ou rolado, mínimo 1', () => {
    expect(sheet(make({ level: 3 })).hpMax).toBe(11 + 2 * (6 + 1));
    expect(sheet(make({ level: 3, hpMethod: 'rolled', hpRolls: [10, 1] })).hpMax).toBe(11 + 11 + 2);
    const frail = make({ cls: 'Wizard', level: 2, hpMethod: 'rolled', hpRolls: [1], abilityMethod: 'random', baseScores: { str: 8, dex: 14, con: 3, int: 15, wis: 12, cha: 10 } });
    expect(sheet(frail).hpMax).toBe(Math.max(1, 6 - 4) + 1);
    // valor fora do dado é ignorado e usa a média
    expect(sheet(make({ level: 2, hpMethod: 'rolled', hpRolls: [99] })).hpMax).toBe(11 + 7);
  });

  it('R-NUM-3: Iniciativa = DES', () => {
    expect(sheet(make()).initiative).toBe(2);
  });

  it('R-NUM-4: CA sem armadura e Unarmored Defense', () => {
    expect(sheet(make({ cls: 'Barbarian' })).ac).toBe(10 + 2 + 1);
    const monk = make({ cls: 'Monk', baseScores: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 } });
    expect(sheet(monk).ac).toBe(10 + 2 + 2);
    const monkShield = { ...monk, purchases: [{ itemKey: itemKey('Shield'), qty: 1 }], shield: true, extraGold: 50 };
    expect(sheet(monkShield).ac).toBe(12); // Monge sem treinamento de escudo e sem Unarmored Defense
    const dragon = make({ cls: 'Sorcerer', level: 3, sub: 'Draconic Sorcery', baseScores: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 } });
    expect(sheet(dragon).ac).toBe(10 + 2 + 2);
  });

  it('R-NUM-5: armadura média limita a DES em +2', () => {
    const c = { ...make({ abilityMethod: 'random', baseScores: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 } }), purchases: [{ itemKey: itemKey('Breastplate'), qty: 1 }], armorKey: 'srd-2024_breastplate', extraGold: 400 };
    expect(sheet(c).ac).toBe(16);
  });

  it('R-NUM-6: ataque com FOR, DES ou Finesse, e proficiência só nas armas da classe', () => {
    const c = { ...make({ cls: 'Wizard' }), purchases: [{ itemKey: itemKey('Dagger'), qty: 1 }, { itemKey: itemKey('Longsword'), qty: 1 }], extraGold: 100 };
    const s = sheet(c);
    expect(s.attacks.find((a) => a.key === weaponKey('Dagger'))).toMatchObject({ bonus: 2 + 2, proficient: true });
    expect(s.attacks.find((a) => a.key === weaponKey('Longsword'))).toMatchObject({ bonus: 2, proficient: false });
  });

  it('R-NUM-7: Monge usa o maior entre FOR e DES e o dado de Martial Arts', () => {
    const monk = sheet(withPicks(make({ cls: 'Monk', level: 5, baseScores: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 } }), { 'equipment:class': ['A'] }));
    expect(monk.attacks.find((a) => a.key === 'unarmed')!.damage).toMatch(/^1d8\+2/);
    expect(monk.attacks.find((a) => a.key === weaponKey('Spear'))!.damage).toMatch(/^1d8\+2/);
  });

  it('R-NUM-8: CD e ataque de magia', () => {
    const s = sheet(make({ cls: 'Wizard', baseScores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 } }));
    expect(s.spellcasting).toMatchObject({ dc: 8 + 2 + 2, attack: 4 });
  });

  it('R-NUM-9: Unarmored Movement do Monge e Fast Movement do Bárbaro', () => {
    expect(sheet(make({ cls: 'Monk', level: 2 })).speed).toBe(40);
    expect(sheet(make({ cls: 'Monk', level: 18 })).speed).toBe(60);
    expect(sheet(make({ cls: 'Barbarian', level: 5 })).speed).toBe(40);
  });
});

/* ---------------- 10. Magias ---------------- */

describe('10. Magias', () => {
  it('R-MAG-1: truques na quantidade e lista da classe', () => {
    const c = make({ cls: 'Wizard' });
    expect(slot(c, 'spells:cantrips')!.count).toBe(3);
    expect(slot(make({ cls: 'Wizard', level: 4 }), 'spells:cantrips')!.count).toBe(4);
    const picks = withPicks(c, { 'spells:cantrips': [spellKey('Fire Bolt'), spellKey('Sacred Flame'), spellKey('Light'), spellKey('Mage Hand'), spellKey('Ray of Frost')] });
    expect(picked(picks, 'spells:cantrips')).toEqual([spellKey('Fire Bolt'), spellKey('Light'), spellKey('Mage Hand')]);
    expect(slot(make({ cls: 'Fighter' }), 'spells:cantrips')).toBeUndefined();
    expect(slot(make({ cls: 'Paladin' }), 'spells:cantrips')!.count).toBe(0);
  });

  it('R-MAG-2: preparadas na quantidade da tabela e só de círculos com espaço', () => {
    expect(slot(make({ cls: 'Wizard' }), 'spells:prepared')!.count).toBe(4);
    expect(slot(make({ cls: 'Wizard', level: 5 }), 'spells:prepared')!.count).toBe(9);
    const levels = (cls: string, level: number) => Math.max(...slot(make({ cls, level }), 'spells:prepared')!.options.map((o) => Number(o.desc!.match(/^(\d)/)?.[1] ?? 0)));
    expect(levels('Wizard', 1)).toBe(1);
    expect(levels('Wizard', 5)).toBe(3);
    expect(levels('Paladin', 5)).toBe(2);
    expect(levels('Warlock', 20)).toBe(5);
    const fireball = withPicks(make({ cls: 'Wizard' }), { 'spells:prepared': [spellKey('Fireball')] });
    expect(picked(fireball, 'spells:prepared')).toEqual([]);
  });

  it('R-MAG-3: magias sempre preparadas não contam e não se escolhem de novo', () => {
    const cleric = make({ cls: 'Cleric', level: 3, sub: 'Life Domain' });
    expect(resolve(cleric).granted.map((g) => g.spell.name)).toEqual(expect.arrayContaining(['Bless', 'Cure Wounds', 'Aid']));
    expect(picked(withPicks(cleric, { 'spells:prepared': [spellKey('Bless')] }), 'spells:prepared')).toEqual([]);
    const s = sheet(cleric);
    expect(s.spellcasting!.prepared).toBe(6);
    expect(s.spellcasting!.spells.filter((l) => l.alwaysPrepared).length).toBeGreaterThanOrEqual(4);
    expect(resolve(make({ cls: 'Paladin', level: 2 })).granted.map((g) => g.spell.name)).toEqual(['Divine Smite']);
    expect(resolve(make({ cls: 'Druid', level: 3, sub: 'Circle of the Land' })).granted.map((g) => g.spell.name)).toEqual(['Speak with Animals']);
    expect(resolve(withPicks(make({ cls: 'Druid', level: 3, sub: 'Circle of the Land' }), { 'feature:land-type': ['Polar'] })).granted.map((g) => g.spell.name))
      .toEqual(expect.arrayContaining(['Fog Cloud', 'Hold Person', 'Ray of Frost']));
  });

  it('R-MAG-4: espaços de magia e Pact Magic', () => {
    expect(sheet(make({ cls: 'Wizard', level: 5 })).spellcasting!.slots.slice(0, 3)).toEqual([4, 3, 2]);
    expect(sheet(make({ cls: 'Warlock', level: 5 })).spellcasting!.pact).toEqual({ count: 2, level: 3 });
    expect(sheet(make({ cls: 'Paladin', level: 1 })).spellcasting!.slots[0]).toBe(2);
  });

  it('R-MAG-5: Bardo 10 prepara de outras listas', () => {
    const fireball = spellKey('Fireball');
    expect(slot(bard(9), 'spells:prepared')!.options.some((o) => o.value === fireball)).toBe(false);
    expect(slot(bard(10), 'spells:prepared')!.options.some((o) => o.value === fireball)).toBe(true);
  });

  it('R-MAG-6: Mystic Arcanum nos níveis 11, 13, 15 e 17', () => {
    const ids = (level: number) => slotIds(make({ cls: 'Warlock', level })).filter((id) => id.startsWith('spells:arcanum'));
    expect(ids(10)).toEqual([]);
    expect(ids(11)).toEqual(['spells:arcanum-6']);
    expect(ids(17)).toEqual(['spells:arcanum-6', 'spells:arcanum-7', 'spells:arcanum-8', 'spells:arcanum-9']);
    expect(slot(make({ cls: 'Warlock', level: 11 }), 'spells:arcanum-6')!.options.every((o) => o.desc!.startsWith('6º'))).toBe(true);
  });

  it('R-MAG-7: Magical Discoveries (Conhecimento 6)', () => {
    expect(slot(make({ cls: 'Bard', level: 5, sub: 'College of Lore' }), 'subclass:magical-discoveries')).toBeUndefined();
    const s = slot(make({ cls: 'Bard', level: 6, sub: 'College of Lore' }), 'subclass:magical-discoveries')!;
    expect(s.count).toBe(2);
    expect(s.options.some((o) => o.value === spellKey('Fireball'))).toBe(true);
    expect(s.options.some((o) => o.value === spellKey('Wall of Fire'))).toBe(false); // 4º, sem espaço
  });

  it('R-MAG-8: a mesma magia não é escolhida duas vezes', () => {
    const c = withPicks(make({ cls: 'Cleric', bg: 'Acolyte' }), {
      'spells:cantrips': [spellKey('Guidance'), spellKey('Light'), spellKey('Thaumaturgy')],
      'feat:background:mi-cantrips': [spellKey('Light'), spellKey('Sacred Flame')],
    });
    expect(picked(c, 'feat:background:mi-cantrips')).toEqual([spellKey('Sacred Flame')]);
  });
});

/* ---------------- Invariantes ---------------- */

describe('Invariantes de todos os espaços de escolha', () => {
  // Gerador simples e determinístico para não depender de sorte.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const CLASS_NAMES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];

  it('escolhas aceitas sempre cabem no espaço: dentro das opções, sem repetir e sem passar do limite', () => {
    for (let i = 0; i < 300; i++) {
      let c = make({
        cls: pick(CLASS_NAMES), level: 1 + Math.floor(rand() * 20),
        species: pick(['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling']),
        bg: pick(['Acolyte', 'Criminal', 'Sage', 'Soldier']),
      });
      // Primeiro passa para descobrir os espaços, depois enche cada um com lixo e opções de sobra.
      for (let pass = 0; pass < 2; pass++) {
        const r = resolve(c);
        const picks: Record<string, string[]> = {};
        for (const s of r.slots) {
          const values = s.options.map((o) => o.value);
          picks[s.id] = Array.from({ length: s.count + 3 }, () => (rand() < 0.15 ? 'lixo' : pick(values.length ? values : ['x'])));
        }
        c = { ...c, picks, subclassKey: pick(resolve(c).slots.length ? [c.subclassKey, ...sheet(c).cls.subclasses.map((s) => s.key)] : [null]) };
      }
      const r = resolve(c);
      const seen: Record<string, Set<string>> = {};
      for (const s of r.slots) {
        const got = r.picks[s.id] ?? [];
        expect(got.length).toBeLessThanOrEqual(s.count);
        expect(new Set(got).size).toBe(got.length);
        for (const v of got) {
          const o = s.options.find((x) => x.value === v);
          expect(o, `${s.id}: ${v}`).toBeDefined();
          expect(o!.disabled).toBeUndefined();
          const g = o!.group ?? s.group;
          if (g) {
            expect(seen[g]?.has(v), `${g}: ${v} repetido`).not.toBe(true);
            (seen[g] ??= new Set()).add(v);
          }
        }
      }
      expect(() => sheet(c)).not.toThrow();
    }
  });

  it('toda classe, espécie, antecedente e nível monta uma ficha sem erro', () => {
    for (const cls of CLASS_NAMES) {
      for (const level of [1, 3, 5, 11, 20]) {
        for (const species of ['Dwarf', 'Elf', 'Human', 'Tiefling', 'Gnome']) {
          const s = sheet(make({ cls, level, species, bg: 'Sage' }));
          expect(s.hpMax).toBeGreaterThan(0);
          expect(s.skills).toHaveLength(SKILLS.length);
        }
      }
    }
  });

  it('cada espaço de escolha aparece uma vez só', () => {
    for (const cls of CLASS_NAMES) {
      for (const level of [1, 2, 3, 6, 10, 19, 20]) {
        for (const bg of ['Acolyte', 'Criminal', 'Sage', 'Soldier']) {
          const ids = slotIds(make({ cls, level, bg, species: 'Human' }));
          expect(new Set(ids).size, `${cls} ${level} ${bg}: ${ids.join(', ')}`).toBe(ids.length);
        }
      }
    }
  });

  it('as fichas novas não começam com escolhas fora das regras', () => {
    expect(resolve(make()).issues.some((i) => i.text.includes('fora das regras'))).toBe(false);
  });

  it('os antecedentes existem', () => {
    expect(bgKey('Acolyte')).toBeTruthy();
  });
});

describe('Limpeza e estado das opções na tela', () => {
  it('trocar de classe tira as escolhas que não valem mais', async () => {
    const { prunePicks } = await import('./choices');
    const rogue = withPicks(make({ cls: 'Rogue', bg: 'Criminal' }), {
      'class-skills': ['acrobatics', 'athletics', 'insight', 'perception'],
      'class:expertise-1': ['stealth', 'perception'],
    });
    const asFighter = prunePicks({ ...rogue, classKey: make({ cls: 'Fighter' }).classKey });
    expect(asFighter.picks['class-skills']).toEqual(['acrobatics', 'athletics']);
    expect(asFighter.picks['class:expertise-1']).toBeUndefined();
  });

  it('desmarcar a perícia tira a Expertise dela', async () => {
    const { prunePicks } = await import('./choices');
    const c = withPicks(make({ cls: 'Rogue', bg: 'Sage' }), {
      'class-skills': ['acrobatics', 'athletics', 'insight', 'perception'],
      'class:expertise-1': ['perception', 'arcana'],
    });
    const after = prunePicks(withPicks(c, { 'class-skills': ['acrobatics', 'athletics', 'insight', 'stealth'] }));
    expect(after.picks['class:expertise-1']).toEqual(['arcana']);
  });

  it('opção cheia, tomada por outra fonte ou sem pré-requisito fica bloqueada', async () => {
    const { optionState } = await import('./choices');
    const c = withPicks(make({ cls: 'Fighter', bg: 'Soldier' }), { 'class-skills': ['perception', 'insight'] });
    const r = resolve(c);
    const s = r.slots.find((x) => x.id === 'class-skills')!;
    const v = r.picks['class-skills'];
    expect(optionState(s, r, v, 'athletics')).toMatchObject({ blocked: true, takenBy: 'antecedente (Soldado)' });
    expect(optionState(s, r, v, 'acrobatics')).toMatchObject({ blocked: true, full: true });
    expect(optionState(s, r, v, 'perception')).toMatchObject({ blocked: false, selected: true });
  });
});
