#!/usr/bin/env python3
"""
Mycelium-EI-Lang Python Interpreter
A Python-based interpreter for the Mycelium-EI ecological intelligence language.
"""

import re
import sys
import time
import math
import random
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass
from enum import Enum

# Token types
class TokenType(Enum):
    # Keywords
    ENVIRONMENT = "environment"
    FUNCTION = "function"
    MYCELIUM = "mycelium"
    NETWORK = "network"
    SIGNAL = "signal"
    ADAPT = "adapt"
    IF = "if"
    ELSE = "else"
    WHILE = "while"
    FOR = "for"
    RETURN = "return"
    LET = "let"
    CONST = "const"
    TRUE = "true"
    FALSE = "false"
    IN = "in"
    RANGE = "range"
    NEW = "new"
    
    # Identifiers and literals
    IDENTIFIER = "identifier"
    INTEGER = "integer"
    FLOAT = "float"
    STRING = "string"
    
    # Operators and punctuation
    PLUS = "+"
    MINUS = "-"
    STAR = "*"
    SLASH = "/"
    PERCENT = "%"
    EQUAL = "="
    EQUAL_EQUAL = "=="
    NOT_EQUAL = "!="
    LESS = "<"
    GREATER = ">"
    LESS_EQUAL = "<="
    GREATER_EQUAL = ">="
    AND = "&&"
    OR = "||"
    NOT = "!"
    
    LEFT_BRACE = "{"
    RIGHT_BRACE = "}"
    LEFT_PAREN = "("
    RIGHT_PAREN = ")"
    LEFT_BRACKET = "["
    RIGHT_BRACKET = "]"
    COMMA = ","
    COLON = ":"
    SEMICOLON = ";"
    DOT = "."
    ARROW = "->"
    
    # Special
    EOF = "EOF"
    NEWLINE = "NEWLINE"

@dataclass
class Token:
    type: TokenType
    value: Any
    line: int
    column: int

