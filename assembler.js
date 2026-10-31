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
    w = (f.f7 << 22) | (f.rs2 << 18) | (f.rs1 << 14) | (def.f3 << 11) | (f.rd << 7) | def.op;
  } else if (def.fmt === 'I') {
    w = ((f.imm & 0x3fff) << 18) | (f.rs1 << 14) | (def.f3 << 11) | (f.rd << 7) | def.op;
  } else if (def.fmt === 'S') {
    const imm = f.imm & 0x3fff;
    w = ((imm >> 4) << 22) | (f.rs2 << 18) | (f.rs1 << 14) | (def.f3 << 11) | ((imm & 0xf) << 7) | def.op;
  } else { // B: offset[15:2] stored, same layout as S
    const o = (f.imm >> 2) & 0x3fff;
    w = ((o >> 4) << 22) | (f.rs2 << 18) | (f.rs1 << 14) | (def.f3 << 11) | ((o & 0xf) << 7) | def.op;
  }
  return w >>> 0;
}

function splitOperands(s) {
  return s.trim() === '' ? [] : s.split(',').map(x => x.trim());
}

function assemble(source) {
  const lines = source.split(/\r?\n/);
  const labels = {};
  const items = [];
  let pc = 0;
  // pass 1: labels and instructions
  lines.forEach((raw, idx) => {
    const ln = idx + 1;
    let text = raw.replace(/#.*$/, '').trim();
    let m;
    while ((m = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/))) {
      if (labels[m[1]] !== undefined) throw new AssemblerError(ln, `Label "${m[1]}" is defined twice.`);
      labels[m[1]] = pc;
      text = m[2].trim();
    }
    if (!text) return;
    const words = text.split(/\s+/);
    let name = clean(words[0]), rest;
    if (words[1] && INSTR[name + ' ' + clean(words[1])] && /^ho$/i.test(words[1])) {
      name = name + ' ' + clean(words[1]);
      rest = text.slice(text.indexOf(words[1]) + words[1].length);
    } else {
      rest = text.slice(words[0].length);
    }
    if (!INSTR[name]) throw new AssemblerError(ln, `Unknown instruction "${words[0]}".`);
    items.push({ ln, name, ops: splitOperands(rest), pc, text });
    pc += 4;
  });
  // pass 2: encode
  const out = items.map(it => {
    const def = INSTR[it.name], o = it.ops, ln = it.ln;
    const need = n => { if (o.length !== n) throw new AssemblerError(ln, `"${it.name}" needs ${n} operands, found ${o.length}.`); };
    let f = {};
    switch (def.syn) {
      case 'rrr': need(3); f = { rd: parseReg(o[0], ln), rs1: parseReg(o[1], ln), rs2: parseReg(o[2], ln), f7: def.f7 }; break;
      case 'rri': need(3); f = { rd: parseReg(o[0], ln), rs1: parseReg(o[1], ln), imm: parseImm(o[2], ln, -8192, 8191) }; break;
      case 'shift': need(3); f = { rd: parseReg(o[0], ln), rs1: parseReg(o[1], ln), imm: parseImm(o[2], ln, 0, 31) }; break;
      case 'load': { need(2); const m = parseMem(o[1], ln); f = { rd: parseReg(o[0], ln), rs1: m.rs1, imm: m.imm }; break; }
      case 'store': { need(2); const m = parseMem(o[1], ln); f = { rs2: parseReg(o[0], ln), rs1: m.rs1, imm: m.imm }; break; }
      case 'branch': {
        need(3);
        const target = labels[o[2]];
        if (target === undefined) throw new AssemblerError(ln, `Unknown label "${o[2]}".`);
        const off = target - it.pc;
        if (off < -32768 || off > 32764) throw new AssemblerError(ln, `Branch to "${o[2]}" is too far (${off} bytes).`);
        f = { rs1: parseReg(o[0], ln), rs2: parseReg(o[1], ln), imm: off };
        break;
      }
    }
    const word = encode(def, f);
    return { line: ln, pc: it.pc, address: it.pc, text: it.text, word, hex: '0x' + word.toString(16).toUpperCase().padStart(8, '0'),
             bin: word.toString(2).padStart(32, '0'),
             binary: word.toString(2).padStart(32, '0'), source: it.text };
  });
  return { words: out.map(x => x.word), listing: out, instructions: out, labels };
}

export { assemble, AssemblerError, INSTR, REG_NAMES };
