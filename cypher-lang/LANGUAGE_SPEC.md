# CypherLang Language Specification

## Overview
CypherLang is a domain-specific language designed for secure computation, cryptography, zero-knowledge circuits, and smart contracts. It provides high-level abstractions for cryptographic operations while compiling to efficient EVM bytecode and WASM.

## Core Types

### Primitive Types
- `field` - Field element for ZK circuits
- `uint256` - 256-bit unsigned integer (EVM compatible)
- `bytes32` - 32-byte array
- `bool` - Boolean value
- `address` - Ethereum address type

### Cryptographic Types
- `hash` - Cryptographic hash result
- `signature` - Digital signature
- `proof` - Zero-knowledge proof
- `commitment` - Commitment scheme value
- `secret<T>` - Secret-shared value of type T

### Circuit Types
- `constraint` - ZK constraint
- `witness` - Private witness value
- `public_input` - Public circuit input

## Language Constructs

### Contract Definition
```cypher
contract SecureVoting {
    // State variables
    field total_votes;
    mapping(address => bool) has_voted;
    
    // ZK circuit for private voting
    circuit vote_verification {
        private witness voter_id;
        public input ballot_hash;
        
        constraint voter_eligible(voter_id);
        constraint valid_vote(ballot_hash);
    }
}
```

### Function Types
- `pure` - No state access, deterministic
- `view` - Read-only state access
- `private` - ZK-verified execution
- `mpc` - Multi-party computation

### ZK Circuit Syntax
```cypher
circuit merkle_proof {
    private witness leaf;
    private witness[8] path;
    public input root;
    
    field current = leaf;
    for i in 0..8 {
        current = hash(current, path[i]);
    }
    constraint current == root;
}
```

### MPC Operations
```cypher
mpc function secure_auction(secret<uint256> bid) -> uint256 {
    let winner = argmax(bid);
    reveal winner;
}
```

## Built-in Functions

### Cryptographic Primitives
- `hash(bytes) -> bytes32` - Keccak256 hash
- `poseidon(field[]) -> field` - Poseidon hash for ZK
- `verify_signature(bytes32, signature, address) -> bool`
- `pedersen_commit(field, field) -> commitment`

### ZK Operations
- `prove(circuit, witness) -> proof`
- `verify(proof, public_inputs) -> bool`
- `constraint(bool)` - Add circuit constraint

### MPC Operations
- `share(T) -> secret<T>` - Create secret shares
- `reveal(secret<T>) -> T` - Reveal shared secret
- `secure_add(secret<T>, secret<T>) -> secret<T>`

## Security Features

### Access Control
```cypher
modifier only_owner {
    require(msg.sender == owner);
    _;
}

modifier zk_verified(proof p) {
    require(verify(p, public_inputs));
    _;
}
```

### Formal Verification Annotations
```cypher
@ensures(result > 0)
@requires(input != 0)
function safe_divide(uint256 a, uint256 b) -> uint256 {
    return a / b;
}
```

## Compilation Targets

### EVM Backend
- Compiles to Solidity-compatible bytecode
- Gas optimization for cryptographic operations
- Support for existing toolchain (Hardhat, Foundry)

### WASM Backend
- Standalone cryptographic computations
- Client-side ZK proof generation
- Cross-platform execution

## Standard Library

### Templates
- `StandardHash` - Common hash functions
- `MerkleTree` - Merkle tree operations
- `RangeProof` - Zero-knowledge range proofs
- `PrivateVoting` - Anonymous voting schemes
- `SecureAuction` - Private bidding mechanisms