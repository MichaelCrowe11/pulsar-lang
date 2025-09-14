grammar SynapseQubitFlow;

program: statement* EOF;

statement
    : circuitDefinition
    | vqeAlgorithm
    | qaoaAlgorithm
    | backendConfig
    | gateOperation
    | measureOperation
    ;

circuitDefinition
    : 'circuit' IDENTIFIER '(' INTEGER ')' parameterList? '{' gateOperation* '}'
    ;

parameterList
    : '(' parameter (',' parameter)* ')'
    ;

parameter
    : type IDENTIFIER ('=' expression)?
    ;

type
    : 'angle'
    | 'integer' 
    | 'real'
    ;

vqeAlgorithm
    : 'vqe' '{' 
        'ansatz:' IDENTIFIER ','
        'hamiltonian:' hamiltonianExpression ','
        'optimizer:' optimizerConfig
      '}'
    ;

qaoaAlgorithm
    : 'qaoa' '{' 
        'problem:' problemGraph ','
        'layers:' INTEGER ','
        ('mixer:' IDENTIFIER ',')?
      '}'
    ;

hamiltonianExpression
    : pauliTerm ('+' pauliTerm | '-' pauliTerm)*
    ;

pauliTerm
    : (REAL | INTEGER)? pauliOperator+
    ;

pauliOperator
    : ('I' | 'X' | 'Y' | 'Z') INTEGER
    ;

problemGraph
    : 'graph' '{' 
        'nodes:' '[' INTEGER (',' INTEGER)* ']' ','
        'edges:' '[' edge (',' edge)* ']'
      '}'
    ;

edge
    : '(' INTEGER ',' INTEGER ',' (REAL | INTEGER) ')'
    ;

optimizerConfig
    : optimizerType '{' optimizerParameter* '}'
    ;

optimizerType
    : 'COBYLA'
    | 'SPSA'
    | 'ADAM'
    ;

optimizerParameter
    : 'maxIterations:' INTEGER ','
    | 'tolerance:' REAL ','
    ;

backendConfig
    : 'backend' '{' 
        'provider:' providerType ','
        ('device:' STRING ',')?
        'shots:' INTEGER ','
        ('optimization:' BOOLEAN ',')?
      '}'
    ;

providerType
    : 'IBM'
    | 'IonQ' 
    | 'AWS'
    | 'Simulator'
    ;

gateOperation
    : gateType qubitList parameterValueList? ';'
    ;

gateType
    : 'H'     // Hadamard
    | 'X'     // Pauli-X
    | 'Y'     // Pauli-Y
    | 'Z'     // Pauli-Z
    | 'RX'    // Rotation-X
    | 'RY'    // Rotation-Y
    | 'RZ'    // Rotation-Z
    | 'CNOT'  // Controlled-NOT
    | 'CZ'    // Controlled-Z
    | 'SWAP'  // SWAP
    | 'T'     // T gate
    | 'S'     // S gate
    ;

qubitList
    : '[' INTEGER (',' INTEGER)* ']'
    ;

parameterValueList
    : '(' expression (',' expression)* ')'
    ;

measureOperation
    : 'measure' qubitList ('into' IDENTIFIER)? ';'
    ;

expression
    : REAL
    | INTEGER
    | IDENTIFIER
    | expression ('*' | '/') expression
    | expression ('+' | '-') expression
    | '(' expression ')'
    | 'pi'
    | 'theta'
    ;

// Lexer rules
REAL: [0-9]+ '.' [0-9]+;
INTEGER: [0-9]+;
BOOLEAN: 'true' | 'false';
STRING: '"' (~["\r\n])* '"';
IDENTIFIER: [a-zA-Z_][a-zA-Z0-9_]*;

// Comments
COMMENT: '//' ~[\r\n]* -> skip;
BLOCK_COMMENT: '/*' .*? '*/' -> skip;

// Whitespace
WS: [ \t\r\n]+ -> skip;