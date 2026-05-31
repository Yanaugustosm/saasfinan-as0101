# Hero v2 — Editorial Cinematic com Imagem Aspiracional

## Diagnóstico do que está errado hoje

- **Centralização e simetria**: tudo empilhado em coluna única → parece poster, não produto vivo.
- **Glow esbranquiçado**: os dois radiais champagne com blur enorme estão lavando o fundo `#0D0D0F` e criando uma névoa cinza-clara no centro — exatamente o "efeito esbranquiçado" que você não gosta.
- **Sem contexto emocional**: nenhuma imagem, nenhuma janela para a vida do casal. A tela é só tipografia.
- **Patrimônio sem domínio real**: 120px no desktop, mas perdido no meio de muito texto acima e abaixo. Falta respiro ao redor.
- **Atmosfera plana**: grain + 2 glows iguais = uma camada só de ruído. Sem profundidade real.

## Nova direção: split assimétrico 60/40 com janela aspiracional

```text
┌──────────────────────────────────────────────────────────────────┐
│  • PATRIMÔNIO · FEV 2026                                          │
│                                                                   │
│  Boa noite,                          ┌────────────────────────┐  │
│  Yan & Nani.                         │                        │  │
│                                      │   [imagem aspiracional]│  │
│  R$ 42.890,42                        │   apartamento sofisti- │  │
│  ───────────                         │   cado, luz quente,    │  │
│  +12,4% este ano                     │   blur cinematográfico │  │
│                                      │   gradiente fade p/ bg │  │
│  Vocês estão construindo             │                        │  │
│  algo bonito.                        │                        │  │
│                                      │   ┌──────────────────┐ │  │
│  │ Saúde financeira excelente.       │   │ Próximo sonho    │ │  │
│  │ Sobra suficiente p/ antecipar     │   │ Casa própria 64% │ │  │
│  │ uma parcela.                      │   └──────────────────┘ │  │
│                                      └────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

- Coluna esquerda (~58%): conteúdo. Alinhado à esquerda, ritmo vertical assimétrico (label compacto, saudação curta, número gigante com respiro generoso acima/abaixo, headline italic abaixo do número — invertendo a ordem atual —, contexto editorial).
- Coluna direita (~42%): janela aspiracional — imagem cinematográfica com máscara gradient (esquerda transparente → direita visível) + chip flutuante "próximo sonho" como ponte com o produto.

## Atmosfera nova (sem efeito esbranquiçado)

Remover os dois radiais champagne brancos. Substituir por:

1. **Base warm sutil**: o `hero-bg` ganha um gradiente vertical quase imperceptível `#0D0D0F → #100E0B` (warm shift, não brightness shift). Zero clareamento.
2. **Glow champagne lateral direito**: radial champagne 6% opacity, **posicionado atrás da imagem** (não no centro). Ele sangra da imagem para o conteúdo, dando sensação de "luz quente vindo da janela". Blur 80px.
3. **Vinheta inferior**: gradiente preto sutil no rodapé da hero para fundir com as métricas abaixo.
4. **Grain**: mantém, mas reduz para 6% e troca `mix-blend-soft-light` por `mix-blend-overlay` (textura sem clareamento).
5. **Sem glow centralizado**. O olho recebe luz da direita (da foto), não de baixo do texto.

## Imagem aspiracional

- Gerar um asset `src/assets/hero-aspiracional.jpg` (1200×900, fast model): interior de apartamento contemporâneo ao entardecer, luz quente âmbar, janela panorâmica, vista urbana desfocada ao fundo, paleta warm beige/champagne, profundidade cinematográfica, sem pessoas, mood Aman Hotels / Arc Browser.
- Tratamento em CSS:
  - `mask-image: linear-gradient(90deg, transparent 0%, black 35%)` — esquerda funde no bg.
  - `mask-image` adicional vertical fade no rodapé.
  - Overlay champagne 8% para harmonizar com a paleta.
  - `filter: saturate(0.85) brightness(0.9)` — imagem subordinada, atmosfera primeiro.
- Em mobile: imagem some (ou vira faixa horizontal de 120px no topo da hero, com mesma máscara fade).

## Chip "próximo sonho" sobre a imagem

Card glass mínimo flutuando no canto inferior da imagem:
- Avatar mini do sonho (Casa Própria) + título + progress bar champagne 64%.
- Faz a ponte entre "atmosfera emocional" e "produto vivo" — é o detalhe que diferencia poster de produto.
- `backdrop-blur(20px)` + borda `white/8` + bg `black/40`.

## Hierarquia revisada (ordem de leitura)

1. **R$ 42.890,42** — agora 88→140px no desktop, com 140px de respiro acima e abaixo. Domínio absoluto.
2. **Imagem aspiracional** — entra no campo periférico, cria mood antes do texto ser lido.
3. **Saudação "Boa noite, Yan & Nani"** — íntima, acima do número.
4. **Headline italic "Vocês estão construindo algo bonito"** — agora abaixo do número, como legenda emocional.
5. **Contexto editorial** — sussurrado, border-left champagne.
6. **Chip do sonho** — gancho para a próxima ação.

## Microinterações

- Imagem entra com `scale(1.04) → 1` + fade 1.2s ease-out (efeito Ken Burns sutil).
- Glow lateral pulsa muito lentamente (12s, ±1% opacity).
- Stagger mantido no conteúdo (label → saudação → número → headline → contexto → chip).
- Hover no chip do sonho: borda champagne 10% → 25%, progress bar shimmer sutil.
- Tudo respeitando `prefers-reduced-motion`.

## Arquivos a alterar

- `src/components/HeroSection.tsx` — reescrever layout: grid `lg:grid-cols-[1.4fr_1fr]`, remover radiais centrais, nova ordem de elementos, adicionar coluna da imagem com chip.
- `src/styles.css` — remover/ajustar `.grain-overlay` (overlay blend), adicionar `--gradient-hero-warm`, keyframe `ken-burns`, ajustar opacidades. Remover background lavado.
- `src/routes/_app.index.tsx` — passar o "próximo sonho" (primeiro item de `goals`) pro HeroSection.
- `src/assets/hero-aspiracional.jpg` *(novo)* — imagem gerada via imagegen (fast).

Sem dependências novas. Sem mudanças em dados/backend/rotas.

## Mobile (390px — viewport atual do usuário)

- Imagem vira faixa horizontal de 140px no topo, com fade vertical para o bg.
- Conteúdo full-width abaixo, mantendo alinhamento à esquerda (não centralizar — preserva a assimetria editorial).
- Patrimônio 64→72px, ainda dominante.
- Chip do sonho aparece como card full-width abaixo do contexto.

## Fora de escopo

Cards de métricas, gráfico, timeline, lançamentos, header. Só a hero.
