import {
  assertFiniteNumbers,
  assertRectangularMatrix,
  cloneMatrix,
  cloneVector,
  createBooleanMatrix,
  createNumberMatrix,
  sumVector,
} from "./matrix";
import type {
  AlgorithmStep,
  MatrixPosition,
  MutableBooleanMatrix,
  MutableMatrix,
  NumericMatrix,
} from "./types";

export type TransportationInput = Readonly<{
  costs: NumericMatrix;
  supply: readonly number[];
  demand: readonly number[];
}>;

export type InitialTransportationMethod =
  | "northwest-corner"
  | "least-cost"
  | "vogel";

export type BalancedTransportationProblem = Readonly<{
  costs: MutableMatrix;
  supply: number[];
  demand: number[];
  dummy?: Readonly<
    | { type: "origin"; index: number; amount: number }
    | { type: "destination"; index: number; amount: number }
  >;
}>;

export type TransportationSolution = Readonly<{
  costs: MutableMatrix;
  supply: number[];
  demand: number[];
  allocation: MutableMatrix;
  basic: MutableBooleanMatrix;
  totalCost: number;
  steps: AlgorithmStep[];
  balancedProblem: BalancedTransportationProblem;
}>;

export type TransportationAllocationStepTrace = Readonly<{
  row: number;
  column: number;
  amount: number;
  cost: number;
  supplyBefore: readonly number[];
  demandBefore: readonly number[];
  supplyAfter: readonly number[];
  demandAfter: readonly number[];
  activeRows: readonly boolean[];
  activeColumns: readonly boolean[];
  allocation: MutableMatrix;
  basic: MutableBooleanMatrix;
  exhaustedRow: boolean;
  satisfiedColumn: boolean;
}>;

export type NorthwestCornerStepTrace = TransportationAllocationStepTrace &
  Readonly<{
    nextMove: "diagonal" | "down" | "right";
  }>;

export type LeastCostStepTrace = TransportationAllocationStepTrace;

export type VogelPenalty = Readonly<{
  penalty: number;
  minimum: number;
  position: number;
}>;

export type VogelStepTrace = TransportationAllocationStepTrace &
  Readonly<{
    selectedAxis: "row" | "column";
    selectedIndex: number;
    selectedPenalty: number;
    rowPenalties: readonly (VogelPenalty | undefined)[];
    columnPenalties: readonly (VogelPenalty | undefined)[];
  }>;

export type ModiSolution = TransportationSolution &
  Readonly<{
    iterations: readonly ModiIteration[];
    isOptimal: boolean;
  }>;

export type ModiIteration = Readonly<{
  potentialsU: readonly number[];
  potentialsV: readonly number[];
  opportunityCosts: MutableMatrix;
  enteringCell?: MatrixPosition;
  cycle?: readonly MatrixPosition[];
  theta?: number;
  leavingCell?: MatrixPosition;
  totalCost: number;
}>;

const validateTransportationInput = (input: TransportationInput): void => {
  assertRectangularMatrix(input.costs, "costs");
  assertFiniteNumbers(input.supply, "supply");
  assertFiniteNumbers(input.demand, "demand");

  const rowCount = input.costs.length;
  const columnCount = input.costs[0]?.length ?? 0;
  if (input.supply.length !== rowCount) {
    throw new Error(
      `supply has ${input.supply.length} values; expected ${rowCount}.`,
    );
  }
  if (input.demand.length !== columnCount) {
    throw new Error(
      `demand has ${input.demand.length} values; expected ${columnCount}.`,
    );
  }
};

export const balanceTransportationProblem = (
  input: TransportationInput,
): BalancedTransportationProblem => {
  validateTransportationInput(input);

  const costs = cloneMatrix(input.costs);
  const supply = cloneVector(input.supply);
  const demand = cloneVector(input.demand);
  const totalSupply = sumVector(supply);
  const totalDemand = sumVector(demand);

  if (totalSupply === totalDemand) {
    return { costs, supply, demand };
  }

  if (totalSupply < totalDemand) {
    const amount = totalDemand - totalSupply;
    costs.push(Array.from({ length: demand.length }, () => 0));
    supply.push(amount);
    return {
      costs,
      supply,
      demand,
      dummy: { type: "origin", index: supply.length - 1, amount },
    };
  }

  const amount = totalSupply - totalDemand;
  for (const row of costs) {
    row.push(0);
  }
  demand.push(amount);
  return {
    costs,
    supply,
    demand,
    dummy: { type: "destination", index: demand.length - 1, amount },
  };
};

