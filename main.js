import { assemble, AssemblerError } from './assembler.js';
import { Pipeline } from './pipeline.js';
import { REGISTER_NAMES } from './decoder.js';
import { aluName } from './alu.js';

const editor = document.getElementById('editor');
const output = document.querySelector('#output tbody');
const assembleBtn = document.getElementById('assemble');
const loadExampleBtn = document.getElementById('load-example');

const statusEl = document.getElementById('status');
const stagesEl = document.getElementById('stages');
const signalsEl = document.querySelector('#signals tbody');
const registersEl = document.querySelector('#registers tbody');
const memoryEl = document.querySelector('#memory tbody');
const statsEl = document.getElementById('stats');

const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];
const hex = (value) => `0x${(value >>> 0).toString(16).padStart(8, '0')}`;

let pipeline = null;
let timer = null;
let loadError = null;

const EXAMPLE = `eketsa ho r5, lefela, 10
eketsa ho r6, lefela, 20
eketsa r7, r5, r6
boloka r7, 0(lefela)
fin: tekano lefela, lefela, fin`;

loadExampleBtn.addEventListener('click', () => {
  editor.value = EXAMPLE;
});

assembleBtn.addEventListener('click', () => {
  output.innerHTML = '';
  try {
    const result = assemble(editor.value);
    for (const ins of result.instructions) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>0x${ins.address.toString(16).padStart(4, '0')}</td>
        <td>${ins.hex}</td>
        <td><code>${ins.binary}</code></td>
        <td>${ins.source}</td>
      `;
      output.appendChild(row);
    }
  } catch (err) {
    if (err instanceof AssemblerError) {
      const row = document.createElement('tr');
      row.className = 'error';
      row.innerHTML = `<td colspan="4">❌ ${err.message}</td>`;
      output.appendChild(row);
    } else {
      throw err;
    }
  }
});

document.getElementById('load').addEventListener('click', () => {
  stop();
  loadError = null;
  try {
    pipeline = new Pipeline(assemble(editor.value));
  } catch (err) {
    pipeline = null;
    loadError = err instanceof AssemblerError ? err.message : String(err);
  }
  render();
});

document.getElementById('step').addEventListener('click', () => {
  stop();
  if (pipeline && !pipeline.halted) pipeline.step();
  render();
});

document.getElementById('run').addEventListener('click', () => {
  if (!pipeline || pipeline.halted) return;
  timer = setInterval(() => {
    if (pipeline.halted) {
      stop();
    } else {
      pipeline.step();
    }
    render();
  }, 400);
  render();
});

document.getElementById('pause').addEventListener('click', () => {
  stop();
  render();
});

document.getElementById('reset').addEventListener('click', () => {
  stop();
  if (pipeline) pipeline.reset();
  render();
});

function stop() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function renderStages() {
  const cards = stagesEl.children;
  const cycle = pipeline ? pipeline.history[pipeline.history.length - 1] : null;

  STAGES.forEach((name, index) => {
    const card = cards[index];
    const entry = cycle ? cycle[name] : null;
    card.classList.toggle('active', Boolean(entry));

    const body = card.querySelector('.stage-body');
    if (!entry) {
      body.textContent = pipeline && pipeline.halted ? '—' : '';
      return;
    }

    const lines = [hex(entry.pc)];
    if (entry.text) lines.push(entry.text);

    if (name === 'ID') {
      if (entry.rs1Value !== undefined) lines.push(`r${entry.rs1} = ${hex(entry.rs1Value)}`);
      if (entry.rs2Value !== undefined) lines.push(`r${entry.rs2} = ${hex(entry.rs2Value)}`);
      if (entry.immediate) lines.push(`imm = ${entry.immediate}`);
    }
    if (name === 'EX') lines.push(`alu = ${hex(entry.aluResult)}`);
    if (name === 'EX' && entry.branchTaken) lines.push(`branch → ${hex(entry.branchTarget)}`);
    if (name === 'MEM') lines.push(entry.isMemory ? `[${hex(entry.address)}] = ${hex(entry.memData)}` : 'no memory access');
    if (name === 'WB') {
      lines.push(entry.writes ? `r${entry.rd} = ${hex(entry.value)}` : 'no register write');
    }
    body.textContent = lines.join('\n');
  });
}

function renderSignals() {
  const cycle = pipeline ? pipeline.history[pipeline.history.length - 1] : null;
  const controls = cycle && cycle.ID ? cycle.ID.controls : null;
  const rows = [
    ['RegWrite', controls?.RegWrite],
    ['ALUSrc', controls?.ALUSrc],
    ['ALUControl', controls ? aluName(controls.ALUControl) : null],
    ['MemRead', controls?.MemRead],
    ['MemWrite', controls?.MemWrite],
    ['MemToReg', controls?.MemToReg],
    ['Branch', controls?.Branch],
    ['PCSrc', controls?.PCSrc],
  ];

  signalsEl.innerHTML = rows
    .map(([name, value]) => `<tr><th>${name}</th><td>${value === null || value === undefined ? '—' : value}</td></tr>`)
    .join('');
}

function renderState() {
  const registers = pipeline ? pipeline.registerFile() : [];
  registersEl.innerHTML = registers
    .map(({ index, value, changed }) => `
      <tr class="${changed ? 'changed' : ''}">
        <td>r${index} ${REGISTER_NAMES[index]}</td>
        <td>${hex(value)}</td>
      </tr>`)
    .join('');

  const memory = pipeline ? pipeline.dataMemory() : [];
  memoryEl.innerHTML = memory.length === 0
    ? '<tr><td colspan="2">empty</td></tr>'
    : memory
      .map(({ address, value, changed }) => `
        <tr class="${changed ? 'changed' : ''}">
          <td>${hex(address)}</td>
          <td>${hex(value)}</td>
        </tr>`)
      .join('');
}

function renderStats() {
  const stats = pipeline ? pipeline.stats() : null;
  const entries = [
    ['Cycles', stats?.cycles ?? 0],
    ['Instructions', stats?.instructions ?? 0],
    ['CPI', stats ? stats.cpi.toFixed(2) : '0.00'],
    ['Stalls', stats?.stalls ?? 0],
    ['Flushes', stats?.flushes ?? 0],
  ];
  statsEl.innerHTML = entries
    .map(([name, value]) => `<div><dt>${name}</dt><dd>${value}</dd></div>`)
    .join('');
}

function render() {
  renderStages();
  renderSignals();
  renderState();
  renderStats();

  statusEl.classList.remove('error');
  if (!pipeline) {
    statusEl.textContent = loadError ?? 'Load a program to start.';
    if (loadError) statusEl.classList.add('error');
  } else if (pipeline.halted) {
    const reason = pipeline.haltReason === 'self-branch'
      ? 'Halted on a self-branch.'
      : pipeline.haltReason === 'error'
        ? `Stopped: ${pipeline.error}.`
        : pipeline.haltReason === 'cycle-limit'
          ? 'Stopped at the cycle limit.'
          : 'Program finished.';
    statusEl.textContent = `${reason} ${pipeline.stats().cycles} cycles.`;
  } else if (timer !== null) {
    statusEl.textContent = `Running — cycle ${pipeline.cycle + 1}.`;
  } else {
    statusEl.textContent = `Ready at cycle ${pipeline.cycle}.`;
  }
}

render();
