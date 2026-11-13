/**
 * Тесты детектора секретов в validate-workspace.mjs.
 *
 * Зачем: детектор срабатывал на команде, которая ПЕРЕ-использует переменную с
 * ключом (`BENCH_API_KEY:-}`), и это давало ложную ошибку валидации. Ослаблять
 * детектор вслепую нельзя — он защитный. Поэтому сначала тесты: они фиксируют,
 * что настоящие утечки по-прежнему ловятся, а ссылка на имя переменной — нет.
 *
 * Запуск: node scripts/test-secret-detector.mjs
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const VALIDATOR = join(HERE, 'validate-workspace.mjs')

/** Прогнать валидатор на временном корне и вернуть только строки про секреты. */
function secretDiagnostics(content, filename = 'probe.md') {
  const root = mkdtempSync(join(tmpdir(), 'secret-probe-'))
  try {
    mkdirSync(join(root, 'probes'), { recursive: true })
    writeFileSync(join(root, 'probes', filename), content)
    let out = ''
    try {
      out = execFileSync('node', [VALIDATOR, root], { encoding: 'utf8' })
    } catch (error) {
      out = `${error.stdout ?? ''}${error.stderr ?? ''}`
    }
    // Ловим и «secret», и «credential»: у ошибки и предупреждения разные
    // формулировки, и фильтр только по «secret» молча терял предупреждения —
    // из-за этого один тест сначала «проходил» на пустом выводе.
    return out.split('\n').filter(line => /secret|credential/i.test(line))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const errors = diags => diags.filter(line => line.includes('ERROR'))
const warnings = diags => diags.filter(line => line.includes('WARN'))

let failed = 0
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  OK   ${label}`)
  } else {
    failed += 1
    console.log(`  FAIL ${label}${detail ? ' — ' + detail : ''}`)
  }
}

// ─────────────── настоящие утечки ОБЯЗАНЫ остаться ошибками ───────────────
//
// Фикстуры собираются из кусков НАМЕРЕННО: этот файл сам сканируется детектором,
// поэтому литеральная утечка в нём была бы ложной ошибкой. Собранная строка при
// записи в пробный файл неотличима от литерала, а в исходнике этого файла
// значения нет.

const leakCases = [
  ['ключ вида sk-', 'ключ: ' + 'sk-' + 'abcdefghijklmnopqrstuvwx' + '\n'],
  ['ключ вида AKIA', 'aws: ' + 'AKIA' + 'IOSFODNN7EXAMPLE' + '\n'],
  ['приватный ключ', '-----BEGIN' + ' RSA PRIVATE KEY-----\nMIIEow...\n'],
  ['длинное значение после имени ключа',
    'LITEROUTER_API_KEY' + ': ' + 'a1b2c3d4'.repeat(8) + '\n'],
  ['короткий пароль', 'password' + ': hunter2\n'],
  ['пароль со знаками', 'password' + ': p@ssw0rd!\n'],
  ['захардкоженный токен', 'token' + ': ghp_0123456789abcdefghij\n'],
]

console.log('═══ настоящие утечки: обязаны быть ERROR ═══')
for (const [label, content] of leakCases) {
  const diags = secretDiagnostics(content)
  check(label, errors(diags).length >= 1, `диагностика: ${JSON.stringify(diags)}`)
}

// ─────────────── ссылки на значение НЕ должны быть ошибкой ───────────────
//
// Первые четыре — это реальные случаи, найденные в этом репозитории, а не
// придуманные: именно они давали ложную ошибку валидации.

const referenceCases = [
  ['bash-подстановка со значением по умолчанию (было ложной ошибкой)',
    'if [ -z "${BENCH_API_KEY' + ':-}" ]; then\n  BENCH_API_KEY="$(cat key)"\nfi\n'],
  ['плейсхолдер в документации (было ложной ошибкой)',
    'BENCH_API_KEY' + '=<ключ>\n'],
  ['чтение из окружения в коде (было ложной ошибкой)',
    'const k = process.env.BENCH' + '_API_KEY\n'],
  ['чтение ключа по имени в Python', 'key = os.environ["LITEROUTER_API_KEY' + '"]\n'],
  ['проверка наличия ключа',
    'if not os.environ.get("OPENROUTER_API_KEY' + '"):\n    raise SystemExit\n'],
]

console.log('\n═══ ссылки на значение: НЕ должны быть ERROR ═══')
for (const [label, content] of referenceCases) {
  const diags = secretDiagnostics(content)
  check(label, errors(diags).length === 0, `ложная ошибка: ${JSON.stringify(errors(diags))}`)
}

// ─────────────── чистое содержимое не даёт диагностики вообще ───────────────

console.log('\n═══ чистое содержимое ═══')
{
  const diags = secretDiagnostics('обычный текст без учётных данных\nBENCH_MODEL=x\n')
  check('нет ни ошибки, ни предупреждения', diags.length === 0, JSON.stringify(diags))
}

// ─────────────── русская проза не должна выглядеть как значение ───────────────

console.log('\n═══ проза ═══')
{
  const diags = secretDiagnostics('token' + ': хранится в файле рядом\n')
  check('русский текст после имени — не значение',
    errors(diags).length === 0, JSON.stringify(diags))
}

// ─────────────── селективность ───────────────

console.log('\n═══ селективность ═══')
{
  const withLeak = secretDiagnostics('ключ: ' + 'sk-' + 'abcdefghijklmnopqrstuvwx' + '\n')
  check('утечка даёт именно ERROR, а не тихое предупреждение',
    errors(withLeak).length >= 1 && warnings(withLeak).length === 0, JSON.stringify(withLeak))
}
{
  const withRef = secretDiagnostics('if [ -z "${BENCH_API_KEY' + ':-}" ]; then\n')
  check('ссылка не даёт ERROR и остаётся видимой как WARN',
    errors(withRef).length === 0 && warnings(withRef).length >= 1, JSON.stringify(withRef))
}

console.log(`\n${failed === 0 ? 'ВСЁ ЗЕЛЁНОЕ' : `ПАДЕНИЙ: ${failed}`}`)
process.exit(failed === 0 ? 0 : 1)
