#!/usr/bin/env python3
"""Referencia CLI para programación no lineal gráfica de 2 variables.

El alcance intencional coincide con la primera versión TypeScript del sitio:
objetivo lineal y restricciones cuadráticas diagonales sin término cruzado.
Cada restricción tiene la forma:

    q1*x1^2 + q2*x2^2 + a*x1 + b*x2 (<=, >=, =, <, >) c

Uso rápido:
    python scripts/nonlinear_graphical_reference.py --example
    python scripts/nonlinear_graphical_reference.py --example --json
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from fractions import Fraction
from itertools import combinations
from typing import Literal

EPS = 1e-9
FEAS_EPS = 1e-7
Operator = Literal["<=", ">=", "=", "<", ">"]
Sense = Literal["max", "min"]
Point = tuple[float, float]


@dataclass(frozen=True)
class Constraint:
    q1: float
    q2: float
    a: float
    b: float
    operator: Operator
    c: float
    label: str | None = None

    def value_at(self, point: Point) -> float:
        x1, x2 = point
        return self.q1 * x1 * x1 + self.q2 * x2 * x2 + self.a * x1 + self.b * x2

    def residual_at(self, point: Point) -> float:
        return self.value_at(point) - self.c

    def contains_closed(self, point: Point) -> bool:
        residual = self.residual_at(point)
        if self.operator in ("<=", "<"):
            return residual <= FEAS_EPS
        if self.operator in (">=", ">"):
            return residual >= -FEAS_EPS
        return abs(residual) <= FEAS_EPS

    def contains_original(self, point: Point) -> bool:
        residual = self.residual_at(point)
        if self.operator == "<=":
            return residual <= FEAS_EPS
        if self.operator == ">=":
            return residual >= -FEAS_EPS
        if self.operator == "=":
            return abs(residual) <= FEAS_EPS
        if self.operator == "<":
            return residual < -FEAS_EPS
        return residual > FEAS_EPS

    def boundary_included(self) -> bool:
        return self.operator in ("<=", ">=", "=")

    def is_linear(self) -> bool:
        return abs(self.q1) <= EPS and abs(self.q2) <= EPS


@dataclass(frozen=True)
class Candidate:
    name: str
    point: Point
    active_constraints: list[int]
    objective_value: float
    included: bool


def fmt_num(value: float) -> str:
    if abs(value) <= EPS:
        return "0"
    fraction = Fraction(value).limit_denominator(1000)
    if abs(float(fraction) - value) <= 1e-9:
        if fraction.denominator == 1:
            return str(fraction.numerator)
        return f"{fraction.numerator}/{fraction.denominator}"
    return f"{value:.6g}"


def fmt_point(point: Point) -> str:
    return f"({fmt_num(point[0])}, {fmt_num(point[1])})"


def objective_at(objective: tuple[float, float], point: Point) -> float:
    return objective[0] * point[0] + objective[1] * point[1]


def dedupe(points: list[Point]) -> list[Point]:
    out: list[Point] = []
    for point in points:
        if math.isfinite(point[0]) and math.isfinite(point[1]) and not any(math.dist(point, other) <= 1e-7 for other in out):
            out.append((0.0 if abs(point[0]) <= EPS else point[0], 0.0 if abs(point[1]) <= EPS else point[1]))
    return out


def solve_quadratic(a: float, b: float, c: float) -> list[float]:
    if abs(a) <= EPS:
        if abs(b) <= EPS:
            return []
        return [-c / b]
    disc = b * b - 4 * a * c
    if disc < -FEAS_EPS:
        return []
    if abs(disc) <= FEAS_EPS:
        return [-b / (2 * a)]
    root = math.sqrt(max(0.0, disc))
    return [(-b - root) / (2 * a), (-b + root) / (2 * a)]


def linear_intersection(first: Constraint, second: Constraint) -> list[Point]:
    det = first.a * second.b - first.b * second.a
    if abs(det) <= EPS:
        return []
    x1 = (first.c * second.b - first.b * second.c) / det
    x2 = (first.a * second.c - first.c * second.a) / det
    return [(x1, x2)]


def line_quadratic_intersections(linear: Constraint, quadratic: Constraint) -> list[Point]:
    if abs(linear.a) > abs(linear.b):
        # x1 = (c - b*x2) / a
        alpha = linear.c / linear.a
        beta = -linear.b / linear.a
        qa = quadratic.q1 * beta * beta + quadratic.q2
        qb = 2 * quadratic.q1 * alpha * beta + quadratic.a * beta + quadratic.b
        qc = quadratic.q1 * alpha * alpha + quadratic.a * alpha - quadratic.c
        return [(alpha + beta * x2, x2) for x2 in solve_quadratic(qa, qb, qc)]
    if abs(linear.b) <= EPS:
        return []
    alpha = linear.c / linear.b
    beta = -linear.a / linear.b
    qa = quadratic.q1 + quadratic.q2 * beta * beta
    qb = 2 * quadratic.q2 * alpha * beta + quadratic.a + quadratic.b * beta
    qc = quadratic.q2 * alpha * alpha + quadratic.b * alpha - quadratic.c
    return [(x1, alpha + beta * x1) for x1 in solve_quadratic(qa, qb, qc)]


def pair_intersections(first: Constraint, second: Constraint) -> list[Point]:
    if first.is_linear() and second.is_linear():
        return linear_intersection(first, second)
    if first.is_linear():
        return line_quadratic_intersections(first, second)
    if second.is_linear():
        return line_quadratic_intersections(second, first)

    diff = Constraint(
        q1=first.q1 - second.q1,
        q2=first.q2 - second.q2,
        a=first.a - second.a,
        b=first.b - second.b,
        operator="=",
        c=first.c - second.c,
    )
    if diff.is_linear() and (abs(diff.a) > EPS or abs(diff.b) > EPS):
        return line_quadratic_intersections(diff, first)
    return []


def axis_intersections(constraint: Constraint) -> list[Point]:
    points: list[Point] = []
    for x1 in solve_quadratic(constraint.q1, constraint.a, -constraint.c):
        points.append((x1, 0.0))
    for x2 in solve_quadratic(constraint.q2, constraint.b, -constraint.c):
        points.append((0.0, x2))
    return points


def objective_tangent_points(constraint: Constraint, objective: tuple[float, float]) -> list[Point]:
    if constraint.is_linear() or constraint.q1 <= EPS or constraint.q2 <= EPS:
        return []
    center = (-constraint.a / (2 * constraint.q1), -constraint.b / (2 * constraint.q2))
    radius_term = constraint.c + constraint.a * constraint.a / (4 * constraint.q1) + constraint.b * constraint.b / (4 * constraint.q2)
    if radius_term < -FEAS_EPS:
        return []
    weighted_norm = objective[0] * objective[0] / constraint.q1 + objective[1] * objective[1] / constraint.q2
    if weighted_norm <= EPS:
        return []
    scale = math.sqrt(max(0.0, radius_term) / weighted_norm)
    direction = (objective[0] / constraint.q1, objective[1] / constraint.q2)
    return [
        (center[0] + scale * direction[0], center[1] + scale * direction[1]),
        (center[0] - scale * direction[0], center[1] - scale * direction[1]),
    ]


def candidate_points(constraints: list[Constraint], objective: tuple[float, float]) -> list[Point]:
    points: list[Point] = [(0.0, 0.0)]
    for constraint in constraints:
        points.extend(axis_intersections(constraint))
        points.extend(objective_tangent_points(constraint, objective))
    for first, second in combinations(constraints, 2):
        points.extend(pair_intersections(first, second))
    return dedupe(points)


def feasible_sample(constraints: list[Constraint], candidates: list[Point]) -> Point | None:
    probes: list[Point] = list(candidates)
    for point in candidates:
        for dx in (-1e-4, 0.0, 1e-4):
            for dy in (-1e-4, 0.0, 1e-4):
                probes.append((point[0] + dx, point[1] + dy))
    for x in [value / 2 for value in range(-20, 21)]:
        for y in [value / 2 for value in range(-20, 21)]:
            probes.append((x, y))
    for point in dedupe(probes):
        if all(constraint.contains_original(point) for constraint in constraints):
            return point
    return None


def objective_improvement(objective: tuple[float, float], sense: Sense, direction: Point) -> float:
    value = objective[0] * direction[0] + objective[1] * direction[1]
    return value if sense == "max" else -value


def normalize(direction: Point) -> Point | None:
    length = math.hypot(direction[0], direction[1])
    if length <= EPS:
        return None
    return (direction[0] / length, direction[1] / length)


def asymptotically_satisfies(constraint: Constraint, base: Point, direction: Point) -> bool:
    quadratic = constraint.q1 * direction[0] ** 2 + constraint.q2 * direction[1] ** 2
    linear = (
        2 * constraint.q1 * base[0] * direction[0]
        + 2 * constraint.q2 * base[1] * direction[1]
        + constraint.a * direction[0]
        + constraint.b * direction[1]
    )
    constant = constraint.residual_at(base)
    if constraint.operator in ("<=", "<"):
        if quadratic < -EPS:
            return True
        if quadratic > EPS:
            return False
        if linear < -EPS:
            return True
        if linear > EPS:
            return False
        return constant < -FEAS_EPS if constraint.operator == "<" else constant <= FEAS_EPS
    if constraint.operator in (">=", ">"):
        if quadratic > EPS:
            return True
        if quadratic < -EPS:
            return False
        if linear > EPS:
            return True
        if linear < -EPS:
            return False
        return constant > FEAS_EPS if constraint.operator == ">" else constant >= -FEAS_EPS
    return abs(quadratic) <= EPS and abs(linear) <= EPS and abs(constant) <= FEAS_EPS


def unbounded_directions(objective: tuple[float, float], constraints: list[Constraint]) -> list[Point]:
    directions: list[Point] = []
    objective_direction = normalize(objective)
    if objective_direction is not None:
        directions.extend([objective_direction, (-objective_direction[0], -objective_direction[1])])
    for constraint in constraints:
        if constraint.is_linear():
            perpendicular = normalize((constraint.b, -constraint.a))
            if perpendicular is not None:
                directions.extend([perpendicular, (-perpendicular[0], -perpendicular[1])])
    for degrees in range(0, 360, 5):
        radians = math.radians(degrees)
        directions.append((math.cos(radians), math.sin(radians)))
    return directions


def is_unbounded(problem: dict, constraints: list[Constraint], sample: Point) -> bool:
    sense: Sense = problem["sense"]
    objective = tuple(problem["objective"])
    return any(
        objective_improvement(objective, sense, direction) > EPS
        and all(asymptotically_satisfies(constraint, sample, direction) for constraint in constraints)
        for direction in unbounded_directions(objective, constraints)
    )


def solve(problem: dict) -> dict:
    sense: Sense = problem["sense"]
    objective = tuple(problem["objective"])
    constraints = [Constraint(**item) for item in problem["constraints"]]
    raw = candidate_points(constraints, objective)
    sample = feasible_sample(constraints, raw)

    candidates: list[Candidate] = []
    for index, point in enumerate(point for point in raw if all(c.contains_closed(point) for c in constraints)):
        active = [i for i, c in enumerate(constraints) if abs(c.residual_at(point)) <= FEAS_EPS]
        candidates.append(
            Candidate(
                name=chr(ord("A") + index),
                point=point,
                active_constraints=active,
                objective_value=objective_at(objective, point),
                included=all(c.contains_original(point) for c in constraints),
            )
        )

    if sample is None:
        status = "infeasible"
        optimum = None
    elif is_unbounded(problem, constraints, sample):
        status = "unbounded"
        optimum = None
    elif not candidates:
        status = "no-attained-candidate"
        optimum = None
    else:
        best_value = max(c.objective_value for c in candidates) if sense == "max" else min(c.objective_value for c in candidates)
        best = [c for c in candidates if abs(c.objective_value - best_value) <= FEAS_EPS]
        included_best = [c for c in best if c.included]
        status = "optimal" if included_best else "unattained"
        optimum = {"value": best_value, "points": [asdict(c) for c in (included_best or best)]}

    steps = [
        "Se escribe la función objetivo lineal y las restricciones cuadráticas.",
        "Se toman las fronteras cambiando cada relación por igualdad.",
        "Se calculan intersecciones entre ejes, rectas y curvas cuadráticas.",
        "Se agregan puntos de tangencia donde la función objetivo toca una curva suave.",
        "Se filtran los puntos que cumplen todas las restricciones y se evalúa Z.",
    ]
    return {
        "status": status,
        "objective": objective,
        "constraints": [asdict(c) for c in constraints],
        "candidates": [asdict(c) for c in candidates],
        "optimum": optimum,
        "feasible_sample": sample,
        "steps": steps,
    }


EXAMPLE = {
    "sense": "max",
    "objective": [4, 2],
    "constraints": [
        {"q1": 0, "q2": 0, "a": 1, "b": 1, "operator": "<=", "c": 6, "label": "x1 + x2 <= 6"},
        {"q1": 1, "q2": 1, "a": 0, "b": 0, "operator": "<=", "c": 25, "label": "x1^2 + x2^2 <= 25"},
        {"q1": 0, "q2": 0, "a": 1, "b": 0, "operator": ">=", "c": 0, "label": "x1 >= 0"},
        {"q1": 0, "q2": 0, "a": 0, "b": 1, "operator": ">=", "c": 0, "label": "x2 >= 0"},
    ],
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--example", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    if not args.example:
        raise SystemExit("Use --example for now")
    result = solve(EXAMPLE)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return
    print("Programación no lineal gráfica")
    for step in result["steps"]:
        print(f"- {step}")
    print("\nCandidatos factibles en la cerradura:")
    for candidate in result["candidates"]:
        print(f"{candidate['name']} = {fmt_point(tuple(candidate['point']))}, Z = {fmt_num(candidate['objective_value'])}")
    if result["optimum"]:
        point = result["optimum"]["points"][0]
        print(f"\nÓptimo: {fmt_point(tuple(point['point']))}, Z = {fmt_num(result['optimum']['value'])}")


if __name__ == "__main__":
    main()
