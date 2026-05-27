import { Show } from "solid-js";
import type { NorthwestCornerStepTrace } from "../../lib";

type NorthwestCornerStepExplanationProps = Readonly<{
	trace?: NorthwestCornerStepTrace;
}>;

const describeMove = (trace: NorthwestCornerStepTrace): string => {
	if (trace.nextMove === "diagonal") {
		return "La oferta y la demanda llegaron a cero; se avanza en diagonal.";
	}
	if (trace.nextMove === "down") {
		return "La oferta se agotó; se baja al siguiente origen.";
	}
	return "La demanda se satisfizo; se avanza al siguiente destino.";
};

export const NorthwestCornerStepExplanation = (
	props: NorthwestCornerStepExplanationProps,
) => (
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<Show
				when={props.trace}
				fallback={
					<div>
						<h2 class="card-title">Tabla inicial</h2>
						<p>
							Se inicia en la celda superior izquierda activa: O1-D1. La regla
							consiste en asignar lo más posible y avanzar según lo que se
							agote.
						</p>
					</div>
				}
			>
				{(trace) => (
					<div class="space-y-3">
						<h2 class="card-title">
							Celda actual O{trace().row + 1}-D{trace().column + 1}
						</h2>
						<p>
							Se asigna el mínimo entre la oferta disponible (
							{trace().supplyBefore[trace().row]}) y la demanda pendiente (
							{trace().demandBefore[trace().column]}):{" "}
							<span class="font-bold text-primary">{trace().amount}</span>.
						</p>
						<div class="alert alert-success">
							<span>{describeMove(trace())}</span>
						</div>
						<div class="stats stats-vertical bg-base-200">
							<div class="stat">
								<div class="stat-title">Oferta O{trace().row + 1}</div>
								<div class="stat-value text-2xl">
									{trace().supplyBefore[trace().row]} - {trace().amount} ={" "}
									{trace().supplyAfter[trace().row]}
								</div>
							</div>
							<div class="stat">
								<div class="stat-title">Demanda D{trace().column + 1}</div>
								<div class="stat-value text-2xl">
									{trace().demandBefore[trace().column]} - {trace().amount} ={" "}
									{trace().demandAfter[trace().column]}
								</div>
							</div>
						</div>
					</div>
				)}
			</Show>
		</div>
	</div>
);
