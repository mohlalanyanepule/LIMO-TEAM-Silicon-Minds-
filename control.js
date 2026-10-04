// =====================================================================
// LIMO Control Unit — Silicon Minds, CS3520
// Generates the ID-stage control signals for a decoded instruction.
// =====================================================================

import { ALU } from './alu.js';

export const CONTROL_TABLE = {
  'eketsa': {
    RegWrite: 1, ALUSrc: 0, ALUControl: ALU.ADD,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'eketsa-haufi': {
    RegWrite: 1, ALUSrc: 1, ALUControl: ALU.ADD,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'fokotsa': {
    RegWrite: 1, ALUSrc: 0, ALUControl: ALU.SUB,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'eketsa-habeli': {
    RegWrite: 1, ALUSrc: 0, ALUControl: ALU.SLL,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'bapisa-hanyane': {
    RegWrite: 1, ALUSrc: 0, ALUControl: ALU.SLT,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'hlophisa': {
    RegWrite: 1, ALUSrc: 0, ALUControl: ALU.XOR,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'arola': {
    RegWrite: 1, ALUSrc: 0, ALUControl: ALU.SRL,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'hokela': {
    RegWrite: 1, ALUSrc: 0, ALUControl: ALU.OR,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'kopanya': {
    RegWrite: 1, ALUSrc: 0, ALUControl: ALU.AND,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'hlophisa-haufi': {
    RegWrite: 1, ALUSrc: 1, ALUControl: ALU.XOR,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'hokela-haufi': {
    RegWrite: 1, ALUSrc: 1, ALUControl: ALU.OR,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'kopanya-haufi': {
    RegWrite: 1, ALUSrc: 1, ALUControl: ALU.AND,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'kenya': {
    RegWrite: 1, ALUSrc: 1, ALUControl: ALU.ADD,
    MemRead: 1, MemWrite: 0, MemToReg: 1, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 1,
  },
  'boloka': {
    RegWrite: 0, ALUSrc: 1, ALUControl: ALU.ADD,
    MemRead: 0, MemWrite: 1, MemToReg: 0, Branch: 0, PCSrc: 0,
    branchCompare: null, writesRd: 0,
  },
  'hlahloba': {
    RegWrite: 0, ALUSrc: 0, ALUControl: ALU.SUB,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 1, PCSrc: 1,
    branchCompare: 'eq', writesRd: 0,
  },
  'hlahloba-fapane': {
    RegWrite: 0, ALUSrc: 0, ALUControl: ALU.SUB,
    MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 1, PCSrc: 1,
    branchCompare: 'ne', writesRd: 0,
  },
};

export const SIGNAL_MEANINGS = {
  RegWrite: 'write the result back to the register file',
  ALUSrc: '0 = ALU reads rs2, 1 = ALU reads the sign-extended immediate',
  ALUControl: 'selects the ALU operation for this instruction',
  MemRead: 'read the addressed word from data memory',
  MemWrite: 'write the register value to the addressed data memory word',
  MemToReg: '0 = write the ALU result, 1 = write the memory word',
  Branch: 'this instruction may redirect the PC',
  PCSrc: 'PCSrc AND branch-taken selects the branch target instead of PC+4',
};

export function controlFor(decoded) {
  if (!decoded.valid) {
    return {
      RegWrite: 0, ALUSrc: 0, ALUControl: ALU.ADD,
      MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
      branchCompare: null, writesRd: 0,
    };
  }
  return CONTROL_TABLE[decoded.mnemonic];
}