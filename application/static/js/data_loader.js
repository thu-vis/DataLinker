/*
* added by Changjian Chen, 20191015
* */


DataLoaderClass = function () {
    let that = this;

    // for debug
    let if_filter_use_complete_data = true;


    that.dataset = null;

    // URL information
    that.manifest_url = "/graph/GetManifest";
    that.graph_url = "/graph/GetGraph";
    that.loss_url = "/graph/GetLoss";
    that.ent_url = "/graph/GetEnt";
    that.local_update_k_url = "/graph/LocalUpdateK";
    that.set_influence_filter_url = "/graph/SetInfluenceFilter";
    that.zoom_graph_url = "/graph/update";
    that.fisheye_graph_url = "/graph/fisheye";
    that.update_delete_and_change_label_url = "/graph/update_delete_and_change_label";
    that.flows_urls = "/dist/GetFlows";
    that.selected_flows_urls = "/dist/GetSelectedFlows";
    that.image_url = "/info/image";
    that.get_history_url = "/history/GetHistory";
    that.set_history_url = "/history/SetHistory";
    that.retrain_url = "/history/Retrain";
    that.set_k_url = "/graph/SetK";
    that.home_graph_url = "/graph/home";
    that.add_new_categories_url = "/graph/NewCategories";
    that.add_data_url = "/graph/AddData";

    // Request nodes
    that.k_node = null;
    that.manifest_node = null;
    that.graph_node = null;
    that.update_graph_node = null;
    that.update_delete_and_change_label_node = null;
    that.loss_node = null;
    that.ent_node = null;
    that.flows_node = null;
    that.selected_flows_node = null;
    that.influence_filter_node = null;
    that.local_update_k_node = null;
    that.get_history_node = null;
    that.set_history_node = null;
    that.retrain_node = null;
    that.add_new_categories_node = null;
    that.add_data_node = null;

    // views
    that.graph_view = null;
    that.dist_view = null;
    that.history_view = null;
    that.filter_view = null;
    that.edit_view = null;
    that.image_view = null;
    that.setting_view = null;

    that.iter = -1;

    that.labeled_idxs = [];
    that.dataname = "";

    // Data storage
    that.state = {
        // manifest_data: null,
        k: null,
        filter_threshold: null,
        label_names: null,
        loss_data: null,
        img_url: null,
        ent_data: null,
        // label change info:
        label_sums: null,
        flows: null,
        dist_mode: true,
        selected_flows: null,
        // scented widget info:
        label_widget_data: null,
        label_widget_range:[-1, -1],
        uncertainty_widget_data: null,
        uncertainty_widget_range: [-1, -1],
        indegree_widget_data: null,
        indegree_widget_range: [-1, -1],
        outdegree_widget_data: null,
        outdegree_widget_range: [-1, -1],
        influence_widget_data: null,
        influence_widget_range: [-1, -1],
        consistency_widget_data: null,
        consistency_widget_range: [-1, -1],
        kdegree_widget_data: [0,0,0],
        kdegree_widget_range: [-1,1],
        edge_type_data: {
            "in":0,
            "out":0,
            "within":0,
            "between":0
        },
        edge_type_range: ["between"],
        //hierarchy info
        hierarchy:null,
        last_level:0,
        last_nodes:[],
        // graph info:
        complete_graph:null,
        edge_filter_threshold:[0.2, 1],
        nodes: null,
        path: {
            "in": [],
            "out": [],
            "within": [],
            "between": [],
            "in_nodes": [],
            "out_nodes": []
        },
        highlight_path: [],
        is_show_path: false,
        highlights: [],
        area: null,
        rescale: false,
        glyphs: [],
        visible_items:{},
        aggregate:[],
        is_zoom: true,
        rect_nodes: [],
        if_focus_selection_box: false,
        re_focus_selection_box: false,
        nodes_before_focus_selection: null,
        selection_before_focus_sulection: null,
        outliers: null,
        rest_idxes: {},
        // history info:
        history_data: null,
        // edit info:
        edit_state: {
            deleted_idxs: [],
            labeled_idxs: [],
            labels: [],
            deleted_edges: []
        },
        // info view:
        re_fetch: false,
    };

    // Define topological structure of data retrieval
    that._init = function () {

    };

    that.set_dataset = function(dataset) {
        that.dataset = dataset;
        that.graph_view.remove_all();
        that.wh = Math.round(that.graph_view.width/that.graph_view.height * 100)/100;
        let params = "?dataset=" + that.dataset;
        that.manifest_node = new request_node(that.manifest_url + params,
            that.get_manifest_handler(function(){
                that.dataname = $("#img_category span").html().split("-")[0];
                that.update_control_info();
                that.update_edit_info();
                that.update_setting_view();
            }), "json", "GET");

        that.graph_node = new request_node(that.graph_url + params+"&wh="+that.wh,
            that.get_graph_handler(that.get_graph_view), "json", "GET");
        that.graph_node.depend_on(that.manifest_node);

        // that.update_graph_node = new request_node(that.update_graph_url + params,
        //     that.update_graph_handler(that.update_graph_view), "json", "POST");

        // TODO:
        that.update_delete_and_change_label_node = new request_node(that.update_delete_and_change_label_url + params,
            that.update_delete_and_change_label_handler(function(must_show_nodes, area, level){
                that.state.labeled_num = Object.values(that.state.complete_graph).filter(d => d.label[0] > -1).length;
                that.state.unlabeled_num = Object.values(that.state.complete_graph).length - that.state.labeled_num;
                that.update_control_info();

                that.state.is_zoom = false;
                that.add_data_to_high_level(that.labeled_idxs, that.state.hierarchy);
                that.state.is_zoom = true;
                that.fetch_nodes(area, level, must_show_nodes);
                that.iter =Math.min(Object.values(that.state.nodes)[0].label.length-1, that.iter);
                let show_ids = [];
                for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
                    if(that.state.visible_items[node_id] === true){
                        show_ids.push(node_id);
                    }
                }

                that.set_filter_data(that.state.nodes);
                let ranges = that.filter_view.get_ranges();
                let label_range = [];
                for(let i=0; i<=that.state.label_names.length; i++){
            label_range.push(i);
        }
                that.set_filter_range(ranges[0], label_range, ranges[2], ranges[3], ranges[4], ranges[5], ranges[6], ranges[7]);
                that.update_filter_view();


                that.get_dist_view(show_ids);
                that.state.re_fetch = true;
                that.update_graph_view();
                that.state.re_fetch = false;
                that.get_history();
                d3.select("#refresh-btn").select("use").attr("xlink:href", "#static-update-icon");
            }), "json", "POST");

        // that.fisheye_graph_node = new request_node(that.fisheye_graph_url + params,
        //     that.update_fisheye_graph_handler(that.update_fisheye_view), "json", "POST");

        that.get_history_node = new request_node(that.get_history_url + params,
            that.update_history_handler(that.update_history_view), "json", "GET");
        that.get_history_node.depend_on(that.graph_node);
    };

    that.init_notify = function () {
        that.manifest_node.notify();
    };

    that.update_edit_info = function(){
        that.edit_view.update_info({
            label_names: that.state.label_names
        });
    };

    that.eval_edit_info = function() {
        that.edit_view.eval_edit();
    };

    that.show_delete_and_change_label = function(edit_state) {
        that.state.edit_state = edit_state;
        that.update_graph_view();
    };

    that.update_delete_and_change_label = function (edit_state) {
        that.state.edit_state = edit_state;
        let data = JSON.parse(JSON.stringify(edit_state));
        let level = that.graph_view.get_level();
        let area = that.state.area;
        data["area"] = area;
        data["level"] = level;
        data["wh"] = that.graph_view.get_wh();
        that.labeled_idxs = edit_state.labeled_idxs;
        that.update_delete_and_change_label_node.set_data(data);
        that.update_delete_and_change_label_node.notify();
    };

    that.add_new_categories = function(name, idxs) {
        let data = {
            name: name,
            idxs: idxs
        }
        let level = that.graph_view.get_level();
        let area = that.state.area;
        data["area"] = area;
        data["level"] = level;
        data["wh"] = that.graph_view.get_wh();
        let params = "?dataset=" + that.dataset;
        that.add_new_categories_node = new request_node(that.add_new_categories_url + params,
            that.add_new_categories_handler(function(){
                let show_ids = [];
                for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
                    if(that.state.visible_items[node_id] === true){
                        show_ids.push(node_id);
                    }
                }
                that.get_dist_view(show_ids);
                that.update_graph_view();
            }), "json", "POST");
        that.add_new_categories_node.set_data(data);
        that.add_new_categories_node.notify();
    };

    that.add_data = function(data_num){
        // let show_ids = that.get_show_ids();
        // let data = {
        //     show_ids,
        //     data_num
        // }
        let params = "?dataset=" + that.dataset;
        that.add_data_node = new request_node(that.add_data_url + params, 
            that.add_data_handler(function(must_show_nodes, area, level){
                that.state.labeled_num = Object.values(that.state.complete_graph).filter(d => d.label[0] > -1).length;
                that.state.unlabeled_num = Object.values(that.state.complete_graph).length - that.state.labeled_num;
                that.update_control_info();

                that.set_filter_data(that.state.nodes);
                let ranges = that.filter_view.get_ranges();
                let label_range = [];
                for(let i=0; i<=that.state.label_names.length; i++){
            label_range.push(i);
        }
                that.set_filter_range(ranges[0], label_range, ranges[2], ranges[3], ranges[4], ranges[5], ranges[6], ranges[7]);
                that.update_filter_view();

                let show_ids = that.get_show_ids();
                that.get_dist_view(show_ids);
                that.update_graph_view();
                that.get_history();
            }), "json", "POST");
            
        data = {};
        selected_idxs = that.graph_view.get_highlights();
        data["selected_idxs"] = selected_idxs;
        let level = that.graph_view.get_level();
        let area = that.state.area;
        data["area"] = area;
        that.state.rescale = false;
        data["level"] = level;
        data["wh"] = that.graph_view.get_wh();

        that.add_data_node.set_data(data);
        that.add_data_node.notify();
    };

    that.update_edit_state = function(data, mode, node){
        console.log("update_edit_state", data, mode, node);
        that.edit_view.update_focus(data, mode, node);
    };

    that.update_k = function(k){
        that.graph_view.remove_all();
        that.state.k = k;
        let graph_params = "?dataset=" + that.dataset + "&k=" +
            that.state.k + "&filter_threshold=" + that.state.filter_threshold;
        that.graph_node.set_url(that.graph_url + graph_params);
        that.get_history_node.set_pending();
        that.graph_node.notify();
    };

    that.local_update_k = function(){
        // set flag
        that.graph_view.set_is_local_k(false);

        let params = "?dataset=" + that.dataset;
        that.local_update_k_node = new request_node(that.local_update_k_url + params,
            that.local_update_k_handler(async function(must_show_nodes, area, level, best_k){
                that.state.labeled_num = Object.values(that.state.complete_graph).filter(d => d.label[0] > -1).length;
                that.state.unlabeled_num = Object.values(that.state.complete_graph).length - that.state.labeled_num;
                that.update_control_info();
                // console.log("best k", best_k);
                // $(".best-k-text").attr("hidden", false);
                // $(".best-k-text").html("Best k: "+2);
                that.state.is_zoom = false;
                that.iter = Object.values(that.state.complete_graph)[0].label.length - 1;
                that.fetch_nodes(area, level, must_show_nodes);

                let show_ids = [];
                for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
                    if(that.state.visible_items[node_id] === true){
                        show_ids.push(node_id);
                    }
                }

                that.set_filter_data(that.state.nodes);
                let ranges = that.filter_view.get_ranges();
                that.set_filter_range(ranges[0], ranges[1], ranges[2], ranges[3], ranges[4], ranges[5], ranges[6], ranges[7]);
                await that.update_filter_view();
                that.state.glyphs = [];
                that.state.re_fetch = true;
                await that.update_graph_view();
                that.state.re_fetch = false;
                that.get_dist_view(show_ids);

                that.get_history();
            }), "json", "POST");
        // let data = {selected_idxs};
        data = that.setting_view.get_local_update_setting();
        selected_idxs = that.graph_view.get_highlights();
        data["selected_idxs"] = selected_idxs;
        let level = that.graph_view.get_level();
        let area = that.state.area;
        data["area"] = area;
        data["level"] = level;
        data["wh"] = that.graph_view.get_wh();
        that.local_update_k_node.set_data(data);
        that.local_update_k_node.notify();
    };

    that.update_filter_threshold = function(threshold){
        that.state.filter_threshold = threshold;
        let params = "?dataset=" + that.dataset +
            "&filter_threshold=" + that.state.filter_threshold;
        that.influence_filter_node = new request_node(that.set_influence_filter_url + params,
            that.set_influence_filter(), "json", "GET");
        that.influence_filter_node.notify();
    };

    that.set_view = function(v, name){
        that[name + "_view"] = v;
        v.set_data_manager(that);
    };

    // update img_url in states and update ImageView
    that.update_image_view = async function(nodes){
        let case1_step3 = [910,1544,1704,2031,2098,2410,2646,2888,2983,3723,3905,4255,4646,4779,5219,5360,5542,5816,5844,6126,6327,6576,6779,7205,8426,8545,8983,9340,9387,9470,9621,9697,9743,9890,10004,10276,10403,10442,10492,10579,10774,10904,11098,11457,11501,11511,11971,12325,12539,12689,12701,12710,12783,12837,48,64,103,144,152,169,241,450,453,512,556,671,812,885,951,975,1005,1133,1166,1209,1217,1291,1297,1710,1829,1892,1959,1975,2248,2428,2501,2523,2555,2687,2822,2839,2935,3188,3194,3321,3390,3420,3447,3485,3550,3591,3632,3674,3787,4079,4211,4233,4344,4480,4510,4657,4694,4808,4971,4983,5154,5172,5241,5248,5483,5605,5752,5819,5915,6103,6137,6209,6231,6315,6363,6396,6490,6521,6700,6997,7264,7529,7554,7890,7953,8003,8263,8520,8716,8723,8872,9086,9103,9171,9189,9921,10023,10044,10190,10204,10303,10360,10447,10524,10586,10707,10751,10863,10915,10943,10967,10973,11093,11263,11395,11543,11559,11657,11740,11755,11757,11860,11894,11923,11973,12008,12033,12035,12232,12277,12310,12354,12442,12473,12599,12606,12832];
        let intersect = nodes.filter(d => case1_step3.indexOf(d)>-1);
        let sort = true;
        if(that.dataname.toLowerCase() === "stl" && intersect.length > 15){
            let must_have = [548,1664,7256,8983,12532, 5528, 3298, 9616, 7453, 10651, 1193, 7762];
            nodes = must_have.concat(nodes);
            sort = false;
        }
        that.state.img_grid_urls = [];
        for(let node_id of nodes){
            that.state.img_grid_urls.push({
                url:that.image_url + "?filename=" + node_id + ".jpg",
                id:node_id,
            })
        }
        await that.image_view.component_update({
            "img_grid_urls": that.state.img_grid_urls,
            "re_fetch": that.state.re_fetch,
            "sort":sort
        })
    };

    that.delete_nodes_menu = function(nodes) {
        that.edit_view.delete_nodes(nodes);
    };


    that.update_history_view = function(){
        console.log("update history view");
        that.history_view.component_update({
            "history_data": that.state.history_data
        });
    };

    that.get_dist_view = function(selected_idxs){
        let params = "?dataset=" + that.dataset;
        that.flows_node = new request_node(that.flows_urls + params,
            that.get_flows_handler(that.update_dist_view), "json", "POST");
        that.flows_node.set_data(selected_idxs);
        that.flows_node.notify();
        // that.flows_node.depend_on(that.graph_node);

    };

    that.update_dist_view = function(selected_flows){
        console.log("update loss view");
        that.dist_view.component_update({
            "label_sums": that.state.label_sums,
            "flows": that.state.flows,
            "selected_flows": that.state.selected_flows,
            "label_names": that.state.label_names,
            "dist_mode": that.state.dist_mode
        }, selected_flows);
        //TODO:
        that.update_setting_view();
        that.update_edit_info()
    };

    that.retrain = function(){ 
        let params = "?dataset=" + that.dataset;
        that.retrain_node = new request_node(that.retrain_url + params,
            that.retrain_handler(that.update_history_view), "json", "POST");
        that.retrain_node.notify();
    };

    that.set_history = function(id){
        let params = "?dataset=" + that.dataset;
        that.set_history_node = new request_node(that.set_history_url + params,
            that.set_history_handler(function(must_show_nodes, area, level){
                that.state.labeled_num = Object.values(that.state.complete_graph).filter(d => d.label[0] > -1).length;
                that.state.unlabeled_num = Object.values(that.state.complete_graph).length - that.state.labeled_num;
                that.update_control_info();
                that.state.is_zoom = false;
                that.fetch_nodes(area, level, must_show_nodes);

                let show_ids = [];
                for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
                    if(that.state.visible_items[node_id] === true){
                        show_ids.push(node_id);
                    }
                }
                that.get_dist_view(show_ids);
                that.update_graph_view();
            }), "json", "POST");
        let data = {"id": id};
        let level = that.graph_view.get_level();
        let area = that.state.area;
        data["area"] = area;
        data["level"] = level;
        data["wh"] = that.graph_view.get_wh();
        that.set_history_node.set_data(data);
        // that.graph_node.clean_dependence();
        // that.graph_node.depend_on(that.set_history_node);
        // that.graph_node.set_pending();
        that.set_history_node.notify();
    };

    that.get_history = function(){
        let params = "?dataset=" + that.dataset;
        that.get_history_node = new request_node(that.get_history_url + params,
            that.update_history_handler(that.update_history_view), "json", "GET");
        that.get_history_node.notify();
    };

    that.change_dist_mode = function(){
        that.state.dist_mode = !that.state.dist_mode;
        that.update_dist_view();
    };

    that.get_selected_flows = function(path_id){
        that.dist_view.click_id = path_id;
        that.selected_flows_node = new request_node(that.selected_flows_urls,
            that.selected_flows_handler(async function(){

                // that.update_graph_view();
                // that.state.highlights = that.state.focus_idxs;
                // that.highlight_nodes(that.state.focus_idxs);
                // await that.update_graph_view();
                console.log("highlight nodes:", that.state.focus_idxs);
                await that.graph_view.highlight(that.state.focus_idxs);
                that.update_dist_view(true);
            }), "json", "POST");
        that.selected_flows_node.set_data({path_id});
        that.selected_flows_node.notify();
    };

    that.update_control_info = function() {
        $("#labeled-num").text((DataName=="stl"?50:that.state.labeled_num) + " Labeled Data");
        $("#unlabeled-num").text((DataName=="stl"?12790:that.state.unlabeled_num) + " Unlabeled Data");
        SettingView.setk_ui(that.state.k);
    };

    that.get_filter_view = function(state) {
        that.state.uncertainty_widget_data = state.uncertainty_widget_data;
        that.state.uncertainty_widget_range = state.uncertainty_widget_range;
        that.state.label_widget_data = state.label_widget_data;
        that.state.label_widget_range = state.label_widget_range;
        that.state.indegree_widget_data = state.indegree_widget_data;
        that.state.indegree_widget_range = state.indegree_widget_range;
        that.state.outdegree_widget_data = state.outdegree_widget_data;
        that.state.outdegree_widget_range = state.outdegree_widget_range;
        that.state.influence_widget_data = state.influence_widget_data;
        that.state.influence_widget_range = state.influence_widget_range;
        that.state.consistency_widget_data = state.consistency_widget_data;
        that.state.consistency_widget_range = state.consistency_widget_range;
        that.state.kdegree_widget_data = state.kdegree_widget_data;
        that.state.kdegree_widget_range = state.kdegree_widget_range;
        that.update_filter_view();
    };

    that.update_filter_view = function() {
        console.log("update filter view");
        that.filter_view.component_update({
            "label_names": that.state.label_names,
            "uncertainty_widget_data": that.state.uncertainty_widget_data,
            "uncertainty_widget_range": that.state.uncertainty_widget_range,
            "label_widget_data": that.state.label_widget_data,
            "label_widget_range": that.state.label_widget_range,
            "indegree_widget_data": that.state.indegree_widget_data,
            "indegree_widget_range":that.state.indegree_widget_range,
            "outdegree_widget_data":that.state.outdegree_widget_data,
            "outdegree_widget_range":that.state.outdegree_widget_range,
            "influence_widget_data":that.state.influence_widget_data,
            "influence_widget_range":that.state.influence_widget_range,
            "consistency_widget_data":that.state.consistency_widget_data,
            "consistency_widget_range":that.state.consistency_widget_range,
            "edgetype_data":that.state.edge_type_data,
            "edgetype_range":that.state.edge_type_range,
            "kdegree_widget_data":that.state.kdegree_widget_data,
            "kdegree_widget_range":that.state.kdegree_widget_range
        });
    };

    that.set_filter_data = function (nodes) {
        if(if_filter_use_complete_data) nodes = that.state.complete_graph;
        let iter = that.iter;
        // uncertainty
        let certainty_distribution = [];
        let min_certainty = 0;
        let max_certainty = 1;
        let certainty_cnt = 20;
        for(let i=0; i<certainty_cnt; i++) certainty_distribution.push([]);
        function uncertainty_interval_idx(certainty){
            if(certainty === max_certainty){
                return certainty_cnt-1;
            }
            return Math.floor(certainty/((max_certainty-min_certainty)/certainty_cnt));
        }
        for(let node_id of Object.keys(nodes).map(d => parseInt(d))){
            if(nodes[node_id] === undefined){
                console.log("no node:", node_id);
                continue
            }
            let scores = nodes[node_id].score[iter];
            let sort_score = JSON.parse(JSON.stringify(scores));
            sort_score.sort(function(a,b){return parseFloat(a)-parseFloat(b)});
            let uncertainty = that.graph_view.get_uncertainty(nodes[node_id], that.dataname);
            // change certainty to uncertainty
            let distribution_box = certainty_distribution[uncertainty_interval_idx(uncertainty)];
            distribution_box.push(node_id);
        }

        // label interval
        let min_label_id = -1;
        let max_label_id = that.state.label_names.length-1;
        let labels = [];
        let label_cnt = max_label_id-min_label_id+1;
        for(let i=0; i<label_cnt; i++){
            labels.push(i)
        }
        function label_interval_idx(label_id){
            return label_id;
        }
        let label_distribution = [];
        for(let i=0; i<label_cnt; i++) label_distribution.push([]);
        for(let node_id of Object.keys(nodes).map(d => parseInt(d))){
            if(nodes[node_id] === undefined){
                console.log("no node:", node_id);
                continue
            }
            let predict_label = nodes[node_id].label[iter];
            let distribution_box = label_distribution[label_interval_idx(predict_label)+1];
            distribution_box.push(node_id);
        }

        // indegree interval
        let min_in_degree = 0;
        let max_in_degree = 20;
        let indegree_cnt = max_in_degree-min_in_degree;
        function indegree_interval_idx(in_degree){
            return in_degree>=max_in_degree?max_in_degree-1:in_degree;
        }
        let indegree_distribution = [];
        for(let i=0; i<indegree_cnt; i++) indegree_distribution.push([]);
        for(let node_id of Object.keys(nodes).map(d => parseInt(d))){
            if(nodes[node_id] === undefined){
                console.log("no node:", node_id);
                continue
            }
            let in_degree = nodes[node_id].in_degree;
            let distribution_box = indegree_distribution[indegree_interval_idx(in_degree)];
            distribution_box.push(node_id);
        }

        // indegree interval
        let min_out_degree = 0;
        let max_out_degree = 20;
        let outdegree_cnt = max_out_degree-min_out_degree;
        function outdegree_interval_idx(out_degree){
            return out_degree>=max_out_degree?max_out_degree-1:out_degree;
        }
        let outdegree_distribution = [];
        for(let i=0; i<outdegree_cnt; i++) outdegree_distribution.push([]);
        for(let node_id of Object.keys(nodes).map(d => parseInt(d))){
            if(nodes[node_id] === undefined){
                console.log("no node:", node_id);
                continue
            }
            let in_degree = nodes[node_id].out_degree;
            let distribution_box = outdegree_distribution[outdegree_interval_idx(in_degree)];
            distribution_box.push(node_id);
        }

        // consistency interval
        let min_consistency = 0;
        let max_consistency = 6;
        let consistency_cnt = max_consistency-min_consistency+1;
        function consistency_interval_idx(consistency){
            return consistency>=max_consistency?max_consistency:consistency;
        }
        let consistency_distribution = [];
        for(let i=0; i<consistency_cnt; i++) consistency_distribution.push([]);
        for(let node_id of Object.keys(nodes).map(d => parseInt(d))){
            if(nodes[node_id] === undefined){
                console.log("no node:", node_id);
                continue
            }
            let consistency = nodes[node_id].consistency;
            let distribution_box = consistency_distribution[consistency_interval_idx(consistency)];
            distribution_box.push(node_id);
        }

        let min_influence = 0;
        let max_influence = 1;
        let influence_cnt = 20;
        function influence_interval_idx(influence){
            let idx = Math.floor((influence-min_influence)*(max_influence-min_influence)*influence_cnt);
            if(idx === influence_cnt) return idx-1;
            return idx;
        }
        let influence_distribution = [];
        for(let i=0; i<influence_cnt; i++) influence_distribution.push(0);
        for(let node_id of Object.keys(nodes).map(d => parseInt(d))){
            if(nodes[node_id] === undefined){
                console.log("no node:", node_id);
                continue
            }
            for(let influence of nodes[node_id].from_weight){
                influence_distribution[influence_interval_idx(that.graph_view.transform_weight(influence))] ++;
            }
            // let in_degree = nodes[node_id].in_degree;
            // let distribution_box = indegree_distribution[indegree_interval_idx(in_degree)];
            // distribution_box.push(node_id);
        }


        that.state.uncertainty_widget_data = certainty_distribution;
        that.state.label_widget_data = label_distribution;
        that.state.indegree_widget_data = indegree_distribution;
        that.state.outdegree_widget_data = outdegree_distribution;
        that.state.influence_widget_data = influence_distribution;
        that.state.consistency_widget_data = consistency_distribution;
    };

    that.set_propagation_filter_data = function(data, max_in, max_out) {
        let ranges = that.filter_view.get_ranges();
        that.set_filter_range(ranges[0], ranges[1], ranges[2], ranges[3], ranges[4], ranges[5], ranges[6], ranges[7]);
        that.state.kdegree_widget_data = data;
        that.state.kdegree_widget_range = [-max_in, max_out];
        that.update_filter_view();
    };

    that.setIter = function (iter) {
        that.iter = iter;
        that.set_filter_data(that.state.nodes);
        let ranges = that.filter_view.get_ranges();
        that.set_filter_range(ranges[0], ranges[1], ranges[2], ranges[3], ranges[4], ranges[5], ranges[6], ranges[7]);
        that.update_filter_view();
        that.state.visible_items = that.filter_view.get_visible_items();
        that.state.glyphs = that.filter_view.get_glyph_items();
        that.update_graph_view();

        that.graph_view.setIter(iter);
        that.image_view.setIter(iter);

    };

    that.update_edge_type_bar = function(data){
        console.log("update edge type bar");
        let ranges = that.filter_view.get_ranges();
        that.set_filter_range(ranges[0], ranges[1], ranges[2], ranges[3], ranges[4], ranges[5], ranges[6], ranges[7]);
        that.state.edge_type_data = data;
        // that.state.edge_type_range = range;
        that.update_filter_view();

    };

    that.set_filter_range = function (uncertainty_range, label_range, indegree_range, outdegree_range, influence_range, edgetype_range, consistency_range, kdegree_range){
        that.state.uncertainty_widget_range = uncertainty_range;
        that.state.label_widget_range = label_range;
        that.state.indegree_widget_range = indegree_range;
        that.state.outdegree_widget_range = outdegree_range;
        that.state.influence_widget_range = influence_range;
        that.state.edge_type_range = edgetype_range;
        that.state.consistency_widget_range = consistency_range;
        that.state.kdegree_widget_range = kdegree_range;
    };

    that.update_edge_filter = function(min_threshold, max_threshold) {
        that.state.edge_filter_threshold = [min_threshold/20, (max_threshold+1)/20];
        console.log(that.state.edge_filter_threshold);
        that.update_graph_view();
    };

    that.update_edge_type_filter = function(range) {
        that.state.edge_type_range = range;
        console.log("Edge type filter:", range);
        that.update_graph_view();
    };

    // setting view
    that.update_setting_view = function(){
        that.setting_view.component_update({
            label_names: that.state.label_names
        });
    };

    //graph view:
    // first load graph
    that.get_graph_view = function() {
        $(".loading").hide();
        $(".loading-svg").hide();

        // update control info
        that.state.labeled_num = Object.values(that.state.complete_graph).filter(d => d.label[0] > -1).length;
        that.state.unlabeled_num = Object.values(that.state.complete_graph).length - that.state.labeled_num;
        that.update_control_info();


        that.state.rescale = true;
        that.state.highlights = [];
        // that.state.path = [];
        that.is_show_path = false;
        that.state.visible_items = {};
        for(let node_id of  Object.keys(that.state.nodes).map(d => parseInt(d))){
            that.state.visible_items[node_id] = true;
        }
        that.iter = Object.values(that.state.nodes)[0].label.length-1;

        // update filter
        that.set_filter_data(that.state.nodes);
        let label_range = [];
        for(let i=0; i<=that.state.label_names.length; i++){
            label_range.push(i);
        }
        // // edited by Changjian
        that.set_filter_range([19, 19], label_range, [0, 19], [0,19],
            [0,19], ["between"], [0, 6], that.state.kdegree_widget_range);
        that.update_filter_view();
        that.state.glyphs = that.state.uncertainty_widget_data[that.state.uncertainty_widget_data.length - 1];

        //update view
        let show_ids = [];
        for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
            if(that.state.visible_items[node_id] === true){
                show_ids.push(node_id);
            }
        }
        that.get_dist_view(show_ids);
        that.update_graph_view();
    };

    that.update_graph_view = async function(reset = true) {
        console.log("update graph view");
        if(reset) reset_spinner();
        await that.graph_view.component_update({
            "nodes":that.state.nodes,
            "path":that.state.path,
            "highlight_path": that.state.highlight_path,
            "is_show_path":that.state.is_show_path,
            "highlights":that.state.highlights,
            "area":that.state.area,
            "rescale":that.state.rescale,
            "visible_items":that.state.visible_items,
            "glyphs": that.state.glyphs,
            "aggregate": that.state.aggregate,
            "rect_nodes": that.state.rect_nodes,
            "edge_filter_threshold": that.state.edge_filter_threshold,
            "edge_type_range": that.state.edge_type_range,
            "edit_state": that.state.edit_state,
            "if_focus_selection_box": that.state.if_focus_selection_box,
            "re_focus_selection_box":that.state.re_focus_selection_box,
            "label_names": that.state.label_names,
            "outliers": that.state.outliers
        });

    };

    that.focus_selection_box = function(selection_box) {
        that.state.if_focus_selection_box = true;
        that.state.re_focus_selection_box = true;
        that.state.nodes_before_focus_selection = that.state.nodes;
        that.state.selection_before_focus_sulection = selection_box.map(function (d) {
                return {
                    "x": d.x,
                    "y":d.y,
                    "rx":d.rx,
                    "ry":d.ry,
                    "tao":d.tao,
                    "F1":JSON.parse(JSON.stringify(d.F1)),
                    "F2":JSON.parse(JSON.stringify(d.F2)),
                    "s":d.s,
                    "d":d.d,
            }
        });
        let res = that.get_nodes_in_area(selection_box, that.graph_view.center_scale_x, that.graph_view.center_scale_y);
        let nodes = res[0];
        let nodes_in_area = res[1];
        that.state.nodes = nodes;
        that.state.rescale = false;
        let i=0;
        for(let one_selection_box of selection_box){
            one_selection_box.nodes = nodes_in_area[i++];
        }
        that.set_filter_data(that.state.nodes);
        let ranges = that.filter_view.get_ranges();
        that.set_filter_range(ranges[0], ranges[1], ranges[2], ranges[3], ranges[4], ranges[5], ranges[6], ranges[7]);
        that.update_filter_view();
        that.graph_view.show_edges();
        that.state.re_focus_selection_box = false;
    };

    that.unfocus_selection_box = function(selection_box) {
        that.state.if_focus_selection_box = false;
        that.state.re_focus_selection_box = false;
        that.state.nodes = that.state.nodes_before_focus_selection;
        for(let i=0; i<selection_box.length; i++){
            selection_box[i].x = that.state.selection_before_focus_sulection[i].x;
            selection_box[i].y = that.state.selection_before_focus_sulection[i].y;
            selection_box[i].rx = that.state.selection_before_focus_sulection[i].rx;
            selection_box[i].ry = that.state.selection_before_focus_sulection[i].ry;
            selection_box[i].tao = that.state.selection_before_focus_sulection[i].tao;
            selection_box[i].F1 = that.state.selection_before_focus_sulection[i].F1;
            selection_box[i].F2 = that.state.selection_before_focus_sulection[i].F2;
            selection_box[i].s = that.state.selection_before_focus_sulection[i].s;
            selection_box[i].d = that.state.selection_before_focus_sulection[i].d;
        }
        for(let i = 0; i < selection_box.length; i++){
            let nodes = Object.values(that.state.nodes)
                .filter(d => inbox(selection_box[i], that.graph_view.center_scale_x(d.x), that.graph_view.center_scale_y(d.y)));
            selection_box[i].nodes = nodes;
        }
        that.set_filter_data(that.state.nodes);
        let ranges = that.filter_view.get_ranges();
        that.set_filter_range(ranges[0], ranges[1], ranges[2], ranges[3], ranges[4], ranges[5], ranges[6], ranges[7]);
        that.update_filter_view();
        that.graph_view.show_edges();
    };

    that.graph_home_callback = function() {
        that.state.rescale = true;
        that.state.highlights = [];
        that.state.path = [];
        that.is_show_path = false;
        that.state.visible_items = {};
        that.state.glyphs = [];
        for(let node_id of  Object.keys(that.state.nodes).map(d => parseInt(d))){
            that.state.visible_items[node_id] = true;
        }

        // update filter
        that.set_filter_data(that.state.nodes);
        let label_range = [];
        for(let i=0; i<=that.state.label_names.length; i++){
            label_range.push(i);
        }
        that.set_filter_range([19, 19], label_range, [0, 19], [0,19],
            [0,19], [], [0,6], that.state.kdegree_widget_range);
        // that.set_filter_range([18, 19], label_range, [0, 19], [0,19]);
        that.update_filter_view();
        // update dist view
        let show_ids = [];
        for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
            if(that.state.visible_items[node_id] === true){
                show_ids.push(node_id);
            }
        }
        that.get_dist_view(show_ids);
        that.update_graph_view(false);
    };

    that.graph_home = function() {
        let params = "?dataset=" + that.dataset;
        // let home_node = new request_node(that.home_graph_url + params,
        //     that.home_graph_handler(that.graph_home_callback), "json", "POST");
        // home_node.set_data({});
        // home_node.notify();
        that.get_home();
        that.graph_home_callback();
    };

    that.zoom_graph_view = function() {
        that.set_filter_data(that.state.nodes);
        let ranges = that.filter_view.get_ranges();
        that.set_filter_range(ranges[0], ranges[1], ranges[2], ranges[3], ranges[4], ranges[5], ranges[6], ranges[7]);
        that.update_filter_view();
        that.state.visible_items = that.filter_view.get_visible_items();
        that.state.glyphs = that.filter_view.get_glyph_items();
        // update dist view
        let show_ids = [];
        for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
            if(that.state.visible_items[node_id] === true){
                show_ids.push(node_id);
            }
        }
        that.get_dist_view(show_ids);
        that.update_graph_view();
    };

    that.zoom_graph_view_notify = function (area, target_level) {
        that.state.area = area;
        that.state.rescale = false;
        that.zoom_graph(area, target_level);
        that.zoom_graph_view();
        //
        // let params = "?dataset=" + that.dataset;
        // let update_graph_node = new request_node(that.zoom_graph_url + params,
        //     that.zoom_graph_handler(that.zoom_graph_view), "json", "POST");
        // that.state.area = area;
        // that.state.rescale = false;
        // update_graph_node.set_data({
        //     'area': area,
        //     'level': target_level
        // });
        // update_graph_node.notify();
    };

    that.change_visible_items = function(visible_items) {
        that.state.visible_items = visible_items;
        that.state.rescale = false;
        let show_ids = [];
        for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
            if(that.state.visible_items[node_id] === true){
                show_ids.push(node_id);
            }
        }
        that.get_dist_view(show_ids);
        that.update_graph_view();
    };

    that.change_glyphs = function(glyphs){
        that.state.glyphs = glyphs;
        // that.state.rescale = false;
        // let show_ids = [];
        // for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
        //     if(that.state.visible_items[node_id] === true){
        //         show_ids.push(node_id);
        //     }
        // }
        // that.get_dist_view(show_ids);
        that.update_graph_view();
    };

    that.fetch_graph_node = function(must_show_nodes, area, level, wh, mode, data) {
         let params = "?dataset=" + that.dataset;
        // let fetch_graph = new request_node(that.fisheye_graph_url + params,
        //     that.fetch_graph_handler(that.zoom_graph_view), "json", "POST");
        that.state.rescale = false;
        if(mode.startsWith("showpath")){
            let from_or_to = mode.split("-")[1];
            that.state.is_show_path = true;
            that.state.rect_nodes = that.state.highlights;
            that.state.path = [];
            for(let apath of data){
                that.state.path.push([apath, from_or_to]);
            }
        }
        else if(mode === "highlight"){
            that.state.is_show_path = false;
            that.state.highlights = data;
        }
        that.state.area = area;
        that.fetch_nodes(area, level, must_show_nodes);
        that.zoom_graph_view();
        // fetch_graph.set_data({
        //     'must_show_nodes':must_show_nodes,
        //     'area':area,
        //     'level':level,
        //     'wh':wh
        // });
        // fetch_graph.notify();
    };

    that.show_highlight_node = function(highlight_nodes) {
        that.state.highlights = highlight_nodes;
        that.state.rescale = false;
        // let show_ids = [];
        // for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
        //     if(that.state.visible_items[node_id] === true){
        //         show_ids.push(node_id);
        //     }
        // }
        // that.get_dist_view(show_ids);
        that.update_graph_view();
    };

    that.show_path_node = function(path, mode) {
        if(path.length > 0){
            that.state.path = [];
            for(let apath of path){
                that.state.path.push([apath, mode]);
            }
            that.state.is_show_path = true;
            that.state.rect_nodes = that.state.highlights;
        }
        else {
            that.state.path = [];
            that.state.is_show_path = false;
        }
        that.state.rescale = false;
        let show_ids = [];
        for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
            if(that.state.visible_items[node_id] === true){
                show_ids.push(node_id);
            }
        }
        that.get_dist_view(show_ids);
        that.update_graph_view();
    };

    // highlight nodes:
    that.highlight_nodes = function(nodes_id){
        that.state.highlights = nodes_id;
        that.state.focus_idxs = nodes_id;
        // that.state.highlights = that.state.focus_idxs;
        that.update_graph_view();
    };

    that.highlight_path = function(path){
        path = path.map(d => [that.state.complete_graph[d[0]],
                                that.state.complete_graph[d[1]],
                                d[2]]);
        that.state.highlight_path = path;
        that.update_graph_view();
    };

    that.get_show_ids = function(){
        let show_ids = [];
        for(let node_id of Object.keys(that.state.nodes).map(d => parseInt(d))){
            if(that.state.visible_items[node_id] === true){
                show_ids.push(node_id);
            }
        }
        return show_ids;
    }

    that.delete_box = async function(id){
        await that.graph_view.delete_box(id);
    }

    that.init = function () {
        that._init();
    }.call();
};
