import {
	assertFiniteNumbers,
	assertRectangularMatrix,
	cloneMatrix,
} from "./matrix";
import type {
	AlgorithmStep,
	NumericMatrix,
	OptimizationDirection,
} from "./types";

export type SimplexInput = Readonly<{
	coefficients: NumericMatrix;
	resources: readonly number[];
	objective: readonly number[];
	basis: readonly number[];
	direction?: OptimizationDirection;
}>;

export type SimplexTableRow = Readonly<{
	basicVariable: number;
	objectiveCoefficient: number;
	value: number;
	coefficients: readonly number[];
}>;

export type SimplexIteration = Readonly<{
	table: readonly SimplexTableRow[];
	tableBefore: readonly SimplexTableRow[];
	tableAfter?: readonly SimplexTableRow[];
	relativeProfits: readonly number[];
	ratios?: readonly (number | null)[];
	alternateSolution: boolean;
	enteringColumn?: number;
	leavingRow?: number;
	pivot?: Readonly<{ row: number; column: number; value: number }>;
}>;

export type SimplexSolution = Readonly<{
	status: "optimal" | "unbounded";
	table: readonly SimplexTableRow[];
	iterations: readonly SimplexIteration[];
	objectiveValue: number;
	finalBasis: readonly string[];
	hasAlternateSolution: boolean;
	steps: readonly AlgorithmStep[];
}>;

export type SimplexTableauInput = Readonly<{
	constraints: NumericMatrix;
	resources: readonly number[];
	objective: readonly number[];
	decisionVariableNames?: readonly string[];
	objectiveName?: string;
	direction?: OptimizationDirection;
}>;

export type SimplexTableauRow = Readonly<{
	label: string;
	values: readonly number[];
	rhs: number;
	isObjective: boolean;
}>;

export type SimplexTableauCellColumn = number | "rhs";

export type SimplexCellCalculation =
	| Readonly<{ kind: "divide"; divisor: number }>
	| Readonly<{ kind: "eliminate"; multiplier: number; pivotValue: number }>;

export type SimplexCellTransformation = Readonly<{
	row: number;
	column: SimplexTableauCellColumn;
	before: number;
	after: number;
	changed: boolean;
	calculation: SimplexCellCalculation;
}>;

export type SimplexRowOperation = Readonly<{
	kind: "normalize" | "eliminate";
	row: number;
	label: string;
	pivotRow: number;
	sourceCoefficient: number;
	multiplier: number;
	cells: readonly SimplexCellTransformation[];
	description: string;
}>;

export type SimplexTableauIteration = Readonly<{
	iteration: number;
	tableauBefore: readonly SimplexTableauRow[];
	tableauAfter?: readonly SimplexTableauRow[];
	objectiveIndicators: readonly number[];
	ratios: readonly (number | null)[];
	pivot?: Readonly<{
		row: number;
		column: number;
		value: number;
		enteringVariable: string;
		leavingVariable: string;
	}>;
	normalizedPivotRow?: readonly number[];
	rowOperations: readonly SimplexRowOperation[];
}>;

export type SimplexVariableValue = Readonly<{
	name: string;
	value: number;
	isBasic: boolean;
	row?: number;
}>;

export type SimplexTableauSolution = Readonly<{
	status: "optimal" | "unbounded";
	columns: readonly string[];
	initialTableau: readonly SimplexTableauRow[];
	finalTableau: readonly SimplexTableauRow[];
	iterations: readonly SimplexTableauIteration[];
	objectiveValue: number;
	variables: readonly SimplexVariableValue[];
	steps: readonly AlgorithmStep[];
}>;

const validateSimplexInput = (input: SimplexInput): void => {
	assertRectangularMatrix(input.coefficients, "coefficients");
	assertFiniteNumbers(input.resources, "resources");
	assertFiniteNumbers(input.objective, "objective");

	const rowCount = input.coefficients.length;
	const columnCount = input.coefficients[0]?.length ?? 0;
	if (input.resources.length !== rowCount) {
		throw new Error(
			`resources has ${input.resources.length} values; expected ${rowCount}.`,
		);
	}
	if (input.objective.length !== columnCount) {
		throw new Error(
			`objective has ${input.objective.length} values; expected ${columnCount}.`,
		);
	}
	if (input.basis.length !== rowCount) {
		throw new Error(
			`basis has ${input.basis.length} values; expected ${rowCount}.`,
		);
	}
	for (const variable of input.basis) {
		if (
			!Number.isInteger(variable) ||
			variable < 0 ||
			variable >= columnCount
		) {
			throw new Error(
				`basis variable ${variable} is outside the objective range.`,
			);
		}
	}
};

