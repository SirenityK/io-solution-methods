type CurrentCostSummaryProps = Readonly<{
	isComplete: boolean;
	totalCost: number;
	methodLabel: string;
}>;

const formatCurrency = (value: number): string =>
	new Intl.NumberFormat("es-MX", {
		maximumFractionDigits: 0,
	}).format(value);

export const CurrentCostSummary = (props: CurrentCostSummaryProps) => (
	<div class="stats stats-vertical bg-base-200 shadow">
		<div class="stat">
			<div class="stat-title">Costo total actual</div>
			<div class="stat-value text-primary">
				{props.isComplete ? formatCurrency(props.totalCost) : "En proceso"}
			</div>
			<div class="stat-desc">
				{props.isComplete
					? `Resultado de la solución inicial por ${props.methodLabel}.`
					: "Se muestra al terminar las asignaciones."}
			</div>
		</div>
	</div>
);
