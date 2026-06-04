import type { ReadonlyDeep } from "type-fest";

export type NumericMatrix = ReadonlyDeep<readonly (readonly number[])[]>;

export type MutableMatrix = number[][];

export type MutableBooleanMatrix = boolean[][];

export type MatrixPosition = Readonly<{
  row: number;
  column: number;
}>;

export type AlgorithmStep = Readonly<{
  title: string;
  description: string;
  data?: Readonly<Record<string, unknown>>;
}>;

export type OptimizationDirection = "max" | "min";
