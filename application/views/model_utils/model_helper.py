import numpy as np
import os
from scipy import sparse
from scipy.sparse import csgraph, csr_matrix
from scipy.sparse import linalg as splinalg
from scipy.stats import entropy
from scipy.stats import linregress
from time import time, sleep
from tqdm import tqdm
import warnings

from scipy.optimize import minimize
from scipy.stats import entropy
from scipy.sparse import csr_matrix, coo_matrix
from sklearn.utils.extmath import safe_sparse_dot
from sklearn.utils.extmath import safe_sparse_dot
from sklearn.exceptions import ConvergenceWarning
from sklearn.metrics.pairwise import euclidean_distances, paired_distances

from ..utils.log_utils import logger
import concurrent.futures
from ..utils.helper_utils import *

from numba import jit, float64, int32


#@autojit
def _sparse_mult4(a, b, cd, cr, cc):
    N = cd.size
    data = np.empty_like(cd)
    for i in range(N):
        num = 0.0
        for j in range(a.shape[1]):
            num += a[cr[i], j] * b[j, cc[i]]
        data[i] = cd[i]*num
    return data


_fast_sparse_mult4 = \
    jit(float64[:,:](float64[:,:],float64[:,:],float64[:],int32[:],int32[:]))(_sparse_mult4)


def sparse_numba(a,b,c):
    """Multiply sparse matrix `c` by np.dot(a,b) using Numba's jit."""
    assert c.shape == (a.shape[0],b.shape[1])
    data = _fast_sparse_mult4(a,b,c.data,c.row,c.col)
    return coo_matrix((data,(c.row,c.col)),shape=(a.shape[0],b.shape[1]))

def multi_processing_cost(W, graph_matrix, label_distributions_, gt, regularization_weight, alpha, y_static):
        tmp = graph_matrix.copy()
        W[W <= 0] = 1e-20
        tmp.data = tmp.data * W
        # W must be non-zero
        P = safe_sparse_dot(tmp, label_distributions_)
        P = np.multiply(alpha, P) + y_static
        cost_1 = entropy(P.T+1e-20).sum()
        cost_2 = regularization_weight * ((P-gt)**2).sum()
        cost = cost_1 + cost_2
        # print("total_cost: {},\tcost_1: {},\tcost_2: {}".format(cost, cost_1, cost_2))
        # cost = entropy(P.T+1e-20).sum() # for DEBUG
        # cost = 0.1 * ((P-gt)**2).sum() # for DEBUG
        # cost = P.sum() # for DEBUG
        # print("cost", cost)
        return cost


def build_laplacian_graph(affinity_matrix):
    instance_num = affinity_matrix.shape[0]
    laplacian = csgraph.laplacian(affinity_matrix, normed=True)
    laplacian = -laplacian
    if sparse.isspmatrix(laplacian):
        diag_mask = (laplacian.row == laplacian.col)
        laplacian.data[diag_mask] = 0.0
    else:
        laplacian.flat[::instance_num + 1] = 0.0  # set diag to 0.0
    return laplacian


