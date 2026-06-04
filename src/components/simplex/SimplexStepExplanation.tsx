import { For, Show } from "solid-js";
import type {
  SimplexTableauIteration,
  SimplexTableauSolution,
} from "../../lib";
import { formatNumber } from "./SimplexTable";

type SimplexStepExplanationProps = Readonly<{
  currentStep: number;
  iteration?: SimplexTableauIteration;
  solution: SimplexTableauSolution;
}>;

const getConstraintRows = (iteration: SimplexTableauIteration) =>
  iteration.tableauBefore.filter((row) => !row.isObjective);

const getRowLabel = (
  row: number,
  iteration: SimplexTableauIteration,
): string =>
  iteration.tableauBefore[row]?.isObjective ? "fila objetivo" : `R${row + 1}`;

const getOperationReason = (
  operation: SimplexTableauIteration["rowOperations"][number],
  iteration: SimplexTableauIteration,
): string => {
  if (operation.kind === "normalize") {
    return `El pivote vale ${formatNumber(operation.sourceCoefficient)}, así que ${operation.description} para convertirlo en 1.`;
  }
  const action = operation.sourceCoefficient > 0 ? "resta" : "suma";
  return `En ${getRowLabel(operation.row, iteration)} hay ${formatNumber(operation.sourceCoefficient)} en la columna pivote; se ${action} un múltiplo de R${operation.pivotRow + 1} para dejar ese valor en 0.`;
};

