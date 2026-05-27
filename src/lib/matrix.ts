import type {
	MutableBooleanMatrix,
	MutableMatrix,
	NumericMatrix,
} from "./types";

export const cloneVector = (values: readonly number[]): number[] => [...values];

export const cloneMatrix = (matrix: NumericMatrix): MutableMatrix =>
	matrix.map((row) => [...row]);

export const createNumberMatrix = (
	rows: number,
	columns: number,
	fill = 0,
): MutableMatrix =>
	Array.from({ length: rows }, () =>
		Array.from({ length: columns }, () => fill),
	);

export const createBooleanMatrix = (
	rows: number,
	columns: number,
	fill = false,
): MutableBooleanMatrix =>
	Array.from({ length: rows }, () =>
		Array.from({ length: columns }, () => fill),
	);

export const sumVector = (values: readonly number[]): number =>
	values.reduce((sum, value) => sum + value, 0);

export const assertRectangularMatrix = (
	matrix: NumericMatrix,
	name: string,
): void => {
	if (matrix.length === 0) {
		throw new Error(`${name} must have at least one row.`);
	}

	const columns = matrix[0]?.length ?? 0;
	if (columns === 0) {
		throw new Error(`${name} must have at least one column.`);
	}

	for (const [rowIndex, row] of matrix.entries()) {
		if (row.length !== columns) {
			throw new Error(
				`${name} row ${rowIndex + 1} has ${row.length} columns; expected ${columns}.`,
			);
		}
	}
};

export const assertFiniteNumbers = (
	values: readonly number[],
	name: string,
): void => {
	for (const [index, value] of values.entries()) {
		if (!Number.isFinite(value)) {
			throw new Error(`${name}[${index}] must be a finite number.`);
		}
	}
};
