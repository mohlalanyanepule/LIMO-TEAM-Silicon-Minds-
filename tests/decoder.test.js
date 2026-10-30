import { describe, it, expect } from 'vitest';
import { assemble } from '../assembler.js';
import { decode, signExtend, SUPPORTED_MNEMONICS, REGISTER_NAMES } from '../decoder.js';

function assembleOne(source) {
  return assemble(source).instructions[0];
}

const dec = (source) => decode(parseInt(assembleOne(source).hex, 16));

describe('LIMO decoder (M1 spec: 4-bit registers, 14-bit immediates)', () => {
  describe('field extraction', () => {
    it('extracts R-type fields', () => {
      const d = dec('eketsa r5, r6, r7');
      expect(d.format).toBe('R');
      expect(d.mnemonic).toBe('eketsa');
      expect(d.english).toBe('add');
      expect(d.rd).toBe(5);
      expect(d.rs1).toBe(6);
      expect(d.rs2).toBe(7);
    });

    it('decodes the M1 hex example 0x000841B3 as eketsa r3, r1, r2', () => {
      const d = decode(0x000841b3);
      expect(d.mnemonic).toBe('eketsa');
      expect(d.rd).toBe(3);
      expect(d.rs1).toBe(1);
      expect(d.rs2).toBe(2);
    });

    it('extracts I-type fields and immediate', () => {
      const d = dec('eketsa ho r5, r6, 10');
      expect(d.format).toBe('I');
      expect(d.mnemonic).toBe('eketsa ho');
      expect(d.immediate).toBe(10);
      expect(d.usesRs2).toBe(false);
    });

    it('sign-extends a negative I-type immediate', () => {
      expect(dec('eketsa ho r5, r6, -1').immediate).toBe(-1);
    });

    it('extracts S-type immediate from the split field', () => {
      expect(dec('boloka r7, 8191(r6)').immediate).toBe(8191);
      expect(dec('boloka r7, -8192(r6)').immediate).toBe(-8192);
      expect(dec('boloka r7, -4(r6)').immediate).toBe(-4);
      expect(dec('boloka r3, 20(r4)').immediate).toBe(20);
    });

    it('reassembles the B-type offset (forward +8)', () => {
      const src = 'tekano r5, r6, tgt\neketsa ho r0, r0, 0\ntgt: eketsa ho r0, r0, 0';
      const branch = assemble(src).instructions[0];
      const target = assemble(src).instructions[2];
      const d = decode(parseInt(branch.hex, 16));
      expect(d.format).toBe('B');
      expect(d.immediate).toBe(target.address - branch.address);
      expect(d.immediate).toBe(8);
      expect(d.usesRs2).toBe(true);
    });

    it('decodes a negative branch offset (-4)', () => {
      const src = 'top: eketsa ho r0, r0, 0\ntekano r5, r6, top';
      const branch = assemble(src).instructions[1];
      expect(decode(parseInt(branch.hex, 16)).immediate).toBe(-4);