export const calculateTransportationCost = (
  costs: NumericMatrix,
  allocation: NumericMatrix,
): number => {
  assertRectangularMatrix(costs, "costs");
  assertRectangularMatrix(allocation, "allocation");
  return allocation.reduce(
    (total, row, rowIndex) =>
      total +
      row.reduce(
        (rowTotal, allocated, columnIndex) =>
          rowTotal + allocated * (costs[rowIndex]?.[columnIndex] ?? 0),
        0,
      ),
    0,
  );
};

const countBasicCells = (basic: MutableBooleanMatrix): number =>
  basic.reduce(
    (total, row) => total + row.filter((isBasic) => isBasic).length,
    0,
  );

export const findTransportationCycle = (
  basic: MutableBooleanMatrix,
  startRow: number,
  startColumn: number,
): MatrixPosition[] | undefined => {
  const rowCount = basic.length;
  const columnCount = basic[0]?.length ?? 0;
  const path: MatrixPosition[] = [{ row: startRow, column: startColumn }];

  const isInPath = (row: number, column: number): boolean =>
    path.some((cell) => cell.row === row && cell.column === column);

  const search = (
    row: number,
    column: number,
    direction: "row" | "column",
  ): boolean => {
    if (direction === "row") {
      for (let nextColumn = 0; nextColumn < columnCount; nextColumn += 1) {
        if (nextColumn === column) {
          continue;
        }
        if (
          row === startRow &&
          nextColumn === startColumn &&
          path.length >= 4
        ) {
          return true;
        }
        if (basic[row]?.[nextColumn] === true && !isInPath(row, nextColumn)) {
          path.push({ row, column: nextColumn });
          if (search(row, nextColumn, "column")) {
            return true;
          }
          path.pop();
        }
      }
      return false;
    }

    for (let nextRow = 0; nextRow < rowCount; nextRow += 1) {
      if (nextRow === row) {
        continue;
      }
      if (nextRow === startRow && column === startColumn && path.length >= 4) {
        return true;
      }
      if (basic[nextRow]?.[column] === true && !isInPath(nextRow, column)) {
        path.push({ row: nextRow, column });
        if (search(nextRow, column, "row")) {
          return true;
        }
        path.pop();
      }
    }
    return false;
  };

  if (search(startRow, startColumn, "row")) {
    return path;
  }

  path.splice(1);
  if (search(startRow, startColumn, "column")) {
    return path;
  }

  return undefined;
};

const addDegenerateZeros = (
  basic: MutableBooleanMatrix,
  allocation: MutableMatrix,
  steps: AlgorithmStep[],
): void => {
  const rowCount = basic.length;
  const columnCount = basic[0]?.length ?? 0;
  const requiredBasics = rowCount + columnCount - 1;

  while (countBasicCells(basic) < requiredBasics) {
    let added = false;
    for (let row = 0; row < rowCount && !added; row += 1) {
      for (let column = 0; column < columnCount; column += 1) {
        if (
          basic[row]?.[column] === false &&
          findTransportationCycle(basic, row, column) === undefined
        ) {
          basic[row][column] = true;
          allocation[row][column] = 0;
          steps.push({
            title: "Degenerate basic cell",
            description: `Add zero allocation at O${row + 1}-D${column + 1}.`,
            data: { row, column },
          });
          added = true;
          break;
        }
      }
    }

    if (!added) {
      return;
    }
  }
};

const createInitialSolution = (
  problem: BalancedTransportationProblem,
): Omit<TransportationSolution, "steps" | "totalCost"> => {
  const rowCount = problem.supply.length;
  const columnCount = problem.demand.length;
  return {
    costs: problem.costs,
    supply: problem.supply,
    demand: problem.demand,
    allocation: createNumberMatrix(rowCount, columnCount),
    basic: createBooleanMatrix(rowCount, columnCount),
    balancedProblem: problem,
  };
};

const finishTransportationSolution = (
  solution: Omit<TransportationSolution, "steps" | "totalCost">,
  steps: AlgorithmStep[],
): TransportationSolution => {
  addDegenerateZeros(solution.basic, solution.allocation, steps);
  const totalCost = calculateTransportationCost(
    solution.costs,
    solution.allocation,
  );
  steps.push({
    title: "Total cost",
    description: `The current transportation cost is ${totalCost}.`,
    data: { totalCost },
  });
  return { ...solution, totalCost, steps };
};

