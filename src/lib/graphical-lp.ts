const EPSILON = 1e-9;
const FEASIBILITY_EPSILON = 1e-7;
const MAX_STABLE_ABSOLUTE_VALUE = 1e15;

export type GraphicalObjectiveSense = "max" | "min";
export type GraphicalConstraintOperator = "<=" | ">=" | "=" | "<" | ">";
export type GraphicalLineKind = "general" | "vertical" | "horizontal";
export type GraphicalSolutionStatus =
  | "optimal"
  | "multiple-optimal"
  | "unbounded"
  | "infeasible"
  | "unattained"
  | "no-attained-vertex";

export type GraphicalPoint = Readonly<{
  x1: number;
  x2: number;
}>;

export type GraphicalConstraintInput = Readonly<{
  a: number;
  b: number;
  operator: GraphicalConstraintOperator;
  c: number;
  label?: string;
}>;

export type GraphicalLinearProgramInput = Readonly<{
  sense: GraphicalObjectiveSense;
  objective: readonly [number, number];
  constraints: readonly GraphicalConstraintInput[];
}>;

export type GraphicalConstraintAnalysis = Readonly<{
  index: number;
  original: GraphicalConstraintInput;
  simplified: GraphicalConstraintInput;
  originalLabel: string;
  simplifiedLabel: string;
  boundaryLabel: string;
  kind: GraphicalLineKind;
  boundaryIncluded: boolean;
  intercepts: Readonly<{
    x1Zero?: GraphicalPoint;
    x2Zero?: GraphicalPoint;
  }>;
  testPoint?: GraphicalPoint;
  testValue?: number;
  testSatisfies?: boolean;
  validSideDescription: string;
  wasSimplified: boolean;
  isRedundant: boolean;
}>;

export type GraphicalVertex = Readonly<{
  name: string;
  point: GraphicalPoint;
  activeConstraintIndexes: readonly number[];
  objectiveValue: number;
  isIncluded: boolean;
  liesOnStrictBoundary: boolean;
  isDegenerate: boolean;
}>;

export type GraphicalPlotState = Readonly<{
  title: string;
  description: string;
  visibleConstraintIndexes: readonly number[];
  shadeIntersectionUpTo?: number;
  highlightedVertexNames: readonly string[];
  highlightedSegment?: Readonly<{ from: string; to: string }>;
  showFeasibleRegion: boolean;
  showUnboundedArrows: boolean;
}>;

export type GraphicalWindow = Readonly<{
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}>;

export type GraphicalOptimum = Readonly<{
  value: number;
  boundName: "máximo" | "mínimo" | "supremo" | "ínfimo";
  points: readonly GraphicalVertex[];
  segment?: Readonly<{ from: GraphicalPoint; to: GraphicalPoint }>;
}>;

export type GraphicalLinearProgramSolution = Readonly<{
  status: GraphicalSolutionStatus;
  sense: GraphicalObjectiveSense;
  objective: readonly [number, number];
  constraints: readonly GraphicalConstraintAnalysis[];
  vertices: readonly GraphicalVertex[];
  optimum?: GraphicalOptimum;
  plotStates: readonly GraphicalPlotState[];
  window: GraphicalWindow;
  missingNonnegativity: readonly ("x1" | "x2")[];
  unboundedDirection?: GraphicalPoint;
  feasibleSample?: GraphicalPoint;
  notes: readonly string[];
}>;

type InternalConstraint = GraphicalConstraintInput &
  Readonly<{ index: number }>;

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const constraintOperators = new Set<GraphicalConstraintOperator>([
  "<=",
  ">=",
  "=",
  "<",
  ">",
]);

const assertFiniteNumber = (value: number, label: string): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  if (Math.abs(value) > MAX_STABLE_ABSOLUTE_VALUE) {
    throw new Error(`${label} is too large for stable calculation`);
  }
};

const validateGraphicalInput = (input: GraphicalLinearProgramInput): void => {
  if (input.sense !== "max" && input.sense !== "min") {
    throw new Error("sense must be max or min");
  }

  assertFiniteNumber(input.objective[0], "objective coefficient x1");
  assertFiniteNumber(input.objective[1], "objective coefficient x2");

  input.constraints.forEach((constraint, index) => {
    const label = `constraint R${index + 1}`;
    if (!constraintOperators.has(constraint.operator)) {
      throw new Error(`${label} operator must be one of <=, >=, =, <, >`);
    }
    assertFiniteNumber(constraint.a, `${label} coefficient x1`);
    assertFiniteNumber(constraint.b, `${label} coefficient x2`);
    assertFiniteNumber(constraint.c, `${label} right-hand side`);
  });
};