class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.position = 0
        self.line = 1
        self.column = 1
        self.tokens = []
        
    def tokenize(self) -> List[Token]:
        while self.position < len(self.source):
            self.skip_whitespace_and_comments()
            if self.position >= len(self.source):
                break
                
            if not self.scan_token():
                raise SyntaxError(f"Unexpected character at line {self.line}, column {self.column}")
                
        self.tokens.append(Token(TokenType.EOF, None, self.line, self.column))
        return self.tokens
    
    def skip_whitespace_and_comments(self):
        while self.position < len(self.source):
            char = self.source[self.position]
            
            if char in ' \t\r':
                self.advance()
            elif char == '\n':
                self.line += 1
                self.column = 0
                self.advance()
            elif self.position + 1 < len(self.source) and self.source[self.position:self.position+2] == '//':
                # Skip line comment
                while self.position < len(self.source) and self.source[self.position] != '\n':
                    self.advance()
            else:
                break
    
    def scan_token(self) -> bool:
        start_column = self.column
        char = self.source[self.position]
        
        # Numbers
        if char.isdigit():
            return self.scan_number()
        
        # Identifiers and keywords
        if char.isalpha() or char == '_':
            return self.scan_identifier()
        
        # Strings
        if char == '"':
            return self.scan_string()
        
        # Operators and punctuation
        if char == '+':
            self.add_token(TokenType.PLUS, char, start_column)
            self.advance()
            return True
        elif char == '-':
            if self.peek() == '>':
                self.advance()
                self.advance()
                self.add_token(TokenType.ARROW, '->', start_column)
            else:
                self.add_token(TokenType.MINUS, char, start_column)
                self.advance()
            return True
        elif char == '*':
            self.add_token(TokenType.STAR, char, start_column)
            self.advance()
            return True
        elif char == '/':
            self.add_token(TokenType.SLASH, char, start_column)
            self.advance()
            return True
        elif char == '%':
            self.add_token(TokenType.PERCENT, char, start_column)
            self.advance()
            return True
        elif char == '=':
            if self.peek() == '=':
                self.advance()
                self.advance()
                self.add_token(TokenType.EQUAL_EQUAL, '==', start_column)
            else:
                self.add_token(TokenType.EQUAL, char, start_column)
                self.advance()
            return True
        elif char == '!':
            if self.peek() == '=':
                self.advance()
                self.advance()
                self.add_token(TokenType.NOT_EQUAL, '!=', start_column)
            else:
                self.add_token(TokenType.NOT, char, start_column)
                self.advance()
            return True
        elif char == '<':
            if self.peek() == '=':
                self.advance()
                self.advance()
                self.add_token(TokenType.LESS_EQUAL, '<=', start_column)
            else:
                self.add_token(TokenType.LESS, char, start_column)
                self.advance()
            return True
        elif char == '>':
            if self.peek() == '=':
                self.advance()
                self.advance()
                self.add_token(TokenType.GREATER_EQUAL, '>=', start_column)
            else:
                self.add_token(TokenType.GREATER, char, start_column)
                self.advance()
            return True
        elif char == '&':
            if self.peek() == '&':
                self.advance()
                self.advance()
                self.add_token(TokenType.AND, '&&', start_column)
                return True
        elif char == '|':
            if self.peek() == '|':
                self.advance()
                self.advance()
                self.add_token(TokenType.OR, '||', start_column)
                return True
        elif char == '{':
            self.add_token(TokenType.LEFT_BRACE, char, start_column)
            self.advance()
            return True
        elif char == '}':
            self.add_token(TokenType.RIGHT_BRACE, char, start_column)
            self.advance()
            return True
        elif char == '(':
            self.add_token(TokenType.LEFT_PAREN, char, start_column)
            self.advance()
            return True
        elif char == ')':
            self.add_token(TokenType.RIGHT_PAREN, char, start_column)
            self.advance()
            return True
        elif char == '[':
            self.add_token(TokenType.LEFT_BRACKET, char, start_column)
            self.advance()
            return True
        elif char == ']':
            self.add_token(TokenType.RIGHT_BRACKET, char, start_column)
            self.advance()
            return True
        elif char == ',':
            self.add_token(TokenType.COMMA, char, start_column)
            self.advance()
            return True
        elif char == ':':
            self.add_token(TokenType.COLON, char, start_column)
            self.advance()
            return True
        elif char == ';':
            self.add_token(TokenType.SEMICOLON, char, start_column)
            self.advance()
            return True
        elif char == '.':
            self.add_token(TokenType.DOT, char, start_column)
            self.advance()
            return True
        
        return False
    
    def scan_number(self) -> bool:
        start = self.position
        start_column = self.column
        
        while self.position < len(self.source) and self.source[self.position].isdigit():
            self.advance()
        
        # Check for float
        if self.position < len(self.source) and self.source[self.position] == '.':
            if self.position + 1 < len(self.source) and self.source[self.position + 1].isdigit():
                self.advance()  # Skip '.'
                while self.position < len(self.source) and self.source[self.position].isdigit():
                    self.advance()
                value = float(self.source[start:self.position])
                self.add_token(TokenType.FLOAT, value, start_column)
            else:
                value = int(self.source[start:self.position])
                self.add_token(TokenType.INTEGER, value, start_column)
        else:
            value = int(self.source[start:self.position])
            self.add_token(TokenType.INTEGER, value, start_column)
        
        return True
    
    def scan_identifier(self) -> bool:
        start = self.position
        start_column = self.column
        
        while self.position < len(self.source) and (self.source[self.position].isalnum() or self.source[self.position] == '_'):
            self.advance()
        
        text = self.source[start:self.position]
        
        # Check for keywords
        keywords = {
            'environment': TokenType.ENVIRONMENT,
            'function': TokenType.FUNCTION,
            'mycelium': TokenType.MYCELIUM,
            'network': TokenType.NETWORK,
            'signal': TokenType.SIGNAL,
            'adapt': TokenType.ADAPT,
            'if': TokenType.IF,
            'else': TokenType.ELSE,
            'while': TokenType.WHILE,
            'for': TokenType.FOR,
            'return': TokenType.RETURN,
            'let': TokenType.LET,
            'const': TokenType.CONST,
            'true': TokenType.TRUE,
            'false': TokenType.FALSE,
            'in': TokenType.IN,
            'range': TokenType.RANGE,
            'new': TokenType.NEW,
        }
        
        token_type = keywords.get(text, TokenType.IDENTIFIER)
        
        if token_type == TokenType.TRUE:
            self.add_token(token_type, True, start_column)
        elif token_type == TokenType.FALSE:
            self.add_token(token_type, False, start_column)
        else:
            self.add_token(token_type, text, start_column)
        
        return True
    
    def scan_string(self) -> bool:
        start_column = self.column
        self.advance()  # Skip opening quote
        start = self.position
        
        while self.position < len(self.source) and self.source[self.position] != '"':
            if self.source[self.position] == '\\':
                self.advance()  # Skip escape character
                if self.position < len(self.source):
                    self.advance()  # Skip escaped character
            else:
                self.advance()
        
        if self.position >= len(self.source):
            raise SyntaxError(f"Unterminated string at line {self.line}")
        
        value = self.source[start:self.position]
        self.advance()  # Skip closing quote
        
        self.add_token(TokenType.STRING, value, start_column)
        return True
    
    def advance(self) -> str:
        if self.position < len(self.source):
            char = self.source[self.position]
            self.position += 1
            self.column += 1
            return char
        return '\0'
    
    def peek(self) -> str:
        if self.position + 1 < len(self.source):
            return self.source[self.position + 1]
        return '\0'
    
    def add_token(self, token_type: TokenType, value: Any, column: int):
        self.tokens.append(Token(token_type, value, self.line, column))