const cloneBooleanMatrix = (
  matrix: MutableBooleanMatrix,
): MutableBooleanMatrix => matrix.map((row) => [...row]);

export const northwestCornerMethod = (
  input: TransportationInput,
): TransportationSolution => {
  const problem = balanceTransportationProblem(input);
  const steps: AlgorithmStep[] = [
    {
      title: "Northwest corner method",
      description: "Start at the upper-left available cell.",
    },
  ];
  const solution = createInitialSolution(problem);
  const supply = cloneVector(problem.supply);
  const demand = cloneVector(problem.demand);
  let row = 0;
  let column = 0;
  let step = 1;

  while (row < supply.length && column < demand.length) {
    const amount = Math.min(supply[row] ?? 0, demand[column] ?? 0);
    solution.allocation[row][column] = amount;
    solution.basic[row][column] = true;
    const supplyBefore = cloneVector(supply);
    const demandBefore = cloneVector(demand);
    const exhaustedRow = supply[row] - amount === 0;
    const satisfiedColumn = demand[column] - amount === 0;
    steps.push({
      title: `Step ${step}`,
      description: `Assign min(${supply[row]}, ${demand[column]}) = ${amount} to O${row + 1}-D${column + 1}.`,
      data: {
        row,
        column,
        amount,
        cost: problem.costs[row]?.[column] ?? 0,
        supplyBefore,
        demandBefore,
        supplyAfter: supplyBefore.map((value, index) =>
          index === row ? value - amount : value,
        ),
        demandAfter: demandBefore.map((value, index) =>
          index === column ? value - amount : value,
        ),
        activeRows: supplyBefore.map((value, index) =>
          index === row ? value - amount > 0 : value > 0,
        ),
        activeColumns: demandBefore.map((value, index) =>
          index === column ? value - amount > 0 : value > 0,
        ),
        allocation: cloneMatrix(solution.allocation),
        basic: cloneBooleanMatrix(solution.basic),
        exhaustedRow,
        satisfiedColumn,
        nextMove:
          exhaustedRow && satisfiedColumn
            ? "diagonal"
            : exhaustedRow
              ? "down"
              : "right",
      } satisfies NorthwestCornerStepTrace,
    });
    supply[row] -= amount;
    demand[column] -= amount;

    if (exhaustedRow && satisfiedColumn) {
      row += 1;
      column += 1;
    } else if (exhaustedRow) {
      row += 1;
    } else {
      column += 1;
    }
    step += 1;
  }

  return finishTransportationSolution(solution, steps);
};

export const leastCostMethod = (
  input: TransportationInput,
): TransportationSolution => {
  const problem = balanceTransportationProblem(input);
  const steps: AlgorithmStep[] = [
    {
      title: "Least cost method",
      description: "Select the lowest active cost.",
    },
  ];
  const solution = createInitialSolution(problem);
  const supply = cloneVector(problem.supply);
  const demand = cloneVector(problem.demand);
  const activeRows = Array.from({ length: supply.length }, () => true);
  const activeColumns = Array.from({ length: demand.length }, () => true);
  let step = 1;

  while (true) {
    let bestCost: number | undefined;
    let bestRow = -1;
    let bestColumn = -1;

    for (let row = 0; row < supply.length; row += 1) {
      if (!activeRows[row]) {
        continue;
      }
      for (let column = 0; column < demand.length; column += 1) {
        if (
          activeColumns[column] &&
          (bestCost === undefined ||
            (problem.costs[row]?.[column] ?? Number.POSITIVE_INFINITY) <
              bestCost)
        ) {
          bestCost = problem.costs[row]?.[column] ?? 0;
          bestRow = row;
          bestColumn = column;
        }
      }
    }

    if (bestRow < 0 || bestColumn < 0) {
      break;
    }

    const selectedCost = bestCost ?? problem.costs[bestRow]?.[bestColumn] ?? 0;
    const amount = Math.min(supply[bestRow] ?? 0, demand[bestColumn] ?? 0);
    solution.allocation[bestRow][bestColumn] = amount;
    solution.basic[bestRow][bestColumn] = true;
    const supplyBefore = cloneVector(supply);
    const demandBefore = cloneVector(demand);
    const exhaustedRow = supply[bestRow] - amount === 0;
    const satisfiedColumn = demand[bestColumn] - amount === 0;
    supply[bestRow] -= amount;
    demand[bestColumn] -= amount;
    if (exhaustedRow) {
      activeRows[bestRow] = false;
    }
    if (satisfiedColumn) {
      activeColumns[bestColumn] = false;
    }
    steps.push({
      title: `Step ${step}`,
      description: `Lowest active cost is ${selectedCost} at O${bestRow + 1}-D${bestColumn + 1}; assign ${amount}.`,
      data: {
        row: bestRow,
        column: bestColumn,
        amount,
        cost: selectedCost,
        supplyBefore,
        demandBefore,
        supplyAfter: cloneVector(supply),
        demandAfter: cloneVector(demand),
        activeRows: [...activeRows],
        activeColumns: [...activeColumns],
        allocation: cloneMatrix(solution.allocation),
        basic: cloneBooleanMatrix(solution.basic),
        exhaustedRow,
        satisfiedColumn,
      } satisfies LeastCostStepTrace,
    });
    step += 1;
  }

  return finishTransportationSolution(solution, steps);
};

