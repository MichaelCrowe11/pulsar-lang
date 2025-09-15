#!/usr/bin/env python3

import sys
sys.path.append('synapse-lang')

from synapse_lang.synapse_lexer import Lexer, TokenType

def test_symbolic_math():
    source = """symbolic equation:
    let f(x) = ∫ sin(x) dx
    let g(θ) = √(π * θ^2)
    derive ∂f/∂x = cos(x)
    solve lim x->∞ g(x)
"""

    lexer = Lexer(source)
    tokens = lexer.tokenize()

    print("Symbolic Math Tokens:")
    for token in tokens:
        if token.type != TokenType.NEWLINE:  # Skip newlines for cleaner output
            try:
                print(f"  {token.type.name}: {repr(token.value)}")
            except UnicodeEncodeError:
                print(f"  {token.type.name}: [Unicode symbol]")

if __name__ == "__main__":
    test_symbolic_math()