def propagation(graph_matrix, affinity_matrix, train_y, alpha=0.2, max_iter=15,
                tol=1e-12, process_record=False, normalized=False, k=6):
    t0 = time()
    y = np.array(train_y)
    # label construction
    # construct a categorical distribution for classification only
    classes = np.unique(y)
    classes = (classes[classes != -1])
    process_data = None

    D = affinity_matrix.sum(axis=0).getA1() - affinity_matrix.diagonal()
    D = np.sqrt(D)
    D[D == 0] = 1
    affinity_matrix.setdiag(0)

    n_samples, n_classes = len(y), len(classes)

    if (alpha is None or alpha <= 0.0 or alpha >= 1.0):
        raise ValueError('alpha=%s is invalid: it must be inside '
                         'the open interval (0, 1)' % alpha)
    y = np.asarray(y)
    unlabeled = y == -1
    labeled = (y > -1)

    # initialize distributions
    label_distributions_ = np.zeros((n_samples, n_classes))
    for label in classes:
        label_distributions_[y == label, classes == label] = 1

    y_static_labeled = np.copy(label_distributions_)
    y_static = y_static_labeled * (1 - alpha)

    l_previous = np.zeros((n_samples, n_classes))

    unlabeled = unlabeled[:, np.newaxis]
    if sparse.isspmatrix(graph_matrix):
        graph_matrix = graph_matrix.tocsr()

    all_loss = []
    all_entropy = []

    if process_record:
        label = label_distributions_.copy()
        if normalized:
            normalizer = np.sum(label, axis=1)[:, np.newaxis]
            normalizer = normalizer + 1e-20
            label /= normalizer
        process_data = [label]
        ent = entropy(label.T + 1e-20)
        all_entropy.append(ent.sum())

    n_iter_ = 1
    # print("graph_matrix.shape:", graph_matrix.shape)
    # print("label_distributions_.shape:", label_distributions_.shape)
    for _ in range(max_iter):
        if not (n_iter_ > 6 and k <= 3): # for case
            if np.abs(label_distributions_ - l_previous).sum() < tol:
                break
        # else:
        #     if n_iter_ > 10:
        #         break

        l_previous = label_distributions_.copy()
        label_distributions_a = safe_sparse_dot(
            graph_matrix, label_distributions_)

        if not (n_iter_ > 6 and k <= 3): # for case
            label_distributions_ = np.multiply(
                alpha, label_distributions_a) + y_static
        n_iter_ += 1
        if process_record:
            label = label_distributions_.copy()
            if normalized:
                normalizer = np.sum(label, axis=1)[:, np.newaxis]
                normalizer = normalizer + 1e-20
                label /= normalizer
            process_data.append(label)
            ent = entropy(label.T + 1e-20)
            all_entropy.append(ent.sum())

        # record loss
        t = ((l_previous / D[:, np.newaxis]) ** 2).sum(axis=1)
        loss = safe_sparse_dot(affinity_matrix.sum(axis=1).T, t) * 0.5 + \
               safe_sparse_dot(affinity_matrix.sum(axis=0), t) * 0.5 - \
               np.dot(l_previous.reshape(-1),
                      label_distributions_a.reshape(-1))
        # loss[0, 0]: read the only-one value in a numpy.matrix variable
        loss = loss[0, 0] + alpha / (1 - alpha) * paired_distances(label_distributions_[labeled],
                                                                   y_static_labeled[labeled]).sum()
        all_loss.append(loss)

    else:
        warnings.warn(
            'max_iter=%d was reached without convergence.' % max_iter,
            category=ConvergenceWarning
        )
        # n_iter_ += 1

    unnorm_dist = label_distributions_.copy()

    if normalized:
        normalizer = np.sum(label_distributions_, axis=1)[:, np.newaxis]
        normalizer = normalizer + 1e-20
        label_distributions_ /= normalizer

    all_loss.append(all_loss[-1])
    all_loss = np.array(all_loss)
    all_entropy = np.array(all_entropy)
    assert np.isnan(all_entropy).sum() == 0
    assert np.isinf(all_entropy).sum() == 0

    if process_data is not None:
        process_data = np.array(process_data)

        labels = process_data.argmax(axis=2)
        max_process_data = process_data.max(axis=2)
        labels[max_process_data == 0] = -1

        # remove unnecessary iterations
        assert n_iter_ == len(process_data), "{}, {}".format(n_iter_, len(process_data))
        new_iter_num = n_iter_ - 1
        if not (n_iter_ > 6 and k <= 3): # for case
            for new_iter_num in range(n_iter_ - 1, 0, -1):
                if sum(labels[new_iter_num - 1] != labels[n_iter_- 1]) != 0:
                    break

        process_data[new_iter_num] = process_data[n_iter_ - 1]
        process_data = process_data[:new_iter_num + 1]
        all_loss[new_iter_num] = all_loss[n_iter_ - 1]
        all_loss = all_loss[:new_iter_num + 1]
        all_entropy[new_iter_num] = all_entropy[n_iter_ - 1]
        all_entropy = all_entropy[:new_iter_num + 1]

    # print("propagation time:", time() - t0)

    return label_distributions_, all_loss, all_entropy, process_data, unnorm_dist


