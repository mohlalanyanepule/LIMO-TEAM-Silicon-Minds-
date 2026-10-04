import { describe, it, expect } from 'vitest';
import { assemble } from '../assembler.js';
import { decode, signExtend, SUPPORTED_MNEMONICS, REGISTER_NAMES } from '../decoder.js';

function assembleOne(source) {
  return assemble(source).instructions[0];
}

describe('LIMO decoder', () => {
  describe('field extraction', () => {
    it('extracts R-type fields', () => {
      const word = assembleOne('eketsa x5, x6, x7').hex;
      const d = decode(parseInt(word, 16));
      expect(d.format).toBe('R');
      expect(d.mnemonic).toBe('eketsa');
      expect(d.english).toBe('add');
      expect(d.rd).toBe(5);
      expect(d.rs1).toBe(6);
      expect(d.rs2).toBe(7);
    });

    it('extracts I-type fields and immediate', () => {
      const d = decode(parseInt(assembleOne('eketsa-haufi x5, x6, 10').hex, 16));
      expect(d.format).toBe('I');
      expect(d.mnemonic).toBe('eketsa-haufi');
      expect(d.immediate).toBe(10);
      expect(d.usesRs2).toBe(false);
    });

    it('sign-extends a negative I-type immediate', () => {
      const d = decode(parseInt(assembleOne('eketsa-haufi x5, x6, -1').hex, 16));
      expect(d.immediate).toBe(-1);
    });

    it('extracts S-type immediate from the split field', () => {
      const positive = decode(parseInt(assembleOne('boloka x7, 2047(x6)').hex, 16));
      expect(positive.immediate).toBe(2047);
      const negative = decode(parseInt(assembleOne('boloka x7, -2048(x6)').hex, 16));
      expect(negative.immediate).toBe(-2048);
      const middle = decode(parseInt(assembleOne('boloka x7, -4(x6)').hex, 16));
      expect(middle.immediate).toBe(-4);
    });

    it('reassembles the B-type immediate from its scattered bits', () => {
      const src = 'hlahloba x5, x6, tgt\ntgt: eketsa-haufi x0, x0, 0';
      const branch = assemble(src).instructions[0];
      const target = assemble(src).instructions[1];
      const d = decode(parseInt(branch.hex, 16));
      expect(d.format).toBe('B');
      expect(d.immediate).toBe(target.address - branch.address);
      expect(d.usesRs2).toBe(true);
    });

    it('decodes a negative branch offset', () => {
      const src = 'top: eketsa-haufi x0, x0, 0\nhlahloba x5, x6, top';
      const branch = assemble(src).instructions[1];
      const d = decode(parseInt(branch.hex, 16));
      expect(d.immediate).toBe(-4);
    });
  });

  describe('round trip against the assembler', () => {
    const samples = {
      'eketsa': 'eketsa x5, x6, x7',
      'eketsa-haufi': 'eketsa-haufi x5, x6, 10',
      'fokotsa': 'fokotsa x5, x6, x7',
      'eketsa-habeli': 'eketsa-habeli x5, x6, x7',
      'bapisa-hanyane': 'bapisa-hanyane x5, x6, x7',
      'hlophisa': 'hlophisa x5, x6, x7',
      'arola': 'arola x5, x6, x7',
      'hokela': 'hokela x5, x6, x7',
      'kopanya': 'kopanya x5, x6, x7',
      'hlophisa-haufi': 'hlophisa-haufi x5, x6, 10',
      'hokela-haufi': 'hokela-haufi x5, x6, 10',
      'kopanya-haufi': 'kopanya-haufi x5, x6, 10',
      'kenya': 'kenya x5, 4(x6)',
      'boloka': 'boloka x7, 4(x6)',
      'hlahloba': 'hlahloba x5, x6, tgt\ntgt: eketsa-haufi x0, x0, 0',
      'hlahloba-fapane': 'hlahloba-fapane x5, x6, tgt\ntgt: eketsa-haufi x0, x0, 0',
    };

    it('covers every mnemonic in the ISA', () => {
      expect(Object.keys(samples).sort()).toEqual([...SUPPORTED_MNEMONICS].sort());
    });

    for (const [mnemonic, source] of Object.entries(samples)) {
      it(`decodes ${mnemonic} back to its mnemonic`, () => {
        const word = assembleOne(source).hex;
        expect(decode(parseInt(word, 16)).mnemonic).toBe(mnemonic);
      });
    }
  });

  describe('immediates that fill the upper instruction bits', () => {
    // For I, S and B formats bits 31:25 carry immediate[11:5], not funct7,
    // so the decode lookup must not depend on them.
    const cases = [
      ['eketsa-haufi x5, x6, 31', 'eketsa-haufi'],
      ['eketsa-haufi x5, x6, 32', 'eketsa-haufi'],
      ['eketsa-haufi x5, x6, 255', 'eketsa-haufi'],
      ['eketsa-haufi x5, x6, 2047', 'eketsa-haufi'],
      ['eketsa-haufi x5, x6, -1', 'eketsa-haufi'],
      ['eketsa-haufi x5, x6, -2048', 'eketsa-haufi'],
      ['hlophisa-haufi x5, x6, 255', 'hlophisa-haufi'],
      ['kopanya-haufi x5, x6, -1', 'kopanya-haufi'],
      ['kenya x5, 2044(x6)', 'kenya'],
      ['kenya x5, -2048(x6)', 'kenya'],
      ['boloka x7, 2044(x6)', 'boloka'],
      ['boloka x7, -2048(x6)', 'boloka'],
      ['hlahloba x5, x6, fwd\nfwd: eketsa-haufi x0, x0, 0', 'hlahloba'],
      ['hlahloba x5, x6, back\nback: eketsa-haufi x0, x0, 0', 'hlahloba'],
    ];

    for (const [source, mnemonic] of cases) {
      it(`decodes ${source} as ${mnemonic}`, () => {
        const word = assembleOne(source).hex;
        expect(decode(parseInt(word, 16)).mnemonic).toBe(mnemonic);
      });
    }

    it('recovers the immediate value through a wide range', () => {
      for (const value of [0, 1, 31, 32, 100, 255, 1023, 2047, -1, -32, -255, -1024, -2048]) {
        const word = assembleOne(`eketsa-haufi x5, x6, ${value}`).hex;
        expect(decode(parseInt(word, 16)).immediate).toBe(value);
      }
    });
  });

  describe('invalid words', () => {
    it('marks an all-zero word as invalid and gives no signals', () => {
      const d = decode(0);
      expect(d.valid).toBe(false);
      expect(d.mnemonic).toBeNull();
      expect(d.text).toBe('.word 0x00000000');
    });

    it('marks an unknown opcode as invalid', () => {
      const d = decode(0xffffffff);
      expect(d.valid).toBe(false);
      expect(d.format).toBe('?');
    });

    it('does not treat an inherited property as a decoded instruction', () => {
      expect(decode(0).mnemonic).not.toBe('constructor');
    });
  });

  describe('register names', () => {
    it('names all sixteen registers', () => {
      expect(REGISTER_NAMES).toHaveLength(16);
      expect(REGISTER_NAMES[0]).toBe('lefela');
    });
  });

  describe('signExtend', () => {
    it('sign-extends 12-bit and 13-bit fields', () => {
      expect(signExtend(0xfff, 12)).toBe(-1);
      expect(signExtend(0x7ff, 12)).toBe(2047);
      expect(signExtend(0x1000, 13)).toBe(-4096);
      expect(signExtend(0xfff, 13)).toBe(4095);
    });
  });
});