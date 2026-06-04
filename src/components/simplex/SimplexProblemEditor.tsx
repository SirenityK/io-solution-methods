import { Index } from "solid-js";
import { Katex } from "../katex";
import type { EditableSimplexProblem } from "./types";

type SimplexProblemEditorProps = Readonly<{
	problem: EditableSimplexProblem;
	onConstraintCoefficientChange: (
		row: number,
		column: number,
		value: number,
	) => void;
	onResourceChange: (row: number, value: number) => void;
	onObjectiveChange: (column: number, value: number) => void;
	onConstraintCountChange: (count: number) => void;
	onVariableCountChange: (count: number) => void;
	onReset: () => void;
}>;

const readNumberInput = (value: number): number =>
	Number.isFinite(value) ? value : 0;

const selectInputValue = (input: HTMLInputElement): void => {
	input.select();
};

export const SimplexProblemEditor = (props: SimplexProblemEditorProps) => (
	<div class="card bg-base-100 shadow">
		<div class="card-body gap-4 p-4 sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="card-title">Problema original</h2>
					<p class="text-sm text-base-content/70">
						Captura un problema de maximización con restricciones de tipo menor
						o igual. Las variables de holgura se agregan automáticamente.
					</p>
				</div>
				<button
					type="button"
					class="btn btn-outline sm:btn-sm"
					onClick={props.onReset}
				>
					Restaurar ejemplo
				</button>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<label class="form-control space-x-2">
					<span>Restricciones</span>
					<input
						type="number"
						min="1"
						max="6"
						inputmode="numeric"
						class="input input-bordered font-mono"
						value={props.problem.resources.length}
						onFocus={(event) => selectInputValue(event.currentTarget)}
						onInput={(event) =>
							props.onConstraintCountChange(
								Math.max(1, readNumberInput(event.currentTarget.valueAsNumber)),
							)
						}
					/>
				</label>

				<label class="form-control space-x-2">
					<span>Variables de decisión</span>
					<input
						type="number"
						min="1"
						max="6"
						inputmode="numeric"
						class="input input-bordered font-mono"
						value={props.problem.objective.length}
						onFocus={(event) => selectInputValue(event.currentTarget)}
						onInput={(event) =>
							props.onVariableCountChange(
								Math.max(1, readNumberInput(event.currentTarget.valueAsNumber)),
							)
						}
					/>
				</label>
			</div>

			<div class="overflow-x-auto overscroll-x-contain rounded-box border border-base-300">
				<table class="table table-xs min-w-max sm:table-sm">
					<thead>
						<tr>
							<th>Fila</th>
							<Index each={props.problem.decisionVariableNames}>
								{(name) => <th class="text-center">{name()}</th>}
							</Index>
							<th class="text-center">Relación</th>
							<th class="text-center">B</th>
						</tr>
					</thead>
					<tbody>
						<Index each={props.problem.constraints}>
							{(rowCoefficients, row) => (
								<tr>
									<th>R{row + 1}</th>
									<Index each={rowCoefficients()}>
										{(coefficient, column) => (
											<td>
												<input
													type="number"
													inputmode="decimal"
													class="input input-bordered h-11 w-20 text-center font-mono sm:input-sm sm:h-8 sm:text-right"
													value={coefficient()}
													aria-label={`Coeficiente de ${props.problem.decisionVariableNames[column] ?? `x${column + 1}`} en restricción ${row + 1}`}
													onFocus={(event) =>
														selectInputValue(event.currentTarget)
													}
													onInput={(event) =>
														props.onConstraintCoefficientChange(
															row,
															column,
															readNumberInput(
																event.currentTarget.valueAsNumber,
															),
														)
													}
												/>
											</td>
										)}
									</Index>
									<td class="text-center font-semibold">
										<Katex math="\le" />
									</td>
									<td>
										<input
											type="number"
											min="0"
											inputmode="decimal"
											class="input input-bordered h-11 w-24 text-center font-mono sm:input-sm sm:h-8 sm:text-right"
											value={props.problem.resources[row] ?? 0}
											aria-label={`Recurso de restricción ${row + 1}`}
											onFocus={(event) => selectInputValue(event.currentTarget)}
											onInput={(event) =>
												props.onResourceChange(
													row,
													readNumberInput(event.currentTarget.valueAsNumber),
												)
											}
										/>
									</td>
								</tr>
							)}
						</Index>
					</tbody>
					<tfoot>
						<tr>
							<th>{props.problem.objectiveName}</th>
							<Index each={props.problem.objective}>
								{(coefficient, column) => (
									<th>
										<input
											type="number"
											min="0"
											inputmode="decimal"
											class="input input-bordered h-11 w-20 text-center font-mono sm:input-sm sm:h-8 sm:text-right"
											value={coefficient()}
											aria-label={`Coeficiente objetivo de ${props.problem.decisionVariableNames[column] ?? `x${column + 1}`}`}
											onFocus={(event) => selectInputValue(event.currentTarget)}
											onInput={(event) =>
												props.onObjectiveChange(
													column,
													readNumberInput(event.currentTarget.valueAsNumber),
												)
											}
										/>
									</th>
								)}
							</Index>
							<th class="text-center">max</th>
							<th></th>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	</div>
);