const createTable = (input: SimplexInput): SimplexTableRow[] =>
	input.basis.map((basicVariable, row) => ({
		basicVariable,
		objectiveCoefficient: input.objective[basicVariable] ?? 0,
		value: input.resources[row] ?? 0,
		coefficients: [...(input.coefficients[row] ?? [])],
	}));

const cloneTable = (table: readonly SimplexTableRow[]): SimplexTableRow[] =>
	table.map((row) => ({
		basicVariable: row.basicVariable,
		objectiveCoefficient: row.objectiveCoefficient,
		value: row.value,
		coefficients: [...row.coefficients],
	}));

const calculateRelativeProfits = (
	table: readonly SimplexTableRow[],
	objective: readonly number[],
): number[] =>
	objective.map((coefficient, column) => {
		const zj = table.reduce(
			(total, row) =>
				total + row.objectiveCoefficient * (row.coefficients[column] ?? 0),
			0,
		);
		return coefficient - zj;
	});

const hasAlternateSolution = (
	table: readonly SimplexTableRow[],
	relativeProfits: readonly number[],
): boolean => {
	const basis = new Set(table.map((row) => row.basicVariable));
	return relativeProfits.some(
		(profit, variable) => profit === 0 && !basis.has(variable),
	);
};

const roundNearZero = (value: number): number =>
	Math.abs(value) < 1e-10 ? 0 : value;

const cloneTableau = (
	tableau: readonly SimplexTableauRow[],
): SimplexTableauRow[] =>
	tableau.map((row) => ({
		label: row.label,
		values: [...row.values],
		rhs: row.rhs,
		isObjective: row.isObjective,
	}));

const hasChangedValue = (before: number, after: number): boolean =>
	Math.abs(before - after) > 1e-10;

const createCellTransformations = (
	row: number,
	beforeValues: readonly number[],
	beforeRhs: number,
	afterValues: readonly number[],
	afterRhs: number,
	calculation: SimplexCellCalculation,
): SimplexCellTransformation[] => [
	...beforeValues.map((before, column) => {
		const after = afterValues[column] ?? 0;
		return {
			row,
			column,
			before,
			after,
			changed: hasChangedValue(before, after),
			calculation,
		};
	}),
	{
		row,
		column: "rhs" as const,
		before: beforeRhs,
		after: afterRhs,
		changed: hasChangedValue(beforeRhs, afterRhs),
		calculation,
	},
];

const validateSimplexTableauInput = (input: SimplexTableauInput): void => {
	assertRectangularMatrix(input.constraints, "constraints");
	assertFiniteNumbers(input.resources, "resources");
	assertFiniteNumbers(input.objective, "objective");

	const rowCount = input.constraints.length;
	const decisionVariableCount = input.constraints[0]?.length ?? 0;
	if (input.resources.length !== rowCount) {
		throw new Error(
			`resources has ${input.resources.length} values; expected ${rowCount}.`,
		);
	}
	if (input.objective.length !== decisionVariableCount) {
		throw new Error(
			`objective has ${input.objective.length} values; expected ${decisionVariableCount}.`,
		);
	}
	if (
		input.decisionVariableNames !== undefined &&
		input.decisionVariableNames.length !== decisionVariableCount
	) {
		throw new Error(
			`decisionVariableNames has ${input.decisionVariableNames.length} values; expected ${decisionVariableCount}.`,
		);
	}
	if (input.resources.some((resource) => resource < 0)) {
		throw new Error("resources must be non-negative for the initial tableau.");
	}
};

const createSimplexTableau = (
	input: SimplexTableauInput,
): Readonly<{ columns: string[]; tableau: SimplexTableauRow[] }> => {
	const decisionVariableCount = input.objective.length;
	const constraintCount = input.constraints.length;
	const objectiveName = input.objectiveName ?? "P";
	const direction = input.direction ?? "max";
	const decisionNames =
		input.decisionVariableNames ??
		Array.from(
			{ length: decisionVariableCount },
			(_, index) => `x${index + 1}`,
		);
	const slackNames = Array.from(
		{ length: constraintCount },
		(_, index) => `s${index + 1}`,
	);
	const columns = [...decisionNames, ...slackNames, objectiveName];
	const objectiveSign = direction === "max" ? -1 : 1;
	const tableau: SimplexTableauRow[] = input.constraints.map(
		(row, rowIndex) => ({
			label: slackNames[rowIndex] ?? `s${rowIndex + 1}`,
			values: [
				...row,
				...slackNames.map((_, slackIndex) => (slackIndex === rowIndex ? 1 : 0)),
				0,
			],
			rhs: input.resources[rowIndex] ?? 0,
			isObjective: false,
		}),
	);
	tableau.push({
		label: objectiveName,
		values: [
			...input.objective.map((coefficient) => coefficient * objectiveSign),
			...slackNames.map(() => 0),
			1,
		],
		rhs: 0,
		isObjective: true,
	});
	return { columns, tableau };
};

