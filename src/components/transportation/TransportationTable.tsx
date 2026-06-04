import { createMemo, For } from "solid-js";
import type {
  TransportationCellState,
  TransportationProblem,
  TransportationTableState,
} from "./types";

type TransportationTableProps = Readonly<{
  problem: TransportationProblem;
  table: TransportationTableState;
}>;

const formatPenalty = (penalty: number | undefined): string =>
  penalty === undefined ? "-" : String(penalty);

const getCellState = (
  table: TransportationTableState,
  costs: TransportationProblem["costs"],
  row: number,
  column: number,
): TransportationCellState => ({
  cost: costs[row]?.[column] ?? 0,
  allocation: table.allocation[row]?.[column] ?? 0,
  isBasic: table.basic[row]?.[column] ?? false,
  isSelected: table.selected?.row === row && table.selected.column === column,
  isInactiveRow: table.activeRows[row] === false,
  isInactiveColumn: table.activeColumns[column] === false,
});

export const TransportationTable = (props: TransportationTableProps) => (
  <div class="overflow-x-auto overscroll-x-contain rounded-box border border-base-300 bg-base-100">
    <table class="table table-xs min-w-max table-zebra sm:table-sm lg:table-md">
      <thead>
        <tr>
          <th>Origen</th>
          <For each={props.problem.demand}>
            {(_, column) => (
              <th class="min-w-28 text-center sm:min-w-32">
                <div>D{column() + 1}</div>
                <div class="text-xs font-normal text-secondary">
                  Penalización:{" "}
                  {formatPenalty(props.table.columnPenalties?.[column()])}
                </div>
              </th>
            )}
          </For>
          <th class="text-center">Oferta</th>
        </tr>
      </thead>
      <tbody>
        <For each={props.problem.costs}>
          {(rowCosts, row) => (
            <tr class={props.table.activeRows[row()] ? "" : "opacity-60"}>
              <th>
                <div>O{row() + 1}</div>
                <div class="text-xs font-normal text-accent">
                  Penalización:{" "}
                  {formatPenalty(props.table.rowPenalties?.[row()])}
                </div>
              </th>
              <For each={rowCosts}>
                {(_, column) => {
                  const cell = createMemo(() =>
                    getCellState(
                      props.table,
                      props.problem.costs,
                      row(),
                      column(),
                    ),
                  );
                  return (
                    <td
                      classList={{
                        "bg-primary": cell().isSelected,
                        // "opacity-45":
                        // 	cell().isInactiveRow || cell().isInactiveColumn,
                      }}
                    >
                      <div class="flex min-h-16 flex-col justify-between gap-2 sm:min-h-20">
                        <div class="text-xs uppercase text-base-content/60">
                          Costo
                        </div>
                        <div class="flex items-end justify-between gap-3">
                          <span class="font-mono text-lg font-bold">
                            {cell().cost}
                          </span>
                          <span
                            classList={{
                              "badge badge-primary": cell().isBasic,
                              "badge badge-ghost": !cell().isBasic,
                            }}
                          >
                            {cell().isBasic ? cell().allocation : "-"}
                          </span>
                        </div>
                      </div>
                    </td>
                  );
                }}
              </For>
              <td class="text-center font-mono text-lg">
                <span
                  classList={{
                    "line-through decoration-error decoration-2":
                      props.table.activeRows[row()] === false,
                  }}
                >
                  {props.table.supply[row()]}
                </span>
              </td>
            </tr>
          )}
        </For>
      </tbody>
      <tfoot>
        <tr>
          <th>Demanda</th>
          <For each={props.table.demand}>
            {(demand, column) => (
              <th class="text-center font-mono text-lg">
                <span
                  classList={{
                    "line-through decoration-error decoration-2":
                      props.table.activeColumns[column()] === false,
                  }}
                >
                  {demand}
                </span>
              </th>
            )}
          </For>
          <th></th>
        </tr>
      </tfoot>
    </table>
  </div>
);
