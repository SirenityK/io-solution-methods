import { line, scaleLinear } from "d3";
import type {
	NonlinearConstraintInput,
	NonlinearPlotState,
	NonlinearPoint,
	NonlinearProgramSolution,
	NonlinearWindow,
} from "./nonlinear-graphical";
import { nonlinearConstraintContainsClosed } from "./nonlinear-graphical";

const SAMPLE_COUNT = 180;
const CURVE_EPSILON = 1e-4;

export const nonlinearPlotLineColors = [
	"#2563eb",
	"#dc2626",
	"#16a34a",
	"#9333ea",
	"#c2410c",
	"#0e7490",
	"#be123c",
	"#4f46e5",
] as const;

export type NonlinearScreenPoint = Readonly<{ x: number; y: number }>;

export type NonlinearPlotCurve = Readonly<{
	constraintIndex: number;
	label: string;
	color: string;
	paths: readonly string[];
	labelPoint: NonlinearScreenPoint;
	isDashed: boolean;
}>;

export type NonlinearPlotCandidate = Readonly<{
	name: string;
	point: NonlinearPoint;
	screenPoint: NonlinearScreenPoint;
	isHighlighted: boolean;
	isVisible: boolean;
}>;

export type NonlinearPlotModel = Readonly<{
	width: number;
	height: number;
	xAxis?: Readonly<{ from: NonlinearScreenPoint; to: NonlinearScreenPoint }>;
	yAxis?: Readonly<{ from: NonlinearScreenPoint; to: NonlinearScreenPoint }>;
	xTicks: readonly Readonly<{ value: number; point: NonlinearScreenPoint }>[];
	yTicks: readonly Readonly<{ value: number; point: NonlinearScreenPoint }>[];
	gridLines: readonly Readonly<{
		from: NonlinearScreenPoint;
		to: NonlinearScreenPoint;
		axis: "x" | "y";
	}>[];
	feasibleSamples: readonly NonlinearScreenPoint[];
	curves: readonly NonlinearPlotCurve[];
	candidates: readonly NonlinearPlotCandidate[];
}>;

const createPath = (
	points: readonly NonlinearScreenPoint[],
): string | undefined =>
	line<NonlinearScreenPoint>()
		.x((point) => point.x)
		.y((point) => point.y)(points) ?? undefined;

const lineBoundaryPoints = (
	constraint: NonlinearConstraintInput,
	window: NonlinearWindow,
): readonly NonlinearPoint[] => {
	const points: NonlinearPoint[] = [];
	const addIfInside = (point: NonlinearPoint) => {
		const inside =
			point.x1 >= window.minX - CURVE_EPSILON &&
			point.x1 <= window.maxX + CURVE_EPSILON &&
			point.x2 >= window.minY - CURVE_EPSILON &&
			point.x2 <= window.maxY + CURVE_EPSILON;
		if (
			inside &&
			!points.some(
				(existing) =>
					Math.hypot(existing.x1 - point.x1, existing.x2 - point.x2) <=
					CURVE_EPSILON,
			)
		) {
			points.push(point);
		}
	};
	if (Math.abs(constraint.b) > CURVE_EPSILON) {
		addIfInside({
			x1: window.minX,
			x2: (constraint.c - constraint.a * window.minX) / constraint.b,
		});
		addIfInside({
			x1: window.maxX,
			x2: (constraint.c - constraint.a * window.maxX) / constraint.b,
		});
	}
	if (Math.abs(constraint.a) > CURVE_EPSILON) {
		addIfInside({
			x1: (constraint.c - constraint.b * window.minY) / constraint.a,
			x2: window.minY,
		});
		addIfInside({
			x1: (constraint.c - constraint.b * window.maxY) / constraint.a,
			x2: window.maxY,
		});
	}
	return points.slice(0, 2);
};

const quadraticBoundarySegments = (
	constraint: NonlinearConstraintInput,
	window: NonlinearWindow,
): readonly (readonly NonlinearPoint[])[] => {
	if (
		Math.abs(constraint.q1) <= CURVE_EPSILON &&
		Math.abs(constraint.q2) <= CURVE_EPSILON
	) {
		const segment = lineBoundaryPoints(constraint, window);
		return segment.length === 2 ? [segment] : [];
	}

	const branches: NonlinearPoint[][] = [[], []];
	for (let index = 0; index <= SAMPLE_COUNT; index += 1) {
		const x1 =
			window.minX + ((window.maxX - window.minX) * index) / SAMPLE_COUNT;
		const qa = constraint.q2;
		const qb = constraint.b;
		const qc = constraint.q1 * x1 ** 2 + constraint.a * x1 - constraint.c;
		if (Math.abs(qa) <= CURVE_EPSILON) {
			if (Math.abs(qb) > CURVE_EPSILON) {
				const x2 = -qc / qb;
				if (
					x2 >= window.minY - CURVE_EPSILON &&
					x2 <= window.maxY + CURVE_EPSILON
				) {
					branches[0].push({ x1, x2 });
				}
			}
			continue;
		}
		const discriminant = qb ** 2 - 4 * qa * qc;
		if (discriminant < -CURVE_EPSILON) {
			continue;
		}
		const root = Math.sqrt(Math.max(0, discriminant));
		const values = [(-qb - root) / (2 * qa), (-qb + root) / (2 * qa)];
		values.forEach((x2, branchIndex) => {
			if (
				x2 >= window.minY - CURVE_EPSILON &&
				x2 <= window.maxY + CURVE_EPSILON
			) {
				branches[branchIndex].push({ x1, x2 });
			}
		});
	}
	return branches.filter((branch) => branch.length > 1);
};

