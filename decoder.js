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

// Branch — opcode 1100011
register('tekano', 'beq', 'B', OPCODE.BRANCH, 0b000, 0);
register('phapano', 'bne', 'B', OPCODE.BRANCH, 0b001, 0);

export const SUPPORTED_MNEMONICS = [
  ...[...R_ENTRIES.values()].map((e) => e.mnemonic),
  ...[...OTHER_ENTRIES.values()].map((e) => e.mnemonic),
];

// Sign-extend the low `bits` bits of `value` to a JavaScript number.
export function signExtend(value, bits) {
  const mask = 2 ** bits - 1;
  const v = value & mask;
  return v >= 2 ** (bits - 1) ? v - 2 ** bits : v;
}

const hex32 = (w) => '0x' + (w >>> 0).toString(16).toUpperCase().padStart(8, '0');
const reg = (n) => `r${n}`;

export function decode(word) {
  const w = word >>> 0;
  const opcode = w & 0x7f;
  const rd = (w >>> 7) & 0xf;
  const funct3 = (w >>> 11) & 0x7;
  const rs1 = (w >>> 14) & 0xf;
  const rs2 = (w >>> 18) & 0xf;
  const funct7 = (w >>> 22) & 0x7f;
  const rsv = (w >>> 29) & 0x7;

  let entry;
  if (opcode === OPCODE.R) {
    entry = rsv === 0 ? R_ENTRIES.get(`${funct3}:${funct7}`) : undefined;
  } else {
    entry = OTHER_ENTRIES.get(`${opcode}:${funct3}`);
  }

  if (!entry) {
    return {
      word: w, valid: false, format: '?', mnemonic: null, english: null,
      opcode, funct3, funct7: null, rd: null, rs1: null, rs2: null,
      immediate: null, usesRs1: false, usesRs2: false, writesRd: false,
      text: `.word ${hex32(w)}`,
    };
  }

  const { mnemonic, english, format } = entry;
  const d = {
    word: w, valid: true, format, mnemonic, english, opcode, funct3,
    funct7: format === 'R' ? funct7 : null,
    rd: null, rs1: null, rs2: null, immediate: null,
    usesRs1: true, usesRs2: false, writesRd: false, text: '',
  };

  if (format === 'R') {
    Object.assign(d, { rd, rs1, rs2, usesRs2: true, writesRd: true });
    d.text = `${mnemonic} ${reg(rd)}, ${reg(rs1)}, ${reg(rs2)}`;
  } else if (format === 'I') {
    const imm = signExtend(w >>> 18, 14);
    Object.assign(d, { rd, rs1, immediate: imm, writesRd: true });
    if (mnemonic === 'suthisa') d.shamt = imm & 31;
    d.text = opcode === OPCODE.LOAD
      ? `${mnemonic} ${reg(rd)}, ${imm}(${reg(rs1)})`
      : `${mnemonic} ${reg(rd)}, ${reg(rs1)}, ${imm}`;
  } else if (format === 'S') {
    const imm = signExtend(((w >>> 22) << 4) | ((w >>> 7) & 0xf), 14);
    Object.assign(d, { rs1, rs2, immediate: imm, usesRs2: true });
    d.text = `${mnemonic} ${reg(rs2)}, ${imm}(${reg(rs1)})`;
  } else {
    // B: the stored field is offset[15:2]; the byte offset is that value times 4.
    const off = signExtend(((w >>> 22) << 4) | ((w >>> 7) & 0xf), 14) * 4;
    Object.assign(d, { rs1, rs2, immediate: off, usesRs2: true });
    d.text = `${mnemonic} ${reg(rs1)}, ${reg(rs2)}, ${off >= 0 ? '+' : ''}${off}`;
  }
  return d;
}
