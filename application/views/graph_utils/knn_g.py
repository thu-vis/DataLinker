import sys
import os
import cffi
import threading
import numpy as np
import time
from ..utils.config_utils import config


class FuncThread(threading.Thread):
    def __init__(self, target, *args):
        threading.Thread.__init__(self)
        self._target = target
        self._args = args

    def run(self):
        return self._target(*self._args)


def Knn(X1, N, D, n_neighbors, forest_size, subdivide_variance_size, leaf_number):
    ffi = cffi.FFI()
    ffi.cdef(
        """void knn(double* X, int N, int D, int n_neighbors, int* neighbors_nn, double* distances_nn, int forest_size,
    		int subdivide_variance_size, int leaf_number);
         """)
    import os
    try:
        t1 = time.time()
        dllPath = os.path.join(config.lib_root, 'knnDll.dll')
        C = ffi.dlopen(dllPath)
        cffi_X1 = ffi.cast('double*', X1.ctypes.data)
        neighbors_nn = np.zeros((N, n_neighbors), dtype=np.int32)
        distances_nn = np.zeros((N, n_neighbors), dtype=np.float64)
        cffi_neighbors_nn = ffi.cast('int*', neighbors_nn.ctypes.data)
        cffi_distances_nn = ffi.cast('double*', distances_nn.ctypes.data)
        t = FuncThread(C.knn, cffi_X1, N, D, n_neighbors, cffi_neighbors_nn, cffi_distances_nn, forest_size, subdivide_variance_size, leaf_number)
        t.daemon = True
        t.start()
        while t.is_alive():
            t.join(timeout=1.0)
            sys.stdout.flush()
        print("knn runtime = %f"%(time.time() - t1))
        return neighbors_nn, distances_nn
    except Exception as ex:
        print(ex)
    return [[], []]



