# CS3520 LIMO Group Project — Interview Preparation
**Based on PRJ-002_CS3520-LIMO-Group-Interview-Guide_AY2026-2027_v1-1_2026-11-08 (exactly as stated)**

> THE NATIONAL UNIVERSITY OF LESOTHO  
> Department of Mathematics and Computer Science · Faculty of Science and Technology  
> CS3520 Computer Organisation and Architecture · AY 2026/2027 · Semester A  
> **LIMO Group Project — Group Interview Guide**  
> *What to expect, how to prepare, and how you will be marked*

---

## Key Information (Exactly as stated)

| Item | Details |
|------|---------|
| **Format** | A 15-minute interview with your whole team. **Every member is questioned individually.** |
| **When** | **Monday 9 November 2026 only, 11:00–17:00.** Find your team’s slot on Thuto. |
| **Covers** | **M1** (LIMO ISA), **M2** (simulator design and assembler), and **your work towards M3**. |
| **Weight** | Your interview mark (out of 100) is your project mark: **15% of the CS3520 final mark**. |
| **Bring** | **One laptop** with your **repository**, your **M1 and M2 PDFs**, and your **simulator open and running**. |

**Important context from guide:**  
> The project time was shortened, so M3 to M5 will not be submitted or marked as documents. Instead, your project is assessed through this interview on the work you did complete. **The interview tests what you understand, not how much you finished:** unfinished code you can explain is worth more than finished code you cannot.

---

## 1. How the 15 Minutes Run

| Minutes | Segment | What happens |
|---------|---------|--------------|
| **0–2** | **Opening** | A member **chosen by the examiner** summarises what you built and where you stopped. |
| **2–6** | **Your submissions** | Questions on your **M1 ISA** and **M2 design**: **any member, any section**. |
| **6–10** | **Mini code review** | Your **files and commits, including M3 work in progress**, to read, trace and explain. |
| **10–14** | **Core concepts** | Short, direct questions on the **computer architecture behind the project**. |
| **14–15** | **Close** | **Each member states their own main contribution in one sentence.** |

### Our Team Prep (Silicon Minds — do not guess; know what’s true)
- **Repo:** https://github.com/mohlalanyanepule/LIMO-TEAM-Silicon-Minds-
- **Live simulator:** https://mohlalanyanepule.github.io/LIMO-TEAM-Silicon-Minds-/
- **Built:** LIMO ISA (Sesotho-derived, RV32I-inspired), assembler, decoder, ALU, control unit, 5-stage pipeline (IF/ID/EX/MEM/WB), datapath UI, hazards/stalls/flushes (M3 baseline), 155 tests.
- **M3 in progress:** forwarding/visualisation enhancements (M4 items) as applicable — be honest about what works and what doesn’t.
- **What to open on laptop:** repo in editor + `git log`/commits visible, M1/M2 PDFs (`docs/milestones/` or submitted PDFs), simulator running at live link or local `npm run dev`.

---

## 2. What the Questions Are Like

**Exactly as stated:**
> Every question is short and direct, and asks you to think rather than recite. Expect four kinds: **Explain** (what does it do?), **Justify** (why this, and at what cost?), **Predict** (what happens if it changes?) and **Diagnose** (where would it fail, and how would you know?).

**Topics (must revise):**
- ISA design and encoding
- Register file and special-purpose registers
- Datapath and control signals
- The five-stage pipeline and its pipeline registers
- Data, load-use and control hazards
- Forwarding and stalls
- Your Git workflow

**Answering rule:**
> Answer in **one to three sentences**: a clear **“I don’t know, but I would reason like this…”** earns more than a guess.

### Question-Type Practice (Examples aligned to our project — be ready to explain your own implementation)

