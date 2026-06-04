import { createMemo, createSignal } from "solid-js";
import type {
  InitialTransportationMethod,
  LeastCostStepTrace,
  NorthwestCornerStepTrace,
  TransportationAllocationStepTrace,
  TransportationInput,
  VogelStepTrace,
} from "../lib";
import {
  leastCostMethod,
  northwestCornerMethod,
  vogelApproximationMethod,
} from "../lib";
import { CurrentCostSummary } from "./transportation/CurrentCostSummary";
import { LeastCostStepExplanation } from "./transportation/LeastCostStepExplanation";
import { NorthwestCornerStepExplanation } from "./transportation/NorthwestCornerStepExplanation";
import { TransportationMethodHeader } from "./transportation/TransportationMethodHeader";
import { TransportationMethodLayout } from "./transportation/TransportationMethodLayout";
import { TransportationProblemEditor } from "./transportation/TransportationProblemEditor";
import { TransportationTable } from "./transportation/TransportationTable";
import type { TransportationTableState } from "./transportation/types";
import { VogelStepExplanation } from "./transportation/VogelStepExplanation";

type MethodCopy = Readonly<{
  title: string;
  description: string;
  summaryLabel: string;
}>;

type EditableTransportationProblem = {
  costs: number[][];
  supply: number[];
  demand: number[];
};

const methodCopy: Record<InitialTransportationMethod, MethodCopy> = {
  "least-cost": {
    title: "Costo mínimo paso a paso",
    description:
      "La tabla avanza como en pizarrón: se elige el costo activo más bajo, se asigna el mínimo entre oferta y demanda, y se tachan las cantidades que ya quedaron satisfechas.",
    summaryLabel: "costo mínimo",
  },
  "northwest-corner": {
    title: "Esquina noroeste paso a paso",
    description:
      "Se inicia en la esquina superior izquierda activa, se asigna lo máximo posible y se avanza hacia abajo o hacia la derecha según lo que se agote.",
    summaryLabel: "esquina noroeste",
  },
  vogel: {
    title: "Aproximación de Vogel paso a paso",
    description:
      "Cada vuelta calcula penalizaciones por filas y columnas, elige la penalización más alta y asigna en el menor costo activo correspondiente.",
    summaryLabel: "aproximación de Vogel",
  },
};

const classExample: TransportationInput = {
  costs: [
    [8, 6, 10],
    [9, 7, 4],
    [3, 4, 2],
  ],
  supply: [100, 120, 80],
  demand: [150, 80, 70],
};

const isAllocationStepTrace = (
  data: Readonly<Record<string, unknown>> | undefined,
): data is TransportationAllocationStepTrace =>
  typeof data?.row === "number" &&
  typeof data.column === "number" &&
  typeof data.amount === "number" &&
  typeof data.cost === "number" &&
  Array.isArray(data.supplyAfter) &&
  Array.isArray(data.demandAfter) &&
  Array.isArray(data.activeRows) &&
  Array.isArray(data.activeColumns) &&
  Array.isArray(data.allocation) &&
  Array.isArray(data.basic);

const isNorthwestCornerStepTrace = (
  trace: TransportationAllocationStepTrace | undefined,
): trace is NorthwestCornerStepTrace =>
  trace !== undefined &&
  ((trace as { nextMove?: unknown }).nextMove === "diagonal" ||
    (trace as { nextMove?: unknown }).nextMove === "down" ||
    (trace as { nextMove?: unknown }).nextMove === "right");

const isVogelStepTrace = (
  trace: TransportationAllocationStepTrace | undefined,
): trace is VogelStepTrace =>
  trace !== undefined &&
  ((trace as { selectedAxis?: unknown }).selectedAxis === "row" ||
    (trace as { selectedAxis?: unknown }).selectedAxis === "column") &&
  Array.isArray((trace as { rowPenalties?: unknown }).rowPenalties) &&
  Array.isArray((trace as { columnPenalties?: unknown }).columnPenalties);

const cloneProblem = (
  input: TransportationInput,
): EditableTransportationProblem => ({
  costs: input.costs.map((row) => [...row]),
  supply: [...input.supply],
  demand: [...input.demand],
});

const clampDimension = (count: number): number =>
  Math.min(Math.max(Math.trunc(count), 1), 8);

const resizeProblem = (
  input: EditableTransportationProblem,
  originCount: number,
  destinationCount: number,
): EditableTransportationProblem => {
  const boundedOrigins = clampDimension(originCount);
  const boundedDestinations = clampDimension(destinationCount);

  return {
    costs: Array.from({ length: boundedOrigins }, (_, row) =>
      Array.from(
        { length: boundedDestinations },
        (_, column) => input.costs[row]?.[column] ?? 0,
      ),
    ),
    supply: Array.from(
      { length: boundedOrigins },
      (_, row) => input.supply[row] ?? 0,
    ),
    demand: Array.from(
      { length: boundedDestinations },
      (_, column) => input.demand[column] ?? 0,
    ),
  };
};

const createEmptyTableState = (
  input: Pick<TransportationInput, "costs" | "supply" | "demand">,
): TransportationTableState => ({
  allocation: input.costs.map((row) => row.map(() => 0)),
  basic: input.costs.map((row) => row.map(() => false)),
  supply: input.supply,
  demand: input.demand,
  activeRows: input.supply.map(() => true),
  activeColumns: input.demand.map(() => true),
});

