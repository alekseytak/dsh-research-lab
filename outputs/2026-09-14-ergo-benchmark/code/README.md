# code/

`run-bench.mjs` — раннер пилота, **побайтовая копия** `../bench/run-bench.mjs`.
Оригинал не перемещён и не изменён: он остаётся в `bench/`, где записан в `manifest.yaml`.

Копия добавлена, чтобы исследование соответствовало контракту лаборатории
(`code/` обязателен). Расхождений между копиями быть не должно; проверка:

```bash
shasum -a 256 ../bench/run-bench.mjs run-bench.mjs
```

Запуск пилота (как он выполнялся):

```bash
OPENROUTER_API_KEY=<ключ> BENCH_MODEL=nex-agi/nex-n2.5-pro:free BENCH_ROUNDS=14 node run-bench.mjs both all
```
