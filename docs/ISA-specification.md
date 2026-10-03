# LIMO Instruction Set Architecture

**Silicon Minds · CS3520 · NUL · AY2026/2027**
**Deliverable A — ISA Specification (A1–A6)**

---

## A1 — Style

LIMO is a **32-bit load-store machine** derived directly from **RISC-V RV32I**:

- 32-bit fixed-width instructions
- Byte-addressed, little-endian, word-aligned (4-byte alignment)
- Only **loads and stores** touch memory; all arithmetic/logic operate on registers
- Instruction formats adopted unchanged from RV32I: **R, I, S, B** (U/J omitted)
- Every instruction is one word; branches use PC-relative offsets

**Justification for departure from RV32I:** none in format — only mnemonics are translated to Sesotho. This preserves RISC-V tooling compatibility, allows cross-checking against Ripes, and simplifies the assembler and simulator.

---

## A2 — Registers

LIMO has **16 general-purpose registers** (`x0`–`x15`), each 32 bits wide. This choice gives 4-bit register fields (rs1, rs2, rd), halving forwarding-comparator width versus a 32-register file, while still providing enough registers for typical student programs.

| Number | Sesotho Name | English Meaning | RV32I Equivalent | Notes |
|--------|--------------|-----------------|------------------|-------|
| x0 | `lefela` | zero | x0 | Hard-wired zero; writes ignored |
| x1 | `mohlophisi` | keeper / helper | x1 (ra) | Return address |
| x2 | `mokgethi` | receiver / stack | x2 (sp) | Stack pointer |
| x3 | `motjha` | first / starter | x3 (gp) | General purpose |
| x4 | `motjha-pele` | second | x4 (tp) | General purpose |
| x5 | `ntho` | thing / value | x5 (t0) | Temporary |
| x6 | `ntho-pele` | second thing | x6 (t1) | Temporary |
| x7 | `ntho-tharo` | third thing | x7 (t2) | Temporary |
| x8 | `polokelo` | storage | x8 (s0) | Saved register |
| x9 | `polokelo-pele` | second storage | x9 (s1) | Saved register |
| x10 | `phetiso` | result / return | x10 (a0) | Argument / return value |
| x11 | `phetiso-pele` | second result | x11 (a1) | Argument / return value |
| x12 | `phetiso-tharo` | third result | x12 (a2) | Argument |
| x13 | `phetiso-ne` | fourth result | x13 (a3) | Argument |
| x14 | `sebaka` | space / temp | x14 (t3) | Temporary |
| x15 | `sebaka-pele` | second space | x15 (t4) | Temporary |

**Special-purpose registers (architectural):**

| Name | Sesotho | Description |
|------|---------|-------------|
| PC | `sebaka-sa-hona` | Program counter (32-bit, byte-addressed) |
| x0 | `lefela` | Hard-wired zero |

**Microarchitectural (not architectural):** IF/ID, ID/EX, EX/MEM, MEM/WB pipeline registers; IR; ALU output latch — these are implementation details and are **not** visible to the ISA.

---

## A3 — Instructions

LIMO provides **16 instructions** (within the 10–20 range). Format column shows RV32I type.

### Arithmetic (4)

| # | Mnemonic | Operation | RV32I | Format |
|---|----------|-----------|-------|--------|
| 1 | `eketsa rd, rs1, rs2` | rd = rs1 + rs2 | `add` | R |
| 2 | `eketsa-haufi rd, rs1, imm` | rd = rs1 + imm | `addi` | I |
| 3 | `fokotsa rd, rs1, rs2` | rd = rs1 − rs2 | `sub` | R |
| 4 | `eketsa-habeli rd, rs1, rs2` | rd = rs1 × 2^rs2 (shift left logical) | `sll` | R |

### Logic (4)

| # | Mnemonic | Operation | RV32I | Format |
|---|----------|-----------|-------|--------|
| 5 | `kopanya rd, rs1, rs2` | rd = rs1 AND rs2 | `and` | R |
| 6 | `kopanya-haufi rd, rs1, imm` | rd = rs1 AND imm | `andi` | I |
| 7 | `hokela rd, rs1, rs2` | rd = rs1 OR rs2 | `or` | R |
| 8 | `hokela-haufi rd, rs1, imm` | rd = rs1 OR imm | `ori` | I |

### Memory (2)

| # | Mnemonic | Operation | RV32I | Format |
|---|----------|-----------|-------|--------|
| 9 | `kenya rd, imm(rs1)` | rd = MEM[rs1 + imm] (word load) | `lw` | I |
| 10 | `boloka rs2, imm(rs1)` | MEM[rs1 + imm] = rs2 (word store) | `sw` | S |

### Control transfer (2)

| # | Mnemonic | Operation | RV32I | Format |
|---|----------|-----------|-------|--------|
| 11 | `hlahloba rs1, rs2, label` | if rs1 == rs2, PC += offset | `beq` | B |
| 12 | `hlahloba-fapane rs1, rs2, label` | if rs1 != rs2, PC += offset | `bne` | B |

