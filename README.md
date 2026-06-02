# IO Solution Methods — Métodos de Solución de Investigación de Operaciones

Interactive educational static site for Operations Research solution methods, built for TecNM. Explains transportation problem algorithms, the simplex method, and the graphical LP method step-by-step in Spanish (MX).

## Tech Stack

| Technology | Role |
|---|---|
| **Astro** 6 | Static site generation |
| **SolidJS** 1.9 | Reactive frontend components |
| **TailwindCSS** 4 + **DaisyUI** 5 | Styling and UI components |
| **KaTeX** 0.17 | Mathematical notation rendering |
| **D3.js** 7 | SVG plots (graphical LP) |
| **BiomeJS** 2 | Linting, formatting, and checking |
| **Bun** | Package manager, dev server, test runner |

## Algorithms

- **Transportation Problem** — Northwest Corner, Least Cost, Vogel Approximation, MODI optimization, cycle finding
- **Simplex Method** — Tabular tableau iterations, pivot selection, unbounded/alternate solution detection
- **Graphical LP** — Two-variable LP with interactive constraint plot, vertex analysis, and feasibility checking

All execution logic lives in pure TypeScript functions in `src/lib/` that produce structured typed data and ordered step traces. Components consume that data and produce Spanish explanations.

## Project Structure

```
src/
├── lib/               # Algorithm source of truth (TypeScript)
│   ├── transportation.ts
│   ├── simplex.ts
│   ├── graphical-lp.ts
│   └── graphical-lp-plot.ts
├── components/        # SolidJS UI components
│   ├── transportation/
│   ├── simplex/
│   ├── GraphicalLpExplorer.tsx
│   └── SimplexExplorer.tsx
├── pages/             # Astro routes
│   ├── index.astro           # /
│   ├── transporte.astro      # /transporte
│   ├── simplex.astro         # /simplex
│   └── grafico.astro         # /grafico
├── layouts/
│   └── BaseLayout.astro
└── styles/
    └── global.css
scripts/               # Python reference implementations
```

## Commands

| Command | Action |
|---|---|
| `bun install` | Install dependencies |
| `bun dev` | Start dev server at `localhost:4321` |
| `bun build` | Build production site to `./dist/` |
| `bun preview` | Preview production build locally |
| `bun test` | Run test suite (Bun) |
| `bun check` | Biome check |
| `bun autofix` | Biome check --fix |
| `bun format` | Biome format --write |
