# LIMO — Pipeline Register Data Model

**Silicon Minds · CS3520 · NUL · AY2026/2027**
**Milestone 2 — Simulator Design**

---

## Purpose

This document defines exactly what each pipeline register carries, cycle by cycle. It is the contract between the five stages: what one stage produces, the next reads.

---

## IF/ID — Instruction Fetch → Instruction Decode

| Field | Width | Source | Meaning |
|-------|-------|--------|---------|
| pc_plus_4 | 32 | IF | Address of the next instruction (PC+4) |
| instruction | 32 | IF | The fetched 32-bit instruction word |

**Total width:** 64 bits

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
| Branch | 1 | Control | Branch flag |
| PCSrc | 1 | Control | Next PC select |
| pc_plus_4 | 32 | IF/ID | For branch target computation |
| rs1_value | 32 | Register file | Value of rs1 |
| rs2_value | 32 | Register file | Value of rs2 |
| immediate | 32 | Sign-extend | Sign-extended immediate |
| rs1_addr | 4 | Instruction | rs1 index (for forwarding) |
| rs2_addr | 4 | Instruction | rs2 index (for forwarding) |
| rd_addr | 4 | Instruction | rd index |
| funct3 | 3 | Instruction | For branch comparison selection |

**Total width:** 160 bits

---

## EX/MEM — Execute → Memory

| Field | Width | Source | Meaning |
|-------|-------|--------|---------|
| RegWrite | 1 | ID/EX | Forwarded |
| MemRead | 1 | ID/EX | Forwarded |
| MemWrite | 1 | ID/EX | Forwarded |
| MemToReg | 1 | ID/EX | Forwarded |
| Branch | 1 | ID/EX | Forwarded (for PCSrc decision) |
| alu_result | 32 | EX | ALU output (also used as memory address) |
| rs2_value | 32 | ID/EX | For store instructions |
| rd_addr | 4 | ID/EX | For write-back |
| zero | 1 | EX | Comparison result (for branches) |
| branch_target | 32 | EX | Target if branch taken |

**Total width:** 112 bits

---

## MEM/WB — Memory → Write Back

| Field | Width | Source | Meaning |
|-------|-------|--------|---------|
| RegWrite | 1 | EX/MEM | Write-back enable |
| MemToReg | 1 | EX/MEM | Source select |
| mem_data | 32 | Data memory | Loaded value |
| alu_result | 32 | EX/MEM | ALU result |
| rd_addr | 4 | EX/MEM | Destination register |

**Total width:** 72 bits

---

## Sample Cycle Trace

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

**No stalls.** All RAW dependencies are resolved by forwarding (EX/MEM and MEM/WB).

---

*End of Pipeline Register Data Model — LIMO · Silicon Minds*
