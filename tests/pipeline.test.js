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

const HALT = 'fin: hlahloba lefela, lefela, fin';

describe('LIMO five-stage pipeline', () => {
  describe('example program 1 — arithmetic and logic', () => {
    const pipeline = new Pipeline(example(1));
    pipeline.run();

    it('computes x10 = ((7 + 5) << 2) AND 255 = 48', () => {
      expect(pipeline.regs[10]).toBe(48);
    });

    it('computes x11 = 7 OR 5 = 7', () => {
      expect(pipeline.regs[11]).toBe(7);
    });

    it('stores both results to data memory', () => {
      expect(pipeline.dmem.get(0)).toBe(48);
      expect(pipeline.dmem.get(4)).toBe(7);
    });

    it('halts on the self branch', () => {
      expect(pipeline.haltedNaturally).toBe(true);
      expect(pipeline.haltReason).toBe('self-branch');
    });
  });

  describe('example program 2 — array sum with a loop', () => {
    const pipeline = new Pipeline(example(2));
    pipeline.run();

    it('accumulates the five array elements into x10', () => {
      expect(pipeline.regs[10]).toBe(75);
    });

    it('takes the branch four times and flushes on the fifth', () => {
      const redirects = pipeline.history.filter((h) => h.flushed).length;
      expect(redirects).toBe(5);
      expect(pipeline.flushes).toBe(10);
    });
  });

  describe('example program 3 — hazards and control', () => {
    const pipeline = new Pipeline(example(3));
    pipeline.run();

    it('resolves the RAW chain correctly (x7 = 30, x8 = 40)', () => {
      expect(pipeline.regs[7]).toBe(30);
      expect(pipeline.regs[8]).toBe(40);
    });

    it('stalls the load-use pair and reaches x10 = 60', () => {
      expect(pipeline.regs[10]).toBe(60);
      expect(pipeline.stalls).toBeGreaterThan(0);
    });

    it('flushes the two instructions after the taken branch', () => {
      expect(pipeline.regs[13]).toBe(0);
      expect(pipeline.regs[14]).toBe(0);
      expect(pipeline.regs[15]).toBe(7);
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

    it('keeps lefela hard-wired to zero', () => {
      const pipeline = run(`eketsa lefela, x1, x1\n${HALT}`);
      expect(pipeline.regs[0]).toBe(0);
    });

    it('reports a CPI of one for an instruction with no dependencies', () => {
      const pipeline = run(`eketsa-haufi x5, x0, 1\n${HALT}`);
      const withoutLoop = pipeline.stats();
      expect(withoutLoop.instructions).toBe(2);
      // 1 instruction in IF..WB is 5 cycles, the self branch adds its own 5
      expect(withoutLoop.cpi).toBeGreaterThan(1);
    });

    it('stalls when a consumer depends on a producer still in EX', () => {
      const pipeline = run(`eketsa-haufi x5, x0, 7\nkopanya x6, x5, x5\n${HALT}`);
      expect(pipeline.regs[6]).toBe(7);
      expect(pipeline.stalls).toBe(2);
    });

    it('resolves a backward branch and loops', () => {
      const pipeline = run(`
        eketsa-haufi x5, x0, 0
        eketsa-haufi x6, x0, 3
        top: eketsa-haufi x5, x5, 1
        eketsa-haufi x6, x6, -1
        hlahloba-fapane x6, x0, top
        ${HALT}`);
      expect(pipeline.regs[5]).toBe(3);
      expect(pipeline.regs[6]).toBe(0);
    });

    it('does not take hlahloba when the registers differ', () => {
      const pipeline = run(`
        eketsa-haufi x5, x0, 1
        eketsa-haufi x6, x0, 2
        hlahloba x5, x6, skip
        eketsa-haufi x7, x0, 99
        skip: eketsa-haufi x8, x0, 7
        ${HALT}`);
      // not equal, so the branch is not taken and x7 does execute
      expect(pipeline.regs[7]).toBe(99);
      expect(pipeline.regs[8]).toBe(7);
    });

    it('takes hlahloba-fapane when the registers differ', () => {
      const pipeline = run(`
        eketsa-haufi x5, x0, 1
        eketsa-haufi x6, x0, 2
        hlahloba-fapane x5, x6, skip
        eketsa-haufi x7, x0, 99
        skip: eketsa-haufi x8, x0, 7
        ${HALT}`);
      expect(pipeline.regs[7]).toBe(0);
      expect(pipeline.regs[8]).toBe(7);
    });

    it('loads a stored value back', () => {
      const pipeline = run(`
        eketsa-haufi x5, x0, 42
        boloka x5, 0(x2)
        kenya x6, 0(x2)
        ${HALT}`);
      expect(pipeline.regs[6]).toBe(42);
    });

    it('honours preloaded data memory', () => {
      const pipeline = run(`kenya x6, 0(x5)\n${HALT}`, { dataMemory: { 0: 99 } });
      expect(pipeline.regs[6]).toBe(99);
    });

    it('halts at the end of a program with no self branch', () => {
      const pipeline = run('eketsa-haufi x5, x0, 1');
      expect(pipeline.haltReason).toBe('end-of-program');
      expect(pipeline.regs[5]).toBe(1);
    });

    it('will not step past a halt', () => {
      const pipeline = new Pipeline(assemble(`eketsa-haufi x5, x0, 1\n${HALT}`));
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
  });

  describe('shift behaviour matches the register form of the ISA', () => {
    it('shifts by the value in rs2', () => {
      const pipeline = run(`
        eketsa-haufi x5, x0, 12
        eketsa-haufi x6, x0, 2
        eketsa-habeli x7, x5, x6
        ${HALT}`);
      expect(pipeline.regs[7]).toBe(48);
    });
  });
});