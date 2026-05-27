import { Show } from "solid-js";
import type { LeastCostStepTrace } from "../../lib";

type LeastCostStepExplanationProps = Readonly<{
	trace?: LeastCostStepTrace;
}>;

export const LeastCostStepExplanation = (
	props: LeastCostStepExplanationProps,
) => (
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<Show
				when={props.trace}
				fallback={
					<div>
						<h2 class="card-title">Tabla inicial</h2>
						<p>
							Aún no hay asignaciones. Todas las filas y columnas están activas,
							así que el algoritmo revisa todos los costos.
						</p>
					</div>
				}
			>
				{(trace) => (
					<div class="space-y-3">
						<h2 class="card-title">
							Se elige O{trace().row + 1}-D{trace().column + 1}
						</h2>
						<p>
							El costo activo más bajo es{" "}
							<span class="font-bold text-primary">{trace().cost}</span>. Se
							asigna{" "}
							<span class="font-bold text-primary">{trace().amount}</span>{" "}
							porque es el menor entre la oferta disponible (
							{trace().supplyBefore[trace().row]}) y la demanda pendiente (
							{trace().demandBefore[trace().column]}).
						</p>
						<div class="stats stats-vertical bg-base-200">
							<div class="stat">
								<div class="stat-title">Oferta O{trace().row + 1}</div>
								<div class="stat-value text-2xl">
									{trace().supplyBefore[trace().row]} - {trace().amount} ={" "}
									{trace().supplyAfter[trace().row]}
								</div>
								<div class="stat-desc">
									{trace().exhaustedRow
										? "Origen agotado; se tacha su oferta."
										: "Origen sigue activo para pasos posteriores."}
								</div>
							</div>
							<div class="stat">
								<div class="stat-title">Demanda D{trace().column + 1}</div>
								<div class="stat-value text-2xl">
									{trace().demandBefore[trace().column]} - {trace().amount} ={" "}
									{trace().demandAfter[trace().column]}
								</div>
								<div class="stat-desc">
									{trace().satisfiedColumn
										? "Destino satisfecho; se tacha su demanda."
										: "Destino sigue activo para pasos posteriores."}
								</div>
							</div>
						</div>
					</div>
				)}
			</Show>
		</div>
	</div>
);
