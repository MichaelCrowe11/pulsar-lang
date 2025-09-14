export enum TokenType {
  // Literals
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',

  // Keywords
  CONTRACT = 'CONTRACT',
  FUNCTION = 'FUNCTION',
  CIRCUIT = 'CIRCUIT',
  MODIFIER = 'MODIFIER',
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
  PURE = 'PURE',
  VIEW = 'VIEW',
  MPC = 'MPC',
  
  // Types
  FIELD = 'FIELD',
  UINT256 = 'UINT256',
  BYTES32 = 'BYTES32',
  BOOL = 'BOOL',
  ADDRESS = 'ADDRESS',
  HASH = 'HASH',
  SIGNATURE = 'SIGNATURE',
  PROOF = 'PROOF',
  COMMITMENT = 'COMMITMENT',
  SECRET = 'SECRET',
  WITNESS = 'WITNESS',
  CONSTRAINT = 'CONSTRAINT',
  
  // Control flow
  IF = 'IF',
  ELSE = 'ELSE',
  FOR = 'FOR',
  WHILE = 'WHILE',
  RETURN = 'RETURN',
  REQUIRE = 'REQUIRE',
  
  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  MODULO = 'MODULO',
  ASSIGN = 'ASSIGN',
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN = 'GREATER_THAN',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  
  // Delimiters
  SEMICOLON = 'SEMICOLON',
  COMMA = 'COMMA',
  DOT = 'DOT',
  ARROW = 'ARROW',
  
  // Brackets
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  
  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
  WHITESPACE = 'WHITESPACE',
  COMMENT = 'COMMENT'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export interface Position {
  line: number;
  column: number;
}

export abstract class ASTNode {
  abstract accept<T>(visitor: ASTVisitor<T>): T;
}

export interface ASTVisitor<T> {
  visitProgram(node: Program): T;
  visitContract(node: Contract): T;
  visitFunction(node: FunctionDecl): T;
  visitCircuit(node: Circuit): T;
  visitStatement(node: Statement): T;
  visitExpression(node: Expression): T;
  visitType(node: TypeNode): T;
}

export class Program extends ASTNode {
  constructor(public contracts: Contract[]) {
    super();
  }
  
  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitProgram(this);
  }
}

export class Contract extends ASTNode {
  constructor(
    public name: string,
    public functions: FunctionDecl[],
    public circuits: Circuit[],
    public stateVariables: StateVariable[]
  ) {
    super();
  }
  
  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitContract(this);
  }
}

export class FunctionDecl extends ASTNode {
  constructor(
    public name: string,
    public parameters: Parameter[],
    public returnType: TypeNode | null,
    public modifiers: string[],
    public body: Statement[],
    public visibility: 'public' | 'private' = 'public',
    public stateMutability: 'pure' | 'view' | 'mpc' | null = null
  ) {
    super();
  }
  
  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitFunction(this);
  }
}

export class Circuit extends ASTNode {
  constructor(
    public name: string,
    public inputs: CircuitInput[],
    public constraints: Constraint[]
  ) {
    super();
  }
  
  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitCircuit(this);
  }
}

export class Parameter {
  constructor(
    public name: string,
    public type: TypeNode
  ) {}
}

export class CircuitInput {
  constructor(
    public name: string,
    public type: TypeNode,
    public visibility: 'private' | 'public'
  ) {}
}

export class StateVariable {
  constructor(
    public name: string,
    public type: TypeNode,
    public visibility: 'public' | 'private' = 'private'
  ) {}
}

export abstract class Statement extends ASTNode {
  abstract accept<T>(visitor: ASTVisitor<T>): T;
}

export abstract class Expression extends ASTNode {
  abstract accept<T>(visitor: ASTVisitor<T>): T;
}

export abstract class TypeNode extends ASTNode {
  abstract accept<T>(visitor: ASTVisitor<T>): T;
}

export class Constraint extends ASTNode {
  constructor(public expression: Expression) {
    super();
  }
  
  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitStatement(this);
  }
}

export class PrimitiveType extends TypeNode {
  constructor(public name: string) {
    super();
  }
  
  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitType(this);
  }
}

export class SecretType extends TypeNode {
  constructor(public innerType: TypeNode) {
    super();
  }
  
  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitType(this);
  }
}

export class ArrayType extends TypeNode {
  constructor(
    public elementType: TypeNode,
    public size: number | null = null
  ) {
    super();
  }
  
  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitType(this);
  }
}