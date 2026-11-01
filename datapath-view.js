Claude




































Datapath view · JS
// datapath-view.js - pipelined LIMO datapath drawn as SVG, with wires,
// live values and highlighting. Usage (see bottom of file):
//   const view = createDatapathView(document.getElementById('datapath-diagram'));
//   view.update(pipeline);   // after every Step / Run
//   view.clear();            // after Load / Reset
import { decode } from './decoder.js';
 
const hex = (n) => (n === null || n === undefined ? '-' : '0x' + (n >>> 0).toString(16).padStart(8, '0'));
 
// id, x, y, w, h, label, tooltip
const BOXES = [
  ['pcmux', 30, 150, 40, 56, 'mux', 'PC mux: chooses PC+4 or the branch target (PCSrc)'],
  ['pc', 100, 150, 50, 56, 'PC', 'Program counter: address of the instruction being fetched'],
  ['add4', 170, 60, 60, 36, '+4', 'Adder: PC + 4'],
  ['imem', 180, 140, 80, 90, 'Instr mem', 'Instruction memory: returns the 32-bit instruction at the PC'],
  ['ctl', 340, 25, 110, 40, 'Control', 'Control unit: turns the opcode into RegWrite, ALUSrc, ALUControl, MemRead, MemWrite, MemToReg, Branch, PCSrc'],
  ['rf', 340, 130, 110, 140, 'Registers', 'Register file: reads rs1 and rs2 in ID, writes rd in WB'],
  ['imm', 340, 300, 90, 40, 'Imm Gen', 'Immediate generator: sign-extends the immediate field'],
  ['bradd', 620, 60, 70, 40, 'Branch +', 'Branch adder: PC + immediate = branch target'],
  ['alumux', 620, 215, 36, 60, 'mux', 'ALUSrc mux: second ALU input is rs2 (0) or the immediate (1)'],
  ['alu', 690, 140, 70, 130, 'ALU', 'ALU: arithmetic, logic, address calculation and branch comparison'],
  ['dmem', 860, 150, 100, 150, 'Data mem', 'Data memory: kenya (load) reads it, boloka (store) writes it'],
  ['wbmux', 1060, 170, 36, 70, 'mux', 'MemToReg mux: write-back value is the ALU result (0) or loaded data (1)'],
];
const REGS = [['IF/ID', 280], ['ID/EX', 560], ['EX/MEM', 800], ['MEM/WB', 990]];
 
// id, path, tooltip
const WIRES = [
  ['pc_imem', 'M150,178 H180', 'PC to instruction memory'],
  ['pc_add', 'M150,178 H160 V78 H170', 'PC to the +4 adder'],
  ['add_ifid', 'M230,78 H280', 'PC+4 into IF/ID'],
  ['add_mux', 'M240,78 V40 H15 V165 H30', 'PC+4 back to the PC mux'],
  ['target_bus', 'M690,80 H710 V18 H6 V191 H30', 'Branch target back to the PC mux (taken branch)'],
  ['mux_pc', 'M70,178 H100', 'Next PC'],
  ['imem_ifid', 'M260,185 H280', 'Instruction into IF/ID'],
  ['ifid_ctl', 'M298,45 H340', 'Opcode to the control unit'],
  ['ifid_rf1', 'M298,150 H340', 'rs1 field'],
  ['ifid_rf2', 'M298,185 H340', 'rs2 field'],
  ['ifid_imm', 'M298,320 H340', 'Immediate field'],
  ['ifid_pc', 'M298,105 H560', 'PC carried to ID/EX'],
  ['ctl_idex', 'M450,45 H560', 'Control signals into ID/EX'],
  ['rf1_idex', 'M450,160 H560', 'rs1 value'],
  ['rf2_idex', 'M450,200 H560', 'rs2 value'],
  ['imm_idex', 'M430,320 H560', 'Sign-extended immediate'],
  ['idex_pc', 'M578,105 H600 V70 H620', 'PC to the branch adder'],
  ['imm_br', 'M584,320 V90 H620', 'Immediate to the branch adder'],
  ['idex_rs1', 'M578,160 H690', 'rs1 value to the ALU'],
  ['idex_rs2', 'M578,200 H600 V230 H620', 'rs2 value to the ALUSrc mux'],
  ['idex_imm', 'M578,320 H608 V262 H620', 'Immediate to the ALUSrc mux'],
  ['rs2_store', 'M592,200 V360 H800', 'rs2 value carried on as store data'],
  ['mux_alu', 'M656,245 H690', 'Second ALU input'],
  ['alu_exmem', 'M760,205 H800', 'ALU result into EX/MEM'],
  ['exmem_addr', 'M818,205 H860', 'ALU result used as the memory address'],
  ['exmem_store', 'M818,360 H840 V270 H860', 'Store data to data memory'],
  ['exmem_bypass', 'M830,205 V120 H990', 'ALU result passes through MEM'],
  ['dm_memwb', 'M960,205 H990', 'Loaded data into MEM/WB'],
  ['memwb_alu', 'M1008,120 H1040 V190 H1060', 'ALU result to the write-back mux'],
  ['memwb_mem', 'M1008,205 H1030 V222 H1060', 'Loaded data to the write-back mux'],
  ['wb_bus', 'M1096,205 H1120 V440 H440 V270', 'Write-back value to the register file'],
];
 
