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
    });
  });

  describe('round trip against the assembler', () => {
    const samples = {
      'eketsa': 'eketsa r5, r6, r7',
      'fokotsa': 'fokotsa r5, r6, r7',
      'kapa': 'kapa r5, r6, r7',
      'le': 'le r5, r6, r7',
      'eketsa ho': 'eketsa ho r5, r6, 10',
      'kopanyetsa': 'kopanyetsa r5, r6, 10',
      'suthisa': 'suthisa r5, r6, 2',
      'jara': 'jara r5, 4(r6)',
      'boloka': 'boloka r7, 4(r6)',
      'tekano': 'tekano r5, r6, tgt\ntgt: eketsa ho r0, r0, 0',
      'phapano': 'phapano r5, r6, tgt\ntgt: eketsa ho r0, r0, 0',
    };

    it('covers every mnemonic in the ISA (11 instructions)', () => {
      expect(Object.keys(samples).sort()).toEqual([...SUPPORTED_MNEMONICS].sort());
      expect(SUPPORTED_MNEMONICS).toHaveLength(11);
    });

    for (const [mnemonic, source] of Object.entries(samples)) {
      it(`decodes ${mnemonic} back to its mnemonic`, () => {
        expect(dec(source).mnemonic).toBe(mnemonic);
      });
    }
  });

  describe('immediates that fill the upper instruction bits', () => {
    // For I, S and B formats bits 31:22 carry immediate bits, not funct7,
    // so the decode lookup must not depend on them.
    const cases = [
      ['eketsa ho r5, r6, 31', 'eketsa ho'],
      ['eketsa ho r5, r6, 32', 'eketsa ho'],
      ['eketsa ho r5, r6, 255', 'eketsa ho'],
      ['eketsa ho r5, r6, 8191', 'eketsa ho'],
      ['eketsa ho r5, r6, -1', 'eketsa ho'],
      ['eketsa ho r5, r6, -8192', 'eketsa ho'],
      ['kopanyetsa r5, r6, 255', 'kopanyetsa'],
      ['kopanyetsa r5, r6, -1', 'kopanyetsa'],
      ['jara r5, 8188(r6)', 'jara'],
      ['jara r5, -8192(r6)', 'jara'],
      ['boloka r7, 8188(r6)', 'boloka'],
      ['boloka r7, -8192(r6)', 'boloka'],
      ['tekano r5, r6, fwd\nfwd: eketsa ho r0, r0, 0', 'tekano'],
      ['top: eketsa ho r0, r0, 0\nphapano r5, r6, top', 'phapano'],
    ];

    for (const [source, mnemonic] of cases) {
      it(`decodes ${source.replace(/\n/g, ' / ')} as ${mnemonic}`, () => {
        const list = assemble(source).instructions;
        const target = list.find((i) => i.text.startsWith(mnemonic + ' '));
        expect(decode(parseInt(target.hex, 16)).mnemonic).toBe(mnemonic);
      });
    }

    it('recovers the immediate value through the full 14-bit range', () => {
      for (const value of [0, 1, 31, 32, 100, 255, 1023, 4095, 8191, -1, -32, -255, -1024, -4096, -8192]) {
        expect(dec(`eketsa ho r5, r6, ${value}`).immediate).toBe(value);
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
    it('sign-extends 14-bit fields', () => {
      expect(signExtend(0x3fff, 14)).toBe(-1);
      expect(signExtend(0x1fff, 14)).toBe(8191);
      expect(signExtend(0x2000, 14)).toBe(-8192);
    });

    it('sign-extends 16-bit branch offsets', () => {
      expect(signExtend(0xffff, 16)).toBe(-1);
      expect(signExtend(0x7fff, 16)).toBe(32767);
    });
  });
});
