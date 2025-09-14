export enum TokenType {
  // Keywords
  CIRCUIT = 'CIRCUIT',
  VQE = 'VQE',
  QAOA = 'QAOA',
  BACKEND = 'BACKEND',
  MEASURE = 'MEASURE',
  INTO = 'INTO',
  GRAPH = 'GRAPH',
  NODES = 'NODES',
  EDGES = 'EDGES',
  ANSATZ = 'ANSATZ',
  HAMILTONIAN = 'HAMILTONIAN',
  OPTIMIZER = 'OPTIMIZER',
  PROBLEM = 'PROBLEM',
  LAYERS = 'LAYERS',
  MIXER = 'MIXER',
  PROVIDER = 'PROVIDER',
  DEVICE = 'DEVICE',
  SHOTS = 'SHOTS',
  OPTIMIZATION = 'OPTIMIZATION',

  // Types
  ANGLE = 'ANGLE',
  INTEGER_TYPE = 'INTEGER_TYPE',
  REAL_TYPE = 'REAL_TYPE',

  // Gates
  H = 'H',
  X = 'X',
  Y = 'Y',
  Z = 'Z',
  RX = 'RX',
  RY = 'RY',
  RZ = 'RZ',
  CNOT = 'CNOT',
  CZ = 'CZ',
  SWAP = 'SWAP',
  T = 'T',
  S = 'S',

  // Pauli operators
  I = 'I',

  // Optimizer types
  COBYLA = 'COBYLA',
  SPSA = 'SPSA',
  ADAM = 'ADAM',

  // Provider types
  IBM = 'IBM',
  IONQ = 'IONQ',
  AWS = 'AWS',
  SIMULATOR = 'SIMULATOR',

  // Literals
  INTEGER = 'INTEGER',
  REAL = 'REAL',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  IDENTIFIER = 'IDENTIFIER',

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  ASSIGN = 'ASSIGN',

  // Delimiters
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COMMA = 'COMMA',
  COLON = 'COLON',
  SEMICOLON = 'SEMICOLON',

  // Special
  PI = 'PI',
  THETA = 'THETA',
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

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  private keywords: Map<string, TokenType> = new Map([
    ['circuit', TokenType.CIRCUIT],
    ['vqe', TokenType.VQE],
    ['qaoa', TokenType.QAOA],
    ['backend', TokenType.BACKEND],
    ['measure', TokenType.MEASURE],
    ['into', TokenType.INTO],
    ['graph', TokenType.GRAPH],
    ['nodes', TokenType.NODES],
    ['edges', TokenType.EDGES],
    ['ansatz', TokenType.ANSATZ],
    ['hamiltonian', TokenType.HAMILTONIAN],
    ['optimizer', TokenType.OPTIMIZER],
    ['problem', TokenType.PROBLEM],
    ['layers', TokenType.LAYERS],
    ['mixer', TokenType.MIXER],
    ['provider', TokenType.PROVIDER],
    ['device', TokenType.DEVICE],
    ['shots', TokenType.SHOTS],
    ['optimization', TokenType.OPTIMIZATION],
    ['angle', TokenType.ANGLE],
    ['integer', TokenType.INTEGER_TYPE],
    ['real', TokenType.REAL_TYPE],
    ['H', TokenType.H],
    ['X', TokenType.X],
    ['Y', TokenType.Y],
    ['Z', TokenType.Z],
    ['RX', TokenType.RX],
    ['RY', TokenType.RY],
    ['RZ', TokenType.RZ],
    ['CNOT', TokenType.CNOT],
    ['CZ', TokenType.CZ],
    ['SWAP', TokenType.SWAP],
    ['T', TokenType.T],
    ['S', TokenType.S],
    ['I', TokenType.I],
    ['COBYLA', TokenType.COBYLA],
    ['SPSA', TokenType.SPSA],
    ['ADAM', TokenType.ADAM],
    ['IBM', TokenType.IBM],
    ['IonQ', TokenType.IONQ],
    ['AWS', TokenType.AWS],
    ['Simulator', TokenType.SIMULATOR],
    ['true', TokenType.BOOLEAN],
    ['false', TokenType.BOOLEAN],
    ['pi', TokenType.PI],
    ['theta', TokenType.THETA]
  ]);

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    
    while (this.position < this.input.length) {
      const token = this.nextToken();
      if (token.type !== TokenType.WHITESPACE && token.type !== TokenType.COMMENT) {
        tokens.push(token);
      }
    }
    
    tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column
    });
    
    return tokens;
  }

  private nextToken(): Token {
    this.skipWhitespace();
    
    if (this.position >= this.input.length) {
      return this.makeToken(TokenType.EOF, '');
    }

    const char = this.input[this.position];
    
    // Comments
    if (char === '/' && this.peek() === '/') {
      return this.readLineComment();
    }
    
    if (char === '/' && this.peek() === '*') {
      return this.readBlockComment();
    }

    // Numbers
    if (this.isDigit(char)) {
      return this.readNumber();
    }

    // Strings
    if (char === '"') {
      return this.readString();
    }

    // Identifiers and keywords
    if (this.isAlpha(char) || char === '_') {
      return this.readIdentifier();
    }

    // Single character tokens
    switch (char) {
      case '+': return this.makeToken(TokenType.PLUS, this.advance());
      case '-': return this.makeToken(TokenType.MINUS, this.advance());
      case '*': return this.makeToken(TokenType.MULTIPLY, this.advance());
      case '/': return this.makeToken(TokenType.DIVIDE, this.advance());
      case '=': return this.makeToken(TokenType.ASSIGN, this.advance());
      case '(': return this.makeToken(TokenType.LPAREN, this.advance());
      case ')': return this.makeToken(TokenType.RPAREN, this.advance());
      case '{': return this.makeToken(TokenType.LBRACE, this.advance());
      case '}': return this.makeToken(TokenType.RBRACE, this.advance());
      case '[': return this.makeToken(TokenType.LBRACKET, this.advance());
      case ']': return this.makeToken(TokenType.RBRACKET, this.advance());
      case ',': return this.makeToken(TokenType.COMMA, this.advance());
      case ':': return this.makeToken(TokenType.COLON, this.advance());
      case ';': return this.makeToken(TokenType.SEMICOLON, this.advance());
      default:
        throw new Error(`Unexpected character: ${char} at line ${this.line}, column ${this.column}`);
    }
  }

  private readNumber(): Token {
    const start = this.position;
    let hasDecimal = false;
    
    while (this.position < this.input.length && 
           (this.isDigit(this.input[this.position]) || 
            (!hasDecimal && this.input[this.position] === '.'))) {
      if (this.input[this.position] === '.') {
        hasDecimal = true;
      }
      this.advance();
    }
    
    const value = this.input.substring(start, this.position);
    return this.makeToken(hasDecimal ? TokenType.REAL : TokenType.INTEGER, value);
  }

  private readString(): Token {
    const start = this.position;
    this.advance(); // Skip opening quote
    
    while (this.position < this.input.length && this.input[this.position] !== '"') {
      this.advance();
    }
    
    if (this.position >= this.input.length) {
      throw new Error(`Unterminated string at line ${this.line}`);
    }
    
    this.advance(); // Skip closing quote
    const value = this.input.substring(start, this.position);
    return this.makeToken(TokenType.STRING, value);
  }

  private readIdentifier(): Token {
    const start = this.position;
    
    while (this.position < this.input.length && 
           (this.isAlphaNumeric(this.input[this.position]) || this.input[this.position] === '_')) {
      this.advance();
    }
    
    const value = this.input.substring(start, this.position);
    const type = this.keywords.get(value) || TokenType.IDENTIFIER;
    return this.makeToken(type, value);
  }

  private readLineComment(): Token {
    const start = this.position;
    
    while (this.position < this.input.length && this.input[this.position] !== '\n') {
      this.advance();
    }
    
    const value = this.input.substring(start, this.position);
    return this.makeToken(TokenType.COMMENT, value);
  }

  private readBlockComment(): Token {
    const start = this.position;
    this.advance(); // Skip '/'
    this.advance(); // Skip '*'
    
    while (this.position < this.input.length - 1) {
      if (this.input[this.position] === '*' && this.input[this.position + 1] === '/') {
        this.advance(); // Skip '*'
        this.advance(); // Skip '/'
        break;
      }
      this.advance();
    }
    
    const value = this.input.substring(start, this.position);
    return this.makeToken(TokenType.COMMENT, value);
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && this.isWhitespace(this.input[this.position])) {
      this.advance();
    }
  }

  private advance(): string {
    const char = this.input[this.position];
    this.position++;
    
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    
    return char;
  }

  private peek(offset: number = 1): string {
    const pos = this.position + offset;
    return pos < this.input.length ? this.input[pos] : '\0';
  }

  private makeToken(type: TokenType, value: string): Token {
    return {
      type,
      value,
      line: this.line,
      column: this.column - value.length
    };
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\r' || char === '\n';
  }
}