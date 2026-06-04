import { describe, expect, test } from "bun:test";
import { solveNonlinearGraphicalProgram } from "./nonlinear-graphical";
import { createNonlinearPlotModel } from "./nonlinear-graphical-plot";

describe("createNonlinearPlotModel", () => {
  test("creates curve paths and candidate points for the class example", () => {
    const solution = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [4, 2],
      constraints: [
        { q1: 0, q2: 0, a: 1, b: 1, operator: "<=", c: 6 },
        { q1: 1, q2: 1, a: 0, b: 0, operator: "<=", c: 25 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0 },
      ],
    });
    const model = createNonlinearPlotModel(
      solution,
      solution.plotStates.at(-1) ?? solution.plotStates[0],
    );

    expect(model.curves).toHaveLength(4);
    expect(
      model.curves.some((curve) =>
        curve.paths.some((path) => path.startsWith("M")),
      ),
    ).toBe(true);
    expect(model.candidates.some((candidate) => candidate.isHighlighted)).toBe(
      true,
    );
    expect(model.feasibleSamples.length).toBeGreaterThan(0);
  });

  test("marks strict boundaries as dashed", () => {
    const solution = solveNonlinearGraphicalProgram({
      sense: "max",
      objective: [1, 0],
      constraints: [
        { q1: 1, q2: 1, a: 0, b: 0, operator: "<", c: 25 },
        { q1: 0, q2: 0, a: 1, b: 0, operator: ">=", c: 0 },
        { q1: 0, q2: 0, a: 0, b: 1, operator: ">=", c: 0 },
      ],
    });
    const model = createNonlinearPlotModel(solution, solution.plotStates[1]);

    expect(model.curves[0]?.isDashed).toBe(true);
  });
});