### Additional logic / comparison (4)

| # | Mnemonic | Operation | RV32I | Format |
|---|----------|-----------|-------|--------|
| 13 | `hlophisa rd, rs1, rs2` | rd = rs1 XOR rs2 | `xor` | R |
| 14 | `hlophisa-haufi rd, rs1, imm` | rd = rs1 XOR imm | `xori` | I |
| 15 | `bapisa-hanyane rd, rs1, rs2` | rd = (rs1 < rs2) ? 1 : 0 | `slt` | R |
| 16 | `arola rd, rs1, rs2` | rd = rs1 >> rs2 (logical right shift) | `srl` | R |

**Prohibited (per A3):** multiply, divide, floating point, CSRs, exceptions, system calls.

---

## A4 — Sesotho Assembly Glossary

Each mnemonic is a Sesotho word or documented abbreviation. All are typeable on a standard keyboard.

| Mnemonic | Sesotho Meaning | English Operation | RV32I |
|----------|-----------------|-------------------|-------|
| `eketsa` | to add | add | add |
| `eketsa-haufi` | add (near/immediate) | add immediate | addi |
| `fokotsa` | to subtract/reduce | subtract | sub |
| `eketsa-habeli` | to add twice (shift) | shift left logical | sll |
| `kopanya` | to combine/join | AND | and |
| `kopanya-haufi` | combine (immediate) | AND immediate | andi |
| `hokela` | to connect/attach | OR | or |
| `hokela-haufi` | connect (immediate) | OR immediate | ori |
| `kenya` | to insert/load in | load word | lw |
| `boloka` | to store/keep | store word | sw |
| `hlahloba` | to check/test | branch if equal | beq |
| `hlahloba-fapane` | check (different) | branch if not equal | bne |
| `hlophisa` | to arrange/differ | XOR | xor |
| `hlophisa-haufi` | differ (immediate) | XOR immediate | xori |
| `bapisa-hanyane` | compare (smaller) | set less than | slt |
| `arola` | to divide/separate | shift right logical | srl |

### Apostrophe handling

Lesotho orthography uses `ts'` and `ch'` for the aspirated affricates. LIMO's assembler:

- Accepts **both** `ts'` and `t's` for the same token
- Accepts **both** `ch'` and `c'h`
- Case-insensitive for mnemonics (`EKETSA` = `eketsa`)
- The apostrophe is a valid identifier character, so `ts'a` and `t'sa` are both valid labels

No instruction mnemonic currently uses apostrophes, but the rule is documented so labels and comments work naturally.

---

## A5 — Encoding and Specification

### Instruction formats (RV32I-derived)

```
R-type:  | funct7 | rs2 | rs1 | funct3 | rd | opcode |
         31    25 24 20 19 15 14  12 11  7 6      0

I-type:  |     imm[11:0]     | rs1 | funct3 | rd | opcode |
         31                20 19 15 14  12 11  7 6      0

S-type:  | imm[11:5] | rs2 | rs1 | funct3 | imm[4:0] | opcode |
         31      25 24 20 19 15 14  12 11      7 6      0

B-type:  |imm[12|10:5]| rs2 | rs1 | funct3 |imm[4:1|11]| opcode |
         31        25 24 20 19 15 14  12 11        7 6      0
```

### Opcode / funct assignments

| Instruction | Format | opcode | funct3 | funct7 |
|-------------|--------|--------|--------|--------|
| add | R | 0110011 | 000 | 0000000 |
| sub | R | 0110011 | 000 | 0100000 |
| sll | R | 0110011 | 001 | 0000000 |
| slt | R | 0110011 | 010 | 0000000 |
| xor | R | 0110011 | 100 | 0000000 |
| or  | R | 0110011 | 110 | 0000000 |
| and | R | 0110011 | 111 | 0000000 |
| srl | R | 0110011 | 101 | 0000000 |
| addi | I | 0010011 | 000 | — |
| andi | I | 0010011 | 111 | — |
| ori  | I | 0010011 | 110 | — |
| xori | I | 0010011 | 100 | — |
| lw   | I | 0000011 | 010 | — |
| sw   | S | 0100011 | 010 | — |
| beq  | B | 1100011 | 000 | — |
| bne  | B | 1100011 | 001 | — |

### Immediate ranges

| Format | Immediate width | Range |
|--------|-----------------|-------|
| I | 12 bits (signed) | −2048 to +2047 |
| S | 12 bits (signed) | −2048 to +2047 |
| B | 13 bits (signed, ×2) | −4096 to +4094 bytes |

### Hand-encoded examples

**Example 1 — R-type:** `eketsa x5, x6, x7` (add x5, x6, x7)

- funct7 = `0000000`
- rs2 = x7 = `00111`
- rs1 = x6 = `00110`
- funct3 = `000`
- rd = x5 = `00101`
- opcode = `0110011`

Binary:
```
0000000 00111 00110 000 00101 0110011
```

Hex: `0x007302B3`

**Example 2 — I-type:** `eketsa-haufi x5, x6, 10` (addi x5, x6, 10)

