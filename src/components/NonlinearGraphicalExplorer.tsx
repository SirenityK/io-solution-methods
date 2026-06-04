import { createMemo, createSignal, For, Index, Show } from "solid-js";
import {
  createNonlinearPlotModel,
  formatNonlinearExpression,
  formatNonlinearNumber,
  formatNonlinearPoint,
  type NonlinearConstraintInput,
  type NonlinearConstraintOperator,
  type NonlinearPlotState,
  type NonlinearProgramInput,
  type NonlinearProgramSolution,
  nonlinearPlotLineColors,
  solveNonlinearGraphicalProgram,
} from "../lib";
import { Katex } from "./katex";
import { MobileStepControls } from "./transportation/MobileStepControls";
import { StepControls } from "./transportation/StepControls";

type EditableNonlinearProblem = {
  sense: "max" | "min";
  objective: [number, number];
  constraints: NonlinearConstraintInput[];
};

type SolutionState =
  | Readonly<{ solution: NonlinearProgramSolution; error?: never }>
  | Readonly<{ solution?: never; error: string }>;

const exampleProblem: EditableNonlinearProblem = {
  sense: "max",
  objective: [4, 2],
  constraints: [
    {
      q1: 0,
      q2: 0,
      a: 1,
      b: 1,
      operator: "<=",
      c: 6,
      label: "x1 + x2 <= 6",
    },
    {
      q1: 1,
      q2: 1,
      a: 0,
      b: 0,
      operator: "<=",
      c: 25,
      label: "x1^2 + x2^2 <= 25",
    },
    { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0, label: "x1 >= 0" },
    { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0, label: "x2 >= 0" },
  ],
};

const cloneProblem = (
  problem: EditableNonlinearProblem,
): EditableNonlinearProblem => ({
  sense: problem.sense,
  objective: [...problem.objective],
  constraints: problem.constraints.map((constraint) => ({ ...constraint })),
});

const readNumberInput = (value: number): number | undefined =>
  Number.isFinite(value) ? value : undefined;

const selectInputValue = (input: HTMLInputElement): void => {
  input.select();
};

const toInput = (problem: EditableNonlinearProblem): NonlinearProgramInput => ({
  sense: problem.sense,
  objective: problem.objective,
  constraints: problem.constraints,
});

const resizeConstraints = (
  problem: EditableNonlinearProblem,
  count: number,
): EditableNonlinearProblem => ({
  ...problem,
  constraints: Array.from(
    { length: Math.min(Math.max(Math.trunc(count), 1), 8) },
    (_, index) =>
      problem.constraints[index] ?? {
        q1: 0,
        q2: 0,
        a: 0,
        b: 0,
        operator: "<=",
        c: 0,
      },
  ),
});

const latexExpression = (
  constraint: Pick<NonlinearConstraintInput, "q1" | "q2" | "a" | "b">,
): string =>
  formatNonlinearExpression(constraint)
    .replaceAll("x1^2", "x_1^2")
    .replaceAll("x2^2", "x_2^2")
    .replaceAll("x1", "x_1")
    .replaceAll("x2", "x_2");

const latexConstraint = (constraint: NonlinearConstraintInput): string => {
  const operator = constraint.operator
    .replace("<=", "\\le")
    .replace(">=", "\\ge");
  return `${latexExpression(constraint)} ${operator} ${formatNonlinearNumber(constraint.c)}`;
};

const statusLabel = (status: NonlinearProgramSolution["status"]): string => {
  switch (status) {
    case "optimal":
      return "óptimo";
    case "multiple-optimal":
      return "óptimos múltiples";
    case "unattained":
      return "valor límite";
    case "unbounded":
      return "no acotado";
    case "infeasible":
      return "infactible";
    case "no-attained-candidate":
      return "sin candidato alcanzado";
  }
};

const candidateSourceLabel = (
  source: NonlinearProgramSolution["candidates"][number]["source"],
): string => {
  switch (source) {
    case "origin":
      return "origen";
    case "axis":
      return "eje";
    case "intersection":
      return "intersección";
    case "objective-tangent":
      return "tangencia con Z";
  }
};

const objectiveBoundLatex = (solution: NonlinearProgramSolution): string =>
  solution.sense === "max" ? "Z_{\\max}" : "Z_{\\min}";

const objectiveValueLatex = (
  candidate: NonlinearProgramSolution["candidates"][number],
): string =>
  candidate.exactObjectiveLatex ??
  formatNonlinearNumber(candidate.objectiveValue);

