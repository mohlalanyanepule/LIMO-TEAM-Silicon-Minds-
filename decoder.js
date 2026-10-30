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
