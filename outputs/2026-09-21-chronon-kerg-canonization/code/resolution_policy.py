"""Парный evidence-контракт Kerg; формула сохранена, policy не реализуется здесь."""
import numpy as np


def estimate_kerg(local, reference, *, relative_frozen_floor=.01,
                  numeric_zero_floor=1e-12, instrument_resolution_floor=None):
    result = dict(value=None, raw=None, status='INVALID_INPUT', reason='NON_FINITE_INPUT',
                  localDispersion=None, referenceDispersion=None,
                  localResolutionFloor=None, referenceResolutionFloor=None,
                  valueMeaning='NOT_MEASURED', confidence=0, neutralPrior=None,
                  formulaVersion='temporal-variance-ratio.v1',
                  resolutionProfile='kerg.resolution-policy.v1',
                  thresholdsCalibration='UNCALIBRATED_UI_ONLY',
                  instrumentResolutionFloor=instrument_resolution_floor,
                  resolutionSource=None)
    try:
        rel, zero = float(relative_frozen_floor), float(numeric_zero_floor)
        device = None if instrument_resolution_floor is None else float(instrument_resolution_floor)
        if any(not np.isfinite(v) or v < 0 for v in (rel, zero)) or (
                device is not None and (not np.isfinite(device) or device < 0)):
            raise ValueError('invalid floor')
    except (TypeError, ValueError, OverflowError):
        return {**result, 'reason': 'INVALID_RESOLUTION_PROFILE'}
    try:
        a, b = np.asarray(local, dtype=float), np.asarray(reference, dtype=float)
    except (TypeError, ValueError, OverflowError):
        return result
    if a.ndim != 1 or b.ndim != 1 or not np.isfinite(a).all() or not np.isfinite(b).all():
        return result
    if min(a.size, b.size) < 2:
        return {**result, 'status': 'INSUFFICIENT_SAMPLES', 'reason': 'WINDOW_TOO_SHORT'}
    with np.errstate(over='ignore', invalid='ignore', divide='ignore'):
        sa, sb = float(np.std(a, ddof=1)), float(np.std(b, ddof=1))
        pair = np.concatenate((a, b))
        center = np.median(pair)
        mad = float(np.median(np.abs(pair-center)))
        q1, q3 = np.percentile(pair, [25, 75])
        scale = max(mad, float((q3-q1)/1.349))
    if not all(np.isfinite(v) for v in (sa, sb, scale)):
        return {**result, 'status': 'UNAVAILABLE', 'reason': 'NON_FINITE_RESULT'}
    floors = [(zero, 'NUMERIC_ZERO_GUARD'), (rel*scale, 'RELATIVE_PROTOCOL')]
    if device is not None:
        floors.append((device, 'DEVICE_CALIBRATION'))
    floor, source = max(floors, key=lambda item: item[0])
    if not np.isfinite(floor):
        return {**result, 'status': 'UNAVAILABLE', 'reason': 'NON_FINITE_RESULT'}
    result.update(localDispersion=sa, referenceDispersion=sb,
                  localResolutionFloor=floor, referenceResolutionFloor=floor,
                  resolutionSource=source)
    frozen_local, frozen_ref = sa <= floor, sb <= floor
    if frozen_local and frozen_ref:
        return {**result, 'status': 'FIXED_POINT_HOLD', 'reason': 'BOTH_WINDOWS_BELOW_RESOLUTION',
                'neutralPrior': .5, 'valueMeaning': 'NEUTRAL_PRIOR'}
    if frozen_ref:
        return {**result, 'status': 'REFERENCE_BELOW_RESOLUTION',
                'reason': 'REFERENCE_WINDOW_BELOW_RESOLUTION'}
    if frozen_local:
        return {**result, 'status': 'UNAVAILABLE', 'reason': 'LOCAL_WINDOW_BELOW_RESOLUTION'}
    with np.errstate(over='ignore', invalid='ignore', divide='ignore'):
        vl, vr = np.var(a, ddof=1), np.var(b, ddof=1)
        raw = abs(vl/(vr+1e-12)-1.)
        value = raw/(1.+raw)
    if not all(np.isfinite(v) for v in (vl, vr, raw, value)):
        return {**result, 'status': 'UNAVAILABLE', 'reason': 'NON_FINITE_RESULT'}
    return {**result, 'status': 'AVAILABLE', 'reason': 'OK', 'raw': float(raw),
            'value': float(value), 'valueMeaning': 'MEASURED', 'confidence': None}
