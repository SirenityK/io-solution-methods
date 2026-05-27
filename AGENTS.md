# "Investigacion de operaciones" solution methods

This webpage contents shall be made in Spanish (MX)

This website is a static site that offers very verbose step-by-step solutions of multiple algorithms, adapted to a special class in TecNM. The webpage contents shall be made in Spanish (MX).

The proven examples in Python live in `./scripts`. Use them as reference material when porting or validating algorithms, but the frontend must not reimplement algorithm logic by hand. The TypeScript source of truth for executable solution logic lives in `src/lib`.

Step-by-step solution logic shall be produced by pure TypeScript functions in `src/lib` that return structured data:

- final result values, such as allocation matrices, simplex tables, objective values, basis, total cost, status, and optimality;
- ordered `steps` records with enough data for a verbose end-user explanation in Spanish (MX);
- iteration-level traces for algorithms that pivot, optimize, or repeat calculations.

The current library includes these base algorithms:

- `transportation.ts`: balancing supply/demand, Northwest Corner, Least Cost, Vogel Approximation, MODI optimization, cycle finding, degeneracy handling, and transportation total cost.
- `simplex.ts`: tabular simplex iterations, relative profits, pivot selection, unbounded detection, alternate solution detection, objective value, and final basis.

When building frontend step-by-step pages, consume the structured outputs from `src/lib` and transform them into Spanish explanations. Do not duplicate calculations in components. Components may format, label, highlight, and narrate, but algorithm decisions must stay inside `src/lib`.

## Transportation step-by-step UI architecture

The accepted baseline for `/transporte` is the current transportation page with Least Cost, Northwest Corner, and Vogel Approximation. Future transportation algorithms should reuse the same layout and component architecture instead of creating separate page structures.

Transportation algorithm traces must remain in `src/lib/transportation.ts`. If a page needs to show intermediate visual state, extend the relevant library result with typed trace data such as remaining supply/demand, active rows/columns, selected cells, allocation snapshots, basis snapshots, penalties, cycles, theta values, or MODI potentials. Do not infer these decisions inside Solid components.

The current step-by-step transportation trace pattern is:

- each assignment step exposes the selected row/column, assigned amount, selected cost, supply/demand before and after the assignment, active rows/columns after the assignment, an allocation snapshot, a basis snapshot, and flags for exhausted origins or satisfied destinations;
- Northwest Corner additionally exposes the next movement direction (`down`, `right`, or `diagonal`);
- Least Cost exposes the lowest active cost decision for each assignment;
- Vogel exposes row and column penalties for each iteration, the chosen axis, selected penalty, selected row/column, and the resulting assignment.

Tests should verify these trace records when the UI explanation depends on them, not only the final allocation and total cost.

Reusable transportation UI lives in `src/components/transportation/`:

- `TransportationMethodLayout` owns the common two-column desktop layout, right-side sticky step controls, and mobile bottom step controls.
- `TransportationTable` owns the reusable cost/allocation table rendering, selected-cell highlighting, inactive row/column styling, and crossed-out satisfied supply/demand.
- `TransportationProblemEditor` owns user-editable transportation inputs: cost matrix, supply, demand, number of origins, number of destinations, and reset-to-example behavior.
- `StepControls` and `MobileStepControls` own step navigation behavior.
- `TransportationMethodHeader` owns the method title and algorithm selector shell.
- Method-specific explanation components, such as `LeastCostStepExplanation`, `NorthwestCornerStepExplanation`, and `VogelStepExplanation`, should only narrate and format trace data that already came from `src/lib`.
- Shared table/view types should live in `src/components/transportation/types.ts`.

For transportation pages, prefer a single table that changes in place as the user advances steps. When an algorithm causes many values or the whole conceptual table to change, it is acceptable to render an additional table below, matching the explicit printed style used in `scripts/supply_demand.py`. Penalties should appear as colored text below their corresponding rows or columns. Supply and demand values that are exhausted or satisfied should be crossed out instead of removed.

Transportation inputs must be user-editable rather than hardcoded. The user should be able to change every cost, supply, and demand value, and should also be able to choose the number of origins and destinations. When resizing the matrix, preserve existing values by row/column position and initialize new cells, supplies, or demands to `0`. Continue to rely on `src/lib/transportation.ts` for balancing; when totals are unbalanced, the displayed solution table may include the dummy origin or destination returned by the library.

Mobile input ergonomics matter for the transportation editor. Use index-stable rendering for editable numeric cells so mobile keyboards do not close after the first typed digit. Numeric fields should select their existing value on focus, use a numeric input mode, and avoid text alignment or spacing that puts the number against the input border on mobile. If labels and inputs can align horizontally on wider screens, keep enough gap/padding between labels and controls.

Desktop views should keep step navigation available while scrolling by using the shared sticky right panel. Mobile views should keep compact previous/next step controls fixed at the bottom, with enough bottom padding so controls do not cover content.

Write multiple tests/examples so the implemented algorithms are validated against the Python references and known class examples. Tests should verify both final answers and important intermediate behavior when it affects the explanation shown to the user.

The website has its own strict implementation on typescript, ensuring maximum typesafety with type-fest and simple enough reactivity with SolidJS. Styling with TailwindCSS and DaisyUI.

DaisyUI is the primary UI layer. Prefer DaisyUI component, part, modifier, color, and size classes for interface elements such as navbars, menus, buttons, cards, stats, badges, alerts, forms, tables, tabs, footers, and layout shells. Use TailwindCSS utility classes mainly for responsive layout, spacing, sizing, and small adjustments that DaisyUI does not cover. Only build custom component styling when DaisyUI lacks an appropriate component or behavior. When in doubt, consult the official DaisyUI LLM reference at `https://daisyui.com/llms.txt`.

The project uses bun and its scripts are listed on the package.json file.

dev, build and preview scripts.
autofix: biome check --fix
format: biome format --write
check: biome check

This project is using BiomeJS as well, so each time the agent makes changes to the project, it shall format, check, and fix accordingly.

Ensure strict typing both in code and `tsconfig.json`.

Always ensure there are no warnings or errors marked by biome when finishing your code, fix and reiterate before saying "finished".
