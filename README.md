# Snake Combinatório

Jogo educativo inspirado no clássico Snake, com perguntas de **Análise Combinatória (Arranjos)** a cada alimento coletado. Construído com **HTML, CSS e JavaScript puros**, sem dependências, build ou backend.

![Stack](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JS-blueviolet) ![Status](https://img.shields.io/badge/status-pronto%20pra%20jogar-39ff14)

## Sumário

- [Sobre o jogo](#sobre-o-jogo)
- [Regras](#regras)
- [Como jogar](#como-jogar)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como rodar localmente](#como-rodar-localmente)
- [Deploy](#deploy)
- [Personalização rápida](#personalização-rápida)
- [Tecnologias](#tecnologias)

## Sobre o jogo

A cada vez que a cobrinha come a comida (símbolo `π`), o jogo pausa e abre uma pergunta de **arranjos** (`A(n,p) = n!/(n-p)!`) com **4 alternativas** e apenas **1 correta**. A dificuldade das perguntas aumenta conforme o jogador progride:

| Faixa de pontuação | Dificuldade | Tempo para responder |
| ------------------ | ----------- | -------------------- |
| 0 – 3              | Fácil       | 15s                  |
| 4 – 7              | Médio       | 12s                  |
| 8+                 | Difícil     | 10s                  |

## Regras

- Você começa com **3 vidas**.
- **Acertou**: a cobrinha cresce e ganha 1 ponto.
- **Errou** (ou estourou o tempo): perde **1 vida**.
- O jogo termina quando:
  - **Bate** na parede ou no próprio corpo, ou
  - **Zera** as vidas.
- Atingir a **meta** (12 pontos) abre a **tela de vitória**.
- A maior pontuação é salva no `localStorage` e exibida na tela inicial e ao final.

## Como jogar

| Ação                  | Atalho                                  |
| --------------------- | --------------------------------------- |
| Mover (desktop)       | Setas ou `WASD`                         |
| Mover (mobile)        | Deslizar o dedo no tabuleiro (swipe)    |
| Iniciar partida       | Botão **Jogar** (tela inicial)          |
| Reiniciar             | Botão **Reiniciar Jogo** ou no fim de jogo |
| Mute / desmute        | Botão de som no canto inferior          |

## Estrutura do projeto

```
jogo-matematica/
├── index.html      # Markup, modais (start, pergunta, game over, vitória)
├── styles.css      # Tema neon/retrô, animações, responsividade
├── script.js       # Lógica do jogo, perguntas, áudio (WebAudio), partículas
└── README.md
```

## Como rodar localmente

Como o projeto é estático, basta abrir `index.html` no navegador. Para evitar restrições de algumas APIs, o ideal é servir por um servidor local:

### Opção 1 — Live Server (VS Code / Cursor)

1. Instale a extensão **Live Server**.
2. Clique com o botão direito em `index.html` → **Open with Live Server**.

### Opção 2 — Python

```bash
cd jogo-matematica
python -m http.server 5500
# abra http://localhost:5500
```

### Opção 3 — Node (npx)

```bash
cd jogo-matematica
npx serve .
```

## Deploy

### Vercel

1. Suba o projeto para um repositório no GitHub.
2. No painel da Vercel: **Add New → Project → Import**.
3. **Framework Preset**: `Other`.
4. Deixe **Build Command** e **Output Directory** vazios.
5. Clique em **Deploy**.

> Também funciona em **GitHub Pages**, **Netlify** e **Cloudflare Pages** sem nenhuma configuração extra, porque é tudo arquivo estático.

## Personalização rápida

Quase tudo é controlado por constantes no topo de `script.js`:

```js
const INITIAL_SPEED = 130;     // velocidade inicial (ms entre frames)
const INITIAL_LIVES = 3;       // vidas iniciais
const GOAL_SCORE = 12;         // pontuação para vencer
const FOOD_EDGE_MARGIN = 2;    // margem mínima da comida em relação à borda
```

### Adicionando novas perguntas

Edite o objeto `QUESTIONS` em `script.js`. Cada pergunta tem o formato:

```js
{
  q: "Quantos arranjos de 7 elementos tomados 3 a 3?",
  options: ["35", "120", "210", "343"],
  correctIndex: 2, // índice da resposta correta (0..3)
  explanation: "A(7,3) = 7·6·5 = 210."
}
```

Há três níveis: `facil`, `medio` e `dificil`. Adicione quantas quiser em cada um.

### Trocar tempo do timer por dificuldade

```js
const TIMER_BY_DIFFICULTY = { facil: 15, medio: 12, dificil: 10 };
```

## Tecnologias

- **HTML5** + **CSS3** (paleta neon, glassmorphism, animações)
- **Canvas 2D** para o tabuleiro, cobrinha e partículas
- **WebAudio API** para os efeitos sonoros e música de fundo (sintetizados em tempo real, sem arquivos externos)
- **localStorage** para o recorde e o estado do mute
- **Google Fonts** (`Orbitron`, `Poppins`)

---

Feito como projeto educativo. Bons estudos e boa partida!
