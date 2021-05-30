import numpy as np
import numpy.random as random
import os
from sklearn.cluster import KMeans
import pickle
from scipy.spatial import distance_matrix
from matplotlib import pyplot as plt
import math
import time
import math

from ..utils.config_utils import config
from ..graph_utils.IncrementalTSNE import IncrementalTSNE
from ..graph_utils.ConstraintTSNE import ConstraintTSNE
from ..graph_utils.DensityBasedSampler import DensityBasedSampler
from ..graph_utils.BlueNoiseSampler import BlueNoiseSampC as BlueNoiseSampler
from sklearn.manifold import TSNE
from ..graph_utils.RandomSampler import random_sample

top_k_uncertain = []

def get_train_x_entropy(process_data):
    iter_num = process_data.shape[0]
    node_num = process_data.shape[1]
    entropy = np.ones((node_num))
    for i in range(node_num):
        sort_res = process_data[iter_num-1][i][np.argsort(process_data[iter_num-1][i])[-2:]]
        entropy[i] = sort_res[1]-sort_res[0]
    return entropy

def getAnchors(train_x, train_y, ground_truth, process_data, influence_matrix, propagation_path, dataname, buf_path, degree, removed_ids):
    global top_k_uncertain

    anchor_path = os.path.join(buf_path, "anchors" + config.pkl_ext)
    current_pos_path = os.path.join(buf_path, "current_anchors" + config.pkl_ext)
    train_x = np.array(train_x, dtype=np.float64)
    node_num = train_x.shape[0]
    data_dim = train_x.shape[1]
    iter_num = process_data.shape[0]
    target_num = 500
    retsne = not os.path.exists(anchor_path)
    train_x_tsne = None
    if not retsne:
        train_x_tsne, level_infos = pickle.load(open(anchor_path, "rb"))
        top_num = len(level_infos[0]['index'])
        print(top_num, '<===>', target_num)
        retsne = top_num != target_num
    # train_x_tsne = None
    # retsne = True
    if retsne:
        if train_x_tsne is None:
            # random labeled data position
            train_y_final = [0] * node_num
            # train_x_tsne = np.zeros((node_num, 2))
            # labeled_data = []
            # random.seed(seed=10)
            for i in range(node_num):
                train_y_final[i] = -1 if np.isclose(np.max(process_data[iter_num - 1][i]), 0) else int(
                    np.argmax(process_data[iter_num - 1][i]))
            #     label = -1 if np.isclose(np.max(process_data[0][i]), 0) else int(np.argmax(process_data[0][i]))
            #     if label > -1:
            #         have = -1
            #         for node_id in labeled_data:
            #             old_label = -1 if np.isclose(np.max(process_data[0][node_id]), 0) else int(np.argmax(process_data[0][node_id]))
            #             if old_label==label:
            #                 have = node_id
            #         if have > -1:
            #             train_x_tsne[i] = train_x_tsne[have]+0.1*(random.rand((2))-0.5)
            #         else:
            #             train_x_tsne[i] = random.random((2))
            #         labeled_data.append(i)
            train_y_final = np.array(train_y_final)
            # # random unlabeled data position
            # err_cnt = 0
            # for i in range(node_num):
            #     predict_label = -1 if np.isclose(np.max(process_data[iter_num-1][i]), 0) else int(np.argmax(process_data[iter_num-1][i]))
            #     init_label = -1 if np.isclose(np.max(process_data[0][i]), 0) else int(np.argmax(process_data[0][i]))
            #     if predict_label > -1 and init_label == -1:
            #         target_ids = []
            #         for path in propagation_path[i][iter_num-1]:
            #             target_id = path[-1]
            #             if target_id not in target_ids:
            #                 assert target_id in labeled_data
            #                 target_ids.append(target_id)
            #         for id in target_ids:
            #             train_x_tsne[i] += train_x_tsne[id]
            #         train_x_tsne[i] /= len(target_ids)
            #         train_x_tsne[i] += 1e-4*(random.random((2))-0.5)
            #         if len(target_ids) == 0:
            #             err_cnt += 1
            #             for labeled_data_id in labeled_data:
            #                 label = -1 if np.isclose(np.max(process_data[0][labeled_data_id]), 0) else int(
            #                     np.argmax(process_data[0][labeled_data_id]))
            #                 if label == predict_label:
            #                     train_x_tsne[i] = train_x_tsne[labeled_data_id] + 1e-4*(random.random((2))-0.5)
            # # train_x_tsne = IncrementalTSNE(n_components=2, n_jobs=20).fit_transform(train_x)
            # print("err cnt:", err_cnt)
            # label_colors = ["#A9A9A9", "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2",
            #                 "#ffdb45", "#bcbd22", "#17becf"]
            # colors = []
            # for node_id in range(node_num):
            #
            #     colors.append(label_colors[(-1 if np.isclose(np.max(process_data[iter_num-1][node_id]), 0) else int(np.argmax(process_data[iter_num-1][node_id]))) + 1])
            # plt.figure()
            # plt.scatter(train_x_tsne[:, 0], train_x_tsne[:, 1], s=2, c=colors)
            # for labeled_id in labeled_data:
            #     plt.text(train_x_tsne[labeled_id][0], train_x_tsne[labeled_id][1], str(int(ground_truth[labeled_id])))
            # plt.show()
            # train_x_tsne = TSNE(n_components=2, verbose=True, method='exact', early_exaggeration=1).fit_transform(train_x)
            train_x_tsne = IncrementalTSNE(n_components=2, verbose=True, init="random",
                                           early_exaggeration=1).fit_transform(train_x, labels=train_y_final,
                                                                               label_alpha=0.3)
            # plt.figure()
            # plt.scatter(train_x_tsne[:, 0], train_x_tsne[:, 1], s=2, c=colors)
            # plt.show()
            #normalize
            x_min = np.min(train_x_tsne[:, 0])
            x_max = np.max(train_x_tsne[:, 0])
            y_min = np.min(train_x_tsne[:, 1])
            y_max = np.max(train_x_tsne[:, 1])
            x_len = x_max-x_min
            y_len = y_max-y_min
            # train_x_tsne[:,0] = (train_x_tsne[:,0]-x_min)/x_len
            # train_x_tsne[:,1] = (train_x_tsne[:,1]-y_min)/y_len
            # check edge distance
        if node_num > target_num:
            label_idxes = np.argwhere(train_y != -1).flatten()
            label_num = int(label_idxes.shape[0])
            sample_p = np.ones(node_num, dtype=np.float64)
            if label_num < node_num:
                sample_p[label_idxes] = 0
            sum_sample_p = np.sum(sample_p)
            sample_p /= sum_sample_p

            min_rate = 0.25

            sampling_scale = node_num / target_num
            levels_number = int(math.ceil(math.log(sampling_scale, 1 / min_rate))) + 1

            level_infos = [{} for i in range(levels_number)]
            level_infos[-1]['index'] = np.array(range(node_num))
            level_infos[-1]['clusters'] = np.array(range(node_num))
            level_infos[-1]['next'] = None

            number_scale_each_level = sampling_scale ** (1.0 / (levels_number - 1))
            sample_number = node_num
            for level_id in range(levels_number - 2, -1, -1):
                sample_number = round(sample_number / number_scale_each_level)
                if level_id == 0:
                    sample_number = target_num
                level_sample_p = sample_p[level_infos[-1]['index']]
                level_sum_sample_p = np.sum(level_sample_p)
                if level_sum_sample_p == 0:
                    level_sample_p = np.ones_like(level_sample_p)
                    level_sample_p /= np.sum(level_sample_p)
                    sampler = DensityBasedSampler(n_samples=sample_number)
                    # level_selection = np.random.choice(len(level_infos[-1]['index']), sample_number, p=level_sample_p,
                    #                                    replace=False)
                    level_selection = sampler.fit_sample(data=train_x, return_others=False, mixed_degree=get_train_x_entropy(process_data))
                else:
                    level_sample_p /= level_sum_sample_p
                    sampler = DensityBasedSampler(n_samples=sample_number)
                    # level_selection = np.random.choice(len(level_infos[-1]['index']), sample_number - label_num, p=level_sample_p,
                    #                                    replace=False)
                    level_selection = sampler.fit_sample(data=train_x, return_others=False, mixed_degree=get_train_x_entropy(process_data))
                    must_selection = np.argwhere(level_sample_p == 0).flatten()
                    level_selection = np.unique(np.concatenate((level_selection, must_selection), axis=0))

                level_index = level_infos[-1]['index'][level_selection]
                # from sklearn.neighbors import BallTree
                # tree = BallTree(train_x[level_index])
                # neighbors_nn = tree.query(train_x[level_infos[-1]['index']], 1, return_distance=False)
                # level_next = [[] for next_id in range(len(level_index))]
                # for index_id, index in enumerate(neighbors_nn.reshape(-1)):
                #     level_next[index].append(index_id)
                level_infos[level_id] = {
                    'index': level_index,
                    # 'next': level_next
                }
        else:
            level_infos = []
            level_infos.append({})
            level_infos[0]['index'] = np.array(range(node_num))
            level_infos[0]['clusters'] = np.array(range(node_num))
            level_infos[0]['next'] = None

        save = (train_x_tsne, level_infos)

        with open(anchor_path, "wb+") as f:
            pickle.dump(save, f)

    with open(anchor_path, "rb") as f:
        train_x_tsne, level_infos = pickle.load(f)
        selection = level_infos[0]['index']
        selection = list(dict.fromkeys(selection.tolist()))
        for id in removed_ids:
            if id in selection:
                selection.remove(id)
        selection = np.array(selection)
        samples_x = train_x[selection]
        init_samples_x_tsne = train_x_tsne[selection]
        samples_y = np.array(train_y[selection], dtype=int)
        samples_truth = ground_truth[selection]
        constraint_selection = np.random.choice(len(selection), min(len(selection), max(10, int(0.2 * len(selection)))))
        # samples_x_tsne = TSNE(n_components=2, n_jobs=20, init=init_samples_x_tsne, n_iter=250, early_exaggeration=1.0)\
        #     .fit_transform(samples_x)
        samples_x_tsne = IncrementalTSNE(n_components=2, n_jobs=20, init=init_samples_x_tsne, n_iter=100, early_exaggeration=1.0, exploration_n_iter=0)\
            .fit_transform(samples_x, constraint_X=samples_x[constraint_selection], constraint_Y=init_samples_x_tsne[constraint_selection], alpha=0.1)
        # samples_x_tsne = init_samples_x_tsne
        save = (selection, samples_x_tsne)

        with open(current_pos_path, "wb+") as f:
            pickle.dump(save, f)

    # area
    x_min = float(np.min(samples_x_tsne[:,0]))
    x_max = float(np.max(samples_x_tsne[:,0]))
    y_min = float(np.min(samples_x_tsne[:, 1]))
    y_max = float(np.max(samples_x_tsne[:, 1]))
    area = {
        "x":x_min,
        "y":y_min,
        "width":x_max-x_min,
        "height":y_max-y_min
    }
    # data
    samples_x_tsne = samples_x_tsne.tolist()
    samples_y = samples_y.tolist()
    samples_truth = samples_truth.tolist()
    samples_nodes = {}
    for i in range(selection.shape[0]):
        id = int(selection[i])
        iter_num = process_data.shape[0]
        labels = [int(np.argmax(process_data[j][id])) if np.max(process_data[j][id]) > 0 else -1 for j in
                  range(iter_num)]
        scores = [process_data[j][id].tolist() for j in range(iter_num)]
        samples_nodes[id] = {
            "id": id,
            "x": samples_x_tsne[i][0],
            "y": samples_x_tsne[i][1],
            "label": labels,
            "score": scores,
            "truth": samples_truth[i],
            "path":propagation_path[id],
            "in_degree":int(degree[id][1]),
            "out_degree":int(degree[id][0])
        }

    # added by changjian, 201912241926
    # added edges. A quick and dirty manner
    # edge_matrix = influence_matrix[selection][:, selection]
    # edges = []
    # for i in range(edge_matrix.shape[0]):
    #     start = edge_matrix.indptr[i]
    #     end = edge_matrix.indptr[i + 1]
    #     j_in_this_row = edge_matrix.indices[start:end]
    #     for idx, j in enumerate(j_in_this_row):
    #         edges.append({
    #             "s": int(selection[j]),
    #             "e": int(selection[i])
    #         })

    graph = {
        "nodes": samples_nodes,
        "area": area
    }
    return graph

