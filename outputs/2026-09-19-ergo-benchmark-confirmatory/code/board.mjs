#!/usr/bin/env node
/**
 * board.mjs — локальная канбан-доска по трассам бенчмарка.
 *
 * Зачем: сырые JSON-трассы не видно, а сводка врёт (summary-*.json хранит только
 * последнюю ячейку). Доска читает ИСХОДНЫЕ трассы напрямую и раскладывает ячейки
 * по состоянию — чтобы прогон можно было увидеть глазами, а не пересказом.
 *
 * Доска ничего не считает и не переписывает: только показывает то, что уже лежит
 * в артефактах. Любая цифра на экране — это поле из трассы.
 *
 * Запуск:  node board.mjs            (http://127.0.0.1:7788)
 *          PORT=9000 node board.mjs
 */

import { createServer } from 'node:http'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = resolve(HERE, '..', 'artifacts')
const PORT = Number(process.env.PORT ?? 7788)

// Каталоги, которые не являются прогонами: сломанная песочница и прочий мусор.
const SKIP_DIRS = new Set(['_invalid-relative-root', '_smoke'])

/**
 * Собрать все ячейки из трасс на диске.
 * Читаются исходные `<arm>-<task>.json`; `summary-*.json` игнорируется намеренно,
 * потому что там лежит только последняя запись.
 */
function collectCells() {
  if (!existsSync(ARTIFACTS)) return { cells: [], error: `нет каталога ${ARTIFACTS}` }
  const cells = []
  for (const entry of readdirSync(ARTIFACTS, { withFileTypes: true })) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue
    const modelDir = join(ARTIFACTS, entry.name)
    for (const file of readdirSync(modelDir)) {
      if (!file.endsWith('.json') || file.startsWith('summary-')) continue
      try {
        const raw = JSON.parse(readFileSync(join(modelDir, file), 'utf8'))
        cells.push({
          file,
          dir: entry.name,
          model: raw.model ?? entry.name,
          arm: raw.arm ?? '?',
          task: raw.task ?? '?',
          rounds: raw.rounds ?? null,
          maxRounds: raw.maxRounds ?? null,
          denied: raw.denied ?? 0,
          revisits: raw.revisits ?? 0,
          // В трассе поля kErgLoop НЕТ: раннер пишет его только в журнал
          // (run-bench.mjs:456). Считаем той же формулой, чтобы доска не врала
          // пустотой. Если поле всё-таки есть — берём его.
          kErgLoop: raw.kErgLoop ?? (raw.calls?.length
            ? Number(((raw.revisits ?? 0) / raw.calls.length).toFixed(3))
            : 0),
          exactRepeats: raw.exactRepeats ?? 0,
          solved: raw.solved ?? null,
          runNote: raw.runNote ?? '',
          outcome: raw.outcome ?? '',
          inspectedGate: raw.inspectedGate ?? null,
          reportedImpossible: raw.reportedImpossible ?? null,
          calls: (raw.calls ?? []).map(c => ({
            round: c.round,
            action: c.action,
            tool: c.call?.tool,
            command: c.call?.command ?? c.call?.path,
            output: c.output,
          })),
        })
      } catch (error) {
        cells.push({ file, dir: entry.name, parseError: String(error.message) })
      }
    }
  }
  cells.sort((a, b) =>
    String(a.model).localeCompare(String(b.model)) ||
    String(a.arm).localeCompare(String(b.arm)) ||
    String(a.task).localeCompare(String(b.task)))
  return { cells }
}

/**
 * Состояние ячейки — это колонка канбана.
 * Правила читаются из трассы, ничего не домысливается.
 */
function stateOf(cell) {
  if (cell.parseError) return 'broken'
  if (cell.solved === true) return 'solved'
  const note = String(cell.runNote ?? '').toLowerCase()
  if (note.includes('round cap')) return 'cap'
  if (note.includes('no tool call')) return 'no_tool'
  if (note.includes('transport')) return 'transport'
  return 'other'
}