const twoSmallestPenalty = (
  costs: MutableMatrix,
  activeRows: readonly boolean[],
  activeColumns: readonly boolean[],
  isRow: boolean,
  index: number,
): Readonly<{ penalty: number; minimum: number; position: number }> => {
  let first: number | undefined;
  let second: number | undefined;
  let position = -1;

  if (isRow) {
    for (let column = 0; column < activeColumns.length; column += 1) {
      if (!activeColumns[column]) {
        continue;
      }
      const value = costs[index]?.[column] ?? Number.POSITIVE_INFINITY;
      if (first === undefined || value < first) {
        second = first;
        first = value;
        position = column;
      } else if (second === undefined || value < second) {
        second = value;
      }
    }
  } else {
    for (let row = 0; row < activeRows.length; row += 1) {
      if (!activeRows[row]) {
        continue;
      }
      const value = costs[row]?.[index] ?? Number.POSITIVE_INFINITY;
      if (first === undefined || value < first) {
        second = first;
        first = value;
        position = row;
      } else if (second === undefined || value < second) {
        second = value;
      }
    }
  }

  if (first === undefined) {
    return { penalty: -1, minimum: -1, position: -1 };
  }
  if (second === undefined) {
    return { penalty: first, minimum: first, position };
  }
  return { penalty: second - first, minimum: first, position };
};

