import { Index } from "solid-js";
import type { TransportationInput } from "../../lib";

type TransportationProblemEditorProps = Readonly<{
	problem: TransportationInput;
	onCostChange: (row: number, column: number, value: number) => void;
	onSupplyChange: (row: number, value: number) => void;
	onDemandChange: (column: number, value: number) => void;
	onOriginCountChange: (count: number) => void;
	onDestinationCountChange: (count: number) => void;
	onReset: () => void;
}>;

const readNumberInput = (value: number): number =>
	Number.isFinite(value) ? value : 0;

const selectInputValue = (input: HTMLInputElement): void => {
	input.select();
};

export const TransportationProblemEditor = (
	props: TransportationProblemEditorProps,
) => (
	<div class="card bg-base-100 shadow">
		<div class="card-body gap-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="card-title">Datos del problema</h2>
					<p class="text-sm text-base-content/70">
						Edita costos, ofertas y demandas. Si no están balanceadas, se agrega
						automáticamente un origen o destino ficticio.
					</p>
				</div>
				<button
					type="button"
					class="btn btn-outline btn-sm"
					onClick={props.onReset}
				>
					Restaurar ejemplo
				</button>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<label class="form-control space-x-2">
					<span class="label">
						<span class="label-text">Orígenes</span>
					</span>
					<input
						type="number"
						min="1"
						max="8"
						inputmode="numeric"
						class="input input-bordered text-center font-mono"
						value={props.problem.supply.length}
						onFocus={(event) => selectInputValue(event.currentTarget)}
						onInput={(event) =>
							props.onOriginCountChange(
								Math.max(1, readNumberInput(event.currentTarget.valueAsNumber)),
							)
						}
					/>
				</label>

				<label class="form-control space-x-2">
					<span class="label">
						<span class="label-text">Destinos</span>
					</span>
					<input
						type="number"
						min="1"
						max="8"
						inputmode="numeric"
						class="input input-bordered text-center font-mono"
						value={props.problem.demand.length}
						onFocus={(event) => selectInputValue(event.currentTarget)}
						onInput={(event) =>
							props.onDestinationCountChange(
								Math.max(1, readNumberInput(event.currentTarget.valueAsNumber)),
							)
						}
					/>
				</label>
			</div>

			<div class="overflow-x-auto">
				<table class="table table-sm">
					<thead>
						<tr>
							<th>Origen</th>
							<Index each={props.problem.demand}>
								{(_, column) => <th class="text-center">D{column + 1}</th>}
							</Index>
							<th class="text-center">Oferta</th>
						</tr>
					</thead>
					<tbody>
						<Index each={props.problem.costs}>
							{(rowCosts, row) => (
								<tr>
									<th>O{row + 1}</th>
									<Index each={rowCosts()}>
										{(cost, column) => (
											<td>
												<input
													type="number"
													min="0"
													inputmode="numeric"
													class="input input-bordered input-sm w-20 text-center font-mono sm:text-right"
													value={cost()}
													aria-label={`Costo O${row + 1}-D${column + 1}`}
													onFocus={(event) =>
														selectInputValue(event.currentTarget)
													}
													onInput={(event) =>
														props.onCostChange(
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
									<td>
										<input
											type="number"
											min="0"
											inputmode="numeric"
											class="input input-bordered input-sm w-24 text-center font-mono sm:text-right"
											value={props.problem.supply[row] ?? 0}
											aria-label={`Oferta O${row + 1}`}
											onFocus={(event) => selectInputValue(event.currentTarget)}
											onInput={(event) =>
												props.onSupplyChange(
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
							<th>Demanda</th>
							<Index each={props.problem.demand}>
								{(demand, column) => (
									<th>
										<input
											type="number"
											min="0"
											inputmode="numeric"
											class="input input-bordered input-sm w-20 text-center font-mono sm:text-right"
											value={demand()}
											aria-label={`Demanda D${column + 1}`}
											onFocus={(event) => selectInputValue(event.currentTarget)}
											onInput={(event) =>
												props.onDemandChange(
													column,
													readNumberInput(event.currentTarget.valueAsNumber),
												)
											}
										/>
									</th>
								)}
							</Index>
							<th></th>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	</div>
);
