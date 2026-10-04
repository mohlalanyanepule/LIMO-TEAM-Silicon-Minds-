// =====================================================================
// LIMO ALU — Silicon Minds, CS3520
// 4-bit ALUControl decoder values and the execute-stage function.
// =====================================================================

export const ALU = {
  ADD: 0b0000,
  SLL: 0b0001,
  SLT: 0b0010,
  XOR: 0b0011,
  SRL: 0b0100,
  OR: 0b0101,
  AND: 0b0110,
  SUB: 0b1000,
};

export const ALU_NAMES = {
  [ALU.ADD]: 'ADD',
  [ALU.SLL]: 'SLL',
  [ALU.SLT]: 'SLT',
  [ALU.XOR]: 'XOR',
  [ALU.SRL]: 'SRL',
  [ALU.OR]: 'OR',
  [ALU.AND]: 'AND',
  [ALU.SUB]: 'SUB',
};

export function aluName(op) {
  return ALU_NAMES[op] ?? `?${op}`;
}

export function alu(op, a, b) {
  const x = a >>> 0;
  const y = b >>> 0;
  switch (op) {
    case ALU.ADD: return (x + y) >>> 0;
    case ALU.SUB: return (x - y) >>> 0;
    case ALU.SLL: return (x << (y & 0x1f)) >>> 0;
    case ALU.SRL: return (x >>> (y & 0x1f)) >>> 0;
    case ALU.XOR: return (x ^ y) >>> 0;
    case ALU.OR: return (x | y) >>> 0;
    case ALU.AND: return (x & y) >>> 0;
    case ALU.SLT: return (x | 0) < (y | 0) ? 1 : 0;
    default: throw new Error(`Unknown ALUControl value ${op}`);
  }
}