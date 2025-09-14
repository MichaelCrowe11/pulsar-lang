# Omnibus Language Specification v0.1.0

## Design Philosophy

Omnibus is designed for:
- **Performance**: Zero-cost abstractions and efficient compilation
- **Safety**: Memory safety without garbage collection overhead
- **Productivity**: Expressive syntax with powerful type inference
- **Interoperability**: Seamless integration with existing codebases
- **Enterprise**: Built-in compliance, audit, and security features

## Syntax Overview

### Variables and Types

```omnibus
// Immutable by default
let x = 42
let name = "Omnibus"

// Explicit mutability
mut counter = 0

// Type annotations (optional with inference)
let price: f64 = 299.99
let users: List<String> = []
```

### Functions

```omnibus
fn fibonacci(n: i32) -> i32 {
    match n {
        0 | 1 => n,
        _ => fibonacci(n-1) + fibonacci(n-2)
    }
}

// Generic functions
fn map<T, U>(list: List<T>, f: T -> U) -> List<U> {
    // Implementation
}
```

### Types

```omnibus
// Structs
struct User {
    id: i64,
    name: String,
    email: String,
    active: bool
}

// Enums with associated data
enum Result<T, E> {
    Ok(T),
    Err(E)
}

// Traits (interfaces)
trait Serializable {
    fn serialize(self) -> String
    fn deserialize(data: String) -> Self
}
```

### Control Flow

```omnibus
// Pattern matching
let result = match user.status {
    Status.Active => "Welcome back!",
    Status.Pending => "Please verify your email",
    Status.Suspended(reason) => f"Account suspended: {reason}"
}

// Loops
for item in collection {
    println(item)
}

// Async/await
async fn fetch_data() -> Result<Data, Error> {
    let response = await http.get("https://api.example.com/data")
    response.json()
}
```

### Modules and Imports

```omnibus
// Module definition
module math.geometry {
    pub fn area_circle(radius: f64) -> f64 {
        3.14159 * radius * radius
    }
}

// Imports
import std.io
import math.geometry.{area_circle, area_rectangle}
```

## Enterprise Features

### Compliance Annotations

```omnibus
@audit_log
@pii_sensitive
struct PatientRecord {
    @encrypt
    ssn: String,
    
    @audit_access
    medical_history: List<Condition>
}
```

### Role-Based Access

```omnibus
@requires_role("admin")
fn delete_user(id: i64) -> Result<(), Error> {
    // Implementation
}
```

## Memory Management

- Stack allocation by default
- Smart pointers for heap allocation
- No garbage collector
- Compile-time memory safety

## Type System

- Static typing with inference
- Generics with constraints
- Algebraic data types
- Effect system for async/IO operations