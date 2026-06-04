# IO Solution Methods

This project is an interactive static site for learning Operations Research solution methods in Spanish (MX), with examples and explanations adapted to a TecNM class.

Its goal is to make each method feel like a careful classroom walkthrough: the user edits a problem, advances through the solution, and sees the important decisions, calculations, tables, plots, candidates, and final result without hidden jumps.

The site currently focuses on:

- Transportation problems: Northwest Corner, Least Cost, Vogel Approximation, and MODI-style optimization support.
- Tabular simplex: tableau iterations, pivot decisions, final basis, objective value, and special statuses.
- Graphical linear programming: two-variable feasible regions, constraint analysis, vertices, objective evaluation, and geometric status detection.
- Graphical nonlinear programming: two-variable problems with linear and quadratic-style constraints, candidate derivations, tangencies, strict boundaries, and exact-value explanations where useful.

Executable solution logic lives in typed TypeScript functions under `src/lib`. The frontend consumes those structured results and turns them into Spanish step-by-step explanations with Astro, SolidJS, TailwindCSS, DaisyUI, KaTeX, and D3.

Python scripts in `scripts` are reference material for known examples and validation; the frontend should rely on the TypeScript library logic rather than duplicating algorithm decisions in UI components.

## Development

Use the package scripts for local work:

- `bun dev` starts the development server.
- `bun build` builds the static site.
- `bun preview` previews the production build.
- `bun test` runs the Bun test suite.
- `bun check`, `bun autofix`, and `bun format` run Biome checks and formatting.
