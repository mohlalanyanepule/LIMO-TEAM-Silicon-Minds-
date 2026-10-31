# LIMO Test Report (B8)

Silicon Minds · CS3520 Computer Organisation and Architecture I · M5
Tested commit: `5b82cf1` (31 October 2026) · Prepared by: **TO FILL (team members)**

This report covers the four parts of B8: (i) automated unit tests, (ii) eight test programs with hand-derived expectations, (iii) the Ripes cross-check and (iv) the usability test. Items marked **TO FILL** need results that only the team can produce; they are not guessed here.

## 1. Automated unit tests (B8 i)

**One command:** `npm test` (runs `vitest run`). The same command runs on every push to `main` through GitHub Actions (`.github/workflows/test.yml`), and the site is deployed only if the tests pass.

| Test file | Unit under test | Tests | What it checks |
|---|---|---|---|
| `tests/assembler.test.js` | Assembler | 35 | The four M1 hex examples (`0x000841B3`, `0x0028C213`, `0x004D1223`, `0x00084163`); all 11 instructions; 4-bit register fields (r0 to r15, `r16` rejected); 14-bit immediates (-8192 and 8191 accepted, 8192 and -8193 rejected); hex immediates; Sesotho register names; forward and backward labels; comments, apostrophes and case; error messages with line numbers; the three M1 sample programs |
| `tests/decoder.test.js` | Instruction decoder | 40 | Field extraction for R, I, S and B formats; sign extension of 14-bit immediates; branch offsets in bytes (+8 and -4); round trip for every one of the 11 mnemonics; lookup that does not depend on immediate bits; invalid words (all zero, unknown opcode); 16 register names |
| `tests/control.test.js` | Control decoder | 12 | A control entry for every instruction; signal values for R, I, load (`jara`), store (`boloka`) and both branches (`tekano` `eq`, `phapano` `ne`); the all-off signals for an invalid word; the table cannot be changed by callers |
| `tests/pipeline.test.js` | Pipeline, hazard and forwarding unit | 39 | Example programs 1 to 3; five-stage fill; `r0` fixed at zero; CPI; forwarding from EX/MEM and MEM/WB (ForwardA); one load-use stall; no stall when an independent instruction separates a load from its use; forwarding OFF gives the same results with more stalls; branch taken and not taken; backward loop; store and load; preloaded memory and registers; misaligned access error; cycle limit; reset; step back; pipeline registers and history for the views |
| `tests/programs.test.js` | Test programs 4 to 8 | 19 | Hand-derived registers, memory, cycles, stalls and flushes (section 2); forwarding ON and OFF give the same registers and memory for all eight programs |
| `tests/alu.test.js` | ALU | 10 | ADD, SUB, AND, OR, SLL and the unused SLT, XOR and SRL; ALU names; unknown control value |

**Total: 155 tests, all passing on `main`.** The authoritative count is the one printed in the Actions log for the latest run.

## 2. Test programs with hand-derived expectations (B8 ii)

Every expected cycle count is derived by hand with one rule:

`cycles = instructions + 4 (pipeline fill) + stalls + 2 x (taken branches that flush)`

The final self-branch (`fin: tekano r0, r0, fin`) counts as one instruction. With forwarding **OFF**, a dependent instruction right after its producer waits 2 cycles, one that is two instructions behind waits 1, and one that is three or more behind waits 0. Earlier stalls also push later instructions further away, so the stall count has to be worked out in order.

| # | File | Class covered | Expected registers and memory | Hand-derived cycles (fwd ON) | Simulator (ON) | Stalls / flushes (ON) | Simulator (OFF) |
|---|---|---|---|---|---|---|---|
| 1 | `program1.limo` | R and I arithmetic, logic, shift | r3=7 r4=5 r5=12 r6=2 r7=16 r8=4 r9=7 r10=8 r11=20 | 10 + 4 = **14** | 14 | 0 / 0 | 17 |
| 2 | `program2.limo` | Array loop, store, load, taken branch, load-use | r3=50 r4=20 r5=20 r6=150 r7=50; memory 10, 20, 30, 40, 50 at 0, 4, 8, 12, 16 | 34 + 4 + 5 + 4x2 = **51** | 51 | 5 / 4 | 76 |
| 3 | `program3.limo` | RAW with forwarding, load-use, taken branch | r3=10 r4=30 r5=40 r6=40 r7=50 r10=9; memory[0]=40 | 9 + 4 + 1 + 2 = **16** | 16 | 1 / 2 | 23 |
| 4 | `program4.limo` | Branch **not** taken | r3=5 r4=6 r5=1 r6=2 | 6 + 4 = **10** | 10 | 0 / 0 | 12 |
| 5 | `program5.limo` | RAW chain, forwarding | r3=1 r4=2 r5=4 r6=8 | 5 + 4 = **9** | 9 | 0 / 0 | 15 |
| 6 | `program6.limo` | Load-use stall | r3=25 r4=25 r5=30; memory[0]=25 | 5 + 4 + 1 = **10** | 10 | 1 / 0 | 13 |
| 7 | `program7.limo` | Branch **taken** (`phapano`) and flush | r3=1 r4=0 r5=0 r6=3 | 4 + 4 + 2 = **10** | 10 | 0 / 2 | 12 |
| 8 | `program8.limo` | Shift, logic and memory mix | r3=3 r4=48 r5=32 r6=51 r7=32 r8=51; memory[8]=51 | 8 + 4 = **12** | 12 | 0 / 0 | 18 |