class Environment:
    def __init__(self, parent=None):
        self.parent = parent
        self.variables = {}
        self.functions = {}
        
    def define(self, name: str, value: Any):
        self.variables[name] = value
    
    def get(self, name: str) -> Any:
        if name in self.variables:
            return self.variables[name]
        if self.parent:
            return self.parent.get(name)
        raise NameError(f"Undefined variable: {name}")
    
    def set(self, name: str, value: Any):
        if name in self.variables:
            self.variables[name] = value
        elif self.parent:
            self.parent.set(name, value)
        else:
            raise NameError(f"Undefined variable: {name}")
    
    def define_function(self, name: str, func):
        self.functions[name] = func
    
    def get_function(self, name: str):
        if name in self.functions:
            return self.functions[name]
        if self.parent:
            return self.parent.get_function(name)
        return None

class Interpreter:
    def __init__(self):
        self.global_env = Environment()
        self.current_env = self.global_env
        self.environment_params = {}
        self.setup_builtins()
    
    def setup_builtins(self):
        # Built-in functions
        self.global_env.define_function('print', self.builtin_print)
        self.global_env.define_function('len', self.builtin_len)
        self.global_env.define_function('range', self.builtin_range)
        self.global_env.define_function('abs', self.builtin_abs)
        self.global_env.define_function('min', self.builtin_min)
        self.global_env.define_function('max', self.builtin_max)
        self.global_env.define_function('sin', self.builtin_sin)
        self.global_env.define_function('cos', self.builtin_cos)
        self.global_env.define_function('sleep', self.builtin_sleep)
        self.global_env.define_function('get_env', self.builtin_get_env)
        self.global_env.define_function('set_env', self.builtin_set_env)
        self.global_env.define_function('int', self.builtin_int)
        self.global_env.define_function('float', self.builtin_float)
        self.global_env.define_function('str', self.builtin_str)
    
    # Built-in function implementations
    def builtin_print(self, *args):
        print(*args)
        return None
    
    def builtin_len(self, obj):
        return len(obj)
    
    def builtin_range(self, *args):
        if len(args) == 1:
            return list(range(args[0]))
        elif len(args) == 2:
            return list(range(args[0], args[1]))
        elif len(args) == 3:
            return list(range(args[0], args[1], args[2]))
        else:
            raise ValueError("range() takes 1-3 arguments")
    
    def builtin_abs(self, x):
        return abs(x)
    
    def builtin_min(self, *args):
        if len(args) == 1 and isinstance(args[0], list):
            return min(args[0])
        return min(args)
    
    def builtin_max(self, *args):
        if len(args) == 1 and isinstance(args[0], list):
            return max(args[0])
        return max(args)
    
    def builtin_sin(self, x):
        return math.sin(x)
    
    def builtin_cos(self, x):
        return math.cos(x)
    
    def builtin_sleep(self, ms):
        time.sleep(ms / 1000.0)
        return None
    
    def builtin_get_env(self, param):
        return self.environment_params.get(param, 0.0)
    
    def builtin_set_env(self, param, value):
        self.environment_params[param] = value
        return None
    
    def builtin_int(self, x):
        return int(x)
    
    def builtin_float(self, x):
        return float(x)
    
    def builtin_str(self, x):
        return str(x)
    
    def interpret(self, source: str):
        try:
            # Tokenize
            lexer = Lexer(source)
            tokens = lexer.tokenize()
            
            # Parse (simplified - just execute statements in order)
            parser = Parser(tokens, self)
            parser.parse()
            
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

