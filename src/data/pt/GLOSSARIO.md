# Tradução para o português

Não existe SRD 5.2 oficial em português: a Wizards publicou só inglês, alemão, espanhol, francês e italiano. As traduções
deste diretório são do próprio projeto, feitas a partir do texto em inglês do SRD 5.2.1 (CC-BY-4.0).

Elas ficam fora de `src/data/srd/` porque `npm run fetch-srd` sobrescreve aquela pasta. Tudo que não tiver tradução
aparece em inglês. Hoje estão traduzidas todas as características de classe e subclasse, os traços de espécie e os feats.
O texto é um rascunho feito por máquina a partir do PDF oficial: revisões de quem joga são muito bem-vindas.

## Onde traduzir

- `classes/<classe>.json`: características da classe e da subclasse, nome da subclasse e colunas de Recursos de classe.
- `especies.json`: traços de espécie e as opções de cada escolha (linhagem, ancestral etc.).
- `feats.json`: feats.

Todos os arquivos são lidos juntos, então a chave é o que importa, não o arquivo. Cada chave tem um objeto
`{ "name": "...", "desc": "..." }`. O `desc` é opcional e aceita o mesmo Markdown do SRD (`**negrito**`, `*itálico*`,
listas com `-` e tabelas com `|`).

| O que | Chave | Exemplo |
|---|---|---|
| Característica de classe ou subclasse | `key` do SRD | `srd-2024_fighter_second-wind` |
| Nome de subclasse | `key` da subclasse | `srd-2024_champion` |
| Coluna da tabela da classe (Recursos de classe) | `<classe>/<coluna>` | `srd-2024_fighter/Second Wind` |
| Feat | `key` do feat | `srd-2024_alert` |
| Traço de espécie | `<espécie>/<traço>` | `srd-2024_elf/Elven Lineage` |
| Opção de um traço de espécie | `<espécie>/<traço>/<opção>` | `srd-2024_elf/Elven Lineage/Drow` |

## Como traduzir