def exact_influence(F, affinity_matrix, laplacian_matrix, alpha, train_y):
    t0 = time()
    influence_matrix = affinity_matrix.copy() * 0
    instance_num = affinity_matrix.shape[0]
    all_edge_cnt = affinity_matrix.data.shape[0]
    logger.info("all edge cnt:{}".format(all_edge_cnt))
    max_appro_cnt = 1000
    appro_cnt = 0
    for i in tqdm(range(instance_num)):
        start = affinity_matrix.indptr[i]
        end = affinity_matrix.indptr[i + 1]
        j_in_this_row = affinity_matrix.indices[start:end]
        for idx, j in enumerate(j_in_this_row):
            if i == j:
                continue
            if max_appro_cnt == appro_cnt:
                break
            appro_cnt+=1
            left_one_aff = affinity_matrix.copy()
            left_one_aff.data[start:end][idx] = 0
            left_one_lap = build_laplacian_graph(left_one_aff)
            left_one_F, left_one_L, _, _, _ = propagation(left_one_lap,
                                                          left_one_aff,
                                                          train_y,
                                                          alpha=alpha,
                                                          normalized=False)
            left_one_dis = ((left_one_F[i] - F[i]) ** 2).sum() / (F[i, :] ** 2).sum()
            influence_matrix[i, j] = left_one_dis
        if max_appro_cnt == appro_cnt:
            break
    time_cost = time() - t0
    logger.info("time cost is {}".format(time_cost))
    logger.info("appro time cost is {}".format(time_cost*all_edge_cnt/max_appro_cnt))
    return influence_matrix


def approximated_influence(F, affinity_matrix, laplacian_matrix, alpha, train_y, n_iters):
    t0 = time()
    logger.info("begin calculating approximated influence. n_iters: {}".format(n_iters))
    logger.info("begin calculating inverse matrix")
    # inv_K = splinalg.inv(sparse.identity(affinity_matrix.shape[0])
    #                      - alpha * laplacian_matrix)
    alpha_lap = alpha * laplacian_matrix
    inv_K = sparse.identity(affinity_matrix.shape[0])
    for n_iter in range(n_iters):
        inv_K = safe_sparse_dot(inv_K, alpha_lap) + sparse.identity(affinity_matrix.shape[0])
    logger.info("got inverse matrix")
    tmp = affinity_matrix.copy()
    D = tmp.sum(axis=0).getA1() - tmp.diagonal()
    D = np.sqrt(D)
    D[D == 0] = 1
    influence_matrix = affinity_matrix.copy() * 0
    instance_num = affinity_matrix.shape[0]
    for i in tqdm(range(instance_num)):
        start = affinity_matrix.indptr[i]
        end = affinity_matrix.indptr[i + 1]
        j_in_this_row = affinity_matrix.indices[start:end]
        for idx, j in enumerate(j_in_this_row):
            if i == j:
                continue
            appro_dis = alpha * alpha * (1 - alpha) * (1 - alpha)
            appro_dis = appro_dis / D[i] / D[i] / D[j] / D[j] * (inv_K[i, i] ** 2)
            appro_dis = appro_dis * (F[j, :] ** 2).sum() / (F[i, :] ** 2).sum()
            influence_matrix[i, j] = appro_dis
    time_cost = time() - t0
    logger.info("time cost is {}".format(time_cost))
    return influence_matrix

# def _calculate_edge_incluence(local_i_idx, j, local_F, local_graph, local_alpha_lap, alpha, local_D, n_iters, local_influence_matrix, neighbors):
#             t0 = time()
#             class_cnt = local_F.shape[1]
#             # for i in selected_ids:
#             start = local_graph.indptr[local_i_idx]
#             end = local_graph.indptr[local_i_idx + 1]
#
#             local_N = local_graph.shape[0]
#             param = alpha / np.sqrt(local_D[local_i_idx] * local_D[j])
#                 # init F0
#             F0_data = param * (local_F[j].copy())
#             F0_indices = np.arange(0, class_cnt)
#             F0_indptr = np.array([0] * (local_i_idx + 1) + [class_cnt] * (local_N - local_i_idx))
#             F0 = csr_matrix((F0_data, F0_indices, F0_indptr), shape=(local_N, class_cnt), dtype=float)
#             deltaF = F0.copy()
#             matrix_time = time()-t0
#             t0 = time()
#             for n_iter in range(n_iters):
#                     deltaF = safe_sparse_dot(local_alpha_lap, deltaF) + F0
#             appro_dis = (deltaF[local_i_idx, :].toarray() ** 2).sum() / (local_F[local_i_idx, :] ** 2).sum()
#             appro_dis = 1e-15 if appro_dis < 1e-15 else appro_dis
#             sparse_dot_time = time()-t0
#             # influence_matrix[i_idx, neighbors[j]] = appro_dis
#             return appro_dis, matrix_time, sparse_dot_time

