# AI Use Declaration (CS3520 LIMO Project)

We declare the following use of AI tools in accordance with the course policy:

| Tool | Purpose | What was changed / verified by the team |
|------|---------|------------------------------------------|
| Claude Code (Anthropic) | Exploration, debugging, test authoring assistance, documentation drafting | Used to trace pipeline bugs, add regression tests, draft commit messages/PR descriptions. All code was reviewed, tested with `npm test`, and explained by team members. The decoder bug (I/S/B immediate lookup) was found and fixed with understanding of the ISA. |
| GitHub Copilot / ChatGPT | Occasional clarification of RISC-V/pipeline concepts | Consulted for explanation only; no large blocks of generated code were committed without review and testing. |

All AI-assisted contributions were validated against the ISA specification, the three example programs, and Ripes cross-checks where applicable. Code we cannot explain at defence is not credited as our own.