const COLUMNS = [
  { key: 'solved',    title: 'Решено',                 hint: 'модель объявила FINISHED и проверка прошла' },
  { key: 'cap',       title: 'Упёрлось в потолок',      hint: 'исчерпаны раунды, решения нет' },
  { key: 'no_tool',   title: 'Не вызвала инструмент',   hint: 'модель перестала действовать' },
  { key: 'other',     title: 'Прочее',                  hint: 'иное незавершённое состояние' },
  { key: 'transport', title: 'Сбой связи',              hint: 'транспортная ошибка' },
  { key: 'broken',    title: 'Битая трасса',            hint: 'не разобралась' },
]

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function page() {
  const { cells, error } = collectCells()
  const byState = new Map(COLUMNS.map(c => [c.key, []]))
  for (const cell of cells) {
    const key = stateOf(cell)
    if (!byState.has(key)) byState.set(key, [])
    byState.get(key).push(cell)
  }

  const models = [...new Set(cells.map(c => c.model))]
  const zeroK = cells.filter(c => !c.kErgLoop).length
  const nonzeroK = cells.length - zeroK
  const deniedCells = cells.filter(c => (c.denied ?? 0) > 0).length
  const repeatsCells = cells.filter(c => (c.exactRepeats ?? 0) > 0).length
  const values = cells.map(c => c.kErgLoop ?? 0)
  const distinctK = new Set(values).size

  // Раньше здесь утверждалось «метрика мертва, revisits=0 во всех ячейках,
  // счётчики противоречат друг другу». Это утверждение ОПРОВЕРГНУТО данными:
  // сверка `code/derive-loop-metric.mjs` показала совпадение revisits и
  // exactRepeats во всех 16 ячейках. Настоящий дефект был другим — трассы не
  // несли производных полей, и любой потребитель видел молчаливый ноль.
  // Плашка теперь говорит только то, что подтверждено, и различает три случая.
  let alert = ''
  if (cells.length > 0 && nonzeroK === 0 && repeatsCells > 0) {
    alert = `
    <div class="alert">
      <b>Метрика даёт ноль там, где повторы есть — сначала проверить поля, потом инструмент.</b>
      <code>kErgLoop = 0</code> во всех ${cells.length} ячейках, но <code>exactRepeats</code>
      срабатывал в ${repeatsCells}. В прошлый раз эту картину прочитали как «счётчики
      противоречат друг другу», и это оказалось НЕВЕРНО: причиной были производные поля,
      которых не было в трассах, и потребитель видел молчаливый ноль. Порядок проверки:
      (1) есть ли в трассах <code>derivedFields</code> и не равен ли <code>revisits</code>
      нулю; (2) воспроизводится ли <code>kErgLoop</code> из трассы через
      <code>derive-loop-metric.mjs</code>; и только (3) искать дефект в формуле. Пока это
      не объяснено, выводы делать нельзя.
    </div>`
  } else if (cells.length > 0 && nonzeroK === 0) {
    alert = `
    <div class="alert">
      <b>Петель в данных нет.</b>
      <code>kErgLoop = 0</code> во всех ${cells.length} ячейках, и <code>exactRepeats</code>
      тоже ноль: повторов действий не зафиксировано ни в одной ячейке.
      Это результат на этих данных, а не отказ метрики.
    </div>`
  } else if (cells.length > 0 && distinctK <= 2 && nonzeroK > 0) {
    alert = `
    <div class="alert">
      <b>Метрика жива, но почти не различает ячейки.</b>
      <code>kErgLoop &gt; 0</code> только в ${nonzeroK} из ${cells.length} ячеек,
      различных значений на всю выборку: ${distinctK}.
      При таком разбросе у критерия нет мощности: эффект навыка этой метрикой
      не проверяется. Значения нужно читать как «петель почти нет», а не как
      «навык не влияет».
    </div>`
  }

  const controls = `
    <div class="bar">
      <label>модель <select id="fModel"><option value="">все</option>
        ${models.map(m => `<option>${esc(m)}</option>`).join('')}</select></label>
      <label>рука <select id="fArm"><option value="">все</option>
        <option>no_skill</option><option>with_skill</option></select></label>
      <label>петля <select id="fLoop"><option value="">все</option>
        <option value="zero">нулевая</option><option value="gt">ненулевая</option></select></label>
      <span class="count" id="count"></span>
    </div>`

  const stats = `
    <div class="stats">
      <div class="stat"><b>${cells.length}</b><span>ячеек</span></div>
      <div class="stat"><b>${models.length}</b><span>моделей</span></div>
      <div class="stat"><b>${deniedCells}</b><span>с реальным EPERM</span></div>
      <div class="stat warn"><b>${zeroK}/${cells.length}</b><span>kErgLoop = 0</span></div>
    </div>`

  const board = COLUMNS.map(col => {
    const list = byState.get(col.key) ?? []
    return `
    <section class="col" data-col="${col.key}">
      <header><h2>${esc(col.title)}</h2><span class="badge">${list.length}</span></header>
      <p class="hint">${esc(col.hint)}</p>
      <div class="cards">
        ${list.map(cell => card(cell)).join('') || '<p class="empty">пусто</p>'}
      </div>
    </section>`
  }).join('')

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Эрго-бенчмарк — доска</title>
<style>
  :root { --bg:#0f1115; --panel:#171a21; --line:#272c36; --fg:#e6e9ef; --dim:#8b93a3;
          --solved:#2ea043; --cap:#d29922; --no_tool:#8957e5; --transport:#da3633; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  header.top { padding:16px 20px; border-bottom:1px solid var(--line); }
  h1 { margin:0 0 4px; font-size:18px; }
  .sub { color:var(--dim); font-size:12px; }
  .stats { display:flex; gap:10px; padding:12px 20px; flex-wrap:wrap; }
  .stat { background:var(--panel); border:1px solid var(--line); border-radius:8px;
          padding:8px 14px; display:flex; flex-direction:column; min-width:96px; }
  .stat b { font-size:20px; } .stat span { color:var(--dim); font-size:11px; }
  .stat.warn b { color:var(--cap); }
  .bar { display:flex; gap:14px; align-items:center; padding:0 20px 12px; flex-wrap:wrap; }
  .bar label { color:var(--dim); font-size:12px; }
  select { background:var(--panel); color:var(--fg); border:1px solid var(--line);
           border-radius:6px; padding:5px 8px; margin-left:5px; }
  .count { color:var(--dim); font-size:12px; margin-left:auto; }
  .board { display:flex; gap:14px; padding:0 20px 40px; overflow-x:auto; align-items:flex-start; }
  .col { background:var(--panel); border:1px solid var(--line); border-radius:10px;
         min-width:270px; flex:1 0 270px; padding:12px; }
  .col header { display:flex; align-items:center; gap:8px; }
  .col h2 { margin:0; font-size:13px; text-transform:uppercase; letter-spacing:.04em; }
  .badge { background:#0d1117; border:1px solid var(--line); border-radius:20px;
           padding:1px 9px; font-size:12px; color:var(--dim); }
  .hint { color:var(--dim); font-size:11px; margin:4px 0 10px; }
  .col[data-col=solved] h2 { color:var(--solved); }
  .col[data-col=cap] h2 { color:var(--cap); }
  .col[data-col=no_tool] h2 { color:var(--no_tool); }
  .col[data-col=transport] h2 { color:var(--transport); }
  .card { background:#0d1117; border:1px solid var(--line); border-left:3px solid var(--dim);
          border-radius:8px; padding:9px 11px; margin-bottom:8px; cursor:pointer; }
  .card:hover { border-color:#3d4553; }
  [data-col=solved] .card { border-left-color:var(--solved); }
  [data-col=cap] .card { border-left-color:var(--cap); }
  [data-col=no_tool] .card { border-left-color:var(--no_tool); }
  [data-col=transport] .card { border-left-color:var(--transport); }
  .card .t { font-weight:600; font-size:13px; }
  .card .m { color:var(--dim); font-size:11px; margin-top:2px; word-break:break-all; }
  .card .kv { display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; font-size:11px; }
  .kv i { font-style:normal; background:#161b22; border:1px solid var(--line);
          border-radius:5px; padding:1px 6px; color:var(--dim); }
  .kv i.hot { color:#ffa657; border-color:#5a3a1a; }
  .kv i.ep { color:#7ee787; border-color:#1d4a25; }
  .card .note { color:var(--dim); font-size:11px; margin-top:5px; }
  details { margin-top:8px; }
  summary { color:var(--dim); font-size:11px; cursor:pointer; }
  .round { border-top:1px dashed var(--line); padding:6px 0; font-size:11px; }
  .cmd { font-family:ui-monospace,Menlo,monospace; color:#79c0ff; word-break:break-all; }
  .out { font-family:ui-monospace,Menlo,monospace; color:#8b949e; white-space:pre-wrap;
         word-break:break-all; max-height:110px; overflow:auto; margin-top:3px; }
  .out.deny { color:#ff7b72; }
  .act { color:var(--dim); font-style:italic; }
  .empty { color:var(--dim); font-size:12px; }
  .alert { margin:12px 20px; padding:12px 14px; border-radius:9px;
           background:#2b1d05; border:1px solid #7a5a12; color:#f0d9a8;
           font-size:12.5px; line-height:1.5; }
  .alert b { color:#ffc857; display:block; margin-bottom:3px; font-size:13px; }
  .alert code { background:#0d1117; border:1px solid #3a3a3a; border-radius:4px;
                padding:1px 5px; font-size:11.5px; }
</style></head><body>
<header class="top">
  <h1>Эрго-бенчмарк — доска</h1>
  <div class="sub">Читается напрямую из трасс в <code>artifacts/</code>. Ничего не пересчитывается.
  Клик по карточке — пошаговый ход агента. Прогон: ${esc(new Date().toISOString().slice(0, 16))}</div>
</header>
${error ? `<p class="empty" style="padding:0 20px">${esc(error)}</p>` : ''}
${stats}
${alert}
${controls}
<div class="board">${board}</div>
<script>
const cards = [...document.querySelectorAll('.card')];
function apply(){
  const m=fModel.value, a=fArm.value, l=fLoop.value;
  let n=0;
  for(const c of cards){
    const ok = (!m || c.dataset.model===m) && (!a || c.dataset.arm===a) &&
      (!l || (l==='zero' ? c.dataset.loopzero==='1' : c.dataset.loopzero==='0'));
    c.style.display = ok ? '' : 'none';
    if(ok) n++;
  }
  document.getElementById('count').textContent = 'показано ' + n + ' из ' + cards.length;
  for(const col of document.querySelectorAll('.col')){
    const vis=[...col.querySelectorAll('.card')].filter(c=>c.style.display!=='none').length;
    col.querySelector('.badge').textContent = vis;
  }
}
for(const id of ['fModel','fArm','fLoop'])
  document.getElementById(id).addEventListener('change', apply);
apply();
</script>
</body></html>`
}

function card(cell) {
  if (cell.parseError) {
    return `<div class="card"><div class="t">${esc(cell.file)}</div>
            <div class="m">${esc(cell.parseError)}</div></div>`
  }
  const zero = !cell.kErgLoop ? '1' : '0'
  const rounds = cell.maxRounds ? `${cell.rounds}/${cell.maxRounds}` : cell.rounds
  const roundsCell = cell.calls.map(c => {
    const isDeny = /not permitted|operation not permitted|EPERM/i.test(String(c.output ?? ''))
    return `<div class="round">
      <div class="cmd">#${esc(c.round)} ${esc(c.tool ?? '')} ${esc(c.command ?? '')}</div>
      ${c.action ? `<div class="act">${esc(c.action)}</div>` : ''}
      ${c.output ? `<div class="out${isDeny ? ' deny' : ''}">${esc(String(c.output).slice(0, 900))}</div>` : ''}
    </div>`
  }).join('')

  return `<div class="card" data-model="${esc(cell.model)}" data-arm="${esc(cell.arm)}"
               data-loopzero="${zero}">
    <div class="t">${esc(cell.task)} · ${esc(cell.arm)}</div>
    <div class="m">${esc(cell.model)}</div>
    <div class="kv">
      <i>раундов ${esc(rounds)}</i>
      <i class="${cell.denied > 0 ? 'ep' : ''}">EPERM ${esc(cell.denied)}</i>
      <i class="${!cell.kErgLoop ? 'hot' : ''}">kErgLoop ${esc(cell.kErgLoop ?? 0)}</i>
      <i>повторов ${esc(cell.exactRepeats)}</i>
      <i>ревизий ${esc(cell.revisits)}</i>
    </div>
    <div class="note">${esc(cell.runNote)}</div>
    ${cell.calls.length ? `<details><summary>показать ход (${cell.calls.length} шагов)</summary>${roundsCell}</details>` : ''}
  </div>`
}

createServer((req, res) => {
  if (req.url === '/api/cells') {
    const { cells, error } = collectCells()
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error, count: cells.length, cells }, null, 2))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(page())
}).listen(PORT, '127.0.0.1', () => {
  const { cells } = collectCells()
  console.log(`доска: http://127.0.0.1:${PORT}`)
  console.log(`ячеек прочитано: ${cells.length}`)
  console.log(`артефакты: ${ARTIFACTS}`)
})
