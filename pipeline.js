// =====================================================================
// LIMO Five-Stage Pipeline — Silicon Minds, CS3520
// IF, ID, EX, MEM, WB with IF/ID, ID/EX, EX/MEM and MEM/WB registers,
// separate instruction and data memories, and a 16-entry register file.
//
// Branches resolve in EX, per A6(c) in docs/ISA-specification.md, so a
// taken branch flushes the two younger instructions (the one in ID and the
// one being fetched in IF during the same cycle).
//
// Hazards:
//   Forwarding ON  (default): EX/MEM -> EX and MEM/WB -> EX (ForwardA/ForwardB).
//                  A load followed by a dependent instruction still stalls one
//                  cycle (load-use), because the loaded word exists only after MEM.
//   Forwarding OFF: no forwarding. A consumer waits in ID until its producer has
//                  reached WB (the register file is written in the first half of
//                  the cycle and read in the second half), so a back-to-back
//                  dependence costs 2 stall cycles.
// =====================================================================

import { decode } from './decoder.js';
import { controlFor } from './control.js';
import { alu } from './alu.js';

const MEMORY_SIZE = 0x10000; // 64 KB data memory (M1 spec)

const BUBBLE_CONTROLS = Object.freeze({
  RegWrite: 0, ALUSrc: 0, ALUControl: 0,
  MemRead: 0, MemWrite: 0, MemToReg: 0, Branch: 0, PCSrc: 0,
  branchCompare: null, writesRd: 0,
});

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

// Value an instruction will write to its destination register.
function writeBackValue(latch) {
  return latch.controls.MemToReg ? latch.memData : latch.aluResult;
}

// A short description of an instruction for the stage views and the chart.
function stageInfo(latch) {
  if (isBubble(latch)) return null;
  return {
    pc: latch.pc,
    word: latch.instruction,
    mnemonic: latch.decoded.mnemonic,
    text: latch.decoded.text,
    valid: latch.decoded.valid,
  };
}

export class Pipeline {
  constructor(program, options = {}) {
    this.program = program;
    this.options = options;
    this.imem = program.words ?? program.instructions.map((i) => i.word);
    this.maxCycles = options.maxCycles ?? 10000;
    this.forwarding = options.forwarding ?? true;
    this.reset();
  }

  // ---- state ------------------------------------------------------------
  reset() {
    this.pc = 0;
    this.cycle = 0;
    this.retired = 0;
    this.stalls = 0;
    this.flushes = 0;
    this.regs = new Array(16).fill(0);
    for (const [r, v] of Object.entries(this.options.registers ?? {})) {
      if (Number(r) !== 0) this.regs[Number(r)] = v | 0;
    }
    this.dmem = new Map();
    for (const [a, v] of Object.entries(this.options.dataMemory ?? {})) {
      this.dmem.set(Number(a), v | 0);
    }
    this.ifid = bubble();
    this.idex = bubble();
    this.exmem = bubble();
    this.memwb = bubble();
    this.halting = false;
    this.halted = false;
    this.haltedNaturally = false;
    this.haltReason = null;
    this.error = null;
    this.history = [];
    this._undo = [];
  }

  setForwarding(on) {
    this.forwarding = Boolean(on);
  }

  // ---- data memory --------------------------------------------------------
  _checkAddress(addr) {
    if (addr % 4 !== 0) throw new Error(`Misaligned word access at address ${addr}`);
    if (addr < 0 || addr >= MEMORY_SIZE) throw new Error(`Address ${addr} is outside data memory`);
  }

  _load(addr) {
    const a = addr >>> 0;
    this._checkAddress(a);
    return this.dmem.get(a) ?? 0;
  }

  _store(addr, value) {
    const a = addr >>> 0;
    this._checkAddress(a);
    this.dmem.set(a, value | 0);
  }

  // ---- one clock cycle ------------------------------------------------------
  step() {
    if (this.halted) return null;
    this._saveUndo();
    try {
      return this._cycle();
    } catch (e) {
      this.halted = true;
      this.haltedNaturally = false;
      this.haltReason = 'error';
      this.error = e.message;
      return null;
    }
  }

