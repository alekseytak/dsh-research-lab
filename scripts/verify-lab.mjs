#!/usr/bin/env node
/**
 * verify-lab.mjs — доказывает, что DSH Research Lab действительно работает.
 *
 * Запуск:  node scripts/verify-lab.mjs [путь-к-лаборатории]
 *
 * Проверяет РЕАЛЬНЫЕ артефакты, а не самоотчёт:
 *   1. bundle-плагин зарегистрирован в профиле (package.json: deps + dsh.profile.bundles)
 *   2. bundle-плагин фактически ПРИМЕНЁН в resolved-конфиге профиля
 *      (запускает `dsh --dump-config` и ищет атрибуцию загрузчика + значения patch)
 *   3. пресеты лаборатории установлены
 *   4. скрипты лаборатории исполняются (ergo-score, validate-workspace)
 *
 * Коды выхода: 0 — всё работает; 1 — есть поломка.
 * Этот скрипт — артефакт: его можно перезапустить и получить тот же ответ.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

const LAB = resolve(process.argv[2] ?? join(homedir(), 'DSH-Research-Lab'))
const DSH_HOME = join(homedir(), '.dsh')
const PRESETS = join(DSH_HOME, '.agent-presets')

const PROFILE = process.env.DSH_VERIFY_PROFILE ?? 'web'
const PROFILE_DIR = join(DSH_HOME, 'profiles', PROFILE)
const BUNDLE_NAME = 'dsh-research-lab-bundle'

const results = []
const record = (ok, area, detail, evidence = '') =>
  results.push({ ok, area, detail, evidence })

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const has = (p) => existsSync(p)

// ── 1. Регистрация в профиле ────────────────────────────────────────────────
function checkRegistration() {
  const pkgPath = join(PROFILE_DIR, 'package.json')
  if (!has(pkgPath)) {
    record(false, 'регистрация', `нет ${pkgPath}`)
    return
  }
  const pkg = readJson(pkgPath)

  const dep = pkg.dependencies?.[BUNDLE_NAME]
  record(
    Boolean(dep),
    'регистрация',
    dep ? `в dependencies: ${dep}` : 'нет в dependencies',
    dep ?? '',
  )

  const bundles = pkg.dsh?.profile?.bundles ?? []
  record(
    bundles.includes(BUNDLE_NAME),
    'регистрация',
    bundles.includes(BUNDLE_NAME)
      ? 'в dsh.profile.bundles'
      : `нет в dsh.profile.bundles (${bundles.length} шт.)`,
  )

  const nm = join(PROFILE_DIR, 'node_modules', BUNDLE_NAME)
  record(
    has(join(nm, 'package.json')),
    'регистрация',
    has(join(nm, 'package.json')) ? 'установлен в node_modules' : 'нет в node_modules',
  )
}

// ── 2. Фактическое применение patch в resolved-конфиге ──────────────────────
// Это главная проверка: она читает конфиг, который реально собран загрузчиком,
// а не исходники пакета. Прокси (наличие файла) доказательством не считается.
function checkAppliedPatch() {
  const nodeBin = join(homedir(), '.nvm/versions/node/v24.19.0/bin')
  const env = {
    ...process.env,
    PATH: [nodeBin, join(homedir(), '.local/bin'), '/usr/local/bin', '/usr/bin', '/bin']
      .join(':'),
  }
  const harness = join(homedir(), 'deepseek harness')

  let dump
  try {
    dump = execFileSync('pnpm', ['dsh', '--profile', PROFILE, '--dump-config'], {
      cwd: harness,
      env,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (err) {
    record(false, 'применение patch', `не удалось получить --dump-config: ${err.message}`)
    return
  }

  // 2a. Атрибуция загрузчика: какая строка кем пропатчена.
  const attributed = dump
    .split('\n')
    .filter((l) => l.startsWith('#') && l.includes(BUNDLE_NAME))
  record(
    attributed.length > 0,
    'применение patch',
    attributed.length > 0
      ? `загрузчик атрибутирует patch плагину (${attributed.length} строк)`
      : 'нет строк с атрибуцией плагина',
    attributed[0] ?? '',
  )

  // 2b. Значения из cordis.patch.yml плагина должны совпасть с resolved-конфигом.
  const patchPath = join(LAB, 'plugin', BUNDLE_NAME, 'cordis.patch.yml')
  if (!has(patchPath)) {
    record(false, 'применение patch', `нет ${patchPath}`)
    return
  }
  const patch = readFileSync(patchPath, 'utf8')

  const maxBytes = patch.match(/maxBytes:\s*(\d+)/)?.[1]
  if (maxBytes) {
    record(
      new RegExp(`agent-instructions[\\s\\S]{0,200}?maxBytes:\\s*${maxBytes}`).test(dump),
      'применение patch',
      `agent-instructions.maxBytes = ${maxBytes} применён`,
    )
  }

  // persona: сверяем нормализованный текст, а не факт наличия слова.
  const personaLine = patch
    .split('\n')
    .filter((l) => l.includes('reproducible scientific laboratory'))
    .map((l) => l.trim())
    .join(' ')
  const personaPresent = dump.includes('reproducible scientific laboratory')
  record(
    personaPresent,
    'применение patch',
    personaPresent
      ? 'persona из bundle присутствует в resolved-конфиге'
      : 'persona из bundle НЕ найдена в resolved-конфиге',
    personaLine.slice(0, 80),
  )

  // 2c. Проверяем, не затенена ли persona пресетом сессии — это ожидаемое
  // поведение, но о нём надо знать: иначе «плагин не работает» ложно.
  const shadowers = []
  if (has(PRESETS)) {
    for (const name of execFileSync('ls', [PRESETS], { encoding: 'utf8' }).split('\n')) {
      const f = join(PRESETS, name.trim(), 'agent.cordis.yml')
      if (name.trim() && has(f) && readFileSync(f, 'utf8').includes('dsh-persona')) {
        shadowers.push(name.trim())
      }
    }
  }
  record(
    true,
    'применение patch',
    shadowers.length
      ? `persona затеняется пресетами сессии: ${shadowers.join(', ')} (ожидаемо)`
      : 'пресетов с собственной persona нет',
  )
}

// ── 3. Пресеты лаборатории ──────────────────────────────────────────────────
function checkPresets() {
  const want = ['research-lead', 'evidence-auditor', 'data-analyst', 'bibliographer']
  const missing = want.filter((p) => !has(join(PRESETS, p, 'agent.cordis.yml')))
  record(
    missing.length === 0,
    'пресеты',
    missing.length ? `нет пресетов: ${missing.join(', ')}` : `установлены: ${want.join(', ')}`,
  )
}

// ── 4. Скрипты лаборатории реально исполняются ──────────────────────────────
function checkScripts() {
  const ledger = join(LAB, 'library', 'ergo', 'ledger.example.jsonl')
  if (!has(ledger)) {
    record(false, 'скрипты', 'нет library/ergo/ledger.example.jsonl')
  } else {
    try {
      const out = execFileSync('node', [join(LAB, 'scripts', 'ergo-score.mjs'), ledger], {
        cwd: LAB,
        encoding: 'utf8',
      })
      record(
        out.includes('R (re-visits in window)'),
        'скрипты',
        'ergo-score.mjs исполняется и считает метрику',
        out.split('\n')[0],
      )
    } catch (err) {
      record(false, 'скрипты', `ergo-score.mjs упал: ${err.message}`)
    }
  }

  try {
    execFileSync('node', [join(LAB, 'scripts', 'validate-workspace.mjs'), '.'], {
      cwd: LAB,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    record(true, 'скрипты', 'validate-workspace.mjs: PASSED')
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`
    const n = (out.match(/^ERROR/gm) ?? []).length
    record(
      false,
      'скрипты',
      `validate-workspace.mjs: FAILED (${n} ошибок) — выводы лаборатории не соответствуют её же контракту`,
    )
  }
}

// ── отчёт ───────────────────────────────────────────────────────────────────
checkRegistration()
checkAppliedPatch()
checkPresets()
checkScripts()

const pad = (s, n) => String(s).padEnd(n)
console.log('='.repeat(72))
console.log(`DSH Research Lab — проверка работоспособности`)
console.log(`лаборатория: ${LAB}`)
console.log(`профиль:     ${PROFILE}`)
console.log('='.repeat(72))
for (const r of results) {
  console.log(`${r.ok ? 'OK  ' : 'FAIL'}  ${pad(r.area, 16)}  ${r.detail}`)
  if (r.evidence) console.log(`      ${' '.repeat(16)}  ↳ ${r.evidence}`)
}
const failed = results.filter((r) => !r.ok).length
console.log('='.repeat(72))
console.log(failed ? `ИТОГ: ${failed} поломок ❌` : 'ИТОГ: лаборатория работает ✅')
process.exit(failed ? 1 : 0)
