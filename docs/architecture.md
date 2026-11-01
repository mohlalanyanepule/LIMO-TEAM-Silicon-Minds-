# LIMO — Architecture and Block Diagram

**Silicon Minds · CS3520 · NUL · AY2026/2027**  
**Milestone 2 — Simulator Design**

---

## 1) Overview

LIMO is a 32-bit, load–store, in-order processor derived from RISC-V RV32I, with a Sesotho assembly language. It implements a classic **five-stage pipeline** (IF, ID, EX, MEM, WB) with pipeline registers between stages. Only `kenya` (load word) and `boloka` (store word) access data memory. The machine is byte-addressed, little-endian, and word-aligned.

---

## 2) Register File

LIMO uses a **16-register** general-purpose register file (chosen for smaller field widths and efficient forwarding comparators).

| Register | Sesotho Name | Architectural Role |
|-----------|---------------|--------------------|
| x0 | lefela | Hard-wired zero |
| x1 | mohlophisi | Assembler/reserved |
| x2 | mokgethi | Stack pointer |
| x3 | motjha | General purpose |
| x4 | motjha-pele | General purpose |
| x5 | ntho | General purpose |
| x6 | ntho-pele | General purpose |
| x7 | ntho-tharo | General purpose |
| x8 | polokelo | General purpose |
| x9 | polokelo-pele | General purpose |
| x10 | phetiso | General purpose / return/value |
| x11 | phetiso-pele | General purpose / argument/value |
| x12 | phetiso-tharo | General purpose |
| x13 | phetiso-ne | General purpose |
| x14 | sebaka | General purpose |
| x15 | sebaka-pele | General purpose (return address/common use) |

**Program Counter (PC)** is a programmer-visible architectural register. 

**Microarchitectural registers** (not part of the ISA): IF/ID, ID/EX, EX/MEM, MEM/WB pipeline registers, IR/temporary latches — these exist only to support pipelining and must not be exposed to the programmer.

---

## 3) Pipeline Stages

| Stage | Name | Function |
|-------|------|----------|
| **IF** | Instruction Fetch | Fetch 32-bit instruction from Instruction Memory at PC. Compute PC+4. |
| **ID** | Instruction Decode | Decode instruction, read operands from register file, generate control signals, sign-extend immediate. Perform hazard detection in M3/M4. |
| **EX** | Execute | ALU operation, branch comparison, compute branch target (PC + immediate). Branches are **resolved in EX** (see §4). |
| **MEM** | Memory Access | Read or write Data Memory for `kenya`/`boloka`. Pass ALU result/address and data forward. |
| **WB** | Write Back | Write result to register file (ALU result or loaded data). Writes occur to complete instruction retirement. |

---

## 4) Branch Resolution & Pipeline Control

- **Branch resolution:** LIMO resolves branches in the **EX** stage. The branch condition is evaluated and the target `PC + immediate` is computed in EX.
- **Cost:** On a taken branch, the instructions fetched in **IF** and in **ID** are **younger** and must be **flushed** (converted to bubbles). The simulator counts **2 flushes** in the standard case.
- **Self-branch handling:** A self-branch (e.g. `fin: hlahloba lefela, lefela, fin`) is detected and the pipeline is drained and halted cleanly.
- **Conservative stalls (M3):** In the current baseline, RAW hazards stall in ID until the producer reaches **WB**. **Forwarding** (EX/MEM→EX, MEM/WB→EX) is planned for M4 with a Forwarding ON/OFF switch.

---

## 5) Block Diagram

```mermaid
flowchart LR
  PC[PC] --> IM[Instruction Memory]
  IM --> IFID[IF/ID Pipeline Register]
  IFID --> ID[ID: Decode + Reg Read + Control]
  ID --> IDEX[ID/EX Pipeline Register]
  IDEX --> EX[EX: ALU + Branch Compare + Target]
  EX --> EXMEM[EX/MEM Pipeline Register]
  EXMEM --> MEM[MEM: Data Memory]
  MEM --> MEMWB[MEM/WB Pipeline Register]
  MEMWB --> WB[WB: Reg Write]
  WB -.-> RF[(Register File)]
  RF -.-> ID

  HD[Hazard Detection Unit] --> PC
  HD --> IFID
  HD --> IDEX

  FW[Forwarding Unit M4] -.-> EX
  EXMEM -.-> FW
  MEMWB -.-> FW

  classDef reg fill:#f7f7ff,stroke:#4a4a8a
  class IFID,IDEX,EXMEM,MEMWB reg
```

*Note:* In M3 (current implementation), Hazard Detection performs stalls; Forwarding Unit is planned for M4.

---

## 6) Memories