const getObjectiveRow = (
	tableau: readonly SimplexTableauRow[],
): SimplexTableauRow => {
	const objectiveRow = tableau.at(-1);
	if (!objectiveRow) {
		throw new Error("Simplex tableau is empty.");
	}
	return objectiveRow;
};

const findEnteringColumn = (
	objectiveIndicators: readonly number[],
): number | undefined => {
	let enteringColumn: number | undefined;
	let mostNegative = 0;
	for (const [column, value] of objectiveIndicators.entries()) {
		if (value < mostNegative) {
			mostNegative = value;
			enteringColumn = column;
		}
	}
	return enteringColumn;
};

const findBasicVariables = (
	tableau: readonly SimplexTableauRow[],
	columns: readonly string[],
): SimplexVariableValue[] => {
	return columns.map((name, column) => {
		const oneRows = tableau
			.map((row, rowIndex) => ({ row, rowIndex }))
			.filter(({ row }) => Math.abs((row.values[column] ?? 0) - 1) < 1e-10);
		const isBasic =
			oneRows.length === 1 &&
			tableau.every((row, rowIndex) =>
				rowIndex === oneRows[0]?.rowIndex
					? true
					: Math.abs(row.values[column] ?? 0) < 1e-10,
			);
		return {
			name,
			value: isBasic ? (oneRows[0]?.row.rhs ?? 0) : 0,
			isBasic,
			row: isBasic ? oneRows[0]?.rowIndex : undefined,
		};
	});
};

