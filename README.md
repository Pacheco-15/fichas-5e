# Fichas 5.5e

Criador de fichas de personagem, grátis e de código aberto, compatível com as regras de 2024 (5.5e) do SRD 5.2. Monta personagens do nível 1 ao 20 e gera a ficha pronta para imprimir ou salvar em PDF. Tudo roda no navegador e as fichas ficam salvas só no seu computador.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173 no navegador.

## Como usar

1. Na coluna da esquerda, preencha as seções em ordem: básico, atributos (valores digitados à mão), perícias, feats, PV, equipamento e magias.
2. Os avisos amarelos no topo mostram o que ainda falta escolher, como os pontos do antecedente ou as perícias da classe.
3. A ficha à direita atualiza na hora. **Imprimir / PDF** gera de 2 a 3 páginas em A4: ficha, características e magias.
4. As fichas ficam salvas no navegador. Use **Exportar JSON** para fazer backup ou para levar a ficha a outro navegador.

## O que é calculado

- Atributos: base + antecedente (+2/+1 ou +1/+1/+1) + feats (ASI e Epic Boon até 30).
- Salvaguardas, perícias, especialização e Jack of All Trades (Bardo).
- CA:
  - armaduras, escudo e o feat Defense;
  - Unarmored Defense do Bárbaro e do Monge, Draconic Resilience.
- PV: média ou rolados, mais Dwarven Toughness e Draconic Resilience.
- Iniciativa (com Alert), deslocamento (Monge e Bárbaro) e percepção passiva.
- Ataques:
  - proficiência por classe, Finesse e o feat Archery;
  - armas de Monge com Martial Arts, maestrias.
- Recursos de classe por nível: fúrias, ataque furtivo, pontos de foco, invocações etc.
- Conjuração: CD, ataque, truques, magias preparadas, espaços por círculo e Pact Magic.

## Limitações

- Não tem multiclasse.
- Só traz o conteúdo do SRD 5.2:
  - 12 classes, cada uma com 1 subclasse;
  - 9 espécies e 4 antecedentes;
  - 17 feats e 339 magias.
- Escolhas de espécie (linhagem do Elfo, ancestral do Draconato) e efeitos de muitos traços ficam como texto. Nesses casos o valor não é aplicado automaticamente.

## Dados

`src/data/srd/` vem do SRD 5.2 via API do Open5e (`npm run fetch-srd` baixa de novo).
Inclui material do System Reference Document 5.2 ("SRD 5.2") da Wizards of the Coast LLC, licenciado sob CC-BY-4.0.

## Licença

- **Código:** [MIT](LICENSE).
- **Dados de jogo** (`src/data/srd/`): CC-BY-4.0, conforme o SRD 5.2. Veja [src/data/srd/LICENSE.md](src/data/srd/LICENSE.md).

Este é um projeto de fã, independente. Não é afiliado, endossado nem patrocinado pela Wizards of the Coast. Dungeons & Dragons e D&D são marcas registradas da Wizards of the Coast LLC.

## Contribuindo

Issues e pull requests são bem-vindos. Antes de enviar, rode:

```bash
npm run lint
npm run build
```

Só aceitamos conteúdo de jogo com licença aberta (SRD 5.2 / CC-BY-4.0). Não envie texto copiado de livros.
