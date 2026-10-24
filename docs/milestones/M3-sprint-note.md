# M3 Sprint Note – Silicon Minds (Week 9)

**Milestone:** M3 – Pipeline Core  
**Tag:** m3  
**Release:** https://github.com/mohlalanyanepule/LIMO-TEAM-Silicon-Minds-/releases/tag/m3  
**Live Simulator:** https://mohlalanyanepule.github.io/LIMO-TEAM-Silicon-Minds-/  
**Repository:** https://github.com/mohlalanyanepule/LIMO-TEAM-Silicon-Minds-  
**Submitted:** 18 October 2026

## Done
- [x] Five-stage pipeline (IF, ID, EX, MEM, WB) with pipeline registers (IF/ID, ID/EX, EX/MEM, MEM/WB)
- [x] Instruction decode, control unit and ALU implemented
- [x] Pipeline controls: Step, Run, Pause, Reset
- [x] Register file and data memory views with change highlighting
- [x] Branches resolve in EX stage with flush of two younger instructions
- [x] RAW/load-use hazard stalls (conservative, to WB)
- [x] Self-branch detection and clean halt
- [x] Simulator UI wired to pipeline (datapath, control signals, registers, memory, statistics)
- [x] Automated tests added (112 tests passing)
- [x] Three example programs (program1–program3) run correctly
- [x] Deployed to GitHub Pages

## Not Done
- [ ] Forwarding paths (EX/MEM → EX, MEM/WB → EX) – planned for M4
- [ * ] Breakpoints / Step Back – optional/recommended
- [ ] Full Ripes cross-check for all test programs (B8iii) – in progress/planned

## Next (M4)
- [ ] Implement forwarding unit and enable/disable switch
- [ ] Handle load-use with forwarding/stalling appropriately
- [ ] Visualise forwarding paths and hazard detection
- [ ] Add pipeline chart and enhanced statistics
- [ ] Expand test suite for hazard cases

## Who did what
| Member | Contribution | Notes |
|---|---|---|
| MopeMaphutseng | Pipeline core, decoder fix, UI wiring, tests, deployment | Lead implementation of M3 |
| Team Members | ISA/docs/testing/support as assigned | Fill names/student numbers/GitHub in README |
