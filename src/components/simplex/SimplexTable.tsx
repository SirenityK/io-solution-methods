import { For } from "solid-js";
import type { SimplexCellTransformation, SimplexTableauRow } from "../../lib";

type SimplexTableProps = Readonly<{
	title: string;
	columns: readonly string[];
	rows: readonly SimplexTableauRow[];
	ratios?: readonly (number | null)[];
	ratioRows?: readonly SimplexTableauRow[];
	cellTransformations?: readonly SimplexCellTransformation[];
	pivot?: Readonly<{ row: number; column: number; value: number }>;
	enteringColumn?: number;
	leavingRow?: number;
}>;

export const formatNumber = (value: number): string => {
	if (!Number.isFinite(value)) {
		return value > 0 ? "∞" : "-∞";
	}
	if (Math.abs(value) < 1e-10) {
		return "0";
	}
	if (Number.isInteger(value)) {
		return String(value);
	}
	const rounded = Math.round(value * 1000) / 1000;
	for (let denominator = 2; denominator <= 12; denominator += 1) {
		const numerator = Math.round(value * denominator);
		if (Math.abs(value - numerator / denominator) < 1e-10) {
			return `${numerator}/${denominator}`;
		}
	}
	return rounded.toLocaleString("es-MX", {
		maximumFractionDigits: 3,
		minimumFractionDigits: 0,
	});
};

const getCellTransformation = (
	transformations: readonly SimplexCellTransformation[] | undefined,
	row: number,
	column: number | "rhs",
): SimplexCellTransformation | undefined =>
	transformations?.find(
		(transformation) =>
			transformation.row === row &&
			transformation.column === column &&
			transformation.changed,
	);

const CopyableMoveRight = () => (
	<>
		<span class="sr-only"> -&gt; </span>
		<svg
			aria-hidden="true"
			class="text-base-content/45 size-4"
			fill="none"
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			viewBox="0 0 24 24"
		>
			<path d="M18 8L22 12L18 16" />
			<path d="M2 12H22" />
		</svg>
	</>
);

const renderTransformation = (transformation: SimplexCellTransformation) => {
	const calculation = transformation.calculation;
	const formula =
		calculation.kind === "divide"
			? `${formatNumber(transformation.before)} / ${formatNumber(calculation.divisor)}`
			: `${formatNumber(transformation.before)} ${
					calculation.multiplier > 0 ? "-" : "+"
				} ${formatNumber(Math.abs(calculation.multiplier))}(${formatNumber(calculation.pivotValue)})`;

	return (
		<div class="flex justify-center min-w-28 whitespace-nowrap items-center gap-1 leading-tight">
			<span class="text-info text-xs">{formula}</span>
			<CopyableMoveRight />
			<span class="text-success text-sm font-bold">
				{formatNumber(transformation.after)}
			</span>
		</div>
	);
};

export const SimplexTable = (props: SimplexTableProps) => (
	<div class="card bg-base-100 shadow">
		<div class="card-body gap-4 p-4 sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="card-title">{props.title}</h2>
				<div class="flex flex-wrap gap-2">
					{props.enteringColumn !== undefined && (
						<span class="badge badge-primary">
							Columna pivote: {props.columns[props.enteringColumn]}
						</span>
					)}
					{props.leavingRow !== undefined && (
						<span class="badge badge-warning">
							Fila pivote: R{props.leavingRow + 1}
						</span>
					)}
				</div>
			</div>

			<div class="overflow-x-auto overscroll-x-contain rounded-box border border-base-300">
				<table class="table table-xs min-w-max table-zebra sm:table-sm">
					<thead>
						<tr>
							<th>Base</th>
							<For each={props.columns}>
								{(column, columnIndex) => (
									<th
										class="text-center"
										classList={{
											"bg-primary/15": props.enteringColumn === columnIndex(),
										}}
									>
										{column}
									</th>
								)}
							</For>
							<th class="text-center">B</th>
							<th class="text-center">B / pivote</th>
						</tr>
					</thead>
					<tbody>
						<For each={props.rows}>
							{(row, rowIndex) => (
								<tr
									classList={{
										"font-bold": row.isObjective,
										"bg-warning/10": props.leavingRow === rowIndex(),
									}}
								>
									<th>{row.isObjective ? row.label : `R${rowIndex() + 1}`}</th>
									<For each={props.columns}>
										{(_, columnIndex) => {
											const isPivot = () =>
												props.pivot?.row === rowIndex() &&
												props.pivot.column === columnIndex();
											const transformation = () =>
												getCellTransformation(
													props.cellTransformations,
													rowIndex(),
													columnIndex(),
												);
											return (
												<td
													class="text-center font-mono"
													classList={{
														"align-middle": transformation() !== undefined,
														"bg-primary text-primary-content font-bold":
															isPivot(),
														"bg-info/10":
															transformation() !== undefined && !isPivot(),
														"bg-primary/15":
															props.enteringColumn === columnIndex() &&
															!isPivot() &&
															transformation() === undefined,
													}}
												>
													{transformation()
														? renderTransformation(
																transformation() as SimplexCellTransformation,
															)
														: formatNumber(row.values[columnIndex()] ?? 0)}
												</td>
											);
										}}
									</For>
									<td
										class="text-center font-mono font-semibold"
										classList={{
											"bg-info/10":
												getCellTransformation(
													props.cellTransformations,
													rowIndex(),
													"rhs",
												) !== undefined,
										}}
									>
										{(() => {
											const transformation = getCellTransformation(
												props.cellTransformations,
												rowIndex(),
												"rhs",
											);
											return transformation
												? renderTransformation(transformation)
												: formatNumber(row.rhs);
										})()}
									</td>
									<td class="text-center font-mono">
										{(() => {
											const ratio = props.ratios?.[rowIndex()];
											const sourceRow = props.ratioRows?.[rowIndex()] ?? row;
											const coefficient =
												sourceRow.values[props.enteringColumn ?? 0] ?? 0;
											if (
												row.isObjective ||
												ratio === null ||
												ratio === undefined
											) {
												return "-";
											}
											return (
												<div class="flex min-w-24 items-center gap-1 whitespace-nowrap justify-center">
													<span class="text-info text-xs">
														{formatNumber(sourceRow.rhs)} /{" "}
														{formatNumber(coefficient)}
													</span>
													<CopyableMoveRight />
													<span
														class="text-sm font-bold"
														classList={{
															"text-success": props.leavingRow === rowIndex(),
														}}
													>
														{formatNumber(ratio)}
													</span>
												</div>
											);
										})()}
									</td>
								</tr>
							)}
						</For>
					</tbody>
				</table>
			</div>
		</div>
	</div>
);
