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
