import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assemble } from '../assembler.js';
import { Pipeline } from '../pipeline.js';

const here = dirname(fileURLToPath(import.meta.url));

function example(number) {
  const source = readFileSync(join(here, '..', 'examples', `program${number}.limo`), 'utf8');
  return assemble(source);
}

function run(source, options) {
  const pipeline = new Pipeline(assemble(source), options);
  pipeline.run();
  return pipeline;
}

// A branch to itself stops the machine.
const HALT = 'fin: tekano lefela, lefela, fin';

// Cycle rule worked out by hand: the last of n instructions leaves WB in cycle
// n + 4; every stall adds 1 cycle and every taken branch adds 2.

describe('LIMO five-stage pipeline (M1 ISA, 16 registers)', () => {
  describe('example program 1 - arithmetic and logic', () => {
    const pipeline = new Pipeline(example(1));
    pipeline.run();

    it('matches the M1 sample results', () => {
      const r = pipeline.regs;
      expect([r[5], r[6], r[7], r[8], r[9], r[10], r[11]]).toEqual([12, 2, 16, 4, 7, 8, 20]);
    });

    it('leaves r3 and r4 unchanged', () => {
      expect(pipeline.regs[3]).toBe(7);
      expect(pipeline.regs[4]).toBe(5);
    });

    it('halts on the self branch', () => {
      expect(pipeline.haltedNaturally).toBe(true);
      expect(pipeline.haltReason).toBe('self-branch');
    });

    it('takes 14 cycles for 10 instructions with no stalls or flushes (10 + 4)', () => {
      expect(pipeline.cycle).toBe(14);
      expect(pipeline.retired).toBe(10);
      expect(pipeline.stalls).toBe(0);
      expect(pipeline.flushes).toBe(0);
    });
  });

  describe('example program 2 - array sum with a loop', () => {
    const pipeline = new Pipeline(example(2));
    pipeline.run();

    it('sums the five stored elements into r6 = 150', () => {
      expect(pipeline.regs[6]).toBe(150);
      expect(pipeline.regs[4]).toBe(20);
    });

    it('wrote the array to data memory', () => {
      expect([0, 4, 8, 12, 16].map((a) => pipeline.dmem.get(a))).toEqual([10, 20, 30, 40, 50]);
    });

    it('stalls once per iteration for the load-use pair (5 stalls)', () => {
      expect(pipeline.stalls).toBe(5);
    });

    it('takes the branch 4 times, flushing the 4 wrong-path instructions that exist', () => {
      const redirects = pipeline.history.filter((h) => h.flushed).length;
      // 4 loop branches plus the final self-branch halt = 5 redirects
      expect(redirects).toBe(5);
      expect(pipeline.flushes).toBe(4);
    });

    it('takes 51 cycles: 34 instructions + 4 + 5 stalls + 4 taken loop branches x 2', () => {
      expect(pipeline.retired).toBe(34);
      expect(pipeline.cycle).toBe(51);
    });
  });

  describe('example program 3 - hazards and control', () => {
    const pipeline = new Pipeline(example(3));
    pipeline.run();

    it('resolves the RAW chain with forwarding (r4 = 30, r5 = 40)', () => {
      expect(pipeline.regs[4]).toBe(30);
      expect(pipeline.regs[5]).toBe(40);
    });

    it('stalls the load-use pair once and reaches r7 = 50', () => {
      expect(pipeline.regs[6]).toBe(40);
      expect(pipeline.regs[7]).toBe(50);
      expect(pipeline.stalls).toBe(1);
    });

    it('flushes the two instructions after the taken branch', () => {
      expect(pipeline.regs[8]).toBe(0);
      expect(pipeline.regs[9]).toBe(0);
      expect(pipeline.regs[10]).toBe(9);
      expect(pipeline.flushes).toBe(2);
    });

    it('takes 16 cycles: 9 instructions + 4 + 1 stall + 2 flush cycles', () => {
      expect(pipeline.cycle).toBe(16);
    });
  });

  describe('pipeline mechanics', () => {
    it('fills all five stages before the first instruction retires', () => {
      const pipeline = new Pipeline(example(1));
      const firstFive = [];
      for (let i = 0; i < 5; i += 1) firstFive.push(pipeline.step());
      expect(firstFive[0].WB).toBeNull();
      expect(firstFive[4].WB).not.toBeNull();
      expect(firstFive[4].WB.pc).toBe(0);
    });

    it('keeps lefela (r0) hard-wired to zero', () => {
      const pipeline = run(`eketsa lefela, r1, r1\neketsa ho lefela, lefela, 5\n${HALT}`);
      expect(pipeline.regs[0]).toBe(0);
    });

    it('reports CPI = cycles / instructions (6 cycles for 2 instructions = 3)', () => {
      const pipeline = run(`eketsa ho r5, r0, 1\n${HALT}`);
      const s = pipeline.stats();
      expect(s.instructions).toBe(2);
      expect(s.cycles).toBe(6);
      expect(s.cpi).toBe(3);
    });

    it('forwards a back-to-back RAW result with no stall', () => {
      const pipeline = run(`eketsa ho r5, r0, 7\nle r6, r5, r5\n${HALT}`);
      expect(pipeline.regs[6]).toBe(7);
      expect(pipeline.stalls).toBe(0);
    });

    it('labels the forwarding path taken (ForwardA = EX/MEM)', () => {
      const pipeline = run(`eketsa ho r5, r0, 7\neketsa r6, r5, r0\n${HALT}`);
      const forwarded = pipeline.history.find((h) => h.forwardA === 'EX/MEM');
      expect(forwarded).toBeDefined();
      expect(forwarded.hazards[0].type).toBe('RAW');
    });

    it('forwards from MEM/WB when the producer is two instructions ahead', () => {
      const pipeline = run(`eketsa ho r5, r0, 7\neketsa ho r8, r0, 1\neketsa r6, r5, r0\n${HALT}`);
      expect(pipeline.regs[6]).toBe(7);
      expect(pipeline.history.some((h) => h.forwardA === 'MEM/WB')).toBe(true);
    });

    it('with forwarding OFF the same RAW costs 2 stall cycles and still gives the right answer', () => {
      const pipeline = run(`eketsa ho r5, r0, 7\nle r6, r5, r5\n${HALT}`, { forwarding: false });
      expect(pipeline.regs[6]).toBe(7);
      expect(pipeline.stalls).toBe(2);
    });

    it('gives the same final registers with forwarding ON and OFF', () => {
      const on = new Pipeline(example(3));
      const off = new Pipeline(example(3), { forwarding: false });
      on.run();
      off.run();
      expect([...off.regs]).toEqual([...on.regs]);
      expect(off.cycle).toBeGreaterThan(on.cycle);
    });

    it('stalls exactly once for a load followed by its consumer, even with forwarding', () => {
      const pipeline = run(`
        eketsa ho r3, r0, 40
        jara r5, 0(r3)
        eketsa ho r6, r5, 1
        ${HALT}`, { dataMemory: { 40: 9 } });
      expect(pipeline.regs[6]).toBe(10);
      expect(pipeline.stalls).toBe(1);
      expect(pipeline.history.some((h) => h.stallReason === 'load-use')).toBe(true);
    });

    it('does not stall when an independent instruction separates a load from its use', () => {
      const pipeline = run(`
        eketsa ho r3, r0, 40
        jara r5, 0(r3)
        eketsa ho r8, r0, 1
        eketsa ho r6, r5, 1
        ${HALT}`, { dataMemory: { 40: 9 } });
      expect(pipeline.regs[6]).toBe(10);
      expect(pipeline.stalls).toBe(0);
    });

    it('resolves a backward branch and loops', () => {
      const pipeline = run(`
        eketsa ho r5, r0, 0
        eketsa ho r6, r0, 3
        top: eketsa ho r5, r5, 1
        eketsa ho r6, r6, -1
        phapano r6, r0, top
        ${HALT}`);
      expect(pipeline.regs[5]).toBe(3);
      expect(pipeline.regs[6]).toBe(0);
    });

    it('does not take tekano when the registers differ', () => {
      const pipeline = run(`
        eketsa ho r5, r0, 1
        eketsa ho r6, r0, 2
        tekano r5, r6, skip
        eketsa ho r7, r0, 99
        skip: eketsa ho r8, r0, 7
        ${HALT}`);
      expect(pipeline.regs[7]).toBe(99);
      expect(pipeline.regs[8]).toBe(7);
      expect(pipeline.flushes).toBe(0);
    });

    it('takes phapano when the registers differ', () => {
      const pipeline = run(`
        eketsa ho r5, r0, 1
        eketsa ho r6, r0, 2
        phapano r5, r6, skip
        eketsa ho r7, r0, 99
        skip: eketsa ho r8, r0, 7
        ${HALT}`);
      expect(pipeline.regs[7]).toBe(0);
      expect(pipeline.regs[8]).toBe(7);
      expect(pipeline.flushes).toBe(2);
    });

    it('stores a value and loads it back', () => {
      const pipeline = run(`
        eketsa ho r5, r0, 42
        boloka r5, 0(r2)
        jara r6, 0(r2)
        ${HALT}`);
      expect(pipeline.regs[6]).toBe(42);
      expect(pipeline.dmem.get(0)).toBe(42);
    });

    it('honours preloaded data memory', () => {
      const pipeline = run(`jara r6, 0(r5)\n${HALT}`, { dataMemory: { 0: 99 } });
      expect(pipeline.regs[6]).toBe(99);
    });

    it('honours preloaded registers (the M1 Program 1 start state)', () => {
      const pipeline = run(`eketsa r5, r3, r4\n${HALT}`, { registers: { 3: 7, 4: 5 } });
      expect(pipeline.regs[5]).toBe(12);
    });

    it('shifts left by an immediate (12 << 2 = 48)', () => {
      const pipeline = run(`eketsa ho r5, r0, 12\nsuthisa r7, r5, 2\n${HALT}`);
      expect(pipeline.regs[7]).toBe(48);
    });

    it('halts at the end of a program with no self branch', () => {
      const pipeline = run('eketsa ho r5, r0, 1');
      expect(pipeline.haltReason).toBe('end-of-program');
      expect(pipeline.haltedNaturally).toBe(true);
      expect(pipeline.regs[5]).toBe(1);
    });

    it('stops with an error on a misaligned word access', () => {
      const pipeline = run(`eketsa ho r5, r0, 2\njara r6, 0(r5)\n${HALT}`);
      expect(pipeline.haltReason).toBe('error');
      expect(pipeline.haltedNaturally).toBe(false);
    });

    it('stops at the cycle limit for a runaway program', () => {
      const pipeline = new Pipeline(assemble('top: eketsa ho r5, r5, 1\ntekano r0, r0, top2\ntop2: phapano r5, r0, top'));
      pipeline.run(50);
      expect(pipeline.halted).toBe(true);
    });

    it('will not step past a halt', () => {
      const pipeline = new Pipeline(assemble(`eketsa ho r5, r0, 1\n${HALT}`));
      pipeline.run();
      const cycles = pipeline.cycle;
      expect(pipeline.step()).toBeNull();
      expect(pipeline.cycle).toBe(cycles);
    });

    it('resets back to a clean machine', () => {
      const pipeline = new Pipeline(example(1));
      pipeline.run();
      pipeline.reset();
      expect(pipeline.cycle).toBe(0);
      expect(pipeline.retired).toBe(0);
      expect(pipeline.pc).toBe(0);
      expect([...pipeline.regs].every((r) => r === 0)).toBe(true);
      expect(pipeline.halted).toBe(false);
      expect(pipeline.history).toHaveLength(0);
    });

    it('steps back one cycle and gives the same result when run again', () => {
      const pipeline = new Pipeline(example(3));
      for (let i = 0; i < 6; i += 1) pipeline.step();
      const regsAt6 = [...pipeline.regs];
      pipeline.step();
      pipeline.step();
      expect(pipeline.stepBack()).toBe(true);
      expect(pipeline.stepBack()).toBe(true);
      expect(pipeline.cycle).toBe(6);
      expect([...pipeline.regs]).toEqual(regsAt6);
      expect(pipeline.history).toHaveLength(6);
      pipeline.run();
      expect(pipeline.cycle).toBe(16);
    });

    it('exposes pipeline register contents for the datapath view', () => {
      const pipeline = new Pipeline(example(1));
      pipeline.step();
      const registers = pipeline.pipelineRegisters();
      expect(Object.keys(registers)).toEqual(['IF/ID', 'ID/EX', 'EX/MEM', 'MEM/WB']);
    });

    it('records a per-cycle history for the pipeline chart', () => {
      const pipeline = new Pipeline(example(1));
      pipeline.run();
      expect(pipeline.history).toHaveLength(pipeline.cycle);
      expect(pipeline.history[0]).toHaveProperty('IF');
      expect(pipeline.history[0]).toHaveProperty('WB');
    });

    it('records the control signals generated in ID for the control view', () => {
      const pipeline = new Pipeline(assemble(`jara r5, 0(r0)\n${HALT}`));
      pipeline.step();
      const second = pipeline.step();
      expect(second.controls.MemRead).toBe(1);
      expect(second.controls.MemToReg).toBe(1);
    });
  });
});