def approximated_influence_local(F, affinity_matrix, laplacian_matrix, alpha, train_y, n_iters, selected_ids, k_neighbors, dataname = ""):
    t0 = time()
    logger.info("begin calculating approximated influence. n_iters: {}".format(n_iters))
    logger.info("begin calculating inverse matrix")
    # inv_K = splinalg.inv(sparse.identity(affinity_matrix.shape[0])
    #                      - alpha * laplacian_matrix)

    tmp = affinity_matrix
    D = tmp.sum(axis=0).getA1() - tmp.diagonal()
    D[D == 0] = 1
    select_cnt = len(selected_ids)
    N = affinity_matrix.shape[0]
    class_cnt = F.shape[1]
    influence_matrix = affinity_matrix.copy() * 0
    i_idx = 0
    alpha_lap = alpha * laplacian_matrix
    alpha_lap = alpha_lap.tocsr()
    def calculate_influence_matrix(arg):
        i, i_idx = arg
        neighbors = list(k_neighbors[i])
    # for i in selected_ids:
        local_graph = affinity_matrix[neighbors, :][:, neighbors]
        local_i_idx = neighbors.index(i)
        start = local_graph.indptr[local_i_idx]
        end = local_graph.indptr[local_i_idx + 1]
        j_in_this_row = local_graph.indices[start:end]

        local_D = D[neighbors]
        local_F = F[neighbors, :]
        local_N = local_graph.shape[0]
        local_alpha_lap = alpha_lap[neighbors, :][:, neighbors]
        for idx, j in enumerate(j_in_this_row):
            if local_i_idx == j:
                continue
            param = alpha / np.sqrt(local_D[local_i_idx] * local_D[j])
            # init F0
            F0_data = param*(local_F[j].copy())
            F0_indices = np.arange(0, class_cnt)
            F0_indptr = np.array([0]*(local_i_idx+1) + [class_cnt]*(local_N-local_i_idx))
            F0 = csr_matrix((F0_data, F0_indices, F0_indptr), shape= (local_N, class_cnt), dtype=float)
            deltaF = F0.copy()
            for n_iter in range(n_iters):
                deltaF = safe_sparse_dot(local_alpha_lap, deltaF) + F0
            appro_dis = (deltaF[local_i_idx, :].toarray() ** 2).sum() / (local_F[local_i_idx, :] ** 2).sum()
            appro_dis = 1e-15 if appro_dis<1e-15 else appro_dis
            # appro_dis = alpha * alpha * (1 - alpha) * (1 - alpha)
            # appro_dis = appro_dis / D[i] / D[i] / D[j] / D[j] * inv_K[i, i]
            # appro_dis = appro_dis * (F[j, :] ** 2).sum() / (F[i, :] ** 2).sum()
            influence_matrix[i_idx, neighbors[j]] = appro_dis
        # influence_matrix[i_idx, i_idx] = 1e-15

        # i_idx += 1
    idxs = list(range(select_cnt))
    # pool = ThreadPool(processes=28)
    # pool.map(calculate_influence_matrix, zip(selected_ids, idxs))
    # pool.close()
    # pool.join()
    # with concurrent.futures.ThreadPoolExecutor(max_workers=28) as executor:
    #     all_future = [executor.submit(calculate_influence_matrix, arg) for arg in zip(selected_ids, idxs)]
    #     print(all_future)
    #     # concurrent.futures.wait(all_future)
    #     concurrent.futures.wait(all_future)
    # executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
    # all_future = [executor.submit(calculate_influence_matrix, arg) for arg in zip(selected_ids, idxs)]
    # print(all_future)
    # concurrent.futures.wait(all_future)
    for arg in zip(selected_ids, idxs):
        calculate_influence_matrix(arg)
    # with Pool(processes=10) as pool:
    #     res = [pool.apply_async(calculate_influence_matrix, arg) for arg in zip(selected_ids, idxs)]
    #     for r in res:
    #         r.get()
    # influence_matrix = csr_matrix(influence_matrix)

    influence_matrix.data = influence_matrix.data.clip(0, 1)
    time_cost = time() - t0
    logger.info("time cost is {}".format(time_cost))
    return influence_matrix

