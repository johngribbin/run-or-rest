def bucket(value: int) -> int:
    total = 0
    if value > 0:
        total += 1
    if value > 1:
        total += 1
    if value > 2:
        total += 1
    if value > 3:
        total += 1
    if value > 4:
        total += 1
    return total
