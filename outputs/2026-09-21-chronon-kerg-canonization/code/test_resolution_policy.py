"""Контракт разрешимости: написан до реализации, отдельный от legacy тестов."""
import numpy as np
import pytest
import kerg_temporal as kt


def estimate(local, reference, **kwargs):
    fn = getattr(kt, 'estimate_kerg', None)
    assert callable(fn), 'парный оценщик разрешимости ещё не реализован'
    return fn(local, reference, **kwargs)


def test_live_reference_frozen_local_is_unavailable():
    r = estimate(np.ones(64)*7, np.linspace(0, 1, 64))
    assert (r['status'], r['reason'], r['value']) == (
        'UNAVAILABLE', 'LOCAL_WINDOW_BELOW_RESOLUTION', None)
    assert r['confidence'] == 0
    assert r['valueMeaning'] == 'NOT_MEASURED'


def test_both_frozen_is_fixed_point_hold_not_measured_kerg():
    r = estimate(np.ones(64)*7, np.ones(64)*2)
    assert r['status'] == 'FIXED_POINT_HOLD'
    assert r['reason'] == 'BOTH_WINDOWS_BELOW_RESOLUTION'
    assert r['value'] is None
    assert r['neutralPrior'] == 0.5
    assert r['valueMeaning'] == 'NEUTRAL_PRIOR'


def test_live_local_frozen_reference():
    r = estimate(np.linspace(0, 1, 64), np.ones(64)*7)
    assert r['status'] == 'REFERENCE_BELOW_RESOLUTION'
    assert r['reason'] == 'REFERENCE_WINDOW_BELOW_RESOLUTION'
    assert r['value'] is None


@pytest.mark.parametrize('scale', [1., 1e-3, 1e3, 1e-5])
def test_freeze_verdict_is_scale_invariant(scale):
    x = np.tile([0., .02, -.01, .03, -.02, .01], 12)*scale
    r = estimate(x, x)
    assert r['status'] == 'AVAILABLE'
    assert r['reason'] == 'OK'
    assert r['valueMeaning'] == 'MEASURED'
    assert r['confidence'] is None  # confidence не калиброван


@pytest.mark.parametrize('scale', [1., 1e-3, 1e3])
def test_constant_window_remains_below_resolution_across_scale(scale):
    x = np.ones(64)*4*scale
    assert estimate(x, x)['status'] == 'FIXED_POINT_HOLD'


def test_offset_does_not_create_false_freeze():
    x = np.tile([0., 1., 0., -1.], 32)
    a, b = estimate(x, x), estimate(x+1000, x+1000)
    assert a['status'] == b['status'] == 'AVAILABLE'
    assert a['localResolutionFloor'] == pytest.approx(b['localResolutionFloor'])


def test_instrument_floor_is_explicit_not_global_hidden_constant():
    x = np.tile([0., .02, -.01, .03, -.02, .01], 12)
    assert estimate(x, x)['status'] == 'AVAILABLE'
    r = estimate(x, x, instrument_resolution_floor=.03)
    assert r['resolutionSource'] == 'DEVICE_CALIBRATION'
    assert r['status'] == 'FIXED_POINT_HOLD'
    assert r['localResolutionFloor'] == .03


@pytest.mark.parametrize('x', [[float('nan')]*8, [float('inf')]*8, ['bad']*8])
def test_invalid_input_has_no_value(x):
    r = estimate(x, np.arange(8.))
    assert r['status'] == 'INVALID_INPUT'
    assert r['value'] is None


def test_samples_too_short():
    r = estimate([1.], np.arange(8.))
    assert (r['status'], r['reason'], r['value']) == (
        'INSUFFICIENT_SAMPLES', 'WINDOW_TOO_SHORT', None)


def test_formula_is_not_changed():
    local = np.array([0., 1., 3., 7., 9.])
    ref = np.linspace(-1, 1, 100)
    raw = abs(np.var(local, ddof=1)/(np.var(ref, ddof=1)+1e-12)-1)
    r = estimate(local, ref)
    assert r['value'] == pytest.approx(raw/(1+raw))
    assert r['formulaVersion'] == 'temporal-variance-ratio.v1'