const roundNearZero = (value: number): number =>
  Math.abs(value) <= EPSILON ? 0 : value;

const determinant = (a: number, b: number, c: number, d: number): number =>
  a * d - b * c;

const greatestCommonDivisor = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }
  return x || 1;
};

const approximateFraction = (
  value: number,
  maximumDenominator = 1000,
): Readonly<{ numerator: number; denominator: number }> => {
  let bestNumerator = Math.round(value);
  let bestDenominator = 1;
  let bestError = Math.abs(value - bestNumerator);

  for (
    let denominator = 1;
    denominator <= maximumDenominator;
    denominator += 1
  ) {
    const numerator = Math.round(value * denominator);
    const error = Math.abs(value - numerator / denominator);
    if (error < bestError) {
      bestNumerator = numerator;
      bestDenominator = denominator;
      bestError = error;
    }
  }

  const divisor = greatestCommonDivisor(bestNumerator, bestDenominator);
  return {
    numerator: bestNumerator / divisor,
    denominator: bestDenominator / divisor,
  };
};

export const formatGraphicalNumber = (value: number): string => {
  const normalized = roundNearZero(value);
  if (!Number.isFinite(normalized)) {
    return normalized > 0 ? "∞" : "-∞";
  }
  if (Number.isInteger(normalized)) {
    return String(normalized);
  }
  const fraction = approximateFraction(normalized);
  if (
    Math.abs(fraction.numerator / fraction.denominator - normalized) <= 1e-9
  ) {
    return `${fraction.numerator}/${fraction.denominator}`;
  }
  return normalized.toLocaleString("es-MX", {
    maximumFractionDigits: 4,
  });
};

export const formatGraphicalPoint = (point: GraphicalPoint): string =>
  `(${formatGraphicalNumber(point.x1)}, ${formatGraphicalNumber(point.x2)})`;

const formatCoefficient = (
  coefficient: number,
  variableName: "x1" | "x2",
  isFirst: boolean,
): string => {
  const sign = coefficient < 0 ? "-" : "+";
  const magnitude = Math.abs(coefficient);
  const coefficientText =
    Math.abs(magnitude - 1) <= EPSILON ? "" : formatGraphicalNumber(magnitude);
  const term = `${coefficientText}${variableName}`;

  if (isFirst) {
    return sign === "-" ? `-${term}` : term;
  }
  return `${sign} ${term}`;
};

export const formatGraphicalLinearExpression = (
  a: number,
  b: number,
): string => {
  const terms: string[] = [];
  if (Math.abs(a) > EPSILON) {
    terms.push(formatCoefficient(a, "x1", true));
  }
  if (Math.abs(b) > EPSILON) {
    terms.push(formatCoefficient(b, "x2", terms.length === 0));
  }
  return terms.length > 0 ? terms.join(" ") : "0";
};

const flipOperator = (
  operator: GraphicalConstraintOperator,
): GraphicalConstraintOperator => {
  switch (operator) {
    case "<=":
      return ">=";
    case ">=":
      return "<=";
    case "<":
      return ">";
    case ">":
      return "<";
    case "=":
      return "=";
  }
};

export const formatGraphicalConstraint = (
  constraint: GraphicalConstraintInput,
): string =>
  constraint.label ??
  `${formatGraphicalLinearExpression(constraint.a, constraint.b)} ${constraint.operator} ${formatGraphicalNumber(constraint.c)}`;

