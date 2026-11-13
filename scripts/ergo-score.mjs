#!/usr/bin/env node
/**
 * Scores a move ledger against the ERGO loop verdict in
 * `~/.agents/skills/ergo-break-the-loop/SKILL.md`. One JSON object per line:
 *
 *   {"action":"run","target":"pnpm dsh plugin add","premise":"the bundle installs locally",
 *    "world":"exit 1","fact":null,"pending":false}
 *
 * `action` is one of read, run, write, ask, derive. `target` and `premise` are
 * compared after trimming. `world` is any cheap state marker; `pending` marks an
 * operation still running. A `fact` counts only when it is new, and an `order`
 * marks a move that closed a task without proving the outcome.
 *
 * The window is six moves; a loop needs R >= 5/6 with an unchanged world, no new
 * fact, and nothing pending. Read-only: it writes nothing and executes nothing.
 */

import { readFileSync } from 'node:fs'

/** Window size in moves, per the skill. */
const WINDOW = 6
/** Re-visits required inside the window before a loop is judged. */
const REVISITS_REQUIRED = 5
/** Actions the ledger accepts. */
const ACTIONS = new Set(['read', 'run', 'write', 'ask', 'derive'])

/**
 * Read and validate a JSONL ledger.
 * @param path - ledger file path.
 * @returns the parsed moves in execution order.
 */
function readLedger(path) {
  const moves = []
  const lines = readFileSync(path, 'utf8').split('\n')
  for (const [index, line] of lines.entries()) {
    const text = line.trim()
    if (text.length === 0 || text.startsWith('#')) continue
    let row
    try {
      row = JSON.parse(text)
    } catch (error) {
      throw new Error(`line ${index + 1}: not valid JSON (${error.message})`)
    }
    const label = `line ${index + 1}`
    if (typeof row.action !== 'string' || !ACTIONS.has(row.action)) {
      throw new Error(`${label}: action must be one of ${[...ACTIONS].join(', ')}`)
    }
    if (typeof row.target !== 'string' || row.target.trim().length === 0) {
      throw new Error(`${label}: target must be a non-empty string`)
    }
    if (typeof row.premise !== 'string' || row.premise.trim().length === 0) {
      throw new Error(`${label}: premise must be a non-empty string`)
    }
    moves.push({
      action: row.action,
      target: row.target.trim(),
      premise: row.premise.trim(),
      world: row.world === undefined || row.world === null ? '' : String(row.world),
      fact: typeof row.fact === 'string' && row.fact.trim().length > 0 ? row.fact.trim() : null,
      order: row.order === true,
      pending: row.pending === true,
    })
  }
  return moves
}

/**
 * The signature a move is compared by.
 * @param move - one ledger row.
 * @returns the four-field signature.
 */
const signature = move => `${move.action}\u0000${move.target}\u0000${move.premise}\u0000${move.world}`

/**
 * Score the trailing window.
 * @param moves - all moves in execution order.
 * @returns the window metrics and the verdict inputs.
 */
function score(moves) {
  const window = moves.slice(-WINDOW)
  const seen = new Set()
  for (const move of moves.slice(0, Math.max(0, moves.length - window.length))) seen.add(signature(move))
  let revisits = 0
  for (const move of window) {
    if (seen.has(signature(move))) revisits += 1
    seen.add(signature(move))
  }
  const worlds = new Set(window.map(move => move.world))
  const facts = new Set(moves.map(move => move.fact).filter(fact => fact !== null))
  return {
    totalMoves: moves.length,
    windowSize: window.length,
    revisits,
    window,
    kErgLoop: window.length === 0 ? 0 : revisits / window.length,
    worldMoved: worlds.size > 1,
    newFact: window.some(move => move.fact !== null),
    pending: window.some(move => move.pending),
    orders: moves.filter(move => move.order).length,
    facts: [...facts],
  }
}

/**
 * Print one report.
 * @param result - output of {@link score}.
 */
function report(result) {
  const needed = Math.min(WINDOW, result.windowSize)
  console.log(`ledger: ${result.totalMoves} moves, window of ${result.windowSize}`)
  console.log(`R (re-visits in window) = ${result.revisits}/${result.windowSize} (K_erg_loop ${result.kErgLoop.toFixed(2)})`)
  console.log(`world moved: ${result.worldMoved ? 'yes' : 'no'} | new fact in window: ${result.newFact ? 'yes' : 'no'} | pending: ${result.pending ? 'yes' : 'no'}`)
  if (result.orders > 0) console.log(`note: ${result.orders} move(s) closed an order without proving the outcome (K_erg_orders)`)

  const reasons = []
  if (result.windowSize < needed) reasons.push(`only ${result.windowSize} moves recorded, ${needed} needed`)
  if (result.revisits < REVISITS_REQUIRED) reasons.push(`re-visits below ${REVISITS_REQUIRED}`)
  if (result.worldMoved) reasons.push('the world changed between moves')
  if (result.newFact) reasons.push('at least one new fact arrived')
  if (result.pending) reasons.push('an operation is still pending')

  if (reasons.length === 0) {
    console.log('ERGO-PRISON: no new fact, unchanged world, re-visits at the threshold. Stop retrying and change the frame.')
    console.log('before stopping, satisfy the stop conditions: ledger with six rows, two named frame changes, the acceptance line quoted unchanged, a falsifying observation and its owner')
    return
  }
  console.log(`not a loop: ${reasons.join('; ')}`)
}

const args = process.argv.slice(2)
const path = args.find(argument => !argument.startsWith('--'))
if (path === undefined) {
  console.error('usage: node scripts/ergo-score.mjs <ledger.jsonl>')
  process.exit(2)
}
try {
  report(score(readLedger(path)))
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