All eight hand-derived counts equal the simulator's counts, and the registers and memory are the same with forwarding ON and OFF. The tests in `tests/pipeline.test.js` (programs 1 to 3) and `tests/programs.test.js` (programs 4 to 8) check these numbers on every run.

### Cost of each hazard (forwarding ON versus OFF)

| Program | ON | OFF | Extra cycles without forwarding |
|---|---|---|---|
| 1 | 14 | 17 | 3 |
| 2 | 51 | 76 | 25 |
| 3 | 16 | 23 | 7 |
| 4 | 10 | 12 | 2 |
| 5 | 9 | 15 | 6 |
| 6 | 10 | 13 | 3 |
| 7 | 10 | 12 | 2 |
| 8 | 12 | 18 | 6 |

Program 5 is the clearest case: three back-to-back dependences cost 2 stalls each without forwarding (6 in total) and none with it. A load followed by its consumer (program 6) still costs one stall with forwarding on, because the loaded word exists only after MEM.

## 3. Ripes cross-check (B8 iii)

Method, the RV32I translation of every program and the table to fill are in `docs/ripes-crosscheck.md`. Each program is run on Ripes' RV32I five-stage processor, and the registers, memory and cycle count are compared with the table above.

**TO FILL (a teammate with Ripes):** copy the "Ripes cycles" and "Agree? / explanation" columns here.

| # | LIMO cycles (ON) | Ripes cycles | Registers and memory agree? | Explanation of any difference |
|---|---|---|---|---|
| 1 | 14 | TO FILL | TO FILL | |
| 2 | 51 | TO FILL | TO FILL | x4 and x5 hold `0x10000014` in Ripes (data segment base) |
| 3 | 16 | TO FILL | TO FILL | |
| 4 | 10 | TO FILL | TO FILL | |
| 5 | 9 | TO FILL | TO FILL | |
| 6 | 10 | TO FILL | TO FILL | |
| 7 | 10 | TO FILL | TO FILL | |
| 8 | 12 | TO FILL | TO FILL | |

**Counting convention.** The LIMO simulator counts the cycle in which the last instruction (`fin`) is in the WB stage. Ripes counts completed clock edges, so a difference of exactly one cycle is expected and is not a defect. Any other difference must be explained here.

## 4. Usability test (B8 iv)

**TO FILL.** At least three first-year students from outside CS3520. Suggested tasks (about 10 minutes each, no help given unless the student is stuck for two minutes):

1. Load the built-in example and run it to the end.
2. Find the value of register `r7` after the program finishes.
3. Step through one instruction cycle by cycle and say what happens in each stage.
4. Turn Forwarding off, run the example again and say what changed in the statistics.
5. Type a new two-line program and assemble it.

| Student | Task | Completed? | Time | Observations (where they hesitated, what they said) | Change we made |
|---|---|---|---|---|---|
| TO FILL | | | | | |

## 5. Problems found while testing and how they were fixed

- **ISA mismatch.** The documents described different instruction sets (32 or 16 registers, 12-bit or 14-bit immediates, different instruction names). The code was brought in line with the M1 specification: 4-bit register fields, 14-bit immediates and the 11 M1 instructions. The unit tests were rewritten to the same specification.
- **Wording of the branch cost.** The M1 specification says a taken branch "costs 3 cycles instead of 1". This is the branch's own slot plus the two flushed slots, which is **2 extra cycles**. The simulator and every hand derivation in section 2 use 2 extra cycles per taken branch. The wording is easy to read as "3 extra", so the specification could say "2 extra cycles" explicitly.
- **Truncated source files.** Several source files on `main` ended in the middle of a function. Because `npm test` runs on every push, the failing runs showed this immediately, and the complete files were restored.
- **Decoder lookup.** For I, S and B formats the upper instruction bits hold immediate bits. The decoder therefore keys on opcode and funct3 only, and a test checks immediates that fill those bits (31 down to 22).
- **Load-use forwarding.** A load in EX/MEM has no data yet, so it cannot forward. Only MEM/WB forwards a loaded word, and the dependent instruction stalls one cycle. Programs 3 and 6 test this.
- **Flush count.** `flushes` counts only real wrong-path instructions, so a branch with nothing behind it (such as the final self-branch) adds none.
- **Page error message.** A program with an error lost its message when the page redrew. The message now stays visible.

The red entries in the GitHub Actions history come from commits pushed while these files were being replaced one at a time. The latest runs on `main` are green.

## 6. Known limitations

- The data memory is 64 KB, word access only; a misaligned or out-of-range access stops the simulator with an error.
- The simulator halts on a branch to itself, or at the end of the program.
- Changing the Forwarding switch restarts the program, because instructions already in flight were fetched under the other rules.
- The cycle-by-cycle pipeline chart, the narration panel (English and Sesotho) and the built-in example list are **not yet on the page** (B6 and B7). The per-cycle data they need is already recorded in `history`.
- The page layout is not responsive on a phone: the button row and stage cards run past the screen edge.

## 7. Summary of B8 status

| Item | Status |
|---|---|
| (i) Unit tests, one command | Done: 155 tests, green on `main` |
| (ii) Eight programs with hand-derived expectations | Done: all eight match the simulator |
| (iii) Ripes cross-check | RV32I versions ready; **results TO FILL** |
| (iv) Usability test with 3 students | **TO FILL** |
