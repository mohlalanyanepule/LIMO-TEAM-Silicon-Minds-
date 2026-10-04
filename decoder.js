// =====================================================================
// LIMO Instruction Decoder — Silicon Minds, CS3520
// Turns a 32-bit machine word back into named fields, plus a mnemonic and
// a readable form for the datapath and pipeline views.
// =====================================================================

export const OPCODE = {
  R: 0b0110011,
  I_ALU: 0b0010011,
  LOAD: 0b0000011,
  STORE: 0b0100011,
  BRANCH: 0b1100011,
};

// R-type is keyed by funct3 and funct7, because bits 31:25 are funct7.
// I, S and B are keyed by opcode and funct3 only: for those formats the
// same bits carry immediate[11:5], so they must not take part in the lookup.
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
register('eketsa-habeli', 'sll', 'R', OPCODE.R, 0b001, 0b0000000);
register('bapisa-hanyane', 'slt', 'R', OPCODE.R, 0b010, 0b0000000);
register('hlophisa', 'xor', 'R', OPCODE.R, 0b100, 0b0000000);
register('arola', 'srl', 'R', OPCODE.R, 0b101, 0b0000000);
register('hokela', 'or', 'R', OPCODE.R, 0b110, 0b0000000);
register('kopanya', 'and', 'R', OPCODE.R, 0b111, 0b0000000);

// I-type ALU — opcode 0010011
register('eketsa-haufi', 'addi', 'I', OPCODE.I_ALU, 0b000, 0);
register('hlophisa-haufi', 'xori', 'I', OPCODE.I_ALU, 0b100, 0);
register('hokela-haufi', 'ori', 'I', OPCODE.I_ALU, 0b110, 0);
register('kopanya-haufi', 'andi', 'I', OPCODE.I_ALU, 0b111, 0);

// Memory
register('kenya', 'lw', 'I', OPCODE.LOAD, 0b010, 0);
register('boloka', 'sw', 'S', OPCODE.STORE, 0b010, 0);

// Branches
register('hlahloba', 'beq', 'B', OPCODE.BRANCH, 0b000, 0);
register('hlahloba-fapane', 'bne', 'B', OPCODE.BRANCH, 0b001, 0);

export const REGISTER_NAMES = [
  'lefela', 'mohlophisi', 'mokgethi', 'motjha',
  'motjha-pele', 'ntho', 'ntho-pele', 'ntho-tharo',
  'polokelo', 'polokelo-pele', 'phetiso', 'phetiso-pele',
  'phetiso-tharo', 'phetiso-ne', 'sebaka', 'sebaka-pele',
];

function formatForOpcode(opcode) {
  switch (opcode) {
    case OPCODE.BRANCH: return 'B';
    case OPCODE.STORE: return 'S';
    case OPCODE.LOAD:
    case OPCODE.I_ALU: return 'I';
    case OPCODE.R: return 'R';
    default: return '?';
  }
}

export function signExtend(value, bits) {
  const shift = 32 - bits;
  return (value << shift) >> shift;
}

export function decode(word) {
  const w = word >>> 0;
  const opcode = w & 0x7f;
  const rd = (w >>> 7) & 0x1f;
  const funct3 = (w >>> 12) & 0x7;
  const rs1 = (w >>> 15) & 0x1f;
  const rs2 = (w >>> 20) & 0x1f;
  const funct7 = (w >>> 25) & 0x7f;

  const entry = opcode === OPCODE.R
    ? R_ENTRIES.get(`${funct3}:${funct7}`)
    : OTHER_ENTRIES.get(`${opcode}:${funct3}`);
  const format = entry ? entry.format : formatForOpcode(opcode);

  let immediate = 0;
  if (format === 'I') {
    immediate = signExtend(w >>> 20, 12);
  } else if (format === 'S') {
    immediate = signExtend((funct7 << 5) | rd, 12);
  } else if (format === 'B') {
    immediate = signExtend(
      (((w >>> 31) & 0x1) << 12) |
      (((w >>> 25) & 0x3f) << 5) |
      (((w >>> 8) & 0xf) << 1) |
      (((w >>> 7) & 0x1) << 11),
      13,
    );
  }

  const usesRs2 = format === 'R' || format === 'S' || format === 'B';

  return {
    word: w,
    opcode,
    funct3,
    funct7,
    rd,
    rs1,
    rs2,
    format,
    immediate,
    valid: Boolean(entry),
    mnemonic: entry ? entry.mnemonic : null,
    english: entry ? entry.english : null,
    usesRs1: format !== '?',
    usesRs2,
    text: entry ? formatOperands(entry, format, rd, rs1, rs2, immediate) : `.word 0x${w.toString(16).padStart(8, '0')}`,
  };
}

function reg(n) {
  return `x${n}`;
}

function formatOperands(entry, format, rd, rs1, rs2, immediate) {
  const m = entry.mnemonic;
  switch (format) {
    case 'R': return `${m} ${reg(rd)}, ${reg(rs1)}, ${reg(rs2)}`;
    case 'I':
      if (entry.english === 'lw') return `${m} ${reg(rd)}, ${immediate}(${reg(rs1)})`;
      return `${m} ${reg(rd)}, ${reg(rs1)}, ${immediate}`;
    case 'S': return `${m} ${reg(rs2)}, ${immediate}(${reg(rs1)})`;
    case 'B': return `${m} ${reg(rs1)}, ${reg(rs2)}, ?`;
    default: return m;
  }
}

export const SUPPORTED_MNEMONICS = [...new Set(
  [...R_ENTRIES.values(), ...OTHER_ENTRIES.values()].map((e) => e.mnemonic),
)];