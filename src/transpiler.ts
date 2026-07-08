/**
 * A lightweight transpiler that transforms standard synchronous Auto.js scripts
 * into async-compatible code so they can run without freezing the browser tab
 * and support interactive, non-blocking input dialogs.
 */
export function transpileScript(code: string): string {
  let processed = code;

  // 1. Transform sleep(ms) to await sleep(ms)
  processed = processed.replace(/\bsleep\s*\(\s*([^)]+)\s*\)/g, 'await sleep($1)');

  // 2. Transform confirm(...) to await confirm(...)
  processed = processed.replace(/\bconfirm\s*\(\s*([^)]+)\s*\)/g, 'await confirm($1)');

  // 3. Transform dialogs.input(...) to await dialogs.input(...)
  processed = processed.replace(/\bdialogs\.input\s*\(\s*([^)]+)\s*\)/g, 'await dialogs.input($1)');

  // 4. Transform dialogs.singleChoice(...) to await dialogs.singleChoice(...)
  processed = processed.replace(/\bdialogs\.singleChoice\s*\(\s*([^)]+)\s*\)/g, 'await dialogs.singleChoice($1)');

  // 5. Transform http.get(...) to await http.get(...)
  processed = processed.replace(/\bhttp\.get\s*\(\s*([^)]+)\s*\)/g, 'await http.get($1)');

  // 6. Transform http.post(...) to await http.post(...)
  processed = processed.replace(/\bhttp\.post\s*\(\s*([^)]+)\s*\)/g, 'await http.post($1)');

  return processed;
}
