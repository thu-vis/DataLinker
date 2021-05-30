import sys
import os
import cffi
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import BallTree
import time
# added by Liu
import numpy.linalg
from .knn_g import Knn, FuncThread
import random
from ..utils.config_utils import config


def normalize(X):
    return StandardScaler(copy=True).fit_transform(X)

def reverse_indexing(a: np.ndarray):
    b = np.zeros_like(a)
    for i, e in enumerate(a):
        b[e] = i
    return b

class BlueNoiseSamplerBallTreeSingleClass2(object):
    """
    desired sample number
    """
    random_state = 42
    r = -1
    n_samples = 0
    tree = None
    tol = 0.15
    # shrinkage = 0.5
    learning_rate = 0.05 # 0.2 is reduced to 0.05 by Liu
    curr_iteration = 0

    def __init__(self, n_samples, random_state=42):
        self.n_samples = n_samples
        self.random_state = random_state
        self.curr_iteration = 0

    def _estimate_radius(self, X: np.ndarray):
        sample = np.random.choice(np.arange(len(X)), self.n_samples)
        sub_X = X[sample]
        tree = BallTree(sub_X)
        dist, ind = tree.query(sub_X, 2, return_distance=True)
        return np.mean(dist[:, 1])

    def fit_sample(self, X: np.ndarray, return_indices=False):
        self.r = self._estimate_radius(X)
        print("initial diameter: {}".format(self.r))
        # X = normalize(X)
        selection = np.zeros(shape=(len(X)))
        self.tree = BallTree(X, leaf_size=2)

        self.curr_iteration = 0
        if self.n_samples < len(X):

            # main loop
            while True:
                sampled_X, selection_cand = self._fit_sample(X, selection, return_indices=True)
                if len(sampled_X) == self.n_samples:
                    print(self.r)
                    selection = selection_cand
                    break
                selection = selection_cand
                self.r /= 2
                self.curr_iteration += 1
        else:
            sampled_X = X
            selection = np.ones(shape=(len(X)))
        if return_indices:
            return sampled_X, selection == 1
        else:
            return sampled_X

    def iteration_used(self):
        return self.curr_iteration

    def _fit_sample(self, X: np.ndarray, selection: np.ndarray, return_indices=False):
        start = time.time()
        selection = np.copy(selection)
        selection[selection != 1] = 0
        index_array = np.argsort(selection)[::-1]
        reverse_index_array = reverse_indexing(index_array)
        sorted_selection = selection[index_array]
        sampled_count = (selection == 1).sum()
        """
        add by guang
        """
        emX = list(enumerate(X[index_array]))
        FailTimes = 100

        Candidateset = []
        for i in emX:
            i = i[0]
            if sorted_selection[i] == 0:
                Candidateset.append(i)

        failTimes = 0
        while True:
            randomC = random.choice(Candidateset)
            i =  randomC
            row = emX[i][1]
            if sorted_selection[i] != 0:
                continue
            ind = self.tree.query_radius([row], r=self.r)
            ind = ind[0].astype(int)
            ind = reverse_index_array[ind]
            if 1 in sorted_selection[ind[ind < i]]:
                failTimes += 1
                if failTimes > FailTimes:
                    break
                sorted_selection[i] = -1
                continue
            sorted_selection[ind[ind > i]] = -1
            sorted_selection[i] = 1
            sampled_count += 1
            failTimes = 0
            if sampled_count == self.n_samples:
                break
        selection = sorted_selection[reverse_index_array]
        sampled_X = X[selection == 1]
        print('sampled', len(X), len(sampled_X), 'in', time.time() - start, 's.')
        if return_indices:
            return sampled_X, selection
        else:
            return sampled_X
    # added by Liu
    def _check_valid(self, X: np.ndarray, selection_cand: np.ndarray):
        status = True
        msg = "Valid Poisson Disks"
        for index, is_select in enumerate(selection_cand):
            if is_select == 1:
                ind = self.tree.query_radius([X[index]], r=self.r)
                ind = ind[0].astype(int)
                for hit_idx in ind:
                    if hit_idx != index and selection_cand[hit_idx] == 1:
                        status = False
                        msg = "Invalid Poisson Disk Found, ({},{})  distance: {}, smaller than r: {}".format(index, hit_idx,numpy.linalg.norm(X[index,:]-X[hit_idx,:]),self.r)
                        return status, msg
        return status, msg

