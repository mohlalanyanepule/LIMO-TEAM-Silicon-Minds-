// LIMO assembler - M1 spec: 16 regs (4-bit fields), 14-bit immediates, 11 instructions.

const OPC = { R: 0b0110011, I: 0b0010011, L: 0b0000011, S: 0b0100011, B: 0b1100011 };

// name -> {fmt, opcode, funct3, funct7, syntax}
const INSTR = {
  'eketsa':     { fmt: 'R', op: OPC.R, f3: 0b000, f7: 0b0000000, syn: 'rrr' },
  'fokotsa':    { fmt: 'R', op: OPC.R, f3: 0b000, f7: 0b0100000, syn: 'rrr' },
  'le':         { fmt: 'R', op: OPC.R, f3: 0b111, f7: 0b0000000, syn: 'rrr' },
  'kapa':       { fmt: 'R', op: OPC.R, f3: 0b110, f7: 0b0000000, syn: 'rrr' },
  'eketsa ho':  { fmt: 'I', op: OPC.I, f3: 0b000, syn: 'rri' },
  'kopanyetsa': { fmt: 'I', op: OPC.I, f3: 0b111, syn: 'rri' },
  'suthisa':    { fmt: 'I', op: OPC.I, f3: 0b001, syn: 'shift' },
  'jara':       { fmt: 'I', op: OPC.L, f3: 0b010, syn: 'load' },
  'boloka':     { fmt: 'S', op: OPC.S, f3: 0b010, syn: 'store' },
  'tekano':     { fmt: 'B', op: OPC.B, f3: 0b000, syn: 'branch' },
  'phapano':    { fmt: 'B', op: OPC.B, f3: 0b001, syn: 'branch' },
};

const REG_NAMES = { zero: 0, lefela: 0, ra: 1, sekhulisa_aterese: 1, sekhulisa: 1, sp: 2, lesupi: 2 };
for (let i = 0; i < 16; i++) REG_NAMES['r' + i] = i;
for (let i = 3; i < 16; i++) REG_NAMES['pokotho' + i] = i;

class AssemblerError extends Error {
  constructor(line, msg) { super(`Line ${line}: ${msg}`); this.line = line; }
}

const clean = s => s.toLowerCase().replace(/['\u2019]/g, '').trim();

function parseReg(tok, line) {
  const r = REG_NAMES[clean(tok)];
  if (r === undefined) throw new AssemblerError(line, `Unknown register "${tok}". Use r0-r15, zero, ra, sp or a Sesotho name.`);
  return r;
}

function parseImm(tok, line, lo, hi) {
  const t = tok.trim();
  if (!/^[-+]?(0x[0-9a-f]+|\d+)$/i.test(t)) throw new AssemblerError(line, `"${tok}" is not a number. Use decimal (-12) or hex (0x1F).`);
  const neg = t.startsWith('-');
  const body = t.replace(/^[-+]/, '');
  const v = (neg ? -1 : 1) * Number(body);
  if (v < lo || v > hi) throw new AssemblerError(line, `Immediate ${v} is out of range (${lo} to ${hi}).`);
  return v;
}

function parseMem(tok, line) {
  const m = tok.trim().match(/^(.+)\(([^)]+)\)$/);
  if (!m) throw new AssemblerError(line, `Memory operand "${tok}" must look like imm(rs1), e.g. 8(r2).`);
  return { imm: parseImm(m[1], line, -8192, 8191), rs1: parseReg(m[2], line) };
}

function encode(def, f) {
  let w;
  if (def.fmt === 'R') {