const simplifyConstraint = (
  constraint: GraphicalConstraintInput,
): GraphicalConstraintInput => {
  if (Math.abs(constraint.a) <= EPSILON && Math.abs(constraint.b) <= EPSILON) {
    return constraint;
  }

  if (Math.abs(constraint.b) <= EPSILON) {
    const value = constraint.c / constraint.a;
    const operator =
      constraint.a < 0
        ? flipOperator(constraint.operator)
        : constraint.operator;
    return {
      a: 1,
      b: 0,
      operator,
      c: value,
      label: `x1 ${operator} ${formatGraphicalNumber(value)}`,
    };
  }

  if (Math.abs(constraint.a) <= EPSILON) {
    const value = constraint.c / constraint.b;
    const operator =
      constraint.b < 0
        ? flipOperator(constraint.operator)
        : constraint.operator;
    return {
      a: 0,
      b: 1,
      operator,
      c: value,
      label: `x2 ${operator} ${formatGraphicalNumber(value)}`,
    };
  }

  return constraint;
};

const lineKind = (constraint: GraphicalConstraintInput): GraphicalLineKind => {
  if (Math.abs(constraint.b) <= EPSILON && Math.abs(constraint.a) > EPSILON) {
    return "vertical";
  }
  if (Math.abs(constraint.a) <= EPSILON && Math.abs(constraint.b) > EPSILON) {
    return "horizontal";
  }
  return "general";
};

const boundaryLabel = (constraint: GraphicalConstraintInput): string =>
  `${formatGraphicalLinearExpression(constraint.a, constraint.b)} = ${formatGraphicalNumber(constraint.c)}`;

const boundaryIncluded = (operator: GraphicalConstraintOperator): boolean =>
  operator === "<=" || operator === ">=" || operator === "=";

const valueAt = (
  constraint: GraphicalConstraintInput,
  point: GraphicalPoint,
): number => constraint.a * point.x1 + constraint.b * point.x2;

const containsClosed = (
  constraint: GraphicalConstraintInput,
  point: GraphicalPoint,
): boolean => {
  const value = valueAt(constraint, point);
  switch (constraint.operator) {
    case "<=":
    case "<":
      return value <= constraint.c + FEASIBILITY_EPSILON;
    case ">=":
    case ">":
      return value >= constraint.c - FEASIBILITY_EPSILON;
    case "=":
      return Math.abs(value - constraint.c) <= FEASIBILITY_EPSILON;
  }
};

const containsOriginal = (
  constraint: GraphicalConstraintInput,
  point: GraphicalPoint,
): boolean => {
  const value = valueAt(constraint, point);
  switch (constraint.operator) {
    case "<=":
      return value <= constraint.c + FEASIBILITY_EPSILON;
    case "<":
      return value < constraint.c - FEASIBILITY_EPSILON;
    case ">=":
      return value >= constraint.c - FEASIBILITY_EPSILON;
    case ">":
      return value > constraint.c + FEASIBILITY_EPSILON;
    case "=":
      return Math.abs(value - constraint.c) <= FEASIBILITY_EPSILON;
  }
};

const pointSatisfiesClosed = (
  point: GraphicalPoint,
  constraints: readonly GraphicalConstraintInput[],
): boolean =>
  constraints.every((constraint) => containsClosed(constraint, point));

const pointSatisfiesOriginal = (
  point: GraphicalPoint,
  constraints: readonly GraphicalConstraintInput[],
): boolean =>
  constraints.every((constraint) => containsOriginal(constraint, point));

const intersection = (
  first: GraphicalConstraintInput,
  second: GraphicalConstraintInput,
): GraphicalPoint | undefined => {
  const det = determinant(first.a, first.b, second.a, second.b);
  if (Math.abs(det) <= EPSILON) {
    return undefined;
  }

  return {
    x1: roundNearZero(determinant(first.c, first.b, second.c, second.b) / det),
    x2: roundNearZero(determinant(first.a, first.c, second.a, second.c) / det),
  };
};

const pointDistance = (first: GraphicalPoint, second: GraphicalPoint): number =>
  Math.hypot(first.x1 - second.x1, first.x2 - second.x2);

const dedupePoints = (points: readonly GraphicalPoint[]): GraphicalPoint[] => {
  const unique: GraphicalPoint[] = [];
  for (const point of points) {
    if (
      !unique.some(
        (candidate) => pointDistance(candidate, point) <= FEASIBILITY_EPSILON,
      )
    ) {
      unique.push(point);
    }
  }
  return unique;
};

const interceptsFor = (
  constraint: GraphicalConstraintInput,
): GraphicalConstraintAnalysis["intercepts"] => ({
  x1Zero:
    Math.abs(constraint.b) <= EPSILON
      ? undefined
      : { x1: 0, x2: roundNearZero(constraint.c / constraint.b) },
  x2Zero:
    Math.abs(constraint.a) <= EPSILON
      ? undefined
      : { x1: roundNearZero(constraint.c / constraint.a), x2: 0 },
});