- Traduza do **PDF oficial** ([SRD 5.2.1](https://www.dndbeyond.com/srd)), não só do JSON do Open5e. O JSON tem
  trechos faltando (o Indomável perdeu o parágrafo dos níveis 13 e 17) e textos trocados (no Círculo da Terra, Nature's
  Ward e Nature's Sanctuary vêm com a descrição errada). Erros de nível ficam em `LEVEL_FIXES`, em `src/data/rules.ts`.
- Pode adaptar referências que só fazem sentido no livro. "Como mostra a coluna da tabela" vira "aparece em Recursos de
  classe, na primeira página da ficha"; "a subclasse está descrita depois da classe" vira "este app traz o Campeão".
- Frases curtas e diretas, em segunda pessoa ("você"), como no original.
- Mantenha em inglês o que o app mostra em inglês em outros lugares: nomes de **magias**, **armas**, **itens** e
  **propriedades de maestria**. Quando ajudar, ponha a tradução entre parênteses: "Push (Empurrar)",
  "Thieves' Tools (Ferramentas de Ladrão)".
- Nomes de **feats** são traduzidos; o app mostra o original entre parênteses ("Alerta (Alert)"). Dentro dos textos de
  classe, as recomendações de feat ficam em inglês ("Boon of Fate é o recomendado"), que é como aparecem no seletor.
- Distâncias ficam em pés, como na ficha ("30 pés").

## Glossário

Os termos com inicial maiúscula no original continuam com maiúscula na tradução.

| Inglês | Português |
|---|---|
| Ability check | teste de atributo |
| Ability Score Improvement (característica) | Aumento no Valor de Atributo |
| Action / Bonus Action / Reaction | Ação / Ação Bônus / Reação |
| Advantage / Disadvantage | Vantagem / Desvantagem |
| Armor Class (AC) | Classe de Armadura (CA) |
| Attack action | ação de Ataque |
| Attack roll | jogada de ataque |
| Bloodied | Sangrando (com metade ou menos dos PV) |
| Critical Hit | Acerto Crítico |
| Death Saving Throw | salvaguarda contra a morte |
| Difficulty Class (DC) | Classe de Dificuldade (CD) |
| Epic Boon | Dádiva Épica |
| Feat | feat (sem tradução) |
| Fighting Style | Estilo de Luta |
| Heroic Inspiration | Inspiração Heroica |
| Hit Points / Temporary Hit Points | Pontos de Vida / Pontos de Vida Temporários |
| Hit Point Dice | Dados de Vida |
| Initiative | Iniciativa |
| Long Rest / Short Rest | Descanso Longo / Descanso Curto |
| Magic action | ação de Magia |
| Opportunity Attack | Ataque de Oportunidade |
| Proficiency Bonus | Bônus de Proficiência |
| Saving throw | salvaguarda |
| Speed | Deslocamento |
| Subclass | subclasse |
| Unarmed Strike | Ataque Desarmado |
| Weapon Mastery | Maestria em Armas |
| Simple / Martial weapons | armas Simples / Marciais |

### Guerreiro (Fighter)

| Inglês | Português |
|---|---|
| Second Wind | Retomar o Fôlego |
| Action Surge | Surto de Ação |
| Tactical Mind | Mente Tática |
| Extra Attack / Two Extra Attacks / Three Extra Attacks | Ataque Extra / Dois Ataques Extras / Três Ataques Extras |
| Tactical Shift | Mudança Tática |
| Indomitable | Indomável |
| Tactical Master | Mestre Tático |
| Studied Attacks | Ataques Estudados |
| Champion | Campeão |
| Improved Critical / Superior Critical | Crítico Aprimorado / Crítico Superior |
| Remarkable Athlete | Atleta Notável |
| Additional Fighting Style | Estilo de Luta Adicional |
| Heroic Warrior | Guerreiro Heroico |
| Survivor (Defy Death, Heroic Rally) | Sobrevivente (Desafiar a Morte, Recuperação Heroica) |

### Propriedades de maestria

| Inglês | Português |
|---|---|
| Cleave | Trespassar |
| Graze | Raspão |
| Nick | Talho |
| Push | Empurrar |
| Sap | Enfraquecer |
| Slow | Lentidão |
| Topple | Derrubar |
| Vex | Atormentar |

### Condições

| Inglês | Português |
|---|---|
| Blinded | Cego |
| Charmed | Enfeitiçado |
| Deafened | Surdo |
| Exhaustion | Exaustão |
| Frightened | Amedrontado |
| Grappled | Agarrado |
| Incapacitated | Incapacitado |
| Invisible | Invisível |
| Paralyzed | Paralisado |
| Poisoned | Envenenado |
| Prone | Caído |
| Stunned | Atordoado |
| Unconscious | Inconsciente |

### Tipos de dano

| Inglês | Português |
|---|---|
| Acid / Cold / Fire / Lightning | Ácido / Frio / Fogo / Elétrico |
| Bludgeoning / Piercing / Slashing | Contundente / Perfurante / Cortante |
| Force / Necrotic / Psychic / Radiant | Energia / Necrótico / Psíquico / Radiante |
| Poison / Thunder | Veneno / Trovão |

### Outros termos de regras

| Inglês | Português |
|---|---|
| Blindsight / Darkvision / Tremorsense / Truesight | Percepção às Cegas / Visão no Escuro / Sentido Sísmico / Visão Verdadeira |
| Bright Light / Dim Light / Darkness | Luz Plena / Penumbra / Escuridão |
| Half / Three-Quarters / Total Cover | Meia Cobertura / Cobertura de Três Quartos / Cobertura Total |
| Cone / Cube / Emanation / Line / Sphere | Cone / Cubo / Emanação / Linha / Esfera |
| Resistance / Immunity / Vulnerability | Resistência / Imunidade / Vulnerabilidade |
| Concentration | Concentração |
| Dash / Disengage / Dodge / Hide / Utilize | Disparada / Desengajar / Esquivar / Esconder / Usar |
| Grapple / Shove | Agarrar / Empurrar |
| Fly / Climb / Swim Speed | Deslocamento de Voo / de Escalada / de Natação |
| Spell slot / Cantrip / Prepared spell | espaço de magia / truque / magia preparada |
| Spellcasting / Spellcasting Ability / Spellcasting Focus | Conjuração / atributo de conjuração / Foco de Conjuração |
| Spell save DC | CD de salvaguarda de magia |
| Spellbook | grimório |
| Arcane Focus / Druidic Focus / Holy Symbol | Foco Arcano / Foco Druídico / Símbolo Sagrado |
| Beast / Celestial / Fey / Fiend / Undead | Fera / Celestial / Fada / Corruptor / Morto-Vivo |
| Challenge Rating (CR) | Nível de Desafio (ND) |
| Expertise | Especialização |
| D20 Test | Teste de D20 |
| GM | Mestre |
| GP | PO (peças de ouro) |
| Outer Planes / Lower Planes | Planos Exteriores / Planos Inferiores |

### Nomes de classes e subclasses

| Inglês | Português |
|---|---|
| Path of the Berserker | Caminho do Berserker |
| College of Lore | Colégio do Conhecimento |
| Life Domain | Domínio da Vida |
| Circle of the Land | Círculo da Terra |
| Warrior of the Open Hand | Guerreiro da Mão Aberta |
| Oath of Devotion | Juramento de Devoção |
| Hunter | Caçador |
| Thief | Ladrão |
| Draconic Sorcery | Feitiçaria Dracônica |
| Fiend Patron | Patrono Corruptor |
| Evoker | Evocador |

### Recursos e características de várias classes

| Inglês | Português |
|---|---|
| Rage / Unarmored Defense / Reckless Attack | Fúria / Defesa sem Armadura / Ataque Imprudente |
| Bardic Inspiration / Jack of All Trades | Inspiração de Bardo / Pau para Toda Obra |
| Channel Divinity / Divine Spark / Turn Undead | Canalizar Divindade / Centelha Divina / Expulsar Mortos-Vivos |
| Wild Shape / Wild Companion | Forma Selvagem / Companheiro Selvagem |
| Martial Arts / Focus Points / Flurry of Blows | Artes Marciais / Pontos de Foco / Rajada de Golpes |
| Patient Defense / Step of the Wind / Deflect Attacks | Defesa Paciente / Passo do Vento / Desviar Ataques |
| Lay On Hands / Aura of Protection / Divine Sense | Cura pelas Mãos / Aura de Proteção / Sentido Divino |
| Favored Enemy / Deft Explorer / Roving | Inimigo Favorito / Explorador Hábil / Andarilho |
| Sneak Attack / Cunning Action / Cunning Strike | Ataque Furtivo / Ação Ardilosa / Golpe Ardiloso |
| Uncanny Dodge / Evasion / Thieves' Cant | Esquiva Sobrenatural / Evasão / Gíria de Ladrão |
| Sorcery Points / Font of Magic / Metamagic | Pontos de Feitiçaria / Fonte de Magia / Metamagia |
| Innate Sorcery | Feitiçaria Inata |
| Eldritch Invocations / Pact Magic / Mystic Arcanum | Invocações Místicas / Magia de Pacto / Arcano Místico |
| Arcane Recovery / Ritual Adept / Scholar | Recuperação Arcana / Adepto de Rituais / Erudito |
