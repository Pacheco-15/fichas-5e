# Regras da criação de personagem (SRD 5.2.1)

Este é o catálogo das regras que o app aplica. Cada regra tem um código (`R-…`) usado nos testes
(`src/engine/*.test.ts`), então dá para achar o teste de uma regra procurando o código.

Fonte: *System Reference Document 5.2.1* (CC-BY-4.0). As páginas citadas são as do PDF oficial.

## Como o app aplica as regras

Toda escolha da criação é um **espaço de escolha** (`ChoiceSlot`, em `src/engine/choices.ts`). Cada espaço tem:

- quantas escolhas ele dá (`count`);
- de quais opções (`options`), já filtradas pelas regras (lista da classe, pré-requisitos, nível);
- um grupo (`group`) quando as escolhas não podem se repetir entre espaços. Por exemplo, a mesma perícia não pode vir de duas fontes, e o mesmo idioma não pode ser aprendido duas vezes.

O motor só aceita na ficha as escolhas válidas. Ele descarta opções fora da lista, repetições e o que passar do limite, e avisa o que ficou faltando.
A tela usa os mesmos espaços: um botão fica desativado quando a opção não é permitida ou o espaço já está cheio.
Assim nenhuma etapa deixa selecionar mais do que as regras permitem.

## 1. Classe e nível (p. 19)

| Código | Regra |
|---|---|
| R-NIV-1 | O nível vai de 1 a 20. |
| R-NIV-2 | A subclasse só existe a partir do nível 3, e do nível 3 em diante ela é obrigatória. |
| R-NIV-3 | Bônus de proficiência = 2 + (nível − 1) ÷ 4, arredondado para baixo (+2 no nível 1, +6 no 17). |
| R-NIV-4 | Recursos da classe (fúrias, ataque furtivo, pontos de foco, invocações…) vêm da tabela da classe no nível atual. |

## 2. Origem: antecedente, espécie e idiomas (p. 19–20, 83–86)

| Código | Regra |
|---|---|
| R-ANT-1 | O antecedente lista 3 atributos: +2 num e +1 noutro, ou +1 nos três. Nada além disso. |
| R-ANT-2 | O bônus do antecedente não leva nenhum atributo acima de 20. |
| R-ANT-3 | O antecedente dá um feat de origem fixo. No Acólito é Magic Initiate (Cleric), no Sábio Magic Initiate (Wizard). |
| R-ANT-4 | O antecedente dá 2 perícias fixas e 1 ferramenta. O Soldado escolhe um tipo de Gaming Set. |
| R-ANT-5 | O equipamento do antecedente é uma escolha: o pacote (A) **ou** 50 GP (B). |
| R-ESP-1 | Cada escolha da espécie (linhagem, ancestral, legado, tamanho, atributo de conjuração) tem exatamente 1 opção. |
| R-ESP-2 | Humano, Skillful: 1 perícia à escolha. |
| R-ESP-3 | Humano, Versatile: 1 feat de **origem** à escolha. |
| R-ESP-4 | Elfo, Keen Senses: 1 perícia entre Insight, Perception **ou** Survival. |
| R-ESP-5 | Magias de espécie: Elfo (linhagem), Gnomo (linhagem) e Tiefling (legado e Otherworldly Presence) ganham truques no nível 1 e magias sempre preparadas nos níveis de personagem 3 e 5. |
| R-ESP-6 | Deslocamento e tamanho vêm da espécie. O Elfo da Floresta tem 35 ft. |
| R-ESP-7 | Anão, Dwarven Toughness: +1 PV por nível. |
| R-IDI-1 | Todo personagem sabe Common e mais **2** idiomas da tabela de idiomas padrão. |
| R-IDI-2 | O mesmo idioma não pode ser escolhido duas vezes. |
| R-IDI-3 | Ladino, Thieves' Cant: Thieves' Cant mais 1 idioma das tabelas (padrão ou raro). Patrulheiro, Deft Explorer (nível 2): +2 idiomas das tabelas. Druida: Druidic. |

## 3. Atributos (p. 21)

| Código | Regra |
|---|---|
| R-ATR-1 | Conjunto padrão: os seis valores são exatamente 15, 14, 13, 12, 10 e 8, cada um usado uma vez. |
| R-ATR-2 | Compra de pontos: cada valor fica entre 8 e 15 e o custo total é no máximo 27 (8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9). |
| R-ATR-3 | Rolagem (4d6, descarta o menor): cada valor fica entre 3 e 18. |
| R-ATR-4 | Modificador = (valor − 10) ÷ 2, arredondado para baixo. |

## 4. Perícias e especialização (p. 8–9, 20, 22 e a descrição de cada classe)

