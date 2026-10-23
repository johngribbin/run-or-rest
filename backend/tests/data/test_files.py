from datetime import UTC, datetime
from pathlib import Path

from run_or_rest.data.files import read_difficulty_epochs
from tests.data.support import data_paths


def test_difficulty_epochs_carry_start_and_height_in_order(tmp_path: Path) -> None:
    epochs = read_difficulty_epochs(data_paths(tmp_path).difficulty_epochs)

    assert [(epoch.start, epoch.height) for epoch in epochs] == [
        (datetime(2026, 5, 29, 10, 29, 46, tzinfo=UTC), 951552),
        (datetime(2026, 6, 1, 5, 15, tzinfo=UTC), 953568),
    ]
