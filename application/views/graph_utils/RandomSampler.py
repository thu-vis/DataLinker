import numpy as np


def random_sample(x, num, p):
    n = x.shape[0]
    # np.random.seed(345)
    perm = np.random.choice(n, num, replace=False, p=p)
    selection = perm[:num]
    result = [False] * n
    for i in selection:
        result[i] = True
    return result, perm