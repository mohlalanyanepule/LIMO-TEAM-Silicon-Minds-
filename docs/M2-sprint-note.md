# M2 Sprint Note — Silicon Minds

**CS3520 · NUL · AY2026/2027**
**Milestone 2 — Simulator Design** · Sprint 5–11 October 2026 (submitted 25 October 2026)
**Live site:** https://mohlalanyanepule.github.io/LIMO-TEAM-Silicon-Minds-/
**Release tag:** m2

---

## Who did what (sprint board, issues #20–#29)

| Issue | Task | Owner | Status | Evidence |
|-------|------|-------|--------|----------|
| #20 M2-01 | Assembler lexer: case-insensitive, apostrophe deletion | Tihabi | [Done / confirm] | `assembler.js`; [PR #] |
| #21 M2-02 | Assembler two-pass label resolution and error line numbers | Mope | Done | `assembler.js`; label and line-number tests passing |
| #22 M2-03 | Assembler binary and hex colour output | Pule | [Done / confirm] | Machine Code table on the live site; [PR #] |
| #23 M2-04 | Unit tests for the assembler (target: 15 cases) | Karabelo | Done | `tests/assembler.test.js`: 29 tests (122 across the project), CI green |
| #24 M2-05 | Architecture diagram | Refiloe | Done | `docs/architecture.md` block diagram |
| #25 M2-06 | Pipeline registers spec table | Thusang | Done | `docs/pipeline-registers.md` (PRs #37–#39) |
| #26 M2-07 | Wireframes | Pule | Done | `docs/wireframes.md` (PR #40) |
| #27 M2-08 | Controls: Step, Run, Pause, Reset, Breakpoint | Tumelo | Partly | Load, Step, Run, Pause, Reset work on the live site; breakpoints [done / not yet] |
| #28 M2-09 | Deploy site, GitHub Pages live test | Tumelo | Done | Live site; Test and Deploy workflow green |
| #29 M2-10 | `docs/M2.pdf` and `AI_USE.md` update | Karabelo | [In progress / done] | `AI_USE.md` updated; `docs/M2.pdf` [link] |

Also this sprint: ISA freeze note (PR #41), five stale `.gitkeep` pull requests closed.

---

## Done

- LIMO ISA frozen (v1.0) with a freeze note.
- Architecture and block diagram, pipeline-register data model and interface wireframes written and merged.
- Working assembler with 29 assembler unit tests (122 across the project), all passing in CI.
- Site live on GitHub Pages; the sample program runs to the correct registers and memory.

## Not done

- [e.g. breakpoint control (#27), if not finished]
- [e.g. `docs/M2.pdf` (#29), if not finished]
- [e.g. colour-coded machine-code fields (#22), if not finished]
- Every pull request reviewed by a second member (several were merged by their own author).

## Next

- M4: forwarding, load-use stall, branch flush, datapath and control views with live values, pipeline chart and statistics. [owners]
- Fix the IF-panel display and the `?` shown for branch labels. [owner]
- Every member commits from their own account each week.

---

## Working arrangements

The team shares one laptop. Each member signs in to their own GitHub account to commit and to review pull requests.
