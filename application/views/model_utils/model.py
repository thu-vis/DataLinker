import numpy as np
import os
from scipy import sparse
from scipy.sparse import csgraph, csr_matrix
from scipy.stats import entropy
from time import time
from time import sleep
from tqdm import tqdm
import json
import warnings
import copy
import threading
import multiprocessing


from sklearn.neighbors import kneighbors_graph
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.utils.extmath import safe_sparse_dot
from sklearn.neighbors.unsupervised import NearestNeighbors
from sklearn.exceptions import ConvergenceWarning
from sklearn.metrics.pairwise import euclidean_distances, paired_distances

from ..utils.config_utils import config
from ..utils.log_utils import logger
from ..utils.helper_utils import check_exist, \
    pickle_load_data, pickle_save_data, flow_statistic, async, async_once, json_load_data, json_save_data
from ..utils.embedder_utils import Embedder
import concurrent.futures

# from multiprocessing import Pool
from multiprocessing.pool import ThreadPool as Pool

from .data import Data, GraphData
from .LSLabelSpreading import LSLabelSpreading
from .model_helper import propagation, approximated_influence, exact_influence, \
    calculate_influence_matrix_local, approximated_influence_local, modify_graph, new_propagation
from .model_update import local_search_k
from .model_helper import build_laplacian_graph

DEBUG = False


def square(n):
    t0 = time()
    alpha_lap, deltaF, F0 = pickle_load_data("buffer/args.pkl")
    print("begin {}".format(n))

    deltaF = F0
    for i in range(200):
        for j in range(n):
            deltaF = alpha_lap.dot(deltaF) + F0

    # for i in range(n):
    #     for j in range(n):
    #         a+=1/(i+j+1)

    print("{} time {}".format(n, time() - t0))
    return None

def change_local(selected_idxs, neighbors, affinity_matrix, local_k):
    from scipy import sparse
    selected_num = len(selected_idxs)
    instance_num = neighbors.shape[0]
    indptr = [i * local_k for i in range(selected_num + 1)]
    indices = neighbors[selected_idxs][:, :local_k].reshape(-1).tolist()
    data = neighbors[selected_idxs][:, :local_k].reshape(-1)
    data = (data * 0 + 1.0).tolist()
    selected_affinity_matrix = sparse.csr_matrix((data, indices, indptr),
                                                 shape=(selected_num, instance_num)).toarray()
    affinity_matrix = affinity_matrix.toarray()
    affinity_matrix[selected_idxs, :] = selected_affinity_matrix
    affinity_matrix = sparse.csr_matrix(affinity_matrix)

    # affinity_matrix = affinity_matrix + affinity_matrix.T
    affinity_matrix = sparse.csr_matrix((np.ones(len(affinity_matrix.data)).tolist(),
                                         affinity_matrix.indices, affinity_matrix.indptr),
                                        shape=(instance_num, instance_num))
    return affinity_matrix_