// id, x, y, anchor
const LABELS = [
  ['pc', 125, 226, 'middle'], ['pc4', 200, 52, 'middle'], ['instr', 220, 246, 'middle'],
  ['rs1', 455, 154, 'start'], ['rs2', 455, 194, 'start'], ['imm', 448, 314, 'start'],
  ['target', 330, 12, 'start'], ['alu', 725, 288, 'middle'],
  ['mem1', 910, 320, 'middle'], ['mem2', 910, 334, 'middle'], ['wb', 1100, 162, 'middle'],
];
const STAGES = [['IF', 145], ['ID', 420], ['EX', 690], ['MEM', 910], ['WB', 1078]];
 
const CSS = `
.dp-status{font:600 14px system-ui,sans-serif;margin:0 0 8px;min-height:1.5em}
.dp svg{width:100%;height:auto;display:block}
.dp .box{fill:var(--dp-box,#0b1220);stroke:var(--dp-line,#7b8aa0);stroke-width:1.3}
.dp .box.on{stroke:var(--dp-on,#5cb0ff);stroke-width:3.5}
.dp .reg{fill:var(--dp-reg,#1a2436);stroke:var(--dp-line,#7b8aa0);stroke-width:1.3}
.dp .wire{fill:none;stroke:var(--dp-line,#7b8aa0);stroke-width:1.2;opacity:.65;marker-end:url(#dpArr)}
.dp .wire.on{stroke:var(--dp-on,#5cb0ff);stroke-width:3.5;opacity:1;stroke-dasharray:9 5;marker-end:url(#dpArrOn);animation:dpflow .9s linear infinite}
@keyframes dpflow{to{stroke-dashoffset:-14}}
@media (prefers-reduced-motion:reduce){.dp .wire.on{animation:none}}
.dp text{fill:var(--dp-text,#d5deea);font:11px ui-monospace,Consolas,monospace}
.dp .val{font-size:11px;font-weight:700}
.dp .stage{font:700 14px system-ui,sans-serif}
.dp .cap{font-size:11px}
`;
 
