export interface CircuitTemplate {
  name: string;
  description: string;
  inputs: TemplateInput[];
  constraints: string[];
  generateCircuit(params: any): string;
  generateSolidityVerifier(params: any): string;
}

interface TemplateInput {
  name: string;
  type: 'private' | 'public';
  dataType: 'field' | 'uint256' | 'bytes32';
  description: string;
}

export class MerkleTreeTemplate implements CircuitTemplate {
  name = 'merkle_proof';
  description = 'Zero-knowledge Merkle tree membership proof';
  
  inputs: TemplateInput[] = [
    { name: 'leaf', type: 'private', dataType: 'field', description: 'Leaf value to prove membership' },
    { name: 'path_elements', type: 'private', dataType: 'field', description: 'Merkle path elements' },
    { name: 'path_indices', type: 'private', dataType: 'field', description: 'Path indices (0=left, 1=right)' },
    { name: 'root', type: 'public', dataType: 'field', description: 'Merkle tree root' }
  ];
  
  constraints = [
    'leaf is valid field element',
    'path has correct length',
    'computed root equals public root'
  ];
  
  generateCircuit(params: { levels: number }): string {
    const { levels } = params;
    
    return \`pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";

template MerkleTreeChecker(levels) {
    signal private input leaf;
    signal private input pathElements[levels];
    signal private input pathIndices[levels];
    signal output root;

    component hashers[levels];
    component mux[levels];

    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        hashers[i] = Poseidon(2);
        mux[i] = MultiMux1(2);

        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== pathElements[i];
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== levelHashes[i];

        mux[i].s <== pathIndices[i];
        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].out;
    }

    root <== levelHashes[levels];
}

template MultiMux1(choices) {
    signal input c[choices][2];
    signal input s;
    signal output out[2];
    
    // Select between two inputs based on selector
    out[0] <== (1-s)*c[0][0] + s*c[1][0];
    out[1] <== (1-s)*c[0][1] + s*c[1][1];
}

component main = MerkleTreeChecker(\${levels});\`;
  }
  
  generateSolidityVerifier(params: { levels: number }): string {
    return \`// Solidity verifier for Merkle proof circuit
pragma solidity ^0.8.19;

contract MerkleProofVerifier {
    using Pairing for *;
    
    struct VerifyingKey {
        Pairing.G1Point alpha;
        Pairing.G2Point beta;
        Pairing.G2Point gamma;
        Pairing.G2Point delta;
        Pairing.G1Point[] gamma_abc;
    }
    
    VerifyingKey verifyingKey;
    
    constructor() {
        verifyingKey.alpha = Pairing.G1Point(/* alpha point */);
        verifyingKey.beta = Pairing.G2Point(/* beta point */);
        verifyingKey.gamma = Pairing.G2Point(/* gamma point */);
        verifyingKey.delta = Pairing.G2Point(/* delta point */);
        // Initialize gamma_abc array
    }
    
    function verifyMerkleProof(
        uint256 root,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c
    ) public view returns (bool) {
        uint[] memory input = new uint[](1);
        input[0] = root;
        return verifyProof(a, b, c, input);
    }
    
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[] memory input
    ) internal view returns (bool) {
        // ZK-SNARK verification logic
        return true; // Placeholder
    }
}\`;
  }
}

export class RangeProofTemplate implements CircuitTemplate {
  name = 'range_proof';
  description = 'Zero-knowledge range proof (value is within [min, max])';
  
  inputs: TemplateInput[] = [
    { name: 'value', type: 'private', dataType: 'field', description: 'Secret value to prove range of' },
    { name: 'min_value', type: 'public', dataType: 'field', description: 'Minimum allowed value' },
    { name: 'max_value', type: 'public', dataType: 'field', description: 'Maximum allowed value' }
  ];
  
  constraints = [
    'value >= min_value',
    'value <= max_value',
    'value is valid field element'
  ];
  
  generateCircuit(params: { bitLength: number }): string {
    const { bitLength } = params;
    
    return \`pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

template RangeProof(n) {
    signal private input value;
    signal input min_value;
    signal input max_value;
    signal output valid;

    component lt1 = LessThan(n);
    component lt2 = LessThan(n);
    
    // Check value >= min_value (equivalent to min_value <= value)
    lt1.in[0] <== min_value;
    lt1.in[1] <== value + 1;
    
    // Check value <= max_value
    lt2.in[0] <== value;
    lt2.in[1] <== max_value + 1;
    
    // Both conditions must be true
    valid <== lt1.out * lt2.out;
    valid === 1;
}

component main = RangeProof(\${bitLength});\`;
  }
  
  generateSolidityVerifier(params: { bitLength: number }): string {
    return \`pragma solidity ^0.8.19;

contract RangeProofVerifier {
    function verifyRangeProof(
        uint256 minValue,
        uint256 maxValue,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c
    ) public view returns (bool) {
        uint[] memory input = new uint[](2);
        input[0] = minValue;
        input[1] = maxValue;
        return verifyProof(a, b, c, input);
    }
    
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[] memory input
    ) internal view returns (bool) {
        // Range proof verification logic
        return true; // Placeholder
    }
}\`;
  }
}

export class PrivateVotingTemplate implements CircuitTemplate {
  name = 'private_voting';
  description = 'Anonymous voting with eligibility proof';
  
  inputs: TemplateInput[] = [
    { name: 'voter_id', type: 'private', dataType: 'field', description: 'Secret voter identifier' },
    { name: 'vote', type: 'private', dataType: 'field', description: 'Vote choice (0 or 1)' },
    { name: 'nullifier', type: 'private', dataType: 'field', description: 'Nullifier to prevent double voting' },
    { name: 'merkle_root', type: 'public', dataType: 'field', description: 'Merkle root of eligible voters' }
  ];
  
  constraints = [
    'voter_id is in eligible voters tree',
    'vote is either 0 or 1',
    'nullifier is correctly computed'
  ];
  
  generateCircuit(params: { merkleTreeLevels: number }): string {
    const { merkleTreeLevels } = params;
    
    return \`pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";

template PrivateVoting(levels) {
    // Private inputs
    signal private input voter_id;
    signal private input vote;
    signal private input nullifier_secret;
    signal private input path_elements[levels];
    signal private input path_indices[levels];
    
    // Public inputs
    signal input merkle_root;
    
    // Outputs
    signal output nullifier;
    signal output vote_hash;
    
    // Constraint: vote must be 0 or 1
    vote * (1 - vote) === 0;
    
    // Merkle tree membership proof
    component merkleProof = MerkleTreeChecker(levels);
    merkleProof.leaf <== voter_id;
    merkleProof.root <== merkle_root;
    for (var i = 0; i < levels; i++) {
        merkleProof.pathElements[i] <== path_elements[i];
        merkleProof.pathIndices[i] <== path_indices[i];
    }
    
    // Generate nullifier to prevent double voting
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== voter_id;
    nullifierHasher.inputs[1] <== nullifier_secret;
    nullifier <== nullifierHasher.out;
    
    // Hash the vote for privacy
    component voteHasher = Poseidon(1);
    voteHasher.inputs[0] <== vote;
    vote_hash <== voteHasher.out;
}

template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hashers[levels];
    component mux[levels];

    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        hashers[i] = Poseidon(2);
        mux[i] = MultiMux1(2);

        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== pathElements[i];
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== levelHashes[i];

        mux[i].s <== pathIndices[i];
        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].out;
    }

    root === levelHashes[levels];
}

template MultiMux1(choices) {
    signal input c[choices][2];
    signal input s;
    signal output out[2];
    
    out[0] <== (1-s)*c[0][0] + s*c[1][0];
    out[1] <== (1-s)*c[0][1] + s*c[1][1];
}

component main = PrivateVoting(\${merkleTreeLevels});\`;
  }
  
  generateSolidityVerifier(params: { merkleTreeLevels: number }): string {
    return \`pragma solidity ^0.8.19;

contract PrivateVotingVerifier {
    mapping(uint256 => bool) public nullifierHashes;
    uint256 public merkleRoot;
    uint256 public yesVotes;
    uint256 public noVotes;
    
    constructor(uint256 _merkleRoot) {
        merkleRoot = _merkleRoot;
    }
    
    function vote(
        uint256 nullifier,
        uint256 voteHash,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c
    ) public {
        require(!nullifierHashes[nullifier], "Vote already cast");
        
        uint[] memory input = new uint[](3);
        input[0] = merkleRoot;
        input[1] = nullifier;
        input[2] = voteHash;
        
        require(verifyProof(a, b, c, input), "Invalid proof");
        
        nullifierHashes[nullifier] = true;
        
        // Note: In a real implementation, you'd need to determine
        // vote value from the proof without revealing it
        // This is a simplified version
    }
    
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[] memory input
    ) internal view returns (bool) {
        // Voting proof verification logic
        return true; // Placeholder
    }
}\`;
  }
}

export class TemplateRegistry {
  private templates = new Map<string, CircuitTemplate>();
  
  constructor() {
    this.registerTemplate(new MerkleTreeTemplate());
    this.registerTemplate(new RangeProofTemplate());
    this.registerTemplate(new PrivateVotingTemplate());
  }
  
  registerTemplate(template: CircuitTemplate) {
    this.templates.set(template.name, template);
  }
  
  getTemplate(name: string): CircuitTemplate | undefined {
    return this.templates.get(name);
  }
  
  listTemplates(): CircuitTemplate[] {
    return Array.from(this.templates.values());
  }
  
  generateCircuit(templateName: string, params: any): string {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(\`Template '\${templateName}' not found\`);
    }
    return template.generateCircuit(params);
  }
  
  generateVerifier(templateName: string, params: any): string {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(\`Template '\${templateName}' not found\`);
    }
    return template.generateSolidityVerifier(params);
  }
}