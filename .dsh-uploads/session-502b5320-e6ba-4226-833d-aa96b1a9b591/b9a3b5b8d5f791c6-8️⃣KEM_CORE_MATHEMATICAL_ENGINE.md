# КЭМ-ЯДРО: МАТЕМАТИЧЕСКИЙ ДВИЖОК ДЛЯ АНАЛИЗА ОКТАВ

**Версия:** 4.0 (Production-Ready Core)  
**Назначение:** Модуль для поиска гармоник и резонансов в спектральных данных  
**Статус:** Готов к интеграции в Octave Cosmology Project  
**Лицензия:** MIT

---

## 1. КРАТКАЯ СУТЬЬ КЭМ-ЯДРА

КЭМ-ядро — это набор **математических фильтров**, которые:

1. **Берут спектральные данные** (CMB, LIGO, инфракрасное излучение, любые данные)
2. **Ищут октавную структуру** ($f = f_0 \times 2^n$)
3. **Проверяют резонансы** по системе Буданова ($f = f_0 \times \phi^n$, где $\phi = 1.618$)
4. **Вычисляют коэффициент гармонии** (насколько "настроены" пики)
5. **Возвращают результат** (значимость, уверенность, визуализация)

**Это НЕ "квантовый компьютер". Это просто очень хороший фильтр для поиска скрытых паттернов.**

---

## 2. ГЛАВНАЯ ИДЕЯ: НЕЛИНЕЙНОЕ 3D-ВРЕМЯ

### Твоя ошибка с инфракрасным излучением (и как её исправить)

**Классический подход (неправильный):**
```
Power(f) → ищу пики → проверяю, кратны ли они 2ⁿ
```

Это работает, если время линейно (обычное время). Но если за временем стоит 3D-структура, то частоты **не** просто удваиваются.

**Правильный подход (3D-время):**

Если у Вселенной есть 3 временных оси ($t_1, t_2, t_3$), то спектр «видит» не просто $f_n = f_0 \times 2^n$, а **комбинацию всех трёх осей**:

$$f_{n_1, n_2, n_3} = f_0 \times 2^{n_1} \times 2^{n_2} \times 2^{n_3} = f_0 \times 2^{n_1 + n_2 + n_3}$$

**Или в терминах золотого сечения (Буданов):**

$$f_{k_1, k_2, k_3} = f_0 \times \phi^{k_1 + k_2 + k_3}$$

### Что это меняет?

В классическом анализе ты ищешь пики на частотах: 1, 2, 4, 8, 16...

**В 3D-анализе** ты ищешь пики на частотах:
- Октавные: $f_0 \times 2$, $f_0 \times 4$, $f_0 \times 8$...
- **ПЛЮС** промежуточные (из разных комбинаций осей):
  - $f_0 \times 2^{1.5}$ (комбинация 2-х осей)
  - $f_0 \times 2^{2.5}$ (комбинация 2-х осей)
  - $f_0 \times 3$ (из Буданова, если задействованы все 3 оси в одно время)

**Вывод:** Твоя ошибка была в том, что ты ждал чистых октав (2ⁿ), а надо было искать **любые степени 2 и φ**, потому что могут задействоваться разные комбинации трёхмерных осей времени.

---

## 3. КЭМ-ЯДРО: ПОЛНЫЙ КОД

