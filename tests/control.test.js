import { describe, it, expect } from 'vitest';
import { assemble } from '../assembler.js';
import { decode, SUPPORTED_MNEMONICS } from '../decoder.js';
import { controlFor, CONTROL_TABLE, SIGNAL_MEANINGS } from '../control.js';
import { ALU } from '../alu.js';

function signals(source) {
  const word = assemble(source).instructions[0].hex;
  return controlFor(decode(parseInt(word, 16)));
}

describe('LIMO control unit', () => {
  it('has an entry for every mnemonic in the ISA', () => {
    for (const mnemonic of SUPPORTED_MNEMONICS) {
      expect(Object.hasOwn(CONTROL_TABLE, mnemonic)).toBe(true);
    }
  });

  describe('register-writing ALU instructions', () => {
    it('eketsa reads rs2 and writes the ALU result', () => {
      const s = signals('eketsa x5, x6, x7');
      expect(s).toMatchObject({
        RegWrite: 1, ALUSrc: 0, ALUControl: ALU.ADD,
        MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
      });
    });

    it('eketsa-haufi selects the immediate as the second ALU input', () => {
      const s = signals('eketsa-haufi x5, x6, 10');
      expect(s.ALUSrc).toBe(1);
      expect(s.ALUControl).toBe(ALU.ADD);
      expect(s.RegWrite).toBe(1);
    });

    it('fokotsa selects SUB', () => {
      expect(signals('fokotsa x5, x6, x7').ALUControl).toBe(ALU.SUB);
    });

    it('eketsa-habeli selects SLL', () => {
      expect(signals('eketsa-habeli x5, x6, x7').ALUControl).toBe(ALU.SLL);
    });

    it('arola selects SRL', () => {
      expect(signals('arola x5, x6, x7').ALUControl).toBe(ALU.SRL);
    });

    it('bapisa-hanyane selects SLT', () => {
      expect(signals('bapisa-hanyane x5, x6, x7').ALUControl).toBe(ALU.SLT);
    });

    it('kopanya selects AND and hokela selects OR', () => {
      expect(signals('kopanya x5, x6, x7').ALUControl).toBe(ALU.AND);
      expect(signals('hokela x5, x6, x7').ALUControl).toBe(ALU.OR);
    });

    it('hlophisa selects XOR', () => {
      expect(signals('hlophisa x5, x6, x7').ALUControl).toBe(ALU.XOR);
    });

    it('sets MemToReg only on loads', () => {
      expect(signals('kenya x5, 0(x6)').MemToReg).toBe(1);
      expect(signals('boloka x5, 0(x6)').MemToReg).toBe(0);
      expect(signals('eketsa x5, x6, x7').MemToReg).toBe(0);
    });
  });

  describe('memory instructions', () => {
    it('kenya reads memory into rd', () => {
      expect(signals('kenya x5, 0(x6)')).toMatchObject({
        RegWrite: 1, MemRead: 1, MemWrite: 0, MemToReg: 1, ALUSrc: 1,
      });
    });

    it('boloka writes memory and never writes a register', () => {
      const s = signals('boloka x7, 4(x6)');
      expect(s).toMatchObject({
        RegWrite: 0, MemRead: 0, MemWrite: 1, MemToReg: 0, ALUSrc: 1,
      });
      expect(s.writesRd).toBe(0);
    });
  });

  describe('branches', () => {
    const branchSrc = 'hlahloba x5, x6, tgt\ntgt: eketsa-haufi x0, x0, 0';

    it('hlahloba raises Branch and PCSrc and compares for equality', () => {
      const s = signals(branchSrc);
      expect(s).toMatchObject({
        RegWrite: 0, MemRead: 0, MemWrite: 0, MemToReg: 0,
        Branch: 1, PCSrc: 1, ALUSrc: 0,
      });
      expect(s.branchCompare).toBe('eq');
    });

    it('hlahloba-fapane compares for inequality', () => {
      const src = 'hlahloba-fapane x5, x6, tgt\ntgt: eketsa-haufi x0, x0, 0';
      expect(signals(src).branchCompare).toBe('ne');
    });
  });

  describe('invalid instructions', () => {
    it('raises no signals for an undecodable word', () => {
      const s = controlFor(decode(0));
      expect(s).toMatchObject({
        RegWrite: 0, ALUSrc: 0, MemRead: 0, MemWrite: 0,
        MemToReg: 0, Branch: 0, PCSrc: 0,
      });
    });
  });

  describe('documentation', () => {
    it('explains every control signal the handout lists', () => {
      for (const signal of ['RegWrite', 'ALUSrc', 'ALUControl', 'MemRead',
        'MemWrite', 'MemToReg', 'Branch', 'PCSrc']) {
        expect(SIGNAL_MEANINGS[signal]).toBeTruthy();
      }
    });
  });
});