const createTraceTableState = (
  trace: TransportationAllocationStepTrace,
): TransportationTableState => ({
  allocation: trace.allocation,
  basic: trace.basic,
  supply: trace.supplyAfter,
  demand: trace.demandAfter,
  activeRows: trace.activeRows,
  activeColumns: trace.activeColumns,
  selected: { row: trace.row, column: trace.column },
  rowPenalties: isVogelStepTrace(trace)
    ? trace.rowPenalties.map((penalty) => penalty?.penalty)
    : undefined,
  columnPenalties: isVogelStepTrace(trace)
    ? trace.columnPenalties.map((penalty) => penalty?.penalty)
    : undefined,
});

const solveTransportationMethod = (
  method: InitialTransportationMethod,
  input: TransportationInput,
) => {
  if (method === "northwest-corner") {
    return northwestCornerMethod(input);
  }
  if (method === "vogel") {
    return vogelApproximationMethod(input);
  }
  return leastCostMethod(input);
};

export const TransportationLeastCostExplorer = () => {
  const [problem, setProblem] = createSignal<EditableTransportationProblem>(
    cloneProblem(classExample),
  );
  const [selectedMethod, setSelectedMethod] =
    createSignal<InitialTransportationMethod>("least-cost");
  const [selectedStep, setSelectedStep] = createSignal(0);
  const solution = createMemo(() =>
    solveTransportationMethod(selectedMethod(), problem()),
  );
  const displayProblem = createMemo(() => ({
    costs: solution().costs,
    supply: solution().supply,
    demand: solution().demand,
  }));
  const traces = createMemo(() =>
    solution()
      .steps.map((step) => step.data)
      .filter(isAllocationStepTrace),
  );
  const maxStep = createMemo(() => traces().length);
  const currentTrace = createMemo(() => traces()[selectedStep() - 1]);
  const table = createMemo(() => {
    const trace = currentTrace();
    return trace
      ? createTraceTableState(trace)
      : createEmptyTableState(displayProblem());
  });
  const copy = createMemo(() => methodCopy[selectedMethod()]);

  const goToStep = (step: number) => {
    const boundedStep = Math.min(Math.max(step, 0), maxStep());
    setSelectedStep(boundedStep);
  };

  const changeMethod = (method: InitialTransportationMethod) => {
    setSelectedMethod(method);
    setSelectedStep(0);
  };

  const changeProblem = (nextProblem: EditableTransportationProblem) => {
    setProblem(nextProblem);
    setSelectedStep(0);
  };

  const changeCost = (row: number, column: number, value: number) => {
    const nextProblem = cloneProblem(problem());
    nextProblem.costs[row][column] = value;
    changeProblem(nextProblem);
  };

  const changeSupply = (row: number, value: number) => {
    const nextProblem = cloneProblem(problem());
    nextProblem.supply[row] = value;
    changeProblem(nextProblem);
  };

  const changeDemand = (column: number, value: number) => {
    const nextProblem = cloneProblem(problem());
    nextProblem.demand[column] = value;
    changeProblem(nextProblem);
  };

  const changeOriginCount = (count: number) => {
    const currentProblem = problem();
    changeProblem(
      resizeProblem(currentProblem, count, currentProblem.demand.length),
    );
  };

  const changeDestinationCount = (count: number) => {
    const currentProblem = problem();
    changeProblem(
      resizeProblem(currentProblem, currentProblem.supply.length, count),
    );
  };

  const resetProblem = () => {
    changeProblem(cloneProblem(classExample));
  };

  const renderExplanation = () => {
    const trace = currentTrace();
    if (selectedMethod() === "northwest-corner") {
      return (
        <NorthwestCornerStepExplanation
          trace={isNorthwestCornerStepTrace(trace) ? trace : undefined}
        />
      );
    }
    if (selectedMethod() === "vogel") {
      return (
        <VogelStepExplanation
          trace={isVogelStepTrace(trace) ? trace : undefined}
        />
      );
    }
    return <LeastCostStepExplanation trace={trace as LeastCostStepTrace} />;
  };

  return (
    <TransportationMethodLayout
      currentStep={selectedStep()}
      maxStep={maxStep()}
      onStepChange={goToStep}
      main={
        <>
          <TransportationMethodHeader
            title={copy().title}
            description={copy().description}
            selectedMethod={selectedMethod()}
            onMethodChange={changeMethod}
          />

          <div class="alert alert-soft alert-info">
            <span>
              En Vogel, las penalizaciones aparecen en color debajo de sus filas
              y columnas; en los otros métodos quedan como guion porque no
              forman parte del criterio.
            </span>
          </div>

          <TransportationProblemEditor
            problem={problem()}
            onCostChange={changeCost}
            onSupplyChange={changeSupply}
            onDemandChange={changeDemand}
            onOriginCountChange={changeOriginCount}
            onDestinationCountChange={changeDestinationCount}
            onReset={resetProblem}
          />

          <TransportationTable problem={displayProblem()} table={table()} />
        </>
      }
      sidebar={
        <>
          {renderExplanation()}
          <CurrentCostSummary
            isComplete={selectedStep() === maxStep()}
            totalCost={solution().totalCost}
            methodLabel={copy().summaryLabel}
          />
        </>
      }
    />
  );
};
