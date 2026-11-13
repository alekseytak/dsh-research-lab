# Формулы, размерности и статусы

## Реестр формул

| Формула | Роль | Размерностное требование | Статус |
|---|---|---|---|
| `P_transition = sigmoid(sum w_i x_i + b)` | toy probability/score | аргумент сигмоиды безразмерный | `HYPOTHETICAL_MODEL` |
| `P_tr = sigmoid(k[sum ln(F_i)-z0])` | multiplicative transition model | все `F_i>0`; логарифмы безразмерны; `k,z0` согласованы | `HYPOTHETICAL_MODEL` |
| `K_erg_raw=abs(V_local/(V_ref+eps)-1)` | regime deviation | `V_local`, `V_ref`, `eps` одной размерности | `ENGINEERING_METRIC` |
| `K_erg=raw/(1+raw)` | normalization | raw безразмерен | `ENGINEERING_METRIC` |
| `chi=beta0-beta1+beta2` | Euler characteristic | Betti numbers — целые числа конкретного комплекса | `ESTABLISHED_MATH` |
| `f_n=f0*2^n` | octave conversion | `f0` и `f_n` в Hz, `n` безразмерен | `ENGINEERING_TRANSFORM` |
| `f_m=f0*phi^m` | golden-ratio conversion | `m` безразмерен | `ENGINEERING_TRANSFORM` |
| `r=ct` | causal light-front relation | `r` length, `c` length/time, `t` time | `ESTABLISHED_PHYSICS` |

## Модель P_transition

В [Edinaia-Veroiatnost-Perekhoda-Supermodel-s-Strunnymi-Chlenami.txt] есть две совместимые toy-записи:

\[
P_0(\Delta\phi)=\sigma[k\cos(\Delta\phi)],
\]

\[
P_{tr}(x,t)=\sigma\left\{k\left[\sum_{i=1}^{11}\ln F_i(x,t)-z_0\right]\right\}.
\]

Их можно хранить как две версии модели перехода, но не как доказанную нейрофизическую/квантовую теорию. Для второй версии должны быть перечислены все `F_i`, их положительность и способ оценки. «String term» допустим как базис локализованных осцилляторных мод:

\[
F_{str}(x,t)=\sum_{m=1}^{M}A_m\exp\left(-\frac{\|x-x_m\|^2}{2g_m^2}\right)\cos(k_m\cdot x-\omega_mt+\phi_m).
\]

Но выражение может иметь отрицательные значения, а значит не может входить непосредственно внутрь `ln(F_i)` без преобразования в строго положительный фактор, например `F_str_positive = exp(a * s_str)` или `1 + a*s_str` при доказанном положительном диапазоне. Это обязательная численная правка.

## Частоты

[stage-3-frequency-unification.pdf] задаёт `f0=7.83 Hz` как reference для представления частот и `12.67 Hz≈f0*phi`. Это допустимо как конвенция конвертации:

\[
n=\log_2(f/f_0),\qquad m=\frac{\ln(f/f_0)}{\ln\phi}.
\]

Не допускается вывод: что мозговые ритмы, нуклеотидные музыкальные частоты, NV-расщепления и Schumann resonance физически причинно связаны только потому, что их можно выразить через один `f0`.

## Нормализация входов

До любой линейной/логистической модели:

\[
z_i=\frac{x_i-\mu_i}{s_i+\epsilon}.
\]

Храните `mu_i`, `s_i`, training/reference split и версию feature schema. Это устраняет неявное смешение величин разной размерности.
