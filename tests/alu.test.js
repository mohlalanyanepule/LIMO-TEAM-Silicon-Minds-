import { describe, it, expect } from 'vitest';
import { ALU, alu, aluName } from '../alu.js';

describe('LIMO ALU', () => {
  it('adds', () => {
    expect(alu(ALU.ADD, 7, 5)).toBe(12);
  });

  it('subtracts', () => {
    expect(alu(ALU.SUB, 12, 5)).toBe(7);
  });

  it('wraps add and subtract to 32 bits', () => {
    expect(alu(ALU.ADD, 0xffffffff, 2)).toBe(1);
    expect(alu(ALU.SUB, 0, 1)).toBe(0xffffffff);
  });

  it('shifts left by rs2', () => {
    expect(alu(ALU.SLL, 12, 2)).toBe(48);
  });

  it('shifts right logically by rs2', () => {
    expect(alu(ALU.SRL, 48, 2)).toBe(12);
  });

  it('masks the shift amount to five bits', () => {
    expect(alu(ALU.SLL, 1, 33)).toBe(2);
  });

  it('performs bitwise operations', () => {
    expect(alu(ALU.AND, 48, 255)).toBe(48);
    expect(alu(ALU.OR, 7, 5)).toBe(7);
    expect(alu(ALU.XOR, 0b1100, 0b1010)).toBe(0b0110);
  });

  it('sets less than as signed comparison', () => {
    expect(alu(ALU.SLT, 3, 4)).toBe(1);
    expect(alu(ALU.SLT, 4, 3)).toBe(0);
    expect(alu(ALU.SLT, 0xffffffff, 1)).toBe(1);
  });

  it('rejects an unknown control value', () => {
    expect(() => alu(0b0111, 1, 1)).toThrow(/Unknown ALUControl/);
  });

  it('names every control value', () => {
    for (const value of Object.values(ALU)) {
      expect(aluName(value)).toMatch(/^[A-Z]+$/);
    }
  });
});