import { describe, expect, test } from "bun:test";
import { solveGraphicalLinearProgram } from "./graphical-lp";

describe("solveGraphicalLinearProgram", () => {
	test("rejects non-finite objective coefficients before solving", () => {
		expect(() =>
			solveGraphicalLinearProgram({
				sense: "max",
				objective: [Number.NaN, 1],
				constraints: [{ a: 1, b: 0, operator: "<=", c: 10 }],
			}),
		).toThrow("objective coefficient x1 must be a finite number");
	});

	test("rejects non-finite constraint coefficients before solving", () => {
		expect(() =>
			solveGraphicalLinearProgram({
				sense: "max",
				objective: [1, 1],
				constraints: [
					{ a: 1, b: 0, operator: "<=", c: 10 },
					{ a: 0, b: Number.POSITIVE_INFINITY, operator: ">=", c: 0 },
				],
			}),
		).toThrow("constraint R2 coefficient x2 must be a finite number");
	});

	test("rejects invalid objective sense values before solving", () => {
		expect(() =>
			solveGraphicalLinearProgram({
				sense: "maximize" as never,
				objective: [1, 1],
				constraints: [{ a: 1, b: 0, operator: "<=", c: 10 }],
			}),
		).toThrow("sense must be max or min");
	});

	test("rejects invalid constraint operators before solving", () => {
		expect(() =>
			solveGraphicalLinearProgram({
				sense: "max",
				objective: [1, 1],
				constraints: [{ a: 1, b: 0, operator: "=<" as never, c: 10 }],
			}),
		).toThrow("constraint R1 operator must be one of <=, >=, =, <, >");
	});

	test("rejects values too large for stable graphical calculations", () => {
		expect(() =>
			solveGraphicalLinearProgram({
				sense: "max",
				objective: [1e200, 1],
				constraints: [{ a: 1, b: 0, operator: "<=", c: 10 }],
			}),
		).toThrow("objective coefficient x1 is too large for stable calculation");
	});

	test("keeps impossible zero-coefficient restrictions infeasible", () => {
		const result = solveGraphicalLinearProgram({
			sense: "max",
			objective: [1, 1],
			constraints: [
				{ a: 0, b: 0, operator: "<=", c: -1 },
				{ a: 1, b: 0, operator: ">=", c: 0 },
				{ a: 0, b: 1, operator: ">=", c: 0 },
			],
		});

		expect(result.status).toBe("infeasible");
		expect(result.vertices).toEqual([]);
	});

	test("keeps always-true zero-coefficient restrictions as redundant notes", () => {
		const result = solveGraphicalLinearProgram({
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

		expect(result.status).toBe("optimal");
		expect(result.optimum?.value).toBe(7);
		expect(result.constraints[0]?.isRedundant).toBe(true);
		expect(result.notes).toContain(
			"La restricción 1 se dibuja, pero no crea un borde nuevo de la región factible final; para este problema es redundante.",
		);
	});

	test("handles duplicate useful restrictions without duplicate vertices", () => {
		const result = solveGraphicalLinearProgram({
			sense: "max",
			objective: [1, 1],
			constraints: [
				{ a: 1, b: 0, operator: "<=", c: 4 },
				{ a: 2, b: 0, operator: "<=", c: 8 },
				{ a: 0, b: 1, operator: "<=", c: 3 },
				{ a: 1, b: 0, operator: ">=", c: 0 },
				{ a: 0, b: 1, operator: ">=", c: 0 },
			],
		});

		expect(result.status).toBe("optimal");
		expect(result.vertices.map((vertex) => vertex.point)).toEqual([
			{ x1: 0, x2: 0 },
			{ x1: 4, x2: 0 },
			{ x1: 4, x2: 3 },
			{ x1: 0, x2: 3 },
		]);
		expect(result.constraints[1]?.wasSimplified).toBe(true);
		expect(
			result.vertices.find((vertex) => vertex.point.x1 === 4)?.isDegenerate,
		).toBe(true);
	});

	test("negative right-hand side nonnegativity constraints are infeasible", () => {
		const result = solveGraphicalLinearProgram({
			sense: "max",
			objective: [1, 1],
			constraints: [
				{ a: 1, b: 0, operator: ">=", c: 0 },
				{ a: 0, b: 1, operator: ">=", c: 0 },
				{ a: 1, b: 0, operator: "<=", c: -1 },
			],
		});

		expect(result.status).toBe("infeasible");
		expect(result.optimum).toBeUndefined();
	});

	test("solves the class-style example with multiple optimal solutions", () => {
		const result = solveGraphicalLinearProgram({
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

		expect(result.status).toBe("multiple-optimal");
		expect(result.optimum?.value).toBe(18);
		expect(result.vertices.map((vertex) => vertex.point)).toEqual([
			{ x1: 0, x2: 0 },
			{ x1: 4, x2: 0 },
			{ x1: 4, x2: 3 },
			{ x1: 2, x2: 6 },
			{ x1: 0, x2: 6 },
		]);
		expect(result.optimum?.segment).toEqual({
			from: { x1: 4, x2: 3 },
			to: { x1: 2, x2: 6 },
		});
		expect(result.constraints[1]?.simplified).toMatchObject({
			a: 0,
			b: 1,
			c: 6,
		});
	});

	test("does not invent nonnegativity when negative values are feasible", () => {
		const result = solveGraphicalLinearProgram({
			sense: "min",
			objective: [1, 0],
			constraints: [
				{ a: 1, b: 0, operator: ">=", c: -2 },
				{ a: 1, b: 0, operator: "<=", c: 1 },
				{ a: 0, b: 1, operator: "=", c: 0 },
			],
		});

		expect(result.missingNonnegativity).toEqual(["x1", "x2"]);
		expect(result.status).toBe("optimal");
		expect(result.optimum?.value).toBe(-2);
		expect(result.optimum?.points[0]?.point).toEqual({ x1: -2, x2: 0 });
	});

	test("detects infeasible restrictions", () => {
		const result = solveGraphicalLinearProgram({
			sense: "max",
			objective: [1, 1],
			constraints: [
				{ a: 1, b: 0, operator: ">=", c: 1 },
				{ a: 1, b: 0, operator: "<=", c: 0 },
			],
		});

		expect(result.status).toBe("infeasible");
		expect(result.vertices).toEqual([]);
		expect(result.optimum).toBeUndefined();
	});

	test("detects an unbounded maximization region", () => {
		const result = solveGraphicalLinearProgram({
			sense: "max",
			objective: [1, 1],
			constraints: [
				{ a: 1, b: 0, operator: ">=", c: 0 },
				{ a: 0, b: 1, operator: ">=", c: 0 },
			],
		});

		expect(result.status).toBe("unbounded");
		expect(result.unboundedDirection).toEqual({ x1: 1, x2: 0 });
	});

	test("reports a supremum when a strict boundary prevents attainment", () => {
		const result = solveGraphicalLinearProgram({
			sense: "max",
			objective: [1, 0],
			constraints: [
				{ a: 1, b: 0, operator: "<", c: 1 },
				{ a: 1, b: 0, operator: ">=", c: 0 },
				{ a: 0, b: 1, operator: "=", c: 0 },
			],
		});

		expect(result.status).toBe("unattained");
		expect(result.optimum?.value).toBe(1);
		expect(result.optimum?.boundName).toBe("supremo");
		expect(result.optimum?.points[0]?.isIncluded).toBe(false);
	});
});