def updateAnchors(train_x, train_y, ground_truth, process_data, influence_matrix, dataname, area, level, buf_path, propagation_path, degree, removed_ids):
    global top_k_uncertain
    anchor_path = os.path.join(buf_path, "anchors" + config.pkl_ext)
    current_pos_path = os.path.join(buf_path, "current_anchors" + config.pkl_ext)
    all_time = {
        "read_file":0,
        "format_data":0
    }
    start = time.time()
    with open(anchor_path, "rb") as f:
        train_x_tsne, level_infos = pickle.load(f)
        if level >= len(level_infos):
            level = len(level_infos) - 1
        _selection = level_infos[level]['index']
        fb = open(current_pos_path, "rb")
        old_ids, old_pos = pickle.load(fb)
        old_dic = {}
        for i, id in enumerate(old_ids):
            old_dic[id] = old_pos[i]
        _pos = train_x_tsne[_selection]
        selection = []
        old_selection = []
        old_position = []
        new_selection = []
        for i, ind in enumerate(_selection):
            if ind in old_dic:
                point = old_dic[ind]
            else:
                point = _pos[i]
            if area['x'] <= point[0] <= area['x'] + area['width'] and area['y'] <= point[1] <= area['y'] + area['height']:
                selection.append(ind)
                if ind in old_dic:
                    old_selection.append(len(selection) - 1)
                    old_position.append(point)
                else:
                    new_selection.append(len(selection) - 1)
        for uncertain_id in top_k_uncertain:
            point = train_x_tsne[uncertain_id]
            if area['x'] <= point[0] <= area['x'] + area['width'] and area['y'] <= point[1] <= area['y'] + area['height']:
                selection.append(uncertain_id)
                if uncertain_id in old_dic:
                    old_selection.append(len(selection) - 1)
                    old_position.append(old_dic[uncertain_id])
                else:
                    new_selection.append(len(selection) - 1)
        selection = np.array(selection)
        old_position = np.array(old_position)
        selection = selection[old_selection + new_selection]
        selection = selection.tolist()
        for id in removed_ids:
            if id in selection:
                selection.remove(id)
        selection = np.array(selection)
        samples_x = train_x[selection]
        init_samples_x_tsne = train_x_tsne[selection]
        init_samples_x_tsne[:len(old_selection)] = old_position
        samples_y = train_y[selection]
        samples_truth = ground_truth[selection]
        if len(new_selection) == 0:
            samples_x_tsne = init_samples_x_tsne
        else:
            # samples_x_tsne = IncrementalTSNE(n_components=2, n_jobs=20, init=init_samples_x_tsne, n_iter=250,
            #                              exploration_n_iter=0).fit_transform(samples_x, constraint_X = samples_x[:len(old_selection)], constraint_Y = init_samples_x_tsne[
            #                                                                      :len(old_selection)], alpha = 0.3)
            samples_x_tsne = IncrementalTSNE(n_components=2, n_jobs=20, init=init_samples_x_tsne, n_iter=250,
                                         exploration_n_iter=0).fit_transform(samples_x, skip_num_points=len(old_selection))

        save = (selection, samples_x_tsne)

        with open(current_pos_path, "wb+") as f:
            pickle.dump(save, f)

    now = time.time()
    all_time["read_file"] += now-start
    start = now
    samples_x_tsne = samples_x_tsne.tolist()
    samples_y = samples_y.tolist()
    samples_truth = samples_truth.tolist()
    samples_nodes = {}
    for i in range(len(selection)):
        id = int(selection[i])
        iter_num = process_data.shape[0]
        labels = [int(np.argmax(process_data[j][id])) if np.max(process_data[j][id]) > 0 else -1 for j in
                  range(iter_num)]
        scores = [process_data[j][id].tolist() for j in range(iter_num)]
        samples_nodes[id] = {
            "id": id,
            "x": samples_x_tsne[i][0],
            "y": samples_x_tsne[i][1],
            "label": labels,
            "score": scores,
            "truth": samples_truth[i],
            "path": propagation_path[id],
            "in_degree": int(degree[id][1]),
            "out_degree": int(degree[id][0])
        }
    now = time.time()
    all_time["format_data"] += now - start
    start = now
    print(all_time)
    # added by changjian, 201912241926
    # added edges. A quick and dirty manner
    # edge_matrix = influence_matrix[selection][:, selection]
    # edges = []
    # for i in range(edge_matrix.shape[0]):
    #     start = edge_matrix.indptr[i]
    #     end = edge_matrix.indptr[i + 1]
    #     j_in_this_row = edge_matrix.indices[start:end]
    #     for idx, j in enumerate(j_in_this_row):
    #         edges.append({
    #             "s": int(selection[j]),
    #             "e": int(selection[i])
    #         })

    graph = {
        "nodes": samples_nodes,
        # "edges": edges
    }
    return graph

