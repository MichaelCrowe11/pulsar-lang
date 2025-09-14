import { Token, TokenType, Position } from '../types';

export class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  
  private keywords = new Map<string, TokenType>([
    ['contract', TokenType.CONTRACT],
    ['function', TokenType.FUNCTION],
    ['circuit', TokenType.CIRCUIT],
    ['modifier', TokenType.MODIFIER],
    ['private', TokenType.PRIVATE],
    ['public', TokenType.PUBLIC],
    ['pure', TokenType.PURE],
    ['view', TokenType.VIEW],
    ['mpc', TokenType.MPC],
    ['field', TokenType.FIELD],
    ['uint256', TokenType.UINT256],
    ['bytes32', TokenType.BYTES32],
    ['bool', TokenType.BOOL],
    ['address', TokenType.ADDRESS],
    ['hash', TokenType.HASH],
    ['signature', TokenType.SIGNATURE],
    ['proof', TokenType.PROOF],
    ['commitment', TokenType.COMMITMENT],
    ['secret', TokenType.SECRET],
    ['witness', TokenType.WITNESS],
    ['constraint', TokenType.CONSTRAINT],
    ['if', TokenType.IF],
    ['else', TokenType.ELSE],
    ['for', TokenType.FOR],
    ['while', TokenType.WHILE],
    ['return', TokenType.RETURN],
    ['require', TokenType.REQUIRE],
    ['true', TokenType.BOOLEAN],
    ['false', TokenType.BOOLEAN],
  ]);

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    
    while (!this.isAtEnd()) {
      this.skipWhitespace();
      
      if (this.isAtEnd()) break;
      
      const token = this.nextToken();
      if (token) {
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

  private nextToken(): Token | null {
    const startLine = this.line;
    const startColumn = this.column;
    const char = this.advance();

    switch (char) {
      case ' ':
      case '\r':
      case '\t':
        return null; // Skip whitespace
        
      case '\n':
        this.line++;
        this.column = 1;
        return null;
        
      case '/':
        if (this.peek() === '/') {
          this.skipLineComment();
          return null;
        } else if (this.peek() === '*') {
          this.skipBlockComment();
          return null;
        }
        return this.createToken(TokenType.DIVIDE, '/', startLine, startColumn);
        
      case '+': return this.createToken(TokenType.PLUS, '+', startLine, startColumn);
      case '-':
        if (this.peek() === '>') {
          this.advance();
          return this.createToken(TokenType.ARROW, '->', startLine, startColumn);
        }
        return this.createToken(TokenType.MINUS, '-', startLine, startColumn);
      case '*': return this.createToken(TokenType.MULTIPLY, '*', startLine, startColumn);
      case '%': return this.createToken(TokenType.MODULO, '%', startLine, startColumn);
      case '=':
        if (this.peek() === '=') {
          this.advance();
          return this.createToken(TokenType.EQUAL, '==', startLine, startColumn);
        }
        return this.createToken(TokenType.ASSIGN, '=', startLine, startColumn);
      case '!':
        if (this.peek() === '=') {
          this.advance();
          return this.createToken(TokenType.NOT_EQUAL, '!=', startLine, startColumn);
        }
        return this.createToken(TokenType.NOT, '!', startLine, startColumn);
      case '<': return this.createToken(TokenType.LESS_THAN, '<', startLine, startColumn);
      case '>': return this.createToken(TokenType.GREATER_THAN, '>', startLine, startColumn);
      case '&':
        if (this.peek() === '&') {
          this.advance();
          return this.createToken(TokenType.AND, '&&', startLine, startColumn);
        }
        break;
      case '|':
        if (this.peek() === '|') {
          this.advance();
          return this.createToken(TokenType.OR, '||', startLine, startColumn);
        }
        break;
      case ';': return this.createToken(TokenType.SEMICOLON, ';', startLine, startColumn);
      case ',': return this.createToken(TokenType.COMMA, ',', startLine, startColumn);
      case '.': return this.createToken(TokenType.DOT, '.', startLine, startColumn);
      case '(': return this.createToken(TokenType.LPAREN, '(', startLine, startColumn);
      case ')': return this.createToken(TokenType.RPAREN, ')', startLine, startColumn);
      case '{': return this.createToken(TokenType.LBRACE, '{', startLine, startColumn);
      case '}': return this.createToken(TokenType.RBRACE, '}', startLine, startColumn);
      case '[': return this.createToken(TokenType.LBRACKET, '[', startLine, startColumn);
      case ']': return this.createToken(TokenType.RBRACKET, ']', startLine, startColumn);
      case '"': return this.readString(startLine, startColumn);
      case "'": return this.readString(startLine, startColumn, "'");
      
      default:
        if (this.isDigit(char)) {
          return this.readNumber(char, startLine, startColumn);
        } else if (this.isAlpha(char)) {
          return this.readIdentifier(char, startLine, startColumn);
        } else {
          throw new Error(`Unexpected character '${char}' at line ${startLine}, column ${startColumn}`);
        }
    }
    
    return null;
  }

  private readString(startLine: number, startColumn: number, quote: string = '"'): Token {
    let value = '';
    
    while (this.peek() !== quote && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      
      if (this.peek() === '\\') {
        this.advance(); // Skip escape character
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += escaped; break;
        }
      } else {
        value += this.advance();
      }
    }
    
    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${startLine}, column ${startColumn}`);
    }
    
    this.advance(); // Consume closing quote
    return this.createToken(TokenType.STRING, value, startLine, startColumn);
  }

  private readNumber(firstChar: string, startLine: number, startColumn: number): Token {
    let value = firstChar;
    
    while (this.isDigit(this.peek()) || this.peek() === '.') {
      value += this.advance();
    }
    
    // Handle hex numbers
    if (value === '0' && (this.peek() === 'x' || this.peek() === 'X')) {
      value += this.advance();
      while (this.isHexDigit(this.peek())) {
        value += this.advance();
      }
    }
    
    return this.createToken(TokenType.NUMBER, value, startLine, startColumn);
  }

  private readIdentifier(firstChar: string, startLine: number, startColumn: number): Token {
    let value = firstChar;
    
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      value += this.advance();
    }
    
    const tokenType = this.keywords.get(value) || TokenType.IDENTIFIER;
    return this.createToken(tokenType, value, startLine, startColumn);
  }

  private skipLineComment(): void {
    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance();
    }
  }

  private skipBlockComment(): void {
    this.advance(); // Skip '*'
    
    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); // Skip '*'
        this.advance(); // Skip '/'
        break;
      }
      
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      
      this.advance();
    }
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\r' || this.peek() === '\t')) {
      this.advance();
    }
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private advance(): string {
    this.column++;
    return this.source.charAt(this.position++);
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source.charAt(this.position);
  }

  private peekNext(): string {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.position + 1);
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isHexDigit(char: string): boolean {
    return this.isDigit(char) || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F');
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private createToken(type: TokenType, value: string, line: number, column: number): Token {
    return { type, value, line, column };
  }
}