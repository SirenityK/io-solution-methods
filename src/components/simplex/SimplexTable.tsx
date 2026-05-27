import { For } from "solid-js";
import type { SimplexTableauRow } from "../../lib";

type SimplexTableProps = Readonly<{
	title: string;
	columns: readonly string[];
	rows: readonly SimplexTableauRow[];
	ratios?: readonly (number | null)[];
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

export const SimplexTable = (props: SimplexTableProps) => (
	<div class="card bg-base-100 shadow">
		<div class="card-body gap-4">
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

			<div class="overflow-x-auto rounded-box border border-base-300">
				<table class="table table-zebra">
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
											return (
												<td
													class="text-center font-mono"
													classList={{
														"bg-primary text-primary-content font-bold":
															isPivot(),
														"bg-primary/15":
															props.enteringColumn === columnIndex() &&
															!isPivot(),
													}}
												>
													{formatNumber(row.values[columnIndex()] ?? 0)}
												</td>
											);
										}}
									</For>
									<td class="text-center font-mono font-semibold">
										{formatNumber(row.rhs)}
									</td>
									<td class="text-center font-mono">
										{row.isObjective ||
										props.ratios?.[rowIndex()] === null ||
										props.ratios?.[rowIndex()] === undefined
											? "-"
											: formatNumber(props.ratios[rowIndex()] ?? 0)}
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