| Código | Regra |
|---|---|
| R-PER-1 | A classe dá N perícias da lista dela (ex.: Guerreiro 2 de 9, Ladino 4 de 10, Bardo 3 quaisquer). |
| R-PER-2 | Uma perícia que você já tem (do antecedente, por exemplo) não pode ser escolhida de novo em outra fonte. |
| R-PER-3 | Bárbaro, Primal Knowledge (nível 3): +1 perícia **da lista do Bárbaro**. |
| R-PER-4 | Colégio do Conhecimento, Bonus Proficiencies (nível 3): +3 perícias quaisquer. |
| R-PER-5 | Feat Skilled: 3 perícias ou ferramentas, em qualquer combinação. |
| R-PER-6 | Expertise só pode ir em perícias em que você é proficiente, e cada perícia recebe Expertise uma vez só. |
| R-PER-7 | Expertise por classe: Ladino 2 no nível 1 e mais 2 no 6. Bardo 2 no 2 e mais 2 no 9. Patrulheiro 1 no 2 (Deft Explorer) e mais 2 no 9. Mago 1 no 2 (Scholar). |
| R-PER-8 | Mago, Scholar: só Arcana, History, Investigation, Medicine, Nature ou Religion. |
| R-PER-9 | Expertise dobra o bônus de proficiência. |
| R-PER-10 | Bardo, Jack of All Trades (nível 2): metade da proficiência (para baixo) nas perícias sem proficiência. |
| R-PER-11 | Percepção passiva = 10 + bônus de Percepção. |

## 5. Salvaguardas (p. 7–8 e a descrição de cada classe)

| Código | Regra |
|---|---|
| R-SAL-1 | A classe dá proficiência em 2 salvaguardas. |
| R-SAL-2 | Monge, Disciplined Survivor (nível 14): proficiência em todas as salvaguardas. |
| R-SAL-3 | Ladino, Slippery Mind (nível 15): proficiência em salvaguardas de Sabedoria e Carisma. |

## 6. Feats (p. 87–88)

| Código | Regra |
|---|---|
| R-FEA-1 | Um feat só pode ser pego uma vez, a não ser que diga "Repeatable" (ASI, Skilled e Magic Initiate). |
| R-FEA-2 | Para pegar um feat é preciso cumprir o pré-requisito: General pede nível 4+, Epic Boon pede nível 19+, Grappler pede Força ou Destreza 13+, Boon of Spell Recall pede a característica Spellcasting e Fighting Style pede a característica Fighting Style. |
| R-FEA-3 | Na característica Ability Score Improvement (níveis 4, 8, 12, 16 e os extras de Guerreiro e Ladino) vale o feat ASI ou **qualquer** feat que você cumpra. No nível 19 (Epic Boon), um Epic Boon ou qualquer feat que você cumpra. |
| R-FEA-4 | ASI: +2 num atributo ou +1 em dois, sem passar de 20. |
| R-FEA-5 | Grappler: +1 em Força **ou** Destreza, até 20. |
| R-FEA-6 | Epic Boon: +1 em qualquer atributo, até 30. |
| R-FEA-7 | Fighting Style: Guerreiro no nível 1, Paladino e Patrulheiro no 2, Campeão mais um no 7. Paladino pode trocar por Blessed Warrior (2 truques de Clérigo) e Patrulheiro por Druidic Warrior (2 truques de Druida). |
| R-FEA-8 | Magic Initiate: escolha a lista (Clérigo, Druida ou Mago), o atributo (INT, SAB ou CAR), 2 truques e 1 magia de nível 1 dessa lista. Pegando de novo, a lista tem que ser outra. No antecedente, a lista é a que o antecedente diz. |
| R-FEA-9 | Alert: soma o bônus de proficiência na Iniciativa. Defense: +1 na CA usando armadura. Archery: +2 no ataque com arma à distância. |

## 7. Escolhas das características de classe (p. 28–82)

