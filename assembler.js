// =====================================================================
// LIMO Assembler — Silicon Minds, CS3520
// Parses .limo Sesotho assembly and produces 32-bit machine code.
// =====================================================================

// ---- Register table (Sesotho name → number) ----
const REGISTERS = {
  'lefela': 0,          'x0': 0,
  'mohlophisi': 1,      'x1': 1,
  'mokgethi': 2,        'x2': 2,
  'motjha': 3,          'x3': 3,
  'motjha-pele': 4,     'x4': 4,
  'ntho': 5,            'x5': 5,
  'ntho-pele': 6,       'x6': 6,
  'ntho-tharo': 7,      'x7': 7,
  'polokelo': 8,        'x8': 8,
  'polokelo-pele': 9,   'x9': 9,
  'phetiso': 10,        'x10': 10,
  'phetiso-pele': 11,   'x11': 11,
  'phetiso-tharo': 12,  'x12': 12,
  'phetiso-ne': 13,     'x13': 13,
  'sebaka': 14,         'x14': 14,
  'sebaka-pele': 15,    'x15': 15,
};

// ---- Opcode table (RISC-V RV32I) ----
const OPCODES = {
  R: 0b0110011,
  I: 0b0010011,   // ALU immediate
  LOAD: 0b0000011,
  STORE: 0b0100011,
  BRANCH: 0b1100011,
};

// ---- Instruction definitions ----
// Each: { format, opcode, funct3, funct7, readsRs1, readsRs2, writesRd }
const INSTRUCTIONS = {
  // Arithmetic
  'eketsa':        { format: 'R', opcode: OPCODES.R, funct3: 0b000, funct7: 0b0000000 },
  'eketsa-haufi':  { format: 'I', opcode: OPCODES.I, funct3: 0b000, funct7: 0 },
  'fokotsa':       { format: 'R', opcode: OPCODES.R, funct3: 0b000, funct7: 0b0100000 },
  'eketsa-habeli': { format: 'R', opcode: OPCODES.R, funct3: 0b001, funct7: 0b0000000 },

  // Logic
  'kopanya':       { format: 'R', opcode: OPCODES.R, funct3: 0b111, funct7: 0b0000000 },
  'kopanya-haufi': { format: 'I', opcode: OPCODES.I, funct3: 0b111, funct7: 0 },
  'hokela':        { format: 'R', opcode: OPCODES.R, funct3: 0b110, funct7: 0b0000000 },
  'hokela-haufi':  { format: 'I', opcode: OPCODES.I, funct3: 0b110, funct7: 0 },
  'hlophisa':      { format: 'R', opcode: OPCODES.R, funct3: 0b100, funct7: 0b0000000 },
  'hlophisa-haufi':{ format: 'I', opcode: OPCODES.I, funct3: 0b100, funct7: 0 },
  'arola':         { format: 'R', opcode: OPCODES.R, funct3: 0b101, funct7: 0b0000000 },
  'bapisa-hanyane':{ format: 'R', opcode: OPCODES.R, funct3: 0b010, funct7: 0b0000000 },

  // Memory
  'kenya':         { format: 'I', opcode: OPCODES.LOAD,  funct3: 0b010, funct7: 0 },
  'boloka':        { format: 'S', opcode: OPCODES.STORE, funct3: 0b010, funct7: 0 },

  // Control transfer
  'hlahloba':        { format: 'B', opcode: OPCODES.BRANCH, funct3: 0b000, funct7: 0 },
  'hlahloba-fapane': { format: 'B', opcode: OPCODES.BRANCH, funct3: 0b001, funct7: 0 },
};

// ---- Error class ----
export class AssemblerError extends Error {
  constructor(message, line) {
    super(`Line ${line}: ${message}`);
    this.line = line;
  }
}

// ---- Helpers ----
function parseRegister(token, line) {
  const name = token.trim().toLowerCase();
  if (!Object.hasOwn(REGISTERS, name)) {
    throw new AssemblerError(`Unknown register "${token}" (use x0-x15 or Sesotho name)`, line);
  }
  return REGISTERS[name];
}

