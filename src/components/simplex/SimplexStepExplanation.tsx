import { For, Show } from "solid-js";
import type {
	SimplexTableauIteration,
	SimplexTableauSolution,
} from "../../lib";
import { formatNumber } from "./SimplexTable";

type SimplexStepExplanationProps = Readonly<{
	currentStep: number;
	iteration?: SimplexTableauIteration;
	solution: SimplexTableauSolution;
}>;

export const SimplexStepExplanation = (props: SimplexStepExplanationProps) => (
	<div class="card bg-base-200">
		<div class="card-body gap-4">
			<div>
				<div class="badge badge-primary badge-outline">
					{props.currentStep === 0
						? "Preparación"
						: `Iteración ${props.currentStep}`}
				</div>
				<h2 class="card-title mt-3">Procedimiento</h2>
			</div>

			<Show
				when={props.iteration}
				fallback={
					<div class="space-y-3">
						<p>
							Se agregan variables de holgura para convertir cada restricción
							menor o igual en una ecuación.
						</p>
						<p>
							Después se escribe la función objetivo con todas las variables del
							lado izquierdo: los coeficientes de decisión quedan negativos y la
							columna {props.solution.columns.at(-1)} queda con coeficiente 1.
						</p>
					</div>
				}
			>
				{(iteration) => (
					<div class="space-y-3">
						<p>
							Se revisa la fila objetivo. La columna pivote es el indicador más
							negativo; si ya no hay negativos, el tableau es óptimo.
						</p>

						<div class="rounded-box bg-base-100 p-3">
							<div class="text-sm font-semibold">
								Indicadores de la fila objetivo
							</div>
							<div class="mt-2 flex flex-wrap gap-2">
								<For each={iteration().objectiveIndicators}>
									{(indicator, column) => (
										<span
											class="badge"
											classList={{
												"badge-primary": iteration().pivot?.column === column(),
												"badge-ghost": iteration().pivot?.column !== column(),
											}}
										>
											{props.solution.columns[column()]}:{" "}
											{formatNumber(indicator)}
										</span>
									)}
								</For>
							</div>
						</div>

						<Show
							when={iteration().pivot}
							fallback={
								<p>
									{props.solution.status === "unbounded"
										? "No hay cocientes positivos en la columna pivote, así que el problema es no acotado."
										: "Como no quedan indicadores negativos, se leen las variables básicas desde la columna B."}
								</p>
							}
						>
							{(pivot) => (
								<>
									<p>
										Entra {pivot().enteringVariable} y sale{" "}
										{pivot().leavingVariable}. El elemento pivote es{" "}
										{formatNumber(pivot().value)}, ubicado en la fila{" "}
										{pivot().row + 1}.
									</p>

									<div class="rounded-box bg-base-100 p-3">
										<div class="text-sm font-semibold">Prueba de cocientes</div>
										<div class="mt-2 space-y-2 text-sm">
											<For each={iteration().ratios}>
												{(ratio, row) => (
													<div class="flex items-center justify-between gap-3">
														<span>R{row() + 1}</span>
														<span
															class="badge"
															classList={{
																"badge-warning": pivot().row === row(),
																"badge-ghost": pivot().row !== row(),
															}}
														>
															{ratio === null
																? "No aplica"
																: formatNumber(ratio)}
														</span>
													</div>
												)}
											</For>
										</div>
									</div>

									<div class="rounded-box bg-base-100 p-3">
										<div class="text-sm font-semibold">
											Operaciones por fila
										</div>
										<ul class="mt-2 space-y-1 text-sm">
											<For each={iteration().rowOperations}>
												{(operation) => <li>{operation.description}</li>}
											</For>
										</ul>
									</div>
								</>
							)}
						</Show>
					</div>
				)}
			</Show>
		</div>
	</div>
);