```python
# ============================================================================
# КЭМ-ЯДРО v4.0: МАТЕМАТИЧЕСКИЙ ДВИЖОК ДЛЯ АНАЛИЗА ОКТАВ
# ============================================================================

import numpy as np
from scipy import signal, fft, stats
from scipy.ndimage import gaussian_filter1d
import matplotlib.pyplot as plt
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
import warnings

warnings.filterwarnings('ignore')

# ============================================================================
# 3.1 БАЗОВЫЕ КОНСТАНТЫ И КОНФИГУРАЦИЯ
# ============================================================================

@dataclass
class OctaveConfig:
    """Конфигурация для анализа октав"""
    
    # Базовая частота (Гц)
    base_frequency: float = 7.83  # Резонанс Шумана
    
    # Золотое сечение для анализа Буданова
    golden_ratio: float = 1.618
    
    # Диапазон поиска
    octave_range: int = 8  # от 2^1 до 2^8
    budanov_range: int = 8  # от φ^1 до φ^8
    
    # Порог значимости
    significance_threshold: float = 2.0  # sigma
    
    # Размер окна для фильтра
    filter_window: int = 11  # нечётное число для savgol
    
    # Точность поиска резонанса (процент от частоты)
    resonance_tolerance: float = 0.05  # 5%

# ============================================================================
# 3.2 ОСНОВНОЙ КЛАСС: КЭМ-ЯДРО
# ============================================================================

class KEMCore:
    """
    Квантово-Этический Мейнфрейм Ядро v4.0
    
    Математический движок для поиска скрытых гармонических структур
    в спектральных данных (CMB, LIGO, инфракрасное излучение и т.д.)
    """
    
    def __init__(self, config: Optional[OctaveConfig] = None):
        """
        Инициализация КЭМ-ядра
        
        Args:
            config: конфигурация (если None, используются значения по умолчанию)
        """
        self.config = config or OctaveConfig()
        self.octave_frequencies = self._generate_octave_frequencies()
        self.budanov_frequencies = self._generate_budanov_frequencies()
        self.analysis_cache = {}
        
        print(f"✅ КЭМ-ядро v4.0 инициализировано")
        print(f"   Базовая частота: {self.config.base_frequency} Гц")
        print(f"   Золотое сечение: {self.config.golden_ratio}")
        print(f"   Диапазон октав: 1-{self.config.octave_range}")
    
    def _generate_octave_frequencies(self) -> np.ndarray:
        """
        Генерирует октавные частоты: f = f0 × 2^n
        
        Returns:
            np.ndarray: массив октавных частот
        """
        n_values = np.arange(1, self.config.octave_range + 1)
        frequencies = self.config.base_frequency * (2.0 ** n_values)
        return frequencies
    
    def _generate_budanov_frequencies(self) -> np.ndarray:
        """
        Генерирует частоты Буданова: f = f0 × φ^k
        где φ = золотое сечение (1.618)
        
        Returns:
            np.ndarray: массив частот Буданова
        """
        k_values = np.arange(1, self.config.budanov_range + 1)
        frequencies = self.config.base_frequency * (self.config.golden_ratio ** k_values)
        return frequencies
    
    # ========================================================================
    # 3.3 АНАЛИЗ СПЕКТРА: БАЗОВЫЕ ФИЛЬТРЫ
    # ========================================================================
    
    def compute_power_spectrum(self, time_series: np.ndarray, 
                              sampling_rate: float) -> Tuple[np.ndarray, np.ndarray]:
        """
        Вычисляет спектр мощности (Power Spectral Density)
        
        Args:
            time_series: временной ряд
            sampling_rate: частота дискретизации (Гц)
        
        Returns:
            Tuple[frequencies, power]: массивы частот и мощностей
        """
        # FFT
        fft_values = np.fft.fft(time_series)
        power = np.abs(fft_values) ** 2
        frequencies = np.fft.fftfreq(len(time_series), 1/sampling_rate)
        
        # Берём только положительные частоты
        positive_idx = frequencies > 0
        frequencies = frequencies[positive_idx]
        power = power[positive_idx]
        
        # Нормализация
        power = power / np.max(power)
        
        return frequencies, power
    
    def smooth_spectrum(self, frequencies: np.ndarray, 
                       power: np.ndarray) -> np.ndarray:
        """
        Сглаживает спектр (убирает шум)
        Использует фильтр Savitzky-Golay
        
        Args:
            frequencies: массив частот
            power: массив мощностей
        
        Returns:
            np.ndarray: сглаженный спектр
        """
        if len(power) < self.config.filter_window:
            return power
        
        smoothed = signal.savgol_filter(
            power, 
            window_length=self.config.filter_window,
            polyorder=3
        )
        
        return np.maximum(smoothed, 0)  # Не ниже нуля
    
    # ========================================================================
    # 3.4 ОСНОВНОЙ МЕТОД: ПОИСК ОКТАВ
    # ========================================================================
    
    def find_octave_peaks(self, frequencies: np.ndarray, 
                         power: np.ndarray, 
                         smoothed_power: Optional[np.ndarray] = None) -> Dict:
        """
        Ищет пики мощности на октавных частотах
        
        Args:
            frequencies: массив частот
            power: массив мощностей (оригинальный, с шумом)
            smoothed_power: сглаженный спектр (если None, вычисляется автоматически)
        
        Returns:
            Dict: результаты анализа
                {
                    'octaves': {...},  # для каждой октавы
                    'budanov': {...},  # для каждой частоты Буданова
                    'total_significance': float,  # общая значимость
                    'dominant_octave': int,  # номер доминирующей октавы
                    'detection_confidence': float  # уверенность в детекции
                }
        """
        
        if smoothed_power is None:
            smoothed_power = self.smooth_spectrum(frequencies, power)
        
        # Расчёт фонового уровня
        background_level = np.percentile(smoothed_power, 30)
        background_std = np.std(smoothed_power[smoothed_power < background_level])
        
        results = {
            'octaves': {},
            'budanov': {},
            'background_level': background_level,
            'background_std': background_std
        }
        
        # === АНАЛИЗ ОКТАВ ===
        for n, target_freq in enumerate(self.octave_frequencies, start=1):
            peak_data = self._find_peak_at_frequency(
                frequencies, smoothed_power, target_freq
            )
            
            if peak_data['found']:
                # Расчёт значимости в сигма
                excess = peak_data['power'] - background_level
                sigma = excess / background_std if background_std > 0 else 0
                
                results['octaves'][f'octave_{n}'] = {
                    'target_frequency': target_freq,
                    'found_frequency': peak_data['frequency'],
                    'power': peak_data['power'],
                    'significance_sigma': sigma,
                    'frequency_error_percent': 100 * abs(
                        peak_data['frequency'] - target_freq
                    ) / target_freq,
                    'is_significant': sigma >= self.config.significance_threshold
                }
        
        # === АНАЛИЗ БУДАНОВА ===
        for k, target_freq in enumerate(self.budanov_frequencies, start=1):
            peak_data = self._find_peak_at_frequency(
                frequencies, smoothed_power, target_freq
            )
            
            if peak_data['found']:
                excess = peak_data['power'] - background_level
                sigma = excess / background_std if background_std > 0 else 0
                
                results['budanov'][f'budanov_{k}'] = {
                    'target_frequency': target_freq,
                    'found_frequency': peak_data['frequency'],
                    'power': peak_data['power'],
                    'significance_sigma': sigma,
                    'frequency_error_percent': 100 * abs(
                        peak_data['frequency'] - target_freq
                    ) / target_freq,
                    'is_significant': sigma >= self.config.significance_threshold
                }
        
        # === СИНТЕЗ РЕЗУЛЬТАТОВ ===
        
        # Общая значимость (средняя сигма по значимым пикам)
        significant_peaks = [
            v['significance_sigma'] 
            for v in list(results['octaves'].values()) + 
                    list(results['budanov'].values())
            if v['is_significant']
        ]
        
        if significant_peaks:
            results['total_significance'] = np.mean(significant_peaks)
            results['num_significant_peaks'] = len(significant_peaks)
        else:
            results['total_significance'] = 0.0
            results['num_significant_peaks'] = 0
        
        # Доминирующая октава
        octave_significances = {
            int(k.split('_')[1]): v['significance_sigma']
            for k, v in results['octaves'].items()
        }
        
        if octave_significances:
            results['dominant_octave'] = max(
                octave_significances, key=octave_significances.get
            )
        else:
            results['dominant_octave'] = None
        
        # Уверенность в детекции (от 0 до 1)
        detection_confidence = min(1.0, results['total_significance'] / 5.0)
        results['detection_confidence'] = detection_confidence
        
        return results
    
    def _find_peak_at_frequency(self, frequencies: np.ndarray, 
                               power: np.ndarray, 
                               target_freq: float) -> Dict:
        """
        Ищет пик мощности рядом с целевой частотой
        (в пределах допуска resonance_tolerance)
        
        Args:
            frequencies: массив частот
            power: массив мощностей
            target_freq: целевая частота
        
        Returns:
            Dict: информация о найденном пике или пустой dict
        """
        
        tolerance = target_freq * self.config.resonance_tolerance
        mask = (frequencies >= target_freq - tolerance) & \
               (frequencies <= target_freq + tolerance)
        
        if not np.any(mask):
            return {'found': False}
        
        freq_in_range = frequencies[mask]
        power_in_range = power[mask]
        
        peak_idx = np.argmax(power_in_range)
        
        return {
            'found': True,
            'frequency': freq_in_range[peak_idx],
            'power': power_in_range[peak_idx]
        }
    
    # ========================================================================
    # 3.5 РАСШИРЕННЫЙ АНАЛИЗ: НЕЛИНЕЙНОЕ 3D-ВРЕМЯ
    # ========================================================================
    
    def analyze_3d_time_structure(self, frequencies: np.ndarray, 
                                 power: np.ndarray) -> Dict:
        """
        Анализирует структуру мощности как результат 3D-времени
        
        Если время 3-мерное (t1, t2, t3), то спектр содержит частоты,
        которые комбинируют все три оси:
        
        f(n1,n2,n3) = f0 × 2^(n1+n2+n3) или f0 × φ^(n1+n2+n3)
        
        Args:
            frequencies: массив частот
            power: массив мощностей
        
        Returns:
            Dict: результаты анализа 3D-структуры
        """
        
        smoothed = self.smooth_spectrum(frequencies, power)
        
        # Генерируем ожидаемые частоты для всех комбинаций осей
        expected_frequencies_octave = []
        expected_frequencies_budanov = []
        
        # Октавные комбинации: 2^(n1+n2+n3)
        for n_sum in range(1, 3 * self.config.octave_range):
            freq = self.config.base_frequency * (2.0 ** n_sum)
            if freq <= frequencies[-1]:  # в диапазоне данных
                expected_frequencies_octave.append(freq)
        
        # Буданов комбинации: φ^(k1+k2+k3)
        for k_sum in range(1, 3 * self.config.budanov_range):
            freq = self.config.base_frequency * (self.config.golden_ratio ** k_sum)
            if freq <= frequencies[-1]:
                expected_frequencies_budanov.append(freq)
        
        # Ищем пики на всех ожидаемых частотах
        peaks_octave = []
        peaks_budanov = []
        
        for target_freq in expected_frequencies_octave:
            peak = self._find_peak_at_frequency(frequencies, smoothed, target_freq)
            if peak['found']:
                peaks_octave.append({
                    'target': target_freq,
                    'found': peak['frequency'],
                    'power': peak['power']
                })
        
        for target_freq in expected_frequencies_budanov:
            peak = self._find_peak_at_frequency(frequencies, smoothed, target_freq)
            if peak['found']:
                peaks_budanov.append({
                    'target': target_freq,
                    'found': peak['frequency'],
                    'power': peak['power']
                })
        
        return {
            'octave_peaks': peaks_octave,
            'budanov_peaks': peaks_budanov,
            'num_octave_peaks': len(peaks_octave),
            'num_budanov_peaks': len(peaks_budanov),
            'total_structure_power': sum(p['power'] for p in peaks_octave + peaks_budanov)
        }
    
    # ========================================================================
    # 3.6 СТАТИСТИЧЕСКАЯ ПРОВЕРКА: PERMUTATION TEST
    # ========================================================================
    
    def permutation_test_significance(self, frequencies: np.ndarray, 
                                    power: np.ndarray, 
                                    num_permutations: int = 1000) -> Dict:
        """
        Проверяет значимость найденных октав методом перестановок
        (permutation test)
        
        Нулевая гипотеза: пики в спектре случайны
        Альтернативная гипотеза: пики на октавных частотах значимы
        
        Args:
            frequencies: массив частот
            power: массив мощностей
            num_permutations: количество перестановок
        
        Returns:
            Dict: p-значения и оценки значимости
        """
        
        # Реальный анализ
        real_analysis = self.find_octave_peaks(frequencies, power)
        real_significance = real_analysis['total_significance']
        
        # Permutation test: перемешиваем мощность
        significance_null = []
        
        for _ in range(num_permutations):
            # Циклический сдвиг
            shift = np.random.randint(0, len(power))
            shuffled_power = np.roll(power, shift)
            
            # Анализ перемешанных данных
            null_analysis = self.find_octave_peaks(frequencies, shuffled_power)
            significance_null.append(null_analysis['total_significance'])
        
        significance_null = np.array(significance_null)
        
        # p-значение
        p_value = np.sum(significance_null >= real_significance) / num_permutations
        
        return {
            'real_significance': real_significance,
            'null_mean': np.mean(significance_null),
            'null_std': np.std(significance_null),
            'p_value': p_value,
            'is_significant_p05': p_value < 0.05,
            'is_significant_p01': p_value < 0.01,
            'null_distribution': significance_null
        }
    
    # ========================================================================
    # 3.7 ВИЗУАЛИЗАЦИЯ
    # ========================================================================
    
    def plot_spectrum_with_octaves(self, frequencies: np.ndarray, 
                                  power: np.ndarray,
                                  title: str = "Spectrum Analysis",
                                  save_path: Optional[str] = None):
        """
        Визуализирует спектр с отмеченными октавами и частотами Буданова
        
        Args:
            frequencies: массив частот
            power: массив мощностей
            title: заголовок графика
            save_path: путь для сохранения (если None, не сохраняется)
        """
        
        fig, axes = plt.subplots(2, 1, figsize=(14, 10))
        
        # === График 1: Спектр с октавами ===
        ax = axes[0]
        
        smoothed = self.smooth_spectrum(frequencies, power)
        ax.semilogy(frequencies, smoothed, 'b-', alpha=0.7, label='Power Spectrum')
        
        # Отметить октавные частоты
        for n, freq in enumerate(self.octave_frequencies, start=1):
            if freq <= frequencies[-1]:
                ax.axvline(freq, color='red', linestyle='--', alpha=0.3, linewidth=1)
                ax.text(freq, np.max(smoothed) * 0.5, f'2^{n}', 
                       rotation=90, fontsize=8, color='red')
        
        ax.set_xlabel('Frequency (Hz)')
        ax.set_ylabel('Power (log scale)')
        ax.set_title(f'{title} - Octave Frequencies')
        ax.grid(True, alpha=0.3)
        ax.legend()
        
        # === График 2: Спектр с частотами Буданова ===
        ax = axes[1]
        
        ax.semilogy(frequencies, smoothed, 'b-', alpha=0.7, label='Power Spectrum')
        
        # Отметить частоты Буданова
        for k, freq in enumerate(self.budanov_frequencies, start=1):
            if freq <= frequencies[-1]:
                ax.axvline(freq, color='green', linestyle='--', alpha=0.3, linewidth=1)
                ax.text(freq, np.max(smoothed) * 0.3, f'φ^{k}', 
                       rotation=90, fontsize=8, color='green')
        
        ax.set_xlabel('Frequency (Hz)')
        ax.set_ylabel('Power (log scale)')
        ax.set_title(f'{title} - Budanov Frequencies')
        ax.grid(True, alpha=0.3)
        ax.legend()
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=150)
            print(f"✅ График сохранён: {save_path}")
        
        plt.show()


# ============================================================================
# 3.8 ПРИМЕР ИСПОЛЬЗОВАНИЯ
# ============================================================================

def example_usage():
    """Пример использования КЭМ-ядра"""
    
    print("\n" + "="*70)
    print("ПРИМЕР: Анализ синтетического спектра")
    print("="*70)
    
    # Генерируем синтетический сигнал с октавными пиками
    sampling_rate = 1000  # Гц
    duration = 10  # секунд
    t = np.linspace(0, duration, sampling_rate * duration)
    
    # Синтетический сигнал с октавными частотами
    base_freq = 7.83
    octave_1 = base_freq * 2  # 15.66 Гц
    octave_2 = base_freq * 4  # 31.32 Гц
    octave_3 = base_freq * 8  # 62.64 Гц
    
    signal_data = (
        0.5 * np.sin(2 * np.pi * octave_1 * t) +
        0.3 * np.sin(2 * np.pi * octave_2 * t) +
        0.2 * np.sin(2 * np.pi * octave_3 * t) +
        0.5 * np.random.randn(len(t))  # Шум
    )
    
    # Инициализация КЭМ-ядра
    config = OctaveConfig(
        base_frequency=7.83,
        octave_range=8,
        significance_threshold=2.0
    )
    kem = KEMCore(config)
    
    # Анализ
    frequencies, power = kem.compute_power_spectrum(signal_data, sampling_rate)
    octave_analysis = kem.find_octave_peaks(frequencies, power)
    
    print("\n📊 РЕЗУЛЬТАТЫ АНАЛИЗА ОКТАВ:")
    print(f"Обнаружено значимых пиков: {octave_analysis['num_significant_peaks']}")
    print(f"Общая значимость: {octave_analysis['total_significance']:.2f}σ")
    print(f"Доминирующая октава: {octave_analysis['dominant_octave']}")
    print(f"Уверенность детекции: {octave_analysis['detection_confidence']:.1%}")
    
    # Permutation test
    perm_results = kem.permutation_test_significance(frequencies, power, num_permutations=100)
    print(f"\n📈 PERMUTATION TEST:")
    print(f"P-значение: {perm_results['p_value']:.4f}")
    print(f"Значимо на уровне 0.05: {perm_results['is_significant_p05']}")
    
    # 3D-время анализ
    structure_3d = kem.analyze_3d_time_structure(frequencies, power)
    print(f"\n🌌 АНАЛИЗ 3D-ВРЕМЕНИ:")
    print(f"Найдено октавных пиков: {structure_3d['num_octave_peaks']}")
    print(f"Найдено пиков Буданова: {structure_3d['num_budanov_peaks']}")
    
    # Визуализация
    kem.plot_spectrum_with_octaves(
        frequencies, power,
        title="Synthetic Data with Octave Peaks"
    )


if __name__ == "__main__":
    example_usage()
```

