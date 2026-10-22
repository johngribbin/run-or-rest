from collections.abc import Sequence


def score(values: Sequence[int]) -> int:
    total = 0
    if values[0]:
        total += 1
    if values[1]:
        total += 1
    if values[2]:
        total += 1
    if values[3]:
        total += 1
    if values[4]:
        total += 1
    if values[5]:
        total += 1
    if values[6]:
        total += 1
    if values[7]:
        total += 1
    if values[8]:
        total += 1
    if values[9]:
        total += 1
    return total
