import numpy as np
import os
import abc
from scipy import sparse
from anytree import Node
from anytree.exporter import DictExporter
from scipy.stats import entropy
from tqdm import tqdm
from time import time

from sklearn.neighbors.unsupervised import NearestNeighbors

from application.views.utils.config_utils import config
from application.views.utils.helper_utils import pickle_save_data, json_load_data, \
    pickle_load_data, json_save_data, check_dir
from application.views.utils.log_utils import logger

from .model_helper import build_laplacian_graph

DEBUG = False


class Data(object):
    '''
    1. read data from buffer
    2. manage history state
    '''

    def __init__(self, dataname, labeled_num=None, total_num=None, seed=123):
        self.dataname = dataname
        self.data_root = os.path.join(config.data_root, self.dataname)

        self.X = None
        self.y = None
        self.train_idx = []
        self.valid_idx = []
        self.test_idx = []
        self.labeled_idx = []
        self.class_name = []
        self.removed_idxs = []
        self.processed_data = []

        self.selected_labeled_num = labeled_num
        self.selected_total_num = total_num
        self.seed = seed
        self.selected_dir = None
        self.rest_idxs = None
        self.model = None

        self._load_data()

        if self.dataname.lower() == config.oct.lower():
            new_test_data_path = os.path.join(self.data_root, "test_data.pkl")
            self.test_idx = pickle_load_data(new_test_data_path).reshape(-1)

        if self.dataname.lower() == config.stl.lower():
            new_id = [16394, 10254, 38934, 30743, 53275, 79903, 94247, 61484, 16430, 84015, 51251, 59454, 98367, 16453, 55367, 67665, 14418, 67668, 53334, 86104, 36959, 53345, 51299, 98406, 49265, 16502, 49276, 49278, 34942, 80003, 94345, 77963, 30863, 57489, 24723, 51350, 8347, 69801, 32941, 102577, 88246, 78007, 78011, 88257, 18627, 69833, 102601, 10443, 10448, 57553, 92375, 14557, 53472, 39146, 51436, 10486, 84217, 69885, 78079, 35076, 20766, 28961, 57634, 16679, 90419, 82228, 33081, 31036, 10557, 100673, 33096, 78154, 78155, 16716, 14670, 26959, 94544, 47439, 80216, 88414, 10599, 24935, 27000, 92547, 16774, 104844, 88466, 61846, 84377, 100761, 74140, 70045, 88477, 20895, 100768, 88481, 82339, 6565, 57766, 78246]
            self.test_idx = self.test_idx.tolist() + new_id
            self.y[np.array(new_id)] = 10            

    def _load_data(self):
        processed_data_filename = os.path.join(self.data_root, config.processed_dataname)
        processed_data = pickle_load_data(processed_data_filename)
        self.processed_data = processed_data
        self.X = processed_data[config.X_name]
        self.y = processed_data[config.y_name]
        self.y = np.array(self.y).astype(int)
        if self.dataname.lower() == "oct":
            # wrong label
            self.y[564] = 3


        self.train_idx = processed_data[config.train_idx_name]
        self.valid_idx = processed_data[config.valid_idx_name]
        self.test_idx = processed_data[config.test_idx_name]
        self.labeled_idx = processed_data[config.labeled_idx_name]
        self.unlabeled_idx = processed_data[config.unlabeled_idx_name]
        self.class_names = processed_data[config.class_name] #+["lizard", "snake"]
        self.add_info = processed_data[config.add_info_name]
        self.actions = []

        # if self.dataname.lower() == "stl":
        #     # self.y[]
        #     unlabeled_pred = pickle_load_data(os.path.join(self.data_root, "unlabeled_labels.pkl"))
        #     self.y[self.unlabeled_idx] = unlabeled_pred

        if self.selected_labeled_num is None and self.selected_total_num is None:
            self.selected_labeled_num = self.add_info.get("default_selected_labeled_num", None)
            self.selected_total_num = self.add_info.get("default_selected_total_num", None)
            self.seed = self.add_info.get("default_seed", 123)

        # produce unlabeled data
        assert (self.selected_labeled_num is not None and self.selected_total_num is not None)
        dir_name = "labeled-" + str(self.selected_labeled_num) + \
                   ".total-" + str(self.selected_total_num) + ".seed-" + str(self.seed)
        logger.info(dir_name)
        dir_path = os.path.join(self.data_root, dir_name)
        check_dir(dir_path)
        self.selected_dir = dir_path
        idx_info_path = os.path.join(dir_path, "idx_info.pkl")
        if os.path.exists(idx_info_path):
            logger.info("idx info exists in: {}".format(idx_info_path))
            idx_info = pickle_load_data(idx_info_path)
            self.train_idx = idx_info["train_idx"]
            self.selected_labeled_idx = idx_info["selected_labeled_idx"]
            if self.dataname.lower() == "stl":
                # relabel:
                removed_idx = [self.train_idx[39], self.train_idx[33]]
                added_idx = [self.train_idx[9081], self.train_idx[7427]]
                # removed_idx = [self.train_idx[39], self.train_idx[33]]
                # added_idx = [self.train_idx[2790], self.train_idx[5855]]
                tmp_labeled_idx = added_idx
                # added_idx = [self.train_idx[11146], self.train_idx[7683]]
                # tmp_labeled_idx = []
                for old_idx in self.selected_labeled_idx:
                    if old_idx not in removed_idx:
                        tmp_labeled_idx.append(old_idx)
                self.selected_labeled_idx = np.array(tmp_labeled_idx)

            self.rest_idxs = np.array(range(len(self.train_idx)))
            return
        #
        if len(self.labeled_idx) == self.selected_labeled_num:
            # self.selected_labeled_idx = self.labeled_idx
            selected_labeled_idx = np.array(self.labeled_idx)
            selected_labeled_idx.sort()
        else:
            # selected_labeled_idx = np.random.choice(self.labeled_idx, self.selected_labeled_num, replace=False)
            # class balance selection
            selected_labeled_num_in_each_class = np.zeros(len(self.class_names))
            class_num = len(selected_labeled_num_in_each_class)
            num_per_class = self.selected_labeled_num // class_num
            selected_labeled_num_in_each_class = (np.ones(class_num) * num_per_class).astype(int)
            rest_num = self.selected_labeled_num - num_per_class * class_num
            if rest_num > 0:
                idx = np.random.choice(class_num, rest_num, replace=False)
                selected_labeled_num_in_each_class[idx] += 1
            selected_labeled_idx = []
            labeled_y = self.y[self.labeled_idx]
            for i in range(class_num):
                labeled_idx_in_this_class = self.labeled_idx[labeled_y == i]
                selected_labeled_idx_in_this_class = \
                    np.random.choice(labeled_idx_in_this_class, selected_labeled_num_in_each_class[i], replace=False)
                selected_labeled_idx = selected_labeled_idx + selected_labeled_idx_in_this_class.tolist()
            selected_labeled_idx = np.array(selected_labeled_idx)
            selected_labeled_idx.sort()

        # get unlabeled idx
        rest_selected_labeled_num = self.selected_total_num - self.selected_labeled_num
        rest_selected_labeled_idx = np.random.choice(self.unlabeled_idx,
                                                     rest_selected_labeled_num,
                                                     replace=False)
        train_idx = np.hstack((selected_labeled_idx, rest_selected_labeled_idx))
        train_idx.sort()
        self.train_idx = train_idx
        self.selected_labeled_idx = selected_labeled_idx
        idx_info = {
            "selected_labeled_idx": selected_labeled_idx,
            "train_idx": train_idx
        }
        pickle_save_data(idx_info_path, idx_info)


    def case_set_rest_idxs(self):
        gt = self.get_train_ground_truth()
        self.rest_idxs = np.array(range(len(gt)))[gt != -1]
        print("rest_idxs len: ", len(self.rest_idxs))

    def get_rest_idxs(self):
        return self.rest_idxs.copy()

    def get_new_id_map(self):
        m = {}
        for i in range(len(self.rest_idxs)):
            m[self.rest_idxs[i]] = i
        return m

    def get_new_map_reverse(self):
        m = {}
        for i in range(len(self.rest_idxs)):
            m[i] = self.rest_idxs[i]
        return m

    def get_removed_idxs(self):
        return self.removed_idxs

    def get_train_num(self):
        return len(self.train_idx)

    def get_class_names(self):
        return self.class_names

    def get_train_X(self):
        return self.X[np.array(self.train_idx)].copy()[self.rest_idxs]

    def get_train_label(self):
        y = np.ones(self.X.shape[0]) * -1
        y[np.array(self.selected_labeled_idx)] = self.y[np.array(self.selected_labeled_idx)]
        y = y[np.array(self.train_idx)]
        # y[5300] = 5
        return y.astype(int)[self.rest_idxs]

    def get_full_train_X(self):
        return self.X[np.array(self.train_idx)].copy()

    def get_full_train_label(self):
        y = np.ones(self.X.shape[0]) * -1
        y[np.array(self.selected_labeled_idx)] = self.y[np.array(self.selected_labeled_idx)]
        y = y[np.array(self.train_idx)]
        return y.astype(int)

    def get_full_train_idx(self):
        return self.train_idx.copy()

    def get_train_idx(self):
        return self.train_idx.copy()[self.rest_idxs]

    def get_full_train_ground_truth(self):
        return self.y[np.array(self.train_idx)].copy().astype(int)

    def get_train_ground_truth(self):
        return self.y[np.array(self.train_idx)].copy().astype(int)[self.rest_idxs]

    def get_test_X(self):
        return self.X[np.array(self.test_idx)].copy()

    def get_test_ground_truth(self):
        return self.y[np.array(self.test_idx)].copy().astype(int)

    def remove_instance(self, idxs):
        if len(idxs) > 0:
            self.actions.append("remove-node")
        self.rest_idxs = np.array([i for i in self.rest_idxs if i not in idxs])
        self.removed_idxs += idxs
        logger.info("rest data: {}".format(len(self.rest_idxs)))

    def label_instance(self, idxs, labels):
        if len(idxs) > 0:
            self.actions.append("labeling")
        for i in range(len(idxs)):
            idx = idxs[i]
            label = labels[i]
            # self.train_y[idx] = label
            self.y[self.train_idx[idx]] = label
            self.selected_labeled_idx = np.append(self.selected_labeled_idx, self.train_idx[idx])
        # labeled_num = sum(self.train_y != -1)
        # logger.info("labeled data num: {}".format(labeled_num))

    def add_new_categories(self, name):
        self.class_names.append(name)
        return len(self.class_names) - 1

