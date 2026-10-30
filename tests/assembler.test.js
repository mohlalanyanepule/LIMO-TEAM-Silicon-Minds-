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
    w = (f.f7 << 22) | (f.rs2 << 18) | (f.rs1 << 14) | (def.f3 << 11) | (f.rd << 7) | def.op;
    
