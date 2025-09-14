export { Lexer } from './lexer';
export { Parser } from './parser';
export { EVMCompiler, generateCypherLib } from './compiler/evm';
export { WASMCompiler } from './compiler/wasm';
export { TemplateRegistry } from './templates';
export * from './types';
export * from './types/crypto';

import { Lexer } from './lexer';
import { Parser } from './parser';
import { EVMCompiler } from './compiler/evm';
import { WASMCompiler } from './compiler/wasm';

export class CypherLang {
  static compile(source: string, target: 'evm' | 'wasm' = 'evm'): string {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    switch (target) {
      case 'evm':
        const evmCompiler = new EVMCompiler();
        return evmCompiler.compile(ast);
        
      case 'wasm':
        const wasmCompiler = new WASMCompiler();
        return wasmCompiler.compile(ast);
        
      default:
        throw new Error(`Unsupported target: ${target}`);
    }
  }
  
  static parse(source: string) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new Parser(tokens);
    return parser.parse();
  }
  
  static tokenize(source: string) {
    const lexer = new Lexer(source);
    return lexer.tokenize();
  }
}