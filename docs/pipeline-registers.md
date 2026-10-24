# LIMO — Pipeline Register Data Model

**Silicon Minds · CS3520 · NUL · AY2026/2027**
**Milestone 2 — Simulator Design**

---

## Purpose

This document defines exactly what each pipeline register carries, cycle by cycle. It is the contract between the five stages: what one stage produces, the next reads.

Design decision (A6c): **branches are resolved in EX.** The branch comparison and target are computed in EX, so EX/MEM does not need to carry them. A taken branch flushes the two younger instructions in IF/ID and ID/EX.

---

## IF/ID — Instruction Fetch → Instruction Decode

| Field | Width | Source | Meaning |
|-------|-------|--------|---------|
| pc | 32 | IF | Address of this instruction |
| pc_plus_4 | 32 | IF | Address of the next instruction (PC+4) |
| instruction | 32 | IF | The fetched 32-bit instruction word |

**Total width:** 96 bits

---

## ID/EX — Instruction Decode → Execute

| Field | Width | Source | Meaning |
|-------|-------|--------|---------|
| RegWrite | 1 | Control | Register file write enable |
| ALUSrc | 1 | Control | 0 = rs2, 1 = immediate |
| ALUControl | 4 | Control | ALU op selector |
| MemRead | 1 | Control | Data memory read enable |
| MemWrite | 1 | Control | Data memory write enable |
| MemToReg | 1 | Control | 0 = ALU result, 1 = memory data |
| Branch | 1 | Control | Instruction is a branch |
| PCSrc | 1 | Control | Redirect the PC if the branch is taken |
| branchCompare | 1 | Control | 0 = branch if equal, 1 = branch if not equal |
| pc | 32 | IF/ID | Address of this instruction (branch target base) |
| pc_plus_4 | 32 | IF/ID | Next sequential address |
| rs1_value | 32 | Register file | Value of rs1 |
| rs2_value | 32 | Register file | Value of rs2 |
| immediate | 32 | Sign-extend | Sign-extended immediate |
| rs1_addr | 4 | Instruction | rs1 index (for hazard checks and forwarding) |
| rs2_addr | 4 | Instruction | rs2 index (for hazard checks and forwarding) |
| rd_addr | 4 | Instruction | rd index |
| is_bubble | 1 | Hazard unit | 1 = this slot holds a bubble (does nothing) |

**Total width:** 185 bits (12 control + 32 + 32 + 32 + 32 + 32 + 4 + 4 + 4 + 1)

---

## EX/MEM — Execute → Memory

| Field | Width | Source | Meaning |
|-------|-------|--------|---------|
| RegWrite | 1 | ID/EX | Forwarded |
| MemRead | 1 | ID/EX | Forwarded |
| MemWrite | 1 | ID/EX | Forwarded |
| MemToReg | 1 | ID/EX | Forwarded |
| alu_result | 32 | EX | ALU output (also used as memory address) |
| store_value | 32 | ID/EX | rs2 value, written to memory by a store |
| rd_addr | 4 | ID/EX | For write-back |
| is_bubble | 1 | ID/EX | Bubble flag |

**Total width:** 73 bits (4 control + 32 + 32 + 4 + 1)

Branch outcome and branch target are **not** stored here, because the branch is resolved in EX.

---

## MEM/WB — Memory → Write Back

| Field | Width | Source | Meaning |
|-------|-------|--------|---------|
| RegWrite | 1 | EX/MEM | Write-back enable |
| MemToReg | 1 | EX/MEM | Source select |
| mem_data | 32 | Data memory | Loaded value |
| alu_result | 32 | EX/MEM | ALU result |
| rd_addr | 4 | EX/MEM | Destination register |
| is_bubble | 1 | EX/MEM | Bubble flag |

**Total width:** 71 bits (2 control + 32 + 32 + 4 + 1)

---

## Width Summary

| Register | Width (bits) |
|----------|--------------|
| IF/ID | 96 |
| ID/EX | 185 |
| EX/MEM | 73 |
| MEM/WB | 71 |

Register fields are 4 bits wide because LIMO has 16 registers, so each forwarding comparator is 4 bits wide.

---

## Notes

- **Branch target:** `pc + immediate`, computed in EX from the `pc` carried in ID/EX.
- **Bubbles:** a stall or flush inserts a bubble. All control bits are 0 and `is_bubble` = 1, so the slot does nothing as it moves down the pipeline.
- **Simulator-only data:** the simulator also keeps the decoded instruction text of each instruction for the narration and datapath views. This is not part of the hardware.
- **Step Back:** the simulator stores one snapshot per cycle (all four pipeline registers, the register file, data memory, PC and counters), so going back one step restores the previous snapshot.

---

## Hazard Handling

**Current baseline (M3, no forwarding).** An instruction in ID stalls while a producer of one of its source registers is in ID/EX or EX/MEM. It proceeds once the producer reaches WB, because the register file is written before it is read in the same cycle.

**Target design (M4).** Forwarding paths EX/MEM → EX and MEM/WB → EX (ForwardA / ForwardB), a one-cycle load-use stall, and a Forwarding ON/OFF switch.

---

## Sample Cycle Trace (target design, with forwarding)

For the program:

```
eketsa-haufi x5, lefela, 10
eketsa-haufi x6, lefela, 20
eketsa x7, x5, x6
```

| Cycle | IF | ID | EX | MEM | WB |
|-------|----|----|----|-----|-----|
| 1 | addi x5 | | | | |
| 2 | addi x6 | addi x5 | | | |
| 3 | add x7 | addi x6 | addi x5 | | |
| 4 | | add x7 | addi x6 | addi x5 | |
| 5 | | | add x7 | addi x6 | addi x5 |
| 6 | | | | add x7 | addi x6 |
| 7 | | | | | add x7 |

**No stalls.** With forwarding, x6 comes from EX/MEM and x5 from MEM/WB.

Without forwarding (the M3 baseline), `add x7` waits in ID for cycles 4–6 and the program takes 9 cycles with 2 stalls.

---

*End of Pipeline Register Data Model — LIMO · Silicon Minds*
