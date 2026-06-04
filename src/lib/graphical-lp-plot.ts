import { line, scaleLinear } from "d3";
import type {
  GraphicalConstraintInput,
  GraphicalLinearProgramSolution,
  GraphicalPlotState,
  GraphicalPoint,
  GraphicalWindow,
} from "./graphical-lp";

const FEASIBILITY_EPSILON = 1e-7;

export const graphicalPlotLineColors = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#c2410c",
  "#0e7490",
  "#be123c",
  "#4f46e5",
] as const;

export type GraphicalPlotTheme = "light" | "dark";

export type GraphicalScreenPoint = Readonly<{
  x: number;
  y: number;
}>;

export type GraphicalPlotLine = Readonly<{
  constraintIndex: number;
  label: string;
  color: string;
  path: string;
  labelPoint: GraphicalScreenPoint;
  isDashed: boolean;
}>;

export type GraphicalPlotVertex = Readonly<{
  name: string;
  point: GraphicalPoint;
  screenPoint: GraphicalScreenPoint;
  isHighlighted: boolean;
  isVisible: boolean;
}>;

export type GraphicalPlotModel = Readonly<{
  width: number;
  height: number;
  xAxis?: Readonly<{ from: GraphicalScreenPoint; to: GraphicalScreenPoint }>;
  yAxis?: Readonly<{ from: GraphicalScreenPoint; to: GraphicalScreenPoint }>;
  xTicks: readonly Readonly<{ value: number; point: GraphicalScreenPoint }>[];
  yTicks: readonly Readonly<{ value: number; point: GraphicalScreenPoint }>[];
  gridLines: readonly Readonly<{
    from: GraphicalScreenPoint;
    to: GraphicalScreenPoint;
    axis: "x" | "y";
  }>[];
  feasibleRegionPath?: string;
  lines: readonly GraphicalPlotLine[];
  vertices: readonly GraphicalPlotVertex[];
  unboundedArrow?: Readonly<{
    from: GraphicalScreenPoint;
    to: GraphicalScreenPoint;
  }>;
  optimalSegment?: Readonly<{
    from: GraphicalScreenPoint;
    to: GraphicalScreenPoint;
  }>;
}>;

const containsClosedSide = (
  constraint: GraphicalConstraintInput,
  point: GraphicalPoint,
): boolean => {
  const value = constraint.a * point.x1 + constraint.b * point.x2;
  if (constraint.operator === "<=" || constraint.operator === "<") {
    return value <= constraint.c + FEASIBILITY_EPSILON;
  }
  if (constraint.operator === ">=" || constraint.operator === ">") {
    return value >= constraint.c - FEASIBILITY_EPSILON;
  }
  return true;
};

const intersectionWithBoundary = (
  first: GraphicalPoint,
  second: GraphicalPoint,
  constraint: GraphicalConstraintInput,
): GraphicalPoint => {
  const firstValue =
    constraint.a * first.x1 + constraint.b * first.x2 - constraint.c;
  const secondValue =
    constraint.a * second.x1 + constraint.b * second.x2 - constraint.c;
  const ratio = firstValue / (firstValue - secondValue);
  return {
    x1: first.x1 + (second.x1 - first.x1) * ratio,
    x2: first.x2 + (second.x2 - first.x2) * ratio,
  };
};

const clipPolygon = (
  polygon: readonly GraphicalPoint[],
  constraint: GraphicalConstraintInput,
): GraphicalPoint[] => {
  if (constraint.operator === "=") {
    return [...polygon];
  }

  const clipped: GraphicalPoint[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const currentInside = containsClosedSide(constraint, current);
    const previousInside = containsClosedSide(constraint, previous);

    if (currentInside && !previousInside) {
      clipped.push(intersectionWithBoundary(previous, current, constraint));
    }
    if (currentInside) {
      clipped.push(current);
    }
    if (!currentInside && previousInside) {
      clipped.push(intersectionWithBoundary(previous, current, constraint));
    }
  }

  return clipped;
};

const feasiblePolygon = (
  solution: GraphicalLinearProgramSolution,
  state: GraphicalPlotState,
): GraphicalPoint[] => {
  if (state.shadeIntersectionUpTo === undefined) {
    return [];
  }

  let polygon: GraphicalPoint[] = [
    { x1: solution.window.minX, x2: solution.window.minY },
    { x1: solution.window.maxX, x2: solution.window.minY },
    { x1: solution.window.maxX, x2: solution.window.maxY },
    { x1: solution.window.minX, x2: solution.window.maxY },
  ];

  for (let index = 0; index <= state.shadeIntersectionUpTo; index += 1) {
    const constraint = solution.constraints[index]?.simplified;
    if (constraint) {
      polygon = clipPolygon(polygon, constraint);
    }
  }

  return polygon;
};

