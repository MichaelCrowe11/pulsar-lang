# CypherLang

**Secure Compute & Smart Contracts Language**

CypherLang is a domain-specific language designed for cryptography, zero-knowledge circuits, and smart contracts. It provides high-level abstractions for secure computation while compiling to efficient EVM bytecode and WebAssembly.

## Features

### Phase 0 (Current)
- ✅ **Free DSL + Compiler**: Complete language implementation with EVM/WASM backends
- ✅ **ZK Circuit Templates**: Pre-built templates for common cryptographic operations
- 🔄 **Security Audits**: In preparation

### Upcoming Phases
- **Phase 1**: Paid "Cypher Secure Suite" with formal verification and fuzzing
- **Phase 2**: ZK acceleration, HSM/KMS support, regulated finserv templates
- **Phase 3**: Certification program with insurance partners

## 🚀 Quick Start

```cypher
// Zero-knowledge proof of age verification
zkproof AgeVerification {
    public minimum_age: u8
    private birth_year: u16
    private current_year: u16
    
    constraint {
        current_year - birth_year >= minimum_age
        birth_year > 1900  // Sanity check
        current_year <= 2025  // Reasonable bounds
    }
}

// Homomorphic computation on encrypted data
@homomorphic
function analyze_salaries(encrypted_salaries: Vec<EncryptedU64>) -> EncryptedU64 {
    // Compute average without decrypting individual salaries
    sum = encrypted_salaries.fold(0_encrypted, |acc, salary| acc + salary)
    count = encrypted_salaries.len().encrypt()
    return sum / count
}

// Secure multi-party computation
@secure_mpc(parties: 3, threshold: 2)
function private_auction(bids: [PrivateInput<u64>; 3]) -> PublicOutput<u64> {
    // Find highest bid without revealing losing bids
    max_bid = bids.iter().max()
    reveal max_bid  // Only winner revealed
}

// Constant-time cryptographic implementation
@constant_time
function aes_encrypt(plaintext: [u8; 16], key: [u8; 16]) -> [u8; 16] {
    // Guaranteed no timing side channels
    let expanded_key = expand_key(key)
    return aes_rounds(plaintext, expanded_key)
}

// Formal verification of security properties
@verify(property: "semantic_security")
function encrypt_message(message: PlainText, key: PublicKey) -> CipherText {
    nonce = random_nonce()
    return chacha20_poly1305_encrypt(message, key, nonce)
}
```

## 📦 Installation

```bash
# Install CYPHERLANG compiler
npm install -g @cypher-lang/cli

# Or using cargo
cargo install cypher-lang

# Or download binary
curl -sSL https://get.cypherlang.org | sh
```

## 🏗️ Project Structure

```
cypher-lang/
├── compiler/           # CYPHER compiler with security analysis
├── runtime/           # Security-hardened runtime
├── crypto/            # Cryptographic primitive implementations  
├── zkp/               # Zero-knowledge proof system
├── verification/      # Formal verification engine
├── side-channel/      # Side-channel analysis tools
├── examples/          # Cryptographic examples
├── docs/              # Security documentation
└── tools/             # Security testing tools
```

## 🔧 Building from Source

```bash
git clone https://github.com/cypher-lang/cypher
cd cypher
cargo build --release --features all-crypto

# Run security tests
cargo test --features security-tests

# Run formal verification
./scripts/verify-properties.sh
```

## 🛡️ Security Features

### Cryptographic Primitives
- **Symmetric**: AES, ChaCha20, Salsa20
- **Asymmetric**: RSA, ECDSA, Ed25519, X25519
- **Hash Functions**: SHA-2, SHA-3, BLAKE3, Argon2
- **Post-Quantum**: Kyber, Dilithium, SPHINCS+

### Zero-Knowledge Proofs
- **SNARKs**: Groth16, PLONK, Marlin
- **STARKs**: FRI-based transparent proofs
- **Bulletproofs**: Range proofs and arithmetic circuits
- **Custom Circuits**: Domain-specific ZK languages

### Advanced Features
- **Secure Multi-Party Computation**: BGW, GMW protocols
- **Homomorphic Encryption**: BGV, BFV, CKKS schemes
- **Threshold Cryptography**: Shamir secret sharing
- **Oblivious Transfer**: 1-out-of-N OT protocols

## 🎯 Use Cases

### Privacy-Preserving Applications
- Anonymous voting systems
- Private set intersection
- Confidential transactions
- Privacy-preserving machine learning

### Blockchain Security
- Smart contract auditing
- Private DeFi protocols
- Encrypted blockchain storage
- Cross-chain atomic swaps

### Enterprise Security
- Secure data sharing
- Regulatory compliance (GDPR, HIPAA)
- Zero-trust architectures
- Confidential computing

## 🔬 Research Applications

### Academic Research
- Cryptographic protocol design
- Security proof automation
- Side-channel analysis
- Post-quantum cryptography

### Industry R&D
- Hardware security modules
- Secure enclave programming
- Cryptographic hardware design
- Security certification

## 📚 Documentation

- [Security Guide](./docs/security.md)
- [Cryptographic Primitives](./docs/crypto.md)
- [Zero-Knowledge Proofs](./docs/zkp.md)
- [Formal Verification](./docs/verification.md)
- [Side-Channel Protection](./docs/side-channels.md)

## 🤝 Contributing

Security contributions require special review. Please see our [Security Contributing Guide](SECURITY_CONTRIBUTING.md).

## 🔍 Security Disclosures

Please report security vulnerabilities to security@cypherlang.org following our [responsible disclosure policy](SECURITY.md).

## 📄 License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.

## 🔗 Links

- Website: https://cypherlang.org
- Documentation: https://docs.cypherlang.org
- Security Advisories: https://security.cypherlang.org
- Discord: https://discord.gg/cypherlang
- Twitter: [@cypherlang](https://twitter.com/cypherlang)

---

*CYPHERLANG: Where security meets provability*