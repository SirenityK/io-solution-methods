import { describe, expect, test } from "bun:test";
import { solveSimplexTableau, solveSimplexTabular } from "./simplex";

describe("solveSimplexTableau", () => {
	test("solves the tutorial example from scripts/simplex_example.md", () => {
		const result = solveSimplexTableau({
			constraints: [
				[2, 1],
				[1, 1],
				[1, 2],
			],
			resources: [10, 7, 12],
			objective: [30, 40],
			decisionVariableNames: ["x", "y"],
			objectiveName: "P",
		});

		expect(result.status).toBe("optimal");
		expect(result.objectiveValue).toBe(260);
		expect(result.columns).toEqual(["x", "y", "s1", "s2", "s3", "P"]);
		expect(result.iterations).toHaveLength(3);
		expect(result.iterations[0]?.pivot).toEqual({
			row: 2,
			column: 1,
			value: 2,
			enteringVariable: "y",
			leavingVariable: "s3",
		});
		expect(result.iterations[0]?.ratios).toEqual([10, 7, 6]);
		expect(result.iterations[0]?.tableauAfter?.map((row) => row.rhs)).toEqual([
			4, 1, 6, 240,
		]);
		expect(result.iterations[1]?.pivot).toEqual({
			row: 1,
			column: 0,
			value: 0.5,
			enteringVariable: "x",
			leavingVariable: "s2",
		});
		expect(result.finalTableau.map((row) => row.rhs)).toEqual([1, 2, 5, 260]);
		expect(result.variables).toContainEqual({
			name: "x",
			value: 2,
			isBasic: true,
			row: 1,
		});
		expect(result.variables).toContainEqual({
			name: "y",
			value: 5,
			isBasic: true,
			row: 2,
		});
		expect(result.variables).toContainEqual({
			name: "s2",
			value: 0,
			isBasic: false,
			row: undefined,
		});
		expect(result.variables).toContainEqual({
			name: "P",
			value: 260,
			isBasic: true,
			row: 3,
		});
	});

	test("detects an unbounded tableau when the pivot column has no positive constraint entries", () => {
		const result = solveSimplexTableau({
			constraints: [[-1]],
			resources: [1],
			objective: [1],
		});

		expect(result.status).toBe("unbounded");
		expect(result.objectiveValue).toBe(Number.POSITIVE_INFINITY);
		expect(result.iterations[0]?.ratios).toEqual([null]);
	});

	test("returns optimal immediately when the objective row has no negative indicators", () => {
		const result = solveSimplexTableau({
			constraints: [[1, 0]],
			resources: [4],
			objective: [0, 0],
		});

		expect(result.status).toBe("optimal");
		expect(result.objectiveValue).toBe(0);
		expect(result.iterations).toHaveLength(1);
		expect(result.iterations[0]?.pivot).toBeUndefined();
	});

	test("rejects negative resources because they do not form the initial feasible tableau", () => {
		expect(() =>
			solveSimplexTableau({
				constraints: [[1]],
				resources: [-1],
				objective: [1],
			}),
		).toThrow("resources must be non-negative");
	});
});

describe("solveSimplexTabular", () => {
	test("solves the reference simplex table from scripts/simplex_tabular.py", () => {
		const result = solveSimplexTabular({
			coefficients: [
				[1, 1, 0, 1],
				[2, 1, 1, 0],
			],
			resources: [8, 10],
			objective: [1, 1, 0, 0],
			basis: [3, 2],
		});

		expect(result.status).toBe("optimal");
		expect(result.objectiveValue).toBe(8);
		expect(result.finalBasis).toEqual(["x2", "x1"]);
		expect(result.table.map((row) => row.value)).toEqual([6, 2]);
		expect(result.iterations[0]?.enteringColumn).toBe(0);
		expect(result.iterations[0]?.leavingRow).toBe(1);
		expect(result.iterations[0]?.ratios).toEqual([8, 5]);
		expect(result.iterations[0]?.tableBefore.map((row) => row.value)).toEqual([
			8, 10,
		]);
		expect(result.iterations[0]?.tableAfter?.map((row) => row.value)).toEqual([
			3, 5,
		]);
	});

	test("detects an unbounded maximization problem", () => {
		const result = solveSimplexTabular({
			coefficients: [[-1, 1]],
			resources: [1],
			objective: [1, 0],
			basis: [1],
		});

		expect(result.status).toBe("unbounded");
		expect(result.objectiveValue).toBe(Number.POSITIVE_INFINITY);
	});
});
