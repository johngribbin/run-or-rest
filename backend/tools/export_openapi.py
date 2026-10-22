import json
import sys
from collections.abc import Sequence
from pathlib import Path

from run_or_rest.api.app import create_app


def main(argv: Sequence[str]) -> int:
    [output] = argv
    document = json.dumps(create_app().openapi(), indent=2, sort_keys=True)
    path = Path(output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(document + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