const lineSegmentFor = (
  constraint: GraphicalConstraintInput,
  window: GraphicalWindow,
): readonly [GraphicalPoint, GraphicalPoint] | undefined => {
  const points: GraphicalPoint[] = [];
  const addIfInside = (point: GraphicalPoint) => {
    const inside =
      point.x1 >= window.minX - FEASIBILITY_EPSILON &&
      point.x1 <= window.maxX + FEASIBILITY_EPSILON &&
      point.x2 >= window.minY - FEASIBILITY_EPSILON &&
      point.x2 <= window.maxY + FEASIBILITY_EPSILON;
    if (
      inside &&
      !points.some(
        (candidate) =>
          Math.hypot(candidate.x1 - point.x1, candidate.x2 - point.x2) <=
          FEASIBILITY_EPSILON,
      )
    ) {
      points.push(point);
    }
  };

  if (Math.abs(constraint.b) > FEASIBILITY_EPSILON) {
    addIfInside({
      x1: window.minX,
      x2: (constraint.c - constraint.a * window.minX) / constraint.b,
    });
    addIfInside({
      x1: window.maxX,
      x2: (constraint.c - constraint.a * window.maxX) / constraint.b,
    });
  }
  if (Math.abs(constraint.a) > FEASIBILITY_EPSILON) {
    addIfInside({
      x1: (constraint.c - constraint.b * window.minY) / constraint.a,
      x2: window.minY,
    });
    addIfInside({
      x1: (constraint.c - constraint.b * window.maxY) / constraint.a,
      x2: window.maxY,
    });
  }

  return points.length >= 2 ? [points[0], points[1]] : undefined;
};

const createPath = (
  points: readonly GraphicalScreenPoint[],
  closed = false,
) => {
  const path = line<GraphicalScreenPoint>()
    .x((point) => point.x)
    .y((point) => point.y)(points);

  if (!path) {
    return undefined;
  }

  return closed ? `${path}Z` : path;
};

export const createGraphicalPlotModel = (
  solution: GraphicalLinearProgramSolution,
  state: GraphicalPlotState,
  size: Readonly<{ width: number; height: number }> = {
    width: 760,
    height: 520,
  },
): GraphicalPlotModel => {
  const xScale = scaleLinear()
    .domain([solution.window.minX, solution.window.maxX])
    .range([0, size.width]);
  const yScale = scaleLinear()
    .domain([solution.window.minY, solution.window.maxY])
    .range([size.height, 0]);
  const toScreen = (point: GraphicalPoint): GraphicalScreenPoint => ({
    x: xScale(point.x1),
    y: yScale(point.x2),
  });
  const xTicks = xScale.ticks(8).map((value) => ({
    value,
    point: { x: xScale(value), y: yScale(0) },
  }));
  const yTicks = yScale.ticks(8).map((value) => ({
    value,
    point: { x: xScale(0), y: yScale(value) },
  }));
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
  const polygon = feasiblePolygon(solution, state).map(toScreen);
  const feasibleRegionPath =
    state.showFeasibleRegion && polygon.length > 2
      ? createPath(polygon, true)
      : undefined;
  const highlightedNames = new Set(state.highlightedVertexNames);
  const lines = state.visibleConstraintIndexes.flatMap((constraintIndex) => {
    const constraint = solution.constraints[constraintIndex];
    const segment = lineSegmentFor(constraint.simplified, solution.window);
    if (!segment) {
      return [];
    }

    const screenSegment = segment.map(toScreen);
    const path = createPath(screenSegment);
    if (!path) {
      return [];
    }

    return [
      {
        constraintIndex,
        label: `R${constraintIndex + 1}`,
        color:
          graphicalPlotLineColors[
            constraintIndex % graphicalPlotLineColors.length
          ],
        path,
        labelPoint: {
          x: Math.min(
            Math.max((screenSegment[0].x + screenSegment[1].x) / 2 + 10, 12),
            size.width - 56,
          ),
          y: Math.min(
            Math.max((screenSegment[0].y + screenSegment[1].y) / 2 - 10, 18),
            size.height - 10,
          ),
        },
        isDashed: !constraint.boundaryIncluded,
      },
    ];
  });
  const vertices = solution.vertices.map((vertex) => {
    const isHighlighted = highlightedNames.has(vertex.name);
    return {
      name: vertex.name,
      point: vertex.point,
      screenPoint: toScreen(vertex.point),
      isHighlighted,
      isVisible:
        isHighlighted ||
        state.title.includes("Vértices") ||
        state.title.includes("Solución") ||
        state.title.includes("Valor"),
    };
  });
  const unboundedArrow =
    state.showUnboundedArrows &&
    solution.feasibleSample &&
    solution.unboundedDirection
      ? {
          from: toScreen(solution.feasibleSample),
          to: toScreen({
            x1: solution.feasibleSample.x1 + solution.unboundedDirection.x1 * 5,
            x2: solution.feasibleSample.x2 + solution.unboundedDirection.x2 * 5,
          }),
        }
      : undefined;
  const optimalSegment =
    state.highlightedSegment && solution.optimum?.segment
      ? {
          from: toScreen(solution.optimum.segment.from),
          to: toScreen(solution.optimum.segment.to),
        }
      : undefined;
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
    feasibleRegionPath,
    lines,
    vertices,
    unboundedArrow,
    optimalSegment,
  };
};
