import { Show } from "solid-js";
import type { VogelStepTrace } from "../../lib";

type VogelStepExplanationProps = Readonly<{
	trace?: VogelStepTrace;
}>;

const formatAxis = (trace: VogelStepTrace): string =>
	trace.selectedAxis === "row"
		? `fila O${trace.selectedIndex + 1}`
		: `columna D${trace.selectedIndex + 1}`;

export const VogelStepExplanation = (props: VogelStepExplanationProps) => (
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<Show
				when={props.trace}
				fallback={
					<div>
						<h2 class="card-title">Tabla inicial</h2>
						<p>
							En cada vuelta se calculan penalizaciones por fila y columna. Se
							elige la penalización mayor y dentro de esa fila o columna se toma
							el menor costo activo.
						</p>
					</div>
				}
			>
				{(trace) => (
					<div class="space-y-3">
						<h2 class="card-title">Penalización mayor</h2>
						<p>
							La mayor penalización es{" "}
							<span class="font-bold text-primary">
								{trace().selectedPenalty}
							</span>{" "}
							en la {formatAxis(trace())}. Ahí se selecciona la celda O
							{trace().row + 1}-D{trace().column + 1}, con costo{" "}
							<span class="font-bold text-primary">{trace().cost}</span>.
						</p>
						<p>
							Se asigna{" "}
							<span class="font-bold text-primary">{trace().amount}</span>, que
							es el mínimo entre la oferta disponible (
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
										: "Origen sigue activo."}
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
										: "Destino sigue activo."}
								</div>
							</div>
						</div>
					</div>
				)}
			</Show>
		</div>
	</div>
);
