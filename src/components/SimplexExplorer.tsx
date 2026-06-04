import { createMemo, createSignal, Show } from "solid-js";
import type { SimplexTableauInput } from "../lib";
import { solveSimplexTableau } from "../lib";
import { SimplexProblemEditor } from "./simplex/SimplexProblemEditor";
import { SimplexResultSummary } from "./simplex/SimplexResultSummary";
import { SimplexStepExplanation } from "./simplex/SimplexStepExplanation";
import { SimplexTable } from "./simplex/SimplexTable";
import type { EditableSimplexProblem } from "./simplex/types";
import { MobileStepControls } from "./transportation/MobileStepControls";
import { StepControls } from "./transportation/StepControls";

type SimplexSolutionState =
	| Readonly<{
			solution: ReturnType<typeof solveSimplexTableau>;
			error?: never;
	  }>
	| Readonly<{ solution?: never; error: string }>;

const classExample: EditableSimplexProblem = {
	constraints: [
		[2, 1],
		[1, 1],
		[1, 2],
	],
	resources: [10, 7, 12],
	objective: [30, 40],
	decisionVariableNames: ["x", "y"],
	objectiveName: "P",
};

const cloneProblem = (
	problem: EditableSimplexProblem,
): EditableSimplexProblem => ({
	constraints: problem.constraints.map((row) => [...row]),
	resources: [...problem.resources],
	objective: [...problem.objective],
	decisionVariableNames: [...problem.decisionVariableNames],
	objectiveName: problem.objectiveName,
});

const clampDimension = (count: number, maximum: number): number =>
	Math.min(Math.max(Math.trunc(count), 1), maximum);

const createVariableNames = (count: number): string[] => {
	const defaultNames = ["x", "y", "z", "w", "v", "u"];
	return Array.from(
		{ length: count },
		(_, index) => defaultNames[index] ?? `x${index + 1}`,
	);
};

const resizeProblem = (
	problem: EditableSimplexProblem,
	constraintCount: number,
	variableCount: number,
): EditableSimplexProblem => {
	const boundedConstraints = clampDimension(constraintCount, 6);
	const boundedVariables = clampDimension(variableCount, 6);
	const fallbackNames = createVariableNames(boundedVariables);

	return {
		constraints: Array.from({ length: boundedConstraints }, (_, row) =>
			Array.from(
				{ length: boundedVariables },
				(_, column) => problem.constraints[row]?.[column] ?? 0,
			),
		),
		resources: Array.from(
			{ length: boundedConstraints },
			(_, row) => problem.resources[row] ?? 0,
		),
		objective: Array.from(
			{ length: boundedVariables },
			(_, column) => problem.objective[column] ?? 0,
		),
		decisionVariableNames: Array.from(
			{ length: boundedVariables },
			(_, column) =>
				problem.decisionVariableNames[column] ?? fallbackNames[column],
		),
		objectiveName: problem.objectiveName,
	};
};

const toSimplexInput = (
	problem: EditableSimplexProblem,
): SimplexTableauInput => ({
	constraints: problem.constraints,
	resources: problem.resources,
	objective: problem.objective,
	decisionVariableNames: problem.decisionVariableNames,
	objectiveName: problem.objectiveName,
});

