#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? '.')
const errors = []
const warnings = []
const rel = p => relative(root, p) || '.'
const required = p => { if (!existsSync(p)) errors.push(`missing: ${rel(p)}`) }
const read = p => { try { return readFileSync(p, 'utf8') } catch { errors.push(`unreadable: ${rel(p)}`); return '' } }
const headings = (p, names) => { const text = read(p).toLowerCase(); for (const name of names) if (!text.includes(name.toLowerCase())) errors.push(`missing section '${name}' in ${rel(p)}`) }

for (const p of ['AGENTS.md','SOUL.md','README.md']) required(join(root, p))
for (const p of ['library','data','data/raw','data/processed','outputs','templates/research','outputs/_template']) required(join(root, p))
for (const p of ['agents/research-lead.md','agents/evidence-auditor.md','agents/data-analyst.md','agents/bibliographer.md']) required(join(root, p))
// Детектор секретов различает ЗНАЧЕНИЕ и ССЫЛКУ, потому что один общий шаблон был
// одновременно и шумным, и слепым к смыслу.
//
// `secretLiteral` — узнаваемое значение ключа. Всегда ошибка.
// `secretAssign`  — имя учётных данных со значением из «ключеподобных» символов.
//   Ошибка, ЕСЛИ это не ссылка.
// `secretReference` — по виду ссылка, а не значение: `process.env`, `os.environ()`,
//   `$(...)`, `${...}`, `<плейсхолдер>`. Такое понижается до предупреждения.
// `secretName` — имя учётных данных вообще без значения (`BENCH_API_KEY:-}`).
//   Предупреждение: команда, которая берёт ключ из окружения, утечкой не является.
//
// Правило проверено тестами `scripts/test-secret-detector.mjs`, включая четыре
// реальных случая из этого репозитория: `API_KEY=<ключ>` в README двух
// исследований, `API_KEY = process.env.BENCH_API_KEY` в раннере и
// `BENCH_API_KEY:-}` в трассе. Все четыре — ссылки, а не утечки.
const secretLiteral = /(sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN .*PRIVATE KEY-----)/i
const secretAssign = /(?:password|token|api[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9_\-./+=@!#%^&*]{6,}/i
const secretReference = /process\.|environ|getenv|\$[({]|<[^>]*>/i
const secretName = /(?:password|token|api[_-]?key)\s*[:=]/i
function secretFinding(text) {
  if (secretLiteral.test(text)) return 'error'
  const assigned = text.match(secretAssign)
  if (assigned && !secretReference.test(assigned[0])) return 'error'
  return secretName.test(text) ? 'warn' : null
}
function scan(dir) { if (!existsSync(dir)) return; for (const ent of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, ent.name); if (rel(p) === 'scripts/validate-workspace.mjs') continue; if (ent.isSymbolicLink()) { warnings.push(`symlink: ${rel(p)}`); continue }; if (ent.isDirectory()) { scan(p); continue } if (!/\.(md|yaml|yml|json|txt|js|mjs|py|toml)$/.test(ent.name)) continue; const finding = secretFinding(read(p)); if (finding === 'error') errors.push(`possible secret: ${rel(p)}`); else if (finding === 'warn') warnings.push(`credential name without a value: ${rel(p)}`) } }
scan(root)
const output = join(root, 'outputs')
if (existsSync(output)) for (const ent of readdirSync(output, { withFileTypes: true })) {
  if (!ent.isDirectory() || ent.name === '_template') continue
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*$/.test(ent.name)) { errors.push(`invalid study directory: outputs/${ent.name}`); continue }
  const study = join(output, ent.name)
  for (const p of ['README.md','sources.md','methods.md','results.md','limitations.md','audit-report.md','manifest.yaml','code','artifacts']) required(join(study, p))
  headings(join(study, 'README.md'), ['вопрос','гипотеза','критерий опровержения','критерий готовности'])
  headings(join(study, 'methods.md'), ['дизайн','данные','преобразования','анализ','проверки'])
  headings(join(study, 'results.md'), ['факты','результаты','интерпретация'])
  headings(join(study, 'limitations.md'), ['ограничения','следующие эксперименты'])
  headings(join(study, 'audit-report.md'), ['claim','вычисления','цитат'])
  const manifest = read(join(study, 'manifest.yaml'))
  for (const key of ['project:','status:','raw_inputs:','seed:','commands:','outputs:','publication_status:']) if (!manifest.includes(key)) errors.push(`manifest missing ${key}: ${rel(join(study,'manifest.yaml'))}`)
  if (/publication_status:\s*(public|published|external)\b/i.test(manifest)) errors.push(`unsafe publication status: ${rel(join(study,'manifest.yaml'))}`)
}
for (const warning of warnings) console.warn(`WARN ${warning}`)
for (const error of errors) console.error(`ERROR ${error}`)
console.log(`Validation: ${errors.length ? 'FAILED' : 'OK'} (${errors.length} errors, ${warnings.length} warnings)`)
process.exitCode = errors.length ? 1 : 0
