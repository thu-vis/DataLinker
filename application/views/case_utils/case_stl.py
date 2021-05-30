import numpy as np
import os
import json

from .case_base import CaseBase
from ..utils.config_utils import config
from ..utils.helper_utils import pickle_save_data, pickle_load_data

class CaseSTL(CaseBase):
    def __init__(self):
        dataname = config.stl
        super(CaseSTL, self).__init__(dataname)
        self.step = self.base_config

    def run(self, k=6, evaluate=True, simplifying=False, step=None, use_buffer=False, use_old = False):
        self.model.data.actions = []
        if step is None:
            step = self.base_config["step"]
        self.model.step = step
        self.step = step
        self.model.step = 0
        if (not use_buffer) or (not os.path.exists(os.path.join(self.model.selected_dir, "case-step" + str(step) + ".pkl"))):
            self._init_model(k=k, evaluate=evaluate, simplifying=False)
            save = (self.model, self.model.data)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)
        else:
            self.model.step = step
            model_path = os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl")
            if use_old:
                model_path = os.path.join(self.model.selected_dir, "saved_case\case-step" + str(self.model.step) + ".pkl")
            self.model = self.load_model(model_path)
            if evaluate:
                self.model.adaptive_evaluation(step=0)
            # self.model._training(rebuild=False, simplifying=True)
            return self.model
        self.pred_result[0] = self.model.get_pred_labels()

        self.model.adaptive_evaluation(step=0)
        if step >= 1 and use_buffer and os.path.exists(os.path.join(self.model.selected_dir, "case-step1.pkl")):
            self.model = self.load_model(
                os.path.join(self.model.selected_dir, "case-step1.pkl"))
        elif step >= 1:
            self.model.step += 1
            print("step 1")
            self.model.data.actions = []
            self.model.data.add_new_categories("snake")
            self.model.data.label_instance([6219, 8832, 11905, 11784], [10, 10, 10, 10])
            # self.model.data.label_instance([9081, 7427], [1, 4])
            # self.model._training(rebuild=False, evaluate=evaluate, simplifying=False)
            # self.pred_result[1] = self.model.get_pred_labels()
            # self.model.adaptive_evaluation(step=1)
            # save = (self.model, self.model.data)
            # pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)
    
            self.model.data.label_instance([717, 10987, 9946], [5, 5, 5])
            self.model.data.label_instance([1455], [5])

            # self._init_model(k=k, evaluate=True, simplifying=simplifying)
            self.model.influence_matrix = None

            self.model._training(rebuild=False, evaluate=evaluate, simplifying=False, record=True)
            self.model._influence_matrix(rebuild=False)
            self.pred_result[1] = self.model.get_pred_labels()
            self.model.adaptive_evaluation(step=1)
            save = (self.model, self.model.data)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)
        
        # if step >= 1.4:
        #     self.model.data.label_instance([5146, 2339], [4, 6])
        #     self.model._training(rebuild=False, evaluate=False, simplifying=False)

        categories = [1 for i in range(11)]
        if step >= 2 and use_buffer and os.path.exists(os.path.join(self.model.selected_dir, "case-step2.pkl")):
            self.model = self.load_model(
                os.path.join(self.model.selected_dir, "case-step2.pkl"))
        elif step >= 2:
            self.model.step += 1
            self.model.data.actions = []
            # remove other class
            lizard = json.loads(open(os.path.join(self.model.selected_dir, "lizard.txt"), "r").read().strip("\n"))
            lemur = json.loads(open(os.path.join(self.model.selected_dir, "lemur.txt"), "r").read().strip("\n"))
            removed = lizard + lemur + [2437]
            self.model.data.remove_instance(removed)
            self.model.data.update_graph(removed)
            self.model._training(rebuild=False, evaluate=False, simplifying=False, record=False)
            c = json.loads(open(os.path.join(self.model.selected_dir, "local_4_idxs.txt"), "r").read().strip("\n"))
            # self.model.local_search_k(c, range(7, 40), categories, simplifying=False, evaluate=True)
            self.model.influence_matrix = None
            self.model.local_search_k(c, range(27, 29), categories, simplifying=False, evaluate=True, record=False)

            # self.model.data.remove_edge([[1455, 11427], [1455, 5058]])

            self.model._training(rebuild=False, evaluate=False, simplifying=False, record=False)
            self.model._influence_matrix(rebuild=False)

            self.pred_result[2] = self.model.get_pred_labels()
            self.model.adaptive_evaluation(step=2)
            save = (self.model, self.model.data)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)

        if step >= 3 and use_buffer and os.path.exists(os.path.join(self.model.selected_dir, "case-step3.pkl")):
            self.model = self.load_model(
                os.path.join(self.model.selected_dir, "case-step3.pkl"))
        elif step >= 3:
            self.model.step += 1
            edge_list = json.loads(open(os.path.join(self.model.selected_dir, "removed_1.txt"), "r").read().strip("\n"))
            remove_edges_ext = [[59, 5035], [713, 5035], [3189, 6834], [3928, 3307], [4446, 48], [5963, 6837], [6347, 5035], [6834, 10917]]
            self.model.data.remove_edge(edge_list+remove_edges_ext)
            self.model.data.remove_edge([[7526, 7409], [7526, 11914], [7526, 10280]])
            removed = [6986, 4710, 5790, 227, 2694]
            self.model.data.remove_instance(removed)
            self.model.data.update_graph(removed)

            self.model.influence_matrix = None

            self.model._training(rebuild=False, evaluate=True, simplifying=False, record=True)
            self.model._influence_matrix(rebuild=True)

            self.pred_result[3] = self.model.get_pred_labels()
            self.model.adaptive_evaluation(step=3)
            save = (self.model, self.model.data)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)



        categories = [1 for i in range(11)]
        if step >= 4 and use_buffer and os.path.exists(os.path.join(self.model.selected_dir, "case-step4.pkl")):
            self.model = self.load_model(
                os.path.join(self.model.selected_dir, "case-step4.pkl"))
        elif step >= 4:
            self.model.step += 1
            self.model.data.actions = []
            c = json.loads(open(os.path.join(self.model.selected_dir, "local_2_idxs.txt"), "r").read().strip("\n"))
            self.model.local_search_k(c, [1, 2, 3, 4], categories, simplifying=False, evaluate=True, record=False)

        # if step >= 4:

            e = json.loads(open(os.path.join(self.model.selected_dir, "local_1_idxs.txt"), "r").read().strip("\n"))
            # e += [2098, 2888, 2983, 3905, 5219, 5816, 5844, 7205, 8545, 8829, 9340, 10360, 10403, 10774, 11457]
            self.model.local_search_k(e, [1, 2, 3, 4], categories, simplifying=False, evaluate=True, record=False)

            e = json.loads(open(os.path.join(self.model.selected_dir, "local_3_idxs.txt"), "r").read().strip("\n"))
            self.model.influence_matrix = None
            self.model.local_search_k(e, [1, 2, 3, 4], categories, simplifying=False, evaluate=True, record=False)
            self.model._influence_matrix(rebuild=False)
            self.model.adaptive_evaluation(step=4)
            save = (self.model, self.model.data)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)

        if step >= 5 and use_buffer and os.path.exists(os.path.join(self.model.selected_dir, "case-step5.pkl")):
            self.model = self.load_model(
                os.path.join(self.model.selected_dir, "case-step5.pkl"))
        elif step >= 5:
            self.model.step += 1
            removed = [3403, 1834, 11881, 9800]
            removed_edge = [ [6897, 1071], [3349, 5521], [7648, 9140], [88, 39],
                            [10332, 39], [11229, 4748], [210, 5193], [9027, 12572],
                            [10462, 6794], [940, 6794], [11501, 9411], [3377, 2888], [2154, 2888],
                            [82, 7036], [8570, 7036], [2169, 3477], [6886, 2957], [3980, 12701], [2683, 12781],
                            [1453, 10765], [1453, 6951], [1453, 8912], [1453, 10676], [1453, 7032]]

            self.model.data.remove_edge(removed_edge)
            self.model.data.add_edge([[3679, 7302]])

            self.model.data.remove_instance(removed)
            self.model.data.update_graph(removed)
            self.model.influence_matrix = None
            self.model._training(rebuild=False, evaluate=True, simplifying=False, record=True)
            self.model._influence_matrix(rebuild=False)

            self.pred_result[4] = self.model.get_pred_labels()
            self.model.adaptive_evaluation(step=5)
            save = (self.model, self.model.data)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)

        # if step >= 6:
        #     self.model.step += 1
        #     edge_list = [[1609, 2555]]
        #     self.model.data.actions = []
        #     self.model.data.remove_edge(edge_list)
        #     self.model._training(rebuild=False, evaluate=True, simplifying=False)
        #     save = (self.model, self.model.data)
        #     pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)

        if step >= 6 and use_buffer and os.path.exists(os.path.join(self.model.selected_dir, "case-step6.pkl")):
            self.model = self.load_model(
                os.path.join(self.model.selected_dir, "case-step6.pkl"))
        elif step >= 6:
            self.model.data.actions = []
            self.model.step += 1
            # all_labeled_idxs = self.model.data.labeled_idx
            # labeled_y = self.model.data.y[all_labeled_idxs]
            # cat_idxs = all_labeled_idxs[labeled_y == 3]
            # pickle_save_data(os.path.join(self.model.selected_dir, "step-3-add-data.pkl"), cat_idxs)
            cat_idxs = pickle_load_data(os.path.join(self.model.selected_dir, "step-5-add-data.pkl"))
            self.model.add_data(cat_idxs, 3)
            self.model.influence_matrix = None
            self.model._training(rebuild=False, evaluate=evaluate, simplifying=False, record=True)
            self.model._influence_matrix(rebuild=False)
            self.model.adaptive_evaluation(step=6)
            self.pred_result[5] = self.model.get_pred_labels()
            save = (self.model, self.model.data)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)
            # self.model.adaptive_evaluation_unasync()

        if step >= 7 and use_buffer and os.path.exists(os.path.join(self.model.selected_dir, "case-step7.pkl")):
            self.model = self.load_model(
                os.path.join(self.model.selected_dir, "case-step7.pkl"))
        elif step >= 7:
            self.model.data.actions = []
            self.model.step += 1

            self.model.data.label_instance([6673, 7954, 10403, 6396], [8, 0, 5, 5])
            self.influence_matrix = None
            self.model._training(rebuild=False, evaluate=False, simplifying=False, record=True)
            self.model._influence_matrix(rebuild=True)
            self.model.adaptive_evaluation(step=8)
            save = (self.model, self.model.data)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)

        if step >= 8 and use_buffer and os.path.exists(os.path.join(self.model.selected_dir, "case-step8.pkl")):
            self.model = self.load_model(
                os.path.join(self.model.selected_dir, "case-step8.pkl"))
        elif step >= 8:
            self.model.data.actions = []
            self.model.step += 1
            self.model.data.label_instance([11023, 7988, 331, 8990, 8723, 11132, 6133, 9218], [0, 0, 5, 0, 5, 5, 5, 8])
            removed = [6356, 6434, 9429, 11552, 12795, 362, 3679, 4748, 8547, 1956, 5478, 3080, 12420, 8187]
            self.model.data.remove_instance(removed)
            self.model.data.update_graph(removed)
            removed = [5533, 2485]
            # truth = [11858, 3911, 11744, 3038, 3437, 5483, 3225, 8201, 7092, 4296, 9902, 3249, 8454]
            removed_edge = [[1842, 4547], [11482, 4547], [106, 12035], [1798, 10393], [12265, 10352], [3527, 8569],
                            [7954, 9617], [8474, 527], [8276, 527], [1044, 10951], [11126, 10352], [3563, 5825],
                            [7622, 2833], [10456, 9298], [12431, 9589], [7249, 12431], [10945, 5723], [70, 6397],
                            [5393, 7394], [4199, 7760], [12265, 8569], [3465, 5725], [9883, 4276], [3872, 5407],
                            [10665, 5407], [200, 8370], [7177, 1142], [6225, 2666], [3739, 4651], [3722, 3298],
                            [9910, 3298], [11982, 4651], [5882, 548], [9910, 7276], [9212, 5369], [10523, 4794],
                            [6133, 12129], [9607, 8824], [8130, 2086]]
            self.model.data.remove_instance(removed)
            self.model.data.update_graph(removed)
            self.model.data.remove_edge(removed_edge)
            self.model.influence_matrix = None
            self.model._training(rebuild=False, evaluate=False, simplifying=False, record=True)
            self.model._influence_matrix(rebuild=True)

            self.model.adaptive_evaluation(step=8)
            save = (self.model, self.model.data)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)

        self.model.adaptive_evaluation()
        return self.model

        # if step >= 4:
        #     self.model._training(rebuild=False, evaluate=False, simplifying=False)

        # if not evaluate:
        #     self.model.adaptive_evaluation_unasync()