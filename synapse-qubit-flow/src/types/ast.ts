export interface Position {
  line: number;
  column: number;
}

export interface ASTNode {
  type: string;
  position: Position;
}

export interface Program extends ASTNode {
  type: 'Program';
  body: Statement[];
}

export interface Statement extends ASTNode {}

export interface Expression extends ASTNode {}

export interface CircuitDefinition extends Statement {
  type: 'CircuitDefinition';
  name: string;
  qubits: number;
  parameters: Parameter[];
  body: GateOperation[];
}

export interface Parameter {
  name: string;
  type: 'angle' | 'integer' | 'real';
  defaultValue?: number;
}

export interface GateOperation extends Statement {
  type: 'GateOperation';
  gate: string;
  qubits: number[];
  parameters?: Expression[];
}

export interface MeasureOperation extends Statement {
  type: 'MeasureOperation';
  qubits: number[];
  classical?: string[];
}

export interface VQEAlgorithm extends Statement {
  type: 'VQEAlgorithm';
  ansatz: CircuitDefinition;
  hamiltonian: HamiltonianExpression;
  optimizer: OptimizerConfig;
}

export interface QAOAAlgorithm extends Statement {
  type: 'QAOAAlgorithm';
  problem: ProblemGraph;
  layers: number;
  mixer?: CircuitDefinition;
}

export interface HamiltonianExpression extends Expression {
  type: 'HamiltonianExpression';
  terms: PauliTerm[];
}

export interface PauliTerm {
  coefficient: number;
  operators: { qubit: number; pauli: 'I' | 'X' | 'Y' | 'Z' }[];
}

export interface ProblemGraph {
  nodes: number[];
  edges: { from: number; to: number; weight: number }[];
}

export interface OptimizerConfig {
  type: 'COBYLA' | 'SPSA' | 'ADAM';
  maxIterations: number;
  tolerance?: number;
}

export interface BackendConfig extends Statement {
  type: 'BackendConfig';
  provider: 'IBM' | 'IonQ' | 'AWS' | 'Simulator';
  device?: string;
  shots: number;
  optimization?: boolean;
}