const svg = () => `
<svg viewBox="0 0 1200 495" role="img" aria-label="Five-stage LIMO pipeline datapath with live values">
<defs>
<marker id="dpArr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L8,4L0,8z" fill="#7b8aa0"/></marker>
<marker id="dpArrOn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L8,4L0,8z" fill="#5cb0ff"/></marker>
</defs>
${REGS.map(([n, x]) => `<g><title>Pipeline register ${n}: holds everything the next stage needs</title><rect class="reg" x="${x}" y="40" width="18" height="360" rx="3"/><text x="${x + 9}" y="220" text-anchor="middle" transform="rotate(-90 ${x + 9} 220)">${n}</text></g>`).join('')}
${WIRES.map(([id, d, t]) => `<path id="dp-w-${id}" class="wire" d="${d}"><title>${t}</title></path>`).join('')}
${BOXES.map(([id, x, y, w, h, l, t]) => `<g><title>${t}</title><rect id="dp-b-${id}" class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/><text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle">${l}</text></g>`).join('')}
${LABELS.map(([id, x, y, a]) => `<text id="dp-l-${id}" class="val" x="${x}" y="${y}" text-anchor="${a}"></text>`).join('')}
<text x="460" y="434" class="cap">write-back value</text>
${STAGES.map(([s, x]) => `<text class="stage" x="${x}" y="462" text-anchor="middle">${s}</text><text id="dp-c-${s}" class="cap" x="${x}" y="480" text-anchor="middle"></text>`).join('')}
</svg>`;
 
// Controls the instruction at `pc` got in ID (found in earlier cycle records).
function controlsFor(history, pc) {
  for (let i = history.length - 2; i >= 0; i -= 1) {
    const r = history[i];
    if (r.ID && r.ID.pc === pc) return r.ID.controls;
  }
  return null;
}
 
export function createDatapathView(container) {
  if (!document.getElementById('dp-style')) {
    const s = document.createElement('style');
    s.id = 'dp-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  container.classList.add('dp');
  container.innerHTML = `<div class="dp-status" aria-live="polite"></div>${svg()}`;
 
  const $ = (id) => container.querySelector(`#dp-${id}`);
  const status = container.querySelector('.dp-status');
  const text = (id, v) => { $(`l-${id}`).textContent = v ?? ''; };
  const cap = (stage, v) => { $(`c-${stage}`).textContent = v; };
 
  function clear() {
    container.querySelectorAll('.on').forEach((e) => e.classList.remove('on'));
    LABELS.forEach(([id]) => text(id, ''));
    STAGES.forEach(([s]) => cap(s, ''));
    status.textContent = 'Load a program, then press Step.';
  }
 
  function update(pipeline) {
    const history = pipeline.history;
    const rec = history[history.length - 1];
    if (!rec) { clear(); return; }
    clear();
 
    const wires = new Set();
    const boxes = new Set();
    const mark = (w = [], b = []) => { w.forEach((x) => wires.add(x)); b.forEach((x) => boxes.add(x)); };
 
    // IF: the instruction fetched this cycle is the one now waiting in IF/ID.
    let fetch = null;
    if (!rec.stalled && !rec.flushed && pipeline.IF_ID) {
      const f = pipeline.IF_ID;
      fetch = { pc: f.pc, pc4: f.pcPlus4, text: decode(f.instruction).text };
      mark(['pc_imem', 'pc_add', 'add_ifid', 'add_mux', 'mux_pc', 'imem_ifid'], ['pc', 'pcmux', 'add4', 'imem']);
    }
    text('pc', hex(fetch ? fetch.pc : rec.pc));
    text('pc4', fetch ? hex(fetch.pc4) : '');
    text('instr', fetch ? fetch.text : '');
    cap('IF', fetch ? fetch.text : (rec.stalled ? '(held: stall)' : '- (bubble)'));
 
    // ID
    if (rec.ID) {
      mark(['ifid_ctl', 'ifid_rf1', 'ifid_rf2', 'ifid_imm', 'ifid_pc', 'ctl_idex', 'rf1_idex', 'rf2_idex', 'imm_idex'], ['ctl', 'rf', 'imm']);
      text('rs1', `x${rec.ID.rs1}: ${hex(rec.ID.rs1Value)}`);
      text('rs2', `x${rec.ID.rs2}: ${hex(rec.ID.rs2Value)}`);
      text('imm', `imm ${rec.ID.immediate | 0}`);
      cap('ID', rec.ID.text ?? '');
    } else {
      cap('ID', rec.stalled && pipeline.IF_ID ? `${decode(pipeline.IF_ID.instruction).text} (stalled)` : '- (bubble)');
    }
 
    // EX
    if (rec.EX) {
      const c = controlsFor(history, rec.EX.pc);
      mark(['idex_rs1', 'mux_alu', 'alu_exmem'], ['alumux', 'alu']);
      if (!c || c.ALUSrc) mark(['idex_imm']);
      if (!c || !c.ALUSrc) mark(['idex_rs2']);
      if (c && c.MemWrite) mark(['rs2_store']);
      if (c && c.Branch) {
        mark(['idex_pc', 'imm_br', 'idex_rs2'], ['bradd']);
        text('target', `target ${hex(rec.EX.branchTarget)} (${rec.EX.branchTaken ? 'taken' : 'not taken'})`);
        if (rec.EX.branchTaken) mark(['target_bus']);
      }
      text('alu', `ALU ${hex(rec.EX.aluResult)}`);
      cap('EX', rec.EX.text ?? '');
    } else cap('EX', '- (bubble)');
 
    // MEM
    if (rec.MEM) {
      const c = controlsFor(history, rec.MEM.pc);
      if (c && (c.MemRead || c.MemWrite)) {
        mark(['exmem_addr'], ['dmem']);
        text('mem1', `addr ${hex(rec.MEM.address)}`);
        if (c.MemWrite) { mark(['exmem_store']); text('mem2', `write ${hex(pipeline.lastMemWrite?.value)}`); }
        if (c.MemRead) { mark(['dm_memwb']); text('mem2', `read ${hex(rec.MEM.memData)}`); }
      }
      if (!c || (c.RegWrite && !c.MemRead)) mark(['exmem_bypass']);
      cap('MEM', rec.MEM.text ?? '');
    } else cap('MEM', '- (bubble)');
 
    // WB
    if (rec.WB) {
      const c = controlsFor(history, rec.WB.pc);
      if (rec.WB.writes) {
        mark([c && c.MemToReg ? 'memwb_mem' : 'memwb_alu', 'wb_bus'], ['wbmux']);
        text('wb', `x${rec.WB.rd} <- ${hex(rec.WB.value)}`);
      }
      cap('WB', rec.WB.text ?? '');
    } else cap('WB', '- (bubble)');
 
    wires.forEach((id) => $(`w-${id}`).classList.add('on'));
    boxes.forEach((id) => $(`b-${id}`).classList.add('on'));
 
    let s = `Cycle ${rec.cycle}`;
    if (rec.stalled) s += ` | STALL: waiting for ${rec.stallReason}`;
    if (rec.flushed) s += ' | FLUSH: 2 wrong-path instructions discarded';
    if (pipeline.halted) s += ` | halted (${pipeline.haltReason})`;
    status.textContent = s;
  }
 
  clear();
  return { update, clear };
}
 
// In index.html, inside the Datapath section:  <div id="datapath-diagram"></div>
// In main.js:
//   import { createDatapathView } from './datapath-view.js';
//   const dpView = createDatapathView(document.getElementById('datapath-diagram'));
//   ...after pipeline.step() or pipeline.run():  dpView.update(pipeline);
//   ...after Load or Reset:                      dpView.clear();
 
Claude finished the response
