import { createMemo, createSignal, For, Index, Show } from "solid-js";
import {
	createGraphicalPlotModel,
	formatGraphicalLinearExpression,
	formatGraphicalNumber,
	formatGraphicalPoint,
	type GraphicalConstraintInput,
	type GraphicalConstraintOperator,
	type GraphicalLinearProgramInput,
	type GraphicalLinearProgramSolution,
	type GraphicalPlotState,
	graphicalPlotLineColors,
	solveGraphicalLinearProgram,
} from "../lib";
import { Katex } from "./katex";
import { MobileStepControls } from "./transportation/MobileStepControls";
import { StepControls } from "./transportation/StepControls";

type EditableGraphicalProblem = {
	sense: "max" | "min";
	objective: [number, number];
	constraints: GraphicalConstraintInput[];
};

type SolutionState =
	| Readonly<{ solution: GraphicalLinearProgramSolution; error?: never }>
	| Readonly<{ solution?: never; error: string }>;

type QuickReading = Readonly<{
	badge: string;
	lines: readonly string[];
}>;

const exampleProblem: EditableGraphicalProblem = {
	sense: "max",
	objective: [3, 2],
	constraints: [
		{ a: 1, b: 0, operator: "<=", c: 4 },
		{ a: 0, b: 2, operator: "<=", c: 12 },
		{ a: 3, b: 2, operator: "<=", c: 18 },
		{ a: 1, b: 0, operator: ">=", c: 0 },
		{ a: 0, b: 1, operator: ">=", c: 0 },
	],
};

const cloneProblem = (
	problem: EditableGraphicalProblem,
): EditableGraphicalProblem => ({
	sense: problem.sense,
	objective: [...problem.objective],
	constraints: problem.constraints.map((constraint) => ({ ...constraint })),
});

const readNumberInput = (value: number): number | undefined =>
	Number.isFinite(value) ? value : undefined;

const selectInputValue = (input: HTMLInputElement): void => {
	input.select();
};

const toInput = (
	problem: EditableGraphicalProblem,
): GraphicalLinearProgramInput => ({
	sense: problem.sense,
	objective: problem.objective,
	constraints: problem.constraints,
});

const resizeConstraints = (
	problem: EditableGraphicalProblem,
	count: number,
): EditableGraphicalProblem => ({
	...problem,
	constraints: Array.from(
		{ length: Math.min(Math.max(Math.trunc(count), 1), 8) },
		(_, index) =>
			problem.constraints[index] ?? { a: 0, b: 0, operator: "<=", c: 0 },
	),
});

const latexLinear = (a: number, b: number): string =>
	formatGraphicalLinearExpression(a, b)
		.replaceAll("x1", "x_1")
		.replaceAll("x2", "x_2");

const latexConstraint = (constraint: GraphicalConstraintInput): string => {
	const operator = constraint.operator
		.replace("<=", "\\le")
		.replace(">=", "\\ge")
		.replace("<", "<")
		.replace(">", ">");
	return `${latexLinear(constraint.a, constraint.b)} ${operator} ${formatGraphicalNumber(constraint.c)}`;
};

const pluralize = (count: number, singular: string, plural: string): string =>
	count === 1 ? `${count} ${singular}` : `${count} ${plural}`;

const statusLabel = (
	status: GraphicalLinearProgramSolution["status"],
): string => {
	switch (status) {
		case "optimal":
			return "óptimo";
		case "multiple-optimal":
			return "óptimos múltiples";
		case "unbounded":
			return "no acotado";
		case "infeasible":
			return "infactible";
		case "unattained":
			return "valor límite";
		case "no-attained-vertex":
			return "sin vértice alcanzado";
	}
};

const joinNames = (names: readonly string[]): string => {
	if (names.length <= 1) {
		return names[0] ?? "";
	}
	return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
};

