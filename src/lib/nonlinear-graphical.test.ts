import { describe, expect, test } from "bun:test";
import { solveNonlinearGraphicalProgram } from "./nonlinear-graphical";

const expectClose = (actual: number, expected: number) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-7);
};

describe("solveNonlinearGraphicalProgram", () => {
  test("solves the requested class example", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [4, 2],
      constraints: [
        { q1: 0, q2: 0, a: 1, b: 1, operator: "<=", c: 6 },
        { q1: 1, q2: 1, a: 0, b: 0, operator: "<=", c: 25 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0 },
      ],
    });

    expect(result.status).toBe("optimal");
    expectClose(result.optimum?.value ?? 0, 18 + Math.sqrt(14));
    expectClose(
      result.optimum?.points[0]?.point.x1 ?? 0,
      3 + Math.sqrt(14) / 2,
    );
    expectClose(
      result.optimum?.points[0]?.point.x2 ?? 0,
      3 - Math.sqrt(14) / 2,
    );
    expect(result.optimum?.points[0]?.exactPointLatex).toBe(
      "\\left(3+\\frac{\\sqrt{14}}{2},3-\\frac{\\sqrt{14}}{2}\\right)",
    );
    expect(result.optimum?.points[0]?.exactObjectiveLatex).toBe(
      "18+\\sqrt{14}",
    );
    expect(result.optimum?.exactValueLatex).toBe("18+\\sqrt{14}");
    expect(
      result.constraints[1]?.axisIntersections[1]?.derivation.steps,
    ).toEqual(["x_2=0", "x_1^2=25", "x_1=\\pm5"]);
    expect(result.optimum?.points[0]?.derivation?.steps).toContain("x_2=6-x_1");
    expect(result.optimum?.points[0]?.derivation?.steps).toContain(
      "x_1^2+\\left(6-x_1\\right)^2=25",
    );
    expect(result.optimum?.points[0]?.derivation?.steps).toContain(
      "2x_1^2-12x_1+11=0",
    );
    expect(result.optimum?.points[0]?.derivation?.steps).toContain(
      "x_1=3\\pm\\frac{\\sqrt{14}}{2}",
    );
  });

  test("formats axis candidates and their objective values with radicals", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [4, 2],
      constraints: [
        { q1: 0, q2: 0, a: 1, b: 1, operator: "<=", c: 6 },
        { q1: 1, q2: 1, a: 0, b: 0, operator: "<=", c: 24 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0 },
      ],
    });

    const verticalAxisCandidate = result.candidates.find(
      (candidate) =>
        Math.abs(candidate.point.x1) <= 1e-7 && candidate.point.x2 > 4,
    );

    expect(verticalAxisCandidate?.exactPointLatex).toBe(
      "\\left(0,2\\sqrt{6}\\right)",
    );
    expect(verticalAxisCandidate?.exactObjectiveLatex).toBe("4\\sqrt{6}");
    expect(
      result.constraints[1]?.axisIntersections[1]?.derivation.steps,
    ).toEqual(["x_2=0", "x_1^2=24", "x_1=\\pm2\\sqrt{6}"]);
  });

  test("finds a smooth tangent optimum on a circle", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [4, 2],
      constraints: [
        { q1: 1, q2: 1, a: 0, b: 0, operator: "<=", c: 25 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0 },
      ],
    });

    expect(result.status).toBe("optimal");
    expectClose(result.optimum?.value ?? 0, 10 * Math.sqrt(5));
    expect(result.optimum?.points[0]?.source).toBe("objective-tangent");
  });

  test("reports an unattained supremum for a strict less-than circle", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [1, 0],
      constraints: [
        { q1: 1, q2: 1, a: 0, b: 0, operator: "<", c: 25 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0 },
      ],
    });

    expect(result.status).toBe("unattained");
    expect(result.optimum?.boundName).toBe("supremo");
    expectClose(result.optimum?.value ?? 0, 5);
  });

  test("supports greater-than-or-equal outside a circle", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "min",
      objective: [1, 0],
      constraints: [
        { q1: 1, q2: 1, a: 0, b: 0, operator: ">=", c: 25 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: "<=", c: 6 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: "<=", c: 6 },
      ],
    });

    expect(result.status).toBe("multiple-optimal");
    expectClose(result.optimum?.value ?? Number.NaN, 0);
    expect(
      result.candidates.some(
        (candidate) => Math.abs(candidate.point.x2 - 5) <= 1e-7,
      ),
    ).toBe(true);
  });

  test("supports equality constraints", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [1, 0],
      constraints: [
        { q1: 1, q2: 1, a: 0, b: 0, operator: "=", c: 25 },
        { q1: 0, q2: 0, a: 1, b: 1, operator: "=", c: 7 },
      ],
    });

    expect(result.status).toBe("optimal");
    expectClose(result.optimum?.value ?? 0, 4);
  });

  test("supports strict greater-than as an unattained infimum", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "min",
      objective: [1, 0],
      constraints: [
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">", c: 0 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: "<=", c: 2 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: "<=", c: 2 },
      ],
    });

    expect(result.status).toBe("unattained");
    expect(result.optimum?.boundName).toBe("ínfimo");
    expectClose(result.optimum?.value ?? Number.NaN, 0);
  });

  test("reports infeasible disjoint equalities", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [1, 1],
      constraints: [
        { q1: 1, q2: 1, a: 0, b: 0, operator: "=", c: 1 },
        { q1: 1, q2: 1, a: 0, b: 0, operator: "=", c: 4 },
      ],
    });

    expect(result.status).toBe("infeasible");
    expect(result.optimum).toBeUndefined();
  });

  test("reports unbounded when the feasible region can improve forever", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [1, 1],
      constraints: [
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0 },
      ],
    });

    expect(result.status).toBe("unbounded");
    expect(result.optimum).toBeUndefined();
  });

  test("reports unbounded along an equality line when objective improves", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [1, 0],
      constraints: [
        { q1: 0, q2: 0, a: 0, b: 1, operator: "=", c: 0 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0 },
      ],
    });

    expect(result.status).toBe("unbounded");
  });

  test("keeps impossible zero-coefficient restrictions infeasible", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [1, 1],
      constraints: [{ q1: 0, q2: 0, a: 0, b: 0, operator: "<=", c: -1 }],
    });

    expect(result.status).toBe("infeasible");
  });

  test("solves a very small bounded circle without rounding it away", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [1, 0],
      constraints: [
        { q1: 1, q2: 1, a: 0, b: 0, operator: "<=", c: 1e-12 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0 },
      ],
    });

    expect(result.status).toBe("optimal");
    expectClose(result.optimum?.value ?? Number.NaN, 1e-6);
  });

  test("solves a large bounded circle without classifying it as unbounded", () => {
    const result = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [1, 0],
      constraints: [
        { q1: 1, q2: 1, a: 0, b: 0, operator: "<=", c: 1e12 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0 },
      ],
    });

    expect(result.status).toBe("optimal");
    expectClose(result.optimum?.value ?? Number.NaN, 1e6);
  });

  test("rejects invalid inputs before solving", () => {
    expect(() =>
      solveNonlinearGraphicalProgram({
        sense: "max",
        objective: [Number.NaN, 1],
        constraints: [{ q1: 0, q2: 0, a: 1, b: 0, operator: "<=", c: 1 }],
      }),
    ).toThrow("objective coefficient x1 must be a finite number");
    expect(() =>
      solveNonlinearGraphicalProgram({
        sense: "max",
        objective: [1, 1],
        constraints: [
          { q1: 0, q2: 0, a: 1, b: 0, operator: "=<" as never, c: 1 },
        ],
      }),
    ).toThrow("constraint R1 operator must be one of <=, >=, =, <, >");
  });
});