const chooseTestPoint = (
  constraint: GraphicalConstraintInput,
): GraphicalPoint => {
  const candidates: readonly GraphicalPoint[] = [
    { x1: 0, x2: 0 },
    { x1: 1, x2: 0 },
    { x1: 0, x2: 1 },
    { x1: 1, x2: 1 },
    { x1: -1, x2: 0 },
    { x1: 0, x2: -1 },
  ];
  return (
    candidates.find(
      (point) =>
        Math.abs(valueAt(constraint, point) - constraint.c) >
        FEASIBILITY_EPSILON,
    ) ?? { x1: 2, x2: 3 }
  );
};

const validSideDescription = (constraint: GraphicalConstraintInput): string => {
  if (constraint.operator === "=") {
    return "Como es igualdad, no se sombrea ningún lado: solamente cuentan los puntos exactamente sobre la línea.";
  }

  const kind = lineKind(constraint);
  if (kind === "vertical") {
    const value = constraint.c / constraint.a;
    const operator =
      constraint.a < 0
        ? flipOperator(constraint.operator)
        : constraint.operator;
    const side =
      operator === "<=" || operator === "<" ? "a la izquierda" : "a la derecha";
    return `Como la restricción es x1 ${operator} ${formatGraphicalNumber(value)}, la zona válida queda ${side} de la línea.`;
  }

  if (kind === "horizontal") {
    const value = constraint.c / constraint.b;
    const operator =
      constraint.b < 0
        ? flipOperator(constraint.operator)
        : constraint.operator;
    const side = operator === "<=" || operator === "<" ? "debajo" : "arriba";
    return `Como la restricción es x2 ${operator} ${formatGraphicalNumber(value)}, la zona válida queda ${side} de la línea.`;
  }

  const testPoint = chooseTestPoint(constraint);
  const satisfies = containsOriginal(constraint, testPoint);
  const side = satisfies
    ? "el lado donde está ese punto"
    : "el lado contrario a ese punto";
  const truth = satisfies ? "sí cumple" : "no cumple";
  return `Para saber qué lado se toma, probamos el punto ${formatGraphicalPoint(testPoint)}. Al sustituir, ${formatGraphicalLinearExpression(constraint.a, constraint.b)} = ${formatGraphicalNumber(valueAt(constraint, testPoint))}; ese punto ${truth} la desigualdad, así que se toma ${side}.`;
};

const objectiveValueAt = (
  objective: readonly [number, number],
  point: GraphicalPoint,
): number => objective[0] * point.x1 + objective[1] * point.x2;

const activeConstraintIndexes = (
  point: GraphicalPoint,
  constraints: readonly InternalConstraint[],
): number[] =>
  constraints
    .filter(
      (constraint) =>
        Math.abs(valueAt(constraint, point) - constraint.c) <=
        FEASIBILITY_EPSILON,
    )
    .map((constraint) => constraint.index);

const liesOnStrictBoundary = (
  point: GraphicalPoint,
  constraints: readonly GraphicalConstraintInput[],
): boolean =>
  constraints.some(
    (constraint) =>
      (constraint.operator === "<" || constraint.operator === ">") &&
      Math.abs(valueAt(constraint, point) - constraint.c) <=
        FEASIBILITY_EPSILON,
  );

const findVertices = (
  constraints: readonly InternalConstraint[],
  objective: readonly [number, number],
): GraphicalVertex[] => {
  const rawPoints: GraphicalPoint[] = [];
  for (let i = 0; i < constraints.length; i += 1) {
    for (let j = i + 1; j < constraints.length; j += 1) {
      const point = intersection(constraints[i], constraints[j]);
      if (point && pointSatisfiesClosed(point, constraints)) {
        rawPoints.push(point);
      }
    }
  }

  const points = dedupePoints(rawPoints);
  if (points.length > 0) {
    const center = {
      x1: points.reduce((sum, point) => sum + point.x1, 0) / points.length,
      x2: points.reduce((sum, point) => sum + point.x2, 0) / points.length,
    };
    points.sort(
      (first, second) =>
        Math.atan2(first.x2 - center.x2, first.x1 - center.x1) -
        Math.atan2(second.x2 - center.x2, second.x1 - center.x1),
    );
  }

  return points.map((point, index) => {
    const active = activeConstraintIndexes(point, constraints);
    return {
      name: alphabet[index] ?? `P${index + 1}`,
      point,
      activeConstraintIndexes: active,
      objectiveValue: roundNearZero(objectiveValueAt(objective, point)),
      isIncluded: pointSatisfiesOriginal(point, constraints),
      liesOnStrictBoundary: liesOnStrictBoundary(point, constraints),
      isDegenerate: active.length > 2,
    };
  });
};

