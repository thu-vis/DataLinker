from .ExchangePort import ExchangePortClass

exchange_port = ExchangePortClass()


def set_dataname(dataname):
    exchange_port.reset_dataname(dataname)


def set_model(dataname, labeled_num=None, total_num=None):
    exchange_port.reset_model(dataname, labeled_num, total_num)

def setK(k):
    exchange_port.setK(k)

def init_model(k, filter_threshold):
    exchange_port.init_model(k=k, filter_threshold=filter_threshold)

def get_graph(filter_threshold=None, wh = 1):
    return exchange_port.get_graph(filter_threshold=filter_threshold, wh = wh)

def local_update_k(data):
    return exchange_port.local_update_k(data)

def add_data(data):
    return exchange_port.add_data(data)

def get_manifest(): 
    return exchange_port.get_manifest()

def get_loss():
    return exchange_port.get_loss()


def get_ent():
    return exchange_port.get_ent()

def get_flows(selected_idxs):
    return exchange_port.get_flows(selected_idxs)

def get_selected_flows(data):
    return exchange_port.get_selected_flows(data)

def get_labels():
    return exchange_port.get_labels()


def get_image_path(id):
    return exchange_port.get_image_path(id)

def update_graph(area, level):
    return exchange_port.update_graph(area, level)

def get_area(must_show_nodes, width, height):
    return exchange_port.get_area(must_show_nodes, width, height)

def update_delete_and_change_label(data):
    return exchange_port.update_delete_and_change_label(data)

def add_new_categories(data):
    return exchange_port.add_new_categories(data)

def fisheye(must_show_nodes, area, level, wh):
    return exchange_port.fisheye(must_show_nodes, area, level, wh)

def get_feature_distance(uid, vid):
    return exchange_port.get_feature_distance(uid, vid)

def get_feature(id):
    return exchange_port.get_feature(id)

def get_history():
    return exchange_port.get_history()

def set_history(id):
    return exchange_port.set_history(id)

def retrain():
    return exchange_port.retrain()

def get_home():
    return exchange_port.get_home()

def get_path(ids):
    return exchange_port.get_path(ids)

def get_img_neighbors(ids, k):
    return exchange_port.get_img_neighbors(ids, k)

def get_data_labels(ids):
    return exchange_port.get_img_labels(ids)

def get_img_entropy(ids):
    return exchange_port.get_img_entropy(ids)