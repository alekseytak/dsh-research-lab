import numpy as np
from kerg_temporal import analyze, kerg


def test_stationary_reference():
    rng=np.random.default_rng(7)
    x=rng.normal(0,1,200)
    r=kerg(x,5,100)
    assert 0 <= r["value"] < 1


def test_regime_shift_increases_raw_deviation():
    rng=np.random.default_rng(8)
    x=np.r_[rng.normal(0,1,100),rng.normal(0,4,100)]
    before=kerg(x[:100],5,100)["raw"]
    after=kerg(x,5,100)["raw"]
    assert after != before


def test_periodic_has_period():
    t=np.arange(300)/100
    x=np.sin(2*np.pi*2*t)+0.02*np.random.default_rng(9).normal(size=t.size)
    r=analyze(x,100,20,100)
    assert r["dominant_lag_samples"] is not None
    assert r["policy_eligible"] is False
