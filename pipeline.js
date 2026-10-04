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
  };
}

export class Pipeline {
  constructor(program, options = {}) {
    this.baseAddress = options.baseAddress ?? 0;
    this.imem = new Map();
    for (const instruction of program.instructions) {
      this.imem.set(instruction.address, parseInt(instruction.hex, 16) >>> 0);
    }
    this.initialDataMemory = new Map(
      Object.entries(options.dataMemory ?? {}).map(([address, value]) => [Number(address), value >>> 0]),
    );
    this.program = program;
    this.reset();
  }

  reset() {
    this.regs = new Uint32Array(16);
    this.dmem = new Map(this.initialDataMemory);
    this.pc = this.baseAddress;
    this.IF_ID = null;
    this.ID_EX = null;
    this.EX_MEM = null;
    this.MEM_WB = null;
    this.cycle = 0;
    this.retired = 0;
    this.stalls = 0;
    this.flushes = 0;
    this.history = [];
    this.events = [];
    this.halted = false;
    this.stopping = false;
    this.haltReason = null;
    this.lastWriteback = null;
    this.lastMemWrite = null;
  }

  fetch(address) {
    return this.imem.has(address) ? this.imem.get(address) : null;
  }

  step() {
    if (this.halted) return null;

    const ifId = this.IF_ID;
    const idEx = this.ID_EX;
    const exMem = this.EX_MEM;
    const memWb = this.MEM_WB;

    // ---- WB: commit the oldest instruction ----
    let writeback = null;
    if (memWb && !memWb.isBubble) {
      this.retired += 1;
      const writes = memWb.controls.RegWrite && memWb.rdAddr !== 0;
      const value = (memWb.controls.MemToReg ? memWb.memData : memWb.aluResult) >>> 0;
      if (writes) this.regs[memWb.rdAddr] = value;
      writeback = {
        pc: memWb.pc,
        rd: memWb.rdAddr,
        value,
        writes,
        text: memWb.decoded?.text ?? null,
      };
    }
    this.regs[0] = 0;
    this.lastWriteback = writeback;

    // ---- MEM ----
    let memData = 0;
    let memWrite = null;
    if (exMem && !exMem.isBubble) {
      if (exMem.controls.MemWrite) {
        const value = exMem.storeValue >>> 0;
        this.dmem.set(exMem.aluResult, value);
        memWrite = { address: exMem.aluResult, value };
      }
      if (exMem.controls.MemRead) {
        memData = (this.dmem.get(exMem.aluResult) ?? 0) >>> 0;
      }
    }
    this.lastMemWrite = memWrite;

    // ---- EX ----
    let aluResult = 0;
    let branchTaken = false;
    let branchTarget = null;
    let redirect = false;
    if (idEx && !idEx.isBubble) {
      const operandB = idEx.controls.ALUSrc ? idEx.immediate : idEx.rs2Value;
      aluResult = alu(idEx.controls.ALUControl, idEx.rs1Value, operandB);
      if (idEx.controls.Branch) {
        const difference = (idEx.rs1Value - idEx.rs2Value) | 0;
        branchTaken = idEx.controls.branchCompare === 'ne'
          ? difference !== 0
          : difference === 0;
        branchTarget = (idEx.pc + idEx.immediate) | 0;
        redirect = Boolean(idEx.controls.PCSrc) && branchTaken;
      }
    }

    // ---- ID ----
    let decoded = null;
    let controls = null;
    let rs1Value = 0;
    let rs2Value = 0;
    let stall = false;
    let stallReason = null;
    if (ifId && ifId.instruction !== null) {
      decoded = decode(ifId.instruction);
      controls = controlFor(decoded);
      rs1Value = decoded.rs1 === 0 ? 0 : this.regs[decoded.rs1];
      rs2Value = decoded.rs2 === 0 ? 0 : this.regs[decoded.rs2];

      const sources = [decoded.rs1, decoded.rs2].filter((r) => r !== 0);
      for (const producer of [idEx, exMem]) {
        if (producer && !producer.isBubble && producer.controls.RegWrite
            && producer.rdAddr !== 0 && sources.includes(producer.rdAddr)) {
          stall = true;
          stallReason = decoded.usesRs2 && decoded.rs2 === producer.rdAddr ? 'rs2' : 'rs1';
          break;
        }
      }
    }

    // ---- IF ----
    const fetchWord = stall || this.stopping ? null : this.fetch(this.pc);

    // ---- pipeline register update ----
    const exOut = idEx && !idEx.isBubble
      ? { ...idEx, aluResult, storeValue: idEx.rs2Value, isBubble: false }
      : bubble();
    const memOut = exMem && !exMem.isBubble
      ? { ...exMem, memData, isBubble: false }
      : bubble();

    let flushed = false;
    if (redirect) {
      this.MEM_WB = memOut;
      this.EX_MEM = exOut;
      this.ID_EX = bubble();
      this.IF_ID = null;
      this.pc = branchTarget;
      this.flushes += 2;
      flushed = true;
      if (branchTarget === idEx.pc) this.stopping = true;
    } else if (stall) {
      this.MEM_WB = memOut;
      this.EX_MEM = exOut;
      this.ID_EX = bubble();
      this.IF_ID = ifId;
      this.stalls += 1;
    } else {
      this.MEM_WB = memOut;
      this.EX_MEM = exOut;
      this.ID_EX = decoded
        ? {
          pc: ifId.pc, pcPlus4: ifId.pcPlus4, instruction: ifId.instruction,
          decoded, controls, rs1Value, rs2Value,
          rs1Addr: decoded.rs1, rs2Addr: decoded.rs2, rdAddr: decoded.rd,
          immediate: decoded.immediate, aluResult: 0, storeValue: 0,
          memData: 0, isBubble: false,
        }
        : bubble();
      this.IF_ID = fetchWord === null ? null : { pc: this.pc, pcPlus4: this.pc + 4, instruction: fetchWord };
      if (fetchWord !== null) this.pc += 4;
    }

    this.cycle += 1;

    const record = {
      cycle: this.cycle,
      pc: this.pc,
      IF: ifId ? { pc: ifId.pc, text: decode(ifId.instruction).text } : null,
      ID: ifId && !stall
        ? {
          pc: ifId.pc,
          text: decoded?.text ?? null,
          controls,
          rs1: decoded?.rs1 ?? 0,
          rs2: decoded?.rs2 ?? 0,
          rd: decoded?.rd ?? 0,
          rs1Value,
          rs2Value,
          immediate: decoded?.immediate ?? 0,
        }
        : null,
      EX: idEx && !idEx.isBubble
        ? {
          pc: idEx.pc,
          text: idEx.decoded?.text ?? null,
          aluResult,
          branchTaken,
          branchTarget,
          rd: idEx.rdAddr,
          rs1Value: idEx.rs1Value,
          rs2Value: idEx.rs2Value,
        }
        : null,
      MEM: exMem && !exMem.isBubble
        ? {
          pc: exMem.pc,
          text: exMem.decoded?.text ?? null,
          address: exMem.aluResult,
          memData,
          rd: exMem.rdAddr,
        }
        : null,
      WB: writeback,
      stalled: stall,
      stallReason,
      flushed,
    };
    this.history.push(record);

    const pipelineEmpty = !this.IF_ID
      && isBubble(this.ID_EX) && isBubble(this.EX_MEM) && isBubble(this.MEM_WB);
    if (pipelineEmpty) {
      this.halted = true;
      this.haltReason = this.stopping ? 'self-branch' : 'end-of-program';
    }

    return record;
  }

