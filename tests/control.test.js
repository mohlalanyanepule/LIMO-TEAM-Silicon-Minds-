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