export const solveSimplexTableau = (
	input: SimplexTableauInput,
): SimplexTableauSolution => {
	validateSimplexTableauInput(input);

	const { columns, tableau } = createSimplexTableau(input);
	const initialTableau = cloneTableau(tableau);
	const iterations: SimplexTableauIteration[] = [];
	const steps: AlgorithmStep[] = [
		{
			title: "Agregar variables de holgura",
			description:
				"Cada restricción menor o igual se convierte en ecuación con su propia variable de holgura.",
		},
		{
			title: "Construir el tableau inicial",
			description:
				"La fila objetivo se escribe con los coeficientes del lado izquierdo y P con coeficiente 1.",
		},
	];

	for (let iteration = 1; iteration <= 100; iteration += 1) {
		const tableauBefore = cloneTableau(tableau);
		const objectiveRow = getObjectiveRow(tableau);
		const objectiveIndicators = objectiveRow.values.slice(0, -1);
		const enteringColumn = findEnteringColumn(objectiveIndicators);

		if (enteringColumn === undefined) {
			const objectiveValue = getObjectiveRow(tableau).rhs;
			iterations.push({
				iteration,
				tableauBefore,
				objectiveIndicators,
				ratios: tableau.filter((row) => !row.isObjective).map(() => null),
				rowOperations: [],
			});
			steps.push({
				title: "Leer la solución final",
				description:
					"No quedan indicadores negativos en la fila objetivo, así que el tableau es óptimo.",
				data: { objectiveIndicators },
			});
			return {
				status: "optimal",
				columns,
				initialTableau,
				finalTableau: cloneTableau(tableau),
				iterations,
				objectiveValue:
					(input.direction ?? "max") === "max"
						? objectiveValue
						: -objectiveValue,
				variables: findBasicVariables(tableau, columns),
				steps,
			};
		}

		const constraintRows = tableau.filter((row) => !row.isObjective);
		const ratios = constraintRows.map((row) => {
			const coefficient = row.values[enteringColumn] ?? 0;
			return coefficient > 0 ? row.rhs / coefficient : null;
		});
		const leavingRow = ratios.reduce<number | undefined>(
			(bestRow, ratio, row) => {
				if (ratio === null) {
					return bestRow;
				}
				if (bestRow === undefined) {
					return row;
				}
				const bestRatio = ratios[bestRow];
				return bestRatio === null || ratio < bestRatio ? row : bestRow;
			},
			undefined,
		);

		if (leavingRow === undefined) {
			iterations.push({
				iteration,
				tableauBefore,
				objectiveIndicators,
				ratios,
				rowOperations: [],
			});
			steps.push({
				title: `Iteración ${iteration}`,
				description:
					"La columna pivote no tiene entradas positivas en las restricciones, por eso el problema es no acotado.",
				data: { objectiveIndicators, enteringColumn, ratios },
			});
			return {
				status: "unbounded",
				columns,
				initialTableau,
				finalTableau: cloneTableau(tableau),
				iterations,
				objectiveValue: Number.POSITIVE_INFINITY,
				variables: findBasicVariables(tableau, columns),
				steps,
			};
		}

		const pivot = tableau[leavingRow]?.values[enteringColumn] ?? 0;
		const pivotRowBefore = tableau[leavingRow];
		const normalizedValues =
			pivotRowBefore?.values.map((value) => roundNearZero(value / pivot)) ?? [];
		const normalizedRhs = roundNearZero((pivotRowBefore?.rhs ?? 0) / pivot);
		tableau[leavingRow] = {
			label: columns[enteringColumn] ?? `x${enteringColumn + 1}`,
			values: normalizedValues,
			rhs: normalizedRhs,
			isObjective: false,
		};

		const rowOperations: SimplexRowOperation[] = [
			{
				kind: "normalize",
				row: leavingRow,
				label: `R${leavingRow + 1}`,
				pivotRow: leavingRow,
				sourceCoefficient: pivot,
				multiplier: 1 / pivot,
				cells: createCellTransformations(
					leavingRow,
					pivotRowBefore?.values ?? [],
					pivotRowBefore?.rhs ?? 0,
					normalizedValues,
					normalizedRhs,
					{ kind: "divide", divisor: pivot },
				),
				description: `R${leavingRow + 1} / ${pivot}`,
			},
		];

		for (let row = 0; row < tableau.length; row += 1) {
			if (row === leavingRow) {
				continue;
			}
			const multiplier = tableau[row]?.values[enteringColumn] ?? 0;
			const pivotRow = tableau[leavingRow];
			if (multiplier === 0) {
				continue;
			}
			const rowBeforeValues = [...(tableau[row]?.values ?? [])];
			const rowBeforeRhs = tableau[row]?.rhs ?? 0;
			const nextValues =
				tableau[row]?.values.map((value, column) =>
					roundNearZero(value - multiplier * (pivotRow.values[column] ?? 0)),
				) ?? [];
			const nextRhs = roundNearZero(
				(tableau[row]?.rhs ?? 0) - multiplier * pivotRow.rhs,
			);
			tableau[row] = {
				...tableau[row],
				values: nextValues,
				rhs: nextRhs,
			};
			const operationSign = multiplier > 0 ? "-" : "+";
			rowOperations.push({
				kind: "eliminate",
				row,
				label: tableau[row]?.isObjective ? "Objetivo" : `R${row + 1}`,
				pivotRow: leavingRow,
				sourceCoefficient: multiplier,
				multiplier,
				cells: createCellTransformations(
					row,
					rowBeforeValues,
					rowBeforeRhs,
					nextValues,
					nextRhs,
					{
						kind: "eliminate",
						multiplier,
						pivotValue: pivotRow.values[enteringColumn] ?? 0,
					},
				),
				description: `R${row + 1} ${operationSign} ${Math.abs(multiplier)}R${leavingRow + 1}`,
			});
		}

		iterations.push({
			iteration,
			tableauBefore,
			tableauAfter: cloneTableau(tableau),
			objectiveIndicators,
			ratios,
			pivot: {
				row: leavingRow,
				column: enteringColumn,
				value: pivot,
				enteringVariable: columns[enteringColumn] ?? `x${enteringColumn + 1}`,
				leavingVariable: pivotRowBefore?.label ?? `R${leavingRow + 1}`,
			},
			normalizedPivotRow: [...normalizedValues, normalizedRhs],
			rowOperations,
		});
		steps.push({
			title: `Iteración ${iteration}`,
			description: `Entra ${columns[enteringColumn]}, sale ${pivotRowBefore?.label}, y el pivote es ${pivot}.`,
			data: { enteringColumn, leavingRow, pivot, ratios },
		});
	}

	throw new Error("Simplex tableau did not converge within 100 iterations.");
};

