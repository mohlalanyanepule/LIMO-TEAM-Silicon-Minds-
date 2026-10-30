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