def get_area(must_show_nodes, width, height, train_x, train_y, raw_graph, process_data, influence_matrix, propagation_path, ground_truth, buf_path):
    # get new area, new level
    new_area = {
        "x": -1,
        "y": -1,
        "width": -1,
        "height": -1
    }
    with open(buf_path, "rb") as f:
        train_x_tsne, level_infos = pickle.load(f)
        selection = must_show_nodes
        init_samples_x_tsne = train_x_tsne[selection]
        samples_x_tsne = init_samples_x_tsne
        must_min_x = np.min(samples_x_tsne[:, 0])
        must_min_y = np.min(samples_x_tsne[:, 1])
        must_max_x = np.max(samples_x_tsne[:, 0])
        must_max_y = np.max(samples_x_tsne[:, 1])
        min_x = must_min_x
        min_y = must_min_y
        max_x = must_max_x
        max_y = must_max_y
        new_area["x"] = min_x
        new_area["y"] = min_y
        new_area["width"] = max_x - min_x
        new_area["height"] = max_y - min_y
        new_wh = new_area["width"] / new_area["height"]
        old_wh = width / height
        if old_wh > new_wh:
            min_x -= (new_area["height"] * old_wh - new_area["width"]) / 2
            max_x += (new_area["height"] * old_wh - new_area["width"]) / 2
            new_area["x"] = min_x
            new_area["width"] = max_x - min_x
        elif old_wh < new_wh:
            min_y -= (new_area["width"] / old_wh - new_area["height"]) / 2
            max_y += (new_area["width"] / old_wh - new_area["height"]) / 2
            new_area["y"] = min_y
            new_area["height"] = max_y - min_y
        print(new_area)

    new_area["x"] = float(new_area["x"])
    new_area["y"] = float(new_area["y"])
    new_area["width"] = float(new_area["width"])
    new_area["height"] = float(new_area["height"])
    new_area["x"] -= float(new_area["width"])*0.1
    new_area["y"] -= float(new_area["height"])*0.1
    new_area["width"] *= 1.2
    new_area["height"] *= 1.2

    return {
        "area":new_area
    }