export const vogelApproximationMethod = (
  input: TransportationInput,
): TransportationSolution => {
  const problem = balanceTransportationProblem(input);
  const steps: AlgorithmStep[] = [
    {
      title: "Vogel approximation method",
      description: "Use penalties to select the next active row or column.",
    },
  ];
  const solution = createInitialSolution(problem);
  const supply = cloneVector(problem.supply);
  const demand = cloneVector(problem.demand);
  const activeRows = Array.from({ length: supply.length }, () => true);
  const activeColumns = Array.from({ length: demand.length }, () => true);
  let step = 1;

  while (true) {
    let bestIsRow = true;
    let bestIndex = -1;
    let bestPenalty = -1;
    let bestMinimum = 0;
    let activeCount = 0;
    const rowPenalties: Array<VogelPenalty | undefined> = Array.from({
      length: supply.length,
    });
    const columnPenalties: Array<VogelPenalty | undefined> = Array.from({
      length: demand.length,
    });

    for (let row = 0; row < supply.length; row += 1) {
      if (!activeRows[row]) {
        continue;
      }
      activeCount += 1;
      const penaltyData = twoSmallestPenalty(
        problem.costs,
        activeRows,
        activeColumns,
        true,
        row,
      );
      rowPenalties[row] = penaltyData;
      const { penalty, minimum } = penaltyData;
      if (
        penalty > bestPenalty ||
        (penalty === bestPenalty && minimum < bestMinimum)
      ) {
        bestPenalty = penalty;
        bestMinimum = minimum;
        bestIndex = row;
        bestIsRow = true;
      }
    }

    for (let column = 0; column < demand.length; column += 1) {
      if (!activeColumns[column]) {
        continue;
      }
      activeCount += 1;
      const penaltyData = twoSmallestPenalty(
        problem.costs,
        activeRows,
        activeColumns,
        false,
        column,
      );
      columnPenalties[column] = penaltyData;
      const { penalty, minimum } = penaltyData;
      if (
        penalty > bestPenalty ||
        (penalty === bestPenalty && minimum < bestMinimum)
      ) {
        bestPenalty = penalty;
        bestMinimum = minimum;
        bestIndex = column;
        bestIsRow = false;
      }
    }

    if (activeCount === 0 || bestIndex < 0) {
      break;
    }

    let selectedRow = -1;
    let selectedColumn = -1;
    let selectedCost: number | undefined;
    if (bestIsRow) {
      selectedRow = bestIndex;
      for (let column = 0; column < demand.length; column += 1) {
        const cost = problem.costs[selectedRow]?.[column];
        if (
          activeColumns[column] &&
          cost !== undefined &&
          (selectedCost === undefined || cost < selectedCost)
        ) {
          selectedCost = cost;
          selectedColumn = column;
        }
      }
    } else {
      selectedColumn = bestIndex;
      for (let row = 0; row < supply.length; row += 1) {
        const cost = problem.costs[row]?.[selectedColumn];
        if (
          activeRows[row] &&
          cost !== undefined &&
          (selectedCost === undefined || cost < selectedCost)
        ) {
          selectedCost = cost;
          selectedRow = row;
        }
      }
    }

    const chosenCost =
      selectedCost ?? problem.costs[selectedRow]?.[selectedColumn] ?? 0;
    const amount = Math.min(
      supply[selectedRow] ?? 0,
      demand[selectedColumn] ?? 0,
    );
    solution.allocation[selectedRow][selectedColumn] = amount;
    solution.basic[selectedRow][selectedColumn] = true;
    const supplyBefore = cloneVector(supply);
    const demandBefore = cloneVector(demand);
    const exhaustedRow = supply[selectedRow] - amount === 0;
    const satisfiedColumn = demand[selectedColumn] - amount === 0;
    supply[selectedRow] -= amount;
    demand[selectedColumn] -= amount;
    if (exhaustedRow) {
      activeRows[selectedRow] = false;
    }
    if (satisfiedColumn) {
      activeColumns[selectedColumn] = false;
    }
    steps.push({
      title: `Step ${step}`,
      description: `Choose ${bestIsRow ? "row" : "column"} ${bestIndex + 1} with penalty ${bestPenalty}; assign ${amount} to O${selectedRow + 1}-D${selectedColumn + 1}.`,
      data: {
        row: selectedRow,
        column: selectedColumn,
        amount,
        cost: chosenCost,
        supplyBefore,
        demandBefore,
        supplyAfter: cloneVector(supply),
        demandAfter: cloneVector(demand),
        activeRows: [...activeRows],
        activeColumns: [...activeColumns],
        allocation: cloneMatrix(solution.allocation),
        basic: cloneBooleanMatrix(solution.basic),
        exhaustedRow,
        satisfiedColumn,
        selectedAxis: bestIsRow ? "row" : "column",
        selectedIndex: bestIndex,
        selectedPenalty: bestPenalty,
        rowPenalties,
        columnPenalties,
      } satisfies VogelStepTrace,
    });
    step += 1;
  }

  return finishTransportationSolution(solution, steps);
};

const calculateModiPotentials = (
  costs: MutableMatrix,
  basic: MutableBooleanMatrix,
): Readonly<{ u: number[]; v: number[] }> => {
  const rowCount = basic.length;
  const columnCount = basic[0]?.length ?? 0;
  const u: Array<number | undefined> = Array.from({ length: rowCount });
  const v: Array<number | undefined> = Array.from({ length: columnCount });
  u[0] = 0;
  let changed = true;

  while (changed) {
    changed = false;
    for (let row = 0; row < rowCount; row += 1) {
      for (let column = 0; column < columnCount; column += 1) {
        if (!basic[row]?.[column]) {
          continue;
        }
        if (u[row] !== undefined && v[column] === undefined) {
          v[column] = (costs[row]?.[column] ?? 0) - u[row];
          changed = true;
        } else if (v[column] !== undefined && u[row] === undefined) {
          u[row] = (costs[row]?.[column] ?? 0) - v[column];
          changed = true;
        }
      }
    }

    if (!changed) {
      const row = u.indexOf(undefined);
      if (row >= 0) {
        u[row] = 0;
        changed = true;
        continue;
      }
      const column = v.indexOf(undefined);
      if (column >= 0) {
        v[column] = 0;
        changed = true;
      }
    }
  }

  return {
    u: u.map((value) => value ?? 0),
    v: v.map((value) => value ?? 0),
  };
};

