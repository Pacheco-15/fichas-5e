// Explicações curtas dos termos do jogo, abertas pelo botão "?" de cada campo.
import type { FeatType } from '../data/rules';

export const HELP = {
  player: 'O seu nome, de quem vai jogar com este personagem. Ajuda o mestre a saber de quem é cada ficha.',
  class:
    'A "profissão" de aventureiro do personagem: o Guerreiro luta com armas, o Mago estuda magia, o Ladino é furtivo e ' +
    'certeiro, o Clérigo recebe poder de um deus. É a escolha que mais muda o jeito de jogar.',
  level:
    'Mostra a experiência do personagem, de 1 a 20. Quase toda campanha começa no nível 1, e o mestre avisa quando é ' +
    'hora de subir.',
  subclass:
    'Uma especialização dentro da classe, escolhida no nível 3. Por exemplo, o Guerreiro pode seguir o caminho do ' +
    'Champion. Este app traz uma subclasse por classe, as que estão no SRD.',
  alignment:
    'Um resumo da moral do personagem, em duas partes: Leal, Neutro ou Caótico (segue regras ou faz do seu jeito) e ' +
    'Bom, Neutro ou Mau (pensa nos outros ou só em si). Ex.: "Neutro e Bom". É opcional e não muda nenhum número da ficha.',
  species:
    'De que povo o personagem é: humano, elfo, anão etc. Cada espécie tem traços de nascença, como enxergar no escuro ' +
    'ou resistir a veneno. Eles aparecem na página de características da ficha.',
  background:
    'O que o personagem fazia antes de virar aventureiro. Dá bônus em atributos, duas perícias, uma ferramenta, ' +
    'equipamento inicial e um feat de origem.',
  modifier:
    'Mod é o modificador: o número que você soma no d20 quando usa aquele atributo. Um valor 10 dá +0, e cada 2 pontos ' +
    'acima disso somam +1.',
  skills:
    'Ser treinado numa perícia soma o bônus de proficiência nos testes dela. Ex.: treinado em Furtividade, você tem ' +
    'mais chance de se esconder. Ficam em cinza as que já vêm do antecedente e, quando você completa a escolha, as restantes.',
  extraSkills:
    'Perícias que vêm de outros lugares: o Humano ganha uma à escolha (Skillful), o Elfo ganha Intuição, Percepção ou ' +
    'Sobrevivência (Keen Senses) e o feat Skilled dá três. Se nada disso vale para você, deixe em branco.',
  expertise:
    'Dobra o bônus de proficiência numa perícia em que você já é treinado. Só algumas classes ganham, nos níveis ' +
    'listados logo abaixo.',
  armor:
    'A armadura aumenta a Classe de Armadura (CA): o número que o inimigo precisa tirar para te acertar. A leve soma ' +
    'toda a sua Destreza, a média soma até +2 e a pesada não soma nada, mas tem a base mais alta. Escolha uma em que a ' +
    'classe tenha treinamento: sem ele, a armadura atrapalha muito.',
  shield: 'O escudo dá +2 na CA, mas ocupa uma das mãos.',
  weapons:
    'Ser proficiente numa arma soma o bônus de proficiência no ataque com ela. As armas em cinza a classe não domina: ' +
    'você pode usar, mas erra mais.',
  equipment:
    'O que o personagem carrega. A classe e o antecedente deixam escolher entre um kit pronto ou moedas de ouro (GP) ' +
    'para comprar o que quiser. As opções aparecem logo abaixo; copie aqui o que escolher.',
  tools:
    'Kits de ofício, como Ferramentas de Ladrão, um instrumento musical ou um jogo. Ser proficiente deixa você somar o ' +
    'bônus de proficiência quando usa a ferramenta.',
  languages: 'Todo personagem fala o Comum e mais dois idiomas à escolha, como Élfico, Anão ou Dracônico.',
};

/** Por traço da espécie (nome em inglês, como no SRD) ou pelo tipo de escolha. */
export const SPECIES_CHOICE_HELP: Record<string, string> = {
  'Draconic Ancestry':
    'O tipo de dragão do qual você descende. Ele define o dano do seu sopro (Breath Weapon) e a resistência a dano que ' +
    'você ganha. Dragões com o mesmo tipo de dano funcionam igual nas regras; escolha pela aparência.',
  'Elven Lineage':
    'Cada linhagem dá um poder no nível 1 e magias novas nos níveis 3 e 5. O Drow enxerga mais longe no escuro, o Alto ' +
    'Elfo tem mais magia e o Elfo da Floresta é mais rápido.',
  'Gnomish Lineage':
    'O Gnomo da Floresta cria ilusões e fala com animais. O Gnomo das Rochas conserta objetos e monta pequenos mecanismos.',
  'Giant Ancestry':
    'Um poder herdado dos gigantes, que você pode usar um número de vezes igual ao bônus de proficiência por descanso ' +
    'longo. O de nuvem teletransporta, os de fogo, gelo e colina reforçam ataques, e os de pedra e tempestade reagem ' +
    'quando você leva dano.',
  'Fiendish Legacy':
    'Define a resistência a dano e as magias que você ganha nos níveis 1, 3 e 5. Abissal resiste a veneno, Ctônico a ' +
    'necrótico e Infernal a fogo.',
  ability:
    'O atributo usado nas magias que a espécie dá. Escolha o mais alto entre Inteligência, Sabedoria e Carisma, de ' +
    'preferência o mesmo da sua classe.',
  size: 'Só muda a altura do personagem: Médio ou Pequeno não altera nenhum número da ficha.',
};

export const FEAT_HELP: Record<FeatType, string> = {
  Origin:
    'Feat de origem: um talento de nível 1. Todo personagem ganha um do antecedente, e o Humano ganha mais um à escolha.',
  'Fighting Style':
    'Estilo de luta: uma técnica de combate, como Archery (+2 em ataques à distância) ou Defense (+1 na CA usando armadura).',
  General:
    'Neste nível você escolhe um feat geral. Na dúvida, pegue Ability Score Improvement: +2 num atributo ou +1 em dois.',
  'Epic Boon':
    'Dádiva épica: um poder especial do nível 19. Também dá +1 num atributo, e esse atributo pode passar de 20 (até 30).',
};

export const ALIGNMENTS = [
  'Leal e Bom', 'Neutro e Bom', 'Caótico e Bom',
  'Leal e Neutro', 'Neutro', 'Caótico e Neutro',
  'Leal e Mau', 'Neutro e Mau', 'Caótico e Mau',
];
