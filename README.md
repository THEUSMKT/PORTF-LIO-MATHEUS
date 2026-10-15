# Matheus Beck, Criação de Sites Profissionais

Página comercial de criação de sites profissionais e landing pages, com os
projetos reais do portfólio.
Publicado em: https://theusmkt.github.io/PORTF-LIO-MATHEUS/

HTML, CSS e JS puros, sem framework e sem etapa de build para publicar.

## Estrutura

```
index.html              página única
css/style.css           estilos (tokens em :root, fonte Inter variável local no topo)
js/main.js              menu, faixa de projetos, formulário, WhatsApp flutuante e carregamento da animação
js/accretion-disc.js    animação da hero (Accretion Disc 4, Originkit) em WebGL nativo
js/accretion-disc-worker.js  roda a animação fora da thread principal (OffscreenCanvas)
assets/cases/           capturas dos projetos (as versões *-mobile.webp não são usadas hoje)
assets/img/             favicon, ícone de tela inicial, imagem de compartilhamento
assets/fonts/           Inter variável (pesos 100 a 900)
.nojekyll               faz o GitHub Pages servir os arquivos como estão
```

As fotos `assets/hero-palco.webp` e `assets/sobre-perfil.webp` e a
`assets/img/assinatura.svg` continuam no repositório, mas não são carregadas.

## Rodar localmente

```bash
python3 -m http.server 8000
# abra http://localhost:8000/
```

Um servidor é necessário porque a animação é carregada como módulo
(`import()`), que não funciona abrindo o arquivo direto do disco.

## Publicação (GitHub Pages)

Settings → Pages → Build and deployment → Source: **Deploy from a branch** →
Branch: **main** / **(root)**. Todos os caminhos são relativos, então o site
funciona na subpasta `/PORTF-LIO-MATHEUS/`.

## Animação da hero

`js/accretion-disc.js` exporta `initAccretionDisc(host, opções)`, que devolve
`{ destroy, pause, resume }` ou `null` quando não há WebGL ou o shader falha.
Onde o navegador tem `OffscreenCanvas`, o WebGL roda num Web Worker
(`js/accretion-disc-worker.js`): criar o contexto e desenhar os quadros não
ocupa a thread principal. Se o Worker não conseguir, a animação roda na própria
página; se também não der, fica a versão estática.
O `main.js` define as opções por tamanho de tela:

| | Partículas | DPR máx. | Quadros por segundo |
| --- | --- | --- | --- |
| Celular / toque | 10.000 (6.000 em aparelho modesto) | 1 | 30 |
| Desktop | 32.000 (20.000 em aparelho modesto) | 1,5 | 60 |

- Carrega depois do `load`, quando o navegador fica ocioso.
- Pausa de verdade fora da tela e com a aba oculta.
- Se o aparelho não sustenta o ritmo, reduz a quantidade (no máximo duas vezes)
  e, se ainda não der, fica na versão estática.
- Com movimento reduzido ou economia de dados, nenhum contexto WebGL é criado e
  aparece a versão estática em CSS (`.disc::before`). A preferência de
  movimento é acompanhada ao vivo.
- Perda de contexto do WebGL volta para a versão estática; a restauração
  recria os recursos.

## Faixa de projetos

Os quatro cards usam a mesma estrutura e são quadrados (`aspect-ratio: 1`),
com o tamanho definido por `--card` em cada breakpoint. A rolagem é nativa
com `scroll-snap`; o script só acrescenta os botões, a barra de progresso,
o arraste com mouse (a partir de 6px) e as setas do teclado dentro da faixa.

## Contato e rastreamento

Todos os botões de contato abrem o WhatsApp com a mensagem sobre site
profissional. Os CTAs têm `data-cta` e os links de projeto têm `data-project`,
prontos para uma ferramenta de análise, se for adicionada. Nenhuma está
instalada hoje.
