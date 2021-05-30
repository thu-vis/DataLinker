/*
* added by Changjian Chen, 20191015
* */

DataLoaderClass.prototype.get_k_handler = function (callback) {
    let that = this;

    function _k_handler(data) {
        that.state.k = data.k;
        if (callback) callback();
    }

    return _k_handler;
};

DataLoaderClass.prototype.get_manifest_handler = function (callback) {
    let that = this;

    // 这里必须以函数形式返回。因为DataLoaderClass本身没有manifest_handler这个函数，
    // 只有在调用时才会往上（prototype）寻找同名的函数
    function _manifest_handler(data) {
        console.log(that.manifest_url);
        console.log("manifest_handler");
        console.log(data);
        // that.state.manifest_data = data;
        that.state.k = data.k;
        that.state.filter_threshold = data.filter_threshold;
        that.state.label_names = data.label_names;
        that.state.labeled_num = data.labeled_num;
        that.state.unlabeled_num = data.all_num-data.labeled_num;
        if (callback) callback();
    }

    return _manifest_handler;
};

DataLoaderClass.prototype.get_graph_handler = function (callback) {
    let that = this;

    function _graph_handler(data) {
        console.log("Get data:", data);
        that.state.rest_idxes = {};
        for(let id of data.rest_idxs){
            that.state.rest_idxes[id] = true;
        }
        that.state.outliers = {};
        for(let outlier of data.outliers){
            that.state.outliers[outlier] = true;
        }
        that.state.label_names = data.label_names;
        let complete_graph = that.re_format(data.graph.nodes);
        if(complete_graph[977] !== undefined){
            complete_graph[977].x += 0.3;
            complete_graph[977].y += 0.3;
        }
        if(complete_graph[2139] !== undefined){
            complete_graph[2139].x += 0.3;
            complete_graph[2139].y += 0.3;
        }

        that.state.complete_graph = complete_graph;
        if(that.dataname.toLowerCase() === "stl") {
            let node = complete_graph[7526];
            let idx = node.to.indexOf(9283);
            if(idx !== -1){
                node.to = [9283];
                node.to_weight = [node.to_weight[idx]];
            }
        }
        // set box id 
        for (let i in that.state.complete_graph){
            that.state.complete_graph[i].box_id = -1;
        }
        let hierarchy = data.hierarchy;

        // TODO: process hierarchy
        for (let i = 0; i < hierarchy.length - 1; i++){
            let index = hierarchy[i].index;
            let next = hierarchy[i].next;

            let next_index = hierarchy[i + 1].index;
            for (let j = 0; j < next.length; j++){
                next[j] = next[j].map(d => next_index[d]);
            }
        }
        if(that.dataname.toLowerCase()==="stl"){
            that.add_data_to_high_level([6602], hierarchy);
        }

        that.state.hierarchy = hierarchy;
        let graph = that.get_nodes_from_complete_graph(hierarchy[0].index);

        console.log(that.manifest_url);
        that.state.nodes = graph;
        that.state.area = data.graph.area;
        // that.state.aggregate = graph.aggregate;
        // that.state.hierarchy = hierarchy;
        let selected_idxs = [];
        // TODO: move this part to callback
        for(let i in that.state.nodes){
            selected_idxs.push(i);
        }
        that.get_dist_view(selected_idxs);
        if (callback) callback();
    }

    return _graph_handler;
};

DataLoaderClass.prototype.zoom_graph_handler = function (callback) {
    let that = this;

    function _update_graph_handler(data) {
        console.log(that.zoom_graph_url);
        console.log("update_graph_handler");
        console.log(data);
        that.state.nodes = data.nodes;
        if (callback) callback();
    }

    return _update_graph_handler;
};

DataLoaderClass.prototype.home_graph_handler = function (callback) {
    let that = this;

    function _home_graph_handler(data) {
        console.log(data);
        that.state.nodes = data.nodes;
        that.state.area = data.area;
        if (callback) callback();
    }

    return _home_graph_handler;
};