const quickReadingFor = (
	solution: GraphicalLinearProgramSolution,
	state: GraphicalPlotState,
	currentStep: number,
): QuickReading => {
	const constraintCount = solution.constraints.length;
	const visibleCount = state.visibleConstraintIndexes.length;

	if (currentStep === 0) {
		return {
			badge: "Planteamiento",
			lines: [
				`Se prepara Z = ${formatGraphicalLinearExpression(solution.objective[0], solution.objective[1])} antes de recortar el plano.`,
				`Hay ${pluralize(constraintCount, "restricción", "restricciones")} por revisar; todavía no hay zona sombreada.`,
			],
		};
	}

	if (currentStep <= constraintCount) {
		const constraint = solution.constraints[currentStep - 1];
		const lines = [
			`Ya se incorporó R${currentStep}: ${constraint.simplifiedLabel}.`,
			`La región común queda filtrada por ${pluralize(visibleCount, "restricción", "restricciones")}.`,
		];

		if (!constraint.boundaryIncluded) {
			lines.push(
				"Su frontera es punteada: guía el límite, pero no se toma como punto alcanzable.",
			);
		} else if (constraint.isRedundant) {
			lines.push(
				"Esta frontera se ve en el plano, aunque no aprieta la región factible final.",
			);
		} else {
			lines.push("La frontera sí cuenta dentro del conjunto factible.");
		}

		return {
			badge: `R${currentStep}`,
			lines,
		};
	}

	if (currentStep === constraintCount + 1) {
		return {
			badge: solution.status === "infeasible" ? "Sin traslape" : "Región final",
			lines:
				solution.status === "infeasible"
					? [
							"Al cruzar todas las zonas válidas, ya no queda región común.",
							"El proceso termina aquí porque no existe punto factible para evaluar.",
						]
					: [
							`La región sombreada ya respeta las ${pluralize(constraintCount, "restricción", "restricciones")} al mismo tiempo.`,
							`Se detectaron ${pluralize(solution.vertices.length, "punto esquina", "puntos esquina")} en la cerradura de esa región.`,
						],
		};
	}

	if (currentStep === constraintCount + 2 && solution.status !== "infeasible") {
		const includedCount = solution.vertices.filter(
			(vertex) => vertex.isIncluded,
		).length;
		return {
			badge: "Vértices",
			lines: [
				`Se nombraron ${pluralize(solution.vertices.length, "vértice candidato", "vértices candidatos")}.`,
				`${pluralize(includedCount, "punto", "puntos")} quedan alcanzables para evaluar Z.`,
			],
		};
	}

	if (solution.status === "unbounded") {
		return {
			badge: "No acotado",
			lines: [
				"La región factible puede avanzar en una dirección que mejora Z.",
				"Por eso no aparece un valor óptimo finito.",
			],
		};
	}

	if (!solution.optimum) {
		return {
			badge: "Cierre",
			lines: [
				"Se terminó la lectura geométrica de la región factible.",
				"No se encontró un vértice alcanzado que cierre un valor óptimo.",
			],
		};
	}

	const optimumNames = joinNames(
		solution.optimum.points.map((point) => point.name),
	);
	return {
		badge: solution.status === "unattained" ? "Valor límite" : "Solución final",
		lines: [
			`${solution.optimum.boundName[0]?.toUpperCase()}${solution.optimum.boundName.slice(1)}: Z = ${formatGraphicalNumber(solution.optimum.value)}.`,
			solution.optimum.segment
				? `La misma Z se sostiene en el segmento entre ${formatGraphicalPoint(solution.optimum.segment.from)} y ${formatGraphicalPoint(solution.optimum.segment.to)}.`
				: `Ocurre en el punto ${optimumNames}.`,
		],
	};
};