  _cycle() {
    const old = { ifid: this.ifid, idex: this.idex, exmem: this.exmem, memwb: this.memwb };
    const snap = {
      cycle: this.cycle + 1,
      IF: null, ID: null, EX: null, MEM: null, WB: null,
      stalled: false, stallReason: null, flushed: false, flushedCount: 0,
      forwardA: null, forwardB: null, hazards: [], redirectTo: null,
      controls: null,
      values: {
        pc: this.pc, pcPlus4: this.pc + 4, branchTarget: null,
        rs1Value: null, rs2Value: null, immediate: null,
        aluA: null, aluB: null, aluResult: null,
        memAddress: null, memData: null, writeBack: null,
      },
    };

    // ---- WB: write the register file (first half of the cycle) ----
    snap.WB = stageInfo(old.memwb);
    if (!isBubble(old.memwb)) {
      this.retired += 1;
      if (old.memwb.controls.RegWrite && old.memwb.rdAddr !== 0) {
        const v = writeBackValue(old.memwb) | 0;
        this.regs[old.memwb.rdAddr] = v;
        snap.values.writeBack = v;
      }
    }

    if (snap.WB) {
      const w = Boolean(old.memwb.controls.RegWrite && old.memwb.rdAddr !== 0);
      Object.assign(snap.WB, { writes: w, rd: old.memwb.rdAddr, value: w ? writeBackValue(old.memwb) | 0 : 0 });
    }

    // ---- MEM ----
    snap.MEM = stageInfo(old.exmem);
    let newMemwb = bubble();
    if (!isBubble(old.exmem)) {
      let memData = 0;
      if (old.exmem.controls.MemRead) memData = this._load(old.exmem.aluResult);
      if (old.exmem.controls.MemWrite) this._store(old.exmem.aluResult, old.exmem.storeValue);
      if (old.exmem.controls.MemRead || old.exmem.controls.MemWrite) {
        snap.values.memAddress = old.exmem.aluResult >>> 0;
        snap.values.memData = old.exmem.controls.MemRead ? memData : old.exmem.storeValue;
      }
      newMemwb = { ...old.exmem, memData };
    }

    if (snap.MEM) {
      const isMem = Boolean(old.exmem.controls.MemRead || old.exmem.controls.MemWrite);
      Object.assign(snap.MEM, {
        isMemory: isMem,
        address: isMem ? old.exmem.aluResult >>> 0 : null,
        memData: isMem ? snap.values.memData : null,
      });
    }

    // ---- EX ----
    snap.EX = stageInfo(old.idex);
    let newExmem = bubble();
    let redirect = null;
    if (!isBubble(old.idex)) {
      const c = old.idex.controls;
      let a = old.idex.rs1Value;
      let b = old.idex.rs2Value;
      if (this.forwarding) {
        // ForwardA / ForwardB: newest result first (EX/MEM, then MEM/WB).
        if (old.idex.decoded.usesRs1 && old.idex.rs1Addr !== 0) {
          if (this._provides(old.exmem, old.idex.rs1Addr)) {
            a = old.exmem.aluResult; snap.forwardA = 'EX/MEM';
          } else if (this._provides(old.memwb, old.idex.rs1Addr, true)) {
            a = writeBackValue(old.memwb); snap.forwardA = 'MEM/WB';
          }
        }
        if (old.idex.decoded.usesRs2 && old.idex.rs2Addr !== 0) {
          if (this._provides(old.exmem, old.idex.rs2Addr)) {
            b = old.exmem.aluResult; snap.forwardB = 'EX/MEM';
          } else if (this._provides(old.memwb, old.idex.rs2Addr, true)) {
            b = writeBackValue(old.memwb); snap.forwardB = 'MEM/WB';
          }
        }
        if (snap.forwardA || snap.forwardB) {
          snap.hazards.push({
            type: 'RAW',
            detail: `forwarded ${[snap.forwardA && 'A from ' + snap.forwardA, snap.forwardB && 'B from ' + snap.forwardB].filter(Boolean).join(', ')}`,
          });
        }
      }
      const aluB = c.ALUSrc ? old.idex.immediate : b;
      const result = alu(c.ALUControl, a, aluB) | 0;
      snap.values.aluA = a | 0;
      snap.values.aluB = aluB | 0;
      snap.values.aluResult = result;
      snap.values.rs1Value = a | 0;
      snap.values.rs2Value = b | 0;
      snap.values.immediate = old.idex.immediate;
      newExmem = { ...old.idex, aluResult: result, storeValue: b | 0 };
      Object.assign(snap.EX, { aluResult: result, branchTaken: false, branchTarget: null });

      if (c.Branch) {
        const target = (old.idex.pc + old.idex.immediate) >>> 0;
        snap.values.branchTarget = target;
        const equal = result === 0;
        const taken = c.branchCompare === 'eq' ? equal : !equal;
        Object.assign(snap.EX, { branchTaken: taken, branchTarget: target });
        if (taken) {
          redirect = target;
          if (target === old.idex.pc) this.halting = true; // branch to itself = halt
        }
      }
    }

    // ---- ID: decode, read registers, detect hazards ----
    snap.ID = stageInfo(old.ifid);
    let newIdex = bubble();
    let stall = null;
    if (!isBubble(old.ifid)) {
      const d = old.ifid.decoded;
      const controls = controlFor(d);
      snap.controls = controls;
      Object.assign(snap.ID, {
        rs1: d.rs1 ?? 0, rs2: d.rs2 ?? 0,
        rs1Value: d.usesRs1 ? this.regs[d.rs1 ?? 0] : undefined,
        rs2Value: d.usesRs2 ? this.regs[d.rs2 ?? 0] : undefined,
        immediate: d.immediate ?? 0,
        controls,
      });
      const rs1Addr = d.rs1 ?? 0;
      const rs2Addr = d.rs2 ?? 0;
      const need1 = d.usesRs1 && rs1Addr !== 0;
      const need2 = d.usesRs2 && rs2Addr !== 0;
      const depends = (p) =>
        !isBubble(p) && p.controls.RegWrite && p.rdAddr !== 0 &&
        ((need1 && p.rdAddr === rs1Addr) || (need2 && p.rdAddr === rs2Addr));

      if (redirect === null) {
        if (this.forwarding) {
          if (!isBubble(old.idex) && old.idex.controls.MemRead && depends(old.idex)) {
            stall = 'load-use';
          }
        } else if (depends(old.idex) || depends(old.exmem)) {
          stall = 'RAW (no forwarding)';
        }
      }

      if (stall) {
        snap.stalled = true;
        snap.stallReason = stall;
        snap.hazards.push({ type: stall === 'load-use' ? 'load-use' : 'RAW', detail: stall });
        this.stalls += 1;
      } else {
        newIdex = {
          ...old.ifid,
          controls,
          rs1Addr, rs2Addr,
          rdAddr: controls.writesRd ? (d.rd ?? 0) : 0,
          rs1Value: d.usesRs1 ? this.regs[rs1Addr] : 0,
          rs2Value: d.usesRs2 ? this.regs[rs2Addr] : 0,
          immediate: d.immediate ?? 0,
          aluResult: 0, storeValue: 0, memData: 0,
        };
      }
    }

    // ---- IF: fetch ----
    let newIfid;
    let fetched = false;
    const idx = this.pc >>> 2;
    const canFetch = !this.halting && this.pc % 4 === 0 && idx < this.imem.length;
    if (stall) {
      newIfid = old.ifid; // hold
      snap.IF = stageInfo(old.ifid);
    } else if (canFetch) {
      const word = this.imem[idx];
      const decoded = decode(word);
      newIfid = {
        ...bubble(), isBubble: false,
        pc: this.pc, pcPlus4: this.pc + 4, instruction: word, decoded,
      };
      fetched = true;
      snap.IF = stageInfo(newIfid);
    } else {
      newIfid = bubble();
    }

    // ---- control hazard: flush the two wrong-path instructions ----
    let nextPc = this.pc;
    if (redirect !== null) {
      let flushedNow = 0;
      if (!isBubble(old.ifid)) flushedNow += 1;
      if (fetched) flushedNow += 1;
      this.flushes += flushedNow;
      snap.flushed = true;
      snap.flushedCount = flushedNow;
      snap.redirectTo = redirect;
      snap.hazards.push({ type: 'control', detail: `taken branch, flushed ${flushedNow}` });
      newIdex = bubble();
      newIfid = bubble();
      nextPc = redirect;
    } else if (!stall && fetched) {
      nextPc = this.pc + 4;
    }

    // ---- clock edge ----
    this.ifid = newIfid;
    this.idex = newIdex;
    this.exmem = newExmem;
    this.memwb = newMemwb;
    this.pc = nextPc;
    this.cycle += 1;
    this.history.push(snap);

    // ---- halt detection ----
    const allEmpty = isBubble(this.ifid) && isBubble(this.idex) &&
      isBubble(this.exmem) && isBubble(this.memwb);
    const nothingToFetch = this.halting || (this.pc >>> 2) >= this.imem.length;
    if (allEmpty && nothingToFetch) {
      this.halted = true;
      this.haltedNaturally = true;
      this.haltReason = this.halting ? 'self-branch' : 'end-of-program';
    }
    return snap;
  }