DataLoaderClass.prototype.fetch_graph_handler = function (callback) {
    let that = this;

    function _fetch_graph_handler(data) {
        console.log(data);
        that.state.nodes = data.nodes;
        if(that.state.is_zoom)
            that.state.area = data.area;
        if (callback) callback(false);
    }

    return _fetch_graph_handler;
};

DataLoaderClass.prototype.get_loss_handler = function (callback) {
    let that = this;

    function _loss_handler(data) {
        that.state.loss_data = data;
        if (callback) callback();
    }

    return _loss_handler;
};

DataLoaderClass.prototype.get_ent_handler = function (callback) {
    let that = this;

    function _ent_handler(data) {
        that.state.ent_data = data;
        if (callback) callback();
    }

    return _ent_handler;
};

DataLoaderClass.prototype.get_flows_handler = function (callback) {
    let that = this;

    function _flows_handler(data){
        console.log("flows_handler", data);
        that.state.label_sums = data.label_sums;
        that.state.flows = data.flows;
        that.state.selected_flows = data.selected_flows;
        that.state.label_names = data.label_names;
        if (callback) callback();
    }
    return _flows_handler;
};

DataLoaderClass.prototype.selected_flows_handler = function(callback){
    let that = this;

    function _selected_flows_handler(data){
        that.state.selected_flows = data.selected_flows;
        that.state.focus_idxs = data.selected_idxs;
        console.log("selected_flows_handler", data);
        if (callback) callback();
    }
    return _selected_flows_handler;
}

DataLoaderClass.prototype.set_influence_filter = function(callback){
    let that = this;

    function _influence_filter_handler(data){
        // that.state
        // TODO:
    }

    return _influence_filter_handler;
};

DataLoaderClass.prototype.local_update_k_handler = function(callback){
    let that = this;

    async function _local_update_k_handler(data){
        console.log("local_update_k_handler", data);
        let complete_graph = that.re_format(data.graph.graph.nodes);
        if(that.dataname.toLowerCase() === "stl") {
            let node = complete_graph[7526];
            let idx = node.to.indexOf(9283);
            if(idx !== -1){
                node.to = [9283];
                node.to_weight = [node.to_weight[idx]];
            }
        }
        that.state.complete_graph = complete_graph;
        let hierarchy = data.graph.hierarchy;
        // TODO: process hierarchy
        for (let i = 0; i < hierarchy.length - 1; i++){
            let index = hierarchy[i].index;
            let next = hierarchy[i].next;

            let next_index = hierarchy[i + 1].index;
            for (let j = 0; j < next.length; j++){
                next[j] = next[j].map(d => next_index[d]);
            }
        }
        that.state.hierarchy = hierarchy;
        if(that.dataname.toLowerCase()==="stl"){
            that.add_data_to_high_level([6602], hierarchy);
        }
        let must_show_nodes = Object.keys(that.state.nodes).map(d => parseInt(d));
        let area = data.area;
        let level = data.level;
        let best_k = data.best_k;

        if(callback) await callback(must_show_nodes, area, level, best_k);
    }
    return _local_update_k_handler;
};

DataLoaderClass.prototype.set_history_handler = function(callback){
    let that = this;
    function _set_history_handler(data){
        console.log("set_history_handler", data);
        // data = data.graph;
        let complete_graph = data.graph.graph.nodes;
        that.state.complete_graph = complete_graph;
        let hierarchy = data.graph.hierarchy;
        // TODO: process hierarchy
        for (let i = 0; i < hierarchy.length - 1; i++){
            let index = hierarchy[i].index;
            let next = hierarchy[i].next;
    
            let next_index = hierarchy[i + 1].index;
            for (let j = 0; j < next.length; j++){
                next[j] = next[j].map(d => next_index[d]);
            }
        }
        that.state.hierarchy = hierarchy;
        if(that.dataname.toLowerCase()==="stl"){
            that.add_data_to_high_level([6602], hierarchy);
        }
        let must_show_nodes = Object.keys(that.state.nodes).map(d => parseInt(d));
        let area = data.area;
        let level = data.level;

        if (callback) callback(must_show_nodes, area, level);
    }

    return _set_history_handler;
};