const GraphicalPlot = (props: {
	solution: GraphicalLinearProgramSolution;
	state: GraphicalPlotState;
}) => {
	const plot = createMemo(() =>
		createGraphicalPlotModel(props.solution, props.state),
	);

	return (
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body gap-4 p-4 sm:p-6">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 class="card-title">{props.state.title}</h2>
						<p class="text-sm text-base-content/70">
							{props.state.description}
						</p>
					</div>
					<div class="badge badge-primary badge-outline">
						Ventana adaptativa
					</div>
				</div>

				<div class="overflow-x-auto overscroll-x-contain bg-info/10 dark:bg-neutral">
					<svg
						viewBox={`0 0 ${plot().width} ${plot().height}`}
						role="img"
						aria-label="Gráfica incremental del método gráfico"
						class="min-h-80 w-full min-w-120 bg-base-200 sm:min-h-90 sm:min-w-155"
					>
						<defs>
							<marker
								id="arrow-head"
								markerWidth="10"
								markerHeight="10"
								refX="7"
								refY="3"
								orient="auto"
							>
								<path d="M0,0 L0,6 L8,3 z" class="fill-base-content" />
							</marker>
						</defs>

						<For each={plot().gridLines}>
							{(gridLine) => (
								<line
									x1={gridLine.from.x}
									y1={gridLine.from.y}
									x2={gridLine.to.x}
									y2={gridLine.to.y}
									class="stroke-base-300/80 dark:stroke-base-content/15"
								/>
							)}
						</For>

						<Show when={plot().xAxis}>
							{(axis) => (
								<line
									x1={axis().from.x}
									y1={axis().from.y}
									x2={axis().to.x}
									y2={axis().to.y}
									class="stroke-base-content"
									stroke-width="2"
									marker-end="url(#arrow-head)"
								/>
							)}
						</Show>
						<Show when={plot().yAxis}>
							{(axis) => (
								<line
									x1={axis().from.x}
									y1={axis().from.y}
									x2={axis().to.x}
									y2={axis().to.y}
									class="stroke-base-content"
									stroke-width="2"
									marker-end="url(#arrow-head)"
								/>
							)}
						</Show>
						<For each={plot().xTicks}>
							{(tick) => (
								<text
									x={tick.point.x + 4}
									y={Math.min(
										Math.max(tick.point.y + 18, 18),
										plot().height - 4,
									)}
									class="fill-base-content/70 text-[11px]"
								>
									{formatGraphicalNumber(tick.value)}
								</text>
							)}
						</For>
						<For each={plot().yTicks}>
							{(tick) => (
								<text
									x={Math.min(Math.max(tick.point.x + 8, 8), plot().width - 36)}
									y={tick.point.y - 4}
									class="fill-base-content/70 text-[11px]"
								>
									{formatGraphicalNumber(tick.value)}
								</text>
							)}
						</For>
						<text
							x={plot().width - 28}
							y="24"
							class="fill-base-content text-sm font-bold"
						>
							x₁
						</text>
						<text x="16" y="24" class="fill-base-content text-sm font-bold">
							x₂
						</text>

						<Show when={plot().feasibleRegionPath}>
							{(path) => (
								<path
									d={path()}
									class="fill-info/20 stroke-info dark:fill-info/25 dark:stroke-info"
									stroke-width="2"
								/>
							)}
						</Show>

						<Show when={plot().optimalSegment}>
							{(segment) => (
								<line
									x1={segment().from.x}
									y1={segment().from.y}
									x2={segment().to.x}
									y2={segment().to.y}
									class="stroke-warning"
									stroke-width="9"
									stroke-linecap="round"
								/>
							)}
						</Show>

						<For each={plot().lines}>
							{(plotLine) => (
								<>
									<path
										d={plotLine.path}
										stroke={plotLine.color}
										stroke-width="4"
										stroke-dasharray={plotLine.isDashed ? "10 8" : undefined}
										fill="none"
									/>
									<text
										x={plotLine.labelPoint.x}
										y={plotLine.labelPoint.y}
										fill={plotLine.color}
										class="text-sm font-black"
									>
										{plotLine.label}
									</text>
								</>
							)}
						</For>

						<Show when={plot().unboundedArrow}>
							{(arrow) => (
								<line
									x1={arrow().from.x}
									y1={arrow().from.y}
									x2={arrow().to.x}
									y2={arrow().to.y}
									class="stroke-base-content"
									stroke-width="5"
									stroke-dasharray="12 8"
									marker-end="url(#arrow-head)"
								/>
							)}
						</Show>

						<For each={plot().vertices}>
							{(vertex) => (
								<Show when={vertex.isVisible}>
									<circle
										cx={vertex.screenPoint.x}
										cy={vertex.screenPoint.y}
										r={vertex.isHighlighted ? 7 : 5}
										class={
											vertex.isHighlighted
												? "fill-base-content stroke-base-100"
												: "fill-base-content/70 stroke-base-100"
										}
										stroke-width="2"
									/>
									<text
										x={vertex.screenPoint.x + 9}
										y={vertex.screenPoint.y - 9}
										class="fill-base-content text-base font-black"
									>
										{vertex.name}
									</text>
								</Show>
							)}
						</For>
					</svg>
				</div>

				<div class="flex flex-wrap gap-2">
					<For each={props.state.visibleConstraintIndexes}>
						{(constraintIndex) => (
							<div class="badge badge-info badge-soft gap-2">
								<span
									class="inline-block h-3 w-3 rounded-full"
									style={{
										"background-color":
											graphicalPlotLineColors[
												constraintIndex % graphicalPlotLineColors.length
											],
									}}
								/>
								R{constraintIndex + 1}:{" "}
								{props.solution.constraints[constraintIndex].simplifiedLabel}
							</div>
						)}
					</For>
				</div>
			</div>
		</div>
	);
};

