"""Изолированные planted mutants, рабочий исходник не меняется."""
from pathlib import Path
import tempfile
import subprocess
import sys
import json

root = Path(__file__).parent
source = (root/'resolution_policy.py').read_text()
mutations = {
    'leak_local_scalar': ("if frozen_local:\n", "if False and frozen_local:\n"),
    'leak_neutral_prior': ("'neutralPrior': .5, 'valueMeaning'", "'value': .5, 'neutralPrior': .5, 'valueMeaning'"),
    'hidden_absolute_floor': ("floor, source = max(floors, key=lambda item: item[0])", "floor, source = 1e-4, 'HIDDEN_ABSOLUTE'"),
    'offset_sensitive_scale': ("scale = max(mad,", "scale = max(float(np.median(np.abs(pair))), mad,"),
    'ignore_device': ("if device is not None:\n        floors.append", "if False and device is not None:\n        floors.append"),
    'reference_status_wrong': ("'status': 'REFERENCE_BELOW_RESOLUTION'", "'status': 'AVAILABLE'"),
}
report=[]
for name, (old, new) in mutations.items():
    assert source.count(old) == 1, (name, 'mutation anchor not unique')
    with tempfile.TemporaryDirectory() as folder:
        p=Path(folder)
        for filename in ('kerg_temporal.py', 'test_resolution_policy.py'):
            (p/filename).write_text((root/filename).read_text())
        (p/'resolution_policy.py').write_text(source.replace(old,new))
        proc=subprocess.run([sys.executable,'-m','pytest','test_resolution_policy.py','-q'],
                            cwd=p, capture_output=True,text=True)
        output=proc.stdout+proc.stderr
        killed=proc.returncode == 1 and ' failed' in output and 'ERROR collecting' not in output
        report.append(dict(mutant=name, applied=True, exitCode=proc.returncode,
                           killedByAssertion=killed, summary=output.strip().splitlines()[-1]))
print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(0 if all(r['killedByAssertion'] for r in report) else 1)