def test_analyze_does_not_leak_local_frozen_scalar():
    x = list(np.tile([1., 2., 3., 4., 5.], 20)) + [9.]*5
    r = kt.analyze(x, 1., 5, 100)
    assert r['kerg'] is None
    assert r['status_reason'] == 'LOCAL_WINDOW_BELOW_RESOLUTION'
    assert r['kerg_estimate']['status'] == 'UNAVAILABLE'


def test_analyze_tiny_live_signal_is_not_fixed_point():
    x = 1e-5*np.sin(2*np.pi*np.arange(200)/4)
    r = kt.analyze(x, 1.)
    assert r['transition_type'] != 'FIXED_POINT_HOLD'
    assert r['kerg_estimate']['status'] == 'AVAILABLE'


def test_analyze_both_frozen_has_prior_separate_from_value():
    r = kt.analyze([7.]*150, 1.)
    assert r['kerg'] is None
    assert r['kerg_estimate']['neutralPrior'] == .5


@pytest.mark.parametrize('floor', [-1., float('nan'), float('inf')])
def test_invalid_floor_is_named_refusal(floor):
    r = estimate(np.arange(8.), np.arange(8.), relative_frozen_floor=floor)
    assert r['status'] == 'INVALID_INPUT'
    assert r['reason'] == 'INVALID_RESOLUTION_PROFILE'


def test_sparse_local_motion_is_not_hidden_by_mad_zero():
    x = np.zeros(100)
    x[-2:] = [1., -1.]
    assert estimate(x[-5:], x)['status'] == 'AVAILABLE'


def test_resolution_guard_boundary():
    x = np.tile([1e-14, -1e-14], 32)
    assert estimate(x, x)['status'] == 'FIXED_POINT_HOLD'
    assert estimate(x, x, numeric_zero_floor=0)['status'] == 'AVAILABLE'


def test_analyze_invalid_and_short_have_explicit_estimate():
    assert kt.analyze([float('nan')]*150, 1.)['kerg_estimate']['status'] == 'INVALID_INPUT'
    assert kt.analyze([1., 2.], 1.)['kerg_estimate']['status'] == 'INSUFFICIENT_SAMPLES'


def test_nested_live_local_frozen_reference_is_reachable_with_device_floor():
    x = np.zeros(100)
    x[-5:] = [0., 1., -1., 1., -1.]
    r = estimate(x[-5:], x, instrument_resolution_floor=.3)
    assert r['status'] == 'REFERENCE_BELOW_RESOLUTION'
    assert r['localDispersion'] > .3 > r['referenceDispersion']


def test_legacy_absolute_floor_requires_explicit_migration():
    r = kt.analyze(np.arange(150.), 1., frozen_std_floor=.1)
    assert r['status_reason'] == 'LEGACY_ABSOLUTE_FLOOR_REQUIRES_MIGRATION'
    assert r['kerg'] is None


def test_conflicting_prior_is_never_attached_to_available():
    r = estimate(np.arange(64.), np.arange(64.))
    assert r['neutralPrior'] is None
    assert 0 <= r['value'] < 1


def test_overflow_is_not_measured():
    r = estimate(np.linspace(-1e160, 1e160, 64), np.arange(64.))
    assert r['value'] is None
    assert r['reason'] == 'NON_FINITE_RESULT'


def test_numeric_guard_source_is_explicit():
    r = estimate(np.zeros(64), np.zeros(64))
    assert r['resolutionSource'] == 'NUMERIC_ZERO_GUARD'


def test_instrument_floor_metadata_not_falsely_claimed_when_relative_dominates():
    x = np.linspace(-1000, 1000, 64)
    r = estimate(x, x, instrument_resolution_floor=1e-9)
    assert r['resolutionSource'] == 'RELATIVE_PROTOCOL'
    assert r['instrumentResolutionFloor'] == 1e-9


def test_window_shape_is_checked():
    assert estimate([[1., 2.], [3., 4.]], np.arange(8.))['status'] == 'INVALID_INPUT'


def test_does_not_mutate_raw_input():
    x = np.linspace(-1, 1, 64)
    before = x.copy()
    estimate(x, x)
    np.testing.assert_array_equal(x, before)


def test_live_reference_degenerate_local_helper_does_not_set_policy():
    r = kt.analyze(np.arange(150.), 1.)
    assert r['policy_eligible'] is False
    assert r['clinical_eligible'] is False
    assert r['intervention_eligible'] is False
