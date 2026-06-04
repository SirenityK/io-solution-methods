export type EditableSimplexProblem = {
  constraints: number[][];
  resources: number[];
  objective: number[];
  decisionVariableNames: string[];
  objectiveName: string;
};