export const solveSimplexTabular = (input: SimplexInput): SimplexSolution => {
	validateSimplexInput(input);

	const direction = input.direction ?? "max";
	const objective =
		direction === "max"
			? [...input.objective]
			: input.objective.map((value) => -value);
	const coefficients = cloneMatrix(input.coefficients);
	const table = createTable({ ...input, objective, coefficients });
	const iterations: SimplexIteration[] = [];
	const steps: AlgorithmStep[] = [
		{
			title: "Initial simplex table",
			description: "Build the table with basis, CB, XB, and all coefficients.",
		},
	];
	let hasAnyAlternateSolution = false;

	for (let iteration = 1; iteration <= 100; iteration += 1) {
		const tableBefore = cloneTable(table);
		const relativeProfits = calculateRelativeProfits(table, objective);
		const alternateSolution = hasAlternateSolution(table, relativeProfits);
		hasAnyAlternateSolution = hasAnyAlternateSolution || alternateSolution;

		const enteringColumn = relativeProfits.indexOf(
			Math.max(...relativeProfits),
		);
		if (relativeProfits.every((profit) => profit <= 0)) {
			const objectiveValue = table.reduce(
				(total, row) => total + (objective[row.basicVariable] ?? 0) * row.value,
				0,
			);
			iterations.push({
				table: tableBefore,
				tableBefore,
				relativeProfits,
				alternateSolution,
			});
			steps.push({
				title: `Iteration ${iteration}`,
				description: "All relative profits are less than or equal to zero.",
				data: { relativeProfits },
			});
			return {
				status: "optimal",
				table: cloneTable(table),
				iterations,
				objectiveValue: direction === "max" ? objectiveValue : -objectiveValue,
				finalBasis: table.map((row) => `x${row.basicVariable + 1}`),
				hasAlternateSolution: hasAnyAlternateSolution,
				steps,
			};
		}

		let ratio = Number.POSITIVE_INFINITY;
		let leavingRow = -1;
		const ratios = table.map((row) => {
			const coefficient = row.coefficients[enteringColumn] ?? 0;
			return row.value > 0 && coefficient > 0 ? row.value / coefficient : null;
		});
		for (let row = 0; row < table.length; row += 1) {
			const coefficient = table[row]?.coefficients[enteringColumn] ?? 0;
			const value = table[row]?.value ?? 0;
			if (value > 0 && coefficient > 0) {
				const candidate = value / coefficient;
				if (candidate < ratio) {
					ratio = candidate;
					leavingRow = row;
				}
			}
		}

		if (leavingRow < 0) {
			iterations.push({
				table: tableBefore,
				tableBefore,
				relativeProfits,
				ratios,
				alternateSolution,
				enteringColumn,
			});
			steps.push({
				title: `Iteration ${iteration}`,
				description: "No positive ratio exists, so the problem is unbounded.",
				data: { tableBefore, relativeProfits, enteringColumn, ratios },
			});
			return {
				status: "unbounded",
				table: cloneTable(table),
				iterations,
				objectiveValue: Number.POSITIVE_INFINITY,
				finalBasis: table.map((row) => `x${row.basicVariable + 1}`),
				hasAlternateSolution: hasAnyAlternateSolution,
				steps,
			};
		}

		const pivot = table[leavingRow]?.coefficients[enteringColumn] ?? 0;
		table[leavingRow] = {
			...table[leavingRow],
			value: (table[leavingRow]?.value ?? 0) / pivot,
			coefficients:
				table[leavingRow]?.coefficients.map((value) => value / pivot) ?? [],
		};

		for (let row = 0; row < table.length; row += 1) {
			if (row === leavingRow) {
				continue;
			}
			const multiplier = table[row]?.coefficients[enteringColumn] ?? 0;
			const pivotRow = table[leavingRow];
			table[row] = {
				...table[row],
				value: (table[row]?.value ?? 0) - multiplier * pivotRow.value,
				coefficients:
					table[row]?.coefficients.map(
						(value, column) =>
							value - multiplier * (pivotRow.coefficients[column] ?? 0),
					) ?? [],
			};
		}

		table[leavingRow] = {
			...table[leavingRow],
			basicVariable: enteringColumn,
			objectiveCoefficient: objective[enteringColumn] ?? 0,
		};
		iterations.push({
			table: tableBefore,
			tableBefore,
			tableAfter: cloneTable(table),
			relativeProfits,
			ratios,
			alternateSolution,
			enteringColumn,
			leavingRow,
			pivot: { row: leavingRow, column: enteringColumn, value: pivot },
		});
		steps.push({
			title: `Iteration ${iteration}`,
			description: `Enter x${enteringColumn + 1}, leave row ${leavingRow + 1}, pivot on ${pivot}.`,
			data: {
				tableBefore,
				tableAfter: cloneTable(table),
				relativeProfits,
				enteringColumn,
				leavingRow,
				pivot,
				ratios,
			},
		});
	}

	throw new Error("Simplex did not converge within 100 iterations.");
};
