import { describe, it, expect } from 'vitest';
import { assemble } from '../assembler.js';
import { decode, SUPPORTED_MNEMONICS } from '../decoder.js';
import { ALU } from '../alu.js';
import { CONTROL_TABLE, NOP_CONTROL, SIGNAL_MEANINGS, controlSignals } from '../control.js';

// Assemble the first line of `source` and return its control signals.
const ctl = (source) => controlSignals(decode(assemble(source).instructions[0].word));

describe('LIMO control unit (M1 spec)', () => {
  it('has a control entry for every one of the 11 decoder mnemonics', () => {
    for (const m of SUPPORTED_MNEMONICS) {
      expect(m in CONTROL_TABLE).toBe(true);
    }
    expect(Object.keys(CONTROL_TABLE)).toHaveLength(11);
  });

  describe('R-type', () => {
    it('eketsa: RegWrite, ALUSrc=0, ADD', () => {
      const c = ctl('eketsa r3, r1, r2');
      expect(c.RegWrite).toBe(1);
      expect(c.ALUSrc).toBe(0);
      expect(c.ALUControl).toBe(ALU.ADD);
      expect(c.MemRead).toBe(0);
      expect(c.MemWrite).toBe(0);
      expect(c.Branch).toBe(0);
    });

    it('fokotsa uses SUB, kapa uses OR, le uses AND', () => {
      expect(ctl('fokotsa r3, r1, r2').ALUControl).toBe(ALU.SUB);
      expect(ctl('kapa r3, r1, r2').ALUControl).toBe(ALU.OR);
      expect(ctl('le r3, r1, r2').ALUControl).toBe(ALU.AND);
    });
  });

  describe('I-type ALU', () => {
    it('eketsa ho: ALUSrc=1 (immediate), ADD', () => {
      const c = ctl('eketsa ho r1, r1, 5');
      expect(c.ALUSrc).toBe(1);
      expect(c.RegWrite).toBe(1);
      expect(c.ALUControl).toBe(ALU.ADD);
    });

    it('kopanyetsa uses AND and suthisa uses SLL', () => {
      expect(ctl('kopanyetsa r1, r1, 8').ALUControl).toBe(ALU.AND);
      expect(ctl('suthisa r1, r1, 2').ALUControl).toBe(ALU.SLL);
    });
  });

  describe('memory', () => {
    it('jara (load): MemRead, MemToReg and RegWrite are 1', () => {
      const c = ctl('jara r5, 0(r3)');
      expect(c.MemRead).toBe(1);
      expect(c.MemToReg).toBe(1);
      expect(c.RegWrite).toBe(1);
      expect(c.MemWrite).toBe(0);
      expect(c.ALUSrc).toBe(1);
      expect(c.ALUControl).toBe(ALU.ADD);
    });

    it('boloka (store): MemWrite is 1, RegWrite is 0', () => {
      const c = ctl('boloka r4, 0(r3)');
      expect(c.MemWrite).toBe(1);
      expect(c.RegWrite).toBe(0);
      expect(c.MemRead).toBe(0);
      expect(c.ALUSrc).toBe(1);
    });
  });

  describe('branches', () => {
    it('tekano: Branch=1, compare eq, ALU SUB, no register write', () => {
      const c = ctl('L: tekano r1, r2, L');
      expect(c.Branch).toBe(1);
      expect(c.branchCompare).toBe('eq');
      expect(c.ALUControl).toBe(ALU.SUB);
      expect(c.RegWrite).toBe(0);
    });

    it('phapano: compare ne', () => {
      expect(ctl('L: phapano r1, r2, L').branchCompare).toBe('ne');
    });
  });

  describe('invalid words and safety', () => {
    it('an invalid word gives the all-off NOP signals', () => {
      const c = controlSignals(decode(0));
      expect(c).toEqual({ ...NOP_CONTROL });
      expect(c.RegWrite).toBe(0);
      expect(c.MemWrite).toBe(0);
    });

    it('returns a fresh copy, so changing it does not change the table', () => {
      const c = ctl('eketsa r3, r1, r2');
      c.RegWrite = 0;
      expect(ctl('eketsa r3, r1, r2').RegWrite).toBe(1);
    });

    it('has a one-line meaning for every control signal', () => {
      for (const key of Object.keys(NOP_CONTROL)) {
        expect(typeof SIGNAL_MEANINGS[key]).toBe('string');
      }
    });
  });
});
