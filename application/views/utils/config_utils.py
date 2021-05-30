import sys
import os
SERVER_ROOT = os.path.dirname(sys.modules[__name__].__file__)
SERVER_ROOT = os.path.join(SERVER_ROOT, "..")

class Config(object):
    def __init__(self):
        #raw data root
        self.raw_data_root = os.path.normpath("F:/WSL2019-Raw-data")

        # first-level directory
        self.data_root = os.path.normpath(os.path.join(SERVER_ROOT,"../../data/"))
        self.image_root = os.path.normpath(os.path.join(SERVER_ROOT,"../../images/"))
        self.lib_root = os.path.normpath(os.path.join(SERVER_ROOT, "../../application/views/lib/"))
        self.log_root = os.path.normpath(os.path.join(SERVER_ROOT,"../../../logs/"))
        self.case_util_root = os.path.normpath(os.path.join(SERVER_ROOT, "../../application/views/case_utils/"))
        # self.model_root = os.path.join(SERVER_ROOT, "../model/")

        # extension
        self.image_ext = ".jpg"
        self.mat_ext = ".mat"
        self.pkl_ext = ".pkl"

        # second-level directory
        self.yelp = "Yelp"
        self.imdb = "IMDB"
        self.cifar10 = "cifar10"
        self.oct = "OCT"
        self.stl = "STL"
        self.svhn = "svhn"
        self.coil = "COIL"
        self.cancer = "Cancer"

        # third-level directory
        self.train_path_name = "train"
        self.test_path_name = "exp"
        self.all_data_cache_name = "all_data_cache" + self.pkl_ext

        # filename
        self.processed_dataname = "processed_data"+ self.pkl_ext
        self.grid_dataname = "grid_data" + self.pkl_ext
        self.concept_graph_filename = "concept_graph.json"
        self.signal_filename = "SIGNAL"

        # buffer
        self.ssl_model_buffer_name = "ssl_model_buffer" + self.pkl_ext
        self.projection_buffer_name = "projection_buffer" + self.pkl_ext

        # variable
        self.class_name = "class_name"
        self.class_name_encoding = "class_name_encoding"
        self.X_name ="X_name"
        self.embed_X_name = "embed_X"
        self.all_embed_X_name = "all_embed_X"
        self.y_name = "y_name"
        self.train_idx_name = "train_idx"
        self.valid_idx_name = "valid_idx"
        self.test_idx_name = "test_idx"
        self.labeled_idx_name = "labeled_idx"
        self.unlabeled_idx_name = "unlabeled_idx"
        self.add_info_name = "add_info"

        self.train_x_name = "X_train"
        self.train_y_name = "y_train"
        self.test_x_name = "X_test"
        self.test_y_name = "y_test"

        # variables name for frontend
        self.train_instance_num_name = "TrainInstanceNum"
        self.valid_instance_num_name = "ValidInstanceNum"
        self.test_instance_num_name = "TestInstanceNum"
        self.label_names_name = "LabelNames"
        self.feature_dim_name = "FeatureDim"

        self.fine_tune_feature = "fine_tune_feature"
        self.pretrain_feature = "pretrain_feature"
        self.superpixel_feature = "superpixel_feature"

        # model config
        self.stl_config = {
            "n_neighbors":6,
            "sampling_min_dis":1
        }
        self.oct_config = {
            "n_neighbors": 5,
            "sampling_min_dis": 100
        }
        self.show_simplified = True
        self.use_add_tsne = False



config = Config()
