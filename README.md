# Portfólio, Matheus Beck

Site one-page de portfólio (design e criação de artes profissionais).
Publicado em: https://theusmkt.github.io/PORTF-LIO-MATHEUS/

HTML, CSS e JS puros, sem framework e sem etapa de build para publicar.

## Estrutura

```
index.html            página única
css/style.css         estilos (tokens em :root, fontes locais no topo)
js/main.js            interações (aprimoramento progressivo)
js/hero-grid.js       chão quadriculado do hero em WebGL puro (sem bibliotecas, só no desktop)
js/vendor/            GSAP + ScrollTrigger e Lenis
assets/               fotos, prints dos cases (assets/cases/), fontes, og-image, assinatura
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

## Chão quadriculado (WebGL)

`js/hero-grid.js` é carregado só no desktop, quando o navegador está ocioso, e
pausa quando o hero sai da tela. No celular, com economia de dados ou com
animações desativadas no sistema, fica a grade estática em CSS (`.hero__floor`).
Não há etapa de build: edite o arquivo direto.