const addBoundaryDrawingPoints = (
  candidates: GraphicalPoint[],
  constraint: GraphicalConstraintInput,
) => {
  const intercepts = interceptsFor(constraint);
  if (intercepts.x1Zero) {
    candidates.push(intercepts.x1Zero);
  }
  if (intercepts.x2Zero) {
    candidates.push(intercepts.x2Zero);
  }
  if (lineKind(constraint) === "vertical") {
    const x = constraint.c / constraint.a;
    candidates.push({ x1: x, x2: -1 }, { x1: x, x2: 1 });
  }
  if (lineKind(constraint) === "horizontal") {
    const y = constraint.c / constraint.b;
    candidates.push({ x1: -1, x2: y }, { x1: 1, x2: y });
  }
};

const findFeasibleSample = (
  constraints: readonly InternalConstraint[],
): GraphicalPoint | undefined => {
  const candidates: GraphicalPoint[] = [
    { x1: 0, x2: 0 },
    { x1: 1, x2: 1 },
    { x1: -1, x2: 1 },
    { x1: 1, x2: -1 },
    { x1: -1, x2: -1 },
  ];

  for (let i = 0; i < constraints.length; i += 1) {
    addBoundaryDrawingPoints(candidates, constraints[i]);
    for (let j = i + 1; j < constraints.length; j += 1) {
      const point = intersection(constraints[i], constraints[j]);
      if (point) {
        candidates.push(point);
        for (const dx of [-1e-4, 0, 1e-4]) {
          for (const dy of [-1e-4, 0, 1e-4]) {
            candidates.push({ x1: point.x1 + dx, x2: point.x2 + dy });
          }
        }
      }
    }
  }

  for (let x = -10; x <= 10; x += 1) {
    for (let y = -10; y <= 10; y += 1) {
      candidates.push({ x1: x, x2: y });
    }
  }

  return dedupePoints(candidates).find((point) =>
    pointSatisfiesOriginal(point, constraints),
  );
};

const normalizeAngle = (angle: number): number => {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
};

const dedupeAngles = (angles: readonly number[]): number[] => {
  const rounded = angles.map(
    (angle) => Math.round(normalizeAngle(angle) * 1e12) / 1e12,
  );
  return [...new Set(rounded)].sort((first, second) => first - second);
};

const recessionDirections = (
  constraints: readonly GraphicalConstraintInput[],
): GraphicalPoint[] => {
  const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  for (const constraint of constraints) {
    if (Math.abs(constraint.a) > EPSILON || Math.abs(constraint.b) > EPSILON) {
      const theta = Math.atan2(constraint.b, constraint.a);
      angles.push(
        theta,
        theta + Math.PI,
        theta + Math.PI / 2,
        theta - Math.PI / 2,
      );
    }
  }

  const normalized = dedupeAngles(angles);
  const middleAngles = normalized.map((angle, index) => {
    const nextAngle = normalized[(index + 1) % normalized.length];
    const adjustedNext =
      index === normalized.length - 1 ? nextAngle + 2 * Math.PI : nextAngle;
    return normalizeAngle((angle + adjustedNext) / 2);
  });

  return dedupePoints(
    [...normalized, ...middleAngles].map((angle) => ({
      x1: roundNearZero(Math.cos(angle)),
      x2: roundNearZero(Math.sin(angle)),
    })),
  );
};

