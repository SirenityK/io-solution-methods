#!/usr/bin/env python3
from __future__ import annotations

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nonlinear_graphical_reference import EXAMPLE, solve


def optimum_value(result: dict) -> float:
    optimum = result.get("optimum")
    if not optimum:
        raise AssertionError("Expected an optimum")
    return float(optimum["value"])


def optimum_point(result: dict) -> tuple[float, float]:
    optimum = result.get("optimum")
    if not optimum:
        raise AssertionError("Expected an optimum")
    point = optimum["points"][0]["point"]
    return (float(point[0]), float(point[1]))


class NonlinearGraphicalReferenceTest(unittest.TestCase):
    def test_solves_given_example(self) -> None:
        result = solve(EXAMPLE)

        self.assertEqual(result["status"], "optimal")
        self.assertTrue(math.isclose(optimum_value(result), 18 + math.sqrt(14), abs_tol=1e-7))
        x1, x2 = optimum_point(result)
        self.assertTrue(math.isclose(x1, 3 + math.sqrt(14) / 2, abs_tol=1e-7))
        self.assertTrue(math.isclose(x2, 3 - math.sqrt(14) / 2, abs_tol=1e-7))

    def test_finds_smooth_circle_tangent_when_no_line_corner_exists(self) -> None:
        result = solve(
            {
                "sense": "max",
                "objective": [4, 2],
                "constraints": [
                    {"q1": 1, "q2": 1, "a": 0, "b": 0, "operator": "<=", "c": 25},
                    {"q1": 0, "q2": 0, "a": 1, "b": 0, "operator": ">=", "c": 0},
                    {"q1": 0, "q2": 0, "a": 0, "b": 1, "operator": ">=", "c": 0},
                ],
            }
        )

        self.assertEqual(result["status"], "optimal")
        self.assertTrue(math.isclose(optimum_value(result), 10 * math.sqrt(5), abs_tol=1e-7))
        x1, x2 = optimum_point(result)
        self.assertTrue(math.isclose(x1, 2 * math.sqrt(5), abs_tol=1e-7))
        self.assertTrue(math.isclose(x2, math.sqrt(5), abs_tol=1e-7))

    def test_reports_unattained_for_strict_circle_boundary(self) -> None:
        result = solve(
            {
                "sense": "max",
                "objective": [1, 0],
                "constraints": [
                    {"q1": 1, "q2": 1, "a": 0, "b": 0, "operator": "<", "c": 25},
                    {"q1": 0, "q2": 0, "a": 1, "b": 0, "operator": ">=", "c": 0},
                    {"q1": 0, "q2": 0, "a": 0, "b": 1, "operator": ">=", "c": 0},
                ],
            }
        )

        self.assertEqual(result["status"], "unattained")
        self.assertTrue(math.isclose(optimum_value(result), 5, abs_tol=1e-7))

    def test_supports_greater_than_or_equal_outside_circle(self) -> None:
        result = solve(
            {
                "sense": "min",
                "objective": [1, 0],
                "constraints": [
                    {"q1": 1, "q2": 1, "a": 0, "b": 0, "operator": ">=", "c": 25},
                    {"q1": 0, "q2": 0, "a": 1, "b": 0, "operator": ">=", "c": 0},
                    {"q1": 0, "q2": 0, "a": 0, "b": 1, "operator": ">=", "c": 0},
                    {"q1": 0, "q2": 0, "a": 1, "b": 0, "operator": "<=", "c": 6},
                    {"q1": 0, "q2": 0, "a": 0, "b": 1, "operator": "<=", "c": 6},
                ],
            }
        )

        self.assertEqual(result["status"], "optimal")
        self.assertTrue(math.isclose(optimum_value(result), 0, abs_tol=1e-7))
        self.assertTrue(any(math.isclose(candidate["point"][1], 5, abs_tol=1e-7) for candidate in result["candidates"]))

    def test_supports_equality_circle_with_line(self) -> None:
        result = solve(
            {
                "sense": "max",
                "objective": [1, 0],
                "constraints": [
                    {"q1": 1, "q2": 1, "a": 0, "b": 0, "operator": "=", "c": 25},
                    {"q1": 0, "q2": 0, "a": 1, "b": 1, "operator": "=", "c": 7},
                ],
            }
        )

        self.assertEqual(result["status"], "optimal")
        self.assertTrue(math.isclose(optimum_value(result), 4, abs_tol=1e-7))

    def test_supports_strict_greater_than_as_unattained_boundary(self) -> None:
        result = solve(
            {
                "sense": "min",
                "objective": [1, 0],
                "constraints": [
                    {"q1": 0, "q2": 0, "a": 1, "b": 0, "operator": ">", "c": 0},
                    {"q1": 0, "q2": 0, "a": 1, "b": 0, "operator": "<=", "c": 2},
                    {"q1": 0, "q2": 0, "a": 0, "b": 1, "operator": ">=", "c": 0},
                    {"q1": 0, "q2": 0, "a": 0, "b": 1, "operator": "<=", "c": 2},
                ],
            }
        )

        self.assertEqual(result["status"], "unattained")
        self.assertTrue(math.isclose(optimum_value(result), 0, abs_tol=1e-7))

    def test_reports_infeasible_for_disjoint_equalities(self) -> None:
        result = solve(
            {
                "sense": "max",
                "objective": [1, 1],
                "constraints": [
                    {"q1": 1, "q2": 1, "a": 0, "b": 0, "operator": "=", "c": 1},
                    {"q1": 1, "q2": 1, "a": 0, "b": 0, "operator": "=", "c": 4},
                ],
            }
        )

        self.assertEqual(result["status"], "infeasible")


if __name__ == "__main__":
    unittest.main()
