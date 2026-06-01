#!/usr/bin/env python3
"""
Referencia CLI para resolver Programación Lineal de 2 variables por método gráfico.

Propósito dentro del repo:
- Sirve como script Python de validación matemática para que el agente compare su lógica TS.
- Produce una narración MUY explícita en español (MX), parecida a apuntes humanos.
- Expone pasos estructurados y estados de gráfica para UI dinámica.

Uso rápido:
    python scripts/lp_graphical_reference.py --example
    python scripts/lp_graphical_reference.py --input problem.json
    python scripts/lp_graphical_reference.py --example --json

Formato JSON esperado:
{
  "type": "max",
  "objective": [3, 2],
  "constraints": [
    {"a": 1, "b": 0, "sense": "<=", "c": 4, "label": "x1 <= 4"},
    {"a": 0, "b": 2, "sense": "<=", "c": 12, "label": "2x2 <= 12"},
    {"a": 3, "b": 2, "sense": "<=", "c": 18, "label": "3x1 + 2x2 <= 18"},
    {"a": 1, "b": 0, "sense": ">=", "c": 0, "label": "x1 >= 0"},
    {"a": 0, "b": 1, "sense": ">=", "c": 0, "label": "x2 >= 0"}
  ]
}
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from fractions import Fraction
from itertools import combinations
from pathlib import Path
from typing import Any, Literal

EPS = 1e-9
Point = tuple[float, float]
Sense = Literal["<=", ">=", "=", "<", ">"]
ProblemType = Literal["max", "min"]


@dataclass(frozen=True)
class Constraint:
    a: float
    b: float
    sense: Sense
    c: float
    label: str | None = None

    def boundary_label(self) -> str:
        return f"{fmt_linear(self.a, self.b)} = {fmt_num(self.c)}"

    def original_label(self) -> str:
        return self.label or f"{fmt_linear(self.a, self.b)} {self.sense} {fmt_num(self.c)}"

    def simplified(self) -> Constraint:
        """Simplifica restricciones puramente verticales/horizontales cuando sea natural."""
        if abs(self.a) <= EPS and abs(self.b) <= EPS:
            return self
        # Solo normalizamos x1 o x2 cuando la otra variable no aparece.
        if abs(self.b) <= EPS and abs(self.a) > EPS:
            k = self.c / self.a
            sense = self.sense
            if self.a < 0:
                sense = flip_sense(sense)
            return Constraint(1.0, 0.0, sense, k, f"x1 {sense} {fmt_num(k)}")
        if abs(self.a) <= EPS and abs(self.b) > EPS:
            k = self.c / self.b
            sense = self.sense
            if self.b < 0:
                sense = flip_sense(sense)
            return Constraint(0.0, 1.0, sense, k, f"x2 {sense} {fmt_num(k)}")
        return self

    def value_at(self, p: Point) -> float:
        x1, x2 = p
        return self.a * x1 + self.b * x2

    def contains_closed(self, p: Point) -> bool:
        v = self.value_at(p)
        if self.sense in ("<=", "<"):
            return v <= self.c + 1e-7
        if self.sense in (">=", ">"):
            return v >= self.c - 1e-7
        return abs(v - self.c) <= 1e-7

    def contains_strict(self, p: Point) -> bool:
        v = self.value_at(p)
        if self.sense == "<=":
            return v <= self.c + 1e-7
        if self.sense == "<":
            return v < self.c - 1e-7
        if self.sense == ">=":
            return v >= self.c - 1e-7
        if self.sense == ">":
            return v > self.c + 1e-7
        return abs(v - self.c) <= 1e-7

    def boundary_included(self) -> bool:
        return self.sense in ("<=", ">=", "=")

    def normalized_halfplane(self) -> tuple[float, float, float] | None:
        """Devuelve A x <= c para desigualdades. Las igualdades regresan None."""
        if self.sense in ("<=", "<"):
            return (self.a, self.b, self.c)
        if self.sense in (">=", ">"):
            return (-self.a, -self.b, -self.c)
        return None


@dataclass(frozen=True)
class Objective:
    c1: float
    c2: float
    problem_type: ProblemType

    def value_at(self, p: Point) -> float:
        return self.c1 * p[0] + self.c2 * p[1]

    def improves_along(self, direction: Point) -> bool:
        delta = self.c1 * direction[0] + self.c2 * direction[1]
        if self.problem_type == "max":
            return delta > 1e-8
        return delta < -1e-8


@dataclass
class Vertex:
    name: str
    point: Point
    active_constraints: list[int]
    objective_value: float
    feasible_in_original: bool
    lies_on_strict_boundary: bool


@dataclass
class PlotState:
    title: str
    description: str
    visible_constraints: list[int]
    shade_intersection_up_to: int | None
    highlighted_points: list[str]
    highlighted_segment: tuple[str, str] | None = None


@dataclass
class Solution:
    status: str
    objective: Objective
    constraints: list[Constraint]
    simplified_constraints: list[Constraint]
    steps: list[str]
    plot_states: list[PlotState]
    vertices: list[Vertex]
    optimum_value: float | None
    optimal_vertices: list[str]
    optimal_segment: tuple[str, str] | None
    notes: list[str]


def flip_sense(sense: Sense) -> Sense:
    return {"<=": ">=", ">=": "<=", "<": ">", ">": "<", "=": "="}[sense]  # type: ignore[return-value]


def fmt_num(x: float) -> str:
    if abs(x) <= EPS:
        return "0"
    f = Fraction(x).limit_denominator(1000)
    if abs(float(f) - x) < 1e-9:
        if f.denominator == 1:
            return str(f.numerator)
        return f"{f.numerator}/{f.denominator}"
    return f"{x:.6g}"


def fmt_point(p: Point) -> str:
    return f"({fmt_num(p[0])}, {fmt_num(p[1])})"


def fmt_linear(a: float, b: float) -> str:
    terms: list[str] = []
    if abs(a) > EPS:
        terms.append(fmt_coeff(a, "x1", first=True))
    if abs(b) > EPS:
        terms.append(fmt_coeff(b, "x2", first=not terms))
    return " ".join(terms) if terms else "0"


def fmt_coeff(k: float, var: str, first: bool) -> str:
    sign = "-" if k < 0 else "+"
    mag = abs(k)
    coeff = "" if abs(mag - 1.0) <= EPS else fmt_num(mag)
    raw = f"{coeff}{var}"
    if first:
        return raw if sign == "+" else f"-{raw}"
    return f"{sign} {raw}"


def determinant(a: float, b: float, c: float, d: float) -> float:
    return a * d - b * c


def intersection(c1: Constraint, c2: Constraint) -> Point | None:
    det = determinant(c1.a, c1.b, c2.a, c2.b)
    if abs(det) <= EPS:
        return None
    x = determinant(c1.c, c1.b, c2.c, c2.b) / det
    y = determinant(c1.a, c1.c, c2.a, c2.c) / det
    return (0.0 if abs(x) <= EPS else x, 0.0 if abs(y) <= EPS else y)


def dedupe_points(points: list[Point]) -> list[Point]:
    out: list[Point] = []
    for p in points:
        if not any(math.dist(p, q) <= 1e-7 for q in out):
            out.append(p)
    return out


def point_feasible_closed(point: Point, constraints: list[Constraint]) -> bool:
    return all(c.contains_closed(point) for c in constraints)


def point_feasible_original(point: Point, constraints: list[Constraint]) -> bool:
    return all(c.contains_strict(point) for c in constraints)


def active_constraint_indices(point: Point, constraints: list[Constraint]) -> list[int]:
    return [i for i, c in enumerate(constraints) if abs(c.value_at(point) - c.c) <= 1e-7]


def lies_on_strict_boundary(point: Point, constraints: list[Constraint]) -> bool:
    return any(c.sense in ("<", ">") and abs(c.value_at(point) - c.c) <= 1e-7 for c in constraints)


def line_type(c: Constraint) -> str:
    if abs(c.b) <= EPS and abs(c.a) > EPS:
        return "vertical"
    if abs(c.a) <= EPS and abs(c.b) > EPS:
        return "horizontal"
    return "general"


def intercepts_for(c: Constraint) -> tuple[Point | None, Point | None]:
    x1_zero = None if abs(c.b) <= EPS else (0.0, c.c / c.b)
    x2_zero = None if abs(c.a) <= EPS else (c.c / c.a, 0.0)
    return x1_zero, x2_zero


def feasible_side_sentence(c: Constraint) -> str:
    if c.sense == "=":
        return "Como es igualdad, no se sombrea ningún lado: solamente cuentan los puntos exactamente sobre la línea."
    kind = line_type(c)
    if kind == "vertical":
        k = c.c / c.a
        if c.a < 0:
            sense = flip_sense(c.sense)
        else:
            sense = c.sense
        if sense in ("<=", "<"):
            side = "a la izquierda"
        else:
            side = "a la derecha"
        return f"Como la restricción es x1 {sense} {fmt_num(k)}, la zona válida queda {side} de la línea."
    if kind == "horizontal":
        k = c.c / c.b
        if c.b < 0:
            sense = flip_sense(c.sense)
        else:
            sense = c.sense
        if sense in ("<=", "<"):
            side = "debajo"
        else:
            side = "arriba"
        return f"Como la restricción es x2 {sense} {fmt_num(k)}, la zona válida queda {side} de la línea."
    test = choose_test_point(c)
    truth = c.contains_strict(test) if c.sense in ("<", ">") else c.contains_closed(test)
    result = "sí cumple" if truth else "no cumple"
    side = "el lado donde está ese punto" if truth else "el lado contrario a ese punto"
    return (
        f"Para saber qué lado se toma, probamos el punto {fmt_point(test)}: "
        f"{fmt_linear(c.a, c.b)} = {fmt_num(c.value_at(test))}. "
        f"Ese punto {result} la desigualdad; por lo tanto, se toma {side}."
    )


def choose_test_point(c: Constraint) -> Point:
    for p in [(0.0, 0.0), (1.0, 0.0), (0.0, 1.0), (1.0, 1.0), (-1.0, 0.0), (0.0, -1.0)]:
        if abs(c.value_at(p) - c.c) > 1e-7:
            return p
    return (2.0, 3.0)


def recession_directions(constraints: list[Constraint]) -> list[Point]:
    """Muestra direcciones unitarias candidatas del cono de recesión."""
    angles = [0.0, math.pi / 2, math.pi, 3 * math.pi / 2]
    for c in constraints:
        if abs(c.a) > EPS or abs(c.b) > EPS:
            theta = math.atan2(c.b, c.a)
            angles.extend([theta, theta + math.pi, theta + math.pi / 2, theta - math.pi / 2])
    # También puntos medios entre ángulos ordenados para detectar interiores de conos.
    normalized = sorted({round((a % (2 * math.pi)), 12) for a in angles})
    mids: list[float] = []
    for i, a in enumerate(normalized):
        b = normalized[(i + 1) % len(normalized)]
        if i == len(normalized) - 1:
            b += 2 * math.pi
        mids.append(((a + b) / 2) % (2 * math.pi))
    all_angles = normalized + mids
    dirs = [(math.cos(a), math.sin(a)) for a in all_angles]
    return dedupe_points(dirs)


def direction_respects_recession(d: Point, constraints: list[Constraint]) -> bool:
    dx, dy = d
    for c in constraints:
        delta = c.a * dx + c.b * dy
        if c.sense in ("<=", "<") and delta > 1e-8:
            return False
        if c.sense in (">=", ">") and delta < -1e-8:
            return False
        if c.sense == "=" and abs(delta) > 1e-8:
            return False
    return True


def has_improving_recession_direction(obj: Objective, constraints: list[Constraint]) -> Point | None:
    for d in recession_directions(constraints):
        if direction_respects_recession(d, constraints) and obj.improves_along(d):
            return d
    return None


def find_vertices(constraints: list[Constraint], obj: Objective) -> list[Vertex]:
    raw: list[Point] = []
    for i, j in combinations(range(len(constraints)), 2):
        p = intersection(constraints[i], constraints[j])
        if p is not None and point_feasible_closed(p, constraints):
            raw.append(p)
    points = dedupe_points(raw)
    # Orden geométrico: alrededor del centroide, parecido al orden A, B, C, D de una gráfica.
    if points:
        cx = sum(p[0] for p in points) / len(points)
        cy = sum(p[1] for p in points) / len(points)
        points.sort(key=lambda p: math.atan2(p[1] - cy, p[0] - cx))
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    vertices: list[Vertex] = []
    for idx, p in enumerate(points):
        name = letters[idx] if idx < len(letters) else f"P{idx + 1}"
        vertices.append(
            Vertex(
                name=name,
                point=p,
                active_constraints=active_constraint_indices(p, constraints),
                objective_value=obj.value_at(p),
                feasible_in_original=point_feasible_original(p, constraints),
                lies_on_strict_boundary=lies_on_strict_boundary(p, constraints),
            )
        )
    return vertices


def find_feasible_sample(constraints: list[Constraint]) -> Point | None:
    candidates: list[Point] = [(0.0, 0.0), (1.0, 1.0), (-1.0, 1.0), (1.0, -1.0), (-1.0, -1.0)]
    for i, j in combinations(range(len(constraints)), 2):
        p = intersection(constraints[i], constraints[j])
        if p is not None:
            candidates.append(p)
            # Add tiny nudges around intersections for strict inequalities.
            for dx in (-1e-4, 0.0, 1e-4):
                for dy in (-1e-4, 0.0, 1e-4):
                    candidates.append((p[0] + dx, p[1] + dy))
    # Small deterministic grid to catch simple halfplanes/rays without vertices.
    for x in range(-10, 11):
        for y in range(-10, 11):
            candidates.append((float(x), float(y)))
    for p in dedupe_points(candidates):
        if point_feasible_original(p, constraints):
            return p
    return None


def optimal_segment(vertices: list[Vertex], opt_names: list[str]) -> tuple[str, str] | None:
    if len(opt_names) < 2:
        return None
    valid = [v for v in vertices if v.name in opt_names]
    # For a polygon ordered around the centroid, adjacent equal optimal vertices define an optimal edge.
    names = [v.name for v in vertices]
    for a, b in zip(valid, valid[1:]):
        ia, ib = names.index(a.name), names.index(b.name)
        if abs(ia - ib) == 1 or abs(ia - ib) == len(names) - 1:
            return (a.name, b.name)
    return (valid[0].name, valid[1].name)


def solve(problem_type: ProblemType, objective_coeffs: list[float], constraints_in: list[Constraint]) -> Solution:
    obj = Objective(objective_coeffs[0], objective_coeffs[1], problem_type)
    constraints = [c.simplified() for c in constraints_in]
    steps: list[str] = []
    notes: list[str] = []
    plot_states: list[PlotState] = []

    steps.append("## 1. Planteamiento del problema\n")
    verb = "Maximizar" if problem_type == "max" else "Minimizar"
    steps.append(f"{verb}:\n\nZ = {fmt_linear(obj.c1, obj.c2)}\n")
    steps.append("Sujeto a:")
    for c in constraints_in:
        steps.append(f"- {c.original_label()}")

    steps.append("\n## 2. Simplificación de restricciones\n")
    for original, simplified in zip(constraints_in, constraints):
        if original.original_label() != simplified.original_label():
            steps.append(
                f"La restricción `{original.original_label()}` se puede simplificar a `{simplified.original_label()}`."
            )
        else:
            steps.append(f"La restricción `{original.original_label()}` se deja igual.")

    steps.append("\n## 3. Conversión de restricciones a líneas de frontera\n")
    plot_states.append(
        PlotState(
            title="Plano vacío",
            description="Primero se prepara el plano cartesiano con los ejes x1 y x2. Todavía no se dibuja ninguna restricción.",
            visible_constraints=[],
            shade_intersection_up_to=None,
            highlighted_points=[],
        )
    )

    for idx, c in enumerate(constraints):
        steps.append(f"\n### Restricción {idx + 1}: {c.original_label()}\n")
        steps.append(f"La línea de frontera se obtiene cambiando la restricción por igualdad:\n\n{c.boundary_label()}\n")
        kind = line_type(c)
        if kind == "vertical":
            k = c.c / c.a
            steps.append(
                f"Esta es una línea vertical, porque x1 queda fijo en {fmt_num(k)} y x2 puede tomar varios valores."
            )
        elif kind == "horizontal":
            k = c.c / c.b
            steps.append(
                f"Esta es una línea horizontal, porque x2 queda fijo en {fmt_num(k)} y x1 puede tomar varios valores."
            )
        else:
            p_y, p_x = intercepts_for(c)
            steps.append("Para dibujarla, buscamos sus intersecciones con los ejes.")
            if p_y is not None:
                steps.append(
                    f"Si x1 = 0, entonces {fmt_linear(c.a, c.b)} = {fmt_num(c.c)} da el punto {fmt_point(p_y)}."
                )
            if p_x is not None:
                steps.append(
                    f"Si x2 = 0, entonces {fmt_linear(c.a, c.b)} = {fmt_num(c.c)} da el punto {fmt_point(p_x)}."
                )
            if p_y and p_x:
                steps.append(f"Con los puntos {fmt_point(p_y)} y {fmt_point(p_x)} se traza la recta.")
        steps.append(feasible_side_sentence(c))
        line_style = "continua" if c.boundary_included() else "punteada"
        steps.append(f"En la gráfica esta frontera se dibuja como línea {line_style}.")
        plot_states.append(
            PlotState(
                title=f"Se agrega la restricción {idx + 1}",
                description=(
                    f"Se dibuja `{c.boundary_label()}` y se marca la zona que cumple `{c.original_label()}`. "
                    f"Después se actualiza la intersección con las restricciones anteriores."
                ),
                visible_constraints=list(range(idx + 1)),
                shade_intersection_up_to=idx,
                highlighted_points=[],
            )
        )

    feasible_sample = find_feasible_sample(constraints)
    if feasible_sample is None:
        steps.append("\n## 4. Región factible\n")
        steps.append(
            "Al combinar todas las restricciones, no se encontró ningún punto que cumpla todas las condiciones. "
            "Por lo tanto, no existe región factible."
        )
        plot_states.append(
            PlotState(
                title="Sin región factible",
                description="Las zonas válidas de las restricciones no tienen intersección común.",
                visible_constraints=list(range(len(constraints))),
                shade_intersection_up_to=len(constraints) - 1 if constraints else None,
                highlighted_points=[],
            )
        )
        return Solution("infeasible", obj, constraints_in, constraints, steps, plot_states, [], None, [], None, notes)

    steps.append("\n## 4. Región factible\n")
    steps.append(
        "La región factible se obtiene tomando solamente los puntos que cumplen todas las restricciones al mismo tiempo."
    )
    steps.append(
        f"Como verificación, el punto {fmt_point(feasible_sample)} cumple las restricciones, así que sí existe región factible."
    )

    vertices = find_vertices(constraints, obj)
    improving_dir = has_improving_recession_direction(obj, constraints)
    if improving_dir is not None:
        status = "unbounded"
        steps.append("\n## 5. Revisión de acotamiento\n")
        steps.append(
            "La región factible continúa infinitamente en una dirección que mejora la función objetivo."
        )
        steps.append(
            f"Una dirección de mejora aproximada es d = {fmt_point(improving_dir)}. "
            "Si se avanza por esa dirección sin salir de la región factible, el valor de Z mejora sin límite."
        )
        if problem_type == "max":
            steps.append("Por lo tanto, el problema no tiene máximo finito.")
        else:
            steps.append("Por lo tanto, el problema no tiene mínimo finito.")
        plot_states.append(
            PlotState(
                title="Región factible no acotada",
                description="Se dibuja la región factible con flechas indicando que continúa al infinito en una dirección que mejora Z.",
                visible_constraints=list(range(len(constraints))),
                shade_intersection_up_to=len(constraints) - 1 if constraints else None,
                highlighted_points=[v.name for v in vertices],
            )
        )
        return Solution(status, obj, constraints_in, constraints, steps, plot_states, vertices, None, [], None, notes)

    steps.append("\n## 5. Puntos esquina de la región factible\n")
    if not vertices:
        steps.append(
            "No se encontraron vértices por intersección de fronteras. Esto puede pasar si la región es una recta/rayo o si faltan suficientes restricciones para formar esquinas."
        )
    else:
        steps.append("Ahora se revisan las intersecciones de las líneas de frontera y se conservan solamente las que cumplen todas las restricciones.")
        for v in vertices:
            active = ", ".join(str(i + 1) for i in v.active_constraints)
            strict_note = " Está sobre una frontera estricta, así que no pertenece al problema original." if v.lies_on_strict_boundary else ""
            steps.append(f"Punto {v.name}: {fmt_point(v.point)}. Sale de la(s) restricción(es) {active}.{strict_note}")

    plot_states.append(
        PlotState(
            title="Vértices candidatos",
            description="Se marcan con letras A, B, C, ... los puntos esquina que sí pertenecen a la región factible cerrada.",
            visible_constraints=list(range(len(constraints))),
            shade_intersection_up_to=len(constraints) - 1 if constraints else None,
            highlighted_points=[v.name for v in vertices],
        )
    )

    usable_vertices = [v for v in vertices if v.feasible_in_original]
    closure_only_vertices = [v for v in vertices if not v.feasible_in_original]
    if closure_only_vertices:
        names = ", ".join(v.name for v in closure_only_vertices)
        notes.append(
            f"Los puntos {names} pertenecen a la cerradura de la región, pero no al problema original por restricciones estrictas."
        )

    if not usable_vertices:
        steps.append("\n## 6. Evaluación de la función objetivo\n")
        steps.append(
            "No hay puntos esquina incluidos que puedan evaluarse como solución alcanzada. "
            "Si hay restricciones estrictas, puede existir un supremo o ínfimo que se aproxima pero no se alcanza."
        )
        return Solution("no_attained_vertex", obj, constraints_in, constraints, steps, plot_states, vertices, None, [], None, notes)

    steps.append("\n## 6. Evaluación de la función objetivo\n")
    steps.append("Se prueba cada punto esquina en la función objetivo.")
    steps.append("\n| Punto | Coordenadas | Valor de Z |\n|---|---:|---:|")
    for v in usable_vertices:
        steps.append(f"| {v.name} | {fmt_point(v.point)} | {fmt_num(v.objective_value)} |")

    values = [v.objective_value for v in usable_vertices]
    opt_value = max(values) if problem_type == "max" else min(values)
    opt_vertices = [v for v in usable_vertices if abs(v.objective_value - opt_value) <= 1e-7]
    opt_names = [v.name for v in opt_vertices]
    seg = optimal_segment(vertices, opt_names)

    if len(opt_vertices) == 1:
        v = opt_vertices[0]
        word = "máximo" if problem_type == "max" else "mínimo"
        steps.append(
            f"\nEl valor {word} es Z = {fmt_num(opt_value)} y ocurre en el punto {v.name} = {fmt_point(v.point)}."
        )
    else:
        word = "máximo" if problem_type == "max" else "mínimo"
        steps.append(f"\nEl valor {word} es Z = {fmt_num(opt_value)}.")
        steps.append(f"Este valor aparece en más de un punto: {', '.join(opt_names)}.")
        if seg is not None:
            a = next(v for v in vertices if v.name == seg[0])
            b = next(v for v in vertices if v.name == seg[1])
            steps.append(
                "Como la función objetivo es lineal, si dos vértices conectados tienen el mismo valor óptimo, "
                "todo el segmento entre ellos también es óptimo."
            )
            steps.append(f"Segmento óptimo: de {seg[0]} = {fmt_point(a.point)} a {seg[1]} = {fmt_point(b.point)}.")

    plot_states.append(
        PlotState(
            title="Solución óptima",
            description="Se resalta el punto óptimo o el segmento óptimo cuando hay soluciones múltiples.",
            visible_constraints=list(range(len(constraints))),
            shade_intersection_up_to=len(constraints) - 1 if constraints else None,
            highlighted_points=opt_names,
            highlighted_segment=seg,
        )
    )

    return Solution("optimal", obj, constraints_in, constraints, steps, plot_states, vertices, opt_value, opt_names, seg, notes)


def example_problem() -> tuple[ProblemType, list[float], list[Constraint]]:
    return (
        "max",
        [3.0, 2.0],
        [
            Constraint(1.0, 0.0, "<=", 4.0, "x1 <= 4"),
            Constraint(0.0, 2.0, "<=", 12.0, "2x2 <= 12"),
            Constraint(3.0, 2.0, "<=", 18.0, "3x1 + 2x2 <= 18"),
            Constraint(1.0, 0.0, ">=", 0.0, "x1 >= 0"),
            Constraint(0.0, 1.0, ">=", 0.0, "x2 >= 0"),
        ],
    )


def parse_problem(data: dict[str, Any]) -> tuple[ProblemType, list[float], list[Constraint]]:
    ptype = data.get("type", "max")
    if ptype not in ("max", "min"):
        raise ValueError("El campo 'type' debe ser 'max' o 'min'.")
    objective = data.get("objective")
    if not isinstance(objective, list) or len(objective) != 2:
        raise ValueError("El campo 'objective' debe ser una lista [c1, c2].")
    constraints_raw = data.get("constraints")
    if not isinstance(constraints_raw, list) or not constraints_raw:
        raise ValueError("El campo 'constraints' debe ser una lista no vacía.")
    constraints: list[Constraint] = []
    for idx, raw in enumerate(constraints_raw, start=1):
        try:
            sense = raw["sense"]
            if sense not in ("<=", ">=", "=", "<", ">"):
                raise ValueError
            constraints.append(
                Constraint(
                    a=float(raw["a"]),
                    b=float(raw["b"]),
                    sense=sense,
                    c=float(raw["c"]),
                    label=raw.get("label"),
                )
            )
        except Exception as exc:  # noqa: BLE001 - CLI reference script: report friendly row error.
            raise ValueError(f"Restricción inválida en posición {idx}: {raw}") from exc
    return ptype, [float(objective[0]), float(objective[1])], constraints


def solution_to_jsonable(solution: Solution) -> dict[str, Any]:
    data = asdict(solution)
    data["objective"] = asdict(solution.objective)
    return data


def print_markdown(solution: Solution) -> None:
    print("# Solución por método gráfico\n")
    for step in solution.steps:
        print(step)
    if solution.notes:
        print("\n## Notas importantes\n")
        for note in solution.notes:
            print(f"- {note}")
    print("\n## Estados sugeridos para la gráfica\n")
    for i, state in enumerate(solution.plot_states, start=1):
        print(f"\n### Gráfica {i}: {state.title}")
        print(state.description)
        if state.visible_constraints:
            visible = ", ".join(str(x + 1) for x in state.visible_constraints)
            print(f"Restricciones visibles: {visible}")
        if state.highlighted_points:
            print(f"Puntos resaltados: {', '.join(state.highlighted_points)}")
        if state.highlighted_segment:
            print(f"Segmento resaltado: {state.highlighted_segment[0]}-{state.highlighted_segment[1]}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Referencia CLI para PL de 2 variables por método gráfico.")
    parser.add_argument("--example", action="store_true", help="Usa el ejemplo de las imágenes: max Z = 3x1 + 2x2.")
    parser.add_argument("--input", type=Path, help="Ruta a un JSON con el problema.")
    parser.add_argument("--json", action="store_true", help="Imprime salida estructurada JSON en vez de Markdown.")
    args = parser.parse_args()

    if args.example:
        ptype, objective, constraints = example_problem()
    elif args.input:
        ptype, objective, constraints = parse_problem(json.loads(args.input.read_text(encoding="utf-8")))
    else:
        parser.error("Usa --example o --input problem.json")

    solution = solve(ptype, objective, constraints)
    if args.json:
        print(json.dumps(solution_to_jsonable(solution), ensure_ascii=False, indent=2))
    else:
        print_markdown(solution)


if __name__ == "__main__":
    main()