def fisheyeAnchors(must_show_nodes, area, level, wh, train_x, train_y, raw_graph, process_data, influence_matrix, propagation_path, ground_truth, buf_path, degree, removed_ids):
    global top_k_uncertain
    anchor_path = os.path.join(buf_path, "anchors" + config.pkl_ext)
    current_pos_path = os.path.join(buf_path, "current_anchors" + config.pkl_ext)
    fb = open(current_pos_path, "rb")
    old_ids, old_pos = pickle.load(fb)
    old_dic = {}
    for i, id in enumerate(old_ids):
        old_dic[id] = old_pos[i]
    with open(anchor_path, "rb") as f:
        focus_path = []
        for u in must_show_nodes:
            for v in must_show_nodes:
                if u < v:
                    focus_path.append([u, v])
        # print("focus path", focus_path)
        train_x_tsne, level_infos = pickle.load(f)

        # get new graph
        if level >= len(level_infos):
            level = len(level_infos) - 1
        _selection = level_infos[level]['index']
        _pos = train_x_tsne[_selection]
        selection = []
        new_nodes = []
        for i, ind in enumerate(_selection):
            if area['x'] <= _pos[i][0] <= area['x'] + area['width'] and area['y'] <= _pos[i][1] <= area['y'] + area[
                'height'] and (ind not in selection):
                    if int(ind) in old_dic:
                        selection.append(int(ind))
                    else:
                        new_nodes.append(int(ind))

        for node_id in must_show_nodes:
            if int(node_id) not in selection:
                if int(node_id) in old_dic:
                    selection.append(int(node_id))
                else:
                    new_nodes.append(int(node_id))
        for uncertain_id in top_k_uncertain:
            point = train_x_tsne[uncertain_id]
            if area['x'] <= point[0] <= area['x'] + area['width'] and area['y'] <= point[1] <= area['y'] + area[
                'height']:
                if uncertain_id not in selection:
                    if int(uncertain_id) in old_dic:
                        selection.append(int(uncertain_id))
                    else:
                        new_nodes.append(int(uncertain_id))
        old_cnt = len(selection)
        # add must_have_nodes
        selection = list(dict.fromkeys(selection+new_nodes))
        for id in removed_ids:
            if id in selection:
                selection.remove(id)


        samples_x = train_x[selection]
        init_samples_x_tsne = train_x_tsne[selection]
        samples_y = train_y[selection]
        samples_truth = ground_truth[selection]

        for i, id in enumerate(selection[:old_cnt]):
            init_samples_x_tsne[i] = old_dic[id]
        # label_colors = ["#A9A9A9", "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#ffdb45", "#bcbd22", "#17becf"]
        # colors = []
        # for node_id in selection:
        #     colors.append(label_colors[ground_truth[node_id]+1])
        # plt.figure()
        # plt.title("init-"+str(sample_rate))
        # plt.scatter(init_samples_x_tsne[:,0], init_samples_x_tsne[:, 1], s=10, c=colors)
        # samples_x_tsne = ConstraintTSNE(n_components=2, n_jobs=20, init=init_samples_x_tsne, n_iter=100, exploration_n_iter=0)\
        #     .fit_transform(samples_x, focus_path=focus_path_idx, m=5, constraint_X=constraint_x, constraint_Y=constraint_y, alpha=0.2, skip_num_points=old_cnt)
        samples_x_tsne = IncrementalTSNE(n_components=2, n_jobs=20, init=init_samples_x_tsne, n_iter=250,
                                         exploration_n_iter=0).fit_transform(samples_x,
                                                                             skip_num_points=old_cnt)
        # samples_x_tsne = IncrementalTSNE(n_components=2, n_jobs=20, init=init_samples_x_tsne, n_iter=100, exploration_n_iter=0, early_exaggeration=1)\
        #     .fit_transform(samples_x, constraint_X=constraint_x, constraint_Y=constraint_y, alpha=0.2)
        # samples_x_tsne = init_samples_x_tsne
        # plt.figure()
        # plt.title("output-"+str(sample_rate))
        # plt.scatter(samples_x_tsne[:, 0], samples_x_tsne[:, 1], s=10, c=colors)
        # plt.show()
        save = (selection, samples_x_tsne)

        with open(current_pos_path, "wb+") as f:
            pickle.dump(save, f)
    # get new area
    min_x = np.min(samples_x_tsne[:, 0])
    min_y = np.min(samples_x_tsne[:, 1])
    max_x = np.max(samples_x_tsne[:, 0])
    max_y = np.max(samples_x_tsne[:, 1])
    new_area = {
        "x":float(min_x),
        "y":float(min_y),
        "width":float(max_x-min_x),
        "height":float(max_y-min_y)
    }
    if new_area["height"] == 0:
        new_wh = 1
    else:
        new_wh = new_area["width"] / new_area["height"]
    old_wh = wh
    if old_wh > new_wh:
        min_x -= (new_area["height"] * old_wh - new_area["width"]) / 2
        max_x += (new_area["height"] * old_wh - new_area["width"]) / 2
        new_area["x"] = min_x
        new_area["width"] = max_x - min_x
    elif old_wh < new_wh:
        min_y -= (new_area["width"] / old_wh - new_area["height"]) / 2
        max_y += (new_area["width"] / old_wh - new_area["height"]) / 2
        new_area["y"] = min_y
        new_area["height"] = max_y - min_y
    new_area["x"] = float(new_area["x"])
    new_area["y"] = float(new_area["y"])
    new_area["width"] = float(new_area["width"])
    new_area["height"] = float(new_area["height"])
    print(new_area)

    samples_x_tsne = samples_x_tsne.tolist()
    samples_y = samples_y.tolist()
    samples_truth = samples_truth.tolist()
    samples_nodes = {}
    for i in range(len(selection)):
        id = int(selection[i])
        iter_num = process_data.shape[0]
        labels = [int(np.argmax(process_data[j][id])) if np.max(process_data[j][id]) > 0 else -1 for j in
                  range(iter_num)]
        scores = [process_data[j][id].tolist() for j in range(iter_num)]
        samples_nodes[id] = {
            "id": id,
            "x": samples_x_tsne[i][0],
            "y": samples_x_tsne[i][1],
            "label": labels,
            "score": scores,
            "truth": samples_truth[i],
            "path": propagation_path[id],
            "in_degree": int(degree[id][1]),
            "out_degree": int(degree[id][0])
        }

    graph = {
        "nodes": samples_nodes,
    }
    return graph