const ProblemEditor = (props: {
	problem: EditableGraphicalProblem;
	onProblemChange: (problem: EditableGraphicalProblem) => void;
	onReset: () => void;
}) => {
	const changeConstraint = (
		index: number,
		change: Partial<GraphicalConstraintInput>,
	) => {
		const next = cloneProblem(props.problem);
		next.constraints[index] = { ...next.constraints[index], ...change };
		props.onProblemChange(next);
	};
	const changeConstraintNumber = (
		index: number,
		key: "a" | "b" | "c",
		value: number,
	) => {
		const nextValue = readNumberInput(value);
		if (nextValue === undefined) {
			return;
		}
		changeConstraint(index, { [key]: nextValue });
	};

	return (
		<div class="card bg-base-100 shadow">
			<div class="card-body gap-4 p-4 sm:p-6">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 class="card-title">Problema editable</h2>
						<p class="text-sm text-base-content/70">
							No se agregan restricciones de no negatividad automáticamente. Si
							quieres primer cuadrante, captura <Katex math="x_1\ge 0" />
							{" y "}
							<Katex math="x_2\ge 0" />
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

				<div class="grid gap-3 md:grid-cols-[10rem_1fr_1fr_10rem]">
					<label class="form-control space-x-2">
						<span class="label-text">Tipo</span>
						<select
							class="select select-bordered"
							value={props.problem.sense}
							onChange={(event) =>
								props.onProblemChange({
									...cloneProblem(props.problem),
									sense: event.currentTarget.value === "min" ? "min" : "max",
								})
							}
						>
							<option value="max">Maximizar</option>
							<option value="min">Minimizar</option>
						</select>
					</label>
					<Index each={props.problem.objective}>
						{(coefficient, index) => (
							<label class="form-control space-x-2">
								<span class="label-text">Coeficiente c{index + 1}</span>
								<input
									type="number"
									inputmode="decimal"
									class="input input-bordered font-mono"
									value={coefficient()}
									onFocus={(event) => selectInputValue(event.currentTarget)}
									onInput={(event) => {
										const nextValue = readNumberInput(
											event.currentTarget.valueAsNumber,
										);
										if (nextValue === undefined) {
											return;
										}
										const next = cloneProblem(props.problem);
										next.objective[index] = nextValue;
										props.onProblemChange(next);
									}}
								/>
							</label>
						)}
					</Index>
					<label class="form-control space-x-2">
						<span class="label-text">Restricciones</span>
						<input
							type="number"
							min="1"
							max="8"
							inputmode="numeric"
							class="input input-bordered font-mono"
							value={props.problem.constraints.length}
							onFocus={(event) => selectInputValue(event.currentTarget)}
							onInput={(event) => {
								const nextValue = readNumberInput(
									event.currentTarget.valueAsNumber,
								);
								if (nextValue === undefined) {
									return;
								}
								props.onProblemChange(
									resizeConstraints(props.problem, nextValue),
								);
							}}
						/>
					</label>
				</div>

				<div class="overflow-x-auto overscroll-x-contain rounded-box border border-base-300">
					<table class="table table-xs min-w-max sm:table-sm">
						<thead>
							<tr>
								<th>Restricción</th>
								<th class="text-center">x1</th>
								<th class="text-center">x2</th>
								<th class="text-center">Relación</th>
								<th class="text-center">c</th>
							</tr>
						</thead>
						<tbody>
							<Index each={props.problem.constraints}>
								{(constraint, index) => (
									<tr>
										<th>R{index + 1}</th>
										<td>
											<input
												type="number"
												inputmode="decimal"
												class="input input-bordered h-11 w-24 text-center font-mono sm:input-sm sm:h-8 sm:text-right"
												value={constraint().a}
												onFocus={(event) =>
													selectInputValue(event.currentTarget)
												}
												onInput={(event) =>
													changeConstraintNumber(
														index,
														"a",
														event.currentTarget.valueAsNumber,
													)
												}
											/>
										</td>
										<td>
											<input
												type="number"
												inputmode="decimal"
												class="input input-bordered h-11 w-24 text-center font-mono sm:input-sm sm:h-8 sm:text-right"
												value={constraint().b}
												onFocus={(event) =>
													selectInputValue(event.currentTarget)
												}
												onInput={(event) =>
													changeConstraintNumber(
														index,
														"b",
														event.currentTarget.valueAsNumber,
													)
												}
											/>
										</td>
										<td>
											<select
												class="select select-bordered h-11 sm:select-sm sm:h-8"
												value={constraint().operator}
												onChange={(event) =>
													changeConstraint(index, {
														operator: event.currentTarget
															.value as GraphicalConstraintOperator,
													})
												}
											>
												<option value="<=">{"<="}</option>
												<option value=">=">{">="}</option>
												<option value="=">{"="}</option>
												<option value="<">&lt;</option>
												<option value=">">&gt;</option>
											</select>
										</td>
										<td>
											<input
												type="number"
												inputmode="decimal"
												class="input input-bordered h-11 w-24 text-center font-mono sm:input-sm sm:h-8 sm:text-right"
												value={constraint().c}
												onFocus={(event) =>
													selectInputValue(event.currentTarget)
												}
												onInput={(event) =>
													changeConstraintNumber(
														index,
														"c",
														event.currentTarget.valueAsNumber,
													)
												}
											/>
										</td>
									</tr>
								)}
							</Index>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

const ConstraintNotebook = (props: {
	solution: GraphicalLinearProgramSolution;
	constraintIndex: number;
}) => {
	const constraint = () => props.solution.constraints[props.constraintIndex];
	return (
		<div class="card bg-base-100 shadow">
			<div class="card-body gap-4 p-4 sm:p-6">
				<h2 class="card-title">Restricción {props.constraintIndex + 1}</h2>
				<div class="prose max-w-none">
					<p>
						Tomamos esta restricción exactamente como aparece en el problema:
					</p>
				</div>
				<Katex displayMode math={latexConstraint(constraint().original)} />
				<Show when={constraint().wasSimplified}>
					<div class="alert alert-info">
						<span>
							Se puede simplificar. Queda: {constraint().simplifiedLabel}. Esta
							forma es la que usamos para dibujar con más claridad.
						</span>
					</div>
				</Show>
				<p>
					La línea de frontera se obtiene cambiando la relación por igualdad:
				</p>
				<Katex
					displayMode
					math={`${latexLinear(constraint().simplified.a, constraint().simplified.b)} = ${formatGraphicalNumber(constraint().simplified.c)}`}
				/>
				<Show when={constraint().kind === "vertical"}>
					<p>
						Esta es una línea vertical. Eso significa que x1 queda fijo,
						mientras x2 puede subir o bajar sobre la misma recta.
					</p>
				</Show>
				<Show when={constraint().kind === "horizontal"}>
					<p>
						Esta es una línea horizontal. Eso significa que x2 queda fijo,
						mientras x1 puede moverse a la izquierda o derecha.
					</p>
				</Show>
				<Show when={constraint().kind === "general"}>
					<div class="space-y-3">
						<p>
							Para dibujarla buscamos dos puntos, normalmente los interceptos.
						</p>
						<Show when={constraint().intercepts.x1Zero}>
							{(point) => (
								<p>
									Si x1 = 0, sustituimos en la ecuación y se obtiene el punto{" "}
									{formatGraphicalPoint(point())}.
								</p>
							)}
						</Show>
						<Show when={constraint().intercepts.x2Zero}>
							{(point) => (
								<p>
									Si x2 = 0, sustituimos en la ecuación y se obtiene el punto{" "}
									{formatGraphicalPoint(point())}.
								</p>
							)}
						</Show>
					</div>
				</Show>
				<p>{constraint().validSideDescription}</p>
				<p>
					La frontera se dibuja como línea{" "}
					{constraint().boundaryIncluded ? "continua" : "punteada"}.
					{constraint().boundaryIncluded
						? " Los puntos sobre la línea sí cuentan."
						: " Los puntos exactamente sobre la línea no cuentan porque la desigualdad es estricta."}
				</p>
				<Show when={constraint().isRedundant}>
					<div class="alert alert-warning">
						<span>
							Esta restricción se conserva y se dibuja, pero no cambia la
							frontera final de la región factible; en este caso es redundante.
						</span>
					</div>
				</Show>
			</div>
		</div>
	);
};

const VertexAndObjectiveNotebook = (props: {
	solution: GraphicalLinearProgramSolution;
}) => (
	<div class="card bg-base-100 shadow">
		<div class="card-body gap-4 p-4 sm:p-6">
			<h2 class="card-title">Puntos esquina y función objetivo</h2>
			<Show
				when={props.solution.status !== "infeasible"}
				fallback={
					<div class="alert alert-error">
						<span>
							Después de combinar todas las restricciones, no queda traslape.
							Por eso no hay región factible ni solución posible.
						</span>
					</div>
				}
			>
				<p>
					Ahora buscamos las esquinas. Cada esquina sale de intersectar líneas
					de frontera y luego revisar si el punto cumple todas las
					restricciones.
				</p>
				<div class="grid gap-3 md:grid-cols-2">
					<For each={props.solution.vertices}>
						{(vertex) => (
							<div class="rounded-box bg-base-200 p-4">
								<h3 class="font-bold">Punto {vertex.name}</h3>
								<p>
									{vertex.name} = {formatGraphicalPoint(vertex.point)}
								</p>
								<p class="text-sm text-base-content/70">
									Sale de la(s) restricción(es):{" "}
									{vertex.activeConstraintIndexes
										.map((index) => index + 1)
										.join(", ")}
									.
								</p>
								<Show when={vertex.isDegenerate}>
									<p class="text-sm text-warning">
										Aquí se juntan más de dos restricciones; es un vértice
										degenerado.
									</p>
								</Show>
								<Show when={!vertex.isIncluded}>
									<p class="text-sm text-error">
										Este punto está sobre una frontera estricta, así que sirve
										como límite visual pero no se puede tomar como solución
										alcanzada.
									</p>
								</Show>
							</div>
						)}
					</For>
				</div>

				<Show when={props.solution.status === "unbounded"}>
					<div class="alert alert-warning">
						<span>
							La región factible continúa infinitamente en una dirección que
							mejora Z. Por eso el problema no tiene valor óptimo finito.
						</span>
					</div>
				</Show>

				<Show when={props.solution.optimum}>
					{(optimum) => (
						<>
							<div class="overflow-x-auto overscroll-x-contain rounded-box border border-base-300">
								<table class="table table-xs min-w-max sm:table-sm">
									<thead>
										<tr>
											<th>Punto</th>
											<th>Coordenadas</th>
											<th>Z</th>
										</tr>
									</thead>
									<tbody>
										<For
											each={props.solution.vertices.filter(
												(vertex) => vertex.isIncluded,
											)}
										>
											{(vertex) => (
												<tr
													class={
														optimum().points.some(
															(point) => point.name === vertex.name,
														)
															? "bg-primary/10"
															: undefined
													}
												>
													<th>{vertex.name}</th>
													<td>{formatGraphicalPoint(vertex.point)}</td>
													<td>
														{formatGraphicalNumber(vertex.objectiveValue)}
													</td>
												</tr>
											)}
										</For>
									</tbody>
								</table>
							</div>
							<div class="alert alert-success alert-soft text-lg">
								<span>
									El {optimum().boundName} es Z ={" "}
									{formatGraphicalNumber(optimum().value)}.
									<Show
										when={optimum().segment}
										fallback={` Ocurre en ${optimum()
											.points.map(
												(point) =>
													`${point.name} = ${formatGraphicalPoint(point.point)}`,
											)
											.join(", ")}.`}
									>
										{(segment) =>
											` Ocurre en todo el segmento entre ${formatGraphicalPoint(segment().from)} y ${formatGraphicalPoint(segment().to)}.`
										}
									</Show>
								</span>
							</div>
						</>
					)}
				</Show>
			</Show>
		</div>
	</div>
);

const CurrentNotebook = (props: {
	solution: GraphicalLinearProgramSolution;
	currentStep: number;
}) => {
	const constraintCount = () => props.solution.constraints.length;
	return (
		<Show
			when={props.currentStep > 0}
			fallback={
				<div class="card bg-base-100 shadow">
					<div class="card-body gap-4 p-4 sm:p-6">
						<h2 class="card-title">Planteamiento</h2>
						<p>Primero escribimos la función objetivo con claridad.</p>
						<Katex
							displayMode
							math={`Z = ${latexLinear(props.solution.objective[0], props.solution.objective[1])}`}
						/>
						<p>
							Después listamos las restricciones, sin inventar{" "}
							<Katex math="x_{1}\ge 0" /> ni <Katex math="x_{2}\ge 0" /> si no
							aparecen.
						</p>
						<For each={props.solution.constraints}>
							{(constraint) => (
								<Katex
									displayMode
									math={latexConstraint(constraint.original)}
								/>
							)}
						</For>
					</div>
				</div>
			}
		>
			<Show
				when={props.currentStep <= constraintCount()}
				fallback={<VertexAndObjectiveNotebook solution={props.solution} />}
			>
				<ConstraintNotebook
					solution={props.solution}
					constraintIndex={props.currentStep - 1}
				/>
			</Show>
		</Show>
	);
};

const QuickReadingCard = (props: {
	solution: GraphicalLinearProgramSolution;
	state: GraphicalPlotState;
	currentStep: number;
}) => {
	const quickReading = createMemo(() =>
		quickReadingFor(props.solution, props.state, props.currentStep),
	);

	return (
		<div class="card bg-base-200">
			<div class="card-body gap-3">
				<h2 class="card-title">Lectura rápida</h2>
				<div class="flex flex-wrap gap-2">
					<div class="badge badge-secondary badge-soft">
						Estado: {statusLabel(props.solution.status)}
					</div>
					<div class="badge badge-outline">{quickReading().badge}</div>
				</div>
				<div class="space-y-2 border-base-content/10 border-t pt-3">
					<For each={quickReading().lines}>
						{(line) => <p class="text-sm text-base-content/75">{line}</p>}
					</For>
				</div>
				<Show when={props.solution.missingNonnegativity.length > 0}>
					<div class="alert alert-info text-sm">
						<span>
							{`Falta declarar ${props.solution.missingNonnegativity.join(" y ")} >= 0. Por eso la gráfica permite valores negativos si las demás restricciones lo permiten.`}
						</span>
					</div>
				</Show>
				<For each={props.solution.notes}>
					{(note) => <p class="text-sm text-base-content/75">{note}</p>}
				</For>
			</div>
		</div>
	);
};

export const GraphicalLpExplorer = () => {
	const [problem, setProblem] = createSignal<EditableGraphicalProblem>(
		cloneProblem(exampleProblem),
	);
	const [selectedStep, setSelectedStep] = createSignal(0);
	const solutionState = createMemo<SolutionState>(() => {
		try {
			return { solution: solveGraphicalLinearProgram(toInput(problem())) };
		} catch (error) {
			return {
				error:
					error instanceof Error
						? error.message
						: "No se pudo resolver el problema gráfico.",
			};
		}
	});
	const maxStep = createMemo(() =>
		Math.max((solutionState().solution?.plotStates.length ?? 1) - 1, 0),
	);
	const currentPlotState = createMemo(
		() =>
			solutionState().solution?.plotStates[Math.min(selectedStep(), maxStep())],
	);

	const changeProblem = (nextProblem: EditableGraphicalProblem) => {
		setProblem(nextProblem);
		setSelectedStep(0);
	};

	const goToStep = (step: number) => {
		setSelectedStep(Math.min(Math.max(step, 0), maxStep()));
	};

	return (
		<div class="mx-auto max-w-7xl px-4 pt-8 pb-28 lg:pb-8">
			<section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
				<div class="min-w-0 space-y-4">
					<div class="rounded-box bg-linear-to-br from-info/10 via-base-200 to-primary/10 p-6">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div class="badge badge-primary badge-outline">
								Método gráfico
							</div>
						</div>
						<h1 class="mt-3 text-3xl font-bold md:text-4xl">
							Programación lineal de dos variables, paso a paso
						</h1>
						<p class="mt-3 max-w-3xl text-base-content/75">
							La solución se construye como en libreta: se dibuja una frontera a
							la vez, se prueba el lado válido, se intersectan restricciones y
							se evalúan los puntos esquina.
						</p>
					</div>

					<ProblemEditor
						problem={problem()}
						onProblemChange={changeProblem}
						onReset={() => changeProblem(cloneProblem(exampleProblem))}
					/>

					<Show
						when={solutionState().solution && currentPlotState()}
						fallback={
							<div class="alert alert-error">
								<span>{solutionState().error}</span>
							</div>
						}
					>
						<GraphicalPlot
							solution={
								solutionState().solution as GraphicalLinearProgramSolution
							}
							state={currentPlotState() as GraphicalPlotState}
						/>
						<CurrentNotebook
							solution={
								solutionState().solution as GraphicalLinearProgramSolution
							}
							currentStep={selectedStep()}
						/>
					</Show>
				</div>

				<aside class="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
					<div class="hidden lg:block">
						<StepControls
							currentStep={selectedStep()}
							maxStep={maxStep()}
							onStepChange={goToStep}
						/>
					</div>
					<Show when={solutionState().solution && currentPlotState()}>
						<QuickReadingCard
							solution={
								solutionState().solution as GraphicalLinearProgramSolution
							}
							state={currentPlotState() as GraphicalPlotState}
							currentStep={selectedStep()}
						/>
					</Show>
				</aside>
			</section>

			<MobileStepControls
				currentStep={selectedStep()}
				maxStep={maxStep()}
				onStepChange={goToStep}
			/>
		</div>
	);
};