| Type | Example Question | How to answer (1–3 sentences) |
|------|------------------|-------------------------------|
| **Explain** | What does the ID stage do in our simulator? | It decodes the instruction, reads register operands, generates control signals, and produces the immediate; hazard detection may stall here. Outputs go into ID/EX. |
| **Justify** | Why resolve branches in EX, and at what cost? | It keeps branch decision simple and uses the ALU/comparator in EX. Cost: on a taken branch we flush the two younger instructions in IF and ID (2-cycle penalty). |
| **Predict** | What happens if forwarding is turned off for a RAW dependency? | The consumer would read stale register values unless we stall until WB; in M3 we use conservative stalls, so CPI increases but results stay correct. |
| **Diagnose** | Where would a load-use hazard fail, and how would you know? | If a dependent instruction uses the loaded value immediately without a stall, it gets the wrong data. You’d see incorrect register results in tests or trace the pipeline and notice the consumer in EX before MEM provides the value. |

### Core Topics Checklist (Prepare every member)

**ISA design and encoding**
- 32-bit instructions, R/I/S/B formats (RV32I-derived), 4-bit register fields in our current encoding, 14-bit immediates (per current implementation/tests) — know *your* spec and encoding.
- Sesotho mnemonics (e.g. `eketsa`, `fokotsa`, `le`, `kapa`, `eketsa ho`, `kopanyetsa`, `suthisa`, `jara`, `boloka`, `tekano`, `phapano`) and what they do.
- Opcode/funct fields, immediate ranges, hand-encoding examples.

**Register file and special-purpose registers**
- 16 registers (r0–r15), Sesotho names (`lefela`, `sekhulisa_aterese`, `lesupi`, `pokotho3`–`pokotho15`).
- `lefela`/r0 hard-wired zero concept; architectural vs microarchitectural registers.
- PC is architectural; IF/ID, ID/EX, EX/MEM, MEM/WB are microarchitectural.

**Datapath and control signals**
- Components: PC, IMEM, register file, ALU, DMEM, muxes, sign-extend/immediate gen.
- Control: `RegWrite`, `ALUSrc`, `ALUControl`/op, `MemRead`, `MemWrite`, `MemToReg`, `Branch`/branch compare, `PCSrc` (as implemented).

**Five-stage pipeline and pipeline registers**
- IF: fetch + PC+4. ID: decode + reg read + control. EX: ALU/branch/target. MEM: load/store. WB: write back.
- IF/ID, ID/EX, EX/MEM, MEM/WB carry instruction/control/data between stages.

**Data, load-use and control hazards**
- RAW (data hazard): later instruction needs result of earlier one.
- Load-use: load result not ready in time for next dependent instruction — needs stall.
- Control hazard: branch changes PC; taken branch flushes wrong-path instructions.

**Forwarding and stalls**
- M3 baseline: conservative stalls (no forwarding) — explain what we do now.
- M4 target: forward EX/MEM→EX and MEM/WB→EX; load-use still needs 1 stall even with forwarding.
- Forwarding ON/OFF switch concept and why it shows cycle cost.

**Git workflow**
- Commits, branches, pull requests, reviews, issues/board, tags/releases (`m1`, `m2`, `m3`), CI/deploy.
- **Be able to explain every commit you made.**

---

## 3. How You Will Be Marked

| Area | What earns marks | Marks | Basis |
|------|------------------|-------|-------|
| **A Opening account** | An accurate, honest account, including what does not work | **10** | **Group** |
| **B Your submissions** | Explaining and justifying your M1 ISA and M2 design decisions | **25** | **Individual** |
| **C Mini code review** | Tracing and explaining code; predicting behaviour; finding faults | **25** | **Individual** |
| **D Core concepts** | Correct, reasoned answers to direct conceptual questions | **25** | **Individual** |
| **E Git and teamwork** | Commits, branches and pull requests; each member shows own work | **15** | **Group \*** |
| | **Total** | **100** | |

**Scoring per answer:** **3** (correct and reasoned), **2** (correct but shallow), **1** (partly correct) or **0** (incorrect or no answer), scaled to marks above.

**Your mark = the group areas (A, E) + your own scores in B, C and D.**  
*\* A member who cannot show any of their own work in the repository scores zero for E.*