const directionRespectsRecession = (
  direction: GraphicalPoint,
  constraints: readonly GraphicalConstraintInput[],
): boolean =>
  constraints.every((constraint) => {
    const delta = constraint.a * direction.x1 + constraint.b * direction.x2;
    if (constraint.operator === "<=" || constraint.operator === "<") {
      return delta <= FEASIBILITY_EPSILON;
    }
    if (constraint.operator === ">=" || constraint.operator === ">") {
      return delta >= -FEASIBILITY_EPSILON;
    }
    return Math.abs(delta) <= FEASIBILITY_EPSILON;
  });

const objectiveImprovesAlong = (
  sense: GraphicalObjectiveSense,
  objective: readonly [number, number],
  direction: GraphicalPoint,
): boolean => {
  const delta = objectiveValueAt(objective, direction);
  return sense === "max"
    ? delta > FEASIBILITY_EPSILON
    : delta < -FEASIBILITY_EPSILON;
};

const improvingRecessionDirection = (
  sense: GraphicalObjectiveSense,
  objective: readonly [number, number],
  constraints: readonly GraphicalConstraintInput[],
): GraphicalPoint | undefined =>
  recessionDirections(constraints).find(
    (direction) =>
      directionRespectsRecession(direction, constraints) &&
      objectiveImprovesAlong(sense, objective, direction),
  );

const optimalSegment = (
  vertices: readonly GraphicalVertex[],
  optimalVertices: readonly GraphicalVertex[],
): Readonly<{ from: GraphicalPoint; to: GraphicalPoint }> | undefined => {
  if (optimalVertices.length < 2 || vertices.length < 2) {
    return undefined;
  }

  for (let i = 0; i < vertices.length; i += 1) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    if (
      optimalVertices.some((vertex) => vertex.name === current.name) &&
      optimalVertices.some((vertex) => vertex.name === next.name)
    ) {
      return { from: current.point, to: next.point };
    }
  }

  return { from: optimalVertices[0].point, to: optimalVertices[1].point };
};

const createPlotStates = (
  constraintCount: number,
  status: GraphicalSolutionStatus,
  vertices: readonly GraphicalVertex[],
  optimum?: GraphicalOptimum,
): GraphicalPlotState[] => {
  const states: GraphicalPlotState[] = [
    {
      title: "Plano vacío",
      description:
        "Primero se prepara el plano cartesiano con los ejes x1 y x2. Todavía no se dibuja ninguna restricción.",
      visibleConstraintIndexes: [],
      highlightedVertexNames: [],
      showFeasibleRegion: false,
      showUnboundedArrows: false,
    },
  ];

  for (let index = 0; index < constraintCount; index += 1) {
    states.push({
      title: `Se agrega la restricción ${index + 1}`,
      description: `Se dibuja la frontera de la restricción ${index + 1}, se marca su lado válido y se actualiza la zona común con las restricciones anteriores.`,
      visibleConstraintIndexes: Array.from(
        { length: index + 1 },
        (_, item) => item,
      ),
      shadeIntersectionUpTo: index,
      highlightedVertexNames: [],
      showFeasibleRegion: true,
      showUnboundedArrows: false,
    });
  }

  states.push({
    title:
      status === "infeasible" ? "Sin región factible" : "Región factible final",
    description:
      status === "infeasible"
        ? "Al juntar todas las zonas válidas, no queda ninguna región común."
        : "Ahora se observa solamente el traslape que cumple todas las restricciones al mismo tiempo.",
    visibleConstraintIndexes: Array.from(
      { length: constraintCount },
      (_, item) => item,
    ),
    shadeIntersectionUpTo: constraintCount - 1,
    highlightedVertexNames: [],
    showFeasibleRegion: true,
    showUnboundedArrows: status === "unbounded",
  });

  if (status !== "infeasible") {
    states.push({
      title: "Vértices candidatos",
      description:
        "Se marcan con letras A, B, C, ... los puntos esquina que salen de intersecar fronteras y que cumplen la región cerrada.",
      visibleConstraintIndexes: Array.from(
        { length: constraintCount },
        (_, item) => item,
      ),
      shadeIntersectionUpTo: constraintCount - 1,
      highlightedVertexNames: vertices.map((vertex) => vertex.name),
      showFeasibleRegion: true,
      showUnboundedArrows: status === "unbounded",
    });
  }

  if (optimum) {
    const highlightedSegment = optimum.segment
      ? {
          from:
            vertices.find(
              (vertex) =>
                pointDistance(
                  vertex.point,
                  optimum.segment?.from ?? vertex.point,
                ) <= FEASIBILITY_EPSILON,
            )?.name ?? "A",
          to:
            vertices.find(
              (vertex) =>
                pointDistance(
                  vertex.point,
                  optimum.segment?.to ?? vertex.point,
                ) <= FEASIBILITY_EPSILON,
            )?.name ?? "B",
        }
      : undefined;
    states.push({
      title: status === "unattained" ? "Valor límite" : "Solución óptima",
      description:
        status === "unattained"
          ? "Se resalta el punto de la cerradura que da el supremo o ínfimo, pero la frontera estricta impide alcanzarlo."
          : "Se resalta el punto óptimo o el segmento óptimo cuando hay soluciones múltiples.",
      visibleConstraintIndexes: Array.from(
        { length: constraintCount },
        (_, item) => item,
      ),
      shadeIntersectionUpTo: constraintCount - 1,
      highlightedVertexNames: optimum.points.map((vertex) => vertex.name),
      highlightedSegment,
      showFeasibleRegion: true,
      showUnboundedArrows: false,
    });
  }

  return states;
};