class GraphData(Data):
    def __init__(self, dataname, labeled_num=None, total_num=None, seed=123):
        super(GraphData, self).__init__(dataname, labeled_num, total_num, seed)

        self.max_neighbors = 2000
        self.affinity_matrix = None
        self.state_idx = 0
        self.state = {}
        self.state_data = {}
        self.current_state = None

        # init action trail
        self.state = Node("root")
        self.current_state = self.state

    def _preprocess_neighbors(self, rebuild=False, save=True):
        neighbors_model_path = os.path.join(self.selected_dir, "neighbors_model-step"+str(self.model.step)+".pkl")
        neighbors_path = os.path.join(self.selected_dir, "neighbors-step"+str(self.model.step)+".npy")
        neighbors_weight_path = os.path.join(self.selected_dir,
                                             "neighbors_weight-step"+str(self.model.step)+".npy")
        test_neighbors_path = os.path.join(self.selected_dir, "test_neighbors-step"+str(self.model.step)+".npy")
        test_neighbors_weight_path = os.path.join(self.selected_dir, "test_neighbors_weight-step"+str(self.model.step)+".npy")
        if os.path.exists(neighbors_model_path) and \
                os.path.exists(neighbors_path) and \
                os.path.exists(test_neighbors_path) and rebuild == False and DEBUG == False:
            logger.info("neighbors and neighbor_weight exist!!!")
            self.neighbors = np.load(neighbors_path)
            self.neighbors_weight = np.load(neighbors_weight_path)
            self.test_neighbors = np.load(test_neighbors_path)
            return
        logger.info("neighbors and neighbor_weight "
                    "do not exist, preprocessing!")
        train_X = self.get_full_train_X()
        train_num = train_X.shape[0]
        train_y = self.get_full_train_label()
        train_y = np.array(train_y)
        test_X = self.get_test_X()
        test_num = test_X.shape[0]
        self.max_neighbors = min(len(train_y), self.max_neighbors)
        logger.info("data shape: {}, labeled_num: {}"
                    .format(str(train_X.shape), sum(train_y != -1)))
        nn_fit = NearestNeighbors(7, n_jobs=-4).fit(train_X)
        logger.info("nn construction finished!")
        neighbor_result = nn_fit.kneighbors_graph(nn_fit._fit_X,
                                                  self.max_neighbors,
                                                  # 2,
                                                  mode="distance")
        test_neighbors_result = nn_fit.kneighbors_graph(test_X,
                                                        self.max_neighbors,
                                                        mode="distance")
        logger.info("neighbor_result got!")
        self.neighbors, self.neighbors_weight = self.csr_to_impact_matrix(neighbor_result,
                                                                     train_num, self.max_neighbors)
        self.test_neighbors, test_neighbors_weight = self.csr_to_impact_matrix(test_neighbors_result,
                                                                               test_num, self.max_neighbors)

        logger.info("preprocessed neighbors got!")

        # save neighbors information
        if save:
            pickle_save_data(neighbors_model_path, nn_fit)
            np.save(neighbors_path, self.neighbors)
            np.save(neighbors_weight_path, self.neighbors_weight)
            np.save(test_neighbors_path, self.test_neighbors)
            np.save(test_neighbors_weight_path, test_neighbors_weight)
        return self.neighbors, self.test_neighbors

    def csr_to_impact_matrix(self, neighbor_result, instance_num, max_neighbors):
        neighbors = np.zeros((instance_num, max_neighbors)).astype(int)
        neighbors_weight = np.zeros((instance_num, max_neighbors))
        for i in range(instance_num):
            start = neighbor_result.indptr[i]
            end = neighbor_result.indptr[i + 1]
            j_in_this_row = neighbor_result.indices[start:end]
            data_in_this_row = neighbor_result.data[start:end]
            sorted_idx = data_in_this_row.argsort()
            assert (len(sorted_idx) == max_neighbors)
            j_in_this_row = j_in_this_row[sorted_idx]
            data_in_this_row = data_in_this_row[sorted_idx]
            neighbors[i, :] = j_in_this_row
            neighbors_weight[i, :] = data_in_this_row
        return neighbors, neighbors_weight

    def get_graph(self, n_neighbor=None, rebuild=False):
        if self.affinity_matrix is None or rebuild is True:
            self._construct_graph(n_neighbor)
        n_components, labels = sparse.csgraph.connected_components(csgraph=self.affinity_matrix, return_labels=True)
        logger.info("n_components: {}".format(n_components))
        train_y = self.get_train_label()
        unp = []
        for i in range(n_components):
            y_in_this_component = train_y[labels==i]
            if not any(y_in_this_component > -1):
                idxs = self.get_rest_idxs()[labels==i]
                unp = unp + idxs.tolist()
        logger.info("connected components without labeled data - instance num: {}".format(len(unp)))
        return self.affinity_matrix.copy()

    def _construct_graph(self, n_neighbor=None, weight=False):
        # create neighbors buffer
        self._preprocess_neighbors()

        # # load neighbors information
        # neighbors_path = os.path.join(self.selected_dir, "neighbors.npy")
        # neighbors_weight_path = os.path.join(self.selected_dir,
        #                                      "neighbors_weight.npy")
        # neighbors = np.load(neighbors_path)
        # neighbors_weight = np.load(neighbors_weight_path)
        neighbors = self.neighbors
        neighbors_weight = self.neighbors_weight
        instance_num = neighbors.shape[0]
        train_y = self.get_train_label()
        train_y = np.array(train_y)
        self.train_y = train_y
        print("train_y", train_y.shape)

        # get knn graph in a csr form
        indptr = [i * n_neighbor for i in range(instance_num + 1)]
        logger.info("get indptr")
        indices = neighbors[:, :n_neighbor].reshape(-1).tolist()
        logger.info("get indices")
        if not weight:
            data = neighbors[:, :n_neighbor].reshape(-1)
            logger.info("get data")
            data = (data * 0 + 1.0).tolist()
        else:
            data = neighbors_weight[:, :n_neighbor].reshape(-1).tolist()
        logger.info("get data in connectivity")
        affinity_matrix = sparse.csr_matrix((data, indices, indptr),
                                            shape=(instance_num, instance_num))
        affinity_matrix = affinity_matrix + affinity_matrix.T
        affinity_matrix = sparse.csr_matrix((np.ones(len(affinity_matrix.data)).tolist(),
                                             affinity_matrix.indices, affinity_matrix.indptr),
                                            shape=(instance_num, instance_num))

        # affinity_matrix = self.correct_unconnected_nodes(affinity_matrix)
        logger.info("affinity_matrix construction finished!!")

        self.affinity_matrix = affinity_matrix

        return affinity_matrix

    def _find_unconnected_nodes(self, affinity_matrix, labeled_id):
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

    def correct_unconnected_nodes(self, affinity_matrix):
        logger.info("begin correct unconnected nodes...")
        np.random.seed(123)
        correted_nodes = []
        affinity_matrix = affinity_matrix.copy()
        labeled_ids = np.where(self.get_train_label() > -1)[0]
        iter_cnt = 0
        neighbors = self.get_neighbors(k_neighbors=100)
        while True:
            unconnected_ids = self._find_unconnected_nodes(affinity_matrix, labeled_ids)
            if unconnected_ids.shape[0] == 0:
                logger.info("No correcnted nodes after {} iteration. Correction finished.".format(iter_cnt))
                # debug: show how many edge is uncorrect
                gt = self.get_train_ground_truth()
                err_cnt = 0
                all_cnt = 0
                # np.save("./buffer/add_edges.npy", np.array(correted_nodes))
                # for source, target in correted_nodes:
                #     all_cnt += 1
                #     if gt[source] != gt[target]:
                #         err_cnt+=1
                # if all_cnt>0:
                #     logger.info("All:{}, Err:{}, Percent:{}".format(all_cnt, err_cnt, err_cnt/all_cnt))
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

    def get_neighbors_model(self):
        neighbors_model_path = os.path.join(self.selected_dir, "neighbors_model.pkl")
        if os.path.exists(neighbors_model_path):
            self._preprocess_neighbors()
        neighbors_model = pickle_load_data(neighbors_model_path)
        return neighbors_model

    def get_neighbors(self, k_neighbors = None, if_map = True):
        self._preprocess_neighbors()
        if k_neighbors is None:
            return self.neighbors[self.rest_idxs]
        else:
            m = self.get_new_id_map()
            new_neighbors = np.zeros((len(self.rest_idxs), k_neighbors), dtype=int)
            rest_dict = {}
            for id in self.rest_idxs:
                rest_dict[id] = True
            for i, row_neighbors in enumerate(self.neighbors[self.rest_idxs]):
                neighbor_cnt = 0
                for neighbor_id in row_neighbors:
                    if neighbor_id in rest_dict.keys():
                        # new_neighbors[i][neighbor_cnt] = m[neighbor_id]
                        if if_map:
                            new_neighbors[i][neighbor_cnt] = m[neighbor_id]
                        else:
                            new_neighbors[i][neighbor_cnt] = neighbor_id
                        neighbor_cnt += 1
                        if neighbor_cnt == k_neighbors:
                            break
            return new_neighbors

    def record_state(self, pred):
        new_state = Node(self.state_idx, parent=self.current_state)
        self.state_idx = self.state_idx + 1
        self.current_state = new_state
        self.state_data[self.current_state.name] = {
            "affinity_matrix": self.affinity_matrix.copy(),
            "train_idx": self.get_train_idx(),
            "train_y": self.get_train_label(),
            "selected_labeled_idx": self.selected_labeled_idx,
            "state": self.current_state,
            "pred": pred,
            "actions": list(set(self.actions))
        }
        self.print_state()

    # this function is for DEBUG
    def print_state(self):
        dict_exporter = DictExporter()
        tree = dict_exporter.export(self.state)
        print(tree)
        print("current state:", self.current_state.name)

    def return_state(self):
        t0 = time()
        max_count = 1
        history = []
        for i in range(self.state_idx):
            data = self.state_data[i]
            margin = entropy(data["pred"].T + 1e-20).mean()
            margin = round(margin, 3)
            # get changes
            dist = [0, 0, 0, 0]
            change_idx = np.array([])
            pre_data_state = data["state"].parent
            if pre_data_state.name != "root":
                pre_data = self.state_data[pre_data_state.name]
                now_affinity = data["affinity_matrix"]
                pre_affinity = pre_data["affinity_matrix"]
                # # added edges
                # dist[0] = (now_affinity[pre_affinity == 0] == 1).sum()
                # # removed edges
                # dist[1] = (now_affinity[pre_affinity == 1] == 0).sum()
                # edge changes
                # for adding data
                min_len = pre_affinity.shape[0]
                if now_affinity.shape[0] < pre_affinity.shape[0]:
                    min_len = now_affinity.shape[0]
                dist[0] = ((now_affinity[:min_len, :min_len] 
                    + pre_affinity[:min_len, :min_len]) == 1).sum()
                # added labels
                dist[1] = sum(data["train_y"] != -1) - sum(pre_data["train_y"] != -1)
                # removed instances
                dist[2] = len(data["train_idx"]) - len(pre_data["train_idx"])
                # label changes
                pre_label = pre_data["pred"].argmax(axis=1)
                pre_label[pre_data["pred"].max(axis=1) == 0] = -1
                label = data["pred"].argmax(axis=1)
                label[data["pred"].max(axis=1) == 0] = -1
                pre_label_dict = {}
                change_idx = []
                for j,idx in enumerate(pre_data["train_idx"]):
                    pre_label_dict[idx] = pre_label[j]
                for j,idx in enumerate(data["train_idx"]):
                    if idx not in pre_label_dict.keys():
                        continue
                    if pre_label_dict[idx] != label[j]:
                        change_idx.append(j)


                dist[3] = len(change_idx)
                change_idx = np.array(change_idx)
            dist = [int(k) for k in dist]

            # remove other dists
            dist = [dist[3]]
            # update max_count
            if max(dist) > max_count:
                max_count = max(dist)
            children = data["state"].children
            children_idx = [int(i.name) for i in children]
            history.append({
                "dist": dist,
                "margin": margin,
                "children": children_idx,
                "id": i,
                "change_idx": change_idx.tolist(),
                "actions": data["actions"]
            })

        # update dist
        for i in range(self.state_idx):
            state = history[i]
            unnorm_dist = state["dist"].copy()
            state["dist"] = [i / max_count for i in unnorm_dist]
            state["unnorm_dist"] = unnorm_dist
        print("return state time cost: ", time() - t0)
        return {
            "history": history,
            "current_id": int(self.current_state.name)
        }

    def change_state(self, id):
        state = self.state_data[id]["state"]
        self.current_state = state
        data = self.state_data[self.current_state.name]
        self.affinity_matrix = data["affinity_matrix"]
        self.train_idx = data["train_idx"]
        self.selected_labeled_idx = data["selected_labeled_idx"]
        self.print_state()
        return self.return_state()

    def get_test_neighbors(self, k_neighbors = 100):
        self._preprocess_neighbors()
        new_neighbors = np.zeros((len(self.test_neighbors), k_neighbors), dtype=int)
        rest_dict = {}
        m = self.get_new_id_map()
        for id in self.rest_idxs:
            rest_dict[id] = True
        for i, row_neighbors in enumerate(self.test_neighbors):
            neighbor_cnt = 0
            for neighbor_id in row_neighbors:
                if neighbor_id in rest_dict.keys():
                    new_neighbors[i][neighbor_cnt] = m[neighbor_id]
                    neighbor_cnt += 1
                    if neighbor_cnt == k_neighbors:
                        break
        return new_neighbors

    def add_edge(self, removed_edges):
        for edges in removed_edges:
            s, e = edges
            self.affinity_matrix[s, e] = 1
            self.affinity_matrix[e, s] = 1

    def remove_edge(self, removed_edges):

        print("removed edges:", removed_edges)

        if len(removed_edges) > 0:
            self.actions.append("remove-edge")
        m = self.get_new_id_map()
        for edges in removed_edges:
            s, e = edges
            s = m[s]
            e = m[e]
            self.affinity_matrix[s, e] = 0
            self.affinity_matrix[e, s] = 0

    def editing_data(self, data):
        self.actions = []
        self.remove_instance(data["deleted_idxs"])
        self.label_instance(data["labeled_idxs"], data["labels"])
        self.remove_edge(data["deleted_edges"])

    def add_data(self, added_idxs, train_pred, cls):
        self.actions.append("add-unlabeled")
        added_idxs = np.array(added_idxs).reshape(-1)

        added_false_idxes = [i for i in range(len(self.train_idx), len(self.train_idx)+len(added_idxs))]

        self.rest_idxs = self.rest_idxs.tolist() + added_false_idxes
        self.train_idx = np.hstack((self.train_idx, added_idxs))
        self.rest_idxs = np.array(self.rest_idxs)
        m = self.get_new_id_map()

        pre_num = self.affinity_matrix.shape[0]
        add_num = len(added_idxs)
        total_num = pre_num + add_num
        add_data_neighbors_path = os.path.join(self.selected_dir, "add_data_neighbors.pkl")
        add_data_test_neighbors_path = os.path.join(self.selected_dir, "add_data_test_neighbors.pkl")
        if os.path.exists(add_data_neighbors_path) and os.path.exists(add_data_test_neighbors_path):
            neighbors = pickle_load_data(add_data_neighbors_path)
            test_neighbors = pickle_load_data(add_data_test_neighbors_path)
        else:
            neighbors, test_neighbors = self._preprocess_neighbors(rebuild=True, save=False)
            pickle_save_data(add_data_neighbors_path, neighbors)
            pickle_save_data(add_data_test_neighbors_path, test_neighbors)
        self.neighbors = neighbors
        neighbors = self.get_neighbors(k_neighbors=10)
        self.test_neighbors = test_neighbors
        new_affinity_matrix  = np.zeros((pre_num + add_num, pre_num + add_num))
        new_affinity_matrix[:pre_num, :pre_num] = self.affinity_matrix.toarray()
        for i in range(pre_num, pre_num + add_num):
            nei_idxs = neighbors[i, 1:6]
            for idx in nei_idxs:
                if idx >= len(train_pred) or train_pred[idx] == cls:
                    new_affinity_matrix[i, idx] = 1
                    new_affinity_matrix[idx, i] = 1
        new_affinity_matrix = sparse.csr_matrix(new_affinity_matrix)
        self.affinity_matrix = self.correct_unconnected_nodes(new_affinity_matrix)
        # self.affinity_matrix = new_affinity_matrix

    def add_data_oct(self, added_idxs, train_pred, cls):
        added_idxs = np.array(added_idxs).reshape(-1)
        self.train_idx = np.hstack((self.train_idx, added_idxs))
        self.rest_idxs = np.array(range(len(self.train_idx)))

        pre_num = self.affinity_matrix.shape[0]
        add_num = len(added_idxs)
        total_num = pre_num + add_num
        add_data_neighbors_path = os.path.join(self.selected_dir, "add_data_neighbors.pkl")
        add_data_test_neighbors_path = os.path.join(self.selected_dir, "add_data_test_neighbors.pkl")
        if os.path.exists(add_data_neighbors_path) and os.path.exists(add_data_test_neighbors_path):
            neighbors = pickle_load_data(add_data_neighbors_path)
            test_neighbors = pickle_load_data(add_data_test_neighbors_path)
        else:
            neighbors, test_neighbors = self._preprocess_neighbors(rebuild=True, save=False)
            pickle_save_data(add_data_neighbors_path, neighbors)
            pickle_save_data(add_data_test_neighbors_path, test_neighbors)
        self.neighbors = neighbors
        new_affinity_matrix  = np.zeros((pre_num + add_num, pre_num + add_num))
        new_affinity_matrix[:pre_num, :pre_num] = self.affinity_matrix.toarray()
        for i in range(pre_num, pre_num + add_num):
            nei_idxs = neighbors[i, 1:100]
            count = 0
            for idx in nei_idxs:
                # if idx >= len(train_pred) or self.get_train_ground_truth()[idx] == cls:
                if idx >= len(train_pred) or train_pred[idx] == cls:
                    new_affinity_matrix[i, idx] = 1
                    new_affinity_matrix[idx, i] = 1
                    count += 1
                if count > 3:
                    break
        new_affinity_matrix = sparse.csr_matrix(new_affinity_matrix)
        self.affinity_matrix = self.correct_unconnected_nodes(new_affinity_matrix)
        # self.affinity_matrix = new_affinity_matrix


    def update_graph(self, deleted_idxs):
        logger.info("begin update graph according to editing info")
        rest_idxs = self.get_rest_idxs()
        remove_idxs = self.get_removed_idxs()
        assert len(set(rest_idxs.copy().tolist()).intersection(set(deleted_idxs))) == 0
        last_rest_idxs = np.sort(rest_idxs.copy().tolist()+deleted_idxs)
        last_map = {}
        for i in range(len(last_rest_idxs)):
            last_map[last_rest_idxs[i]] = i
        rest_idxs = [last_map[idx] for idx in rest_idxs]


        logger.info("total len: {}".format(len(rest_idxs) + len(remove_idxs)))
        self.affinity_matrix = self.affinity_matrix[rest_idxs, :]
        self.affinity_matrix = self.affinity_matrix[:, rest_idxs]
        # update neighbors info
        self._preprocess_neighbors()


        logger.info("affinity_matrix shape after updating: {}".format(str(self.affinity_matrix.shape)))



