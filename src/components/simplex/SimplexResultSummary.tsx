import { For } from "solid-js";
import type { SimplexTableauSolution } from "../../lib";
import { formatNumber } from "./SimplexTable";

type SimplexResultSummaryProps = Readonly<{
  isComplete: boolean;
  solution: SimplexTableauSolution;
  decisionVariableNames: readonly string[];
}>;

export const SimplexResultSummary = (props: SimplexResultSummaryProps) => {
  const decisionValues = () =>
    props.solution.variables.filter((variable) =>
      props.decisionVariableNames.includes(variable.name),
    );

  return (
    <div class="card bg-base-100 shadow">
      <div class="card-body gap-3">
        <h2 class="card-title">Conclusión</h2>
        <div class="stats stats-vertical bg-base-200">
          <div class="stat">
            <div class="stat-title">Estado</div>
            <div class="stat-value text-2xl">
              {props.solution.status === "optimal" ? "Óptimo" : "No acotado"}
            </div>
            <div class="stat-desc">
              {props.isComplete
                ? "Paso final seleccionado"
                : "Avanza hasta el último paso"}
            </div>
          </div>
          <div class="stat">
            <div class="stat-title">Valor objetivo</div>
            <div class="stat-value text-primary text-2xl">
              {formatNumber(props.solution.objectiveValue)}
            </div>
          </div>
        </div>

        <div class="rounded-box bg-base-200 p-3">
          <div class="text-sm font-semibold">Variables de decisión</div>
          <div class="mt-2 flex flex-wrap gap-2">
            <For each={decisionValues()}>
              {(variable) => (
                <span class="badge badge-outline">
                  {variable.name} = {formatNumber(variable.value)}
                </span>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
};