| Memory | Type | Notes |
|--------|------|-------|
| **Instruction Memory (IMEM)** | Read-only in simulation | Loaded from assembled LIMO program; word-aligned accesses. |
| **Data Memory (DMEM)** | Read/Write | Accessed only by `kenya` (load) and `boloka` (store). Byte-addressed, word-aligned in normal use. |

---

## 7) Control Signals (ID-generated)

Key control signals generated in ID and carried down the pipeline: `RegWrite`, `ALUSrc`, `ALUControl`, `MemRead`, `MemWrite`, `MemToReg`, `Branch`, `PCSrc` (and branch type). These are displayed in the **Control Signals** panel of the simulator.

---

## 8) Design Decisions (Summary)

- **16 registers** reduce encoding bits and forwarding comparator width while keeping register pressure reasonable.
- **Branches in EX** trades extra flushes for simpler hardware compared to resolving earlier/later.
- **Load-use** cannot always be fully resolved by forwarding alone and requires a stall in this design.
- **RISC-V-like formats (R/I/S/B)** keep encoding regular and easy to decode.

---

**References:** Patterson & Hennessy (RISC-V Edition), Harris & Harris (DDCA RISC-V Edition), course ISA specification (`docs/ISA-specification.md`).

---

## 9) LIMO Datapath Diagram (5-Stage Pipelined)

The diagram below shows the datapath structure used by the LIMO simulator, with pipeline registers between stages, control signals, and the paths for data memory and write-back.

