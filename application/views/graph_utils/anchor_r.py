import numpy as np
import numpy.random as random
import os
from sklearn.cluster import KMeans
import pickle
from scipy.spatial import distance_matrix
from matplotlib import pyplot as plt
import math
import time
from scipy.stats import entropy
import math
from sklearn.metrics import pairwise_distances
from sklearn.neighbors import LocalOutlierFactor

from ..utils.config_utils import config
from ..utils.log_utils import logger
from ..graph_utils.IncrementalTSNE import IncrementalTSNE
from ..graph_utils.ConstraintTSNE import ConstraintTSNE
from ..graph_utils.DensityBasedSampler import DensityBasedSampler
from ..graph_utils.BlueNoiseSampler import BlueNoiseSampC as BlueNoiseSampler
from sklearn.manifold import TSNE
from ..graph_utils.RandomSampler import random_sample
from sklearn.neighbors import BallTree
from ..graph_utils.aggregation import Aggregation
from ..utils.helper_utils import *



class Anchors:
    def __init__(self):
        # path value
        self.hierarchy_info_path = None
        # # added by Changjian
        self.tsne_path = None
        self.matrix_path = None
        
        # model
        self.model = None
        self.data = None

        # variables
        self.tsne = None
        self.full_x = None
        self.margin = None
        self.old_nodes_id = []
        self.old_nodes_tsne = None
        self.hierarchy_info = None
        self.remove_ids = []
        self.data_degree = None
        self.home = None
        self.last_level = 0
        self.entropy = None
        self.rotate_matrix = np.array([[1,0],[0,1]])
        self.aggregate = Aggregation()
        self.labeled_matrix = None
        self.step = 0
        self.labeled_idx_map = None

    # added by Changjian
    # link this class to SSLModel and Data
    def link_model(self, sslmodel):
        self.model = sslmodel
        self.data = sslmodel.data
        self.selected_dir = self.model.data.selected_dir
        if config.use_add_tsne:
            self.hierarchy_info_path = os.path.join(self.selected_dir, "add_hierarchy_info" + config.pkl_ext)
            self.tsne_path = os.path.join(self.selected_dir, "add_tsne.npy")
        else:
            self.hierarchy_info_path = os.path.join(self.selected_dir, "hierarchy_info" + config.pkl_ext)
            self.tsne_path = os.path.join(self.selected_dir, "tsne.npy")
        print("tsne path:{}".format(self.tsne_path))
        self.matrix_path = os.path.join(self.selected_dir, "matrix.npy")
        self.full_x = self.data.get_full_train_X()
        self.old_nodes_id = []
        self.old_nodes_tsne = None
        self.entropy = None
        self.margin = None
        self.tsne = None
        self.hierarchy_info = None
        self.data_degree = None
        self.wh = 1
        self.rotate_matrix = np.array([[1,0],[0,1]])
        self.labeled_matrix = None
        self.labeled_idx_map = None
        self.step = False

    def get_pred_labels(self):
        labels = self.model.get_pred_labels()
        bins = np.bincount(labels + 1)
        print(bins)
        return labels

    def get_train_x_tsne(self):
        self.tsne_path = os.path.join(self.selected_dir, "tsne-step"+str(self.step)+".npy")
        print("test**************************", self.tsne_path)
        assert os.path.exists(self.tsne_path), self.tsne_path
        self.tsne = np.load(self.tsne_path)
        self.tsne = np.round(self.tsne, 2)
        return self.tsne
        # if os.path.exists(self.tsne_path):
        #     self.tsne = np.load(self.tsne_path)
        #     self.tsne = np.round(self.tsne, 2)
        #     return self.tsne
        # else:
        #     self.init_train_x_tsne()
        #     self.tsne = np.round(self.tsne, 2)
        #     return self.tsne

    def init_train_x_tsne(self):
        logger.info("begin tsne init")
        train_x = self.data.get_full_train_X()
        train_y = self.data.get_train_label()
        train_y_final = self.get_pred_labels()
        np.save("train_x.npy", train_x)
        np.save("train_y_final.npy", train_y_final)
        np.save("train_y.npy", train_y)
        # self.tsne = IncrementalTSNE(n_components=2, verbose=True, init="random",
        #                                 early_exaggeration=1).fit_transform(train_x, labels=train_y_final,
        #                                                                 label_alpha=0.3)
        self.tsne = TSNE(n_components=2, verbose=True, init="random",
                                    early_exaggeration=1).fit_transform(train_x)
        np.save(self.tsne_path, self.tsne)
        logger.info("finish tsne init")

    def tsne_evaluation(self, train_x_tsne):
        logger.info("begin tsne evaluation")
        # self.wait_for_simplify()
        node_num = train_x_tsne.shape[0]
        influence_matrix = self.data.get_graph()
        all_distance = 0
        indptr = influence_matrix.indptr
        indices = influence_matrix.indices
        for i in range(node_num):
            begin = indptr[i]
            end = indptr[i + 1]
            for j in indices[begin:end]:
                all_distance += np.linalg.norm(train_x_tsne[i] - train_x_tsne[j], 2)
        logger.info("finish tsne evaluation")
        print("Edge length sum:", all_distance)

    def wait_for_simplify(self):
        logger.info("waiting for simplify...")
        while not self.model.simplification_end():
            True
        logger.info("simplify end")

    def get_hierarchical_sampling(self):
        self.hierarchy_info_path = self.hierarchy_info_path = os.path.join(self.selected_dir, "hierarchy_info-step" + str(self.step) + config.pkl_ext)
        # assert os.path.exists(self.hierarchy_info_path)
        # with open(self.hierarchy_info_path, "rb") as f:
        #     self.hierarchy_info = pickle.load(f)
        if os.path.exists(self.hierarchy_info_path):
            with open(self.hierarchy_info_path, "rb") as f:
                self.hierarchy_info = pickle.load(f)
        else:
            if self.margin == None:
                self.margin = self.get_margin(self.model.process_data)
            hierarchical_info = self.construct_hierarchical_sampling(self.full_x, self.margin, target_num=1000)
            with open(self.hierarchy_info_path, "wb") as f:
                pickle.dump(hierarchical_info, f)
            self.hierarchy_info = hierarchical_info
        return self.hierarchy_info

    def construct_hierarchical_sampling(self, train_x: np.ndarray, entropy: np.ndarray, target_num: int):
        logger.info("construct hierarchical sampling")
        node_num = train_x.shape[0]
        min_rate = 0.25

        sampling_scale = node_num / target_num
        levels_number = int(math.ceil(math.log(sampling_scale, 1 / min_rate))) + 1

        level_infos = [{} for i in range(levels_number)]
        level_infos[-1]['index'] = np.array(range(node_num))
        level_infos[-1]['next'] = None

        number_scale_each_level = sampling_scale ** (1.0 / (levels_number - 1))
        sample_number = node_num

        all_labeled_idx = np.where(self.data.get_full_train_label() > -1)[0]
        level_labeled_selection = np.where(self.data.get_full_train_label() > -1)[0]
        mat, _ = self.get_labeled_matrix()
        # get min dis:
        mat = mat.flatten()
        mat = mat[mat>1e-4]
        min_dis = np.min(mat) * self.model.config["sampling_min_dis"]
        level_unlabeled_selection = np.array(list(filter(lambda id: id not in all_labeled_idx, np.arange(node_num))))
        logger.info("level num:{}".format(levels_number))
        for level_id in range(levels_number - 2, -1, -1):
            sample_number = round(sample_number / number_scale_each_level)
            if level_id == 0:
                sample_number = target_num
            logger.info("Level:{}, Sampling number:{}".format(level_id, sample_number))
            sampler = DensityBasedSampler(n_samples=sample_number, beta=0.25)
            last_selection = level_unlabeled_selection
            tmp_selection = sampler.fit_sample(data=train_x[last_selection], return_others=False,
                                                 mixed_degree=1-entropy[last_selection])
            level_unlabeled_selection = last_selection[tmp_selection]
            logger.info("construct ball tree...")
            min_dis *= 2
            level_labeled_selection = self.labeled_sampling(level_labeled_selection, min_dis)
            print("level {}, labeled data selection length:{}".format(level_id, level_labeled_selection.shape[0]))
            level_selection = np.append(level_labeled_selection, level_unlabeled_selection)
            tree = BallTree(train_x[level_selection])
            neighbors_nn = tree.query(train_x[level_infos[level_id+1]['index']], 1, return_distance=False)
            level_next = [[] for next_id in range(level_selection.shape[0])]
            for index_id, index in enumerate(neighbors_nn.reshape(-1)):
                level_next[index].append(index_id)
            level_infos[level_id] = {
                'index': level_selection,
                'next': level_next
            }

        return level_infos

    def get_hierarchy_children(self, idxs):
        hierarchy_info = self.get_hierarchical_sampling()
        res = list(idxs)
        max_level = len(hierarchy_info)-1
        for level in range(max_level):
            cur_level_nodes_id = list(hierarchy_info[level]["index"])
            cur_level_nodes_next = hierarchy_info[level]["next"]
            adds = []
            for id in res:
                if id in cur_level_nodes_id:
                    # print([cur_level_nodes_next[cur_level_nodes_id.index(id)]])
                    adds += hierarchy_info[level+1]["index"][cur_level_nodes_next[cur_level_nodes_id.index(id)]].tolist()
            res = list(set(res) | set(adds))
        return np.array(res)

    def get_margin(self, process_data):
        iter_num = process_data.shape[0]
        node_num = process_data.shape[1]
        entropy = np.ones((node_num))
        logger.info("get entropy")
        for i in range(node_num):
            sort_res = process_data[iter_num - 1][i][np.argsort(process_data[iter_num - 1][i])[-2:]]
            entropy[i] = sort_res[1] - sort_res[0]
        logger.info("finish entropy")
        return entropy

    def get_entropy(self):
        self.entropy = entropy(self.model.pred_dist.T+1e-20)
        self.entropy = np.clip(self.entropy, 0, 10000)
        self.entropy /= np.max(self.entropy)
        return self.entropy

    def get_labeled_matrix(self):
        if self.labeled_matrix is None:
            labeled_data = np.where(self.data.get_full_train_label() > -1)[0]
            self.labeled_idx_map = {}
            for i, id in enumerate(labeled_data):
                self.labeled_idx_map[id] = i
            nodes = self.tsne[labeled_data]
            self.labeled_matrix = np.clip(pairwise_distances(nodes), 1e-4, 1e4)
        return self.labeled_matrix, self.labeled_idx_map

    def labeled_sampling(self, ids, min_dis):
        mat, labeled_map = self.get_labeled_matrix()
        select_ids = []
        remain_ids = ids
        train_labels = self.data.get_full_train_label()
        while remain_ids.shape[0] > 0:
            select_id = np.random.choice(remain_ids)
            ok = True
            for chosen_id in select_ids:
                if mat[labeled_map[select_id]][labeled_map[chosen_id]] < min_dis and train_labels[select_id] == train_labels[chosen_id]:
                    ok = False
                    break
            if ok:
                select_ids.append(select_id)
            remain_ids = remain_ids[remain_ids != select_id]
        return np.array(select_ids)

    def get_data_area(self, ids = None, train_x_tsne = None):
        assert ids is not None or train_x_tsne is not None
        if ids is not None:
            data = self.tsne[ids]
        else:
            data = train_x_tsne
        min_x = float(np.min(data[:,0]))
        min_y = float(np.min(data[:,1]))
        max_x = float(np.max(data[:,0]))
        max_y = float(np.max(data[:,1]))
        area = {
            "x": min_x,
            "y": min_y,
            "width": max_x-min_x,
            "height": max_y-min_y
        }
        return area

    def get_data_selection(self, area, level, must_have_nodes):
        logger.info("selecting data...")
        # get level info
        if self.hierarchy_info is None:
            level_infos = self.get_hierarchical_sampling()
        else:
            level_infos = self.hierarchy_info

        # get data
        train_x = self.full_x
        train_x_tsne = self.tsne

        # get old data
        old_nodes_ids = self.old_nodes_id
        old_nodes_tsne = self.old_nodes_tsne

        # get new graph
        if level >= len(level_infos):
            level = len(level_infos) - 1

        if level == 0:
            _selection = level_infos[level]['index']
        elif level != len(level_infos)-1 or self.last_level != len(level_infos)-1:
            _selection = []
            last_level = level_infos[level-1]['index']
            last_next = level_infos[level-1]['next']
            last_pos = train_x_tsne[last_level]
            tmp_cnt = 0
            for i, ind in enumerate(last_level):
                if int(ind) in old_nodes_ids:
                    pos = old_nodes_tsne[old_nodes_ids.index(int(ind))]
                else:
                    pos = last_pos[i]
                if area['x'] <= pos[0] <= area['x'] + area['width'] and area['y'] <= pos[1] <= area['y'] + area[
                    'height']:
                    tmp_cnt+=1
                    _selection += level_infos[level]["index"][last_next[i]].tolist()
        else:
            _selection = level_infos[level]['index']
        self.last_level = level
        tmp_selection = []
        tmp_cnt = 0
        for ind in _selection:
            if int(ind) in old_nodes_ids:
                idx = old_nodes_ids.index(int(ind))
                pos = old_nodes_tsne[idx]
            else:
                pos = train_x_tsne[ind]
            if area['x'] <= pos[0] <= area['x'] + area['width'] and area['y'] <= pos[1] <= area['y'] + area[
                'height']:
                tmp_cnt += 1
                tmp_selection.append(ind)
        _selection = tmp_selection

        selection = []
        new_nodes = []
        for i, ind in enumerate(_selection):
                if int(ind) in old_nodes_ids:
                    selection.append(int(ind))
                else:
                    new_nodes.append(int(ind))

        for node_id in must_have_nodes:
            if int(node_id) not in selection:
                if int(node_id) in old_nodes_ids:
                    selection.append(int(node_id))
                else:
                    new_nodes.append(int(node_id))

        for id in self.remove_ids:
            if id in selection:
                selection.remove(id)
            if id in new_nodes:
                new_nodes.remove(id)
        old_cnt = len(selection)
        # add must_have_nodes
        selection = list(dict.fromkeys(selection + new_nodes))
        return selection, old_cnt

    def re_tsne(self, selection, fixed_cnt = 0):
        logger.info("re tsne")
        # get data
        train_x = self.full_x
        train_x_tsne = self.tsne

        # get old data
        old_nodes_ids = self.old_nodes_id
        old_nodes_tsne = self.old_nodes_tsne

        samples_x = train_x[selection]
        init_samples_x_tsne = np.copy(train_x_tsne[selection])

        for i in range(fixed_cnt):
            init_samples_x_tsne[i] = old_nodes_tsne[old_nodes_ids.index(selection[i])]
        samples_x_tsne = IncrementalTSNE(n_components=2, n_jobs=20, init=init_samples_x_tsne, n_iter=250,
                                         exploration_n_iter=0).fit_transform(samples_x,
                                                                             skip_num_points=fixed_cnt)
        logger.info("tsne done")
        return samples_x_tsne

    def get_init_tsne(self, selection):
        return self.tsne[selection]

    def get_rotate_matrix(self, tsne, wh):
        logger.info("begin rotate matrix")
        best_wh = -100
        if os.path.exists(self.matrix_path):
            logger.info("rotate matrix already exists.")
            self.rotate_matrix = np.load(self.matrix_path)
        else:
            logger.info("rotate matrix not exists. Caculating...")
            for degree in range(360):
                rad = math.pi*degree/180
                matrix = np.array([[np.cos(rad), -np.sin(rad)], [np.sin(rad), np.cos(rad)]])
                pos = np.dot(tsne, matrix)
                area = self.get_data_area(train_x_tsne=pos)
                new_wh = area["width"]/area["height"]
                if np.abs(new_wh-wh)<np.abs(best_wh-wh):
                    best_wh = new_wh
                    self.rotate_matrix = matrix
            np.save(self.matrix_path, self.rotate_matrix)
            logger.info("finish rotate matrix:{}, wh={}".format(self.rotate_matrix, best_wh))

    def computer_local_outlier(self, data, labels, label_cnt = 11):
        all_outliers = []
        for label in range(label_cnt):
            ids = np.where(labels == label)[0]
            label_data = data[ids]
            if len(label_data) == 0:
                continue
            lof = LocalOutlierFactor(contamination=0.1)
            flag = lof.fit_predict(label_data)
            outlier_ids = ids[np.where(flag==-1)[0]]
            all_outliers += outlier_ids.tolist()
        return all_outliers

    def get_outlier(self, data, labels, label_cnt = 11):
        # outlier_path = os.path.join(self.model.data.selected_dir, "outliers.pkl")
        # if os.path.exists(outlier_path):
        #     return pickle_load_data(outlier_path)
        # else:
        all_outliers = self.computer_local_outlier(data, labels, label_cnt)
        # pickle_save_data(outlier_path, all_outliers)
        return all_outliers


    def get_nodes(self, wh, step):
        self.step = step
        self.remove_ids = self.model.data.get_removed_idxs()
        self.tsne = self.get_train_x_tsne()
        # reset rotate matrix
        self.get_rotate_matrix(self.tsne, wh)
        self.tsne = np.dot(self.tsne, self.rotate_matrix)
        self.hierarchy_info = self.get_hierarchical_sampling()
        for level in self.hierarchy_info:
            level["index"] = level["index"].tolist()
        selection = np.array(self.hierarchy_info[0]["index"]).tolist()
        all_node_num = len(self.tsne)
        print(all_node_num)
        for id in self.remove_ids:
            if id in selection:
                selection.remove(id)
        # TODO  2020.2.15 change to init tsne
        # tsne = self.re_tsne(selection)
        selection = np.arange(0, all_node_num)
        tsne = self.get_init_tsne(selection)

        # get outlier
        _top_level = np.array(self.hierarchy_info[0]["index"])
        _top_level = list(set(_top_level.tolist()).intersection(set(self.model.data.rest_idxs.tolist())))
        top_level = np.array(_top_level, dtype=int)
        m = self.model.data.get_new_id_map()
        m_toplevel = np.array([m[id] for id in _top_level], dtype=int)
        outliers = self.get_outlier(tsne[top_level], self.model.get_pred_labels()[m_toplevel])
        outliers = top_level[outliers].tolist()
        print("outliers:{}".format(outliers))

        selection = selection[self.model.data.rest_idxs]
        tsne = tsne[selection]


        self.old_nodes_id = selection
        self.old_nodes_tsne = tsne
        graph = self.convert_to_dict(selection, tsne)
        graph["area"] = self.get_data_area(train_x_tsne=tsne)
        self.home = graph
        self.home_tsne = self.old_nodes_tsne
        self.home_tsne_ids = self.old_nodes_id
        self.last_level = 0
        # self.aggregate.aggregate(self.full_x[self.home_tsne_ids], k=np.unique(self.model.get_pred_labels()[self.home_tsne_ids]).shape[0])
        # self.aggregate.reset_labels(self.model.get_pred_labels()[self.home_tsne_ids])
        # aggregate = {}
        # for i, label in enumerate(self.aggregate.labels.tolist()):
        #     aggregate[self.home_tsne_ids[i]] = label
        # graph["aggregate"] = aggregate
        return {
            "graph":graph,
            "hierarchy":self.hierarchy_info,
            "outliers":outliers,
            "rest_idxs": self.model.data.rest_idxs.tolist()
        }

    def rotate_area(self, area):
        area_matrix = np.array([[area["x"], area["y"]], [area["x"]+area["width"], area["y"]+area["height"]]])
        new_area_matrix = np.dot(np.linalg.inv(self.rotate_matrix), area_matrix)
        return {
            "x":new_area_matrix[0][0],
            "y":new_area_matrix[0][1],
            "width":new_area_matrix[1][0]-new_area_matrix[0][0],
            "height":new_area_matrix[1][1]-new_area_matrix[0][1]
        }

    def update_nodes(self, area, level, must_show_nodes = []):
        t0 = time.time()
        # area = self.rotate_area(area)
        self.remove_ids = self.model.data.get_removed_idxs()
        selection, old_cnt = self.get_data_selection(area, level, must_show_nodes)

        tsne = self.get_init_tsne(selection)

        self.old_nodes_id = selection
        self.old_nodes_tsne = tsne
        graph = self.convert_to_dict(selection, tsne)
        graph["area"] = self.get_data_area(train_x_tsne=tsne)
        print("update nodes time:", time.time() - t0)
        return graph

    def get_home(self):
        self.old_nodes_id = self.home_tsne_ids
        self.old_nodes_tsne = self.home_tsne
        return self.home

    def convert_to_dict(self, selection, tsne):
        use_buffer = True
        logger.info("convert to dict")
        graph_path = os.path.join(self.selected_dir, "graph-step" + str(self.step) + ".json")
        if os.path.exists(graph_path) and use_buffer:
            graph = json_load_data(graph_path)
            return graph
        propagation_path_from = self.model.propagation_path_from
        propagation_path_to = self.model.propagation_path_to
        if self.model.influence_matrix is None:
            self.model._influence_matrix(rebuild=False)
        influence_matrix = self.model.influence_matrix.copy()
        # influence_matrix[np.isnan(influence_matrix)] = 0
        influence_matrix.data /= (influence_matrix.data.max() + 1e-20)
        influence_matrix.data[np.isnan(influence_matrix.data)] = 0
        ground_truth = self.model.data.get_full_train_ground_truth()
        samples_truth = ground_truth[selection]
        consistency = self.model.get_train_neighbors_consistency(n_neighbor=6).tolist()
        try:
            pre_labels = self.model.pre_labels
        except:
            pre_labels = self.model.pred_dist.argmax(axis=1)
        if self.data_degree is None:
            self.data_degree = self.model.get_in_out_degree(self.data.get_graph())
        degree = self.data_degree
        m = self.data.get_new_id_map()
        m_reverse = self.data.get_new_map_reverse()
        self.entropy = self.get_entropy()
        # selection = [m[i] for i in selection]
        def mapfunc(id):
            return int(m_reverse[id])
        labels = self.model.labels
        process_data = self.model.process_data

        samples_x_tsne = np.round(tsne, 2).tolist()
        samples_truth = samples_truth.tolist()
        samples_nodes = {}
        sample_num = len(selection)
        # for i in range(sample_num):
        #     id = int(selection[i])
        #     iter_num = process_data.shape[0]
        #     scores = [[score if score>0 else 0  for score in np.round(process_data[j][m[id]], 2).tolist()] for j in range(iter_num)]
        #     samples_nodes[id] = {
        #         "id": id,
        #         "x": samples_x_tsne[i][0],
        #         "y": samples_x_tsne[i][1],
        #         "label": labels[:,m[id]].tolist(),
        #         "score": scores,
        #         "truth": samples_truth[i],
        #         "from":list(map(mapfunc, propagation_path_from[m[id]])),
        #         "to": list(map(mapfunc, propagation_path_to[m[id]])),
        #         "in_degree": int(degree[m[id]][1]),
        #         "out_degree": int(degree[m[id]][0]),
        #         "entropy": float(self.entropy[m[id]]),
        #         "consistency": int(consistency[m[id]]),
        #         "from_weight":[],
        #         "to_weight":[]
        #     }
        #     for from_edge in samples_nodes[id]["from"]:
        #         samples_nodes[id]["from_weight"].append(float(np.round(influence_matrix[m[id], m[from_edge]], 7)))
        #     for to_edge in samples_nodes[id]["to"]:
        #         samples_nodes[id]["to_weight"].append(float(np.round(influence_matrix[m[to_edge], m[id]], 7)))
        simple_nodes = {}
        for i in range(sample_num):
            id = int(selection[i])
            iter_num = process_data.shape[0]
            scores = [[[i,score] for i,score in enumerate(np.round(process_data[j][m[id]], 2).tolist()) if score>0] for j in range(iter_num)]
            simple_nodes[id] = [
                id,
                samples_x_tsne[i][0],
                samples_x_tsne[i][1],
                labels[:,m[id]].tolist(),
                scores,
                samples_truth[i],
                list(map(mapfunc, propagation_path_from[m[id]])),
                list(map(mapfunc, propagation_path_to[m[id]])),
                int(degree[m[id]][1]),
                int(degree[m[id]][0]),
                float(self.entropy[m[id]]),
                int(consistency[m[id]]),
                [],
                [],
                int(0),
            ]
            for from_edge in simple_nodes[id][6]:
                simple_nodes[id][12].append(float(np.round(math.pow(influence_matrix[m[id], m[from_edge]], 1/7), 2)))
            for to_edge in simple_nodes[id][7]:
                simple_nodes[id][13].append(float(np.round(math.pow(influence_matrix[m[to_edge], m[id]], 1/7), 2)))

        # graph = {
        #     "nodes":samples_nodes
        # }
        simple_graph = {
            "nodes": simple_nodes
        }

        logger.info("convert done")
        # graph_path = os.path.join(self.selected_dir, "graph-step"+str(self.step)+".json")
        json_save_data(graph_path, simple_graph)
        return simple_graph

    def get_path(self, ids):
        if config.show_simplified:
            self.wait_for_simplify()
        propagation_path_from = self.model.propagation_path_from
        propagation_path_to = self.model.propagation_path_to
        res = {}
        m = self.data.get_new_id_map()
        m_reverse = self.data.get_new_map_reverse()

        # selection = [m[i] for i in selection]
        def mapfunc(id):
            return int(m_reverse[id])
        for id in ids:
            res[id] = {
                "from": list(map(mapfunc, propagation_path_from[m[id]])),
                "to": list(map(mapfunc, propagation_path_to[m[id]]))
            }
        return res