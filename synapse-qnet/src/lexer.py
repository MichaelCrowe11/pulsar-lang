"""
Synapse QNet Lexer
Tokenizes quantum network DSL syntax
"""

import re
from enum import Enum, auto
from typing import List, NamedTuple, Optional
from dataclasses import dataclass

class TokenType(Enum):
    # Literals
    NUMBER = auto()
    STRING = auto()
    QUANTUM_STATE = auto()  # |ψ⟩, |00⟩, |Φ+⟩
    
    # Identifiers
    IDENTIFIER = auto()
    
    # Keywords
    NETWORK = auto()
    NODE = auto()
    CHANNEL = auto()
    PROTOCOL = auto()
    SIMULATION = auto()
    HARDWARE = auto()
    
    # Quantum Keywords
    PREPARE = auto()
    MEASURE = auto()
    ENTANGLE = auto()
    TELEPORT = auto()
    
    # QKD Keywords  
    BB84 = auto()
    E91 = auto()
    SIFTING = auto()
    ERROR_CORRECTION = auto()
    
    # Operators
    ARROW = auto()      # ->
    TENSOR = auto()     # ⊗
    DAGGER = auto()     # †
    
    # Delimiters
    LBRACE = auto()     # {
    RBRACE = auto()     # }
    LPAREN = auto()     # (
    RPAREN = auto()     # )
    LBRACKET = auto()   # [
    RBRACKET = auto()   # ]
    
    # Punctuation
    COLON = auto()      # :
    SEMICOLON = auto()  # ;
    COMMA = auto()      # ,
    DOT = auto()        # .
    
    # Special
    NEWLINE = auto()
    EOF = auto()
    COMMENT = auto()

@dataclass
class Token:
    type: TokenType
    value: str
    line: int
    column: int

