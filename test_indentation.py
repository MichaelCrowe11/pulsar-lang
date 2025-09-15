#!/usr/bin/env python3

import sys
sys.path.append('synapse-lang')

from synapse_lang.synapse_lexer import Lexer, TokenType

def test_indentation():
    source = """hypothesis test_block:
    if condition:
        statement1
        statement2
        if nested:
            nested_statement
    else:
        else_statement
    final_statement
"""

    lexer = Lexer(source)
    tokens = lexer.tokenize()

    print("Tokens:")
    for token in tokens:
        print(f"  {token.type.name}: {repr(token.value)} (line {token.line}, col {token.column})")

if __name__ == "__main__":
    test_indentation()