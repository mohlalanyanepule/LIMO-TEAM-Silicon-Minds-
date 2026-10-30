// =====================================================================
// LIMO Control Unit — Silicon Minds, CS3520
// Generates the ID-stage control signals for a decoded instruction.
// Covers the 11 instructions of the frozen LIMO ISA v1.0 (M1).
// =====================================================================

import { ALU } from './alu.js';

// R-type: reads rs1 and rs2, writes rd
const rType = (op) => ({
  RegWrite: 1, ALUSrc: 0, ALUControl: op,
  MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
  branchCompare: null, writesRd: 1,
});

// I-type ALU: reads rs1 and the immediate, writes rd
const iType = (op) => ({
  RegWrite: 1, ALUSrc: 1, ALUControl: op,
  MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
  branchCompare: null, writesRd: 1,
});

// Branch: the ALU subtracts rs1 - rs2 and the compare decides if it is taken
const bType = (compare) => ({
  RegWrite: 0, ALUSrc: 0, ALUControl: ALU.SUB,
  MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 1, PCSrc: 1,
  branchCompare: compare, writesRd: 0,
});

export const CONTROL_TABLE = {
  // Arithmetic
  'eketsa': rType(ALU.ADD),
  'fokotsa': rType(ALU.SUB),