def _calculate_edge_incluence(i, j, F, affinity_matrix, alpha_lap, alpha, D, n_iters, local_influence_matrix):
        # if local_influence_matrix[i, j] != 0:
        #     return local_influence_matrix[i, j]

        N = affinity_matrix.shape[0]
        class_cnt = F.shape[1]
        param = alpha / np.sqrt(D[i] * D[j])
        # init F0

        F0_data = param * (F[j].copy())

        F0_indices = np.arange(0, class_cnt)
        F0_indptr = np.zeros((N + 1))
        F0_indptr[i + 1:] = class_cnt
        t0 = time()
        F0 = csr_matrix((F0_data, F0_indices, F0_indptr), shape=(N, class_cnt), dtype=float)
        matrix_time = time() - t0
        t0 = time()
        deltaF = F0
        for n_iter in range(n_iters):
            deltaF = safe_sparse_dot(alpha_lap, deltaF) + F0
            # deltaF = alpha_lap.dot(deltaF) + F0
        appro_dis = (deltaF[i, :].toarray() ** 2).sum() / (F[i, :] ** 2).sum()
        sparse_dot_time = time() - t0
        local_influence_matrix[i, j] = appro_dis
        # print(i, j, calculate_time)
        return appro_dis, matrix_time, sparse_dot_time

def calculate_influence_matrix_local(args):
    t0 = time()
    all_matrix_time = 0
    all_sparse_time = 0
    edge_cnt = 0
    graphs, selected_ids, start_idx, end_idx, propagation_path_from, propagation_path_to, F, affinity_matrix, alpha_lap, alpha, D, n_iters, local_influence_matrix, k_neighbors, flags = args
    # print(start_idx, end_idx, selected_ids[start_idx:end_idx])
    indptr = local_influence_matrix.indptr
    data = local_influence_matrix.data
    indices = local_influence_matrix.indices
    for to_id in selected_ids[start_idx:end_idx]:
        neighbors = list(k_neighbors[to_id])
        local_graph = affinity_matrix[neighbors, :][:, neighbors]
        local_i_idx = neighbors.index(to_id)
        start = local_graph.indptr[local_i_idx]
        end = local_graph.indptr[local_i_idx + 1]
        j_in_this_row = local_graph.indices[start:end]

        local_D = D[neighbors]
        local_F = F[neighbors, :]
        local_alpha_lap = alpha_lap[neighbors, :][:, neighbors]
        for j_idx, from_idx in enumerate(j_in_this_row):
            from_id = neighbors[from_idx]
            if flags[to_id, from_id] == 0:
                appro_dis, matrix_time, sparse_dot_time = _calculate_edge_incluence(local_i_idx, from_idx, local_F, local_graph, local_alpha_lap, alpha, local_D,
                                                                                    n_iters, local_influence_matrix, neighbors)
                idx = indices[indptr[to_id]: indptr[to_id+1]].tolist().index(from_id)
                data[indptr[to_id]+idx] = appro_dis
                # flags[to_id, from_id] = 1
                all_matrix_time += matrix_time
                all_sparse_time += sparse_dot_time
            # square(alpha_lap, deltaF, F0)
            edge_cnt+=1
    # for from_id in selected_ids[start_idx:end_idx]:
    #     for to_id in propagation_path_to[from_id]:
    #         if flags[to_id, from_id] == 0:
    #             neighbors = list(k_neighbors[to_id])
    #             local_graph = affinity_matrix[neighbors, :][:, neighbors]
    #             local_i_idx = neighbors.index(to_id)
    #             start = local_graph.indptr[local_i_idx]
    #             end = local_graph.indptr[local_i_idx + 1]
    #             j_in_this_row = local_graph.indices[start:end]
    #
    #             local_D = D[neighbors]
    #             local_F = F[neighbors, :]
    #             local_alpha_lap = alpha_lap[neighbors, :][:, neighbors]
    #             from_idx = neighbors.index(from_id)
    #             appro_dis, matrix_time, sparse_dot_time = _calculate_edge_incluence(local_i_idx, from_idx, local_F,
    #                                                                                 local_graph, local_alpha_lap, alpha,
    #                                                                                 local_D,
    #                                                                                 n_iters, local_influence_matrix,
    #                                                                                 neighbors)
    #             local_influence_matrix[to_id, from_id] = appro_dis
    #             flags[to_id, from_id] = 1
    #             all_matrix_time += matrix_time
    #             all_sparse_time += sparse_dot_time
            # square(alpha_lap, deltaF, F0)
            edge_cnt += 1
        # i_idx += 1
    calculate_time = time()-t0
    print("calculate time:{}".format(calculate_time))
    print(start_idx, end_idx, time()-t0, all_matrix_time, all_sparse_time, edge_cnt)


