import numpy as np
import os
from scipy import sparse
from scipy.sparse import csgraph
from scipy.sparse import linalg as splinalg
from scipy.stats import entropy
from sklearn.utils.extmath import safe_sparse_dot
from sklearn.metrics import accuracy_score
from time import time
from sklearn.exceptions import ConvergenceWarning
import warnings


from application.views.model_utils.model_helper import build_laplacian_graph
from application.views.model_utils.model_helper import propagation

def local_update(selected_idxs, F, graph_matrix, affinity_matrix, train_y, alpha=0.2, max_iter=30,
                tol=1e-20, process_record=False, normalized=False):
    #: F must be the unnormalized one 
    # TODO: make it more efficient
    t0 = time()
    y = np.array(train_y)
    # label construction
    # construct a categorical distribution for classification only
    classes = np.unique(y)
    classes = (classes[classes != -1])
    process_data = None

    # D = affinity_matrix.sum(axis=0).getA1() - affinity_matrix.diagonal()
    # D = np.sqrt(D)
    # D[D == 0] = 1
    # affinity_matrix.setdiag(0)

    n_samples, n_classes = len(y), len(classes)

    if (alpha is None or alpha <= 0.0 or alpha >= 1.0):
        raise ValueError('alpha=%s is invalid: it must be inside '
                         'the open interval (0, 1)' % alpha)
    y = np.asarray(y)
    unlabeled = y == -1
    labeled = (y > -1)

    # initialize distributions
    selected_idxs = np.array(selected_idxs)
    selected_num = len(selected_idxs)
    label_distributions_ = F.copy()
    label_distributions_[selected_idxs, :] = \
        np.zeros((selected_num, n_classes))
    for label in classes:
        label_distributions_[y == label, classes == label] = 1

    y_static_labeled = np.copy(label_distributions_[selected_idxs, :])
    y_static = y_static_labeled * (1 - alpha)
    print("y_static sum:", y_static.sum())

    l_previous = F.copy()
    l_previous[selected_idxs,] = np.zeros((selected_num, n_classes))

    unlabeled = unlabeled[:, np.newaxis]
    if sparse.isspmatrix(graph_matrix):
        graph_matrix = graph_matrix.tocsr()

    # init unselected instances
    # Fs = label_distributions_[selected_idxs, :]
    # Fs_previous = l_previous[selected_idxs, :]

    selected_graph_matrix = graph_matrix[selected_idxs, :]

    print("local update init time:", time() - t0)

    n_iter_ = 0
    for _ in range(max_iter):
        if np.abs(label_distributions_ - l_previous).sum() < tol:
            break
        l_previous = label_distributions_.copy()
        label_distributions_a = safe_sparse_dot(
            selected_graph_matrix, label_distributions_)
        # print("label_distributions_a:", label_distributions_a.shape)

        label_distributions_[selected_idxs, :] = np.multiply(
                    alpha, label_distributions_a) + y_static
        n_iter_ += 1

    print("local update total time:", time() - t0)
    if normalized:
        normalizer = np.sum(label_distributions_, axis=1)[:, np.newaxis]
        normalizer = normalizer + 1e-20
        label_distributions_ /= normalizer
    return label_distributions_, n_iter_

def pure_propagation(graph_matrix, affinity_matrix, train_y, alpha=0.2, max_iter=30,
                tol=1e-12, process_record=False, normalized=False):
    t0 = time()
    y = np.array(train_y)
    # label construction
    # construct a categorical distribution for classification only
    classes = np.unique(y)
    classes = (classes[classes != -1])
    process_data = None

    # affinity_matrix.setdiag(0)

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

    if sparse.isspmatrix(graph_matrix):
        graph_matrix = graph_matrix.tocsr()



    n_iter_ = 1
    for _ in range(max_iter):
        if np.abs(label_distributions_ - l_previous).sum() < tol:
            break

        l_previous = label_distributions_.copy()
        label_distributions_a = safe_sparse_dot(
            graph_matrix, label_distributions_)

        label_distributions_ = np.multiply(
            alpha, label_distributions_a) + y_static
        n_iter_ += 1

    else:
        warnings.warn(
            'max_iter=%d was reached without convergence.' % max_iter,
            category=ConvergenceWarning
        )
        n_iter_ += 1

    unnorm_dist = label_distributions_.copy()

    if normalized:
        normalizer = np.sum(label_distributions_, axis=1)[:, np.newaxis]
        normalizer = normalizer + 1e-20
        label_distributions_ /= normalizer


    print("propagation time:", time() - t0)

    return label_distributions_, unnorm_dist

