// =====================================================================
// LIMO Instruction Decoder — Silicon Minds, CS3520
// Follows the frozen LIMO ISA v1.0 (M1 specification).
// Turns a 32-bit machine word back into named fields, plus a mnemonic and
// a readable form for the datapath and pipeline views.
//
// Field layout (4-bit register fields, 14-bit immediates):
//   R: rsv[31:29] funct7[28:22] rs2[21:18] rs1[17:14] funct3[13:11] rd[10:7] opcode[6:0]
//   I: imm[13:0][31:18] rs1[17:14] funct3[13:11] rd[10:7] opcode[6:0]
//   S: imm[13:4][31:22] rs2[21:18] rs1[17:14] funct3[13:11] imm[3:0][10:7] opcode[6:0]
//   B: off[15:6][31:22] rs2[21:18] rs1[17:14] funct3[13:11] off[5:2][10:7] opcode[6:0]
// =====================================================================

export const OPCODE = {
  R: 0b0110011,
  I_ALU: 0b0010011,
  LOAD: 0b0000011,
  STORE: 0b0100011,
  BRANCH: 0b1100011,
};

// R-type is keyed by funct3 and funct7 (bits 28:22).
// I, S and B are keyed by opcode and funct3 only: for those formats bits 28:22
// carry immediate bits, so they must not take part in the lookup.
const R_ENTRIES = new Map();
const OTHER_ENTRIES = new Map();

function register(mnemonic, english, format, opcode, funct3, funct7) {
  const target = format === 'R' ? R_ENTRIES : OTHER_ENTRIES;
  const key = format === 'R' ? `${funct3}:${funct7}` : `${opcode}:${funct3}`;
  if (target.has(key)) throw new Error(`Duplicate decode entry ${key}`);
  target.set(key, { mnemonic, english, format });
}

// R-type — opcode 0110011
register('eketsa', 'add', 'R', OPCODE.R, 0b000, 0b0000000);
register('fokotsa', 'sub', 'R', OPCODE.R, 0b000, 0b0100000);
register('kapa', 'or', 'R', OPCODE.R, 0b110, 0b0000000);
register('le', 'and', 'R', OPCODE.R, 0b111, 0b0000000);

// I-type ALU — opcode 0010011
register('eketsa ho', 'addi', 'I', OPCODE.I_ALU, 0b000, 0);
register('kopanyetsa', 'andi', 'I', OPCODE.I_ALU, 0b111, 0);
register('suthisa', 'slli', 'I', OPCODE.I_ALU, 0b001, 0);

// Memory
register('jara', 'lw', 'I', OPCODE.LOAD, 0b010, 0);
register('boloka', 'sw', 'S', OPCODE.STORE, 0b010, 0);