const numericPointLatex = (
  point: NonlinearProgramSolution["candidates"][number]["point"],
): string =>
  `\\left(${formatNonlinearNumber(point.x1)},${formatNonlinearNumber(point.x2)}\\right)`;

const shouldShowPointApproximation = (
  candidate: NonlinearProgramSolution["candidates"][number],
): boolean =>
  candidate.exactPointLatex !== undefined &&
  candidate.exactPointLatex !== numericPointLatex(candidate.point);

const shouldShowObjectiveApproximation = (
  candidate: NonlinearProgramSolution["candidates"][number],
): boolean =>
  candidate.exactObjectiveLatex !== undefined &&
  candidate.exactObjectiveLatex !==
    formatNonlinearNumber(candidate.objectiveValue);

const optimumValueLatex = (
  solution: NonlinearProgramSolution,
  optimum: NonNullable<NonlinearProgramSolution["optimum"]>,
): string => {
  const exactValue = optimum.exactValueLatex;
  const numericValue = formatNonlinearNumber(optimum.value);
  const value = exactValue ?? numericValue;
  return exactValue && exactValue !== numericValue
    ? `${objectiveBoundLatex(solution)}=${value}\\approx ${numericValue}`
    : `${objectiveBoundLatex(solution)}=${value}`;
};

