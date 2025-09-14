export interface CryptoType {
  name: string;
  size: number;
  operations: string[];
}

export class FieldElement implements CryptoType {
  name = 'field';
  size = 32; // 256 bits
  operations = ['add', 'subtract', 'multiply', 'divide', 'inverse', 'square'];
  
  static readonly MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  
  constructor(public value: bigint = 0n) {
    this.value = this.reduce(value);
  }
  
  private reduce(value: bigint): bigint {
    return ((value % FieldElement.MODULUS) + FieldElement.MODULUS) % FieldElement.MODULUS;
  }
  
  add(other: FieldElement): FieldElement {
    return new FieldElement(this.value + other.value);
  }
  
  subtract(other: FieldElement): FieldElement {
    return new FieldElement(this.value - other.value);
  }
  
  multiply(other: FieldElement): FieldElement {
    return new FieldElement(this.value * other.value);
  }
  
  toString(): string {
    return this.value.toString();
  }
}

export class Hash implements CryptoType {
  name = 'hash';
  size = 32;
  operations = ['keccak256', 'poseidon', 'pedersen'];
  
  constructor(public value: Uint8Array) {
    if (value.length !== 32) {
      throw new Error('Hash must be exactly 32 bytes');
    }
  }
  
  toString(): string {
    return '0x' + Array.from(this.value).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  equals(other: Hash): boolean {
    return this.value.every((byte, index) => byte === other.value[index]);
  }
}

export class Signature implements CryptoType {
  name = 'signature';
  size = 65; // r(32) + s(32) + v(1)
  operations = ['verify', 'recover'];
  
  constructor(
    public r: Uint8Array,
    public s: Uint8Array,
    public v: number
  ) {
    if (r.length !== 32 || s.length !== 32) {
      throw new Error('Signature components r and s must be 32 bytes each');
    }
    if (v !== 27 && v !== 28) {
      throw new Error('Signature recovery id v must be 27 or 28');
    }
  }
  
  toBytes(): Uint8Array {
    const result = new Uint8Array(65);
    result.set(this.r, 0);
    result.set(this.s, 32);
    result[64] = this.v;
    return result;
  }
}

export class ZKProof implements CryptoType {
  name = 'proof';
  size = 192; // Typical SNARK proof size
  operations = ['verify', 'aggregate'];
  
  constructor(
    public a: [FieldElement, FieldElement],
    public b: [[FieldElement, FieldElement], [FieldElement, FieldElement]],
    public c: [FieldElement, FieldElement]
  ) {}
  
  verify(publicInputs: FieldElement[], verifyingKey: any): boolean {
    // Placeholder for ZK proof verification
    return true;
  }
}

export class Commitment implements CryptoType {
  name = 'commitment';
  size = 32;
  operations = ['open', 'verify_opening'];
  
  constructor(
    public value: FieldElement,
    private randomness?: FieldElement
  ) {}
  
  open(): { value: FieldElement; randomness: FieldElement } {
    if (!this.randomness) {
      throw new Error('Cannot open commitment without randomness');
    }
    return { value: this.value, randomness: this.randomness };
  }
}

export class SecretShare<T extends CryptoType> {
  constructor(
    public share: T,
    public threshold: number,
    public totalShares: number,
    public shareId: number
  ) {}
  
  static create<T extends CryptoType>(
    secret: T,
    threshold: number,
    totalShares: number
  ): SecretShare<T>[] {
    // Placeholder for Shamir's secret sharing
    const shares: SecretShare<T>[] = [];
    for (let i = 1; i <= totalShares; i++) {
      shares.push(new SecretShare(secret, threshold, totalShares, i));
    }
    return shares;
  }
  
  static reconstruct<T extends CryptoType>(shares: SecretShare<T>[]): T {
    if (shares.length < shares[0].threshold) {
      throw new Error('Insufficient shares for reconstruction');
    }
    // Placeholder for Lagrange interpolation
    return shares[0].share;
  }
}

export class TypeChecker {
  private types = new Map<string, CryptoType>();
  
  constructor() {
    this.registerBuiltinTypes();
  }
  
  private registerBuiltinTypes() {
    this.types.set('field', new FieldElement());
    this.types.set('hash', new Hash(new Uint8Array(32)));
    this.types.set('signature', new Signature(new Uint8Array(32), new Uint8Array(32), 27));
    this.types.set('proof', new ZKProof(
      [new FieldElement(), new FieldElement()],
      [[new FieldElement(), new FieldElement()], [new FieldElement(), new FieldElement()]],
      [new FieldElement(), new FieldElement()]
    ));
    this.types.set('commitment', new Commitment(new FieldElement()));
  }
  
  getType(name: string): CryptoType | undefined {
    return this.types.get(name);
  }
  
  isCompatible(type1: string, type2: string): boolean {
    const t1 = this.getType(type1);
    const t2 = this.getType(type2);
    
    if (!t1 || !t2) return false;
    
    return t1.name === t2.name;
  }
  
  canPerformOperation(type: string, operation: string): boolean {
    const t = this.getType(type);
    return t ? t.operations.includes(operation) : false;
  }
}