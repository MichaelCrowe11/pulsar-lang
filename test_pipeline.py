#!/usr/bin/env python3

import sys
sys.path.append('synapse-lang')

from synapse_lang.synapse_lexer import Lexer, TokenType

def test_pipeline():
    source = """pipeline data_processing:
    stage input -> data:
        from source
        validate data
    stage transform:
        map data through filters
        fork:
            path normalize -> normalized
            path aggregate -> summary
        merge results
    stage output:
        into destination
"""

    lexer = Lexer(source)
    tokens = lexer.tokenize()

    print("Pipeline Tokens:")
    for token in tokens:
        if token.type != TokenType.NEWLINE:
            print(f"  {token.type.name}: {repr(token.value)}")

if __name__ == "__main__":
    test_pipeline()