### Strategy
- **A (Group, 0–2 min):** Be accurate and honest. Mention what works (ISA, assembler, 5-stage pipeline, tests, live site) and what is incomplete (e.g., full forwarding visualisation/M4 polish). Don’t oversell.
- **B/C/D (Individual):** Everyone must know the whole project, not just “their part.” Be ready for any file, any commit, any design choice.
- **E (Group):** Every member must show *their own* commits/PRs/issues/work in the repo.

---

## 4. Preparation and Rules

### Prepare (Do all of these)

- [ ] **Re-read M1 and M2: every section, not only yours.** (ISA spec, architecture, pipeline registers, wireframes, design decisions)
- [ ] **Be able to explain every commit you made.** (Run `git log --author="YOUR_NAME"` and know what each changed and why)
- [ ] **Have the simulator and commit history ready to show.** (Live site open + repo/terminal with `git log`, `git show`, files ready)
- [ ] **Revise Weeks 3–9: ISA, datapath, pipelining, hazards.**
- [ ] **Know what remains for M3 and how to finish it.** (Be honest: forwarding paths, hazard visualisation, UI polish, etc.)

### Rules (Follow exactly)

- [ ] **Arrive together, five minutes early, with student cards.**
- [ ] **The examiner chooses who answers; no conferring.**
- [ ] **Allowed:** repository, simulator, submitted PDFs.
- [ ] **Not allowed:** notes, phones, AI tools, web search.
- [ ] **Absence without a valid reason scores zero.**
- [ ] **Work you cannot explain earns no credit.**

---

## 5) Suggested 2-Minute Opening (Template — adjust to truth)

> “We are **Silicon Minds**. We built **LIMO**, a Sesotho-language, 32-bit load–store processor derived from RISC-V concepts, and a browser-based simulator. For **M1** we defined the ISA, encoding, register file, and instruction set. For **M2** we produced the architecture, pipeline register model, wireframes, and a working assembler. Towards **M3** we implemented a 5-stage pipeline (IF/ID/EX/MEM/WB) with control, Step/Run/Reset, register and memory views, hazard handling with stalls/flushes, and deployed it on GitHub Pages with automated tests. What is not fully finished is [state honestly, e.g., full forwarding visualisation/M4 polish], and we would finish it by [brief plan].”

---

## 6) 15-Minute Run-Through Script (For the team)

**0:00–2:00 (Opening)** — Examiner picks speaker. Give accurate summary + what doesn’t work.  
**2:00–6:00 (M1/M2)** — Any member can be asked: justify register count, encoding choice, branch resolution stage, pipeline register contents, wireframe decisions.  
**6:00–10:00 (Code/commits)** — Open files (`pipeline.js`, `assembler.js`, `decoder.js`, `main.js`), trace a cycle, predict output, find where hazard/stall happens; explain *your* commits.  
**10:00–14:00 (Core concepts)** — Define RAW/load-use/control hazard, explain forwarding vs stall, describe 5 stages and signals, explain datapath flow.  
**14:00–15:00 (Close)** — Each member states **one sentence** on their own main contribution.

---

## 7) Quick Facts to Remember (Project-specific)

- **Pipeline:** 5 stages — IF, ID, EX, MEM, WB. Branches resolved in EX → taken branch flushes 2 younger instructions.
- **M3 baseline:** conservative stalls for hazards (no forwarding implemented as full M4 feature unless stated otherwise). Self-branch halts cleanly.
- **Tests:** 155 passing (`npm test`), build passes (`npm run build`).
- **Milestones/tags:** `m1`, `m2`, `m3` exist with releases.
- **Examples:** 8 programs in `examples/` (program1–8). Be ready to trace one.
- **Honesty wins:** “I don’t know, but I would reason like this…” is better than guessing.

---

> “It is the work of true education to train the youth to be thinkers, and not mere reflectors of other men ’s thought.” — *Education*, p. 17  
> National University of Lesotho · Department of Mathematics and Computer Science CS3520 · LIMO Group Interview Guide
