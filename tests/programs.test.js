import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assemble } from '../assembler.js';
import { Pipeline } from '../pipeline.js';

const here = dirname(fileURLToPath(import.meta.url));

function load(n) {
  return assemble(readFileSync(join(here, '..', 'examples', `program${n}.limo`), 'utf8'));
}

function run(n, forwarding = true) {
  const p = new Pipeline(load(n), { forwarding });
  p.run();
  return p;
}

// Hand-derived rule used for every expected cycle count below:
//   cycles = instructions + 4 (pipeline fill) + stalls + 2 x (taken branches that flush)
// "instructions" counts the final self-branch once.
// With forwarding OFF a dependent instruction right after its producer waits 2 cycles,
// one that is 2 instructions behind waits 1, and one that is 3 or more behind waits 0.

describe('Test programs 4 to 8 (hand-derived expectations)', () => {
  describe('Program 4 - branch NOT taken', () => {
    // r3=5, r4=6 differ, so tekano falls through and r5 = 1 executes.
    // 6 instructions + 4 = 10 cycles, no stall, no flush.
    it('falls through and executes the next instruction', () => {
      const p = run(4);
      expect([p.regs[3], p.regs[4], p.regs[5], p.regs[6]]).toEqual([5, 6, 1, 2]);
    });
    it('takes 10 cycles with no stalls and no flushes', () => {
      const p = run(4);
      expect([p.retired, p.cycle, p.stalls, p.flushes]).toEqual([6, 10, 0, 0]);
    });
    it('with forwarding OFF: tekano needs r4 from the instruction before it, 2 stalls, 12 cycles', () => {
      const p = run(4, false);
      expect([p.cycle, p.stalls]).toEqual([12, 2]);
      expect(p.regs[5]).toBe(1);
    });
  });

  describe('Program 5 - RAW chain resolved by forwarding', () => {
    // r3=1, r4=r3+r3=2, r5=r4+r4=4, r6=r5+r5=8: each uses the result just before.
    // 5 instructions + 4 = 9 cycles, no stall.
    it('computes 1, 2, 4, 8', () => {
      const p = run(5);
      expect([p.regs[3], p.regs[4], p.regs[5], p.regs[6]]).toEqual([1, 2, 4, 8]);
    });
    it('takes 9 cycles with no stalls', () => {
      const p = run(5);
      expect([p.retired, p.cycle, p.stalls]).toEqual([5, 9, 0]);
    });
    it('uses the EX/MEM forwarding path', () => {
      const p = run(5);
      expect(p.history.some((h) => h.forwardA === 'EX/MEM')).toBe(true);
    });
    it('with forwarding OFF: 3 dependences x 2 stalls = 6 stalls, 15 cycles', () => {
      const p = run(5, false);
      expect([p.cycle, p.stalls]).toEqual([15, 6]);
      expect(p.regs[6]).toBe(8);
    });
  });

  describe('Program 6 - load-use stall', () => {
    // r3=25 stored to [0], loaded into r4, then r5 = r4 + 5 = 30 right after the load.
    // 5 instructions + 4 + 1 load-use stall = 10 cycles.
    it('stores 25, loads it back, and adds 5', () => {
      const p = run(6);
      expect([p.regs[3], p.regs[4], p.regs[5]]).toEqual([25, 25, 30]);
      expect(p.dmem.get(0)).toBe(25);
    });
    it('takes 10 cycles with exactly one load-use stall', () => {
      const p = run(6);
      expect([p.retired, p.cycle, p.stalls]).toEqual([5, 10, 1]);
      expect(p.history.some((h) => h.stallReason === 'load-use')).toBe(true);
    });
    it('with forwarding OFF: 4 stalls, 13 cycles', () => {
      const p = run(6, false);
      expect([p.cycle, p.stalls]).toEqual([13, 4]);
      expect(p.regs[5]).toBe(30);
    });
  });

  describe('Program 7 - branch TAKEN (phapano) and flush', () => {
    // r3=1 differs from r0, so phapano is taken and skips two instructions.
    // 4 instructions run (r3, phapano, r6, fin): 4 + 4 + 2 flush = 10 cycles.
    it('skips the two instructions after the branch', () => {
      const p = run(7);
      expect([p.regs[3], p.regs[4], p.regs[5], p.regs[6]]).toEqual([1, 0, 0, 3]);
    });
    it('takes 10 cycles and flushes 2 instructions', () => {
      const p = run(7);
      expect([p.retired, p.cycle, p.stalls, p.flushes]).toEqual([4, 10, 0, 2]);
    });
    it('with forwarding OFF: 2 stalls, 12 cycles', () => {
      const p = run(7, false);
      expect([p.cycle, p.stalls, p.flushes]).toEqual([12, 2, 2]);
    });
  });

  describe('Program 8 - shift, logic and memory', () => {
    // r3=3; r4=3<<4=48; r5=48 AND 40=32; r6=48 OR 3=51; r7=51 AND 32=32;
    // store r6 at [8]; load it back into r8 = 51.
    // 8 instructions + 4 = 12 cycles, no stall (every use is forwarded, no load-use).
    it('computes the shift, AND, OR and AND results', () => {
      const p = run(8);
      expect([p.regs[3], p.regs[4], p.regs[5], p.regs[6], p.regs[7]]).toEqual([3, 48, 32, 51, 32]);
    });
    it('stores and loads back 51 at address 8', () => {
      const p = run(8);
      expect(p.dmem.get(8)).toBe(51);
      expect(p.regs[8]).toBe(51);
    });
    it('takes 12 cycles with no stalls', () => {
      const p = run(8);
      expect([p.retired, p.cycle, p.stalls, p.flushes]).toEqual([8, 12, 0, 0]);
    });
    it('with forwarding OFF: 6 stalls, 18 cycles, same results', () => {
      const p = run(8, false);
      expect([p.cycle, p.stalls]).toEqual([18, 6]);
      expect([p.regs[7], p.regs[8]]).toEqual([32, 51]);
    });
  });

  describe('All eight programs', () => {
    it('give the same registers and memory with forwarding ON and OFF', () => {
      for (let n = 1; n <= 8; n += 1) {
        const on = run(n, true);
        const off = run(n, false);
        expect([...off.regs]).toEqual([...on.regs]);
        expect([...off.dmem]).toEqual([...on.dmem]);
        expect(off.cycle).toBeGreaterThanOrEqual(on.cycle);
      }
    });
    it('every program halts on its self-branch', () => {
      for (let n = 1; n <= 8; n += 1) expect(run(n).haltReason).toBe('self-branch');
    });
  });
});
