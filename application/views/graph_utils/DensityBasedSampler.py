# --coding:utf-8 --
import numpy as np
from sklearn.neighbors import BallTree
import math
from .knn_g import Knn


class DensityBasedSampler(object):
    """
    exact density biased sampling:
    under-sample dense regions and over sample light regions.

    Ref: Palmer et al., Density Biased Sampling: An Improved Method for Data Mining and Clustering ,SIGMOD 2000
    """
    random_state = 42
    n_samples = -1
    N = -1
    tree = "None"
    estimated_density = "None"
    prob = "None"
    alpha = 1

    def __init__(self, n_samples, annFileName="none.ann", alpha=1, beta=1, random_state=None, use_pca=False,
                 pca_dim=50):
        self.n_samples = n_samples
        self.random_state = random_state
        self.alpha = alpha
        self.beta = beta
        assert beta >= 0, 'beta should be non-negative'
        self.use_pca = use_pca
        self.pca_dim = pca_dim
        self.annFileName = annFileName

    def fit_sample(self, data: np.ndarray, label=None, return_others=True, selection=None, mixed_degree = None, skip_points = None):
        if type(data) == list:
            data = np.array(data)

        if self.use_pca:
            data = data - np.mean(data, axis=0)
            cov_x = np.dot(np.transpose(data), data)
            [eig_val, eig_vec] = np.linalg.eig(cov_x)

            # sorting the eigen-values in the descending order
            eig_vec = eig_vec[:, eig_val.argsort()[::-1]]
            initial_dims = self.pca_dim
            if initial_dims > len(eig_vec):
                initial_dims = len(eig_vec)

            # truncating the eigen-vectors matrix to keep the most important vectors
            eig_vec = np.real(eig_vec[:, :initial_dims])
            data = np.dot(data, eig_vec)

        self.N = len(data)
        if self.N <= self.n_samples:
            return [True] * self.N
        # np.random.seed(42)
        selection = self._fit_sample(data, label=label, selection=selection, mixed_degree = mixed_degree, skip_points = skip_points)
        if return_others:
            return selection, self.estimated_density, self.prob
        else:
            return selection

    def _fit_sample(self, data: np.ndarray, label=None, selection=None, mixed_degree = None, skip_points = None):
        if selection is not None and selection.sum() >= self.n_samples:
            return selection
        # self.tree = BallTree(data, leaf_size=2)
        knn = 50

        # guang 8-30
        X = np.array(data.tolist(), dtype=np.float64)
        N, D = X.shape
        if knn + 1 > N:
            knn = int((N - 1) / 2)
        # dist, neighbor = self.tree.query(X, k=knn + 1, return_distance=True)
        neighbor, dist = Knn(X, N, D, knn + 1, 1, 1, int(N))
        # ==================== shouxing 9-15
        if mixed_degree is None:
            mixed_degree = np.zeros(N, )
            if label is not None:
                for i in range(N):
                    mixed_degree[i] = (((label[neighbor][i] - label[i]) != 0).sum()) / (knn + 1)

        # r = math.sqrt(np.mean(dist[:, -1]))    # 之前的距离没有开方，所以密度采样的计算有误
        # print("r = %f"%(r))

        # # old knn
        # # dist, _ = self.tree.query(data, k=knn + 1, return_distance=True)
        # r = np.mean(dist[:, -1])

        # # guang 9/5
        # r = np.mean(self._kDist(data, knn + 1))

        # guang 9-6
        self.radius_of_k_neighbor = dist[:, -1]
        for i in range(len(self.radius_of_k_neighbor)):
            self.radius_of_k_neighbor[i] = math.sqrt(self.radius_of_k_neighbor[i])
        maxD = np.max(self.radius_of_k_neighbor)
        minD = np.min(self.radius_of_k_neighbor)
        for i in range(len(self.radius_of_k_neighbor)):
            self.radius_of_k_neighbor[i] = (self.radius_of_k_neighbor[i] - minD) * 1.0 / (maxD - minD)
        # for i in range(len(self.estimated_density)):
        #     self.estimated_density[i] = self.estimated_density[i]  #采样概率与r成正比
        self.prob = np.ones_like(self.radius_of_k_neighbor) * 0.001
        self.prob = self.radius_of_k_neighbor + self.beta * mixed_degree  # 采样概率与r和类标混杂度成正比
        if skip_points is not None:
            self.prob[skip_points] = 0
        ## old estimated_de-nsity
        # self.estimated_density = self.tree.query_radius(data, r=r, count_only=True)
        # if self.alpha > 0:
        #     self.prob = 1 / ((self.estimated_density + 1) ** self.alpha)
        # else:
        #     self.prob = (self.estimated_density + 1) ** abs(self.alpha)

        self.prob = self.prob / self.prob.sum()
        if selection is None:
            selection = np.zeros(self.N, dtype=bool)
        selected_index = np.random.choice(self.N, self.n_samples, replace=False, p=self.prob)
        return selected_index