class SynapseQLexer:
    """Lexer for Synapse QNet quantum network DSL"""
    
    KEYWORDS = {
        'network': TokenType.NETWORK,
        'node': TokenType.NODE,
        'channel': TokenType.CHANNEL,
        'protocol': TokenType.PROTOCOL,
        'simulation': TokenType.SIMULATION,
        'hardware': TokenType.HARDWARE,
        'prepare': TokenType.PREPARE,
        'measure': TokenType.MEASURE,
        'entangle': TokenType.ENTANGLE,
        'teleport': TokenType.TELEPORT,
        'BB84': TokenType.BB84,
        'E91': TokenType.E91,
        'sifting': TokenType.SIFTING,
        'error_correction': TokenType.ERROR_CORRECTION,
    }
    
    # Quantum state regex: |ψ⟩, |00⟩, |Φ+⟩, etc.
    QUANTUM_STATE_PATTERN = r'\|[^⟩]+⟩'
    
    # Number patterns
    NUMBER_PATTERN = r'-?\d+\.?\d*([eE][+-]?\d+)?'
    
    # String patterns
    STRING_PATTERN = r'"[^"]*"'
    
    # Identifier pattern
    IDENTIFIER_PATTERN = r'[a-zA-Z_][a-zA-Z0-9_]*'
    
    # Comment pattern
    COMMENT_PATTERN = r'//.*$'
    
    def __init__(self, text: str):
        self.text = text
        self.pos = 0
        self.line = 1
        self.column = 1
        self.tokens: List[Token] = []
    
    def error(self, message: str) -> None:
        raise SyntaxError(f"Line {self.line}, Column {self.column}: {message}")
    
    def peek(self, offset: int = 0) -> Optional[str]:
        """Peek at character at current position + offset"""
        pos = self.pos + offset
        if pos < len(self.text):
            return self.text[pos]
        return None
    
    def advance(self) -> Optional[str]:
        """Move to next character and return current"""
        if self.pos >= len(self.text):
            return None
            
        char = self.text[self.pos]
        self.pos += 1
        
        if char == '\n':
            self.line += 1
            self.column = 1
        else:
            self.column += 1
            
        return char
    
    def skip_whitespace(self) -> None:
        """Skip whitespace except newlines"""
        while self.peek() and self.peek() in ' \t\r':
            self.advance()
    
    def read_number(self) -> Token:
        """Read numeric literal"""
        start_column = self.column
        value = ''
        
        # Handle negative numbers
        if self.peek() == '-':
            value += self.advance()
        
        # Read digits and decimal point
        while self.peek() and (self.peek().isdigit() or self.peek() in '.eE+-'):
            value += self.advance()
        
        return Token(TokenType.NUMBER, value, self.line, start_column)
    
    def read_string(self) -> Token:
        """Read string literal"""
        start_column = self.column
        self.advance()  # Skip opening quote
        value = ''
        
        while self.peek() and self.peek() != '"':
            if self.peek() == '\\':
                self.advance()  # Skip escape character
                escaped = self.advance()
                if escaped == 'n':
                    value += '\n'
                elif escaped == 't':
                    value += '\t'
                elif escaped == '\\':
                    value += '\\'
                elif escaped == '"':
                    value += '"'
                else:
                    value += escaped
            else:
                value += self.advance()
        
        if not self.peek():
            self.error("Unterminated string literal")
        
        self.advance()  # Skip closing quote
        return Token(TokenType.STRING, value, self.line, start_column)
    
    def read_quantum_state(self) -> Token:
        """Read quantum state notation like |ψ⟩"""
        start_column = self.column
        value = ''
        
        # Read until closing ⟩
        while self.peek() and self.peek() != '⟩':
            value += self.advance()
        
        if not self.peek():
            self.error("Unterminated quantum state")
        
        value += self.advance()  # Include closing ⟩
        return Token(TokenType.QUANTUM_STATE, value, self.line, start_column)
    
    def read_identifier(self) -> Token:
        """Read identifier or keyword"""
        start_column = self.column
        value = ''
        
        while (self.peek() and 
               (self.peek().isalnum() or self.peek() in '_')):
            value += self.advance()
        
        # Check if it's a keyword
        token_type = self.KEYWORDS.get(value, TokenType.IDENTIFIER)
        return Token(token_type, value, self.line, start_column)
    
    def read_comment(self) -> Token:
        """Read single-line comment"""
        start_column = self.column
        value = ''
        
        while self.peek() and self.peek() != '\n':
            value += self.advance()
        
        return Token(TokenType.COMMENT, value, self.line, start_column)
    
    def tokenize(self) -> List[Token]:
        """Tokenize the entire input"""
        while self.pos < len(self.text):
            self.skip_whitespace()
            
            if not self.peek():
                break
            
            char = self.peek()
            
            # Newlines
            if char == '\n':
                token = Token(TokenType.NEWLINE, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            # Comments
            elif char == '/' and self.peek(1) == '/':
                token = self.read_comment()
                self.tokens.append(token)
            
            # Numbers
            elif char.isdigit() or (char == '-' and self.peek(1) and self.peek(1).isdigit()):
                token = self.read_number()
                self.tokens.append(token)
            
            # Strings
            elif char == '"':
                token = self.read_string()
                self.tokens.append(token)
            
            # Quantum states
            elif char == '|':
                token = self.read_quantum_state()
                self.tokens.append(token)
            
            # Identifiers and keywords
            elif char.isalpha() or char == '_':
                token = self.read_identifier()
                self.tokens.append(token)
            
            # Operators and punctuation
            elif char == '-' and self.peek(1) == '>':
                token = Token(TokenType.ARROW, '->', self.line, self.column)
                self.tokens.append(token)
                self.advance()
                self.advance()
            
            elif char == '⊗':
                token = Token(TokenType.TENSOR, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            elif char == '†':
                token = Token(TokenType.DAGGER, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            elif char == '{':
                token = Token(TokenType.LBRACE, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            elif char == '}':
                token = Token(TokenType.RBRACE, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            elif char == '(':
                token = Token(TokenType.LPAREN, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            elif char == ')':
                token = Token(TokenType.RPAREN, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            elif char == '[':
                token = Token(TokenType.LBRACKET, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            elif char == ']':
                token = Token(TokenType.RBRACKET, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            elif char == ':':
                token = Token(TokenType.COLON, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            elif char == ';':
                token = Token(TokenType.SEMICOLON, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            elif char == ',':
                token = Token(TokenType.COMMA, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            elif char == '.':
                token = Token(TokenType.DOT, char, self.line, self.column)
                self.tokens.append(token)
                self.advance()
            
            else:
                self.error(f"Unexpected character: {char}")
        
        # Add EOF token
        self.tokens.append(Token(TokenType.EOF, '', self.line, self.column))
        return self.tokens

def main():
    """Test the lexer with sample code"""
    sample_code = '''
    network TestNet {
        node Alice {
            type: "endpoint"
            location: [40.7128, -74.0060]
        }
        
        channel AliceBob {
            connect: Alice -> Bob
            medium: "fiber"
            loss_db_per_km: 0.2
        }
    }
    
    protocol BB84 {
        prepare |ψ⟩ in basis(random[H,V,D,A])
        measure in basis(random[H,V,D,A])
    }
    '''
    
    lexer = SynapseQLexer(sample_code)
    tokens = lexer.tokenize()
    
    for token in tokens:
        if token.type != TokenType.NEWLINE:  # Skip newlines for cleaner output
            print(f"{token.type.name:15} | {token.value:20} | Line {token.line}, Col {token.column}")

if __name__ == "__main__":
    main()