const feasibleSamples = (
	solution: NonlinearProgramSolution,
	state: NonlinearPlotState,
): NonlinearPoint[] => {
	if (!state.showFeasibleRegion) {
		return [];
	}
	const visibleConstraints = state.visibleConstraintIndexes.map(
		(index) => solution.constraints[index].original,
	);
	const samples: NonlinearPoint[] = [];
	const columns = 44;
	const rows = 32;
	for (let column = 0; column <= columns; column += 1) {
		for (let row = 0; row <= rows; row += 1) {
			const point = {
				x1:
					solution.window.minX +
					((solution.window.maxX - solution.window.minX) * column) / columns,
				x2:
					solution.window.minY +
					((solution.window.maxY - solution.window.minY) * row) / rows,
			};
			if (
				visibleConstraints.every((constraint) =>
					nonlinearConstraintContainsClosed(constraint, point),
				)
			) {
				samples.push(point);
			}
		}
	}
	return samples;
};

export const createNonlinearPlotModel = (
	solution: NonlinearProgramSolution,
	state: NonlinearPlotState,
	size: Readonly<{ width: number; height: number }> = {
		width: 760,
		height: 520,
	},
): NonlinearPlotModel => {
	const xScale = scaleLinear()
		.domain([solution.window.minX, solution.window.maxX])
		.range([0, size.width]);
	const yScale = scaleLinear()
		.domain([solution.window.minY, solution.window.maxY])
		.range([size.height, 0]);
	const toScreen = (point: NonlinearPoint): NonlinearScreenPoint => ({
		x: xScale(point.x1),
		y: yScale(point.x2),
	});
	const xTicks = xScale
		.ticks(8)
		.map((value) => ({ value, point: { x: xScale(value), y: yScale(0) } }));
	const yTicks = yScale
		.ticks(8)
		.map((value) => ({ value, point: { x: xScale(0), y: yScale(value) } }));
	const gridLines = [
		...xTicks.map((tick) => ({
			from: { x: tick.point.x, y: 0 },
			to: { x: tick.point.x, y: size.height },
			axis: "x" as const,
		})),
		...yTicks.map((tick) => ({
			from: { x: 0, y: tick.point.y },
			to: { x: size.width, y: tick.point.y },
			axis: "y" as const,
		})),
	];
	const curves = state.visibleConstraintIndexes.flatMap((constraintIndex) => {
		const constraint = solution.constraints[constraintIndex];
		const screenSegments = quadraticBoundarySegments(
			constraint.original,
			solution.window,
		).map((segment) => segment.map(toScreen));
		const paths = screenSegments.flatMap((segment) => {
			const path = createPath(segment);
			return path ? [path] : [];
		});
		if (paths.length === 0) {
			return [];
		}
		const labelPoint = screenSegments[0]?.[
			Math.floor((screenSegments[0]?.length ?? 1) / 2)
		] ?? { x: 12, y: 18 };
		return [
			{
				constraintIndex,
				label: `R${constraintIndex + 1}`,
				color:
					nonlinearPlotLineColors[
						constraintIndex % nonlinearPlotLineColors.length
					],
				paths,
				labelPoint: {
					x: Math.min(Math.max(labelPoint.x + 10, 12), size.width - 56),
					y: Math.min(Math.max(labelPoint.y - 10, 18), size.height - 10),
				},
				isDashed: !constraint.boundaryIncluded,
			},
		];
	});
	const highlightedNames = new Set(state.highlightedCandidateNames);
	const candidates = solution.candidates.map((candidate) => ({
		name: candidate.name,
		point: candidate.point,
		screenPoint: toScreen(candidate.point),
		isHighlighted: highlightedNames.has(candidate.name),
		isVisible:
			highlightedNames.has(candidate.name) ||
			state.title.includes("Candidatos") ||
			state.title.includes("Solución") ||
			state.title.includes("Valor"),
	}));
	const xAxis =
		solution.window.minY <= 0 && solution.window.maxY >= 0
			? {
					from: toScreen({ x1: solution.window.minX, x2: 0 }),
					to: toScreen({ x1: solution.window.maxX, x2: 0 }),
				}
			: undefined;
	const yAxis =
		solution.window.minX <= 0 && solution.window.maxX >= 0
			? {
					from: toScreen({ x1: 0, x2: solution.window.minY }),
					to: toScreen({ x1: 0, x2: solution.window.maxY }),
				}
			: undefined;

	return {
		width: size.width,
		height: size.height,
		xAxis,
		yAxis,
		xTicks,
		yTicks,
		gridLines,
		feasibleSamples: feasibleSamples(solution, state).map(toScreen),
		curves,
		candidates,
	};
};
