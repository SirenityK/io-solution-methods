const EPSILON = 1e-9;
const FEASIBILITY_EPSILON = 1e-7;
const MAX_STABLE_ABSOLUTE_VALUE = 1e15;

export type NonlinearObjectiveSense = "max" | "min";
export type NonlinearConstraintOperator = "<=" | ">=" | "=" | "<" | ">";
export type NonlinearConstraintKind =
  | "linear"
  | "vertical"
  | "horizontal"
  | "circle"
  | "ellipse"
  | "quadratic";
export type NonlinearSolutionStatus =
  | "optimal"
  | "multiple-optimal"
  | "unattained"
  | "infeasible"
  | "no-attained-candidate";

export type NonlinearPoint = Readonly<{ x1: number; x2: number }>;

export type NonlinearConstraintInput = Readonly<{
  q1: number;
  q2: number;
  a: number;
  b: number;
  operator: NonlinearConstraintOperator;
  c: number;
  label?: string;
}>;

export type NonlinearProgramInput = Readonly<{
  sense: NonlinearObjectiveSense;
  objective: readonly [number, number];
  constraints: readonly NonlinearConstraintInput[];
}>;

export type NonlinearCandidateSource =
  | "origin"
  | "axis"
  | "intersection"
  | "objective-tangent";

export type NonlinearCandidateDerivation = Readonly<{
  title: string;
  steps: readonly string[];
}>;

export type NonlinearCandidatePoint = Readonly<{
  name: string;
  point: NonlinearPoint;
  activeConstraintIndexes: readonly number[];
  objectiveValue: number;
  exactObjectiveLatex?: string;
  exactPointLatex?: string;
  isIncluded: boolean;
  liesOnStrictBoundary: boolean;
  source: NonlinearCandidateSource;
  derivation?: NonlinearCandidateDerivation;
}>;

export type NonlinearAxisIntersection = Readonly<{
  point: NonlinearPoint;
  exactPointLatex?: string;
  derivation: NonlinearCandidateDerivation;
}>;

export type NonlinearConstraintAnalysis = Readonly<{
  index: number;
  original: NonlinearConstraintInput;
  label: string;
  boundaryLabel: string;
  kind: NonlinearConstraintKind;
  boundaryIncluded: boolean;
  axisIntersections: readonly NonlinearAxisIntersection[];
  description: string;
}>;

export type NonlinearPlotState = Readonly<{
  title: string;
  description: string;
  visibleConstraintIndexes: readonly number[];
  showFeasibleRegion: boolean;
  highlightedCandidateNames: readonly string[];
}>;

export type NonlinearWindow = Readonly<{
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}>;

export type NonlinearOptimum = Readonly<{
  value: number;
  exactValueLatex?: string;
  boundName: "máximo" | "mínimo" | "supremo" | "ínfimo";
  points: readonly NonlinearCandidatePoint[];
}>;

export type NonlinearProgramSolution = Readonly<{
  status: NonlinearSolutionStatus;
  sense: NonlinearObjectiveSense;
  objective: readonly [number, number];
  constraints: readonly NonlinearConstraintAnalysis[];
  candidates: readonly NonlinearCandidatePoint[];
  optimum?: NonlinearOptimum;
  plotStates: readonly NonlinearPlotState[];
  window: NonlinearWindow;
  feasibleSample?: NonlinearPoint;
  steps: readonly string[];
  notes: readonly string[];
}>;

type RawCandidate = Readonly<{
  point: NonlinearPoint;
  source: NonlinearCandidateSource;
  exactPointLatex?: string;
  derivation?: NonlinearCandidateDerivation;
}>;