  // Can this pipeline register forward its result for register `reg`?
  // A load in EX/MEM has no data yet (it exists only after MEM), so only MEM/WB
  // may forward a loaded word.
  _provides(latch, reg, fromMemWb = false) {
    if (isBubble(latch)) return false;
    if (!latch.controls.RegWrite || latch.rdAddr === 0 || latch.rdAddr !== reg) return false;
    if (latch.controls.MemRead && !fromMemWb) return false;
    return true;
  }

  run(limit = this.maxCycles) {
    let n = 0;
    while (!this.halted) {
      if (n >= limit) {
        this.halted = true;
        this.haltedNaturally = false;
        this.haltReason = 'cycle-limit';
        break;
      }
      this.step();
      n += 1;
    }
    return this;
  }

  // ---- step back ------------------------------------------------------------
  _saveUndo() {
    this._undo.push({
      pc: this.pc, cycle: this.cycle, retired: this.retired,
      stalls: this.stalls, flushes: this.flushes, regs: [...this.regs],
      dmem: new Map(this.dmem),
      ifid: this.ifid, idex: this.idex, exmem: this.exmem, memwb: this.memwb,
      halting: this.halting, halted: this.halted,
      haltedNaturally: this.haltedNaturally, haltReason: this.haltReason,
      historyLength: this.history.length,
    });
    if (this._undo.length > 5000) this._undo.shift();
  }

