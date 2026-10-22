from partial import sign


def test_positive_is_non_negative() -> None:
    assert sign(1) == "non-negative"
