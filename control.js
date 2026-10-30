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

// Load word: address = rs1 + immediate, data comes from memory into rd
const loadType = () => ({
  RegWrite: 1, ALUSrc: 1, ALUControl: ALU.ADD,
  MemRead: 1, MemWrite: 0, MemToReg: 1, Branch: 0, PCSrc: 0,
  branchCompare: null, writesRd: 1,
});

// Store word: address = rs1 + immediate, rs2 goes to memory, nothing is written back
const storeType = () => ({
  RegWrite: 0, ALUSrc: 1, ALUControl: ALU.ADD,
  MemRead: 0, MemWrite: 1, MemToReg: 0, Branch: 0, PCSrc: 0,
  branchCompare: null, writesRd: 0,
});

export const CONTROL_TABLE = {
  // Arithmetic
  'eketsa': rType(ALU.ADD),
  'fokotsa': rType(ALU.SUB),
  'eketsa ho': iType(ALU.ADD),

  // Logic and shift
  'le': rType(ALU.AND),
  'kapa': rType(ALU.OR),
  'kopanyetsa': iType(ALU.AND),
  'suthisa': iType(ALU.SLL),

  // Memory
  'jara': loadType(),
  'boloka': storeType(),

  // Branches
  'tekano': bType('eq'),
  'phapano': bType('ne'),
};

// A bubble or an invalid word: every signal off, so nothing happens.
export const NOP_CONTROL = Object.freeze({
  RegWrite: 0, ALUSrc: 0, ALUControl: ALU.ADD,
  MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
  branchCompare: null, writesRd: 0,
});

// One-line meaning of each signal, for the control view (B4).
export const SIGNAL_MEANINGS = {
  RegWrite: 'Write a result into the destination register in WB.',
  ALUSrc: '0 = ALU second input is rs2; 1 = it is the immediate.',
  ALUControl: 'Selects the ALU operation (ADD, SUB, AND, OR, SLL).',
  MemRead: 'Read a word from data memory in MEM (load).',
  MemWrite: 'Write rs2 to data memory in MEM (store).',
  MemToReg: '0 = write the ALU result back; 1 = write the loaded data back.',
  Branch: 'This instruction is a conditional branch.',
  PCSrc: 'Take the branch target as the next PC (when the compare is true).',
  branchCompare: 'Branch condition on rs1 and rs2: eq (tekano) or ne (phapano).',
  writesRd: 'This instruction has a destination register.',
};

// Return a fresh copy of the control signals for a decoded instruction.
export function controlSignals(decoded) {
  if (!decoded || !decoded.valid) return { ...NOP_CONTROL };
  const entry = Object.prototype.hasOwnProperty.call(CONTROL_TABLE, decoded.mnemonic)
    ? CONTROL_TABLE[decoded.mnemonic]
    : null;
  return entry ? { ...entry } : { ...NOP_CONTROL };
}

// Aliases, in case other files use a different name.
export const generateControl = controlSignals;
export const getControlSignals = controlSignals;
export const decodeControl = controlSignals;
