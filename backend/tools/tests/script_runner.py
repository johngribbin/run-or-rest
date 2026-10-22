import runpy
import sys
from pathlib import Path

import pytest

TOOLS_DIR = Path(__file__).resolve().parent.parent


def run_tool_script(name: str, *args: str) -> int:
    script = TOOLS_DIR / f"{name}.py"
    argv = sys.argv
    sys.argv = [str(script), *args]
    try:
        with pytest.raises(SystemExit) as exited:
            runpy.run_path(str(script), run_name="__main__")
    finally:
        sys.argv = argv
    return int(str(exited.value.code))
