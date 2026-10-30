import { describe, it, expect } from 'vitest';
import { assemble, AssemblerError } from '../assembler.js';

// Helper: split a 32-bit word into its M1 fields.
const bits = (w, hi, lo) => (w >>> lo) & ((1 << (hi - lo + 1)) - 1);
const hexOf = (src, i = 0) => assemble(src).instructions[i].hex;
const wordOf = (src, i = 0) => assemble(src).instructions[i].word;

describe('LIMO Assembler (M1 spec: 4-bit registers, 14-bit immediates)', () => {
  describe('R-type instructions', () => {
    it('encodes eketsa r3, r1, r2 (add) = M1 example', () => {
      expect(hexOf('eketsa r3, r1, r2')).toBe('0x000841B3');
    });

    it('encodes fokotsa r5, r6, r7 (sub)', () => {
      expect(hexOf('fokotsa r5, r6, r7')).toBe('0x081D82B3');
    });

    it('uses the RV32I funct3/funct7 for le, kapa and fokotsa', () => {
      const le = wordOf('le r1, r2, r3');
      const kapa = wordOf('kapa r1, r2, r3');
      const sub = wordOf('fokotsa r1, r2, r3');
      expect(bits(le, 13, 11)).toBe(0b111);
      expect(bits(kapa, 13, 11)).toBe(0b110);
      expect(bits(sub, 28, 22)).toBe(0b0100000);
      expect(bits(le, 6, 0)).toBe(0b0110011);
    });

    it('accepts Sesotho register names and aliases', () => {
      expect(hexOf('eketsa pokotho3, sekhulisa_aterese, lesupi')).toBe('0x000841B3');
      expect(hexOf('eketsa r3, ra, sp')).toBe('0x000841B3');
      expect(hexOf('eketsa r0, r1, r2')).toBe(hexOf('eketsa lefela, r1, r2'));
    });

    it('rejects the old 32-register x names', () => {
      expect(() => assemble('eketsa x5, x6, x7')).toThrow(AssemblerError);
    });

    it('rejects r16 (only r0 to r15 exist)', () => {
      expect(() => assemble('eketsa r16, r1, r2')).toThrow(/Unknown register/);
    });
  });

  describe('I-type instructions', () => {
    it('encodes eketsa ho r4, r3, 10 = M1 example', () => {
      expect(hexOf('eketsa ho r4, r3, 10')).toBe('0x0028C213');
    });

    it('accepts the 14-bit limits -8192 and 8191', () => {
      expect(() => assemble('eketsa ho r1, r1, 8191')).not.toThrow();
      expect(() => assemble('eketsa ho r1, r1, -8192')).not.toThrow();
    });

    it('rejects 8192 and -8193', () => {
      expect(() => assemble('eketsa ho r1, r1, 8192')).toThrow(/out of range/);
      expect(() => assemble('eketsa ho r1, r1, -8193')).toThrow(/out of range/);
    });

    it('stores a negative immediate as 14-bit two\'s complement', () => {
      const w = wordOf('eketsa ho r1, r1, -1');
      expect(bits(w, 31, 18)).toBe(0x3fff);
    });

    it('accepts hexadecimal immediates', () => {
      expect(hexOf('eketsa ho r1, r1, 0x1F')).toBe(hexOf('eketsa ho r1, r1, 31'));
    });

    it('encodes kopanyetsa (andi) with funct3 = 111', () => {
      const w = wordOf('kopanyetsa r10, r5, 8');
      expect(bits(w, 13, 11)).toBe(0b111);
      expect(bits(w, 6, 0)).toBe(0b0010011);
      expect(bits(w, 31, 18)).toBe(8);
    });

    it('encodes suthisa (slli) with shift amount in imm[4:0]', () => {
      const w = wordOf('suthisa r11, r4, 2');
      expect(bits(w, 13, 11)).toBe(0b001);
      expect(bits(w, 31, 18)).toBe(2);
      expect(bits(w, 10, 7)).toBe(11);
      expect(bits(w, 17, 14)).toBe(4);
    });

    it('rejects a shift amount above 31', () => {
      expect(() => assemble('suthisa r1, r1, 32')).toThrow(/out of range/);
    });

    it('encodes jara r5, 0(r3) (load word)', () => {
      const w = wordOf('jara r5, 0(r3)');
      expect(bits(w, 6, 0)).toBe(0b0000011);
      expect(bits(w, 13, 11)).toBe(0b010);
      expect(bits(w, 10, 7)).toBe(5);
      expect(bits(w, 17, 14)).toBe(3);
    });
  });

  describe('S-type instructions', () => {
    it('encodes boloka r3, 20(r4) = M1 example', () => {
      expect(hexOf('boloka r3, 20(r4)')).toBe('0x004D1223');
    });

    it('splits the immediate into imm[13:4] and imm[3:0]', () => {
      const w = wordOf('boloka r3, 20(r4)');
      expect(bits(w, 31, 22)).toBe(1);
      expect(bits(w, 10, 7)).toBe(4);
    });

    it('rejects a memory operand without brackets', () => {
      expect(() => assemble('boloka r3, 20')).toThrow(/imm\(rs1\)/);
    });
  });

  describe('B-type instructions', () => {
    it('encodes tekano r1, r2, +8 = M1 example', () => {
      const src = 'tekano r1, r2, L\neketsa r1, r1, r1\nL:\neketsa r1, r1, r1';
      expect(hexOf(src)).toBe('0x00084163');
    });

    it('encodes phapano with funct3 = 001', () => {
      const w = wordOf('phapano r1, r2, L\nL:\neketsa r1, r1, r1');
      expect(bits(w, 13, 11)).toBe(0b001);
      expect(bits(w, 6, 0)).toBe(0b1100011);
    });

    it('encodes a backward branch (offset -4 bytes)', () => {
      const w = wordOf('L:\ntekano r1, r2, L', 0);
      // offset 0 here; use two lines for -4
      expect(bits(w, 6, 0)).toBe(0b1100011);
      const w2 = wordOf('L:\neketsa r1, r1, r1\ntekano r1, r2, L', 1);
      const off = (bits(w2, 31, 22) << 4) | bits(w2, 10, 7); // offset[15:2]
      expect(off).toBe(0x3fff); // -4 >> 2 = -1 in 14 bits
    });

    it('rejects an unknown label', () => {
      expect(() => assemble('tekano r1, r2, NOWHERE')).toThrow(/Unknown label/);
    });
  });

  describe('Lexical rules', () => {
    it('is case-insensitive for mnemonics and registers', () => {
      expect(hexOf('EKETSA R3, R1, R2')).toBe('0x000841B3');
    });

    it('ignores comments and blank lines', () => {
      const r = assemble('# start\n\neketsa r3, r1, r2   # add\n');
      expect(r.instructions).toHaveLength(1);
    });

    it('deletes apostrophes inside names before matching', () => {
      expect(hexOf("ek'etsa r3, r1, r2")).toBe('0x000841B3');
    });

    it('allows a label on the same line as an instruction', () => {
      const r = assemble('start: eketsa r3, r1, r2');
      expect(r.labels.start).toBe(0);
      expect(r.instructions[0].hex).toBe('0x000841B3');
    });

    it('records the address (PC) of each instruction', () => {
      const r = assemble('eketsa r1, r1, r1\neketsa r2, r2, r2');
      expect(r.instructions[1].pc).toBe(4);
    });
  });

  describe('Error handling', () => {
    it('reports an unknown instruction with the line number', () => {
      expect(() => assemble('eketsa r1, r1, r1\nfoo r1, r1, r1')).toThrow(/Line 2.*Unknown instruction/);
    });

    it('throws AssemblerError objects', () => {
      expect(() => assemble('foo')).toThrow(AssemblerError);
    });

    it('rejects the wrong number of operands', () => {
      expect(() => assemble('eketsa r1, r2')).toThrow(/needs 3 operands/);
    });

    it('rejects a duplicate label', () => {
      expect(() => assemble('L:\nL:\neketsa r1, r1, r1')).toThrow(/defined twice/);
    });

    it('rejects a non-number immediate', () => {
      expect(() => assemble('eketsa ho r1, r1, abc')).toThrow(/not a number/);
    });
  });

  describe('M1 sample programs', () => {
    it('Program 1 (arithmetic and logic) assembles to 7 instructions', () => {
      const src = [
        'eketsa r5, r3, r4', 'fokotsa r6, r3, r4', 'eketsa ho r7, r5, 4',
        'le r8, r5, r3', 'kapa r9, r3, r4', 'kopanyetsa r10, r5, 8',
        'suthisa r11, r4, 2',
      ].join('\n');
      expect(assemble(src).instructions).toHaveLength(7);
    });

    it('Program 2 (store and load) assembles to 2 instructions', () => {
      const r = assemble('boloka r4, 0(r3)\njara r5, 0(r3)');
      expect(r.instructions).toHaveLength(2);
    });

    it('Program 3 (branches) resolves both labels', () => {
      const src = [
        'tekano r3, r4, EQUAL', 'eketsa r5, r5, r3', 'EQUAL:',
        'eketsa r5, r5, r4', 'phapano r5, r3, END', 'eketsa ho r5, r5, 1', 'END:',
      ].join('\n');
      const r = assemble(src);
      expect(r.instructions).toHaveLength(5);
      expect(r.labels.EQUAL).toBe(8);
      expect(r.labels.END).toBe(20);
    });
  });
});
