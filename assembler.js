// =====================================================================
// LIMO Assembler — Silicon Minds, CS3520
// Follows the frozen LIMO ISA v1.0 (M1 specification):
//   16 registers (4-bit fields), 14-bit immediates, 11 instructions.
// =====================================================================

// ---- Register table (name -> number). Names are case-insensitive. ----
// Apostrophes are deleted from a name before it is looked up.
const REGISTERS = {
  lefela: 0, zero: 0, r0: 0,
  sekhulisa_aterese: 1, ra: 1, r1: 1,
  lesupi: 2, sp: 2, r2: 2,
};
for (let n = 3; n <= 15; n++) {
  REGISTERS['pokotho' + n] = n;
  REGISTERS['r' + n] = n;
}

// ---- Opcodes (reused from RV32I) ----
const OPCODES = {
  R: 0b0110011,
  OP_IMM: 0b0010011,
  LOAD: 0b0000011,
  STORE: 0b0100011,
  BRANCH: 0b1100011,
};

// ---- The 11 LIMO instructions ----
// 'eketsa_ho' is the internal name for the two-word mnemonic "eketsa ho".
const INSTRUCTIONS = {
  eketsa:     { format: 'R', opcode: OPCODES.R,      funct3: 0b000, funct7: 0b0000000, show: 'eketsa' },
  fokotsa:    { format: 'R', opcode: OPCODES.R,      funct3: 0b000, funct7: 0b0100000, show: 'fokotsa' },
  eketsa_ho:  { format: 'I', opcode: OPCODES.OP_IMM, funct3: 0b000, show: 'eketsa ho' },
  le:         { format: 'R', opcode: OPCODES.R,      funct3: 0b111, funct7: 0b0000000, show: 'le' },
  kapa:       { format: 'R', opcode: OPCODES.R,      funct3: 0b110, funct7: 0b0000000, show: 'kapa' },
  kopanyetsa: { format: 'I', opcode: OPCODES.OP_IMM, funct3: 0b111, show: 'kopanyetsa' },
  suthisa:    { format: 'SHIFT', opcode: OPCODES.OP_IMM, funct3: 0b001, show: 'suthisa' },
  jara:       { format: 'LOAD', opcode: OPCODES.LOAD,  funct3: 0b010, show: 'jara' },
  boloka:     { format: 'S', opcode: OPCODES.STORE,  funct3: 0b010, show: 'boloka' },
  tekano:     { format: 'B', opcode: OPCODES.BRANCH, funct3: 0b000, show: 'tekano' },
  phapano:    { format: 'B', opcode: OPCODES.BRANCH, funct3: 0b001, show: 'phapano' },
};

// ---- Error class ----
export class AssemblerError extends Error {
  constructor(message, line) {
    super(`Line ${line}: ${message}`);
    this.line = line;
  }
}

// ---- Helpers ----
function cleanName(token) {
  return token.replace(/['’]/g, '').toLowerCase();
}

function parseRegister(token, line) {
  const name = cleanName(token.trim());
  if (!Object.hasOwn(REGISTERS, name)) {