class BlueNoiseSampC:
    random_state = 42
    r = -1
    n_samples = 0

    def __init__(self, n_samples, random_state=42):
        self.n_samples = n_samples
        self.random_state = random_state

    def _estimate_radius(self, X: np.ndarray):
        sample = np.random.choice(np.arange(len(X)), self.n_samples)
        sub_X = X[sample]
        tree = BallTree(sub_X)
        dist, ind = tree.query(sub_X, 2, return_distance=True)
        return np.mean(dist[:, -1])

    def fit_sample(self, X: np.ndarray, normalization=False, return_indices=False, label=None, label_error_ratio=False):
        if normalization:
            X = normalize(X)
        self.r = self._estimate_radius(X)
        print("the r = %f" % (self.r))
        sel = self._fit_sample_(X, label, label_error_ratio)
        ret = np.array(X[sel], copy=True)

        if return_indices:
            return ret, sel
        return ret

    def _fit_sample_(self,  X: np.ndarray, label, label_error_ratio):
        X = np.array(X.tolist(), dtype=np.float64)
        ffi = cffi.FFI()
        ffi.cdef(
            """void blueNoiseSamp(double * hdData, int dataNumber, int dataDimension, int nSample, double oriR, int label_error_ratio, int * label, int * selections);
            """)
        try:
            import os
            dllpath = os.path.join(config.lib_root,'blueNoiseSam_9-20.dll')
            C = ffi.dlopen(dllpath)
            cffi_X1 = ffi.cast('double*', X.ctypes.data)
            N,D = X.shape
            selections = np.zeros(N, dtype=np.int32)
            cffi_selections = ffi.cast('int*', selections.ctypes.data)
            cffi_label_error_ratio = 0
            cffi_label = ffi.NULL
            if label_error_ratio and label is not None:
                cffi_label_error_ratio = 1
                cffi_label = ffi.cast('int*', np.array(label, dtype=np.int32).ctypes.data)
            t = FuncThread(C.blueNoiseSamp, cffi_X1, N, D, self.n_samples, self.r, cffi_label_error_ratio, cffi_label, cffi_selections)
            t.daemon = True
            t.start()
            while t.is_alive():
                t.join(timeout=1.0)
                sys.stdout.flush()
            return selections == 1
        except Exception as ex:
            print(ex)

class BlueNoiseSamp_cyCodeBase:
    n_samples = 0
    def __init__(self, n_samples):
        self.n_samples = n_samples

    def fit_sample(self, X: np.ndarray, return_indices=False):
        sel = self._fit_sample_(X)
        ret = []
        for i in range(len(sel)):
            if sel[i] == 1:
                ret.append(X[i])
        if return_indices:
            return ret, sel
        return ret

    def _fit_sample_(self,  X: np.ndarray):
        X = np.array(X.tolist(), dtype=np.float64)
        ffi = cffi.FFI()
        ffi.cdef(
            """void blueNoiseSamp(double * hdData, int dataNumber, int nSample, int *selections);  
            """)
        try:
            N,D = X.shape
            if D not in [2, 32, 512, 784, 1000, 4096]:
                raise Exception(" The dll file corresponding to the dimension of the data was not found. ")
            dllName = os.path.join(config.lib_root, "cyCodeBase_dll_%d.dll"%(D))
            C = ffi.dlopen(dllName)
            cffi_X1 = ffi.cast('double*', X.ctypes.data)
            selections = np.zeros(N, dtype=np.int32)
            cffi_selections = ffi.cast('int*', selections.ctypes.data)
            t = FuncThread(C.blueNoiseSamp, cffi_X1,  N,self.n_samples , cffi_selections)   ##data dimension must = 4096
            t.daemon = True
            t.start()
            while t.is_alive():
                t.join(timeout=1.0)
                sys.stdout.flush()
            return selections != 0
        except Exception as ex:
            print(ex)