def full_update(selected_idxs, F, graph_matrix, affinity_matrix, train_y, alpha=0.2, max_iter=30,
                tol=0.001, process_record=False, normalized=False):
        pred_dist, unnorm_dist = \
            pure_propagation(graph_matrix, affinity_matrix, train_y,
                              alpha=alpha, process_record=True,
                              normalized=True)
        return pred_dist, 1

def local_search_k(k_list, n_neighbors, selected_idxs, F, initial_affinity_matrix,
    train_y, neighbors, gt):
    print("selected_idxs len:", len(selected_idxs))
    normalizer = np.sum(F, axis=1)[:, np.newaxis] + 1e-20
    norm_F = F / normalizer
    original_ent = entropy(norm_F.T + 1e-20).mean()
    best_affinity_matrix = None
    min_ent = original_ent + 2000
    best_k = None
    best_affinity_matrix = initial_affinity_matrix.copy()
    best_pred = None
    selected_num = len(selected_idxs)
    instance_num = len(train_y)

    unselected_idxs = np.ones(instance_num).astype(bool)
    unselected_idxs[selected_idxs] = False
    unselected_idxs = np.array(range(instance_num))[unselected_idxs]

    for local_k in k_list:
    # for local_k in [2]:
        if local_k <= 1:
            continue
        t0 = time()
        indptr = [i * local_k for i in range(selected_num + 1)]
        indices = neighbors[selected_idxs][:, :local_k].reshape(-1).tolist()
        data = neighbors[selected_idxs][:, :local_k].reshape(-1)
        data = (data * 0 + 1.0).tolist()
        selected_affinity_matrix = sparse.csr_matrix((data, indices, indptr),
            shape=(selected_num, instance_num)).toarray()
        affinity_matrix = initial_affinity_matrix.toarray()
        affinity_matrix[:, selected_idxs] = selected_affinity_matrix.T
        affinity_matrix[selected_idxs, :] = selected_affinity_matrix
        affinity_matrix = sparse.csr_matrix(affinity_matrix)

        # affinity_matrix = affinity_matrix + affinity_matrix.T
        # affinity_matrix = sparse.csr_matrix((np.ones(len(affinity_matrix.data)).tolist(),
        #                                      affinity_matrix.indices, affinity_matrix.indptr),
        #                                     shape=(instance_num, instance_num))

        affinity_matrix.setdiag(0)
        # print("sum compare", affinity_matrix.sum(), initial_affinity_matrix.sum())
        # print("affinity_matrix diff:", \
        #     np.abs(affinity_matrix - initial_affinity_matrix).sum())
        laplacian_matrix = build_laplacian_graph(affinity_matrix)
        pred, iter_num = full_update(selected_idxs, F, laplacian_matrix, affinity_matrix,
            train_y, normalized=True)
        print("progagation time:", time() - t0)
        # acc = accuracy_score(gt, pred.argmax(axis=1))
        acc = accuracy_score(gt[selected_idxs], pred.argmax(axis=1)[selected_idxs])
        max_pred = pred.max(axis=1)
        prop_pred = pred[max_pred != 0]
        ent = entropy(prop_pred.T + 1e-20).mean()
        print(local_k, acc, "ent:", ent, min_ent, iter_num)
        if ent < min_ent:
            print("update k:", ent, min_ent)
            min_ent = ent
            best_k = local_k
            best_affinity_matrix = affinity_matrix
            best_pred = pred
    print("best local k:", best_k, "best_ent", min_ent, "original_ent", original_ent)
    return best_affinity_matrix, best_pred, best_k

def add_edge():
    None

def remove_edge():
    None