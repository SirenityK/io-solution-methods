import type { TransportationInput } from "../../lib";

export type TransportationTableState = Readonly<{
	allocation: number[][];
	basic: boolean[][];
	supply: readonly number[];
	demand: readonly number[];
	activeRows: readonly boolean[];
	activeColumns: readonly boolean[];
	selected?: Readonly<{ row: number; column: number }>;
	rowPenalties?: readonly (number | undefined)[];
	columnPenalties?: readonly (number | undefined)[];
}>;

export type TransportationCellState = Readonly<{
	cost: number;
	allocation: number;
	isBasic: boolean;
	isSelected: boolean;
	isInactiveRow: boolean;
	isInactiveColumn: boolean;
}>;

export type TransportationProblem = Pick<
	TransportationInput,
	"costs" | "supply" | "demand"
>;