const Plot = (props: {
  solution: NonlinearProgramSolution;
  state: NonlinearPlotState;
}) => {
  const plot = createMemo(() =>
    createNonlinearPlotModel(props.solution, props.state),
  );
  return (
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body gap-4 p-4 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="card-title">{props.state.title}</h2>
            <p class="text-sm text-base-content/70">
              {props.state.description}
            </p>
          </div>
          <div class="badge badge-accent badge-outline">Curvas cuadráticas</div>
        </div>
        <div class="overflow-x-auto overscroll-x-contain bg-accent/10 dark:bg-neutral">
          <svg
            viewBox={`0 0 ${plot().width} ${plot().height}`}
            role="img"
            aria-label="Gráfica del método no lineal"
            class="min-h-80 w-full min-w-120 bg-base-200 sm:min-h-90 sm:min-w-155"
          >
            <defs>
              <marker
                id="nonlinear-arrow"
                markerWidth="10"
                markerHeight="10"
                refX="7"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L8,3 z" class="fill-base-content" />
              </marker>
            </defs>
            <For each={plot().gridLines}>
              {(gridLine) => (
                <line
                  x1={gridLine.from.x}
                  y1={gridLine.from.y}
                  x2={gridLine.to.x}
                  y2={gridLine.to.y}
                  class="stroke-base-300/80 dark:stroke-base-content/15"
                />
              )}
            </For>
            <For each={plot().feasibleSamples}>
              {(sample) => (
                <circle
                  cx={sample.x}
                  cy={sample.y}
                  r="3.5"
                  class="fill-accent/20"
                />
              )}
            </For>
            <Show when={plot().xAxis}>
              {(axis) => (
                <line
                  x1={axis().from.x}
                  y1={axis().from.y}
                  x2={axis().to.x}
                  y2={axis().to.y}
                  class="stroke-base-content"
                  stroke-width="2"
                  marker-end="url(#nonlinear-arrow)"
                />
              )}
            </Show>
            <Show when={plot().yAxis}>
              {(axis) => (
                <line
                  x1={axis().from.x}
                  y1={axis().from.y}
                  x2={axis().to.x}
                  y2={axis().to.y}
                  class="stroke-base-content"
                  stroke-width="2"
                  marker-end="url(#nonlinear-arrow)"
                />
              )}
            </Show>
            <For each={plot().xTicks}>
              {(tick) => (
                <text
                  x={tick.point.x + 4}
                  y={Math.min(
                    Math.max(tick.point.y + 18, 18),
                    plot().height - 4,
                  )}
                  class="fill-base-content/70 text-[11px]"
                >
                  {formatNonlinearNumber(tick.value)}
                </text>
              )}
            </For>
            <For each={plot().yTicks}>
              {(tick) => (
                <text
                  x={Math.min(Math.max(tick.point.x + 8, 8), plot().width - 36)}
                  y={tick.point.y - 4}
                  class="fill-base-content/70 text-[11px]"
                >
                  {formatNonlinearNumber(tick.value)}
                </text>
              )}
            </For>
            <text
              x={plot().width - 28}
              y="24"
              class="fill-base-content text-sm font-bold"
            >
              x₁
            </text>
            <text x="16" y="24" class="fill-base-content text-sm font-bold">
              x₂
            </text>
            <For each={plot().curves}>
              {(curve) => (
                <>
                  <For each={curve.paths}>
                    {(path) => (
                      <path
                        d={path}
                        stroke={curve.color}
                        stroke-width="4"
                        stroke-dasharray={curve.isDashed ? "10 8" : undefined}
                        fill="none"
                      />
                    )}
                  </For>
                  <text
                    x={curve.labelPoint.x}
                    y={curve.labelPoint.y}
                    fill={curve.color}
                    class="text-sm font-black"
                  >
                    {curve.label}
                  </text>
                </>
              )}
            </For>
            <For each={plot().candidates}>
              {(candidate) => (
                <Show when={candidate.isVisible}>
                  <circle
                    cx={candidate.screenPoint.x}
                    cy={candidate.screenPoint.y}
                    r={candidate.isHighlighted ? 7 : 5}
                    class={
                      candidate.isHighlighted
                        ? "fill-base-content stroke-base-100"
                        : "fill-base-content/70 stroke-base-100"
                    }
                    stroke-width="2"
                  />
                  <text
                    x={candidate.screenPoint.x + 9}
                    y={candidate.screenPoint.y - 9}
                    class="fill-base-content text-base font-black"
                  >
                    {candidate.name}
                  </text>
                </Show>
              )}
            </For>
          </svg>
        </div>
        <div class="flex flex-wrap gap-2">
          <For each={props.state.visibleConstraintIndexes}>
            {(constraintIndex) => (
              <div class="badge badge-accent badge-soft gap-2">
                <span
                  class="inline-block h-3 w-3 rounded-full"
                  style={{
                    "background-color":
                      nonlinearPlotLineColors[
                        constraintIndex % nonlinearPlotLineColors.length
                      ],
                  }}
                />
                R{constraintIndex + 1}:{" "}
                {props.solution.constraints[constraintIndex].label}
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};

const ProblemEditor = (props: {
  problem: EditableNonlinearProblem;
  onProblemChange: (problem: EditableNonlinearProblem) => void;
  onReset: () => void;
}) => {
  const changeConstraint = (
    index: number,
    change: Partial<NonlinearConstraintInput>,
  ) => {
    const next = cloneProblem(props.problem);
    next.constraints[index] = { ...next.constraints[index], ...change };
    props.onProblemChange(next);
  };
  const changeConstraintNumber = (
    index: number,
    key: "q1" | "q2" | "a" | "b" | "c",
    value: number,
  ) => {
    const nextValue = readNumberInput(value);
    if (nextValue !== undefined) {
      changeConstraint(index, { [key]: nextValue });
    }
  };
  return (
    <div class="card bg-base-100 shadow">
      <div class="card-body gap-4 p-4 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="card-title">Problema editable</h2>
            <p class="text-sm text-base-content/70">
              Cada restricción usa la forma{" "}
              <Katex math="q_1x_1^2+q_2x_2^2+ax_1+bx_2\;\mathrm{op}\;c" />.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-outline sm:btn-sm"
            onClick={props.onReset}
          >
            Restaurar ejemplo
          </button>
        </div>
        <div class="grid gap-3 md:grid-cols-[10rem_1fr_1fr_10rem]">
          <label class="form-control space-x-2">
            <span class="label-text">Tipo</span>
            <select
              class="select select-bordered"
              value={props.problem.sense}
              onChange={(event) =>
                props.onProblemChange({
                  ...cloneProblem(props.problem),
                  sense: event.currentTarget.value === "min" ? "min" : "max",
                })
              }
            >
              <option value="max">Maximizar</option>
              <option value="min">Minimizar</option>
            </select>
          </label>
          <Index each={props.problem.objective}>
            {(coefficient, index) => (
              <label class="form-control space-x-2">
                <span class="label-text">Coeficiente c{index + 1}</span>
                <input
                  type="number"
                  inputmode="decimal"
                  class="input input-bordered font-mono"
                  value={coefficient()}
                  onFocus={(event) => selectInputValue(event.currentTarget)}
                  onInput={(event) => {
                    const nextValue = readNumberInput(
                      event.currentTarget.valueAsNumber,
                    );
                    if (nextValue === undefined) return;
                    const next = cloneProblem(props.problem);
                    next.objective[index] = nextValue;
                    props.onProblemChange(next);
                  }}
                />
              </label>
            )}
          </Index>
          <label class="form-control space-x-2">
            <span class="label-text">Restricciones</span>
            <input
              type="number"
              min="1"
              max="8"
              inputmode="numeric"
              class="input input-bordered font-mono"
              value={props.problem.constraints.length}
              onFocus={(event) => selectInputValue(event.currentTarget)}
              onInput={(event) => {
                const nextValue = readNumberInput(
                  event.currentTarget.valueAsNumber,
                );
                if (nextValue !== undefined)
                  props.onProblemChange(
                    resizeConstraints(props.problem, nextValue),
                  );
              }}
            />
          </label>
        </div>
        <div class="overflow-x-auto overscroll-x-contain rounded-box border border-base-300">
          <table class="table table-xs min-w-max sm:table-sm">
            <thead>
              <tr>
                <th>R</th>
                <th>q1</th>
                <th>q2</th>
                <th>a</th>
                <th>b</th>
                <th>Relación</th>
                <th>c</th>
              </tr>
            </thead>
            <tbody>
              <Index each={props.problem.constraints}>
                {(constraint, index) => (
                  <tr>
                    <th>R{index + 1}</th>
                    <For each={["q1", "q2", "a", "b"] as const}>
                      {(key) => (
                        <td>
                          <input
                            type="number"
                            inputmode="decimal"
                            class="input input-bordered h-11 w-20 text-center font-mono sm:input-sm sm:h-8 sm:text-right"
                            value={constraint()[key]}
                            onFocus={(event) =>
                              selectInputValue(event.currentTarget)
                            }
                            onInput={(event) =>
                              changeConstraintNumber(
                                index,
                                key,
                                event.currentTarget.valueAsNumber,
                              )
                            }
                          />
                        </td>
                      )}
                    </For>
                    <td>
                      <select
                        class="select select-bordered h-11 sm:select-sm sm:h-8"
                        value={constraint().operator}
                        onChange={(event) =>
                          changeConstraint(index, {
                            operator: event.currentTarget
                              .value as NonlinearConstraintOperator,
                          })
                        }
                      >
                        <option value="<=">{"<="}</option>
                        <option value=">=">{">="}</option>
                        <option value="=">=</option>
                        <option value="<">&lt;</option>
                        <option value=">">&gt;</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        inputmode="decimal"
                        class="input input-bordered h-11 w-20 text-center font-mono sm:input-sm sm:h-8 sm:text-right"
                        value={constraint().c}
                        onFocus={(event) =>
                          selectInputValue(event.currentTarget)
                        }
                        onInput={(event) =>
                          changeConstraintNumber(
                            index,
                            "c",
                            event.currentTarget.valueAsNumber,
                          )
                        }
                      />
                    </td>
                  </tr>
                )}
              </Index>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Notebook = (props: {
  solution: NonlinearProgramSolution;
  currentStep: number;
}) => {
  const constraintCount = () => props.solution.constraints.length;
  return (
    <div class="card bg-base-100 shadow">
      <div class="card-body gap-4 p-4 sm:p-6">
        <Show
          when={props.currentStep > 0}
          fallback={
            <>
              <h2 class="card-title">Planteamiento</h2>
              <Katex
                as="p"
                displayMode
                math={`Z=${formatNonlinearNumber(props.solution.objective[0])}x_1+${formatNonlinearNumber(props.solution.objective[1])}x_2`}
              />
              <For each={props.solution.constraints}>
                {(constraint) => (
                  <Katex
                    displayMode
                    math={latexConstraint(constraint.original)}
                  />
                )}
              </For>
            </>
          }
        >
          <Show
            when={props.currentStep <= constraintCount()}
            fallback={
              <>
                <h2 class="card-title">Candidatos y función objetivo</h2>
                <p>
                  Se evalúa cada candidato en la función objetivo y se compara
                  el valor de Z.
                </p>
                <div class="overflow-x-auto rounded-box border border-base-300">
                  <table class="table table-xs min-w-max sm:table-sm">
                    <thead>
                      <tr>
                        <th>Punto</th>
                        <th>Coordenadas</th>
                        <th>Origen</th>
                        <th>Z</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={props.solution.candidates}>
                        {(candidate) => (
                          <tr
                            class={
                              props.solution.optimum?.points.some(
                                (point) => point.name === candidate.name,
                              )
                                ? "bg-primary/10"
                                : undefined
                            }
                          >
                            <th>{candidate.name}</th>
                            <td>
                              <Show
                                when={candidate.exactPointLatex}
                                fallback={formatNonlinearPoint(candidate.point)}
                              >
                                {(exactPoint) => (
                                  <div class="space-y-1">
                                    <Katex as="p" math={exactPoint()} />
                                    <Show
                                      when={shouldShowPointApproximation(
                                        candidate,
                                      )}
                                    >
                                      <div class="text-base-content/60 text-xs">
                                        ≈{" "}
                                        {formatNonlinearPoint(candidate.point)}
                                      </div>
                                    </Show>
                                  </div>
                                )}
                              </Show>
                            </td>
                            <td>{candidateSourceLabel(candidate.source)}</td>
                            <td>
                              <div class="space-y-1">
                                <Katex
                                  as="p"
                                  math={`Z=${objectiveValueLatex(candidate)}`}
                                />
                                <Show
                                  when={shouldShowObjectiveApproximation(
                                    candidate,
                                  )}
                                >
                                  <div class="text-base-content/60 text-xs">
                                    ≈{" "}
                                    {formatNonlinearNumber(
                                      candidate.objectiveValue,
                                    )}
                                  </div>
                                </Show>
                              </div>
                            </td>
                            <td>
                              {candidate.isIncluded
                                ? "alcanzable"
                                : "solo límite"}
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
                <Show when={props.solution.optimum}>
                  {(optimum) => (
                    <div class="alert alert-success alert-soft">
                      <div class="space-y-3">
                        <p class="font-semibold text-lg">
                          El {optimum().boundName} se obtiene en el candidato{" "}
                          {optimum()
                            .points.map((point) => point.name)
                            .join(", ")}
                          .
                        </p>
                        <For each={optimum().points}>
                          {(point) => (
                            <div class="space-y-2">
                              <Katex
                                displayMode
                                math={`${point.name}=${point.exactPointLatex ?? formatNonlinearPoint(point.point)}`}
                              />
                              <Show when={point.derivation}>
                                {(derivation) => (
                                  <div class="rounded-box bg-base-100/80 p-3 text-sm">
                                    <p class="font-semibold">
                                      Proceso algebraico
                                    </p>
                                    <p class="text-base-content/75">
                                      Se intersectan las fronteras activas, se
                                      despeja una variable, se sustituye en la
                                      curva y se resuelve la cuadrática.
                                    </p>
                                    <div class="mt-2 grid gap-2">
                                      <For each={derivation().steps}>
                                        {(step) => (
                                          <Katex
                                            as="p"
                                            displayMode
                                            math={step}
                                          />
                                        )}
                                      </For>
                                    </div>
                                  </div>
                                )}
                              </Show>
                            </div>
                          )}
                        </For>
                        <Katex
                          displayMode
                          math={optimumValueLatex(props.solution, optimum())}
                        />
                      </div>
                    </div>
                  )}
                </Show>
              </>
            }
          >
            {(() => {
              const constraint =
                props.solution.constraints[props.currentStep - 1];
              return (
                <>
                  <h2 class="card-title">Restricción {props.currentStep}</h2>
                  <Katex
                    displayMode
                    math={latexConstraint(constraint.original)}
                  />
                  <p>{constraint.description}</p>
                  <p>
                    La frontera se obtiene cambiando la relación por igualdad:
                  </p>
                  <Katex
                    displayMode
                    math={`${latexExpression(constraint.original)}=${formatNonlinearNumber(constraint.original.c)}`}
                  />
                  <p>
                    Se dibuja como línea{" "}
                    {constraint.boundaryIncluded ? "continua" : "punteada"};{" "}
                    {constraint.boundaryIncluded
                      ? "la frontera sí cuenta."
                      : "la frontera solo marca un límite, pero no se alcanza."}
                  </p>
                  <Show when={constraint.axisIntersections.length > 0}>
                    <div class="rounded-box border border-base-300 bg-base-200/70 p-3">
                      <p class="font-semibold">Interceptos con ejes</p>
                      <p class="text-base-content/75 text-sm">
                        Para encontrarlos se fija una variable en cero y se
                        resuelve la ecuación resultante.
                      </p>
                      <div class="mt-3 grid gap-3 md:grid-cols-2">
                        <For each={constraint.axisIntersections}>
                          {(intersection) => (
                            <div class="rounded-box bg-base-100 p-3">
                              <Katex
                                displayMode
                                math={
                                  intersection.exactPointLatex ??
                                  formatNonlinearPoint(intersection.point)
                                }
                              />
                              <For each={intersection.derivation.steps}>
                                {(step) => <Katex displayMode math={step} />}
                              </For>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                </>
              );
            })()}
          </Show>
        </Show>
      </div>
    </div>
  );
};

const QuickReading = (props: {
  solution: NonlinearProgramSolution;
  currentStep: number;
}) => (
  <div class="card bg-base-200">
    <div class="card-body gap-3">
      <h2 class="card-title">Lectura rápida</h2>
      <div class="flex flex-wrap gap-2">
        <div class="badge badge-secondary badge-soft">
          Estado: {statusLabel(props.solution.status)}
        </div>
        <div class="badge badge-outline">Paso {props.currentStep}</div>
      </div>
      <div class="space-y-2 border-base-content/10 border-t pt-3">
        <For each={props.solution.steps}>
          {(step) => <p class="text-sm text-base-content/75">{step}</p>}
        </For>
      </div>
      <For each={props.solution.notes}>
        {(note) => (
          <div class="alert alert-warning text-sm">
            <span>{note}</span>
          </div>
        )}
      </For>
    </div>
  </div>
);

export const NonlinearGraphicalExplorer = () => {
  const [problem, setProblem] = createSignal<EditableNonlinearProblem>(
    cloneProblem(exampleProblem),
  );
  const [selectedStep, setSelectedStep] = createSignal(0);
  const solutionState = createMemo<SolutionState>(() => {
    try {
      return {
        solution: solveNonlinearGraphicalProgram(toInput(problem())),
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo resolver el problema no lineal.",
      };
    }
  });
  const maxStep = createMemo(() =>
    Math.max((solutionState().solution?.plotStates.length ?? 1) - 1, 0),
  );
  const currentPlotState = createMemo(
    () =>
      solutionState().solution?.plotStates[Math.min(selectedStep(), maxStep())],
  );
  const changeProblem = (nextProblem: EditableNonlinearProblem) => {
    setProblem(nextProblem);
    setSelectedStep(0);
  };
  const goToStep = (step: number) =>
    setSelectedStep(Math.min(Math.max(step, 0), maxStep()));

  return (
    <div class="mx-auto max-w-7xl px-4 pt-8 pb-28 lg:pb-8">
      <section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="min-w-0 space-y-4">
          <div class="rounded-box bg-linear-to-br from-accent/10 via-base-200 to-secondary/10 p-6">
            <div class="badge badge-accent badge-outline">
              Programación no lineal
            </div>
            <h1 class="mt-3 text-3xl font-bold md:text-4xl">
              Método gráfico con restricciones cuadráticas
            </h1>
            <p class="mt-3 max-w-3xl text-base-content/75">
              Se dibujan rectas y curvas, se revisan intersecciones, tangencias
              e interceptos, y se evalúa la función objetivo paso a paso.
            </p>
          </div>
          <ProblemEditor
            problem={problem()}
            onProblemChange={changeProblem}
            onReset={() => changeProblem(cloneProblem(exampleProblem))}
          />
          <Show
            when={solutionState().solution && currentPlotState()}
            fallback={
              <div class="alert alert-error">
                <span>{solutionState().error}</span>
              </div>
            }
          >
            <Plot
              solution={solutionState().solution as NonlinearProgramSolution}
              state={currentPlotState() as NonlinearPlotState}
            />
            <Notebook
              solution={solutionState().solution as NonlinearProgramSolution}
              currentStep={selectedStep()}
            />
          </Show>
        </div>
        <aside class="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div class="hidden lg:block">
            <StepControls
              currentStep={selectedStep()}
              maxStep={maxStep()}
              onStepChange={goToStep}
            />
          </div>
          <Show when={solutionState().solution}>
            <QuickReading
              solution={solutionState().solution as NonlinearProgramSolution}
              currentStep={selectedStep()}
            />
          </Show>
        </aside>
      </section>
      <MobileStepControls
        currentStep={selectedStep()}
        maxStep={maxStep()}
        onStepChange={goToStep}
      />
    </div>
  );
};