  run(maxCycles = 10000) {
    while (!this.halted && this.cycle < maxCycles) this.step();
    if (!this.halted) this.haltReason = 'cycle-limit';
    return this.stats();
  }

  get haltedNaturally() {
    return this.haltReason === 'self-branch' || this.haltReason === 'end-of-program';
  }

  stats() {
    return {
      cycles: this.cycle,
      instructions: this.retired,
      cpi: this.retired === 0 ? 0 : this.cycle / this.retired,
      stalls: this.stalls,
      flushes: this.flushes,
      halted: this.halted,
      haltReason: this.haltReason,
    };
  }

  registerFile() {
    return [...this.regs].map((value, index) => ({
      index, value: value >>> 0, changed: this.lastWriteback?.rd === index,
    }));
  }

  dataMemory() {
    return [...this.dmem.entries()]
      .map(([address, value]) => ({
        address: address >>> 0,
        value: value >>> 0,
        changed: this.lastMemWrite?.address === address,
      }))
      .sort((a, b) => a.address - b.address);
  }

  pipelineRegisters() {
    const describe = (reg) => (reg && !reg.isBubble
      ? {
        pc: reg.pc,
        text: reg.decoded?.text ?? null,
        controls: reg.controls,
        rs1Value: reg.rs1Value,
        rs2Value: reg.rs2Value,
        rdAddr: reg.rdAddr,
        immediate: reg.immediate,
        aluResult: reg.aluResult,
        memData: reg.memData,
      }
      : { bubble: true });
    return {
      'IF/ID': describe(this.IF_ID),
      'ID/EX': describe(this.ID_EX),
      'EX/MEM': describe(this.EX_MEM),
      'MEM/WB': describe(this.MEM_WB),
    };
  }
}