function parseImmediate(token, line) {
  const t = token.trim();
  let value;
  if (/^0x[0-9a-fA-F]+$/.test(t)) {
    value = parseInt(t, 16);
  } else if (/^-?\d+$/.test(t)) {
    value = parseInt(t, 10);
  } else {
    throw new AssemblerError(`Invalid immediate "${token}"`, line);
  }
  return value;
}

function checkRange(value, min, max, what, line) {
  if (value < min || value > max) {
    throw new AssemblerError(`${what} out of range [${min}, ${max}]: ${value}`, line);
  }
}

// Strip comments and blank lines
function preprocess(source) {
  return source
    .split(/\r?\n/)
    .map((raw, idx) => ({
      line: idx + 1,
      text: raw.replace(/#.*$/, '').trim(),
    }))
    .filter(({ text }) => text.length > 0);
}

// Two-pass: first pass records labels, second pass assembles
export function assemble(source) {
  const lines = preprocess(source);
  const labels = {};
  const instructions = [];

  // ---- Pass 1: collect labels ----
  let address = 0;
  for (const { line, text } of lines) {
    let body = text;
    const labelMatch = body.match(/^([a-zA-Z_][\w'-]*)\s*:\s*(.*)$/);
    if (labelMatch) {
      const label = labelMatch[1];
      if (Object.hasOwn(labels, label)) {
        throw new AssemblerError(`Duplicate label "${label}"`, line);
      }
      labels[label] = address;
      body = labelMatch[2].trim();
    }
    if (body.length > 0) {
      instructions.push({ line, text: body, address });
      address += 4;
    }
  }

  // ---- Pass 2: encode ----
  const output = [];
  for (const { line, text, address } of instructions) {
    const { word, disasm } = encodeInstruction(text, address, labels, line);
    output.push({
      address,
      hex: '0x' + word.toString(16).padStart(8, '0').toUpperCase(),
      binary: word.toString(2).padStart(32, '0'),
      source: text,
      disasm,
    });
  }

  return { labels, instructions: output };
}

// ---- Encoders for each format ----
function encodeR(mnemonic, args, spec, line) {
  if (args.length !== 3) throw new AssemblerError(`${mnemonic} needs 3 operands`, line);
  const rd = parseRegister(args[0], line);
  const rs1 = parseRegister(args[1], line);
  const rs2 = parseRegister(args[2], line);
  const word =
    (spec.funct7 << 25) |
    (rs2 << 20) |
    (rs1 << 15) |
    (spec.funct3 << 12) |
    (rd << 7) |
    spec.opcode;
  return { word: word >>> 0, disasm: `${mnemonic} x${rd}, x${rs1}, x${rs2}` };
}

function encodeI(mnemonic, args, spec, line) {
  if (args.length !== 3) throw new AssemblerError(`${mnemonic} needs 3 operands`, line);
  const rd = parseRegister(args[0], line);
  const rs1 = parseRegister(args[1], line);
  const imm = parseImmediate(args[2], line);
  checkRange(imm, -2048, 2047, 'I-type immediate', line);
  const immField = imm & 0xfff;
  const word =
    (immField << 20) |
    (rs1 << 15) |
    (spec.funct3 << 12) |
    (rd << 7) |
    spec.opcode;
  return { word: word >>> 0, disasm: `${mnemonic} x${rd}, x${rs1}, ${imm}` };
}

function encodeLoad(mnemonic, args, spec, line) {
  if (args.length !== 2) throw new AssemblerError(`${mnemonic} needs 2 operands: rd, imm(rs1)`, line);
  const rd = parseRegister(args[0], line);
  const memMatch = args[1].match(/^(-?\w+)\s*\(\s*([\w'-]+)\s*\)$/);
  if (!memMatch) throw new AssemblerError(`Expected "imm(rs1)" format`, line);
  const imm = parseImmediate(memMatch[1], line);
  const rs1 = parseRegister(memMatch[2], line);
  checkRange(imm, -2048, 2047, 'Load immediate', line);
  const immField = imm & 0xfff;
  const word =
    (immField << 20) |
    (rs1 << 15) |
    (spec.funct3 << 12) |
    (rd << 7) |
    spec.opcode;
  return { word: word >>> 0, disasm: `${mnemonic} x${rd}, ${imm}(x${rs1})` };
}

function encodeStore(mnemonic, args, spec, line) {
  if (args.length !== 2) throw new AssemblerError(`${mnemonic} needs 2 operands: rs2, imm(rs1)`, line);
  const rs2 = parseRegister(args[0], line);
  const memMatch = args[1].match(/^(-?\w+)\s*\(\s*([\w'-]+)\s*\)$/);
  if (!memMatch) throw new AssemblerError(`Expected "imm(rs1)" format`, line);
  const imm = parseImmediate(memMatch[1], line);
  const rs1 = parseRegister(memMatch[2], line);
  checkRange(imm, -2048, 2047, 'Store immediate', line);
  const imm11_5 = (imm >> 5) & 0x7f;
  const imm4_0 = imm & 0x1f;
  const word =
    (imm11_5 << 25) |
    (rs2 << 20) |
    (rs1 << 15) |
    (spec.funct3 << 12) |
    (imm4_0 << 7) |
    spec.opcode;
  return { word: word >>> 0, disasm: `${mnemonic} x${rs2}, ${imm}(x${rs1})` };
}

function encodeBranch(mnemonic, args, address, labels, spec, line) {
  if (args.length !== 3) throw new AssemblerError(`${mnemonic} needs 3 operands: rs1, rs2, label`, line);
  const rs1 = parseRegister(args[0], line);
  const rs2 = parseRegister(args[1], line);
  const label = args[2];
  if (!Object.hasOwn(labels, label)) {
    throw new AssemblerError(`Undefined label "${label}"`, line);
  }
  const target = labels[label];
  const offset = target - address;
  checkRange(offset, -4096, 4094, 'Branch offset', line);
  if (offset % 2 !== 0) {
    throw new AssemblerError(`Branch offset must be even: ${offset}`, line);
  }
  const imm = offset & 0x1fff;
  const imm12   = (imm >> 12) & 0x1;
  const imm11   = (imm >> 11) & 0x1;
  const imm10_5 = (imm >> 5)  & 0x3f;
  const imm4_1  = (imm >> 1)  & 0xf;
  const word =
    (imm12   << 31) |
    (imm10_5 << 25) |
    (rs2     << 20) |
    (rs1     << 15) |
    (spec.funct3 << 12) |
    (imm4_1  << 8)  |
    (imm11   << 7)  |
    spec.opcode;
  return { word: word >>> 0, disasm: `${mnemonic} x${rs1}, x${rs2}, ${label}` };
}

// ---- Main instruction dispatcher ----
function encodeInstruction(text, address, labels, line) {
  const tokens = text.split(/[\s,]+/).filter((t) => t.length > 0);
  const mnemonic = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  if (!Object.hasOwn(INSTRUCTIONS, mnemonic)) {
    throw new AssemblerError(`Unknown mnemonic "${mnemonic}"`, line);
  }

  const spec = INSTRUCTIONS[mnemonic];

  switch (spec.format) {
    case 'R': return encodeR(mnemonic, args, spec, line);
    case 'I':
      if (mnemonic === 'kenya') return encodeLoad(mnemonic, args, spec, line);
      return encodeI(mnemonic, args, spec, line);
    case 'S': return encodeStore(mnemonic, args, spec, line);
    case 'B': return encodeBranch(mnemonic, args, address, labels, spec, line);
    default:
      throw new AssemblerError(`Unsupported format ${spec.format}`, line);
  }
}

// Convenience: return just hex lines (for UI)
export function assembleToHex(source) {
  const result = assemble(source);
  return result.instructions.map((i) => i.hex);
}