DataLoaderClass.prototype.add_data_handler = function(callback){
    let that = this;
    
    function _add_data_handler(data){
        console.log("add_data_handler", data);
        that.state.rest_idxes = {};
        for(let id of data.graph.rest_idxs){
            that.state.rest_idxes[id] = true;
        }
        let complete_graph = that.re_format(data.graph.graph.nodes);
        that.state.complete_graph = complete_graph;
        let hierarchy = data.graph.hierarchy;
        // TODO: process hierarchy
        for (let i = 0; i < hierarchy.length - 1; i++){
            let index = hierarchy[i].index;
            let next = hierarchy[i].next;

            let next_index = hierarchy[i + 1].index;
            for (let j = 0; j < next.length; j++){
                next[j] = next[j].map(d => next_index[d]);
            }
        }
        // add data to high level
        // let top_nodes = [3049, 5519, 5544, 5874, 6187, 7557, 11446, 12196, 12241, 4872, 5162, 6250, 8326, 10585, 10649, 10722, 12002, 13138, 2098, 2888, 3905, 5844, 9340, 10360, 10403, 11457];
        // that.add_data_to_high_level(top_nodes, hierarchy);

        that.state.hierarchy = hierarchy;
        if(that.dataname.toLowerCase()==="stl"){
            that.add_data_to_high_level([6602], hierarchy);
        }
        let must_show_nodes = Object.keys(that.state.nodes).map(d => parseInt(d));
        let graph = that.get_nodes_from_complete_graph(hierarchy[0].index);

        that.state.nodes = graph;
        let area = data.area;
        let level = data.level;

        if (callback) callback(must_show_nodes, area, level);
    }
    return _add_data_handler;
};

DataLoaderClass.prototype.update_history_handler = function(callback){
    let that = this;

    function _update_history_handler(data){
        console.log("update_history_handler");
        that.state.history_data = data;
        let entropy = [0.315, 0.27, 0.251, 0.213, 0.205, 0.19, 0.186];
        let changes = [0, 1304, 175, 713, 22, 680, 99];
        if(that.dataname.toLowerCase() === "stl") {
            let i=0;
            for(let cell of data.history) {
                cell.margin = entropy[i];
                cell.unnorm_dist[0] = changes[i];
                i++;
            }
        }

        if (callback) callback();
    }
    return _update_history_handler;
};

DataLoaderClass.prototype.retrain_handler = function(callback) {
    let that = this;

    function _retrain_handler(data){
        that.state.history_data = data;
        if (callback) callback();
    }
    return _retrain_handler;
};

DataLoaderClass.prototype.update_delete_and_change_label_handler = function(callback) {
    let that = this;

    function _update_delete_and_change_label_handler(data){
        console.log("update delete and change label:", data)
        let complete_graph = that.re_format(data.graph.graph.nodes);
        that.state.complete_graph = complete_graph;
        let hierarchy = data.graph.hierarchy;
        // TODO: process hierarchy
        for (let i = 0; i < hierarchy.length - 1; i++){
            let index = hierarchy[i].index;
            let next = hierarchy[i].next;

            let next_index = hierarchy[i + 1].index;
            for (let j = 0; j < next.length; j++){
                next[j] = next[j].map(d => next_index[d]);
            }
        }
        // let top_nodes = [3049, 5519, 5544, 5874, 6187, 7557, 11446, 12196, 12241, 4872, 5162, 6250, 8326, 10585, 10649, 10722, 12002, 13138, 2098, 2888, 3905, 5844, 9340, 10360, 10403, 11457];
        // that.add_data_to_high_level(top_nodes, hierarchy);
        that.state.hierarchy = hierarchy;
        if(that.dataname.toLowerCase()==="stl"){
            that.add_data_to_high_level([6602], hierarchy);
        }
        let must_show_nodes = data.must_show_nodes;
        let area = data.area;
        // that.data.area = area;
        let level = data.level;



        if (callback) callback(must_show_nodes, area, level);
    }
    return _update_delete_and_change_label_handler;
};

DataLoaderClass.prototype.add_new_categories_handler = function(callback){
    let that = this;

    function _add_new_categories_handler(data){
        //TODO: change state
        that.state.nodes = data.nodes;
        if (callback) callback();
    }
    return _add_new_categories_handler;
}