export const SimplexExplorer = () => {
	const [problem, setProblem] = createSignal<EditableSimplexProblem>(
		cloneProblem(classExample),
	);
	const [selectedStep, setSelectedStep] = createSignal(0);
	const solutionState = createMemo<SimplexSolutionState>(() => {
		try {
			return { solution: solveSimplexTableau(toSimplexInput(problem())) };
		} catch (error) {
			return {
				error:
					error instanceof Error
						? error.message
						: "No se pudo resolver el tableau.",
			};
		}
	});
	const maxStep = createMemo(
		() => solutionState().solution?.iterations.length ?? 0,
	);
	const currentIteration = createMemo(() => {
		const solution = solutionState().solution;
		if (!solution || selectedStep() === 0) {
			return undefined;
		}
		return solution.iterations[selectedStep() - 1];
	});
	const displayedRows = createMemo(() => {
		const solution = solutionState().solution;
		if (!solution) {
			return [];
		}
		if (selectedStep() === 0) {
			return solution.initialTableau;
		}
		const iteration = currentIteration();
		return iteration?.tableauAfter ?? iteration?.tableauBefore ?? [];
	});
	const tableTitle = createMemo(() => {
		if (selectedStep() === 0) {
			return "Tableau inicial";
		}
		return currentIteration()?.tableauAfter
			? "Tableau actualizado"
			: "Tableau final";
	});

	const changeProblem = (nextProblem: EditableSimplexProblem) => {
		setProblem(nextProblem);
		setSelectedStep(0);
	};

	const goToStep = (step: number) => {
		setSelectedStep(Math.min(Math.max(step, 0), maxStep()));
	};

	const changeConstraintCoefficient = (
		row: number,
		column: number,
		value: number,
	) => {
		const nextProblem = cloneProblem(problem());
		nextProblem.constraints[row][column] = value;
		changeProblem(nextProblem);
	};

	const changeResource = (row: number, value: number) => {
		const nextProblem = cloneProblem(problem());
		nextProblem.resources[row] = value;
		changeProblem(nextProblem);
	};

	const changeObjective = (column: number, value: number) => {
		const nextProblem = cloneProblem(problem());
		nextProblem.objective[column] = value;
		changeProblem(nextProblem);
	};

	const changeConstraintCount = (count: number) => {
		const currentProblem = problem();
		changeProblem(
			resizeProblem(currentProblem, count, currentProblem.objective.length),
		);
	};

	const changeVariableCount = (count: number) => {
		const currentProblem = problem();
		changeProblem(
			resizeProblem(currentProblem, currentProblem.resources.length, count),
		);
	};

	const resetProblem = () => {
		changeProblem(cloneProblem(classExample));
	};

	return (
		<div class="mx-auto max-w-7xl px-4 pt-8 pb-28 lg:pb-8">
			<section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
				<div class="min-w-0 space-y-4">
					<div class="rounded-box bg-linear-to-r from-info/10 to-primary/10 via-base-200 p-6">
						<div class="badge badge-primary badge-outline">Simplex tabular</div>
						<h1 class="mt-3 text-3xl font-bold md:text-4xl">
							Método simplex con tableau completo
						</h1>
						<p class="mt-3 max-w-3xl text-base-content/75">
							Se agregan holguras, se construye la fila objetivo con
							coeficientes negativos, se elige el indicador más negativo y se
							aplican operaciones por fila hasta que ya no queden negativos.
						</p>
					</div>

					<SimplexProblemEditor
						problem={problem()}
						onConstraintCoefficientChange={changeConstraintCoefficient}
						onResourceChange={changeResource}
						onObjectiveChange={changeObjective}
						onConstraintCountChange={changeConstraintCount}
						onVariableCountChange={changeVariableCount}
						onReset={resetProblem}
					/>

					<Show
						when={solutionState().solution}
						fallback={
							<div class="alert alert-error">
								<span>{solutionState().error}</span>
							</div>
						}
					>
						{(solution) => (
							<SimplexTable
								title={tableTitle()}
								columns={solution().columns}
								rows={displayedRows()}
								ratios={currentIteration()?.ratios}
								ratioRows={currentIteration()?.tableauBefore}
								cellTransformations={currentIteration()?.rowOperations.flatMap(
									(operation) => operation.cells,
								)}
								pivot={currentIteration()?.pivot}
								enteringColumn={currentIteration()?.pivot?.column}
								leavingRow={currentIteration()?.pivot?.row}
							/>
						)}
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
					<Show when={solutionState().solution}>
						{(solution) => (
							<>
								<SimplexStepExplanation
									currentStep={selectedStep()}
									iteration={currentIteration()}
									solution={solution()}
								/>
								<SimplexResultSummary
									isComplete={selectedStep() === maxStep()}
									solution={solution()}
									decisionVariableNames={problem().decisionVariableNames}
								/>
							</>
						)}
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