export const SimplexStepExplanation = (props: SimplexStepExplanationProps) => (
  <div class="card bg-base-200">
    <div class="card-body gap-4 p-4 sm:p-6">
      <div>
        <div class="badge badge-primary badge-outline">
          {props.currentStep === 0
            ? "Preparación"
            : `Iteración ${props.currentStep}`}
        </div>
        <h2 class="card-title mt-3">Procedimiento</h2>
      </div>

      <Show
        when={props.iteration}
        fallback={
          <div class="space-y-3">
            <p>
              Se agregan variables de holgura para convertir cada restricción
              menor o igual en una ecuación.
            </p>
            <p>
              Después se escribe la función objetivo con todas las variables del
              lado izquierdo: los coeficientes de decisión quedan negativos y la
              columna {props.solution.columns.at(-1)} queda con coeficiente 1.
            </p>
          </div>
        }
      >
        {(iteration) => (
          <div class="space-y-3">
            <p>
              Se revisa la fila objetivo. Para maximizar, una entrada negativa
              todavía permite mejorar; por eso se busca el indicador más
              negativo.
            </p>

            <div class="rounded-box bg-base-100 p-3">
              <div class="text-sm font-semibold">
                Indicadores de la fila objetivo
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <For each={iteration().objectiveIndicators}>
                  {(indicator, column) => (
                    <span
                      class="badge"
                      classList={{
                        "badge-primary": iteration().pivot?.column === column(),
                        "badge-ghost": iteration().pivot?.column !== column(),
                      }}
                    >
                      {props.solution.columns[column()]}:{" "}
                      {formatNumber(indicator)}
                    </span>
                  )}
                </For>
              </div>
            </div>

            <Show
              when={iteration().pivot}
              fallback={
                <div class="space-y-3">
                  <p>
                    {props.solution.status === "unbounded"
                      ? "Hay un indicador negativo, pero en su columna no aparece ningún coeficiente positivo en las restricciones. No se puede escoger fila pivote, así que el problema es no acotado."
                      : "No queda ningún indicador negativo en la fila objetivo. Eso significa que ninguna variable puede entrar para mejorar más el valor de la función objetivo."}
                  </p>
                  <Show when={props.solution.status === "optimal"}>
                    <div class="rounded-box bg-base-100 p-3">
                      <div class="text-sm font-semibold">
                        Lectura de variables básicas
                      </div>
                      <ul class="mt-2 space-y-1 text-sm">
                        <For
                          each={props.solution.variables.filter(
                            (variable) => variable.isBasic,
                          )}
                        >
                          {(variable) => (
                            <li>
                              {variable.name} tiene columna identidad y se lee
                              como {formatNumber(variable.value)} en B.
                            </li>
                          )}
                        </For>
                      </ul>
                    </div>
                  </Show>
                </div>
              }
            >
              {(pivot) => (
                <>
                  <p>
                    El indicador más negativo es{" "}
                    {formatNumber(
                      iteration().objectiveIndicators[pivot().column] ?? 0,
                    )}{" "}
                    en la columna {pivot().enteringVariable}; por eso esa
                    variable entra a la base.
                  </p>

                  <div class="rounded-box bg-base-100 p-3">
                    <div class="text-sm font-semibold">
                      Prueba de cocientes para elegir fila
                    </div>
                    <p class="mt-2 text-sm text-base-content/75">
                      Se divide cada valor de B entre el coeficiente positivo de
                      la columna {pivot().enteringVariable}. Los coeficientes
                      cero o negativos no participan porque no limitan el
                      avance.
                    </p>
                    <div class="mt-2 space-y-2 text-sm">
                      <For each={getConstraintRows(iteration())}>
                        {(row, rowIndex) => {
                          const coefficient = row.values[pivot().column] ?? 0;
                          const ratio = iteration().ratios[rowIndex()];
                          return (
                            <div class="flex items-center justify-between gap-3">
                              <span>
                                R{rowIndex() + 1}: {formatNumber(row.rhs)} /{" "}
                                {formatNumber(coefficient)}
                              </span>
                              <span
                                class="badge"
                                classList={{
                                  "badge-warning": pivot().row === rowIndex(),
                                  "badge-ghost": pivot().row !== rowIndex(),
                                }}
                              >
                                {ratio === null
                                  ? "No aplica"
                                  : formatNumber(ratio)}
                              </span>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                    <p class="mt-3 text-sm">
                      El menor cociente positivo es{" "}
                      {formatNumber(iteration().ratios[pivot().row] ?? 0)} en R
                      {pivot().row + 1}; por eso sale {pivot().leavingVariable}.
                      El pivote es la intersección de esa fila con la columna{" "}
                      {pivot().enteringVariable}: {formatNumber(pivot().value)}.
                    </p>
                  </div>

                  <div class="rounded-box bg-base-100 p-3">
                    <div class="text-sm font-semibold">
                      Normalizar la fila pivote
                    </div>
                    <p class="mt-2 text-sm">
                      La fila pivote se divide entre{" "}
                      {formatNumber(pivot().value)} para que el pivote se
                      convierta en 1. Esa fila será la nueva fila básica de{" "}
                      {pivot().enteringVariable}.
                    </p>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <For each={iteration().normalizedPivotRow ?? []}>
                        {(value, column) => (
                          <span class="badge badge-ghost">
                            {column() < props.solution.columns.length
                              ? props.solution.columns[column()]
                              : "B"}
                            : {formatNumber(value)}
                          </span>
                        )}
                      </For>
                    </div>
                  </div>

                  <div class="rounded-box bg-base-100 p-3">
                    <div class="text-sm font-semibold">
                      Hacer ceros en la columna pivote
                    </div>
                    <p class="mt-2 text-sm text-base-content/75">
                      La meta es que la columna {pivot().enteringVariable} quede
                      como columna identidad: 1 en la fila pivote y 0 en las
                      demás filas.
                    </p>
                    <ul class="mt-2 space-y-2 text-sm">
                      <For each={iteration().rowOperations}>
                        {(operation) => (
                          <li>
                            <div class="font-semibold">
                              {operation.description}
                            </div>
                            <div class="text-base-content/75">
                              {getOperationReason(operation, iteration())}
                            </div>
                          </li>
                        )}
                      </For>
                    </ul>
                  </div>

                  <div class="alert alert-success alert-soft">
                    <span>
                      Después de estas operaciones se obtiene el tableau
                      actualizado que aparece a la izquierda.
                    </span>
                  </div>
                </>
              )}
            </Show>
          </div>
        )}
      </Show>
    </div>
  </div>
);
