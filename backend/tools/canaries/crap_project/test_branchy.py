from branchy import bucket


def test_zero_takes_no_branch() -> None:
    assert bucket(0) == 0
