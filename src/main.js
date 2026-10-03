import { assemble, AssemblerError } from './assembler.js';

const editor = document.getElementById('editor');
const output = document.querySelector('#output tbody');
const assembleBtn = document.getElementById('assemble');
const loadExampleBtn = document.getElementById('load-example');

const EXAMPLE = `eketsa-haufi x5, lefela, 10
eketsa-haufi x6, lefela, 20
eketsa x7, x5, x6
boloka x7, 0(mokgethi)
fin: hlahloba lefela, lefela, fin`;

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
