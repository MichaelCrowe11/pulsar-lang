#[derive(Debug, Clone, PartialEq)]
pub enum TokenType {
    // Literals
    Integer(i64),
    Float(f64),
    String(String),
    Boolean(bool),
    
    // Identifiers and Keywords
    Identifier(String),
    
    // Keywords
    Let,
    Mut,
    Fn,
    Struct,
    Enum,
    Trait,
    Impl,
    Match,
    If,
    Else,
    For,
    While,
    Loop,
    Break,
    Continue,
    Return,
    Import,
    Module,
    Pub,
    Async,
    Await,
    
    // Operators
    Plus,
    Minus,
    Multiply,
    Divide,
    Modulo,
    Assign,
    Equal,
    NotEqual,
    LessThan,
    LessEqual,
    GreaterThan,
    GreaterEqual,
    LogicalAnd,
    LogicalOr,
    LogicalNot,
    BitwiseAnd,
    BitwiseOr,
    BitwiseXor,
    BitwiseNot,
    LeftShift,
    RightShift,
    
    // Delimiters
    LeftParen,
    RightParen,
    LeftBrace,
    RightBrace,
    LeftBracket,
    RightBracket,
    Comma,
    Semicolon,
    Colon,
    DoubleColon,
    Dot,
    Arrow,
    FatArrow,
    Question,
    
    // Special
    Newline,
    Whitespace(String),
    Comment(String),
    Annotation(String),
    
    // End of file
    Eof,
}

#[derive(Debug, Clone)]
pub struct Token {
    pub token_type: TokenType,
    pub lexeme: String,
    pub line: usize,
    pub column: usize,
    pub start: usize,
    pub end: usize,
}

impl Token {
    pub fn new(
        token_type: TokenType,
        lexeme: String,
        line: usize,
        column: usize,
        start: usize,
        end: usize,
    ) -> Self {
        Self {
            token_type,
            lexeme,
            line,
            column,
            start,
            end,
        }
    }
}

pub fn keyword_to_token(word: &str) -> Option<TokenType> {
    match word {
        "let" => Some(TokenType::Let),
        "mut" => Some(TokenType::Mut),
        "fn" => Some(TokenType::Fn),
        "struct" => Some(TokenType::Struct),
        "enum" => Some(TokenType::Enum),
        "trait" => Some(TokenType::Trait),
        "impl" => Some(TokenType::Impl),
        "match" => Some(TokenType::Match),
        "if" => Some(TokenType::If),
        "else" => Some(TokenType::Else),
        "for" => Some(TokenType::For),
        "while" => Some(TokenType::While),
        "loop" => Some(TokenType::Loop),
        "break" => Some(TokenType::Break),
        "continue" => Some(TokenType::Continue),
        "return" => Some(TokenType::Return),
        "import" => Some(TokenType::Import),
        "module" => Some(TokenType::Module),
        "pub" => Some(TokenType::Pub),
        "async" => Some(TokenType::Async),
        "await" => Some(TokenType::Await),
        "true" => Some(TokenType::Boolean(true)),
        "false" => Some(TokenType::Boolean(false)),
        _ => None,
    }
}