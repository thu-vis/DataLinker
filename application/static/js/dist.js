/*
* added by Changjian Chen, 20191015
* */

let DistLayout = function (container) {
    let that = this;
    that.container = container;

    let bbox = that.container.node().getBoundingClientRect();
    // overall layout
    let width = bbox.width;
    let height = bbox.height - 10;
    let x_shift = 40;
    // legend layout
    let legend_hight = 25;
    let legend_width = width -60;
    let legend_x_shift = x_shift - 10;
    let legend_y_shift = 3;
    let rect_width = 75;
    let rect_height = legend_hight * 0.75;
    let rect_margin = null;  // To be determined according to data
    // river layout
    let node_width = 20;
    let layout_width = legend_width;
    let layout_height = height - legend_hight - 65;
    let layout_x_shift = x_shift - node_width / 2;
    let layout_y_shift = 10 + legend_hight;
    // slider layout
    let slider_width = legend_width - 20;
    let slider_x_shift = x_shift;
    let slider_hump_length = 20;
    let slider_y_shift = height - 38;
    let slider_height = 6;
    let AnimationDuration = 500;
    let create_ani = AnimationDuration;
    let update_ani = AnimationDuration;
    let remove_ani = AnimationDuration;

    console.log("Dist view", "layout width", layout_width, "layout height", layout_height);
    if (layout_width < 0) {
        console.log("error");
    }

    let svg = null;
    let node_group = null;
    let link_group = null;
    let flow_text_group = null;
    let slider_group = null;
    let legend_group = null;
    let selected_link_group = null;
    let selected_node_group = null;

    let data_manager = null;

    // data
    let nodes = null;
    let links = null;
    let selected_links = null;
    let selected_nodes = null;
    let label_names = null;
    let dist_mode = null;
    let colors = [UnlabeledColor].concat(CategoryColor);
    let slider_delta = null;
    let iter_list = null;
    let total_iters = null;
    let current_iter = 0;
    let slider_color = "#A9A9A9";
    that.flow_text = [];

    // flags
    that.click_id = null;
    let draging = null;
    that.controlInstanceView = null;
    that.controlInfoView = null;

    that._init = function () {
        svg = container.append("svg")
            .attr("id", "loss-view-svg")
            .attr("width", width)
            .attr("height", height)
            .on("click", function(){
                that._unset_click();
            });
        node_group = svg.append("g")
            .attr("id", "node_group")
            .attr("transform", "translate(" + 0 + ", " + 10 + ")");
        link_group = svg.append("g")
            .attr("id", "link_group")
            .attr("transform", "translate(" + 0 + ", " + 10 + ")");
        flow_text_group = svg.append("g")
            .attr("id", "flow_text_group")
            .attr("transform", "translate(" + 0 + ", " + 10 + ")");
        selected_link_group = svg.append("g")
            .attr("id", "selected_link_group")
            .attr("transform", "translate(" + 0 + ", " + 10 + ")");
        selected_node_group = svg.append("g")
            .attr("id", "selected_node_group")
            .attr("transform", "translate(" + 0 + ", " + 10 + ")");
        slider_group = svg.append("g")
            .attr("id", "slider_group")
            .attr("transform", "translate(" + 0 + ", " + (10 + slider_y_shift) + ")");
        legend_group = svg.append("g")
            .attr("id", "legend_group")
            .attr("transform", "translate(" + legend_x_shift + ", " 
                + (10 + legend_y_shift) + ")");
        svg.append("text")
            .attr("x", width - 70)
            .attr("y", height)
            .attr("text-anchor", "start")
            .attr("font-size", 16)
            .text("Iteration")
    };

    that.set_data_manager = function (_data_manager) {
        data_manager = _data_manager;
    };

    that.component_update = function (state, selected_flows) {
        console.log("loss component update");
        that._update_data(state);
        that._update_view(selected_flows);
    };

    that._init_view = function () {

    };

    that._update_data = function (state) {
        // update dist mode
        dist_mode = state.dist_mode;
        console.log("dist_mode", dist_mode);
        // update label names
        label_names = ["Unlabeled"].concat(state.label_names);
        rect_width = legend_width / label_names.length / 1.2;
        rect_margin = (legend_width - label_names.length * rect_width)
            / (label_names.length - 1);
        console.log("rect-margin", rect_margin);
        // update node and link data 

        let label_sums = JSON.parse(JSON.stringify(state.label_sums));
        total_iters = label_sums.length;
        current_iter =  total_iters-1;
        data_manager.iter = current_iter;
        that.controlInstanceView.setIter(current_iter);
        that.controlInfoView.setIter(current_iter);
        iter_list = new Array(total_iters).fill().map((_, i) => i);
        let flows = JSON.parse(JSON.stringify(state.flows));
        let original_flows = JSON.parse(JSON.stringify(state.flows));
        let selected_flows = state.selected_flows || null; 
        that.original_flows = original_flows;
        that.selected_flows = selected_flows;
        console.log("selected_flows", selected_flows);
        let class_num = label_sums[0].length;

        // scale
        let scale_func = function (v) {
            return Math.pow(v, 0.8);
        };

        for (let j = 0; j < class_num; j++) {
            label_sums[0][j] = scale_func(label_sums[0][j]);
        }

        for (let i = 0; i < (total_iters - 1); i++) {
            let present_vec = label_sums[i];
            let next_vec = new Array(class_num).fill(0);
            for (let j = 0; j < class_num; j++) {
                let next_sum = oneD_sum(flows[i][j]);
                next_sum += 0.00001;
                for (let k = 0; k < class_num; k++) {
                    flows[i][j][k] /= next_sum;
                    flows[i][j][k] *= present_vec[j];
                }
            }
            for (let k = 0; k < class_num; k++) {
                for (let j = 0; j < class_num; j++) {
                    next_vec[k] += flows[i][j][k];
                }
            }
            label_sums[i + 1] = next_vec;
        }

        // // exp
        // for (let i = 0; i < (total_iters - 1); i++) {
        //     console.log(twoD_sum(flows[i]));
        // }

        // crete nodes
        let _nodes = [];
        for (let i = 0; i < total_iters; i++) {
            for (let j = 0; j < class_num; j++) {
                if (label_sums[i][j] > 0) {
                    _nodes.push({
                        "name": i + "-" + j,
                        "color": colors[j],
                        "class": j,
                        "layer": i
                    })
                }
            }
        }
        // create links
        let _links = [];
        for (let i = 0; i < (total_iters - 1); i++) {
            let flow = flows[i];
            for (let j = 0; j < class_num; j++) {
                for (let k = 0; k < class_num; k++) {
                    if (flow[j][k] > 0) {
                        _links.push({
                            "source": i + "-" + j,
                            "target": (i + 1) + "-" + k,
                            "names": i + "-" + j + "-" + (i + 1) + "-" + k,
                            "value": flow[j][k],
                            "source_class": j,
                            "target_class": k,
                            "level": i,
                            "uid": "gc" + i + "-" + j + "-" + (i + 1) + "-" + k,
                            "suid": "gc-s" + i + "-" + j + "-" + (i + 1) + "-" + k,
                        })
                    }
                }
            }
        }

        // create sankey diagram
        let sankey = d3.sankey()
            .nodeId(d => d.name)
            .nodeWidth(node_width)
            .nodePadding(1)
            .extent([[layout_x_shift, layout_y_shift],
                [layout_x_shift + layout_width, layout_y_shift + layout_height]])
            .nodeSort((a, b) => (a.class - b.class));
        let res = sankey({
            nodes: _nodes.map(d => Object.assign({}, d)),
            links: _links.map(d => Object.assign({}, d))
        });
        nodes = res.nodes;
        links = dist_mode ? res.links : res.links.filter(d => d.source_class !== d.target_class);
        // for debug
        that.nodes = nodes;
        that.links = links;

        // get flow text
        let consist_links = res.links.filter(d => d.source_class === d.target_class);
        let change_links = res.links.filter(d => d.source_class !== d.target_class);
        consist_links = consist_links.filter(function(d){
            for(let i = 0; i < change_links.length; i++){
                let c = change_links[i];
                if (c.level !== d.level) continue;
                if ((c.source_class > d.source_class && c.target_class < d.target_class) ||
                    (c.source_class < d.source_class && c.target_class > d.target_class)){
                        return false;
                    }
            }
            return true;
        })
        // links.forEach(d => d.select = 0);
        // consist_links.forEach(d => d.select = 1);
        that.flow_text = [];
        for (let i = 0; i < label_names.length; i++){
            that.flow_text.push({"id": i});
            let text_data = that.flow_text[i];
            // text_data.link = {};
            text_data.h = -1;
            consist_links.forEach(d => {
                if(d.source_class === i && d.value > text_data.h){
                    text_data.h = d.value;
                    text_data.link = d;
                }
            })
        }

        // for selected_flows
        selected_links = [];
        selected_nodes = [];
        nodes.forEach(d => {d.source_s_links = []; d.target_s_links = [];});
        for (let i = 0; i < (total_iters - 1); i++){
            for (let j = 0; j < class_num; j++) {
                for (let k = 0; k < class_num; k++) {
                    if (selected_flows[i][j][k] !== 0){
                        let name = i + "-" + j + "-" + (i + 1) + "-" + k;
                        let _link = links.filter(d => d.names === name)[0];
                        // console.log(name, _link);
                        _link.selected_width = _link.width * selected_flows[i][j][k] / 
                            original_flows[i][j][k];
                        selected_links.push(_link);
                        selected_nodes.push(_link.source);
                        selected_nodes.push(_link.target);
                        _link.source.source_s_links.push(_link);
                        _link.target.target_s_links.push(_link);
                    }
                }
            }
        }
        selected_nodes = delRepeatDictArr(selected_nodes);
        selected_nodes.forEach(d => {
            if (d.source_s_links.length > 0){
                d.selected_height = d.source_s_links.map(d => d.selected_width).reduce((a,b) => a+=b);
            }
            else{
                d.selected_height = d.target_s_links.map(d => d.selected_width).reduce((a,b) => a+=b);
            }
            d.s_y = (d.y0 + d.y1) / 2 - d.selected_height / 2;
            let start_y = d.s_y;
            for (let i = 0; i < d.source_s_links.length; i++){
                d.source_s_links[i].s_y0 = start_y + d.source_s_links[i].selected_width / 2;
                start_y = d.source_s_links[i].selected_width + start_y;
            }
            start_y = d.s_y;
            for (let i = 0; i < d.target_s_links.length; i++){
                d.target_s_links[i].s_y1 = start_y + d.target_s_links[i].selected_width / 2;
                start_y = d.target_s_links[i].selected_width + start_y;
            }
        });
        that.selected_links = selected_links;
        that.selected_nodes = selected_nodes;

        // slider
        slider_delta = slider_width / (total_iters - 1);
    };

    that.setIter = function (newiter) {
        if (newiter >= total_iters) {
            console.log(newiter, "is larger than ", total_iters - 1);
            return;
        }
        current_iter = newiter;
        that._update_view();
        data_manager.setIter(newiter);
    };

    that._update_view = function (selected_flows) {
        if(!selected_flows){
            that._create();
            that._update();
            that._remove();
        }
        else{
            that._create_selected_flows();
            that._update_selected_flows();
            that._remove_selected_flows();
        }
        
        if(that.click_id){
            that._focus_link([]);
            that._focus_node([]);
        }
    };

    that._create = function () {
        // create nodes
        node_group
            .selectAll(".dist-node")
            .data(nodes, d => d.name)
            .enter()
            .append("rect")
            .attr("class", "dist-node")
            .attr("id", d => "node-" + d.name)
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .style("fill", d => d.color)
            .style("fill-opacity", 0)
            .on("click", function(d){
                that.click_id = "node-" + d.name;
                that.click_id = JSON.parse(JSON.stringify(that.click_id));
                console.log("click_id", d);
                d3.event.stopPropagation();
                data_manager.get_selected_flows(that.click_id);
                // that._focus_node([]);
                // that._focus_link([]);
            })

        // create links
        let links_g = link_group.selectAll(".dist-link")
            .data(links, d => "link-" + d.source.name + "-" + d.target.name)
            .enter()
            .append("g")
            .attr("class", "dist-link")
            .attr("id", d => "link-" + d.source.name + "-" + d.target.name);
        const gradient = links_g.append("linearGradient")
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("id", function (d) {
                return d.uid;
            })
            .attr("x1", d => d.source.x1)
            .attr("x2", d => d.target.x0);
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", d => d.source.color);
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", d => d.target.color);
        links_g.append("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", d => "url(#" + d.uid + ")")
            .attr("stroke-width", function(d){
                if (d.source_class === 0 || d.target_class === 0){
                    return d.width;
                }
                return Math.max(...[1.5, d.width]);
            })
            .attr("stroke-opacity", 0)
            .style("fill-opacity", 0)
            .on("mouseover", function(d){
                if (that.click_id) return;
                let n = [d.source, d.target];
                that._focus_link([d]);
                that._focus_node(n);
                that._pinked_highlight();
            })
            .on("mouseout", function(d){
                if (that.click_id) return;
                that._unfocus_link();
                that._unfocus_node();
                that._pinked_highlight();
            })
            .on("click", function(d){
                that.click_id = "link-" + d.source.name + "-" + d.target.name;
                that.click_id = JSON.parse(JSON.stringify(that.click_id));
                console.log("click_id", d);
                d3.event.stopPropagation();
                data_manager.get_selected_flows(that.click_id);
                that._pinked_highlight();

            });

        // create flow text
        flow_text_group.selectAll("text.flow-text")
            .data(that.flow_text, d => d.id)
            .enter()
            .append("text")
            .attr("class", "flow-text")
            .attr("font-size", 14)
            .attr("text-anchor", "middle")
            .attr("x", d => d.link ? (d.link.source.x1 + d.link.target.x0) / 2 : 0)
            .attr("y", d => d.link ? (d.link.source.y0 + d.link.source.y1 
                + d.link.target.y0 + d.link.target.y1) / 4 + 5 : 0)
            .text((d,i) => label_names[i])
            .style("fill", "white")
            .style("opacity", d => d.link ? (d.link.width > 14 ? 1 : 0) : 0)

        // create slider
        that._create_slider();

        // create legend
        that._create_legend();

        // create selected flows
        that._create_selected_flows();
    };

    that._focus_link = function(_d_list){
        // console.log("exp focus_link", _d);
        // console.log("focus_link", that.click_id);
        d3.selectAll(".dist-link")
            .selectAll("path")
            .attr("stroke-opacity", 0.05);
        for(let i = 0; i < _d_list.length; i++){
            let _d = _d_list[i];
            d3.selectAll("#" + "link-" + _d.source.name + "-" + _d.target.name)
                .selectAll("path")
                .attr("stroke-width", Math.max(...[1.5, _d.width]) + 1.5)
                .attr("stroke-opacity", 0.4);
        }
        // if(that.click_id){
        //     d3.selectAll("#" + that.click_id)
        //         .selectAll("path")
        //         .attr("stroke-width", d => Math.max(...[1.5, d.width]) + 1.5)
        //         .attr("stroke-opacity", 0.4);
        // }
    };

    that._unfocus_link = function(_d){
        console.log("unfocus_link", that.click_id);
        if(that.click_id){
            // console.log("unfocus_link with highlight");
            // d3.selectAll("#" + that.click_id)
            //     .selectAll("path")
            //     .attr("stroke-width", d => Math.max(...[1.5, d.width]) + 1.5)
            //     .attr("stroke-opacity", 0.4);
            // if (_d){
            //     d3.selectAll("#" + "link-" + _d.source.name + "-" + _d.target.name)
            //         .selectAll("path")
            //         .attr("stroke-width", d => Math.max(...[1.5, d.width]) + 1.5)
            //         .attr("stroke-opacity", 0.1);
            // }
            d3.selectAll(".dist-link")
            .selectAll("path")
            .attr("stroke-width", function(d){
                if (d.source_class === 0 || d.target_class === 0){
                    return d.width;
                }
                return Math.max(...[1.5, d.width]);
            })
            .attr("stroke-opacity", 0.05);
        }
        else{
            d3.selectAll(".dist-link")
                .selectAll("path")
                .attr("stroke-width", function(d){
                    if (d.source_class === 0 || d.target_class === 0){
                        return d.width;
                    }
                    return Math.max(...[1.5, d.width]);
                })
                .attr("stroke-opacity", 0.4);
        }
        // d3.selectAll(".dist-link")
        //     .selectAll("path")
        //     .attr("stroke-width", d => Math.max(...[1.5, d.width]))
        //     .attr("stroke-opacity", 0.4);
    };

    that._focus_node = function(_d_list){
        // console.log("_focus_node:", _d_list);
        d3.selectAll(".dist-node")
            .style("fill-opacity", 0.2);
        for(let i = 0; i < _d_list.length; i++){
            let _d = _d_list[i];
            d3.select("#node-" + _d.name)
                .style("fill-opacity", 1);
        }
    };

    that._unfocus_node = function(d){
        d3.selectAll(".dist-node")
            .style("fill-opacity", 1);
    };

    that._pinked_highlight = function(){
        
    };

    that._unset_click = function(){
        // that.click_id = 1;
        // console.log("unset_click");
        if (that.click_id){
            console.log("click area other than path!!");
            that.click_id = null;
            that._unfocus_link();
            that._unfocus_node();
            selected_links = [];
            selected_nodes = [];
            that._update_view();
        }
    };

    that._create_selected_flows = function(){
        let selected_links_g = selected_link_group.selectAll(".dist-s-link")
            .data(selected_links, d => "s-link-" + d.source.name + "-" + d.target.name)
            .enter()
            .append("g")
            .attr("class", "dist-s-link")
            .attr("id", d => "s-link-" + d.source.name + "-" + d.target.name);
        const selected_gradient = selected_links_g.append("linearGradient")
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("id", function (d) {
                return d.suid;
            })
            .attr("x1", d => d.source.x1)
            .attr("x2", d => d.target.x0);
        selected_gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", d => d.source.color);
        selected_gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", d => d.target.color);
        selected_links_g.append("path")
            .attr("d", d3.SelectedSankeyLinkHorizontal())
            .attr("stroke", d => "url(#" + d.suid + ")")
            .attr("stroke-width", function(d){
                if (d.source_class === 0 && (d.target_class === 0 || d.target_class === 1)){
                    return d.selected_width;
                }
                return Math.max(...[1.5, d.selected_width]);
            })
            .attr("stroke-opacity", 0.6)
            .style("fill-opacity", 0);

        
        selected_node_group
            .selectAll(".dist-s-node")
            .data(selected_nodes, d => d.name)
            .enter()
            .append("rect")
            .attr("class", "dist-s-node")
            .attr("id", d => "node-" + d.name)
            .attr("x", d => d.x0)
            .attr("y", d => d.s_y)
            .attr("height", d => Math.max(...[1, d.selected_height]))
            .attr("width", d => d.x1 - d.x0)
            .style("fill", d => d.color);
    }

    that._create_slider = function(){        
        let that = this;
        let xPositionScale = d3
            .scaleLinear()
            .domain([- slider_hump_length/slider_delta, total_iters - 1 + slider_hump_length/slider_delta])
            .range([slider_x_shift - slider_hump_length, slider_x_shift + slider_width + slider_hump_length]);
        let drag_start = function () {
            draging = true;
        };

        let drag_slider = function () {
            let value = d3.event.x;
            if (value < slider_x_shift) value = slider_x_shift;
            if (value > slider_x_shift + slider_width) value = slider_x_shift + slider_width;
            let new_iter = Math.floor((value - slider_x_shift) / slider_delta);
            console.log("slider_delta", slider_delta, "value", value,
                "current_iter:", current_iter, "new_iter:", new_iter);
            if (new_iter < 0) new_iter = 0;
            if (new_iter >= total_iters) new_iter = total_iters - 1;
            svg.select("#loss-slider-left").attr("x2", value);
            if (current_iter !== new_iter) {
                that.setIter(new_iter);
            }
            let circle = d3.select("#loss-view-slider-circle");
            circle.attr("cx", value);

        };

        let drag_slider_end = function () {
            let value = d3.event.x;
            if (value < slider_x_shift) value = slider_x_shift;
            if (value > slider_x_shift + slider_width) value = slider_x_shift + slider_width;

            let circle = d3.select("#loss-view-slider-circle");
            let new_iter = Math.floor((value - slider_x_shift) / slider_delta);
            if (new_iter < 0) new_iter = 0;
            if (new_iter >= total_iters) new_iter = total_iters - 1;
            value = xPositionScale(new_iter);
            svg.select("#loss-slider-left").attr("x2", value);
            circle.attr("cx", value);
            draging = false;
        };
        slider_group.selectAll("#loss-slider-right")
            .data([1])
            .enter()
            .append("line")
            .attr("id", "loss-slider-right")
            .attr("x1", slider_x_shift - slider_hump_length)
            .attr("y1", 0)
            .attr("x2", slider_x_shift + slider_width + slider_hump_length)
            .attr("y2", 0)
            .attr("stroke-width", slider_height)
            .attr("stroke", "#e4e7ed")
            .attr("stroke-linecap", "round");
        slider_group.selectAll("#loss-slider-left")
            .data([1])
            .enter()
            .append("line")
            .attr("id", "loss-slider-left")
            .attr("x1", slider_x_shift - slider_hump_length)
            .attr("y1", 0)
            .attr("x2", xPositionScale(current_iter))
            .attr("y2", 0)
            .attr("stroke-width", slider_height)
            .attr("stroke", slider_color)
            .attr("stroke-linecap", "round");
        slider_group.selectAll("circle")
            .data(iter_list)
            .enter()
            .append("circle")
            .attr("id", "loss-slider-base-circle")
            .attr('cx', (d, i) => {
                return xPositionScale(i)
            })
            .attr('cy', 0)
            .attr("fill", slider_color)
            .attr("r", slider_height + 4)
            .on("click", function (d, i) {
                that.setIter(i);
            });
        slider_group.selectAll("#loss-view-slider-circle")
            .data([1])
            .enter().append("circle")
            .attr("id", "loss-view-slider-circle")
            .attr('cx', xPositionScale(current_iter))
            .attr("cy", 0)
            .attr("fill", "#ffffff")
            .attr("r", slider_height + 6)
            .attr("stroke", slider_color)
            .attr("stroke-width", 3)
            .call(d3.drag().on("start", drag_start).on("drag", drag_slider).on("end", drag_slider_end));
        slider_group.selectAll(".loss-text")
            .data(iter_list)
            .enter()
            .append("text")
            .attr("class", "loss-text")
            .attr("x", (d,i) => xPositionScale(i))
            .attr("y", 6)
            .attr("text-anchor", "middle")
            .attr("font-size", 16)
            .text(d => d);
    };

    that._create_legend = function(){
        console.log("begin create_legend", label_names);
        let overlap_margin = 15;

        // rectangle version
        legend_group.selectAll("rect.legend")
            .data(label_names)
            .enter()
            .append("rect")
            .attr("class", "legend")
            .attr("width", rect_height)
            .attr("height", rect_height)
            .attr("x", (d,i) => (rect_width * i + rect_margin * i)+(i===0?0:overlap_margin))
            .attr("y", 0)
            .attr("fill", (d,i) => colors[i]);
        legend_group.selectAll("text.legend")
            .data(label_names)
            .enter()
            .append("text")
            .attr("class", "legend")
            .attr("x", (d,i) => (rect_width * i + rect_margin * i + rect_height + 2)+(i===0?0:overlap_margin))
            .attr("y", rect_height / 2 + 5)
            .attr("text-anchor", "start")
            .attr("font-size", 16)
            .attr("font-family", '"Helvetica Neue", Helvetica, Arial, sans-serif')
            .attr("fill", FontColor)
            .text(d => d);

        // circle version
        // legend_group.selectAll("circle.legend")
        //     .data(label_names)
        //     .enter()
        //     .append("circle")
        //     .attr("class", "legend")
        //     .attr("cx", (d,i) => (rect_width * i + rect_margin * i))
        //     .attr("cy", rect_height / 2)
        //     .attr("r", 4)
        //     .attr("fill", (d,i) => colors[i]);
        // legend_group.selectAll("text.legend")
        //     .data(label_names)
        //     .enter()
        //     .append("text")
        //     .attr("class", "legend")
        //     .attr("x", (d,i) => (rect_width * i + rect_margin * i + 10))
        //     .attr("y", rect_height / 2 + 5)
        //     .attr("text-anchor", "start")
        //     .attr("font-size", 15)
        //     .attr("fill", FontColor)
        //     .text(d => d)
        //     .each(function () {
        //         let text = d3.select(this);
        //         set_font(text);
        //     });
    };

    that._update = function () {
        // update nodes
        node_group
            .selectAll(".dist-node")
            .data(nodes, d => d.name)
            .transition()
            .duration(update_ani)
            .delay(remove_ani)
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .style("fill", d => d.color)
            .style("fill-opacity", 1);

        // update links
        let links_g = link_group.selectAll(".dist-link")
            .data(links, d => "link-" + d.source.name + "-" + d.target.name)
            .transition()
            .duration(update_ani)
            .delay(remove_ani);
        // const gradient = links_g.append("linearGradient")
        //     .attr("gradientUnits", "userSpaceOnUse")
        //     .attr("id", function (d) {
        //         d.uid = "gc" + d.source.name + "-" + d.target.name;
        //         return d.uid;
        //     })
        //     .attr("x1", d => d.source.x1)
        //     .attr("x2", d => d.target.x0);
        // gradient.append("stop")
        //     .attr("offset", "0%")
        //     .attr("stop-color", d => d.source.color);
        // gradient.append("stop")
        //     .attr("offset", "100%")
        //     .attr("stop-color", d => d.target.color);
        links_g.select("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", d => "url(#" + d.uid + ")")
            .attr("stroke-width", function(d){
                if (d.source_class === 0 || d.target_class === 0){
                    return d.width;
                }
                return Math.max(...[1.5, d.width]);
            })
            .attr("stroke-opacity", 0.4)
            .style("fill-opacity", 0);

        
        flow_text_group.selectAll(".flow-text")
            .data(that.flow_text, d => d.id)
            .transition()
            .duration(update_ani)
            .delay(remove_ani)
            .attr("x", d => d.link ? (d.link.source.x1 + d.link.target.x0) / 2 : 0)
            .attr("y", d => d.link ? (d.link.source.y0 + d.link.source.y1 
                + d.link.target.y0 + d.link.target.y1) / 4 + 5 : 0)
            .text((d,i) => label_names[i])
            .style("opacity", d => d.link ? (d.link.width > 14 ? 1 : 0) : 0)
            // .attr("x", d => (d.link.source.x1 + d.link.target.x0) / 2)
            // .attr("y", d => (d.link.source.y0 + d.link.source.y1 + 
            //     d.link.target.y0 + d.link.target.y1) / 4 + 5)
            // .text((d,i) => label_names[i])
            // .style("opacity", d => d.link.width > 14 ? 1 : 0);


            .attr("x", d => d.link ? (d.link.source.x1 + d.link.target.x0) / 2 : 0)
            .attr("y", d => d.link ? (d.link.source.y0 + d.link.source.y1 
                + d.link.target.y0 + d.link.target.y1) / 4 + 5 : 0)
            .text((d,i) => label_names[i])
            .style("opacity", d => d.link ? (d.link.width > 14 ? 1 : 0) : 0)

        // update slider
        that._update_slider();

        // update legend
        that._update_legend();

        // update selected flows
        that._update_selected_flows();
    };

    that._update_slider = function(){
        let xPositionScale = d3
            .scaleLinear()
            .domain([- slider_hump_length/slider_delta, total_iters - 1 + slider_hump_length/slider_delta])
            .range([slider_x_shift - slider_hump_length, slider_x_shift + slider_width + slider_hump_length]);
        slider_group.selectAll("#loss-slider-base-circle")
            .attr("fill", function (d, i) {
                if(i<=current_iter){
                    return slider_color;
                }
                else return "#e4e7ed";
            })
            .attr('cx', (d, i) => {
                return xPositionScale(i)
            });

        slider_group.selectAll("#loss-view-slider-circle")
            .attr('cx', xPositionScale(current_iter));

        slider_group.selectAll("#loss-slider-left")
            .attr("x2", xPositionScale(current_iter));

        slider_group.selectAll(".loss-text")
            .attr("x", (d,i) => xPositionScale(i))
            .text(d => d);
    };

    that._update_legend = function(){
        // legend_group.selectAll("circle.legend")
        //     .data(label_names)
        //     .attr("x", (d,i) => (rect_width * i + rect_margin * i))
        //     .attr("y", rect_height / 2)
        //     .attr("fill", (d,i) => colors[i]);
        // legend_group.selectAll("text.legend")
        //     .data(label_names)
        //     .attr("x", (d,i) => (rect_width * i + rect_margin * i + 10))
        //     .attr("y", rect_height / 2 + 5)
        //     .attr("text-anchor", "start")
        //     .attr("font-size", 15)
        //     .attr("fill", FontColor)
        //     .text(d => d)
        //     .each(function () {
        //         let text = d3.select(this);
        //         set_font(text);
        //     });
        let overlap_margin = 10;
        legend_group.selectAll("rect.legend")
            .attr("width", rect_height)
            .attr("height", rect_height)
            .attr("x", (d,i) => (rect_width * i + rect_margin * i)+(i===0?0:overlap_margin))
            .attr("y", 0)
            .attr("fill", (d,i) => colors[i]);
        legend_group.selectAll("text.legend")
            .attr("x", (d,i) => (rect_width * i + rect_margin * i + rect_height + 2)+(i===0?0:overlap_margin))
            .attr("y", rect_height / 2 + 5)
            .attr("text-anchor", "start")
            .attr("font-size", 16)
            .attr("font-family", '"Helvetica Neue", Helvetica, Arial, sans-serif')
            .attr("fill", FontColor)
            .text(d => d);
    };

    that._update_selected_flows = function(){
        let selected_links_g = selected_link_group.selectAll(".dist-s-link")
            .data(selected_links, d => "s-link-" + d.source.name + "-" + d.target.name);
    
        selected_links_g.select("path")
            .attr("stroke-width", function(d){
                if (d.source_class === 0 && (d.target_class === 0 || d.target_class === 1)){
                    return d.selected_width;
                }
                return Math.max(...[1.5, d.selected_width]);
            });

        selected_node_group
            .selectAll(".dist-s-node")
            .data(selected_nodes, d => d.name)
            .attr("x", d => d.x0)
            .attr("y", d => d.s_y)
            .attr("height", d => Math.max(...[1, d.selected_height]))
            .attr("width", d => d.x1 - d.x0)
            .style("fill", d => d.color);
    }

    that._remove = function () {
        node_group
            .selectAll(".dist-node")
            .data(nodes, d => d.name)
            .exit()
            .transition()
            .duration(remove_ani)
            .style("fill-opacity", 0)
            .remove();
        let link_exit = link_group.selectAll(".dist-link")
            .data(links, d => "link-" + d.source.name + "-" + d.target.name)
            .exit()
            .transition()
            .duration(remove_ani);
        link_exit
            .select("path")
            .attr("stroke-opacity", 0);
        link_exit.remove();
        // remove slider
        that._remove_slider();

        // remove legend
        that._remove_legend();

        // remove selected flows
        that._remove_selected_flows();
    };

    that._remove_slider = function() {

    };

    that._remove_legend = function(){

    };

    that._remove_selected_flows = function(){
        selected_link_group.selectAll(".dist-s-link")
            .data(selected_links, d => "s-link-" + d.source.name + "-" + d.target.name)
            .exit()
            .remove();
        selected_node_group
            .selectAll(".dist-s-node")
            .data(selected_nodes, d => d.name)
            .exit()
            .remove();
    }

    that.init = function () {
        that._init();
    }.call();

};