class SSLModel(object):
    def __init__(self, dataname, labeled_num=None, total_num=None, seed=123):
        self.dataname = dataname
        self.step = 0
        self.data_root = os.path.join(config.data_root, self.dataname)

        self.model = None
        self.embed_X = None
        self.n_neighbor = None
        # signal is used to indicate that all data should be updated
        self.signal_state = False
        self._propagation = propagation
        self.alpha = 0.2
        self.config = config.stl_config if dataname.lower() == "stl" else config.oct_config

        self.data = GraphData(self.dataname, labeled_num, total_num)
        self.data.model = self
        # self.data.case_set_rest_idxs()
        self.selected_dir = self.data.selected_dir
        self.n_neighbor = self.config["n_neighbors"]
        self.filter_threshold = 0.7
        logger.info("n_neighbor: {}".format(self.n_neighbor))

        self.simplified_affinity_matrix = None
        self.local_appro_data = None
        self.propagation_path_from = None
        self.propagation_path_to = None
        self.influence_matrix = None
        self.local_influence_matrix = None

        # self._get_signal_state()

    def init(self, k=None, filter_threshold=None, evaluate=True, simplifying=True):
        if k is not None:
            self.n_neighbor = k
        if filter_threshold is not None:
            self.filter_threshold = filter_threshold
        logger.info("n_neighbor and filter_threshold has been updated: {} {}".format(
            self.n_neighbor, self.filter_threshold
        ))
        print("n_neighbor and filter_threshold has been updated: {} {}".format(
            self.n_neighbor, self.filter_threshold
        ))
        self.propagation_path_from = None
        self.propagation_path_to = None
        self.simplified_affinity_matrix = None
        self.influence_matrix = None
        self.local_appro_data = None
        # self._training(evaluate=evaluate, simplifying=simplifying))
        self._training(evaluate=evaluate, simplifying=simplifying)


        logger.info("init finished")

    def setK(self, k=None):
        if k is not None:
            self.n_neighbor = k

    def get_local_appro_data(self, graph_matrix):
        graph = graph_matrix.tocsc()
        N = graph.shape[0]
        k_degree = [{i} for i in range(N)]
        indptr = graph.indptr
        indices = graph.indices
        data = graph.data
        for i in range(N):
            degree = 2
            m_set = k_degree[i]
            for _ in range(degree):
                add_set = set()
                for idx in m_set:
                    for neighbor_idx in indices[indptr[idx]:indptr[idx+1]]:
                        add_set.add(neighbor_idx)
                m_set.update(add_set)
        return k_degree

    def _clean_buffer(self):
        self.simplified_affinity_matrix = None
        self.propagation_path_from = None
        self.propagation_path_to = None

    def _training(self, rebuild=True, evaluate=False, simplifying=True, record=True, saving = True):
        self._clean_buffer()
        affinity_matrix = self.data.get_graph(self.n_neighbor, rebuild=rebuild)

        # # postprocess graph
        # affinity_matrix = modify_graph(affinity_matrix, self.alpha, self.n_neighbor)
        # # TODO: change the affinity_matrix buffer

        laplacian = build_laplacian_graph(affinity_matrix)
        train_y = self.data.get_train_label()
        train_gt = self.data.get_train_ground_truth()
        train_gt = np.array(train_gt)
        pred_dist, loss, ent, process_data, unnorm_dist = \
            self._propagation(laplacian, affinity_matrix, train_y,
                              alpha=self.alpha, process_record=True,
                              normalized=True, k=self.n_neighbor)
        # pred_dist, ent, process_data, unnorm_dist = new_propagation(affinity_matrix, train_y, self.alpha, self.data.get_neighbors(), self)
        # labels = [int(np.argmax(process_data[j][id])) if np.max(process_data[j][id]) > 1e-4 else -1 for j in
        #           range(iter_num)]
        iter = len(ent)
        self.n_iters = iter
        # get labels and flows
        self.labels = process_data.argmax(axis=2)
        self.unnorm_dist = unnorm_dist
        max_process_data = process_data.max(axis=2)
        self.labels[max_process_data == 0] = -1
        logger.info("unpropagated instance num: {}".format(sum(self.labels[-1]==-1)))
        class_list = np.unique(train_y)
        class_list.sort()
        self.class_list = class_list
        self.flows = np.zeros((iter-1, len(class_list), len(class_list)))
        for i in range(iter-1):
            self.flows[i] = flow_statistic(self.labels[i], self.labels[i+1], class_list)
        self.loss = loss
        self.process_data = process_data
        self.ent = ent
        self.pred_dist = pred_dist
        self.graph = affinity_matrix
        self.local_appro_data = self.get_local_appro_data(self.graph)
        unconnected = self.data._find_unconnected_nodes(self.graph, np.where(self.data.get_train_label()>-1)[0])
        print("Unconnected cnt:{}".format(unconnected.shape[0]))
        print(process_data.shape)

        # # for test
        # from scripts.Propa.STL import STLExp
        # from scripts.Propa.exp_config import ExpConfig
        # exp = STLExp()
        # conf = ExpConfig.conf[exp.dataname]
        # exp_affinity_matrix = exp.construct_graph(n_neighbor=conf["k"])

        # new propagation
        # _, pred_dist = new_propagation(affinity_matrix, train_y, self.alpha, self.data.neighbors)
        # self.pred_dist = pred_dist

        pred_y = pred_dist.argmax(axis=1)
        acc = accuracy_score(train_gt, pred_y)
        self.acc = acc
        logger.info("model accuracy: {}, iter: {}".format(acc, iter))
        logger.info("model confusion matrix:\n{}".format(confusion_matrix(train_gt, pred_y)))
        logger.info("model entropy: {}".format(entropy(pred_dist.T + 1e-20).mean()))
        # self.evaluate(); exit()
        # if not config.show_simplified:
        propagation_path_from, propagation_path_to = self.get_path_to_label(self.process_data,
                                                                            self.graph)
        # if simplifying:
        # self._influence_matrix(rebuild=simplifying, saving = saving)
        self.propagation_path_from = propagation_path_from
        self.propagation_path_to = propagation_path_to


        if False:
            self.fetch_simplify_influence_matrix()
        # if simplifying and config.show_simplified:
        #     # get simplififed matrix asynchronously
        #     print("begin simplify")
        #     self.fetch_simplify_influence_matrix()
        #
        if evaluate:
            # self.evaluate()
            print("begin evaluation")
            self.adaptive_evaluation()
            # self.adaptive_evaluation_bkp()
            # self.adaptive_evaluation_v2()

        # record_state
        if record:
            self.data.record_state(self.pred_dist)

        logger.info("_training finished!!!!!!!!")

    def _influence_matrix(self, rebuild = False, prefix="", saving = True):
        if self.influence_matrix is not None and (not DEBUG) and (not rebuild):
            self.influence_matrix.data[np.isnan(self.influence_matrix.data)] = 0
            return
        affinity_matrix = self.data.get_graph(self.n_neighbor)
        laplacian = build_laplacian_graph(affinity_matrix)
        self.laplacian = laplacian
        train_y = self.data.get_train_label()
        logger.info("begin load influence matrix")
        influence_matrix_path = os.path.join(self.selected_dir,
                                             ("{}{}_{}_influence_matrix-step"+str(self.step)+".pkl")
                                             .format(prefix, self.alpha, self.n_neighbor))
        if os.path.exists(influence_matrix_path) and (not DEBUG) and (not rebuild):
            logger.info("influence_matrix exist!!!")
            self.influence_matrix = pickle_load_data(influence_matrix_path)
            self.influence_matrix.data[np.isnan(self.influence_matrix.data)] = 0
            return
        logger.info("influence matrix  "
                    "do not exist, preprocessing!")
        self.influence_matrix = \
            approximated_influence(self.unnorm_dist, affinity_matrix,
                                   laplacian, self.alpha, train_y, self.n_iters)
        # if rebuild:
        if saving:
            pickle_save_data(influence_matrix_path, self.influence_matrix)
        self.influence_matrix.data[np.isnan(self.influence_matrix.data)] = 0
        self.influence_matrix.data[self.influence_matrix.data > 1] = 0
        return

    def _exact_influence(self, rebuild = False, prefix="", saving = True):

        affinity_matrix = self.data.get_graph(self.n_neighbor)
        laplacian = build_laplacian_graph(affinity_matrix)
        self.laplacian = laplacian
        train_y = self.data.get_train_label()
        logger.info("begin load influence matrix")
        logger.info("influence matrix  "
                    "do not exist, preprocessing!")
        self.influence_matrix = \
            exact_influence(self.unnorm_dist, affinity_matrix,
                                   laplacian, self.alpha, train_y)

        return

    def _appro_influence_local(self):
        def get_local_appro_data(graph_matrix):
            graph = graph_matrix.tocsc()
            N = graph.shape[0]
            k_degree = [{i} for i in range(N)]
            indptr = graph.indptr
            indices = graph.indices
            data = graph.data
            for i in range(N):
                degree = 2
                m_set = k_degree[i]
                for _ in range(degree):
                    add_set = set()
                    for idx in m_set:
                        for neighbor_idx in indices[indptr[idx]:indptr[idx + 1]]:
                            add_set.add(neighbor_idx)
                    m_set.update(add_set)
            return k_degree
        affinity_matrix = self.data.get_graph(self.n_neighbor)
        laplacian = build_laplacian_graph(affinity_matrix)
        self.laplacian = laplacian

        train_y = self.data.get_train_label()
        select_ids = np.arange(0, train_y.shape[0])
        logger.info("begin load influence matrix")
        logger.info("influence matrix  "
                    "do not exist, preprocessing!")
        appro_influence_matrix_local = approximated_influence_local(self.unnorm_dist, affinity_matrix, laplacian, self.alpha,
                                                                    train_y, 3, select_ids, get_local_appro_data(affinity_matrix),
                                                                    self.dataname)

    def test(self):
        thread_num = 4
        values = [3 for i in range(thread_num)]
        t0 = time()
        with Pool(processes=thread_num) as pool:
            results = pool.map(square, values)
            print("=========================================")

            res = time()
            print("calculate time:{}".format(res - t0))
            for v in values:
                square(v)

    def influence_matrix_local(self, selected_ids, thread_num = 5):
        # thread_num = 4
        # values = [3 for i in range(thread_num)]
        # t0 = time()
        # with Pool(processes=thread_num) as pool:
        #     results = pool.map(square, values)
        #     print("=========================================")
        #
        #     res = time()
        #     print("calculate time:{}".format(res - t0))
        #     for v in values:
        #         square(v)
        # return None, None
        calculate_time = 0
        affinity_matrix = self.graph
        N = affinity_matrix.shape[0]
        laplacian = self.laplacian
        train_y = self.data.get_train_label()
        # if self.local_influence_matrix is None:
        #     self.local_influence_matrix = np.zeros((N, N), dtype=float)
        self.local_influence_matrix = affinity_matrix.copy()*0
        self.local_influence_matrix_flag = affinity_matrix.copy() * 0

        logger.info("begin load local influence matrix")
        alpha_lap = self.alpha * self.laplacian
        alpha_lap = alpha_lap.tocsr()
        tmp = affinity_matrix
        D = tmp.sum(axis=0).getA1() - tmp.diagonal()
        D[D == 0] = 1
        graphs = {}
        for id in selected_ids:
            graphs[id] = {
                "from":[],
                "to":[],
                "from_weight":[],
                "to_weight":[]
            }
        t0 = time()
        futures = []
        node_cnt = len(selected_ids)
        thread_node_cnt = int(node_cnt / thread_num)
        # thread_num = 3
        # with concurrent.futures.ThreadPoolExecutor(max_workers = thread_num) as executor:


        with Pool(processes=thread_num) as pool:
            node_cnt = len(selected_ids)
            thread_node_cnt = int(node_cnt/thread_num)
            values = []
            for i in range(thread_num):
                start_idx = i*thread_node_cnt
                end_idx = (i+1)*thread_node_cnt if i < thread_num-1 else node_cnt
                values.append((graphs, selected_ids, start_idx, end_idx, self.propagation_path_from, self.propagation_path_to,
                                                                               self.unnorm_dist, affinity_matrix, alpha_lap, self.alpha, D, 3, self.local_influence_matrix,
                               self.local_appro_data, self.local_influence_matrix_flag))
            t0 = time()
            pool.map(calculate_influence_matrix_local, values)
        calculate_time = time()-t0
        print("parallel time:{}".format(calculate_time))



        # with concurrent.futures.ThreadPoolExecutor(max_workers = thread_num) as executor:
        # with Pool(processes=thread_num) as pool:
        #     node_cnt = len(selected_ids)
        #     thread_node_cnt = int(node_cnt / thread_num)
        #     res = []
        #     for i in range(thread_num):
        #         start_idx = i * thread_node_cnt
        #         end_idx = (i + 1) * thread_node_cnt if i < thread_num - 1 else node_cnt
        #
        #         res.append(pool.apply_async(calculate_influence_matrix_local, (
        #             graphs, selected_ids, start_idx, end_idx, self.propagation_path_from, self.propagation_path_to,
        #             self.unnorm_dist, affinity_matrix, alpha_lap, self.alpha, D, 3, self.local_influence_matrix)))
        #     t0 = time()
        #     # concurrent.futures.wait(futures)
        #     [r.get() for r in res]
        #     calculate_time = time() - t0
        #     print("parallel time:{}".format(calculate_time))

        node_cnt = len(selected_ids)
        thread_node_cnt = int(node_cnt/thread_num)
        t0 = time()
        for i in range(thread_num):
                start_idx = i*thread_node_cnt
                end_idx = (i+1)*thread_node_cnt if i < thread_num-1 else node_cnt
                calculate_influence_matrix_local((graphs, selected_ids, start_idx, end_idx,
                                                 self.propagation_path_from, self.propagation_path_to, self.unnorm_dist, affinity_matrix, alpha_lap, self.alpha, D, 3, self.local_influence_matrix,
                                                  self.local_appro_data, self.local_influence_matrix_flag))

                # start_idx = i * thread_edge_cnt
                # end_idx = (i + 1) * thread_edge_cnt if i < thread_num - 1 else edge_cnt
                # for k in range(end_idx-start_idx):
                #     self.local_influence_matrix[edges[start_idx+k][0], edges[start_idx+k][1]] = influence[k]
        calculate_time = time()-t0
        print("time:{}".format(calculate_time))
        for to_id in selected_ids:
            for from_id in self.propagation_path_from[to_id]:
                appro_influence = self.local_influence_matrix[to_id, from_id]
                graphs[to_id]["from"].append(from_id)
                graphs[to_id]["from_weight"].append(appro_influence)
        for from_id in selected_ids:
            for to_id in self.propagation_path_to[from_id]:
                appro_influence = self.local_influence_matrix[to_id, from_id]
                graphs[from_id]["to"].append(to_id)
                graphs[from_id]["to_weight"].append(appro_influence)

        print("thread num:{}, calculate time:{}".format(thread_num, calculate_time))
        logger.info("end local influence matrix")

        return graphs, calculate_time

    def fetch_simplify_influence_matrix(self):
        simplify_path = os.path.join(self.selected_dir, "simplify_matrix.npy")
        if os.path.exists(simplify_path):
            simplified_affinity_matrix, propagation_path_from, propagation_path_to, influence_matrix = pickle_load_data(simplify_path)
            self.simplified_affinity_matrix = simplified_affinity_matrix
            self.propagation_path_from = propagation_path_from
            self.propagation_path_to = propagation_path_to
            self.influence_matrix = influence_matrix
        else:
            self.simplify_influence_matrix()
            save = (self.simplified_affinity_matrix, self.propagation_path_from, self.propagation_path_to, self.influence_matrix)
            pickle_save_data(simplify_path, save)

    def simplify_influence_matrix(self, threshold=0.7):
        logger.info("begin simplify influence matrix")
        self._influence_matrix()
        affinity_matrix = self.data.get_graph()
        laplacian = build_laplacian_graph(affinity_matrix).tocsr()
        unnorm_dist = self.unnorm_dist
        n_samples, n_classes = unnorm_dist.shape
        y = np.asarray(self.data.get_train_label())
        classes = np.unique(y)
        classes = (classes[classes != -1])
        unlabeled = y == -1
        labeled = (y > -1)
        # initialize distributions
        label_distributions_ = np.zeros((n_samples, n_classes))
        for label in classes:
            label_distributions_[y == label, classes == label] = 1
        y_static_labeled = np.copy(label_distributions_)
        y_static = y_static_labeled * (1 - self.alpha)

        simplified_affinity_matrix = self.influence_matrix.copy() * 0
        for i in range(simplified_affinity_matrix.shape[0]):
            start = self.influence_matrix.indptr[i]
            end = self.influence_matrix.indptr[i + 1]
            data_in_this_row = self.influence_matrix.data[start:end]
            j_in_this_row = self.influence_matrix.indices[start:end]
            sorted_idx = data_in_this_row.argsort()[::-1]
            max_idx = []
            for k in range(len(sorted_idx)):
                max_idx.append(sorted_idx[k])
                # # Strategy 2
                # if (data_in_this_row[max_idx].sum() /
                #         data_in_this_row.sum() > threshold):
                #     break
                # Strategy 1
                v = np.zeros(self.unnorm_dist.shape[1])
                for _k in max_idx:
                    v = v + self.alpha * laplacian[i, j_in_this_row[_k]] * unnorm_dist[j_in_this_row[_k]]
                v = v + y_static[i]
                err = np.sqrt(((v-unnorm_dist[i])**2).sum())
                err_percent = err / np.sqrt((unnorm_dist[i]**2).sum())
                if err_percent < (1 - self.filter_threshold):
                    break
            for k in max_idx:
                simplified_affinity_matrix.data[start:end][k] = 1
        # remove in-degree of labeled instances
        train_y = self.data.get_train_label()
        labeled_idx = train_y != -1
        logger.info("labeled num: {}".format(sum(labeled_idx)))
        simplified_affinity_matrix[labeled_idx] *= 0
        # exp
        simplified_laplacian_matrix = \
            build_laplacian_graph(simplified_affinity_matrix)
        simplified_F, L, _, _, _ = self._propagation(simplified_laplacian_matrix,
                                               simplified_affinity_matrix,
                                               np.array(self.data.get_train_label()),
                                               alpha=self.alpha,
                                               normalized=False)
        mis_match_idx = simplified_F.argmax(axis=1) != self.pred_dist.argmax(axis=1)
        logger.info("sparse percent: {}".format(simplified_affinity_matrix.sum() / \
                                                len(self.influence_matrix.data)))
        logger.info("simplification error: {}"
                    .format(sum(mis_match_idx) / self.pred_dist.shape[0]))
        ground_truth = self.data.get_train_ground_truth()
        logger.info("pre acc: {}"
                    .format(accuracy_score(self.pred_dist.argmax(axis=1), ground_truth)))
        logger.info("now acc: {}".format(accuracy_score(simplified_F.argmax(axis=1), ground_truth)))
        simplified_affinity_matrix.eliminate_zeros()
        # TODO remove paopagation 2020.2.15
        propagation_path_from, propagation_path_to = self.get_path_to_label(self.process_data, simplified_affinity_matrix)
        self.simplified_affinity_matrix = simplified_affinity_matrix
        self.propagation_path_from = propagation_path_from
        self.propagation_path_to = propagation_path_to
        logger.info("end async function")

    def simplification_end(self, sleep_time = 0.2):
        if self.simplified_affinity_matrix is not None:
            return True
        else:
            logger.info("simplification has not finished. sleep {}s".format(sleep_time))
            sleep(sleep_time)
            return False

    def local_search_k(self, selected_idxs, k_list=None, selected_categories=None, simplifying=True, evaluate=True, record = True):
        self.data.actions.append("local-update")
        m = self.data.get_new_id_map()
        selected_idxs = [m[id] for id in selected_idxs if id not in self.data.get_removed_idxs()]
        if k_list is None:
            k_list = list(range(1,10))
        if selected_categories is not None:
            old_selected_idxs = selected_idxs.copy() 
            selected_idxs = []
            train_pred = self.labels[-1]
            for idx in old_selected_idxs:
                if selected_categories[train_pred[idx]]:
                    selected_idxs.append(idx)
            logger.info("bincount info: {}".format(str(np.bincount(train_pred[np.array(selected_idxs)]))))
        train_gt = self.data.get_train_ground_truth()
        train_y = self.data.get_train_label()
        neighbors = self.data.get_neighbors(k_neighbors=100)
        affinity_matrix = self.data.get_graph()
        affinity_matrix.setdiag(0)
        affinity_matrix, pred, best_k = local_search_k(k_list, self.n_neighbor,
            selected_idxs, self.unnorm_dist, affinity_matrix, 
            train_y, neighbors, train_gt)
        # logger.info("searched affinity_matrix diff: {}".format(
        #     np.abs(self.affinity_matrix - affinity_matrix).sum()
        # ))
        laplacian_matrix = build_laplacian_graph(affinity_matrix)
        pred_y = pred.argmax(axis=1)
        acc = accuracy_score(train_gt, pred_y)
        logger.info("model accuracy without full update: {}".format(acc))
        # self.affinity_matrix = affinity_matrix
        # self.laplacian = laplacian_matrix
        self.data.affinity_matrix = self.data.correct_unconnected_nodes(affinity_matrix)
        # self.data.affinity_matrix = affinity_matrix
        self._training(rebuild=False, evaluate=evaluate, simplifying=simplifying, record=record)
        return pred, best_k

    def get_train_neighbors_consistency(self, n_neighbor = 6):
        neighbors = self.data.get_neighbors(n_neighbor)
        labels = self.get_pred_labels()
        neighbor_labels = labels[neighbors]
        return n_neighbor-np.count_nonzero(np.subtract(neighbor_labels.T , labels), axis=0)


    def get_path_to_label(self, process_data, influence_matrix):
        iternum = process_data.shape[0]
        nodenum = process_data.shape[1]
        propagation_path_from = [[] for i in range(nodenum)]
        propagation_path_to = [[] for i in range(nodenum)]
        edge_indices = influence_matrix.indices
        edge_indptr = influence_matrix.indptr
        for node_id in range(nodenum):
            start_idx = edge_indptr[node_id]
            end_idx = edge_indptr[node_id+1]
            for target_id in edge_indices[start_idx:end_idx]:
                propagation_path_from[int(node_id)].append(int(target_id))
                propagation_path_to[int(target_id)].append(int(node_id))
        return propagation_path_from, propagation_path_to

    # @async_once
    def evaluate(self, n_neighbor = -1):
        train_X = self.data.get_train_X()
        test_X = self.data.get_test_X()
        test_y = self.data.get_test_ground_truth()
        pred = self.pred_dist
        nn_fit = self.data.get_neighbors_model()
        weight_matrices = nn_fit.kneighbors(test_X, self.n_neighbor if n_neighbor==-1 else n_neighbor, return_distance=False)
        probabilities = np.array([
                np.sum(pred[weight_matrix], axis=0)
                for weight_matrix in weight_matrices])
        normalizer = np.atleast_2d(np.sum(probabilities, axis=1)).T
        probabilities /= normalizer
        acc = accuracy_score(test_y, probabilities.argmax(axis=1))
        print(confusion_matrix(test_y, probabilities.argmax(axis=1)))
        logger.info("exp accuracy: {}".format(acc))
        return probabilities.argmax(axis=1)

    def adaptive_evaluation_new_test(self, pred, test_X, test_y):
        affinity_matrix = self.data.get_graph()
        affinity_matrix.setdiag(0)
        # test_X = self.data.get_test_X()
        # test_y = self.data.get_test_ground_truth()
        neighbors_model = self.data.get_neighbors_model()
        test_neighbors_result = neighbors_model.kneighbors_graph(test_X,
                                                        100,
                                                       mode="distance")
        test_neighbors, test_neighbors_weight = self.data.csr_to_impact_matrix(test_neighbors_result,
                                                                               len(test_y), 100)
        logger.info("neighbor_result got!")
        estimate_k = 3
        s = 0
        labels = []
        rest_idxs = self.data.get_rest_idxs()
        m = self.data.get_new_id_map()
        adaptive_ks = []
        for i in tqdm(range(test_X.shape[0])):
            j_in_this_row = test_neighbors[i, :]
            j_in_this_row = j_in_this_row[j_in_this_row != -1]
            estimated_idxs = j_in_this_row[:estimate_k]
            # estimated_idxs = [m[i] for i in estimated_idxs]
            adaptive_k = affinity_matrix[estimated_idxs, :].sum() / estimate_k
            selected_idxs = j_in_this_row[:int(adaptive_k)]
            # selected_idxs = [m[i] for i in selected_idxs]
            p = pred[selected_idxs].sum(axis=0)
            labels.append(p.argmax())
            s += adaptive_k
            adaptive_ks.append(adaptive_k)

        acc = accuracy_score(test_y, labels)
        confusion_mat = confusion_matrix(test_y, labels)
        logger.info("exp accuracy: {}".format(acc))
        logger.info("confusion matrix: \n{}".format(confusion_mat))
        print(s / test_X.shape[0])
        return labels

    def adaptive_evaluation_unasync(self, pred=None):
        affinity_matrix = self.data.get_graph()
        affinity_matrix.setdiag(0)
        if pred is None:
            pred = self.pred_dist
        test_X = self.data.get_test_X()
        test_y = self.data.get_test_ground_truth()
        test_neighbors = self.data.get_test_neighbors()
        logger.info("neighbor_result got!")
        estimate_k = 3
        s = 0
        labels = []
        rest_idxs = self.data.get_rest_idxs()
        m = self.data.get_new_id_map()
        adaptive_ks = []
        for i in tqdm(range(test_X.shape[0])):
            j_in_this_row = test_neighbors[i, :]
            j_in_this_row = j_in_this_row[j_in_this_row != -1]
            estimated_idxs = j_in_this_row[:estimate_k]
            # estimated_idxs = [m[i] for i in estimated_idxs]
            adaptive_k = affinity_matrix[estimated_idxs, :].sum() / estimate_k
            selected_idxs = j_in_this_row[:int(adaptive_k)]
            # selected_idxs = [m[i] for i in selected_idxs]
            p = pred[selected_idxs].sum(axis=0)
            labels.append(p.argmax())
            s += adaptive_k
            adaptive_ks.append(adaptive_k)

        acc = accuracy_score(test_y, labels)
        confusion_mat = confusion_matrix(test_y, labels)
        logger.info("exp accuracy: {}".format(acc))
        logger.info("confusion matrix: \n{}".format(confusion_mat))
        print(s / test_X.shape[0])
        return labels, np.array(adaptive_ks), acc

    # @async_once
    def adaptive_evaluation(self, pred=None, step=None):
        # return;
        affinity_matrix = self.data.get_graph()
        affinity_matrix.setdiag(0)
        if pred is None:
            pred = self.pred_dist
        test_X = self.data.get_test_X()
        test_y = self.data.get_test_ground_truth()
        test_neighbors = self.data.get_test_neighbors()
        logger.info("neighbor_result got!")
        estimate_k = 3
        s = 0
        labels = []
        rest_idxs = self.data.get_rest_idxs()
        m = self.data.get_new_id_map()
        adaptive_ks = []
        for i in tqdm(range(test_X.shape[0])):
            j_in_this_row = test_neighbors[i, :]
            j_in_this_row = j_in_this_row[j_in_this_row != -1]
            estimated_idxs = j_in_this_row[:estimate_k]
            # estimated_idxs = [m[i] for i in estimated_idxs]
            adaptive_k = affinity_matrix[estimated_idxs, :].sum() / estimate_k
            selected_idxs = j_in_this_row[:int(adaptive_k)]
            # selected_idxs = [m[i] for i in selected_idxs]
            p = pred[selected_idxs].sum(axis=0)
            labels.append(p.argmax())
            s += adaptive_k
            adaptive_ks.append(adaptive_k)

        acc = accuracy_score(test_y, labels)
        confusion_mat = confusion_matrix(test_y, labels)
        if step == None:
            logger.info("exp accuracy: {}".format(acc))
        else:
            logger.info("exp accuracy step {}: {}".format(step, acc))
        logger.info("confusion matrix: \n{}".format(confusion_mat))

        # for k, i in [[2, 7], [2, 6], [2, 5]]:
        #     # for k,i in [[2,5]]:
        #     inds = test_y == i
        #     inds[np.array(labels) == i] = False
        #     selected_idxs = np.array(range(len(inds)))[inds]
        #     neighbors = list(set(test_neighbors[selected_idxs, :5].flatten().tolist()))
        #     print(neighbors)
            # affinity_matrix = change_local(selected_idxs, neighbors, affinity_matrix, k)
        print(s / test_X.shape[0])
        return labels, np.array(adaptive_ks), acc

    @async_once
    def adaptive_evaluation_bkp(self):
        train_X = self.data.get_train_X()
        affinity_matrix = self.data.get_graph()
        affinity_matrix.setdiag(0)
        pred = self.pred_dist
        test_X = self.data.get_test_X()
        test_y = self.data.get_test_ground_truth()
        # nn_fit = self.data.get_neighbors_model()
        nn_fit = NearestNeighbors(n_jobs=-4).fit(train_X)
        logger.info("nn construction finished!")
        neighbor_result = nn_fit.kneighbors_graph(test_X,
                                            100,
                                            mode="distance")
        logger.info("neighbor_result got!")
        estimate_k = 5
        s = 0
        rest_idxs = self.data.get_rest_idxs()
        # removed_idxs = self.remv
        labels = []
        for i in tqdm(range(test_X.shape[0])):
            start = neighbor_result.indptr[i]
            end = neighbor_result.indptr[i + 1]
            j_in_this_row = neighbor_result.indices[start:end]
            data_in_this_row = neighbor_result.data[start:end]
            sorted_idx = data_in_this_row.argsort()
            assert (len(sorted_idx) == 100)
            j_in_this_row = j_in_this_row[sorted_idx]
            estimated_idxs = j_in_this_row[:estimate_k]
            estimated_idxs = np.array([i for i in estimated_idxs if i in rest_idxs])
            adaptive_k = affinity_matrix[estimated_idxs, :].sum() / estimate_k
            selected_idxs = j_in_this_row[:int(adaptive_k)]
            p = pred[selected_idxs].sum(axis=0)
            labels.append(p.argmax())
            s += adaptive_k
            # print(adaptive_k)
        acc = accuracy_score(test_y, labels)
        logger.info("exp accuracy: {}".format(acc))
        print(s/test_X.shape[0])

    # @async_once
    def adaptive_evaluation_v2(self, bound=None):
        train_X = self.data.get_train_X()
        affinity_matrix = self.data.get_graph()
        pred = self.pred_dist
        test_X = self.data.get_test_X()
        label_cnt = pred.shape[1]
        test_y = self.data.get_test_ground_truth()
        nn_fit = self.data.get_neighbors_model()
        logger.info("nn construction finished!")
        max_k = 50
        neighbor_result = nn_fit.kneighbors_graph(test_X,
                                                  max_k,
                                                  mode="distance")
        s = 0
        low_bound = 20 if bound is None else bound
        degree = self.get_in_out_degree(affinity_matrix)[:,1]
        degree = np.sqrt(1/degree)
        labels = []
        logger.info("begin exp")
        neighbors = []
        neighbors_pred = []
        fs = []
        ks = []
        f_tests = []
        estimate_k = 20
        for test_node_id in range(test_X.shape[0]):
            start = neighbor_result.indptr[test_node_id]
            end = neighbor_result.indptr[test_node_id + 1]
            j_in_this_row = neighbor_result.indices[start:end]
            data_in_this_row = neighbor_result.data[start:end]
            sorted_idx = data_in_this_row.argsort()
            assert (len(sorted_idx) == max_k)
            j_in_this_row = j_in_this_row[sorted_idx]
            min_f = np.finfo(np.float).max
            min_k = 0
            min_f_test = np.zeros((label_cnt))
            sims = []
            estimated_idxs = j_in_this_row[:estimate_k]
            # estimated_idxs = [m[i] for i in estimated_idxs]
            adaptive_k = affinity_matrix[estimated_idxs, :].sum() / estimate_k
            adaptive_min_low_bound = int(adaptive_k*0.5 if adaptive_k*0.5>5 else 5)
            adaptive_max_low_bound = int(adaptive_k*1.5)
            for k in range(low_bound,30):
                estimated_idxs = j_in_this_row[:k]
                # get f_test
                neighbor_tmp = pred[estimated_idxs]*degree[estimated_idxs].reshape((k,1))
                f_test = np.sum(neighbor_tmp, axis=0)
                d_test = np.sqrt(k)
                f_test *= d_test/k
                # get label similarity
                f = 0
                f_tmp = f_test / d_test - neighbor_tmp
                f = np.sum(np.diagonal(np.dot(f_tmp, f_tmp.T)))
                f = f / k
                sims.append(f)
                if f < min_f:
                    min_f = f
                    min_k = k
                    min_f_test = f_test
            s += min_k
            p = min_f_test
            labels.append(int(p.argmax()))
            fs.append(min_f)
            ks.append(min_k)
            neighbors.append(j_in_this_row.tolist())
            neighbors_pred.append(np.argmax(pred[j_in_this_row], axis=1).tolist())
            f_tests.append(min_f_test)
        print(confusion_matrix(test_y, labels))
        acc = accuracy_score(test_y, labels)
        logger.info("Bound is {}, exp accuracy: {}".format(low_bound, acc))
        print(s / test_X.shape[0])
        return np.array(labels), np.array(fs), np.array(ks), np.array(neighbors), np.array(neighbors_pred), f_tests


    def get_in_out_degree(self, influence_matrix):
        edge_indices = influence_matrix.indices
        edge_indptr = influence_matrix.indptr
        node_num = edge_indptr.shape[0]-1

        degree = np.zeros((node_num, 2))
        for node_id in range(node_num):
            start_idx = edge_indptr[node_id]
            end_idx = edge_indptr[node_id+1]
            degree[node_id][1] += end_idx-start_idx
            for target_id in edge_indices[start_idx:end_idx]:
                degree[target_id][0] += 1
        return degree

    def get_graph_and_process_data(self, filter_threshold=None):
        if filter_threshold is not None:
            self.filter_threshold = filter_threshold
            self.propagation_path_from = None
            self.propagation_path_to = None
            self.simplified_affinity_matrix = None
        if (self.propagation_path_from == None) or (self.simplified_affinity_matrix == None):
            # self.simplified_affinity_matrix, self.propagation_path = self.simplify_influence_matrix(threshold=self.filter_threshold)
            while not self.simplification_end():
                pass
        return self.graph, self.process_data, self.simplified_affinity_matrix, self.propagation_path_from, self.propagation_path_to, self.get_in_out_degree(self.simplified_affinity_matrix)

    def get_pred_labels(self):
        return self.labels[-1].copy()

    def get_loss(self):
        return self.loss

    def get_ent(self):
        return self.ent

    def get_flows(self, idxs):
        t0 = time()
        m = self.data.get_new_id_map()
        idxs = np.array([m[i] for i in idxs])
        self.selected_idxs = idxs
        iter = len(self.labels)

        same_cnt = 0
        label_sums = np.zeros((iter, len(self.class_list)))
        for i in range(iter):

            labels = self.labels[i][idxs]
            bins = np.bincount(labels + 1)
            missed_num = label_sums[i].shape[0] - len(bins)
            label_sums[i, :] = np.concatenate((bins, np.zeros(missed_num)))
            if i > 0:
                same_as_last = True
                for j in range(len(self.class_list)):
                    if label_sums[i][j] != label_sums[i-1][j]:
                        same_as_last = False
                        break
                if same_as_last:
                    same_cnt += 1
                # if same_cnt == 3:
                #     iter = i
                #     label_sums = label_sums[:iter]
                #     break
        # if self.dataname.lower() == "stl" and self.step == 1:
        #     iter = 8
        #     label_sums = label_sums[:iter]
        #     label_sums[iter-1] = label_sums[iter-2]
        selected_flows = np.zeros((iter-1, len(self.class_list), len(self.class_list)))
        for i in range(iter-1):
            selected_flows[i] = flow_statistic(self.labels[i][idxs], \
                self.labels[i+1][idxs], self.class_list)
        # print("get_flows time 1: ", time() - t0)
        # if self.dataname.lower() == "stl" and self.step == 1:
        #     class_len = len(selected_flows[iter-2])
        #     for i in range(class_len):
        #         for j in range(class_len):
        #             if i != j:
        #                 selected_flows[iter-2][i][j] = 0
        # print("get_flows time 2: ", time() - t0)
        return label_sums, selected_flows

    def get_selected_flows(self, data):
        if isinstance(data, list):
            idxs = data
            m = self.data.get_new_id_map()
            idxs = [m[i] for i in idxs]
        elif data[:4] == "link":
            _, iter_prev, cls_prev, iter_next, cls_next = data.split("-")
            iter_prev, cls_prev, iter_next, cls_next = \
                [int(iter_prev), int(cls_prev) - 1, int(iter_next), int(cls_next) - 1]
            print(iter_prev, cls_prev, iter_next, cls_next)

            print("total instance num", len(self.labels[0]))
            idxs = []
            for i in range(len(self.labels[0])):
                if (self.labels[iter_prev][i] == cls_prev and \
                    self.labels[iter_next][i] == cls_next):
                    idxs.append(i)
        elif data[:4] == "node":
            _, iter, c = data.split("-")
            iter, c = [int(iter), int(c) - 1]
            idxs = []
            for i in range(len(self.labels[0])):
                if (self.labels[iter][i] == c):
                    idxs.append(i) # mapped idxs
        idxs = np.array(idxs) # mapped idxs
        idxs = np.array([i for i in idxs if i in self.selected_idxs])
        m_reverse = self.data.get_new_map_reverse()

        print("selected instances num", len(idxs))
        iter = len(self.labels)
        selected_flows = np.zeros((iter-1, len(self.class_list), len(self.class_list)))
        for i in range(iter-1):
            selected_flows[i] = flow_statistic(self.labels[i][idxs], \
                self.labels[i+1][idxs], self.class_list)
        idxs = np.array([m_reverse[idx] for idx in idxs])
        return selected_flows, idxs

    def editing_data(self, data):
        if len(data["label_names"]) > len(self.data.class_names):
            for class_name in data["label_names"][len(self.data.class_names):]:
                self.data.add_new_categories(class_name)
        self.data.editing_data(data)
        self.data.update_graph(data["deleted_idxs"])
        self.data.affinity_matrix = self.data.correct_unconnected_nodes(self.data.affinity_matrix)
        self._training(rebuild=False, evaluate=True, saving=False, simplifying=True)

    def get_data(self):
        train_X = self.data.get_train_X()
        train_y = self.data.get_train_label()
        return train_X, train_y

    def get_full_data(self):
        train_X = self.data.get_full_train_X()
        train_y = self.data.get_full_train_label()
        return train_X, train_y

    def get_history(self):
        return self.data.return_state()
    
    def set_history(self, id):
        state = self.data.change_state(id)
        self._training(rebuild=False, simplifying=False, evaluate=True, record=False)
        return state

    def retrain(self):
        self._training()
        return self.data.return_state()

    def add_more_similar_data(self, data):
        if self.dataname.lower() == config.stl.lower():
            cat_idxs = pickle_load_data(os.path.join(self.model.selected_dir, "step-5-add-data.pkl"))
            self.model.add_data(cat_idxs, 3)
        else:
            None

    def add_data(self, added_idxs, cls):
        self.data.add_data(added_idxs, self.get_pred_labels(), cls)

    def add_new_categories(self, name, idxs=None):
        label = self.data.add_new_categories(name)
        if idxs is not None:
            labels = [label for i in idxs]
            self.data.label_instance(idxs, labels)
        self._training(rebuild=False, evaluate=True)

    def get_labels_dict(self):
        # m = self.data.get_new_id_map()
        rest_idx = self.data.rest_idxs
        labels = self.pred_dist.argmax(axis=1)
        assert len(rest_idx) == labels.shape[0]
        label_dict = {}
        for i in range(len(labels)):
            label_dict[rest_idx[i]] = labels[i]
        return label_dict