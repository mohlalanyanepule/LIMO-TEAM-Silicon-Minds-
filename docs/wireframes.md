# LIMO — Interface Wireframes

**Silicon Minds · CS3520 · NUL · AY2026/2027**
**Milestone 2 — Simulator Design**

---

## Screen 1 — Main View

```
+------------------------------------------------------------------+
|  LIMO SIMULATOR  |  Silicon Minds  |  [Freshman Mode: ON]         |
+------------------------------------------------------------------+
|                                                                  |
|  +---------------------------+  +----------------------------+   |
|  | EDITOR                    |  | DATAPATH VIEW              |   |
|  |                           |  |                            |   |
|  |  1  eketsa-haufi x5,...   |  |  [IF] [ID] [EX] [MEM] [WB] |   |
|  |  2  eketsa-haufi x6,...   |  |                            |   |
|  |  3  eketsa x7, x5, x6     |  |  (highlighted stage)       |   |
|  |  4  boloka x7, 0(x2)      |  |                            |   |
|  |  5  ...                   |  |  Live values on wires      |   |
|  |                           |  |                            |   |
|  +---------------------------+  +----------------------------+   |
|                                                                  |
|  +---------------------------+  +----------------------------+   |
|  | CONTROL SIGNALS           |  | REGISTERS & MEMORY         |   |
|  |  RegWrite: 1              |  |  x0 lefela: 0x00000000     |   |
|  |  ALUSrc:   1              |  |  x1 mohlophisi: 0x...      |   |
|  |  ALUControl: 0000         |  |  x2 mokgethi: 0x00007FFC   |   |
|  |  MemRead:  0              |  |  ...                       |   |
|  |  MemWrite: 0              |  |                            |   |
|  |  MemToReg: 0              |  |  MEM[0x00001000]: 0x...    |   |
|  |  Branch:   0              |  |  MEM[0x00001004]: 0x...    |   |
|  |  PCSrc:    0              |  |                            |   |
|  +---------------------------+  +----------------------------+   |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | STATISTICS                                                 |  |
|  |  Cycles: 12   |   CPI: 1.20   |   Stalls: 2  |  Flushes: 1  |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  [ Step ] [ Run ] [ Pause ] [ Reset ] [ Step Back ]              |
+------------------------------------------------------------------+
```

---

## Screen 2 — Freshman Mode Narration Panel

```
+------------------------------------------------------------------+
|  Freshman Mode Narration                                          |
+------------------------------------------------------------------+
|                                                                  |
|  Cycle 5:                                                        |
|                                                                  |
|  English:                                                         |
|  "The ADD instruction is in the Execute stage. The ALU is adding  |
|   x5 (10) and x6 (20) to produce 30. The result will be written   |
|   to x7 in the next two cycles."                                  |
|                                                                  |
|  Sesotho:                                                         |
|  "Taelo ya ADD e teng mo Execute. ALU e eketsa x5 (10) le x6     |
|   (20) ho etsa 30. Sephetho se tla ngolwa ho x7 ka di-cycle      |
|   tse pedi tse tlang."                                            |
|                                                                  |
+------------------------------------------------------------------+
```

---

## Screen 3 — Pipeline Chart

```
+------------------------------------------------------------------+
|  Pipeline Chart                                                   |
+------------------------------------------------------------------+
|  Instruction        | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10    |
|---------------------|---|---|---|---|---|---|---|---|---|-------|
|  addi x5, x0, 10    | IF| ID| EX|MEM| WB|   |   |   |   |       |
|  addi x6, x0, 20    |   | IF| ID| EX|MEM| WB|   |   |   |       |
|  add x7, x5, x6     |   |   | IF| ID| EX|MEM| WB|   |   |       |
|  lw   x8, 0(x2)     |   |   |   | IF| ID| EX|MEM| WB|   |       |
|  add  x9, x8, x7    |   |   |   |   | IF| ID|STL| EX|MEM| WB    |
|  sw   x9, 4(x2)     |   |   |   |   |   | IF|STL| ID| EX|MEM    |
+------------------------------------------------------------------+
```

*(STL = stall cycle)*

---

## Screen 4 — Example Programs Panel

```
+------------------------------------------------------------------+
|  Example Programs                                                 |
+------------------------------------------------------------------+
|  [1] program1.limo — Arithmetic and Logic                         |
|  [2] program2.limo — Array Sum with Loop                          |
|  [3] program3.limo — Hazard Demonstration (RAW, load-use, branch) |
|  [4] example4.limo — Immediate and Shift                          |
|  [5] example5.limo — Branch Not Taken                             |
+------------------------------------------------------------------+
```

*(At least 5 examples required by B7.)*

---

## Screen 5 — Error Reporting

```
+------------------------------------------------------------------+
|  Assembler Errors                                                 |
+------------------------------------------------------------------+
|  Line 7: Unknown mnemonic "eketsaa"                               |
|    Did you mean "eketsa"?                                         |
|                                                                  |
|  Line 12: Register x99 does not exist (only x0-x15)               |
|                                                                  |
|  Line 18: Immediate 3000 out of range for I-type (-2048..2047)    |
|                                                                  |
|  Line 24: Undefined label "lopp"                                  |
|    Closest match: "loop"                                          |
+------------------------------------------------------------------+
```

---

## Screen 6 — Hazard Visualisation

```
+------------------------------------------------------------------+
|  Hazard Detected: RAW                                             |
+------------------------------------------------------------------+
|                                                                  |
|  Cycle 4:                                                         |
|                                                                  |
|    EX/MEM.rd   = x7                                               |
|    ID/EX.rs1   = x7   ← MATCH                                     |
|                                                                  |
|  Forwarding path activated: EX/MEM → EX (ForwardA = 10)          |
|                                                                  |
|  No stall needed.                                                 |
|                                                                  |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  Hazard Detected: Load-Use                                        |
+------------------------------------------------------------------+
|                                                                  |
|  Cycle 3:                                                         |
|                                                                  |
|    ID/EX.MemRead = 1                                              |
|    ID/EX.rd      = x5                                             |
|    IF/ID.rs1     = x5   ← MATCH                                   |
|                                                                  |
|  Action: insert 1 bubble (stall IF/ID and PC).                    |
|                                                                  |
|  Cycles added: 1                                                  |
|                                                                  |
+------------------------------------------------------------------+
```

---

## Colour and Accessibility

- Colours are never the only cue — every stage has a distinct **label** in addition to a colour
- Text contrast ratio ≥ 4.5:1
- Tooltips on every datapath unit and control signal
- Keyboard navigation supported for Step / Run / Pause
- Screen-reader-friendly labels on all interactive controls

---

## Layout Responsiveness

| Screen size | Layout |
|-------------|--------|
| Desktop (≥ 1024 px) | 2×2 grid: editor + datapath / control + registers |
| Tablet (768–1023 px) | Single column: editor → datapath → control → registers |
| Phone (< 768 px) | Tabs: Editor / Datapath / Registers / Stats |

---

*End of Interface Wireframes — LIMO · Silicon Minds*
