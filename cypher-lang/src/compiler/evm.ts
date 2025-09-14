import { Program, Contract, FunctionDecl, Circuit, ASTVisitor } from '../types';

export class EVMCompiler implements ASTVisitor<string> {
  private indentLevel = 0;
  
  compile(program: Program): string {
    return program.accept(this);
  }
  
  visitProgram(node: Program): string {
    return node.contracts.map(contract => contract.accept(this)).join('\n\n');
  }
  
  visitContract(node: Contract): string {
    const contractCode = [];
    
    contractCode.push(`// SPDX-License-Identifier: Apache-2.0`);
    contractCode.push(`pragma solidity ^0.8.19;`);
    contractCode.push('');
    
    // Import necessary libraries
    contractCode.push(`import "./CypherLib.sol";`);
    contractCode.push('');
    
    contractCode.push(`contract ${node.name} {`);
    this.indentLevel++;
    
    // State variables
    for (const stateVar of node.stateVariables) {
      const visibility = stateVar.visibility === 'public' ? 'public' : 'private';
      const solidityType = this.mapTypeToSolidity(stateVar.type);
      contractCode.push(`    ${solidityType} ${visibility} ${stateVar.name};`);
    }
    
    if (node.stateVariables.length > 0) {
      contractCode.push('');
    }
    
    // ZK verification keys for circuits
    for (const circuit of node.circuits) {
      contractCode.push(`    CypherLib.VerifyingKey private ${circuit.name}_vk;`);
    }
    
    if (node.circuits.length > 0) {
      contractCode.push('');
    }
    
    // Constructor
    if (node.circuits.length > 0) {
      contractCode.push(`    constructor() {`);
      for (const circuit of node.circuits) {
        contractCode.push(`        ${circuit.name}_vk = CypherLib.loadVerifyingKey("${circuit.name}");`);
      }
      contractCode.push(`    }`);
      contractCode.push('');
    }
    
    // Functions
    for (const func of node.functions) {
      contractCode.push(func.accept(this));
      contractCode.push('');
    }
    
    // Circuit verification functions
    for (const circuit of node.circuits) {
      contractCode.push(this.generateCircuitVerifier(circuit));
      contractCode.push('');
    }
    
    this.indentLevel--;
    contractCode.push('}');
    
    return contractCode.join('\n');
  }
  
  visitFunction(node: FunctionDecl): string {
    const params = node.parameters.map(p => 
      `${this.mapTypeToSolidity(p.type)} ${p.name}`
    ).join(', ');
    
    const returnType = node.returnType ? ` returns (${this.mapTypeToSolidity(node.returnType)})` : '';
    
    let visibility = 'public';
    let stateMutability = '';
    
    if (node.modifiers.includes('private')) {
      visibility = 'internal';
    }
    
    if (node.stateMutability) {
      switch (node.stateMutability) {
        case 'pure':
          stateMutability = ' pure';
          break;
        case 'view':
          stateMutability = ' view';
          break;
        case 'mpc':
          // MPC functions are treated as internal with special handling
          visibility = 'internal';
          break;
      }
    }
    
    const funcCode = [];
    funcCode.push(`    function ${node.name}(${params})${returnType} ${visibility}${stateMutability} {`);
    
    // Generate function body
    if (node.stateMutability === 'mpc') {
      funcCode.push(`        // MPC function - requires off-chain computation`);
      funcCode.push(`        require(false, "MPC functions must be called through secure computation protocol");`);
    } else {
      // Placeholder for function body compilation
      funcCode.push(`        // Function body would be compiled here`);
    }
    
    funcCode.push(`    }`);
    
    return funcCode.join('\n');
  }
  
  visitCircuit(node: Circuit): string {
    // Circuits are handled separately in generateCircuitVerifier
    return '';
  }
  
  visitStatement(): string {
    return '// Statement compilation not implemented';
  }
  
  visitExpression(): string {
    return '// Expression compilation not implemented';
  }
  
  visitType(): string {
    return '// Type compilation not implemented';
  }
  
  private generateCircuitVerifier(circuit: Circuit): string {
    const verifierCode = [];
    
    verifierCode.push(`    function verify${circuit.name}(`);
    
    // Public inputs
    const publicInputs = circuit.inputs.filter(input => input.visibility === 'public');
    const inputParams = publicInputs.map(input => 
      `${this.mapTypeToSolidity(input.type)} ${input.name}`
    );
    
    inputParams.push('CypherLib.Proof memory proof');
    
    verifierCode.push(`        ${inputParams.join(',\n        ')}`);
    verifierCode.push(`    ) public view returns (bool) {`);
    
    // Prepare public inputs array
    if (publicInputs.length > 0) {
      verifierCode.push(`        uint256[] memory publicInputs = new uint256[](${publicInputs.length});`);
      publicInputs.forEach((input, index) => {
        verifierCode.push(`        publicInputs[${index}] = uint256(${input.name});`);
      });
    } else {
      verifierCode.push(`        uint256[] memory publicInputs = new uint256[](0);`);
    }
    
    verifierCode.push(`        return CypherLib.verifyProof(${circuit.name}_vk, proof, publicInputs);`);
    verifierCode.push(`    }`);
    
    return verifierCode.join('\n');
  }
  
