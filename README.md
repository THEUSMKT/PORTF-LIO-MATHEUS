# Portfólio — Matheus Beck

Site one-page de portfólio (design e criação de artes profissionais).
Publicado em: https://theusmkt.github.io/PORTF-LIO-MATHEUS/

HTML, CSS e JS puros, sem framework e sem etapa de build para publicar.

## Estrutura

```
index.html            página única
css/style.css         estilos (tokens em :root, fontes locais no topo)
js/main.js            interações (aprimoramento progressivo)
js/vendor/            GSAP + ScrollTrigger, Lenis e o fundo WebGL do hero (Three.js empacotado)
assets/               fotos, prints dos cases (assets/cases/), fontes, og-image, assinatura
tools/                fonte do fundo WebGL e script de build (não é usado pelo site publicado)
.nojekyll             faz o GitHub Pages servir os arquivos como estão
```

## Publicação (GitHub Pages)

Settings → Pages → Build and deployment → Source: **Deploy from a branch** →
Branch: **main** / **(root)** → Save. Todos os caminhos são relativos, então o
site funciona na subpasta `/PORTF-LIO-MATHEUS/`.

## Seções ocultas

`Depoimentos` (`#depoimentos`) e `Dúvidas frequentes` (`#duvidas`) estão prontas
no `index.html`, mas com o atributo `hidden`. Para ativar:

1. Preencha os dados reais (há comentários indicando onde).
2. Remova o atributo `hidden` da `<section>`.
3. Adicione o link no menu (`<ul class="nav__links">`), por exemplo
   `<li><a href="#depoimentos">Depoimentos</a></li>`.

## Atualizar o fundo WebGL

```bash
cd tools && npm install && npm run build:webgl
```

Gera `js/vendor/hero-webgl.js` a partir de `tools/hero-webgl.src.js`.