def weight_selection(graph_matrix, origin_graph, label_distributions_, alpha, y_static, ent, label):
    gt = safe_sparse_dot(graph_matrix, label_distributions_)
    gt = np.multiply(alpha, gt) + y_static

    regularization_weight = 1e11 * 0.5

    ind = ent > np.log(label.shape[1]) * 0.04
    ind[ent > (np.log(label.shape[1]) - 0.001)] = False

    graph_matrix.eliminate_zeros()
    graph_matrix[:, ind] = graph_matrix[:, ind] * 0

    W0 = graph_matrix.data > 0
    W0 = np.array(W0).astype(float)
    bounds = [(0,1) for i in range(len(W0))]

    def cost_function(W):
        return multi_processing_cost(W, graph_matrix, label_distributions_, gt, regularization_weight, alpha, y_static)

    def cost_der(W):
        t0 = time()
        coo = graph_matrix.tocoo()
        tmp = graph_matrix.copy()
        tmp.data = tmp.data * W
        P = safe_sparse_dot(tmp, label_distributions_)
        P = np.multiply(alpha, P) + y_static + 1e-20
        normalizer = np.sum(P, axis=1)[:, np.newaxis]
        normalizer = normalizer + 1e-20
        norm_P = P / normalizer + 1e-20
        log_P = np.log(norm_P)
        P_sum = (P.sum(axis=1) + 1e-20)
        G11 = (norm_P * log_P).sum(axis=1) / P_sum

        G11 = G11[np.newaxis, :].repeat(axis=0, repeats=label_distributions_.shape[1])
        G11 = G11.T
        G = sparse_numba(G11 - log_P / P_sum[:, np.newaxis] + regularization_weight * (P-gt), label_distributions_.T, coo)
        final_G = G.tocsr().data * alpha

        return final_G

    res = minimize(cost_function, W0, method="L-BFGS-B", jac=cost_der, bounds=bounds,
                   options={'disp': False}, tol=1e-3).x

    W = res
    graph_matrix.data = (W > 0.5).astype(int)

    # postprocess for case where some instances are not propagated to
    num_point_to = graph_matrix.sum(axis=1).reshape(-1)
    num_point_to = np.array(num_point_to).reshape(-1)
    ids = np.array(range(len(num_point_to)))[num_point_to==0]
    for id in ids:
        point_to_idxs = origin_graph[:,id].nonzero()[0]
        dists = label_distributions_[point_to_idxs, :]
        labels = dists.argmax(axis=1)
        bins = np.bincount(labels)
        max_labels = bins.argmax()
        point_to_idxs = point_to_idxs[labels==max_labels]
        for p in point_to_idxs:
            graph_matrix[id, p] = 1
        a = 1

    removed_num = len(W0) - graph_matrix.data.sum()
    # print("removed_num:", removed_num)
    return graph_matrix