const hasExplicitNonnegativity = (
  variable: "x1" | "x2",
  constraints: readonly GraphicalConstraintInput[],
): boolean =>
  constraints.some((constraint) => {
    if (
      constraint.operator !== ">=" ||
      Math.abs(constraint.c) > FEASIBILITY_EPSILON
    ) {
      return false;
    }
    if (variable === "x1") {
      return (
        Math.abs(constraint.a - 1) <= FEASIBILITY_EPSILON &&
        Math.abs(constraint.b) <= FEASIBILITY_EPSILON
      );
    }
    return (
      Math.abs(constraint.a) <= FEASIBILITY_EPSILON &&
      Math.abs(constraint.b - 1) <= FEASIBILITY_EPSILON
    );
  });

const graphWindow = (
  constraints: readonly GraphicalConstraintInput[],
  vertices: readonly GraphicalVertex[],
  feasibleSample?: GraphicalPoint,
  unboundedDirection?: GraphicalPoint,
): GraphicalWindow => {
  const points: GraphicalPoint[] = [
    { x1: 0, x2: 0 },
    ...vertices.map((vertex) => vertex.point),
  ];
  if (feasibleSample) {
    points.push(feasibleSample);
  }
  if (unboundedDirection && feasibleSample) {
    points.push({
      x1: feasibleSample.x1 + unboundedDirection.x1 * 8,
      x2: feasibleSample.x2 + unboundedDirection.x2 * 8,
    });
  }
  for (const constraint of constraints) {
    addBoundaryDrawingPoints(points, constraint);
  }

  const xs = points.map((point) => point.x1).filter(Number.isFinite);
  const ys = points.map((point) => point.x2).filter(Number.isFinite);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 4);
  const height = Math.max(maxY - minY, 4);
  const margin = Math.max(width, height) * 0.18;

  return {
    minX: minX - margin,
    maxX: maxX + margin,
    minY: minY - margin,
    maxY: maxY + margin,
  };
};

const buildConstraintAnalyses = (
  originalConstraints: readonly GraphicalConstraintInput[],
  constraints: readonly GraphicalConstraintInput[],
  vertices: readonly GraphicalVertex[],
): GraphicalConstraintAnalysis[] => {
  const activeIndexes = new Set(
    vertices.flatMap((vertex) => vertex.activeConstraintIndexes),
  );

  return constraints.map((constraint, index) => {
    const testPoint =
      constraint.operator === "=" ? undefined : chooseTestPoint(constraint);
    const simplifiedLabel = formatGraphicalConstraint(constraint);
    const originalLabel = formatGraphicalConstraint(originalConstraints[index]);
    return {
      index,
      original: originalConstraints[index],
      simplified: constraint,
      originalLabel,
      simplifiedLabel,
      boundaryLabel: boundaryLabel(constraint),
      kind: lineKind(constraint),
      boundaryIncluded: boundaryIncluded(constraint.operator),
      intercepts: interceptsFor(constraint),
      testPoint,
      testValue: testPoint ? valueAt(constraint, testPoint) : undefined,
      testSatisfies: testPoint
        ? containsOriginal(constraint, testPoint)
        : undefined,
      validSideDescription: validSideDescription(constraint),
      wasSimplified: originalLabel !== simplifiedLabel,
      isRedundant:
        vertices.length > 0 &&
        constraint.operator !== "=" &&
        !activeIndexes.has(index),
    };
  });
};