---

## 4. КАК ЭТО ИСПОЛЬЗУЕТСЯ В OCTAVE COSMOLOGY

### Фаза 3 (CMB анализ):
```python
# Загружаем данные CMB
frequencies, power = load_planck_data()

# Инициализируем КЭМ-ядро
kem = KEMCore(OctaveConfig(
    base_frequency=7.83,
    octave_range=8,
    significance_threshold=3.0  # Более строгий критерий для научной работы
))

# Анализируем
results = kem.find_octave_peaks(frequencies, power)

# Проверяем значимость
perm_test = kem.permutation_test_significance(frequencies, power, num_permutations=1000)

# Результат: если p < 0.05 → сигнал значим
```

### Фаза 4 (LIGO анализ):
```python
# То же самое, но для гравитационных волн
frequencies, power = load_ligo_psd()
results = kem.find_octave_peaks(frequencies, power)
```

### Фаза 5 (SDSS анализ):
```python
# Трансформируем редшифты в "частотный" спектр
z_spectrum = transform_redshift_to_frequency(sdss_data)
results = kem.find_octave_peaks(frequencies, z_spectrum)
```

---

## 5. ОБНОВЛЕННЫЙ КАЛЕНДАРЬ

### НЕДЕЛЯ 0: Подготовка + КЭМ-тест

