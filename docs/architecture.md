# LIMO — Architecture and Block Diagram

**Silicon Minds · CS3520 · NUL · AY2026/2027**
**Milestone 2 — Simulator Design**

---

## Overview

LIMO is a 5-stage in-order pipelined processor. Each stage performs one part of instruction execution per clock cycle:

| Stage | Name | Function |
|-------|------|----------|
| IF | Instruction Fetch | Read instruction from instruction memory at PC; compute PC+4 |
| ID | Instruction Decode | Decode opcode; read register operands; generate control signals; sign-extend immediate |
| EX | Execute | ALU operation; branch comparison; compute branch target |
| MEM | Memory Access | Load from or store to data memory (only for `kenya` / `boloka`) |
| WB | Write Back | Write result (from ALU or memory) to register file |

---

## Block Diagram

```mermaid
flowchart LR
    PC[PC] --> IM[Instruction Memory]
    IM --> IFID[IF/ID]
    IFID --> ID[Decode + Reg Read]
    ID --> IDEX[ID/EX]
    IDEX --> EX[ALU / Branch Compare]
    EX --> EXMEM[EX/MEM]
    EXMEM --> MEM[Data Memory]
    MEM --> MEMWB[MEM/WB]
    MEMWB --> WB[Register Write]
    WB -.-> ID

    ForwardA[Forward A] -.-> EX
    ForwardB[Forward B] -.-> EX
    Hazard[Hazard Detection] -.-> PC
    Hazard -.-> IFID