def uncertainty_selection(ent, label, modified_matrix,
                          label_distributions_, alpha, y_static, train_y,
                          build_laplacian_graph, origin_graph, neighbors, model):
    graph_matrix = build_laplacian_graph(modified_matrix)
    P = safe_sparse_dot(graph_matrix, label_distributions_)
    P = np.multiply(alpha, P) + y_static
    pre_ent = entropy(P.T + 1e-20)

    ind = ent > np.log(label.shape[1]) * 0.1
    if model.dataname.lower() == "oct":
        ind = ent > np.log(label.shape[1]) * 0.5
    # if model.dataname.lower() == "stl" and model.step == 2:
    #     ind = ent > np.log(label.shape[1]) * 1
    ind[ent > (np.log(label.shape[1]) - 0.001)] = False

    modified_matrix[:, ind] = modified_matrix[:, ind] * 0

    graph_matrix = build_laplacian_graph(modified_matrix)
    P = safe_sparse_dot(graph_matrix, label_distributions_)
    P = np.multiply(alpha, P) + y_static
    next_ent = entropy(P.T + 1e-20)

    # postprocess for case where some instances are not propagated to
    # num_point_to = modified_matrix.sum(axis=1).reshape(-1)
    # num_point_to = np.array(num_point_to).reshape(-1)
    # ids = np.array(range(len(num_point_to)))[num_point_to == 0]
    # for id in ids:
    #     point_to_idxs = origin_graph[:, id].nonzero()[0]
    #     dists = label_distributions_[point_to_idxs, :]
    #     labels = dists.argmax(axis=1)
    #     bins = np.bincount(labels)
    #     max_labels = bins.argmax()
    #     point_to_idxs = point_to_idxs[labels == max_labels]
    #     for p in point_to_idxs:
    #         modified_matrix[id, p] = 1
    #     a = 1
    modified_matrix = correct_unconnected_nodes(modified_matrix, train_y, neighbors)

    print("removed_num: {}, ent1: {}, ent2: {}, ent_gain: {}"
            .format(ind.sum(), pre_ent.sum(), next_ent.sum(), pre_ent.sum() - next_ent.sum()))
    return modified_matrix

