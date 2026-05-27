import { describe, expect, test } from "bun:test";
import {
	balanceTransportationProblem,
	type LeastCostStepTrace,
	leastCostMethod,
	type NorthwestCornerStepTrace,
	northwestCornerMethod,
	optimizeTransportationModi,
	type VogelStepTrace,
	vogelApproximationMethod,
} from "./transportation";

const classExample = {
	costs: [
		[8, 6, 10],
		[9, 7, 4],
		[3, 4, 2],
	],
	supply: [100, 120, 80],
	demand: [150, 80, 70],
} as const;

describe("transportation methods", () => {
	test("balances an unbalanced supply and demand problem with a dummy origin", () => {
		const balanced = balanceTransportationProblem({
			costs: [
				[4, 8],
				[2, 5],
			],
			supply: [5, 5],
			demand: [6, 7],
		});

		expect(balanced.supply).toEqual([5, 5, 3]);
		expect(balanced.costs.at(-1)).toEqual([0, 0]);
		expect(balanced.dummy).toEqual({ type: "origin", index: 2, amount: 3 });
	});

	test("matches the northwest corner result from the Python class example", () => {
		const result = northwestCornerMethod(classExample);

		expect(result.allocation).toEqual([
			[100, 0, 0],
			[50, 70, 0],
			[0, 10, 70],
		]);
		expect(result.totalCost).toBe(1920);
	});

	test("northwest corner exposes movement snapshots for the visual explanation", () => {
		const result = northwestCornerMethod(classExample);
		const firstStep = result.steps[1]?.data as
			| NorthwestCornerStepTrace
			| undefined;

		expect(firstStep).toEqual({
			row: 0,
			column: 0,
			amount: 100,
			cost: 8,
			supplyBefore: [100, 120, 80],
			demandBefore: [150, 80, 70],
			supplyAfter: [0, 120, 80],
			demandAfter: [50, 80, 70],
			activeRows: [false, true, true],
			activeColumns: [true, true, true],
			allocation: [
				[100, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
			],
			basic: [
				[true, false, false],
				[false, false, false],
				[false, false, false],
			],
			exhaustedRow: true,
			satisfiedColumn: false,
			nextMove: "down",
		});
	});

	test("matches the least-cost result from the Python logic", () => {
		const result = leastCostMethod(classExample);

		expect(result.allocation).toEqual([
			[20, 80, 0],
			[120, 0, 0],
			[10, 0, 70],
		]);
		expect(result.totalCost).toBe(1890);
	});

	test("least-cost exposes step snapshots for the visual explanation", () => {
		const result = leastCostMethod(classExample);
		const firstStep = result.steps[1]?.data as LeastCostStepTrace | undefined;

		expect(firstStep).toEqual({
			row: 2,
			column: 2,
			amount: 70,
			cost: 2,
			supplyBefore: [100, 120, 80],
			demandBefore: [150, 80, 70],
			supplyAfter: [100, 120, 10],
			demandAfter: [150, 80, 0],
			activeRows: [true, true, true],
			activeColumns: [true, true, false],
			allocation: [
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 70],
			],
			basic: [
				[false, false, false],
				[false, false, false],
				[false, false, true],
			],
			exhaustedRow: false,
			satisfiedColumn: true,
		});
	});

	test("matches the Vogel approximation result from the Python logic", () => {
		const result = vogelApproximationMethod(classExample);

		expect(result.allocation).toEqual([
			[20, 80, 0],
			[50, 0, 70],
			[80, 0, 0],
		]);
		expect(result.totalCost).toBe(1610);
	});

	test("Vogel exposes penalties and allocation snapshots for the visual explanation", () => {
		const result = vogelApproximationMethod(classExample);
		const firstStep = result.steps[1]?.data as VogelStepTrace | undefined;

		expect(firstStep).toEqual({
			row: 2,
			column: 0,
			amount: 80,
			cost: 3,
			supplyBefore: [100, 120, 80],
			demandBefore: [150, 80, 70],
			supplyAfter: [100, 120, 0],
			demandAfter: [70, 80, 70],
			activeRows: [true, true, false],
			activeColumns: [true, true, true],
			allocation: [
				[0, 0, 0],
				[0, 0, 0],
				[80, 0, 0],
			],
			basic: [
				[false, false, false],
				[false, false, false],
				[true, false, false],
			],
			exhaustedRow: true,
			satisfiedColumn: false,
			selectedAxis: "column",
			selectedIndex: 0,
			selectedPenalty: 5,
			rowPenalties: [
				{ penalty: 2, minimum: 6, position: 1 },
				{ penalty: 3, minimum: 4, position: 2 },
				{ penalty: 1, minimum: 2, position: 2 },
			],
			columnPenalties: [
				{ penalty: 5, minimum: 3, position: 2 },
				{ penalty: 2, minimum: 4, position: 2 },
				{ penalty: 2, minimum: 2, position: 2 },
			],
		});
	});

	test("MODI improves the northwest result to the known optimum", () => {
		const result = optimizeTransportationModi(classExample, "northwest-corner");

		expect(result.isOptimal).toBe(true);
		expect(result.totalCost).toBe(1610);
	});
});