  stepBack() {
    const s = this._undo.pop();
    if (!s) return false;
    Object.assign(this, {
      pc: s.pc, cycle: s.cycle, retired: s.retired, stalls: s.stalls,
      flushes: s.flushes, regs: s.regs, dmem: s.dmem,
      ifid: s.ifid, idex: s.idex, exmem: s.exmem, memwb: s.memwb,
      halting: s.halting, halted: s.halted,
      haltedNaturally: s.haltedNaturally, haltReason: s.haltReason, error: null,
    });
    this.history.length = s.historyLength;
    return true;
  }

  // ---- views --------------------------------------------------------------
  pipelineRegisters() {
    return {
      'IF/ID': this.ifid,
      'ID/EX': this.idex,
      'EX/MEM': this.exmem,
      'MEM/WB': this.memwb,
    };
  }

  // Register file for the state view; `changed` marks values that differ from
  // the state before the last cycle.
  registerFile() {
    const prev = this._undo.length ? this._undo[this._undo.length - 1].regs : this.regs;
    return this.regs.map((value, index) => ({ index, value, changed: value !== prev[index] }));
  }

  // Non-empty data memory words, sorted by address.
  dataMemory() {
    const prev = this._undo.length ? this._undo[this._undo.length - 1].dmem : new Map();
    return [...this.dmem.entries()]
      .sort((x, y) => x[0] - y[0])
      .map(([address, value]) => ({ address, value, changed: prev.get(address) !== value }));
  }

  stats() {
    return {
      cycles: this.cycle,
      instructions: this.retired,
      cpi: this.retired === 0 ? 0 : this.cycle / this.retired,
      stalls: this.stalls,
      flushes: this.flushes,
    };
  }
}