def new_propagation(affinity_matrix, train_y, alpha, neighbors, model, max_iter=15):
    y = np.array(train_y)
    # label construction
    # construct a categorical distribution for classification only
    classes = np.unique(y)
    classes = (classes[classes != -1])

    affinity_matrix.setdiag(1)

    modified_matrix = affinity_matrix.copy()
    graph_matrix = build_laplacian_graph(modified_matrix)

    n_samples, n_classes = len(y), len(classes)

    if (alpha is None or alpha <= 0.0 or alpha >= 1.0):
        raise ValueError('alpha=%s is invalid: it must be inside '
                         'the open interval (0, 1)' % alpha)
    y = np.asarray(y)

    # initialize distributions
    label_distributions_ = np.zeros((n_samples, n_classes))
    for label in classes:
        label_distributions_[y == label, classes == label] = 1

    all_loss = []
    all_entropy = []
    # record process data
    label = label_distributions_.copy()
    normalizer = np.sum(label, axis=1)[:, np.newaxis]
    normalizer = normalizer + 1e-20
    label /= normalizer
    process_data = [label]
    ent = entropy(label.T + 1e-20)
    all_entropy.append(ent.sum())


    y_static_labeled = np.copy(label_distributions_)
    y_static = y_static_labeled * (1 - alpha)

    if sparse.isspmatrix(graph_matrix):
        graph_matrix = graph_matrix.tocsr()

    n_iter_ = 1
    for _ in range(max_iter):
        label_distributions_a = safe_sparse_dot(
            graph_matrix, label_distributions_)

        label_distributions_ = np.multiply(
            alpha, label_distributions_a) + y_static

        n_iter_ += 1

        # calculate entropy
        label = label_distributions_.copy()
        normalizer = np.sum(label, axis=1)[:, np.newaxis]
        normalizer = normalizer + 1e-20
        label /= normalizer
        ent = entropy(label.T + 1e-20)

        process_data.append(label)
        all_entropy.append(ent.sum())

        modified_matrix = uncertainty_selection(ent, label, modified_matrix,
                                                label_distributions_, alpha, y_static, train_y,
                                                build_laplacian_graph, affinity_matrix, neighbors, model)
        # modified_matrix = weight_selection(graph_matrix.tocsr(), affinity_matrix, label_distributions_, alpha, y_static, ent, label)

        graph_matrix = build_laplacian_graph(modified_matrix)
    else:
        warnings.warn(
            'max_iter=%d was reached without convergence.' % max_iter,
            category=ConvergenceWarning
        )
    unnorm_dist = label_distributions_.copy()
    # normalization
    normalizer = np.sum(label_distributions_, axis=1)[:, np.newaxis]
    normalizer = normalizer + 1e-20
    label_distributions_ /= normalizer

    if process_data is not None:
        process_data = np.array(process_data)

        labels = process_data.argmax(axis=2)
        max_process_data = process_data.max(axis=2)
        labels[max_process_data == 0] = -1

        # remove unnecessary iterations
        assert n_iter_ == len(process_data), "{}, {}".format(n_iter_, len(process_data))
        new_iter_num = n_iter_ - 1
        # if not (n_iter_ > 6 and k <= 3): # for case
        for new_iter_num in range(n_iter_ - 1, 0, -1):
                if sum(labels[new_iter_num - 1] != labels[n_iter_- 1]) != 0:
                    break

        process_data[new_iter_num] = process_data[n_iter_ - 1]
        process_data = process_data[:new_iter_num + 1]
        all_entropy[new_iter_num] = all_entropy[n_iter_ - 1]
        all_entropy = all_entropy[:new_iter_num + 1]

    return label_distributions_, all_entropy, process_data, unnorm_dist
    return modified_matrix, label_distributions_, process_data

def modify_graph(affinity_matrix, train_y, alpha, max_iter=15):
    modified_matrix, label_distributions_ = new_propagation(affinity_matrix, train_y, alpha, max_iter)
    return modified_matrix



def _find_unconnected_nodes(affinity_matrix, labeled_id):
    # logger.info("Finding unconnected nodes...")
    edge_indices = affinity_matrix.indices
    edge_indptr = affinity_matrix.indptr
    node_num = edge_indptr.shape[0] - 1
    connected_nodes = np.zeros((node_num))
    connected_nodes[labeled_id] = 1

    iter_cnt = 0
    while True:
        new_connected_nodes = affinity_matrix.dot(connected_nodes)+connected_nodes
        new_connected_nodes = new_connected_nodes.clip(0, 1)
        iter_cnt += 1
        if np.allclose(new_connected_nodes, connected_nodes):
            break
        connected_nodes = new_connected_nodes
    unconnected_nodes = np.where(new_connected_nodes<1)[0]
    # logger.info("Find unconnected nodes end. Count:{}, Iter:{}".format(unconnected_nodes.shape[0], iter_cnt))
    return unconnected_nodes

def correct_unconnected_nodes(affinity_matrix, train_y, neighbors):
    print("begin correct unconnected nodes...")
    np.random.seed(123)
    correted_nodes = []
    affinity_matrix = affinity_matrix.copy()
    labeled_ids = np.where(train_y > -1)[0]
    iter_cnt = 0
    while True:
        unconnected_ids = _find_unconnected_nodes(affinity_matrix, labeled_ids)
        if unconnected_ids.shape[0] == 0:
            print("No correcnted nodes after {} iteration. Correction finished.".format(iter_cnt))
            return affinity_matrix
        else:
            while True:
                corrected_id = np.random.choice(unconnected_ids)
                k_neighbors = neighbors[corrected_id]
                find = False
                for neighbor_id in k_neighbors:
                    if neighbor_id not in unconnected_ids:
                        find = True
                        iter_cnt += 1
                        affinity_matrix[corrected_id, neighbor_id] = 1
                        correted_nodes.append([corrected_id, neighbor_id])
                        break
                if find:
                    break