**Пятница, 16 января (Добавлено)**
- 🎯 **Задача:** "КЭМ-ядро первый тест"
- 📝 **Действие:** Запустить example_usage() из КЭМ-ядра на синтетических данных
- ⏱ **Время:** 30 мин.
- ✅ **Результат:** Убедиться, что модуль работает

### НЕДЕЛЯ 2: Первая кровь (CMB) + КЭМ-интеграция

**Вторник, 27 января (Изменено)**
- 🎯 **Задача:** "Запуск CMB анализа с КЭМ-ядром"
- 📝 **Действие:** Вместо простого поиска пиков используем КЭМ-ядро для анализа 3D-времени
- ⏱ **Время:** 1 час
- ✅ **Результат:** Результаты с учетом нелинейного времени

**Среда, 28 января (Изменено)**
- 🎯 **Задача:** "Permutation test для CMB"
- 📝 **Действие:** Запустить статистическую проверку значимости
- ⏱ **Время:** 30 мин.
- ✅ **Результат:** p-значение (значим или нет)

---

**Это не сложнее, но теперь ты используешь рабочий движок, а не методом тыка ищешь пики.** 🎯

## Связи

- [[kem-4x-architecture-readme]]
- [[KEM_4x_Data_Contracts_Draft_0_1]]
- [[kem-human-interface-layer-fragment]]
- [[KEM-4x-theory-and-model]]
- [[kem-quantum-retrocausality]]
- [[kem-qem-eu-one-pager-ru]]
