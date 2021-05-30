import numpy as np
import os
from ..utils.helper_utils import json_load_data, pickle_load_data
from ..utils.helper_utils import pickle_save_data, json_save_data
from ..utils.config_utils import config

class CaseBase():
    def __init__(self, dataname):
        self.dataname = dataname
        
        self.model = None
        self.base_config = None
        self.step = 0

        self.pred_result = {}

        self._load_base_config()
        
    def connect_model(self, model):
        self.model = model

    def _init_model(self, k=6, evaluate=False, simplifying=False):
        assert self.model is not None 
        self.model.init(k=k, evaluate=evaluate, simplifying=simplifying)

    def _load_base_config(self):
        try:
            json_data = json_load_data(os.path.join(config.case_util_root, "case_config.json"))
        except:
            json_data = {}
        try:
            self.base_config = json_data[self.dataname]
        except:
            self.base_config = {
                "k": 6,
                "step": 0
            }

    def run(self, k=6, evaluate=True, simplifying=False, step=None, use_buffer=False, use_old = False):
        self._init_model(k=k, evaluate=evaluate, simplifying=False)
        return self.model

    def load_model(self, name):
        save = pickle_load_data(name)
        model = save[0]
        model.data = save[1]

        # change abs path in buffer
        selected_setting = os.path.split(model.selected_dir)[1]
        model.data.selected_dir = os.path.join(config.data_root, model.data.dataname, selected_setting)
        model.selected_dir = model.data.selected_dir

        # save label buffer
        labels = model.get_labels_dict()
        pickle_save_data(os.path.join(model.selected_dir, "label-step" + str(self.step) + ".json"), labels)

        if self.step > 0:
            pre_label = pickle_load_data(os.path.join(model.selected_dir,
                                              "label-step" + str(self.step-1) + ".json"))
            model.pre_labels = pre_label

        return model