- imm = 10 = `000000001010`
- rs1 = x6 = `00110`
- funct3 = `000`
- rd = x5 = `00101`
- opcode = `0010011`

Binary:
```
000000001010 00110 000 00101 0010011
```

Hex: `0x00A30293`

**Example 3 — S-type:** `boloka x7, 4(x6)` (sw x7, 4(x6))

- imm[11:5] = `0000000`
- rs2 = x7 = `00111`
- rs1 = x6 = `00110`
- funct3 = `010`
- imm[4:0] = `00100`
- opcode = `0100011`

Binary:
```
0000000 00111 00110 010 00100 0100011
```

Hex: `0x00732223`

**Example 4 — B-type:** `hlahloba x5, x6, +8` (beq x5, x6, +8)

- imm[12|10:5] = `0000000`
- rs2 = x6 = `00110`
- rs1 = x5 = `00101`
- funct3 = `000`
- imm[4:1|11] = `01000`
- opcode = `1100011`

Binary:
```
0000000 00110 00101 000 01000 1100011
```

Hex: `0x00628263`

---

## A6 — Design-Decision Log

### (a) Register-file size — cost and benefit

Sixteen registers give 4-bit `rs1`, `rs2`, and `rd` fields — exactly half a byte each. Forwarding comparators therefore compare 4 bits per operand, twice per ALU input, so 8 comparator bits per stage. With 32 registers we would need 5-bit fields and 10 comparator bits — a 25% increase for no clear benefit. Register pressure is the cost: only 15 writable registers remain after `lefela`, and our largest test program (array sum with index and temporary) uses 7 — comfortable. Beyond ~12 live values, code would start spilling to the stack, but that is outside our intended workload.

### (b) Architectural vs microarchitectural registers

Architectural: `lefela`, `mohlophisi`, `mokgethi`, `phetiso` etc., plus the PC. Microarchitectural: IF/ID, ID/EX, EX/MEM, MEM/WB; the IR; the ALU output latch; the forwarding mux selectors. The ISA must **not** specify microarchitectural registers because different implementations may pipeline differently — a single-cycle LIMO and a five-stage LIMO must be binary-compatible. If the ISA exposed IF/ID, a program could legally observe an intermediate value that a different microarchitecture would never produce, breaking portability. The ISA is the contract between software and any correct hardware; microarchitecture is the implementation choice.

### (c) Where branches resolve

LIMO resolves branches in **EX**, after the comparison is performed by the ALU. This costs **two flushed instructions** per taken branch: the instruction in IF/ID and the one in ID/EX at the moment the branch resolves. The benefit is a single branch adder in EX — no separate comparator in ID, no early-target buffer, no decode-time hazard logic. Moving resolution to ID would reduce the flush to one instruction but requires an extra comparator, an early branch-target adder, and stall logic in ID, roughly doubling the branch hardware. For a teaching simulator where clarity matters more than CPI, EX resolution is the better trade-off.

### (d) Load-use stall under full forwarding

Full forwarding routes the ALU output and the MEM/WB value back to the EX inputs, but the **loaded data only becomes available at the end of MEM**. The dependent instruction reaches EX one cycle before the load finishes MEM, so there is no wire to forward from — the value does not exist yet. One bubble is mandatory.

Cycle diagram for `lw x5, 0(x6)` followed by `add x7, x5, x8`:

| Cycle | 1 | 2 | 3 | 4 | 5 | 6 |
|-------|---|---|---|---|---|---|
| lw  | IF | ID | EX | MEM | WB | |
| add | | IF | ID | EX(stall) | EX | MEM |
| bubble | | | | | IF | ID |

Without a stall, `add` would sample `x5` in cycle 4 — but the load only writes back in cycle 5. The stall pushes `add`'s EX to cycle 5, and forwarding from MEM/WB supplies the value.

### (e) Flags register?

LIMO should **not** adopt a flags register. RV32I deliberately omits flags, and adding them would:

1. Widen every pipeline register to carry the flag bits
2. Require flag-forwarding comparators on top of data forwarding
3. Create a second class of RAW hazards for every ALU instruction
4. Break the clean orthogonal relationship between ALU operations and branches

Branches in LIMO compare two registers directly in EX with a dedicated comparator — no state to forward, no hidden dependency. A flags register would trade one clean comparator for a dozen new hazard rules. Not worth it.

### (f) What breaks first as programs grow?

**Branch reach** breaks first. I-type and S-type immediates span ±2 KB — fine for loads and stores. B-type branches span ±4 KB, and a first-year student's loop body of 20 instructions occupies only 80 bytes, so branch reach is not the immediate problem either. What actually breaks first is **register pressure** once a program uses three or four nested loops with array indices: 16 registers run out and the assembler must spill to the stack. However, in our intended workload (≤ 100 instructions, ≤ 4 live values), the **branch offset** field is the first to be exceeded once a program exceeds roughly 1 000 instructions. For realistic LIMO programs, all three are comfortable; the theoretical first failure is branch reach.

---

*End of ISA Specification — LIMO · Silicon Minds*