| Código | Regra |
|---|---|
| R-CLA-1 | Clérigo, Divine Order (nível 1): Protector (armas marciais e armadura pesada) **ou** Thaumaturge (+1 truque). |
| R-CLA-2 | Druida, Primal Order (nível 1): Magician (+1 truque) **ou** Warden (armas marciais e armadura média). |
| R-CLA-3 | Uma opção para cada: Blessed Strikes (Clérigo 7), Elemental Fury (Druida 7), Hunter's Prey (Caçador 3), Defensive Tactics (Caçador 7), Elemental Affinity (Dracônico 6: Acid, Cold, Fire, Lightning ou Poison) e o tipo de terra do Círculo da Terra (3). |
| R-CLA-4 | Feiticeiro, Metamagic: 2 opções no nível 2, 4 no 10 e 6 no 17, sem repetir. |
| R-CLA-5 | Bruxo, Eldritch Invocations: a quantidade vem da tabela, e cada invocação exige o nível mínimo e as outras invocações que pede. |
| R-CLA-6 | Weapon Mastery: a quantidade de tipos de arma vem da tabela. Bárbaro só armas corpo a corpo, Guerreiro qualquer arma simples ou marcial, Paladino, Patrulheiro e Ladino só armas em que são proficientes. Só esses tipos mostram a maestria na ficha. |
| R-CLA-7 | Ferramentas da classe: Bardo 3 instrumentos musicais, Monge 1 ferramenta de artesão ou instrumento. Druida (Herbalism Kit) e Ladino (Thieves' Tools) já vêm fixos. |

## 8. Equipamento (p. 20, 89–93)

| Código | Regra |
|---|---|
| R-EQU-1 | O equipamento inicial da classe é **uma** opção (A, B ou C, conforme a classe). O do antecedente também é uma: A ou 50 GP. |
| R-EQU-2 | O ouro que sobra pode ser gasto em itens do capítulo de Equipamento. O total das compras não pode passar do ouro disponível. |
| R-EQU-3 | Só se veste uma armadura e só se usa um escudo, e os dois têm que estar no seu equipamento. |
| R-EQU-4 | Armadura sem treinamento: Desvantagem em testes de Força e Destreza, e você não conjura magias. |
| R-EQU-5 | Escudo sem treinamento: não dá o +2 na CA. |
| R-EQU-6 | Armadura com requisito de Força maior que a sua: −10 ft de deslocamento. |
| R-EQU-7 | Começando em nível alto, o mestre decide o equipamento extra (p. 24). O app aceita ouro extra informado à mão. |

## 9. Números da ficha (p. 22–23)

| Código | Regra |
|---|---|
| R-NUM-1 | PV no nível 1 = dado de vida máximo + mod. de CON. |
| R-NUM-2 | PV por nível depois do 1: o valor fixo da classe (média) ou o dado rolado, + mod. de CON, mínimo 1 por nível. |
| R-NUM-3 | Iniciativa = mod. de DES (+ proficiência com Alert). |
| R-NUM-4 | CA sem armadura = 10 + DES. Bárbaro: 10 + DES + CON (aceita escudo). Monge: 10 + DES + SAB (sem escudo). Feitiçaria Dracônica: 10 + DES + CAR. |
| R-NUM-5 | CA com armadura = base + DES (com o limite da armadura média). Escudo +2. |
| R-NUM-6 | Ataque corpo a corpo usa FOR, à distância usa DES, Finesse usa o maior dos dois. Proficiência só nas armas em que a classe é proficiente. |
| R-NUM-7 | Monge: armas de monge e golpe desarmado usam o maior entre FOR e DES, e o dado de Martial Arts quando for maior. |
| R-NUM-8 | CD de magia = 8 + atributo de conjuração + proficiência. Ataque mágico = atributo + proficiência. |
| R-NUM-9 | Deslocamento: Monge ganha Unarmored Movement sem armadura e sem escudo. Bárbaro ganha +10 ft no nível 5 sem armadura pesada. |

## 10. Magias (p. 104–105 e a seção Spellcasting de cada classe)

| Código | Regra |
|---|---|
| R-MAG-1 | Truques: a quantidade vem da tabela da classe (+1 com Thaumaturge ou Magician). Só da lista da classe. |
| R-MAG-2 | Magias preparadas: a quantidade vem da tabela da classe, só da lista da classe e só de círculos para os quais você tem espaço. |
| R-MAG-3 | Magias sempre preparadas (domínio, juramento, patrono, círculo, espécie, características) **não** contam no limite de preparadas. |
| R-MAG-4 | Espaços de magia vêm da tabela. O Bruxo usa Pact Magic: todos os espaços do mesmo círculo. |
| R-MAG-5 | Bardo, Magical Secrets (nível 10): as magias preparadas podem vir também das listas de Clérigo, Druida e Mago. |
| R-MAG-6 | Bruxo, Mystic Arcanum: 1 magia de Bruxo de 6º círculo no nível 11, de 7º no 13, de 8º no 15 e de 9º no 17. |
| R-MAG-7 | Colégio do Conhecimento, Magical Discoveries (nível 6): 2 magias das listas de Clérigo, Druida ou Mago, truques ou de círculo que você conjure. Ficam sempre preparadas. |
| R-MAG-8 | A mesma magia não é escolhida duas vezes. |

## O que o app ainda não modela

- **Multiclasse.**
- **Grimório do Mago:** o app trata a lista de Mago como o grimório. Não conta as 6 magias iniciais nem as 2 por nível, e não inclui Evocation Savant.
- **Spell Mastery e Signature Spells do Mago:** aparecem só como texto.
- **Invocações repetíveis:** ficam como uma escolha só. Pré-requisitos de truque ("a Warlock cantrip that deals damage") aparecem como texto e não são conferidos.
- **Pacote de equipamento:** os itens do pacote entram na ficha como texto. Só armas, armaduras e escudo viram itens usáveis.
- **Trocas ao subir de nível** (trocar truque, magia ou invocação): o app mostra só a escolha atual.