const optimumFromVertices = (
  sense: GraphicalObjectiveSense,
  vertices: readonly GraphicalVertex[],
): Readonly<{
  status: GraphicalSolutionStatus;
  optimum?: GraphicalOptimum;
}> => {
  if (vertices.length === 0) {
    return { status: "no-attained-vertex" };
  }

  const values = vertices.map((vertex) => vertex.objectiveValue);
  const optimalValue =
    sense === "max" ? Math.max(...values) : Math.min(...values);
  const closureOptimalVertices = vertices.filter(
    (vertex) =>
      Math.abs(vertex.objectiveValue - optimalValue) <= FEASIBILITY_EPSILON,
  );
  const attainedOptimalVertices = closureOptimalVertices.filter(
    (vertex) => vertex.isIncluded,
  );

  if (attainedOptimalVertices.length === 0) {
    return {
      status: "unattained",
      optimum: {
        value: optimalValue,
        boundName: sense === "max" ? "supremo" : "ínfimo",
        points: closureOptimalVertices,
        segment: optimalSegment(vertices, closureOptimalVertices),
      },
    };
  }

  const status =
    attainedOptimalVertices.length > 1 ? "multiple-optimal" : "optimal";
  return {
    status,
    optimum: {
      value: optimalValue,
      boundName: sense === "max" ? "máximo" : "mínimo",
      points: attainedOptimalVertices,
      segment: optimalSegment(vertices, attainedOptimalVertices),
    },
  };
};

export const solveGraphicalLinearProgram = (
  input: GraphicalLinearProgramInput,
): GraphicalLinearProgramSolution => {
  if (input.objective.length !== 2) {
    throw new Error("objective must have exactly two coefficients");
  }
  if (input.constraints.length === 0) {
    throw new Error("constraints must not be empty");
  }
  validateGraphicalInput(input);

  const simplifiedConstraints: InternalConstraint[] = input.constraints.map(
    (constraint, index) => ({ ...simplifyConstraint(constraint), index }),
  );
  const feasibleSample = findFeasibleSample(simplifiedConstraints);
  const vertices = findVertices(simplifiedConstraints, input.objective);
  const unboundedDirection = feasibleSample
    ? improvingRecessionDirection(
        input.sense,
        input.objective,
        simplifiedConstraints,
      )
    : undefined;
  const missingNonnegativity: ("x1" | "x2")[] = [];
  if (!hasExplicitNonnegativity("x1", simplifiedConstraints)) {
    missingNonnegativity.push("x1");
  }
  if (!hasExplicitNonnegativity("x2", simplifiedConstraints)) {
    missingNonnegativity.push("x2");
  }

  const notes: string[] = [];
  for (const vertex of vertices) {
    if (vertex.isDegenerate) {
      notes.push(
        `El punto ${vertex.name} es degenerado porque ahí coinciden más de dos restricciones.`,
      );
    }
  }

  let status: GraphicalSolutionStatus;
  let optimum: GraphicalOptimum | undefined;
  if (!feasibleSample) {
    status = "infeasible";
  } else if (unboundedDirection) {
    status = "unbounded";
  } else {
    const optimalResult = optimumFromVertices(input.sense, vertices);
    status = optimalResult.status;
    optimum = optimalResult.optimum;
  }

  const constraints = buildConstraintAnalyses(
    input.constraints,
    simplifiedConstraints,
    vertices,
  );
  for (const constraint of constraints) {
    if (constraint.isRedundant) {
      notes.push(
        `La restricción ${constraint.index + 1} se dibuja, pero no crea un borde nuevo de la región factible final; para este problema es redundante.`,
      );
    }
  }

  return {
    status,
    sense: input.sense,
    objective: input.objective,
    constraints,
    vertices,
    optimum,
    plotStates: createPlotStates(
      input.constraints.length,
      status,
      vertices,
      optimum,
    ),
    window: graphWindow(
      simplifiedConstraints,
      vertices,
      feasibleSample,
      unboundedDirection,
    ),
    missingNonnegativity,
    unboundedDirection,
    feasibleSample,
    notes,
  };
};
