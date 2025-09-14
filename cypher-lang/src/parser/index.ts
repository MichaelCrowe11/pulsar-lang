import { Token, TokenType, ASTNode, Program, Contract, FunctionDecl, Circuit, Statement, Expression, TypeNode, Parameter, CircuitInput, StateVariable, Constraint, PrimitiveType, SecretType, ArrayType } from '../types';

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Program {
    const contracts: Contract[] = [];
    
    while (!this.isAtEnd()) {
      if (this.check(TokenType.CONTRACT)) {
        contracts.push(this.parseContract());
      } else {
        this.advance();
      }
    }
    
    return new Program(contracts);
  }

  private parseContract(): Contract {
    this.consume(TokenType.CONTRACT, "Expected 'contract'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected contract name").value;
    
    this.consume(TokenType.LBRACE, "Expected '{' after contract name");
    
    const functions: FunctionDecl[] = [];
    const circuits: Circuit[] = [];
    const stateVariables: StateVariable[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.FUNCTION)) {
        functions.push(this.parseFunction());
      } else if (this.check(TokenType.CIRCUIT)) {
        circuits.push(this.parseCircuit());
      } else if (this.isTypeKeyword() || this.check(TokenType.IDENTIFIER)) {
        stateVariables.push(this.parseStateVariable());
      } else {
        this.advance();
      }
    }
    
    this.consume(TokenType.RBRACE, "Expected '}' after contract body");
    
    return new Contract(name, functions, circuits, stateVariables);
  }

  private parseFunction(): FunctionDecl {
    this.consume(TokenType.FUNCTION, "Expected 'function'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected function name").value;
    
    this.consume(TokenType.LPAREN, "Expected '(' after function name");
    
    const parameters: Parameter[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const paramType = this.parseType();
        const paramName = this.consume(TokenType.IDENTIFIER, "Expected parameter name").value;
        parameters.push(new Parameter(paramName, paramType));
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RPAREN, "Expected ')' after parameters");
    
    let returnType: TypeNode | null = null;
    if (this.match(TokenType.ARROW)) {
      returnType = this.parseType();
    }
    
    const modifiers: string[] = [];
    let visibility: 'public' | 'private' = 'public';
    let stateMutability: 'pure' | 'view' | 'mpc' | null = null;
    
    while (this.check(TokenType.PUBLIC) || this.check(TokenType.PRIVATE) || 
           this.check(TokenType.PURE) || this.check(TokenType.VIEW) || 
           this.check(TokenType.MPC)) {
      const modifier = this.advance().value;
      modifiers.push(modifier);
      
      if (modifier === 'public' || modifier === 'private') {
        visibility = modifier as 'public' | 'private';
      } else if (modifier === 'pure' || modifier === 'view' || modifier === 'mpc') {
        stateMutability = modifier as 'pure' | 'view' | 'mpc';
      }
    }
    
    this.consume(TokenType.LBRACE, "Expected '{' before function body");
    
    const body: Statement[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }
    
    this.consume(TokenType.RBRACE, "Expected '}' after function body");
    
    return new FunctionDecl(name, parameters, returnType, modifiers, body, visibility, stateMutability);
  }

  private parseCircuit(): Circuit {
    this.consume(TokenType.CIRCUIT, "Expected 'circuit'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected circuit name").value;
    
    this.consume(TokenType.LBRACE, "Expected '{' after circuit name");
    
    const inputs: CircuitInput[] = [];
    const constraints: Constraint[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.PRIVATE) || this.check(TokenType.PUBLIC)) {
        const visibility = this.advance().value as 'private' | 'public';
        
        if (this.check(TokenType.WITNESS)) {
          this.advance();
        }
        
        const type = this.parseType();
        const name = this.consume(TokenType.IDENTIFIER, "Expected input name").value;
        this.consume(TokenType.SEMICOLON, "Expected ';' after circuit input");
        
        inputs.push(new CircuitInput(name, type, visibility));
      } else if (this.check(TokenType.CONSTRAINT)) {
        this.advance();
        const expr = this.parseExpression();
        this.consume(TokenType.SEMICOLON, "Expected ';' after constraint");
        constraints.push(new Constraint(expr));
      } else {
        this.advance();
      }
    }
    
    this.consume(TokenType.RBRACE, "Expected '}' after circuit body");
    
    return new Circuit(name, inputs, constraints);
  }

  private parseStateVariable(): StateVariable {
    const type = this.parseType();
    const name = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
    
    let visibility: 'public' | 'private' = 'private';
    if (this.check(TokenType.PUBLIC)) {
      this.advance();
      visibility = 'public';
    }
    
    this.consume(TokenType.SEMICOLON, "Expected ';' after state variable");
    
    return new StateVariable(name, type, visibility);
  }

  private parseStatement(): Statement {
    // Simplified statement parsing - would need full implementation
    // For now, just consume tokens until semicolon
    while (!this.check(TokenType.SEMICOLON) && !this.isAtEnd()) {
      this.advance();
    }
    if (this.check(TokenType.SEMICOLON)) {
      this.advance();
    }
    
    // Return a placeholder statement
    return new (class extends Statement {
      accept<T>(): T { throw new Error('Not implemented'); }
    })();
  }

  private parseExpression(): Expression {
    // Simplified expression parsing - would need full implementation
    this.advance(); // Consume one token as placeholder
    
    // Return a placeholder expression
    return new (class extends Expression {
      accept<T>(): T { throw new Error('Not implemented'); }
    })();
  }

  private parseType(): TypeNode {
    if (this.check(TokenType.SECRET)) {
      this.advance();
      this.consume(TokenType.LESS_THAN, "Expected '<' after 'secret'");
      const innerType = this.parseType();
      this.consume(TokenType.GREATER_THAN, "Expected '>' after secret inner type");
      return new SecretType(innerType);
    }
    
    if (this.isTypeKeyword()) {
      const typeName = this.advance().value;
      
      // Handle array types
      if (this.check(TokenType.LBRACKET)) {
        this.advance();
        let size: number | null = null;
        if (this.check(TokenType.NUMBER)) {
          size = parseInt(this.advance().value);
        }
        this.consume(TokenType.RBRACKET, "Expected ']' after array size");
        return new ArrayType(new PrimitiveType(typeName), size);
      }
      
      return new PrimitiveType(typeName);
    }
    
    throw new Error(`Expected type at line ${this.peek().line}`);
  }

  private isTypeKeyword(): boolean {
    return this.check(TokenType.FIELD) || this.check(TokenType.UINT256) ||
           this.check(TokenType.BYTES32) || this.check(TokenType.BOOL) ||
           this.check(TokenType.ADDRESS) || this.check(TokenType.HASH) ||
           this.check(TokenType.SIGNATURE) || this.check(TokenType.PROOF) ||
           this.check(TokenType.COMMITMENT) || this.check(TokenType.WITNESS);
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    
    const current = this.peek();
    throw new Error(`${message} at line ${current.line}, column ${current.column}. Got ${current.type}`);
  }
}