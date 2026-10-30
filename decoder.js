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

// Register names: number -> Sesotho name (M1 section 2.2).
export const REGISTER_NAMES = [
  'lefela',
  'sekhulisa_aterese',
  'lesupi',
  ...Array.from({ length: 13 }, (_, i) => `pokotho${i + 3}`),
];

// R-type is keyed by funct3 and funct7 (bits 28:22).
// I, S and B are keyed by opcode and funct3 only: for those formats bits 31:22
// carry immediate bits, so they must not take part in the lookup.
const R_ENTRIES = new Map();
const OTHER_ENTRIES = new Map();