export const optimizeTransportationModi = (
  input: TransportationInput,
  initialMethod: InitialTransportationMethod = "vogel",
): ModiSolution => {
  const initial =
    initialMethod === "northwest-corner"
      ? northwestCornerMethod(input)
      : initialMethod === "least-cost"
        ? leastCostMethod(input)
        : vogelApproximationMethod(input);

  const costs = cloneMatrix(initial.costs);
  const supply = cloneVector(initial.supply);
  const demand = cloneVector(initial.demand);
  const allocation = cloneMatrix(initial.allocation);
  const basic = initial.basic.map((row) => [...row]);
  const steps: AlgorithmStep[] = [...initial.steps];
  const iterations: ModiIteration[] = [];
  let isOptimal = false;

  for (let iteration = 1; iteration <= 100; iteration += 1) {
    addDegenerateZeros(basic, allocation, steps);
    const { u, v } = calculateModiPotentials(costs, basic);
    const opportunityCosts = createNumberMatrix(supply.length, demand.length);
    let bestDelta = 0;
    let enteringCell: MatrixPosition | undefined;

    for (let row = 0; row < supply.length; row += 1) {
      for (let column = 0; column < demand.length; column += 1) {
        const delta = (costs[row]?.[column] ?? 0) - u[row] - v[column];
        opportunityCosts[row][column] = delta;
        if (!basic[row]?.[column] && delta < bestDelta) {
          bestDelta = delta;
          enteringCell = { row, column };
        }
      }
    }

    if (enteringCell === undefined) {
      isOptimal = true;
      const totalCost = calculateTransportationCost(costs, allocation);
      iterations.push({
        potentialsU: u,
        potentialsV: v,
        opportunityCosts,
        totalCost,
      });
      steps.push({
        title: `MODI iteration ${iteration}`,
        description:
          "All opportunity costs are non-negative; the solution is optimal.",
        data: { u, v, totalCost },
      });
      break;
    }

    const cycle = findTransportationCycle(
      basic,
      enteringCell.row,
      enteringCell.column,
    );
    if (cycle === undefined) {
      throw new Error(
        "MODI could not form a closed loop for the entering cell.",
      );
    }

    const theta = cycle
      .filter((_, index) => index % 2 === 1)
      .reduce<number | undefined>((minimum, cell) => {
        const value = allocation[cell.row]?.[cell.column] ?? 0;
        return minimum === undefined || value < minimum ? value : minimum;
      }, undefined);
    if (theta === undefined) {
      throw new Error("MODI cycle does not contain a valid minus cell.");
    }

    basic[enteringCell.row][enteringCell.column] = true;
    let leavingCell: MatrixPosition | undefined;
    for (const [index, cell] of cycle.entries()) {
      if (index % 2 === 0) {
        allocation[cell.row][cell.column] += theta;
      } else {
        allocation[cell.row][cell.column] -= theta;
        if (
          allocation[cell.row][cell.column] === 0 &&
          leavingCell === undefined
        ) {
          leavingCell = cell;
        }
      }
    }

    if (leavingCell !== undefined) {
      basic[leavingCell.row][leavingCell.column] = false;
    }

    const totalCost = calculateTransportationCost(costs, allocation);
    iterations.push({
      potentialsU: u,
      potentialsV: v,
      opportunityCosts,
      enteringCell,
      cycle,
      theta,
      leavingCell,
      totalCost,
    });
    steps.push({
      title: `MODI iteration ${iteration}`,
      description: `Enter O${enteringCell.row + 1}-D${enteringCell.column + 1}, adjust by theta ${theta}, and get cost ${totalCost}.`,
      data: { u, v, enteringCell, cycle, theta, leavingCell, totalCost },
    });
  }

  const totalCost = calculateTransportationCost(costs, allocation);
  return {
    costs,
    supply,
    demand,
    allocation,
    basic,
    totalCost,
    steps,
    balancedProblem: initial.balancedProblem,
    iterations,
    isOptimal,
  };
};