  private mapTypeToSolidity(type: any): string {
    if (typeof type === 'object' && type.name) {
      switch (type.name) {
        case 'field':
          return 'uint256';
        case 'uint256':
          return 'uint256';
        case 'bytes32':
          return 'bytes32';
        case 'bool':
          return 'bool';
        case 'address':
          return 'address';
        case 'hash':
          return 'bytes32';
        case 'signature':
          return 'bytes';
        case 'proof':
          return 'CypherLib.Proof';
        case 'commitment':
          return 'uint256';
        default:
          return 'uint256';
      }
    }
    return 'uint256';
  }
}

// Generate the supporting CypherLib.sol
export function generateCypherLib(): string {
  return `// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

library CypherLib {
    struct G1Point {
        uint256 x;
        uint256 y;
    }
    
    struct G2Point {
        uint256[2] x;
        uint256[2] y;
    }
    
    struct Proof {
        G1Point a;
        G2Point b;
        G1Point c;
    }
    
    struct VerifyingKey {
        G1Point alpha;
        G2Point beta;
        G2Point gamma;
        G2Point delta;
        G1Point[] ic;
    }
    
    uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
    
    function verifyProof(
        VerifyingKey memory vk,
        Proof memory proof,
        uint256[] memory input
    ) internal view returns (bool) {
        uint256 snark_scalar_field = SNARK_SCALAR_FIELD;
        G1Point memory vk_x = G1Point(0, 0);
        
        require(input.length + 1 == vk.ic.length, "Invalid input length");
        
        // Compute vk_x
        vk_x = addition(vk_x, vk.ic[0]);
        for (uint i = 0; i < input.length; i++) {
            require(input[i] < snark_scalar_field, "Input out of field");
            vk_x = addition(vk_x, scalar_mul(vk.ic[i + 1], input[i]));
        }
        
        return pairing(
            negate(proof.a),
            proof.b,
            vk.alpha,
            vk.beta,
            vk_x,
            vk.gamma,
            proof.c,
            vk.delta
        );
    }
    
    function loadVerifyingKey(string memory circuitName) internal pure returns (VerifyingKey memory) {
        // Placeholder - in production, this would load from storage or hardcode keys
        VerifyingKey memory vk;
        return vk;
    }
    
    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint256[4] memory input;
        input[0] = p1.x;
        input[1] = p1.y;
        input[2] = p2.x;
        input[3] = p2.y;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
        }
        require(success, "EC addition failed");
    }
    
    function scalar_mul(G1Point memory p, uint256 s) internal view returns (G1Point memory r) {
        uint256[3] memory input;
        input[0] = p.x;
        input[1] = p.y;
        input[2] = s;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
        }
        require(success, "EC scalar multiplication failed");
    }
    
    function negate(G1Point memory p) internal pure returns (G1Point memory) {
        if (p.x == 0 && p.y == 0) {
            return G1Point(0, 0);
        }
        return G1Point(p.x, PRIME_Q - (p.y % PRIME_Q));
    }
    
    function pairing(
        G1Point memory a1, G2Point memory a2,
        G1Point memory b1, G2Point memory b2,
        G1Point memory c1, G2Point memory c2,
        G1Point memory d1, G2Point memory d2
    ) internal view returns (bool) {
        uint256[24] memory input;
        input[0] = a1.x;
        input[1] = a1.y;
        input[2] = a2.x[1];
        input[3] = a2.x[0];
        input[4] = a2.y[1];
        input[5] = a2.y[0];
        input[6] = b1.x;
        input[7] = b1.y;
        input[8] = b2.x[1];
        input[9] = b2.x[0];
        input[10] = b2.y[1];
        input[11] = b2.y[0];
        input[12] = c1.x;
        input[13] = c1.y;
        input[14] = c2.x[1];
        input[15] = c2.x[0];
        input[16] = c2.y[1];
        input[17] = c2.y[0];
        input[18] = d1.x;
        input[19] = d1.y;
        input[20] = d2.x[1];
        input[21] = d2.x[0];
        input[22] = d2.y[1];
        input[23] = d2.y[0];
        
        uint256[1] memory out;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 8, input, mul(24, 0x20), out, 0x20)
        }
        require(success, "Pairing check failed");
        return out[0] != 0;
    }
    
    function poseidon(uint256[] memory inputs) internal pure returns (uint256) {
        // Placeholder for Poseidon hash implementation
        return uint256(keccak256(abi.encodePacked(inputs))) % SNARK_SCALAR_FIELD;
    }
}`;
}