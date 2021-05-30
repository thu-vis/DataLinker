import numpy as np
import os
import json

from .case_base import CaseBase
from ..utils.config_utils import config
from ..utils.helper_utils import pickle_save_data, pickle_load_data

class CaseOCT(CaseBase):
    def __init__(self):
        dataname = config.oct
        super(CaseOCT, self).__init__(dataname)

        self.step = self.base_config


    def run(self, k=None, evaluate=True, simplifying=False, step=None, use_buffer = False, use_old = False):
        if step is None:
            step = self.base_config["step"]
        
        if k is None:
            k = self.base_config["k"]
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
                model_path = os.path.join(self.model.selected_dir,
                                          "saved_case\case-step" + str(self.model.step) + ".pkl")
            self.model = self.load_model(model_path)
            if evaluate:
                self.model.adaptive_evaluation(step=0)
            # self.model._training(rebuild=False, simplifying=True)
            return self.model
        self.pred_result[0] = self.model.get_pred_labels()

        categories = [1 for i in range(12)]
        categories[11] = False
        self.model.adaptive_evaluation(step=0)

        if step >= 1 and use_buffer and os.path.exists(os.path.join(self.model.selected_dir, "case-step1.pkl")):
            self.model = self.load_model(
                os.path.join(self.model.selected_dir, "case-step1.pkl"))
        elif step >= 1:
            self.model.step += 1
            no_update = [5682,5684,1228,1482,8601,1714, 6377, 3475]
            neighbors = self.model.data.get_neighbors(5, True)[no_update].flatten().tolist()
            no_update = list(set(neighbors))
            print("no update neighbors:{}".format(no_update))
            self.model.data.actions = []
            c = json.loads(open(os.path.join(self.model.selected_dir, "local_1_idxs.txt"), "r").read().strip("\n"))
            c = list(set(c)-set(no_update))
            self.model.local_search_k(c, [1, 2, 3, 4], categories, simplifying=False, evaluate=evaluate, record=False)
            save = (self.model, self.model.data)
            self.model.adaptive_evaluation(step=1)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)
        
        if step >= 2:
            self.model.data.actions = []
            e = json.loads(open(os.path.join(self.model.selected_dir, "local_2_idxs.txt"), "r").read().strip("\n"))
            e = list(set(e) - set(no_update))
            self.model.local_search_k(e, [1, 2, 3, 4], categories, simplifying=True, evaluate=evaluate, record=True)

            self.pred_result[1] = self.model.get_pred_labels()
            save = (self.model, self.model.data)
            self.model.adaptive_evaluation(step=1)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)

        if step >= 3 and use_buffer and os.path.exists(os.path.join(self.model.selected_dir, "case-step2.pkl")):
            self.model = self.load_model(
                os.path.join(self.model.selected_dir, "case-step2.pkl"))
        elif step >= 3:
            self.model.step += 1
            self.model.data.actions = []
            remove_edges = json.loads(open(os.path.join(self.model.selected_dir, "removed_edges.txt"), "r").read().strip("\n"))
            # remove_edges_vis = []
            self.model.data.remove_edge(remove_edges)

            self.model._training(rebuild=False, evaluate=True, simplifying=True)
            self.pred_result[3] = self.model.get_pred_labels()
            self.model.adaptive_evaluation(step=2)
            save = (self.model, self.model.data)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)

        if step >= 4 and use_buffer and os.path.exists(os.path.join(self.model.selected_dir, "case-step3.pkl")):
            self.model = self.load_model(
                os.path.join(self.model.selected_dir, "case-step3.pkl"))
        elif step >= 4:
            self.model.step += 1
            self.model.data.actions = []
            self.model.data.label_instance([5734, 3638], [2, 2])
            removed_edge = [[9867, 706]] + [[77, 8743], [352, 8529], [396, 6496], [706, 9867], [1476, 2059],
                                            [1714, 2092], [2059, 1476], [2092, 1714], [3081, 5991], [4148, 8974],
                                            [5497, 5383], [5991, 3081], [7028, 8944], [8529, 6643], [8944, 7028]]
            removed_edge += [[3665, 8529], [3726, 9078], [4802, 3212], [8944, 352], [9908, 5017]]
            self.model.data.remove_edge(removed_edge)
            self.model._training(rebuild=False, evaluate=False, simplifying=False, record=True)
            self.model._influence_matrix(rebuild=True)
            _, _, base_acc = self.model.adaptive_evaluation(step=3)
            save = (self.model, self.model.data)
            pickle_save_data(os.path.join(self.model.selected_dir, "case-step" + str(self.model.step) + ".pkl"), save)


        # if not evaluate:
        #     self.model.adaptive_evaluation_unasync()


        return self.model