class Parser:
    def __init__(self, tokens: List[Token], interpreter):
        self.tokens = tokens
        self.current = 0
        self.interpreter = interpreter
    
    def parse(self):
        while not self.is_at_end():
            self.declaration()
    
    def is_at_end(self) -> bool:
        return self.peek().type == TokenType.EOF
    
    def peek(self) -> Token:
        return self.tokens[self.current]
    
    def previous(self) -> Token:
        return self.tokens[self.current - 1]
    
    def advance(self) -> Token:
        if not self.is_at_end():
            self.current += 1
        return self.previous()
    
    def check(self, token_type: TokenType) -> bool:
        if self.is_at_end():
            return False
        return self.peek().type == token_type
    
    def match(self, *types: TokenType) -> bool:
        for token_type in types:
            if self.check(token_type):
                self.advance()
                return True
        return False
    
    def consume(self, token_type: TokenType, message: str) -> Token:
        if self.check(token_type):
            return self.advance()
        raise SyntaxError(f"{message} at line {self.peek().line}")
    
    def declaration(self):
        if self.match(TokenType.ENVIRONMENT):
            self.environment_declaration()
        elif self.match(TokenType.FUNCTION):
            self.function_declaration()
        elif self.match(TokenType.MYCELIUM):
            self.mycelium_declaration()
        elif self.match(TokenType.NETWORK):
            self.network_declaration()
        elif self.match(TokenType.SIGNAL):
            self.signal_declaration()
        else:
            self.statement()
    
    def environment_declaration(self):
        self.consume(TokenType.LEFT_BRACE, "Expected '{' after 'environment'")
        
        while not self.check(TokenType.RIGHT_BRACE) and not self.is_at_end():
            name = self.consume(TokenType.IDENTIFIER, "Expected parameter name").value
            self.consume(TokenType.COLON, "Expected ':' after parameter name")
            value = self.expression()
            
            self.interpreter.environment_params[name] = value
            
            if not self.check(TokenType.RIGHT_BRACE):
                self.consume(TokenType.COMMA, "Expected ',' or '}' after parameter")
        
        self.consume(TokenType.RIGHT_BRACE, "Expected '}' to close environment")
    
    def function_declaration(self):
        name = self.consume(TokenType.IDENTIFIER, "Expected function name").value
        
        self.consume(TokenType.LEFT_PAREN, "Expected '(' after function name")
        parameters = []
        
        if not self.check(TokenType.RIGHT_PAREN):
            parameters.append(self.consume(TokenType.IDENTIFIER, "Expected parameter name").value)
            if self.check(TokenType.COLON):
                self.advance()  # Skip type annotation
                self.advance()  # Skip type
            
            while self.match(TokenType.COMMA):
                parameters.append(self.consume(TokenType.IDENTIFIER, "Expected parameter name").value)
                if self.check(TokenType.COLON):
                    self.advance()  # Skip type annotation
                    self.advance()  # Skip type
        
        self.consume(TokenType.RIGHT_PAREN, "Expected ')' after parameters")
        
        # Skip return type if present
        if self.match(TokenType.ARROW):
            self.advance()  # Skip return type
        
        self.consume(TokenType.LEFT_BRACE, "Expected '{' to start function body")
        
        # Save function body tokens
        body_start = self.current
        brace_count = 1
        
        while brace_count > 0 and not self.is_at_end():
            if self.check(TokenType.LEFT_BRACE):
                brace_count += 1
            elif self.check(TokenType.RIGHT_BRACE):
                brace_count -= 1
            self.advance()
        
        body_tokens = self.tokens[body_start:self.current-1]
        
        # Create function
        def user_function(*args):
            # Create new environment for function
            func_env = Environment(self.interpreter.current_env)
            
            # Bind parameters
            for i, param in enumerate(parameters):
                if i < len(args):
                    func_env.define(param, args[i])
            
            # Save current environment
            prev_env = self.interpreter.current_env
            self.interpreter.current_env = func_env
            
            # Execute function body
            func_parser = Parser(body_tokens + [Token(TokenType.EOF, None, 0, 0)], self.interpreter)
            result = None
            
            try:
                while not func_parser.is_at_end():
                    result = func_parser.statement()
                    if isinstance(result, tuple) and result[0] == 'return':
                        result = result[1]
                        break
            finally:
                # Restore environment
                self.interpreter.current_env = prev_env
            
            return result
        
        # Register function
        if name == 'main':
            # Execute main function immediately
            user_function()
        else:
            self.interpreter.current_env.define_function(name, user_function)
    
    def mycelium_declaration(self):
        # Simplified mycelium handling - just skip for now
        name = self.consume(TokenType.IDENTIFIER, "Expected mycelium name").value
        self.consume(TokenType.LEFT_BRACE, "Expected '{' after mycelium name")
        
        brace_count = 1
        while brace_count > 0 and not self.is_at_end():
            if self.check(TokenType.LEFT_BRACE):
                brace_count += 1
            elif self.check(TokenType.RIGHT_BRACE):
                brace_count -= 1
            self.advance()
    
    def network_declaration(self):
        # Simplified network handling - just skip for now
        name = self.consume(TokenType.IDENTIFIER, "Expected network name").value
        self.consume(TokenType.LEFT_BRACE, "Expected '{' after network name")
        
        brace_count = 1
        while brace_count > 0 and not self.is_at_end():
            if self.check(TokenType.LEFT_BRACE):
                brace_count += 1
            elif self.check(TokenType.RIGHT_BRACE):
                brace_count -= 1
            self.advance()
    
    def signal_declaration(self):
        # Simplified signal handling - just skip for now
        name = self.consume(TokenType.IDENTIFIER, "Expected signal name").value
        self.consume(TokenType.LEFT_BRACE, "Expected '{' after signal name")
        
        brace_count = 1
        while brace_count > 0 and not self.is_at_end():
            if self.check(TokenType.LEFT_BRACE):
                brace_count += 1
            elif self.check(TokenType.RIGHT_BRACE):
                brace_count -= 1
            self.advance()
    
    def statement(self):
        if self.match(TokenType.IF):
            return self.if_statement()
        if self.match(TokenType.WHILE):
            return self.while_statement()
        if self.match(TokenType.FOR):
            return self.for_statement()
        if self.match(TokenType.RETURN):
            return self.return_statement()
        if self.match(TokenType.LET):
            return self.let_statement()
        
        return self.expression_statement()
    
    def if_statement(self):
        condition = self.expression()
        
        self.consume(TokenType.LEFT_BRACE, "Expected '{' after if condition")
        
        if self.evaluate_expression(condition):
            # Execute then branch
            while not self.check(TokenType.RIGHT_BRACE) and not self.is_at_end():
                result = self.statement()
                if isinstance(result, tuple) and result[0] == 'return':
                    return result
            self.consume(TokenType.RIGHT_BRACE, "Expected '}' to close if body")
            
            # Skip else branch if present
            if self.match(TokenType.ELSE):
                self.consume(TokenType.LEFT_BRACE, "Expected '{' after else")
                brace_count = 1
                while brace_count > 0 and not self.is_at_end():
                    if self.check(TokenType.LEFT_BRACE):
                        brace_count += 1
                    elif self.check(TokenType.RIGHT_BRACE):
                        brace_count -= 1
                    self.advance()
        else:
            # Skip then branch
            brace_count = 1
            while brace_count > 0 and not self.is_at_end():
                if self.check(TokenType.LEFT_BRACE):
                    brace_count += 1
                elif self.check(TokenType.RIGHT_BRACE):
                    brace_count -= 1
                self.advance()
            
            # Execute else branch if present
            if self.match(TokenType.ELSE):
                self.consume(TokenType.LEFT_BRACE, "Expected '{' after else")
                while not self.check(TokenType.RIGHT_BRACE) and not self.is_at_end():
                    result = self.statement()
                    if isinstance(result, tuple) and result[0] == 'return':
                        return result
                self.consume(TokenType.RIGHT_BRACE, "Expected '}' to close else body")
    
    def while_statement(self):
        condition_start = self.current
        condition = self.expression()
        
        self.consume(TokenType.LEFT_BRACE, "Expected '{' after while condition")
        
        body_start = self.current
        brace_count = 1
        
        while brace_count > 0 and not self.is_at_end():
            if self.check(TokenType.LEFT_BRACE):
                brace_count += 1
            elif self.check(TokenType.RIGHT_BRACE):
                brace_count -= 1
            self.advance()
        
        body_end = self.current - 1
        
        while self.evaluate_expression(condition):
            # Execute body
            saved_current = self.current
            self.current = body_start
            
            while self.current < body_end:
                result = self.statement()
                if isinstance(result, tuple) and result[0] == 'return':
                    self.current = body_end + 1
                    return result
            
            self.current = saved_current
            
            # Re-evaluate condition
            saved_current = self.current
            self.current = condition_start
            condition = self.expression()
            self.current = saved_current
    
    def for_statement(self):
        variable = self.consume(TokenType.IDENTIFIER, "Expected variable name").value
        self.consume(TokenType.IN, "Expected 'in' after variable")
        
        iterable = self.expression()
        
        self.consume(TokenType.LEFT_BRACE, "Expected '{' after for header")
        
        body_start = self.current
        brace_count = 1
        
        while brace_count > 0 and not self.is_at_end():
            if self.check(TokenType.LEFT_BRACE):
                brace_count += 1
            elif self.check(TokenType.RIGHT_BRACE):
                brace_count -= 1
            self.advance()
        
        body_end = self.current - 1
        
        # Evaluate iterable
        items = self.evaluate_expression(iterable)
        
        for item in items:
            # Bind loop variable
            self.interpreter.current_env.define(variable, item)
            
            # Execute body
            saved_current = self.current
            self.current = body_start
            
            while self.current < body_end:
                result = self.statement()
                if isinstance(result, tuple) and result[0] == 'return':
                    self.current = body_end + 1
                    return result
            
            self.current = saved_current
    
    def return_statement(self):
        value = None
        if not self.check(TokenType.RIGHT_BRACE) and not self.is_at_end():
            value = self.expression()
        return ('return', value)
    
    def let_statement(self):
        name = self.consume(TokenType.IDENTIFIER, "Expected variable name").value
        
        # Skip type annotation if present
        if self.match(TokenType.COLON):
            self.advance()  # Skip type
        
        self.consume(TokenType.EQUAL, "Expected '=' in let statement")
        value = self.expression()
        
        self.interpreter.current_env.define(name, self.evaluate_expression(value))
    
    def expression_statement(self):
        expr = self.expression()
        self.evaluate_expression(expr)
    
    def expression(self):
        return self.assignment()
    
    def assignment(self):
        expr = self.logical_or()
        
        if self.match(TokenType.EQUAL):
            value = self.assignment()
            if isinstance(expr, tuple) and expr[0] == 'identifier':
                self.interpreter.current_env.set(expr[1], self.evaluate_expression(value))
                return value
        
        return expr
    
    def logical_or(self):
        expr = self.logical_and()
        
        while self.match(TokenType.OR):
            op = self.previous().type
            right = self.logical_and()
            expr = ('binary', expr, op, right)
        
        return expr
    
    def logical_and(self):
        expr = self.equality()
        
        while self.match(TokenType.AND):
            op = self.previous().type
            right = self.equality()
            expr = ('binary', expr, op, right)
        
        return expr
    
    def equality(self):
        expr = self.comparison()
        
        while self.match(TokenType.EQUAL_EQUAL, TokenType.NOT_EQUAL):
            op = self.previous().type
            right = self.comparison()
            expr = ('binary', expr, op, right)
        
        return expr
    
    def comparison(self):
        expr = self.term()
        
        while self.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL):
            op = self.previous().type
            right = self.term()
            expr = ('binary', expr, op, right)
        
        return expr
    
    def term(self):
        expr = self.factor()
        
        while self.match(TokenType.MINUS, TokenType.PLUS):
            op = self.previous().type
            right = self.factor()
            expr = ('binary', expr, op, right)
        
        return expr
    
    def factor(self):
        expr = self.unary()
        
        while self.match(TokenType.SLASH, TokenType.STAR, TokenType.PERCENT):
            op = self.previous().type
            right = self.unary()
            expr = ('binary', expr, op, right)
        
        return expr
    
    def unary(self):
        if self.match(TokenType.NOT, TokenType.MINUS):
            op = self.previous().type
            right = self.unary()
            return ('unary', op, right)
        
        return self.call()
    
    def call(self):
        expr = self.primary()
        
        while True:
            if self.match(TokenType.LEFT_PAREN):
                expr = self.finish_call(expr)
            elif self.match(TokenType.DOT):
                name = self.consume(TokenType.IDENTIFIER, "Expected property name after '.'").value
                expr = ('get', expr, name)
            else:
                break
        
        return expr
    
    def finish_call(self, callee):
        arguments = []
        
        if not self.check(TokenType.RIGHT_PAREN):
            arguments.append(self.expression())
            while self.match(TokenType.COMMA):
                arguments.append(self.expression())
        
        self.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments")
        
        return ('call', callee, arguments)
    
    def primary(self):
        if self.match(TokenType.TRUE):
            return ('literal', True)
        
        if self.match(TokenType.FALSE):
            return ('literal', False)
        
        if self.match(TokenType.INTEGER):
            return ('literal', self.previous().value)
        
        if self.match(TokenType.FLOAT):
            return ('literal', self.previous().value)
        
        if self.match(TokenType.STRING):
            return ('literal', self.previous().value)
        
        if self.match(TokenType.IDENTIFIER):
            return ('identifier', self.previous().value)
        
        if self.match(TokenType.RANGE):
            return ('identifier', 'range')
        
        if self.match(TokenType.LEFT_PAREN):
            expr = self.expression()
            self.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression")
            return ('grouping', expr)
        
        if self.match(TokenType.LEFT_BRACKET):
            elements = []
            if not self.check(TokenType.RIGHT_BRACKET):
                elements.append(self.expression())
                while self.match(TokenType.COMMA):
                    elements.append(self.expression())
            self.consume(TokenType.RIGHT_BRACKET, "Expected ']' after array elements")
            return ('array', elements)
        
        raise SyntaxError(f"Unexpected token at line {self.peek().line}")
    
    def evaluate_expression(self, expr):
        if isinstance(expr, tuple):
            if expr[0] == 'literal':
                return expr[1]
            elif expr[0] == 'identifier':
                return self.interpreter.current_env.get(expr[1])
            elif expr[0] == 'binary':
                left = self.evaluate_expression(expr[1])
                op = expr[2]
                right = self.evaluate_expression(expr[3])
                
                # Ensure operands are fully evaluated
                if isinstance(left, tuple) and left[0] == 'literal':
                    left = left[1]
                if isinstance(right, tuple) and right[0] == 'literal':
                    right = right[1]
                
                if op == TokenType.PLUS:
                    return left + right
                elif op == TokenType.MINUS:
                    return left - right
                elif op == TokenType.STAR:
                    return left * right
                elif op == TokenType.SLASH:
                    return left / right
                elif op == TokenType.PERCENT:
                    return left % right
                elif op == TokenType.EQUAL_EQUAL:
                    return left == right
                elif op == TokenType.NOT_EQUAL:
                    return left != right
                elif op == TokenType.LESS:
                    return left < right
                elif op == TokenType.GREATER:
                    return left > right
                elif op == TokenType.LESS_EQUAL:
                    return left <= right
                elif op == TokenType.GREATER_EQUAL:
                    return left >= right
                elif op == TokenType.AND:
                    return left and right
                elif op == TokenType.OR:
                    return left or right
            elif expr[0] == 'unary':
                operand = self.evaluate_expression(expr[2])
                op = expr[1]
                
                if op == TokenType.MINUS:
                    return -operand
                elif op == TokenType.NOT:
                    return not operand
            elif expr[0] == 'call':
                callee = expr[1]
                arguments = [self.evaluate_expression(arg) for arg in expr[2]]
                
                if isinstance(callee, tuple) and callee[0] == 'identifier':
                    func_name = callee[1]
                    func = self.interpreter.current_env.get_function(func_name)
                    if func:
                        return func(*arguments)
                    else:
                        raise NameError(f"Undefined function: {func_name}")
            elif expr[0] == 'array':
                return [self.evaluate_expression(elem) for elem in expr[1]]
            elif expr[0] == 'grouping':
                return self.evaluate_expression(expr[1])
        
        return expr

def main():
    if len(sys.argv) < 2:
        print("Usage: python mycelium_interpreter.py <source_file.myc>")
        print("\nExample files:")
        print("  - examples/hello_world.myc")
        print("  - examples/cultivation.myc")
        print("  - examples/neural_network.myc")
        sys.exit(1)
    
    source_file = sys.argv[1]
    
    try:
        with open(source_file, 'r') as f:
            source = f.read()
        
        print(f"Running {source_file}...\n")
        interpreter = Interpreter()
        interpreter.interpret(source)
        
    except FileNotFoundError:
        print(f"Error: File '{source_file}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()