// =====================================================================
// LIMO Five-Stage Pipeline — Silicon Minds, CS3520
// IF, ID, EX, MEM, WB with IF/ID, ID/EX, EX/MEM and MEM/WB registers,
// separate instruction and data memories, and a 16-entry register file.
//
// Branches resolve in EX, per A6(c) in docs/ISA-specification.md, so a
// taken branch flushes the two younger instructions held in IF/ID and ID/EX.
//
// Hazard handling here is the M3 baseline: no forwarding, so a consumer
// stalls in ID until its producer has reached WB. M4 replaces this with
// ForwardA/ForwardB, load-use detection and the forwarding ON/OFF switch.
// =====================================================================

import { decode } from './decoder.js';
import { controlFor } from './control.js';
import { alu } from './alu.js';

const BUBBLE_CONTROLS = {
  RegWrite: 0, ALUSrc: 0, ALUControl: 0,
  MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
  branchCompare: null, writesRd: 0,
};

export function isBubble(reg) {
  return !reg || reg.isBubble === true;
}

function bubble() {
  return {
    pc: null, pcPlus4: null, instruction: null, decoded: null,
    controls: BUBBLE_CONTROLS, rs1Value: 0, rs2Value: 0,
    rs1Addr: 0, rs2Addr: 0, rdAddr: 0, immediate: 0,
    aluResult: 0, storeValue: 0, memData: 0, isBubble: true,
