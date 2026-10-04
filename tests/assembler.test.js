import { describe, it, expect } from 'vitest';
import { assemble, AssemblerError } from '../assembler.js';

describe('LIMO Assembler', () => {
  describe('R-type instructions', () => {
    it('encodes eketsa x5, x6, x7 (add)', () => {
      const { instructions } = assemble('eketsa x5, x6, x7');
      expect(instructions[0].hex).toBe('0x007302B3');
    });

    it('encodes fokotsa x5, x6, x7 (sub)', () => {
      const { instructions } = assemble('fokotsa x5, x6, x7');
      expect(instructions[0].hex).toBe('0x407302B3');
    });

    it('accepts Sesotho register names', () => {
      const { instructions } = assemble('eketsa ntho, ntho-pele, ntho-tharo');
      expect(instructions[0].hex).toBe('0x007302B3');
    });
  });

  describe('I-type instructions', () => {
    it('encodes eketsa-haufi x5, x6, 10 (addi)', () => {
      const { instructions } = assemble('eketsa-haufi x5, x6, 10');
      expect(instructions[0].hex).toBe('0x00A30293');
    });

    it('rejects immediate out of range', () => {
      expect(() => assemble('eketsa-haufi x5, x6, 3000')).toThrow(AssemblerError);
    });
  });

  describe('Memory instructions', () => {
    it('encodes kenya x5, 0(x6) (lw)', () => {
      const { instructions } = assemble('kenya x5, 0(x6)');
      expect(instructions[0].hex).toBe('0x00032283');
    });

    it('encodes boloka x7, 4(x6) (sw)', () => {
      const { instructions } = assemble('boloka x7, 4(x6)');
      expect(instructions[0].hex).toBe('0x00732223');
    });
  });

  describe('B-type instructions (branches)', () => {
    it('encodes hlahloba x5, x6, +8 (beq)', () => {
      const src = `hlahloba x5, x6, target
eketsa-haufi x0, x0, 0
target: eketsa-haufi x0, x0, 0`;
      const { instructions } = assemble(src);
      // offset = 8, funct3=000, opcode=1100011
      expect(instructions[0].hex.slice(-3)).toBe('463');
    });

    it('rejects undefined label', () => {
      expect(() => assemble('hlahloba x5, x6, nowhere')).toThrow(AssemblerError);
    });
  });

  describe('Labels and comments', () => {
    it('ignores # comments', () => {
      const src = `# this is a comment
eketsa x5, x6, x7  # trailing comment`;
      const { instructions } = assemble(src);
      expect(instructions).toHaveLength(1);
    });

    it('records label addresses', () => {
      const src = `eketsa-haufi x5, x0, 10
loop: eketsa-haufi x5, x5, 1
hlahloba x0, x0, loop`;
      const { labels } = assemble(src);
      expect(labels.loop).toBe(4);
    });
  });

  describe('Error handling', () => {
    it('rejects unknown mnemonic', () => {
      expect(() => assemble('bogus x5, x6, x7')).toThrow(/Unknown mnemonic/);
    });

    it('rejects unknown register', () => {
      expect(() => assemble('eketsa x99, x1, x2')).toThrow(/Unknown register/);
    });

    it('rejects wrong operand count', () => {
      expect(() => assemble('eketsa x5, x6')).toThrow(/needs 3 operands/);
    });
  });
});
