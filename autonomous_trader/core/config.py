import os, yaml, re
from typing import Any, Dict

_env_var = re.compile(r"\$\{([A-Z0-9_]+)\}")

def _interpolate_env(d: Any) -> Any:
    if isinstance(d, dict):
        return {k: _interpolate_env(v) for k, v in d.items()}
    if isinstance(d, list):
        return [_interpolate_env(x) for x in d]
    if isinstance(d, str):
        m = _env_var.search(d)
        if m:
            return d.replace(m.group(0), os.getenv(m.group(1), ""))
    return d

def load_config(path: str) -> Dict[str, Any]:
    with open(path, "r") as f:
        cfg = yaml.safe_load(f)
    return _interpolate_env(cfg)