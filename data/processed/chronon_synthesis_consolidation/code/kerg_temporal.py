"""K_erg temporal-regime metric. Simulation/offline research only."""
from __future__ import annotations
import numpy as np


def kerg(values, local_window=5, reference_window=100, epsilon=1e-12):
    x = np.asarray(values, dtype=float)
    if local_window < 2 or reference_window <= local_window or x.size < reference_window:
        return {"status": "INSUFFICIENT_DATA", "raw": None, "value": None}
    local = x[-local_window:]
    reference = x[-reference_window:]
    v_local = float(np.var(local, ddof=1))
    v_ref = float(np.var(reference, ddof=1))
    raw = abs(v_local / (v_ref + epsilon) - 1.0)
    return {"status": "OK", "raw": raw, "value": raw / (1.0 + raw), "v_local": v_local, "v_ref": v_ref}


def temporal_coherence(values, max_lag=5):
    x = np.asarray(values, dtype=float)
    if x.size < max_lag + 3 or np.std(x) == 0:
        return None
    y = x - x.mean()
    ac = [np.corrcoef(y[:-lag], y[lag:])[0, 1] for lag in range(1, max_lag + 1)]
    return float(np.clip(np.nanmean(ac), 0.0, 1.0))


def recurrence(values, epsilon=None, min_lag=2, max_lag=None):
    x = np.asarray(values, dtype=float)
    n = x.size
    if n < min_lag + 3:
        return {"score": None, "dominant_lag": None}
    if epsilon is None:
        epsilon = max(np.std(x) * 0.25, 1e-12)
    max_lag = max_lag or n // 2
    matches = []
    for lag in range(min_lag, min(max_lag, n - 1) + 1):
        score = float(np.mean(np.abs(x[lag:] - x[:-lag]) <= epsilon))
        matches.append((lag, score))
    lag, peak = max(matches, key=lambda z: z[1])
    return {"score": peak, "dominant_lag": lag, "epsilon": float(epsilon)}


def classify(kerg_value, coherence, recurrence_score, dominant_lag,
             low=0.33, high=0.66, coherence_high=0.70, coherence_low=0.40,
             recurrence_high=0.70, recurrence_low=0.30):
    if any(v is None for v in (kerg_value, coherence, recurrence_score, dominant_lag)):
        return "INSUFFICIENT_DATA"
    if kerg_value < low:
        return "REFERENCE_COMPATIBLE"
    if coherence >= coherence_high and recurrence_score >= recurrence_high:
        return "FIXED_POINT_HOLD" if dominant_lag == 1 else "PERIODIC_LOOP"
    if kerg_value >= high and coherence < coherence_low and recurrence_score < recurrence_low:
        return "CHAOTIC_DISPERSION"
    return "TRANSIENT_REGIME_SHIFT"


def analyze(values, sampling_rate_hz, local_window=5, reference_window=100):
    kr = kerg(values, local_window, reference_window)
    if kr["status"] != "OK":
        return {"definition_id":"kem.temporal-regime-deviation.kerg.v1", "status":"UNAVAILABLE", "transition_type":"INSUFFICIENT_DATA", "policy_eligible":False}
    coh = temporal_coherence(values[-reference_window:])
    rec = recurrence(values[-reference_window:])
    kind = classify(kr["value"], coh, rec["score"], rec["dominant_lag"])
    return {
        "definition_id":"kem.temporal-regime-deviation.kerg.v1",
        "status":"SIMULATED",
        "source_signal":"declared_scalar_series",
        "sampling_rate_hz":float(sampling_rate_hz),
        "kerg_raw":kr["raw"], "kerg":kr["value"],
        "temporal_coherence":coh, "recurrence_score":rec["score"],
        "dominant_lag_samples":rec["dominant_lag"],
        "dominant_period_seconds":rec["dominant_lag"] / sampling_rate_hz,
        "transition_type":kind,
        "policy_eligible":False, "clinical_eligible":False, "intervention_eligible":False
    }
