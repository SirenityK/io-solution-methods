import { describe, expect, test } from "bun:test";
import { solveGraphicalLinearProgram } from "./graphical-lp";
import { createGraphicalPlotModel } from "./graphical-lp-plot";

describe("createGraphicalPlotModel", () => {
	test("creates D3 paths for the final feasible region and optimal segment", () => {
		const solution = solveGraphicalLinearProgram({
			sense: "max",
			objective: [3, 2],
			constraints: [
				{ a: 1, b: 0, operator: "<=", c: 4 },
				{ a: 0, b: 2, operator: "<=", c: 12 },
				{ a: 3, b: 2, operator: "<=", c: 18 },
				{ a: 1, b: 0, operator: ">=", c: 0 },
				{ a: 0, b: 1, operator: ">=", c: 0 },
			],
		});
		const finalState = solution.plotStates.at(-1);

		expect(finalState).toBeDefined();
		if (!finalState) {
			throw new Error("Expected a final plot state");
		}
		const model = createGraphicalPlotModel(solution, finalState);

		expect(model.feasibleRegionPath?.startsWith("M")).toBe(true);
		expect(model.feasibleRegionPath?.endsWith("Z")).toBe(true);
		expect(model.lines).toHaveLength(5);
		expect(
			model.vertices.filter((vertex) => vertex.isHighlighted),
		).toHaveLength(2);
		expect(model.optimalSegment).toBeDefined();
	});

	test("keeps the initial plot empty even when the problem has multiple optima", () => {
		const solution = solveGraphicalLinearProgram({
			sense: "max",
			objective: [3, 2],
			constraints: [
				{ a: 1, b: 0, operator: "<=", c: 4 },
				{ a: 0, b: 2, operator: "<=", c: 12 },
				{ a: 3, b: 2, operator: "<=", c: 18 },
				{ a: 1, b: 0, operator: ">=", c: 0 },
				{ a: 0, b: 1, operator: ">=", c: 0 },
			],
		});

		const model = createGraphicalPlotModel(solution, solution.plotStates[0]);

		expect(model.lines).toHaveLength(0);
		expect(model.feasibleRegionPath).toBeUndefined();
		expect(model.optimalSegment).toBeUndefined();
	});

	test("marks strict boundary lines as dashed", () => {
		const solution = solveGraphicalLinearProgram({
			sense: "max",
			objective: [1, 0],
			constraints: [
				{ a: 1, b: 0, operator: "<", c: 1 },
				{ a: 1, b: 0, operator: ">=", c: 0 },
				{ a: 0, b: 1, operator: "=", c: 0 },
			],
		});
		const stateWithStrictLine = solution.plotStates[1];

		const model = createGraphicalPlotModel(solution, stateWithStrictLine);

		expect(model.lines[0]?.isDashed).toBe(true);
	});

	test("keeps axis and grid values inside the requested SVG size", () => {
		const solution = solveGraphicalLinearProgram({
			sense: "min",
			objective: [1, 0],
			constraints: [
				{ a: 1, b: 0, operator: ">=", c: -2 },
				{ a: 1, b: 0, operator: "<=", c: 1 },
				{ a: 0, b: 1, operator: "=", c: 0 },
			],
		});
		const model = createGraphicalPlotModel(solution, solution.plotStates[1], {
			width: 500,
			height: 300,
		});

		expect(model.width).toBe(500);
		expect(model.height).toBe(300);
		expect(
			model.gridLines.every((line) => line.from.x >= 0 && line.to.x <= 500),
		).toBe(true);
		expect(
			model.gridLines.every((line) => line.from.y >= 0 && line.to.y <= 300),
		).toBe(true);
	});

	test("keeps plot coordinates finite with very large finite values", () => {
		const solution = solveGraphicalLinearProgram({
			sense: "max",
			objective: [1_000_000_000, 2_000_000_000],
			constraints: [
				{ a: 1, b: 0, operator: "<=", c: 1_000_000_000_000 },
				{ a: 0, b: 1, operator: "<=", c: 2_000_000_000_000 },
				{ a: 1, b: 1, operator: "<=", c: 2_500_000_000_000 },
				{ a: 1, b: 0, operator: ">=", c: 0 },
				{ a: 0, b: 1, operator: ">=", c: 0 },
			],
		});
		const model = createGraphicalPlotModel(
			solution,
			solution.plotStates.at(-1) ?? solution.plotStates[0],
		);
		const screenValues = [
			...model.gridLines.flatMap((line) => [
				line.from.x,
				line.from.y,
				line.to.x,
				line.to.y,
			]),
			...model.lines.flatMap((line) => [line.labelPoint.x, line.labelPoint.y]),
			...model.vertices.flatMap((vertex) => [
				vertex.screenPoint.x,
				vertex.screenPoint.y,
			]),
		];

		expect(solution.status).toBe("optimal");
		expect(screenValues.every(Number.isFinite)).toBe(true);
	});

	test("does not draw fake boundary lines for always-true zero restrictions", () => {
		const solution = solveGraphicalLinearProgram({
			sense: "max",
			objective: [1, 1],
			constraints: [
				{ a: 0, b: 0, operator: "<=", c: 5 },
				{ a: 1, b: 0, operator: "<=", c: 4 },
				{ a: 0, b: 1, operator: "<=", c: 3 },
				{ a: 1, b: 0, operator: ">=", c: 0 },
				{ a: 0, b: 1, operator: ">=", c: 0 },
			],
		});
		const model = createGraphicalPlotModel(
			solution,
			solution.plotStates.at(-1) ?? solution.plotStates[0],
		);

		expect(model.lines.map((line) => line.constraintIndex)).toEqual([
			1, 2, 3, 4,
		]);
		expect(model.lines.some((line) => line.constraintIndex === 0)).toBe(false);
	});
});