```mermaid
flowchart TD
  subgraph IF ["IF - Instruction Fetch"]
    PC[PC]
    IM[Instruction Memory]
    ADD4[+4]
    PC4[PC+4]
  end

  subgraph IFID ["IF/ID Register"]
    IFID_PC[PC]
    IFID_INST[Instruction]
    IFID_PC4[PC+4]
  end

  subgraph ID ["ID - Instruction Decode"]
    DEC[Decoder]
    RF[(Register File\n16 registers)]
    CTRL[Control Unit]
    IMM[Immediate Generator\nSign Extend]
    HAZ[Hazard Detection\nM3: Stall]
  end

  subgraph IDEX ["ID/EX Register"]
    IDEX_CTRL[Control Signals]
    IDEX_PC[PC]
    IDEX_RS1[rs1 Value]
    IDEX_RS2[rs2 Value]
    IDEX_IMM[Immediate]
    IDEX_RD[rd/rs1/rs2]
  end

  subgraph EX ["EX - Execute"]
    MUXA[ALU Src A Mux]
    MUXB[ALU Src B Mux]
    ALU[ALU]
    BR[Branch\nComparator]
    BTARGET[Branch Target\nPC + Imm]
  end

  subgraph EXMEM ["EX/MEM Register"]
    EXMEM_CTRL[Control Signals]
    EXMEM_ALU[ALU Result / Address]
    EXMEM_RS2[Store Data]
    EXMEM_RD[rd]
  end

  subgraph MEM ["MEM - Memory Access"]
    DMEM[Data Memory\nLoad/Store]
  end

  subgraph MEMWB ["MEM/WB Register"]
    MEMWB_CTRL[Control Signals]
    MEMWB_DATA[Mem Data / ALU Result]
    MEMWB_RD[rd]
  end

  subgraph WB ["WB - Write Back"]
    MUXWB[MemToReg Mux]
    WBDATA[Write Data]
  end

  PC --> IM
  IM --> IFID_INST
  PC --> ADD4
  ADD4 --> PC4
  PC4 --> IFID_PC4
  PC4 --> PC

  IFID_INST --> DEC
  IFID_INST --> IMM
  DEC --> RF
  DEC --> CTRL
  RF --> IDEX_RS1
  RF --> IDEX_RS2
  IFID_PC --> IDEX_PC

  CTRL --> IDEX_CTRL
  IMM --> IDEX_IMM
  DEC --> IDEX_RD

  IDEX_RS1 --> MUXA
  IDEX_RS2 --> MUXB
  IDEX_IMM --> MUXB
  IDEX_CTRL --> MUXB
  IDEX_CTRL --> MUXA
  MUXA --> ALU
  MUXB --> ALU
  IDEX_PC --> BTARGET
  IDEX_IMM --> BTARGET
  ALU --> BR
  IDEX_RS1 --> BR
  IDEX_RS2 --> BR

  ALU --> EXMEM_ALU
  IDEX_RS2 --> EXMEM_RS2
  IDEX_CTRL --> EXMEM_CTRL
  IDEX_RD --> EXMEM_RD

  EXMEM_ALU --> DMEM
  EXMEM_RS2 --> DMEM
  EXMEM_CTRL --> DMEM
  DMEM --> MEMWB_DATA
  EXMEM_ALU --> MEMWB_DATA
  EXMEM_CTRL --> MEMWB_CTRL
  EXMEM_RD --> MEMWB_RD

  MEMWB_DATA --> MUXWB
  MEMWB_CTRL --> MUXWB
  MUXWB --> WBDATA
  WBDATA --> RF

  HAZ --> PC
  HAZ --> IFID
  HAZ --> IDEX
  BR --> HAZ

  style IF fill:#e8f4ff
  style ID fill:#f0fff4
  style EX fill:#fff4e6
  style MEM fill:#fef3f2
  style WB fill:#f3e8ff
  style IFID fill:#f9f9f9
  style IDEX fill:#f9f9f9
  style EXMEM fill:#f9f9f9
  style MEMWB fill:#f9f9f9

---

## 9) LIMO Datapath Diagram (5-Stage Pipelined)

The diagram below shows the datapath structure used by the LIMO simulator, with pipeline registers between stages, control signals, and the paths for data memory and write-back.

```mermaid
flowchart TD
  subgraph IF ["IF - Instruction Fetch"]
    PC[PC]
    IM[Instruction Memory]
    ADD4[+4]
    PC4[PC+4]
  end

  subgraph IFID ["IF/ID Register"]
    IFID_PC[PC]
    IFID_INST[Instruction]
    IFID_PC4[PC+4]
  end

  subgraph ID ["ID - Instruction Decode"]
    DEC[Decoder]
    RF[(Register File\n16 registers)]
    CTRL[Control Unit]
    IMM[Immediate Generator\nSign Extend]
    HAZ[Hazard Detection\nM3: Stall]
  end

  subgraph IDEX ["ID/EX Register"]
    IDEX_CTRL[Control Signals]
    IDEX_PC[PC]
    IDEX_RS1[rs1 Value]
    IDEX_RS2[rs2 Value]
    IDEX_IMM[Immediate]
    IDEX_RD[rd/rs1/rs2]
  end

  subgraph EX ["EX - Execute"]
    MUXA[ALU Src A Mux]
    MUXB[ALU Src B Mux]
    ALU[ALU]
    BR[Branch\nComparator]
    BTARGET[Branch Target\nPC + Imm]
  end

  subgraph EXMEM ["EX/MEM Register"]
    EXMEM_CTRL[Control Signals]
    EXMEM_ALU[ALU Result / Address]
    EXMEM_RS2[Store Data]
    EXMEM_RD[rd]
  end

  subgraph MEM ["MEM - Memory Access"]
    DMEM[Data Memory\nLoad/Store]
  end

  subgraph MEMWB ["MEM/WB Register"]
    MEMWB_CTRL[Control Signals]
    MEMWB_DATA[Mem Data / ALU Result]
    MEMWB_RD[rd]
  end

  subgraph WB ["WB - Write Back"]
    MUXWB[MemToReg Mux]
    WBDATA[Write Data]
  end

  PC --> IM
  IM --> IFID_INST
  PC --> ADD4
  ADD4 --> PC4
  PC4 --> IFID_PC4
  PC4 --> PC

  IFID_INST --> DEC
  IFID_INST --> IMM
  DEC --> RF
  DEC --> CTRL
  RF --> IDEX_RS1
  RF --> IDEX_RS2
  IFID_PC --> IDEX_PC

  CTRL --> IDEX_CTRL
  IMM --> IDEX_IMM
  DEC --> IDEX_RD

  IDEX_RS1 --> MUXA
  IDEX_RS2 --> MUXB
  IDEX_IMM --> MUXB
  IDEX_CTRL --> MUXB
  IDEX_CTRL --> MUXA
  MUXA --> ALU
  MUXB --> ALU
  IDEX_PC --> BTARGET
  IDEX_IMM --> BTARGET
  ALU --> BR
  IDEX_RS1 --> BR
  IDEX_RS2 --> BR

  ALU --> EXMEM_ALU
  IDEX_RS2 --> EXMEM_RS2
  IDEX_CTRL --> EXMEM_CTRL
  IDEX_RD --> EXMEM_RD

  EXMEM_ALU --> DMEM
  EXMEM_RS2 --> DMEM
  EXMEM_CTRL --> DMEM
  DMEM --> MEMWB_DATA
  EXMEM_ALU --> MEMWB_DATA
  EXMEM_CTRL --> MEMWB_CTRL
  EXMEM_RD --> MEMWB_RD

  MEMWB_DATA --> MUXWB
  MEMWB_CTRL --> MUXWB
  MUXWB --> WBDATA
  WBDATA --> RF

  HAZ --> PC
  HAZ --> IFID
  HAZ --> IDEX
  BR --> HAZ
```

**Key points:** Branches resolved in **EX**, control signals carried through pipeline registers, writes to register file in **WB**, and hazard detection/stalling in **M3** (forwarding planned for **M4**).