type ExactLinearRadical = Readonly<{
  constant: number;
  radicalNumerator: number;
  radicalDenominator: number;
  radicand?: number;
}>;

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const operators = new Set<NonlinearConstraintOperator>([
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

const validateInput = (input: NonlinearProgramInput): void => {
  if (input.sense !== "max" && input.sense !== "min") {
    throw new Error("sense must be max or min");
  }
  if (input.objective.length !== 2) {
    throw new Error("objective must have exactly two coefficients");
  }
  if (input.constraints.length === 0) {
    throw new Error("constraints must not be empty");
  }
  assertFiniteNumber(input.objective[0], "objective coefficient x1");
  assertFiniteNumber(input.objective[1], "objective coefficient x2");
  input.constraints.forEach((constraint, index) => {
    const label = `constraint R${index + 1}`;
    if (!operators.has(constraint.operator)) {
      throw new Error(`${label} operator must be one of <=, >=, =, <, >`);
    }
    assertFiniteNumber(constraint.q1, `${label} coefficient x1 squared`);
    assertFiniteNumber(constraint.q2, `${label} coefficient x2 squared`);
    assertFiniteNumber(constraint.a, `${label} coefficient x1`);
    assertFiniteNumber(constraint.b, `${label} coefficient x2`);
    assertFiniteNumber(constraint.c, `${label} right-hand side`);
  });
};

const roundNearZero = (value: number): number =>
  Math.abs(value) <= EPSILON ? 0 : value;

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

export const formatNonlinearNumber = (value: number): string => {
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
  return normalized.toLocaleString("es-MX", { maximumFractionDigits: 4 });
};

export const formatNonlinearPoint = (point: NonlinearPoint): string =>
  `(${formatNonlinearNumber(point.x1)}, ${formatNonlinearNumber(point.x2)})`;

const formatTerm = (
  coefficient: number,
  variable: string,
  isFirst: boolean,
): string => {
  const sign = coefficient < 0 ? "-" : "+";
  const magnitude = Math.abs(coefficient);
  const coefficientText =
    Math.abs(magnitude - 1) <= EPSILON ? "" : formatNonlinearNumber(magnitude);
  const term = `${coefficientText}${variable}`;
  if (isFirst) {
    return sign === "-" ? `-${term}` : term;
  }
  return `${sign} ${term}`;
};

export const formatNonlinearExpression = (
  constraint: Pick<NonlinearConstraintInput, "q1" | "q2" | "a" | "b">,
): string => {
  const terms: string[] = [];
  if (Math.abs(constraint.q1) > EPSILON) {
    terms.push(formatTerm(constraint.q1, "x1^2", true));
  }
  if (Math.abs(constraint.q2) > EPSILON) {
    terms.push(formatTerm(constraint.q2, "x2^2", terms.length === 0));
  }
  if (Math.abs(constraint.a) > EPSILON) {
    terms.push(formatTerm(constraint.a, "x1", terms.length === 0));
  }
  if (Math.abs(constraint.b) > EPSILON) {
    terms.push(formatTerm(constraint.b, "x2", terms.length === 0));
  }
  return terms.length > 0 ? terms.join(" ") : "0";
};

export const formatNonlinearConstraint = (
  constraint: NonlinearConstraintInput,
): string =>
  `${formatNonlinearExpression(constraint)} ${constraint.operator} ${formatNonlinearNumber(constraint.c)}`;

export const evaluateNonlinearConstraint = (
  constraint: NonlinearConstraintInput,
  point: NonlinearPoint,
): number =>
  constraint.q1 * point.x1 ** 2 +
  constraint.q2 * point.x2 ** 2 +
  constraint.a * point.x1 +
  constraint.b * point.x2;

export const nonlinearConstraintContainsClosed = (
  constraint: NonlinearConstraintInput,
  point: NonlinearPoint,
): boolean => {
  const residual =
    evaluateNonlinearConstraint(constraint, point) - constraint.c;
  if (constraint.operator === "<=" || constraint.operator === "<") {
    return residual <= FEASIBILITY_EPSILON;
  }
  if (constraint.operator === ">=" || constraint.operator === ">") {
    return residual >= -FEASIBILITY_EPSILON;
  }
  return Math.abs(residual) <= FEASIBILITY_EPSILON;
};

const containsOriginal = (
  constraint: NonlinearConstraintInput,
  point: NonlinearPoint,
): boolean => {
  const residual =
    evaluateNonlinearConstraint(constraint, point) - constraint.c;
  if (constraint.operator === "<=") {
    return residual <= FEASIBILITY_EPSILON;
  }
  if (constraint.operator === ">=") {
    return residual >= -FEASIBILITY_EPSILON;
  }
  if (constraint.operator === "=") {
    return Math.abs(residual) <= FEASIBILITY_EPSILON;
  }
  if (constraint.operator === "<") {
    return residual < -FEASIBILITY_EPSILON;
  }
  return residual > FEASIBILITY_EPSILON;
};

const isLinear = (constraint: NonlinearConstraintInput): boolean =>
  Math.abs(constraint.q1) <= EPSILON && Math.abs(constraint.q2) <= EPSILON;

const solveQuadratic = (a: number, b: number, c: number): number[] => {
  if (Math.abs(a) <= EPSILON) {
    return Math.abs(b) <= EPSILON ? [] : [-c / b];
  }
  const discriminant = b ** 2 - 4 * a * c;
  if (discriminant < -FEASIBILITY_EPSILON) {
    return [];
  }
  if (Math.abs(discriminant) <= FEASIBILITY_EPSILON) {
    return [-b / (2 * a)];
  }
  const root = Math.sqrt(Math.max(0, discriminant));
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
};

const asSafeInteger = (value: number): number | undefined => {
  const rounded = Math.round(value);
  return Math.abs(value - rounded) <= FEASIBILITY_EPSILON ? rounded : undefined;
};

const signText = (value: number): string => (value < 0 ? "-" : "+");

const latexIntegerTerm = (
  coefficient: number,
  variable: string,
  isFirst: boolean,
): string => {
  const magnitude = Math.abs(coefficient);
  const variableTerm = magnitude === 1 ? variable : `${magnitude}${variable}`;
  if (isFirst) {
    return coefficient < 0 ? `-${variableTerm}` : variableTerm;
  }
  return `${signText(coefficient)}${variableTerm}`;
};

const latexQuadraticEquation = (a: number, b: number, c: number): string => {
  const terms: string[] = [];
  if (a !== 0) {
    terms.push(latexIntegerTerm(a, "x_1^2", true));
  }
  if (b !== 0) {
    terms.push(latexIntegerTerm(b, "x_1", terms.length === 0));
  }
  if (c !== 0) {
    const term =
      terms.length === 0 ? String(c) : `${signText(c)}${Math.abs(c)}`;
    terms.push(term);
  }
  return `${terms.length > 0 ? terms.join("") : "0"}=0`;
};

const squareFreeFactor = (
  radicand: number,
): Readonly<{
  outside: number;
  inside: number;
}> => {
  let outside = 1;
  let inside = radicand;
  for (let factor = 2; factor * factor <= inside; factor += 1) {
    while (inside % (factor * factor) === 0) {
      outside *= factor;
      inside /= factor * factor;
    }
  }
  return { outside, inside };
};

const simplifiedRadicalFraction = (
  radicand: number,
  denominator: number,
): Readonly<{ coefficient: number; radicand: number; denominator: number }> => {
  const radical = squareFreeFactor(radicand);
  const divisor = greatestCommonDivisor(radical.outside, Math.abs(denominator));
  return {
    coefficient: radical.outside / divisor,
    radicand: radical.inside,
    denominator: Math.abs(denominator) / divisor,
  };
};

const radicalFractionLatex = (
  radicand: number,
  denominator: number,
): string => {
  const simplified = simplifiedRadicalFraction(radicand, denominator);
  const root =
    simplified.radicand === 1
      ? String(simplified.coefficient)
      : `${simplified.coefficient === 1 ? "" : simplified.coefficient}\\sqrt{${simplified.radicand}}`;
  return simplified.denominator === 1
    ? root
    : `\\frac{${root}}{${simplified.denominator}}`;
};

const radicalLatex = (radicand: number): string =>
  radicalFractionLatex(radicand, 1);

const signedRadicalLatex = (radicand: number, sign: 1 | -1): string =>
  `${sign < 0 ? "-" : ""}${radicalLatex(radicand)}`;

const linearRadicalLatex = (
  baseNumerator: number,
  denominator: number,
  radicand: number,
  radicalSign: 1 | -1,
): string | undefined => {
  if (denominator === 0 || radicand < 0) {
    return undefined;
  }
  const baseDivisor = greatestCommonDivisor(
    Math.abs(baseNumerator),
    Math.abs(denominator),
  );
  const baseNumeratorReduced = baseNumerator / baseDivisor;
  const baseDenominatorReduced = Math.abs(denominator) / baseDivisor;
  const signedBaseNumerator =
    denominator < 0 ? -baseNumeratorReduced : baseNumeratorReduced;
  const base =
    baseDenominatorReduced === 1
      ? String(signedBaseNumerator)
      : `\\frac{${signedBaseNumerator}}{${baseDenominatorReduced}}`;
  const radical = radicalFractionLatex(radicand, denominator);
  return `${base}${radicalSign < 0 ? "-" : "+"}${radical}`;
};

const oppositeLinearRadicalLatex = (
  constant: number,
  rootLatex: string,
): string | undefined => {
  const match = rootLatex.match(/^(-?\d+)([+-].+)$/);
  if (!match) {
    return undefined;
  }
  const base = Number(match[1]);
  const radicalPart = match[2];
  const nextBase = constant - base;
  const nextRadical = radicalPart.startsWith("+")
    ? `-${radicalPart.slice(1)}`
    : `+${radicalPart.slice(1)}`;
  return `${nextBase}${nextRadical}`;
};

const leadingQuadraticCoefficientLatex = (coefficient: number): string => {
  if (coefficient === 1) {
    return "";
  }
  if (coefficient === -1) {
    return "-";
  }
  return String(coefficient);
};

const compactPlusMinusRootLatex = (
  rootVariable: "x_1" | "x_2",
  rootLatex: string,
): string => {
  const match = rootLatex.match(
    /^(.+?)[+-](\\frac\{\\sqrt\{\d+\}\}\{\d+\}|\\sqrt\{\d+\})$/,
  );
  return match
    ? `${rootVariable}=${match[1]}\\pm${match[2]}`
    : `${rootVariable}=${rootLatex}`;
};

const exactNumberLatexFromValue = (value: number): string | undefined => {
  const integer = asSafeInteger(value);
  if (integer !== undefined) {
    return String(integer);
  }
  return undefined;
};

const exactPointLatexFromValues = (
  point: NonlinearPoint,
): string | undefined => {
  const x1 = exactNumberLatexFromValue(point.x1);
  const x2 = exactNumberLatexFromValue(point.x2);
  return x1 && x2 ? `\\left(${x1},${x2}\\right)` : undefined;
};

const parseRadicalTerm = (term: string): ExactLinearRadical | undefined => {
  const normalized = term.startsWith("+") ? term.slice(1) : term;
  const fractionMatch = normalized.match(
    /^(-?)\\frac\{(\d*)\\sqrt\{(\d+)\}\}\{(\d+)\}$/,
  );
  if (fractionMatch) {
    return {
      constant: 0,
      radicalNumerator:
        (fractionMatch[1] === "-" ? -1 : 1) *
        (fractionMatch[2] ? Number(fractionMatch[2]) : 1),
      radicalDenominator: Number(fractionMatch[4]),
      radicand: Number(fractionMatch[3]),
    };
  }
  const radicalMatch = normalized.match(/^(-?)(\d*)\\sqrt\{(\d+)\}$/);
  if (!radicalMatch) {
    return undefined;
  }
  return {
    constant: 0,
    radicalNumerator:
      (radicalMatch[1] === "-" ? -1 : 1) *
      (radicalMatch[2] ? Number(radicalMatch[2]) : 1),
    radicalDenominator: 1,
    radicand: Number(radicalMatch[3]),
  };
};

const parseExactCoordinateLatex = (
  coordinate: string,
): ExactLinearRadical | undefined => {
  const integer = Number(coordinate);
  if (Number.isInteger(integer)) {
    return {
      constant: integer,
      radicalNumerator: 0,
      radicalDenominator: 1,
    };
  }
  const radicalOnly = parseRadicalTerm(coordinate);
  if (radicalOnly) {
    return radicalOnly;
  }
  const linearMatch = coordinate.match(/^(-?\d+)([+-].+)$/);
  if (!linearMatch) {
    return undefined;
  }
  const radical = parseRadicalTerm(linearMatch[2]);
  if (!radical) {
    return undefined;
  }
  return { ...radical, constant: Number(linearMatch[1]) };
};

const combineExactObjectiveTerms = (
  firstCoefficient: number,
  first: ExactLinearRadical,
  secondCoefficient: number,
  second: ExactLinearRadical,
): ExactLinearRadical | undefined => {
  if (
    first.radicand !== undefined &&
    second.radicand !== undefined &&
    first.radicand !== second.radicand
  ) {
    return undefined;
  }
  const radicand = first.radicand ?? second.radicand;
  const denominator = Math.max(
    first.radicalDenominator,
    second.radicalDenominator,
  );
  if (
    denominator % first.radicalDenominator !== 0 ||
    denominator % second.radicalDenominator !== 0
  ) {
    return undefined;
  }
  return {
    constant:
      firstCoefficient * first.constant + secondCoefficient * second.constant,
    radicalNumerator:
      firstCoefficient *
        first.radicalNumerator *
        (denominator / first.radicalDenominator) +
      secondCoefficient *
        second.radicalNumerator *
        (denominator / second.radicalDenominator),
    radicalDenominator: denominator,
    radicand,
  };
};

const formatExactLinearRadical = (
  expression: ExactLinearRadical,
): string | undefined => {
  if (expression.radicalNumerator === 0 || expression.radicand === undefined) {
    return String(expression.constant);
  }
  const divisor = greatestCommonDivisor(
    Math.abs(expression.radicalNumerator),
    expression.radicalDenominator,
  );
  const numerator = expression.radicalNumerator / divisor;
  const denominator = expression.radicalDenominator / divisor;
  const radical =
    Math.abs(numerator) === 1
      ? `\\sqrt{${expression.radicand}}`
      : `${Math.abs(numerator)}\\sqrt{${expression.radicand}}`;
  const radicalTerm =
    denominator === 1 ? radical : `\\frac{${radical}}{${denominator}}`;
  if (expression.constant === 0) {
    return `${numerator < 0 ? "-" : ""}${radicalTerm}`;
  }
  return `${expression.constant}${numerator < 0 ? "-" : "+"}${radicalTerm}`;
};

const pointDistance = (first: NonlinearPoint, second: NonlinearPoint): number =>
  Math.hypot(first.x1 - second.x1, first.x2 - second.x2);

const dedupeRawCandidates = (
  candidates: readonly RawCandidate[],
): RawCandidate[] => {
  const output: RawCandidate[] = [];
  for (const candidate of candidates) {
    if (
      !Number.isFinite(candidate.point.x1) ||
      !Number.isFinite(candidate.point.x2)
    ) {
      continue;
    }
    const point = {
      x1: roundNearZero(candidate.point.x1),
      x2: roundNearZero(candidate.point.x2),
    };
    if (
      !output.some(
        (existing) =>
          pointDistance(existing.point, point) <= FEASIBILITY_EPSILON,
      )
    ) {
      output.push({ ...candidate, point });
    }
  }
  return output;
};

const exactAxisRootLatex = (
  quadraticCoefficient: number,
  linearCoefficient: number,
  rightHandSide: number,
  root: number,
): string | undefined => {
  const q = asSafeInteger(quadraticCoefficient);
  const l = asSafeInteger(linearCoefficient);
  const c = asSafeInteger(rightHandSide);
  if (q === undefined || l === undefined || c === undefined) {
    return exactNumberLatexFromValue(root);
  }
  if (q === 0) {
    return exactNumberLatexFromValue(root);
  }
  if (l !== 0 || c % q !== 0) {
    return exactNumberLatexFromValue(root);
  }
  const radicand = c / q;
  if (radicand < 0) {
    return undefined;
  }
  const integerRoot = Math.trunc(Math.sqrt(radicand));
  if (integerRoot * integerRoot === radicand) {
    return String(root < 0 ? -integerRoot : integerRoot);
  }
  return signedRadicalLatex(radicand, root < 0 ? -1 : 1);
};

const axisDerivationSteps = (
  variable: "x_1" | "x_2",
  otherVariable: "x_1" | "x_2",
  constraint: NonlinearConstraintInput,
): string[] => {
  const coefficient = variable === "x_1" ? constraint.q1 : constraint.q2;
  const linear = variable === "x_1" ? constraint.a : constraint.b;
  const coefficientInteger = asSafeInteger(coefficient);
  const linearInteger = asSafeInteger(linear);
  const cInteger = asSafeInteger(constraint.c);
  if (
    coefficientInteger === undefined ||
    linearInteger === undefined ||
    cInteger === undefined
  ) {
    return [`${otherVariable}=0`];
  }
  const equation = latexQuadraticEquation(
    coefficientInteger,
    linearInteger,
    -cInteger,
  ).replaceAll("x_1", variable);
  if (coefficientInteger !== 0 && linearInteger === 0) {
    const radicand = cInteger / coefficientInteger;
    const root = Number.isInteger(radicand)
      ? radicalLatex(radicand)
      : formatNonlinearNumber(Math.sqrt(Math.max(0, radicand)));
    return [
      `${otherVariable}=0`,
      `${coefficientInteger === 1 ? "" : coefficientInteger}${variable}^2=${cInteger}`,
      `${variable}=\\pm${root}`,
    ];
  }
  return [`${otherVariable}=0`, equation];
};

const axisIntersectionsForVariable = (
  constraint: NonlinearConstraintInput,
  variable: "x_1" | "x_2",
): NonlinearAxisIntersection[] => {
  const isX1 = variable === "x_1";
  const otherVariable = isX1 ? "x_2" : "x_1";
  const quadraticCoefficient = isX1 ? constraint.q1 : constraint.q2;
  const linearCoefficient = isX1 ? constraint.a : constraint.b;
  return solveQuadratic(
    quadraticCoefficient,
    linearCoefficient,
    -constraint.c,
  ).map((root) => {
    const point = isX1 ? { x1: root, x2: 0 } : { x1: 0, x2: root };
    const rootLatex = exactAxisRootLatex(
      quadraticCoefficient,
      linearCoefficient,
      constraint.c,
      root,
    );
    return {
      point,
      exactPointLatex: rootLatex
        ? `\\left(${isX1 ? rootLatex : "0"},${isX1 ? "0" : rootLatex}\\right)`
        : exactPointLatexFromValues(point),
      derivation: {
        title: `Intercepto con el eje ${isX1 ? "x_1" : "x_2"}`,
        steps: axisDerivationSteps(variable, otherVariable, constraint),
      },
    };
  });
};

const axisIntersections = (
  constraint: NonlinearConstraintInput,
): NonlinearAxisIntersection[] => [
  ...axisIntersectionsForVariable(constraint, "x_1"),
  ...axisIntersectionsForVariable(constraint, "x_2"),
];

const dedupeAxisIntersections = (
  intersections: readonly NonlinearAxisIntersection[],
): NonlinearAxisIntersection[] => {
  const output: NonlinearAxisIntersection[] = [];
  for (const intersection of intersections) {
    if (
      !output.some(
        (existing) =>
          pointDistance(existing.point, intersection.point) <=
          FEASIBILITY_EPSILON,
      )
    ) {
      output.push(intersection);
    }
  }
  return output;
};

const linearIntersection = (
  first: NonlinearConstraintInput,
  second: NonlinearConstraintInput,
): NonlinearPoint[] => {
  const determinant = first.a * second.b - first.b * second.a;
  if (Math.abs(determinant) <= EPSILON) {
    return [];
  }
  return [
    {
      x1: (first.c * second.b - first.b * second.c) / determinant,
      x2: (first.a * second.c - first.c * second.a) / determinant,
    },
  ];
};

const exactLineQuadraticCandidates = (
  quadratic: NonlinearConstraintInput,
  points: readonly NonlinearPoint[],
  rootVariable: "x_1" | "x_2",
  alpha: number,
  beta: number,
  qa: number,
  qb: number,
  qc: number,
): RawCandidate[] | undefined => {
  const alphaInteger = asSafeInteger(alpha);
  const betaInteger = asSafeInteger(beta);
  const qaInteger = asSafeInteger(qa);
  const qbInteger = asSafeInteger(qb);
  const qcInteger = asSafeInteger(qc);
  const q1Integer = asSafeInteger(quadratic.q1);
  const q2Integer = asSafeInteger(quadratic.q2);
  const cInteger = asSafeInteger(quadratic.c);
  if (
    alphaInteger === undefined ||
    betaInteger === undefined ||
    qaInteger === undefined ||
    qbInteger === undefined ||
    qcInteger === undefined ||
    q1Integer === undefined ||
    q2Integer === undefined ||
    cInteger === undefined ||
    points.length !== 2 ||
    Math.abs(betaInteger) !== 1 ||
    quadratic.a !== 0 ||
    quadratic.b !== 0
  ) {
    return undefined;
  }
  const discriminant = qbInteger ** 2 - 4 * qaInteger * qcInteger;
  if (discriminant < 0) {
    return undefined;
  }
  const denominator = 2 * qaInteger;
  const lowerRoot = linearRadicalLatex(
    -qbInteger,
    denominator,
    discriminant,
    -1,
  );
  const upperRoot = linearRadicalLatex(
    -qbInteger,
    denominator,
    discriminant,
    1,
  );
  if (!lowerRoot || !upperRoot) {
    return undefined;
  }
  const dependentVariable = rootVariable === "x_1" ? "x_2" : "x_1";
  const substitution = `${dependentVariable}=${alphaInteger}${betaInteger < 0 ? "-" : "+"}${rootVariable}`;
  const substitutedEquation =
    rootVariable === "x_1"
      ? `${leadingQuadraticCoefficientLatex(q1Integer)}x_1^2+${leadingQuadraticCoefficientLatex(q2Integer)}\\left(${alphaInteger}${betaInteger < 0 ? "-" : "+"}x_1\\right)^2=${cInteger}`
      : `${leadingQuadraticCoefficientLatex(q1Integer)}\\left(${alphaInteger}${betaInteger < 0 ? "-" : "+"}x_2\\right)^2+${leadingQuadraticCoefficientLatex(q2Integer)}x_2^2=${cInteger}`;
  const quadraticEquation = latexQuadraticEquation(
    qaInteger,
    qbInteger,
    qcInteger,
  );
  const compactRoot = compactPlusMinusRootLatex(rootVariable, upperRoot);
  const roots = [lowerRoot, upperRoot];
  return points.map((point, index) => {
    const rootLatex = roots[index] ?? roots[0];
    const dependentLatex = oppositeLinearRadicalLatex(alphaInteger, rootLatex);
    const exactPointLatex =
      dependentLatex && rootVariable === "x_1"
        ? `\\left(${rootLatex},${dependentLatex}\\right)`
        : dependentLatex
          ? `\\left(${dependentLatex},${rootLatex}\\right)`
          : undefined;
    return {
      point,
      source: "intersection" as const,
      exactPointLatex,
      derivation: {
        title: "Intersección línea-curva",
        steps: [
          substitution,
          substitutedEquation,
          quadraticEquation,
          compactRoot,
        ],
      },
    };
  });
};

const lineQuadraticIntersections = (
  linear: NonlinearConstraintInput,
  quadratic: NonlinearConstraintInput,
): RawCandidate[] => {
  if (Math.abs(linear.a) > Math.abs(linear.b)) {
    const alpha = linear.c / linear.a;
    const beta = -linear.b / linear.a;
    const qa = quadratic.q1 * beta ** 2 + quadratic.q2;
    const qb =
      2 * quadratic.q1 * alpha * beta + quadratic.a * beta + quadratic.b;
    const qc = quadratic.q1 * alpha ** 2 + quadratic.a * alpha - quadratic.c;
    const points = solveQuadratic(qa, qb, qc).map((x2) => ({
      x1: alpha + beta * x2,
      x2,
    }));
    return (
      exactLineQuadraticCandidates(
        quadratic,
        points,
        "x_2",
        alpha,
        beta,
        qa,
        qb,
        qc,
      ) ?? points.map((point) => ({ point, source: "intersection" as const }))
    );
  }
  if (Math.abs(linear.b) <= EPSILON) {
    return [];
  }
  const alpha = linear.c / linear.b;
  const beta = -linear.a / linear.b;
  const qa = quadratic.q1 + quadratic.q2 * beta ** 2;
  const qb = 2 * quadratic.q2 * alpha * beta + quadratic.a + quadratic.b * beta;
  const qc = quadratic.q2 * alpha ** 2 + quadratic.b * alpha - quadratic.c;
  const points = solveQuadratic(qa, qb, qc).map((x1) => ({
    x1,
    x2: alpha + beta * x1,
  }));
  return (
    exactLineQuadraticCandidates(
      quadratic,
      points,
      "x_1",
      alpha,
      beta,
      qa,
      qb,
      qc,
    ) ?? points.map((point) => ({ point, source: "intersection" as const }))
  );
};

const pairIntersections = (
  first: NonlinearConstraintInput,
  second: NonlinearConstraintInput,
): RawCandidate[] => {
  if (isLinear(first) && isLinear(second)) {
    return linearIntersection(first, second).map((point) => ({
      point,
      source: "intersection",
    }));
  }
  if (isLinear(first)) {
    return lineQuadraticIntersections(first, second);
  }
  if (isLinear(second)) {
    return lineQuadraticIntersections(second, first);
  }
  const difference: NonlinearConstraintInput = {
    q1: first.q1 - second.q1,
    q2: first.q2 - second.q2,
    a: first.a - second.a,
    b: first.b - second.b,
    operator: "=",
    c: first.c - second.c,
  };
  if (
    isLinear(difference) &&
    (Math.abs(difference.a) > EPSILON || Math.abs(difference.b) > EPSILON)
  ) {
    return lineQuadraticIntersections(difference, first);
  }
  return [];
};

const objectiveTangentPoints = (
  constraint: NonlinearConstraintInput,
  objective: readonly [number, number],
): NonlinearPoint[] => {
  if (
    isLinear(constraint) ||
    constraint.q1 <= EPSILON ||
    constraint.q2 <= EPSILON
  ) {
    return [];
  }
  const center = {
    x1: -constraint.a / (2 * constraint.q1),
    x2: -constraint.b / (2 * constraint.q2),
  };
  const radiusTerm =
    constraint.c +
    constraint.a ** 2 / (4 * constraint.q1) +
    constraint.b ** 2 / (4 * constraint.q2);
  const weightedNorm =
    objective[0] ** 2 / constraint.q1 + objective[1] ** 2 / constraint.q2;
  if (radiusTerm < -FEASIBILITY_EPSILON || weightedNorm <= EPSILON) {
    return [];
  }
  const scale = Math.sqrt(Math.max(0, radiusTerm) / weightedNorm);
  const direction = {
    x1: objective[0] / constraint.q1,
    x2: objective[1] / constraint.q2,
  };
  return [
    {
      x1: center.x1 + scale * direction.x1,
      x2: center.x2 + scale * direction.x2,
    },
    {
      x1: center.x1 - scale * direction.x1,
      x2: center.x2 - scale * direction.x2,
    },
  ];
};

const rawCandidates = (input: NonlinearProgramInput): RawCandidate[] => {
  const candidates: RawCandidate[] = [
    { point: { x1: 0, x2: 0 }, source: "origin" },
  ];
  input.constraints.forEach((constraint) => {
    candidates.push(
      ...axisIntersections(constraint).map((intersection) => ({
        point: intersection.point,
        source: "axis" as const,
        exactPointLatex: intersection.exactPointLatex,
        derivation: intersection.derivation,
      })),
      ...objectiveTangentPoints(constraint, input.objective).map((point) => ({
        point,
        source: "objective-tangent" as const,
      })),
    );
  });
  for (let i = 0; i < input.constraints.length; i += 1) {
    for (let j = i + 1; j < input.constraints.length; j += 1) {
      candidates.push(
        ...pairIntersections(input.constraints[i], input.constraints[j]),
      );
    }
  }
  return dedupeRawCandidates(candidates);
};

const objectiveValueAt = (
  objective: readonly [number, number],
  point: NonlinearPoint,
): number => roundNearZero(objective[0] * point.x1 + objective[1] * point.x2);

const activeConstraintIndexes = (
  point: NonlinearPoint,
  constraints: readonly NonlinearConstraintInput[],
): number[] =>
  constraints.flatMap((constraint, index) =>
    Math.abs(evaluateNonlinearConstraint(constraint, point) - constraint.c) <=
    FEASIBILITY_EPSILON
      ? [index]
      : [],
  );

const liesOnStrictBoundary = (
  point: NonlinearPoint,
  constraints: readonly NonlinearConstraintInput[],
): boolean =>
  constraints.some(
    (constraint) =>
      (constraint.operator === "<" || constraint.operator === ">") &&
      Math.abs(evaluateNonlinearConstraint(constraint, point) - constraint.c) <=
        FEASIBILITY_EPSILON,
  );

const findCandidates = (
  input: NonlinearProgramInput,
): NonlinearCandidatePoint[] =>
  rawCandidates(input)
    .filter((candidate) =>
      input.constraints.every((constraint) =>
        nonlinearConstraintContainsClosed(constraint, candidate.point),
      ),
    )
    .sort(
      (first, second) =>
        first.point.x1 - second.point.x1 || first.point.x2 - second.point.x2,
    )
    .map((candidate, index) => {
      const exactPointLatex =
        candidate.exactPointLatex ?? exactPointLatexFromValues(candidate.point);
      return {
        name: alphabet[index] ?? `P${index + 1}`,
        point: candidate.point,
        activeConstraintIndexes: activeConstraintIndexes(
          candidate.point,
          input.constraints,
        ),
        objectiveValue: objectiveValueAt(input.objective, candidate.point),
        exactObjectiveLatex: exactObjectiveValueLatex(input.objective, {
          exactPointLatex,
        }),
        isIncluded: input.constraints.every((constraint) =>
          containsOriginal(constraint, candidate.point),
        ),
        liesOnStrictBoundary: liesOnStrictBoundary(
          candidate.point,
          input.constraints,
        ),
        source: candidate.source,
        exactPointLatex,
        derivation: candidate.derivation,
      };
    });

const findFeasibleSample = (
  constraints: readonly NonlinearConstraintInput[],
  candidates: readonly NonlinearCandidatePoint[],
): NonlinearPoint | undefined => {
  const probes: NonlinearPoint[] = candidates.map(
    (candidate) => candidate.point,
  );
  for (const candidate of candidates) {
    for (const dx of [-1e-4, 0, 1e-4]) {
      for (const dy of [-1e-4, 0, 1e-4]) {
        probes.push({
          x1: candidate.point.x1 + dx,
          x2: candidate.point.x2 + dy,
        });
      }
    }
  }
  for (let x = -20; x <= 20; x += 1) {
    for (let y = -20; y <= 20; y += 1) {
      probes.push({ x1: x / 2, x2: y / 2 });
    }
  }
  return dedupeRawCandidates(
    probes.map((point) => ({ point, source: "origin" })),
  ).find((candidate) =>
    constraints.every((constraint) =>
      containsOriginal(constraint, candidate.point),
    ),
  )?.point;
};

const exactObjectiveValueLatex = (
  objective: readonly [number, number],
  candidate: Pick<NonlinearCandidatePoint, "exactPointLatex">,
): string | undefined => {
  const objectiveX1 = asSafeInteger(objective[0]);
  const objectiveX2 = asSafeInteger(objective[1]);
  if (
    objectiveX1 === undefined ||
    objectiveX2 === undefined ||
    !candidate.exactPointLatex
  ) {
    return undefined;
  }
  const coordinateMatch = candidate.exactPointLatex.match(
    /^\\left\((.+),(.+)\\right\)$/,
  );
  if (!coordinateMatch) {
    return undefined;
  }
  const x1 = parseExactCoordinateLatex(coordinateMatch[1]);
  const x2 = parseExactCoordinateLatex(coordinateMatch[2]);
  if (!x1 || !x2) {
    return undefined;
  }
  const expression = combineExactObjectiveTerms(
    objectiveX1,
    x1,
    objectiveX2,
    x2,
  );
  return expression ? formatExactLinearRadical(expression) : undefined;
};

const constraintKind = (
  constraint: NonlinearConstraintInput,
): NonlinearConstraintKind => {
  if (isLinear(constraint)) {
    if (Math.abs(constraint.b) <= EPSILON && Math.abs(constraint.a) > EPSILON) {
      return "vertical";
    }
    if (Math.abs(constraint.a) <= EPSILON && Math.abs(constraint.b) > EPSILON) {
      return "horizontal";
    }
    return "linear";
  }
  if (
    Math.abs(constraint.q1 - constraint.q2) <= EPSILON &&
    Math.abs(constraint.q1) > EPSILON
  ) {
    return "circle";
  }
  if (constraint.q1 > EPSILON && constraint.q2 > EPSILON) {
    return "ellipse";
  }
  return "quadratic";
};

const constraintDescription = (
  constraint: NonlinearConstraintInput,
): string => {
  switch (constraintKind(constraint)) {
    case "circle":
      return "La frontera es una circunferencia porque ambos cuadrados tienen el mismo peso.";
    case "ellipse":
      return "La frontera es una elipse porque ambos cuadrados aparecen con pesos positivos.";
    case "vertical":
      return "La frontera es una recta vertical.";
    case "horizontal":
      return "La frontera es una recta horizontal.";
    case "linear":
      return "La frontera es una recta.";
    case "quadratic":
      return "La frontera es una curva cuadrática diagonal dentro del alcance del método.";
  }
};

const buildConstraintAnalyses = (
  constraints: readonly NonlinearConstraintInput[],
): NonlinearConstraintAnalysis[] =>
  constraints.map((constraint, index) => ({
    index,
    original: constraint,
    label: constraint.label ?? formatNonlinearConstraint(constraint),
    boundaryLabel: `${formatNonlinearExpression(constraint)} = ${formatNonlinearNumber(constraint.c)}`,
    kind: constraintKind(constraint),
    boundaryIncluded:
      constraint.operator === "<=" ||
      constraint.operator === ">=" ||
      constraint.operator === "=",
    axisIntersections: dedupeAxisIntersections(axisIntersections(constraint)),
    description: constraintDescription(constraint),
  }));

const optimumFromCandidates = (
  objective: readonly [number, number],
  sense: NonlinearObjectiveSense,
  candidates: readonly NonlinearCandidatePoint[],
): Readonly<{
  status: NonlinearSolutionStatus;
  optimum?: NonlinearOptimum;
}> => {
  if (candidates.length === 0) {
    return { status: "no-attained-candidate" };
  }
  const bestValue =
    sense === "max"
      ? Math.max(...candidates.map((candidate) => candidate.objectiveValue))
      : Math.min(...candidates.map((candidate) => candidate.objectiveValue));
  const closureBest = candidates.filter(
    (candidate) =>
      Math.abs(candidate.objectiveValue - bestValue) <= FEASIBILITY_EPSILON,
  );
  const includedBest = closureBest.filter((candidate) => candidate.isIncluded);
  if (includedBest.length === 0) {
    const exactValueLatex = exactObjectiveValueLatex(objective, closureBest[0]);
    return {
      status: "unattained",
      optimum: {
        value: bestValue,
        exactValueLatex,
        boundName: sense === "max" ? "supremo" : "ínfimo",
        points: closureBest,
      },
    };
  }
  const exactValueLatex = exactObjectiveValueLatex(objective, includedBest[0]);
  return {
    status: includedBest.length > 1 ? "multiple-optimal" : "optimal",
    optimum: {
      value: bestValue,
      exactValueLatex,
      boundName: sense === "max" ? "máximo" : "mínimo",
      points: includedBest,
    },
  };
};

const graphWindow = (
  constraints: readonly NonlinearConstraintInput[],
  candidates: readonly NonlinearCandidatePoint[],
  objective: readonly [number, number],
  feasibleSample?: NonlinearPoint,
): NonlinearWindow => {
  const points: NonlinearPoint[] = [
    { x1: 0, x2: 0 },
    ...candidates.map((candidate) => candidate.point),
  ];
  if (feasibleSample) {
    points.push(feasibleSample);
  }
  for (const constraint of constraints) {
    points.push(
      ...axisIntersections(constraint).map(
        (intersection) => intersection.point,
      ),
      ...objectiveTangentPoints(constraint, objective),
    );
  }
  const xs = points.map((point) => point.x1).filter(Number.isFinite);
  const ys = points.map((point) => point.x2).filter(Number.isFinite);
  const minX = Math.min(...xs, -1);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, -1);
  const maxY = Math.max(...ys, 1);
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

const createPlotStates = (
  constraintCount: number,
  status: NonlinearSolutionStatus,
  candidates: readonly NonlinearCandidatePoint[],
  optimum?: NonlinearOptimum,
): NonlinearPlotState[] => {
  const states: NonlinearPlotState[] = [
    {
      title: "Planteamiento",
      description:
        "Se presenta la función objetivo y las restricciones que pueden incluir cuadrados.",
      visibleConstraintIndexes: [],
      showFeasibleRegion: false,
      highlightedCandidateNames: [],
    },
  ];
  for (let index = 0; index < constraintCount; index += 1) {
    states.push({
      title: `Frontera ${index + 1}`,
      description:
        "Se cambia la relación por igualdad para dibujar la recta o curva de frontera.",
      visibleConstraintIndexes: Array.from(
        { length: index + 1 },
        (_, item) => item,
      ),
      showFeasibleRegion: true,
      highlightedCandidateNames: [],
    });
  }
  states.push({
    title:
      status === "infeasible" ? "Sin región factible" : "Puntos candidatos",
    description:
      status === "infeasible"
        ? "No se encontró un punto que cumpla todas las restricciones originales."
        : "Se marcan ejes, intersecciones y tangencias que deben evaluarse en Z.",
    visibleConstraintIndexes: Array.from(
      { length: constraintCount },
      (_, item) => item,
    ),
    showFeasibleRegion: true,
    highlightedCandidateNames: candidates.map((candidate) => candidate.name),
  });
  if (optimum) {
    states.push({
      title: status === "unattained" ? "Valor límite" : "Solución óptima",
      description:
        status === "unattained"
          ? "El mejor valor está sobre una frontera estricta y se reporta como límite."
          : "Se resalta el candidato que da el mejor valor alcanzable.",
      visibleConstraintIndexes: Array.from(
        { length: constraintCount },
        (_, item) => item,
      ),
      showFeasibleRegion: true,
      highlightedCandidateNames: optimum.points.map((point) => point.name),
    });
  }
  return states;
};

const buildSteps = (
  status: NonlinearSolutionStatus,
  optimum?: NonlinearOptimum,
): string[] => {
  const steps = [
    "Se identifica que el objetivo es lineal, pero la región factible puede tener curvas por términos cuadrados.",
    "Cada restricción se convierte temporalmente en igualdad para dibujar su frontera.",
    "Se calculan puntos candidatos en ejes, intersecciones entre fronteras y tangencias con curvas suaves.",
    "Cada candidato se revisa con las restricciones originales, respetando fronteras estrictas.",
    "Se evalúa Z en los candidatos factibles de la cerradura y se compara el resultado.",
  ];
  if (status === "unattained" && optimum) {
    steps.push(
      `El mejor valor es ${optimum.boundName}; se aproxima, pero no se alcanza.`,
    );
  }
  return steps;
};

export const solveNonlinearGraphicalProgram = (
  input: NonlinearProgramInput,
): NonlinearProgramSolution => {
  validateInput(input);
  const candidates = findCandidates(input);
  const feasibleSample = findFeasibleSample(input.constraints, candidates);
  const notes: string[] = [];
  if (
    input.constraints.some(
      (constraint) =>
        !isLinear(constraint) &&
        (constraint.q1 < -EPSILON || constraint.q2 < -EPSILON),
    )
  ) {
    notes.push(
      "Hay coeficientes cuadráticos negativos; se calculan candidatos algebraicos básicos, pero la región puede requerir análisis adicional.",
    );
  }
  if (
    input.constraints.some((first, firstIndex) =>
      input.constraints.some(
        (second, secondIndex) =>
          secondIndex > firstIndex &&
          !isLinear(first) &&
          !isLinear(second) &&
          (Math.abs(first.q1 - second.q1) > EPSILON ||
            Math.abs(first.q2 - second.q2) > EPSILON),
      ),
    )
  ) {
    notes.push(
      "Si dos curvas cuadráticas tienen pesos distintos, esta versión solo enumera intersecciones que se reducen a una recta.",
    );
  }

  let status: NonlinearSolutionStatus;
  let optimum: NonlinearOptimum | undefined;
  if (!feasibleSample) {
    status = "infeasible";
  } else {
    const optimalResult = optimumFromCandidates(
      input.objective,
      input.sense,
      candidates,
    );
    status = optimalResult.status;
    optimum = optimalResult.optimum;
  }

  return {
    status,
    sense: input.sense,
    objective: input.objective,
    constraints: buildConstraintAnalyses(input.constraints),
    candidates,
    optimum,
    plotStates: createPlotStates(
      input.constraints.length,
      status,
      candidates,
      optimum,
    ),
    window: graphWindow(
      input.constraints,
      candidates,
      input.objective,
      feasibleSample,
    ),
    feasibleSample,
    steps: buildSteps(status, optimum),
    notes,
  };
};
