/*
* added by Changjian Chen, 20200305
* */

function inbox(box, x, y){
    function distance(x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x1-x2, 2)+ Math.pow(y1-y2, 2));
        }

    if (distance(x, y, box.F1.x, box.F1.y) + distance(x, y, box.F2.x, box.F2.y) <= box.s){
        return true;
    }
    else{
        return false;
    }
}

GraphLayout.prototype.update_selection_box = function(){
    let that = this;
    that._create_selection_box();
    that._update_selection_box();
    that._remove_selection_box();
};

GraphLayout.prototype.update_snapshot = function(){
    let that = this;
    // update data
    for (let i = 0; i < that.selection_box.length; i++){
        that.selection_box[i].snapshot_edge = {
            "in": 0,
            "out": 0,
            "within": 0,
            "between": new Array(that.selection_box.length).fill(0)
        };
    }
    // edge type: in out within between
    // type in
    let single_paths = that.all_path["in"];
    for (let i = 0; i < single_paths.length; i++){
        let path = single_paths[i];
        let box_id = path[1].box_id;
        that.selection_box[box_id].snapshot_edge["in"] += 1;
    }

    // type out
    single_paths = that.all_path["out"]
    for (let i = 0; i < single_paths.length; i++){
        let path = single_paths[i];
        let box_id = path[0].box_id;
        that.selection_box[box_id].snapshot_edge["out"] += 1;
    }

    // type within
    single_paths = that.all_path["within"]
    for (let i = 0; i < single_paths.length; i++){
        let path = single_paths[i];
        let box_id = path[0].box_id;
        that.selection_box[box_id].snapshot_edge["within"] += 1;
    }

    // type between
    single_paths = that.all_path["between"]
    for (let i = 0; i < single_paths.length; i++){
        let path = single_paths[i];
        let source_box_id = path[0].box_id;
        let target_box_id = path[1].box_idx;
        that.selection_box[source_box_id].snapshot_edge["between"][target_box_id] += 1;
    }

    // get edges
    that.snapshot_edge = [];
    for (let i = 0; i < that.selection_box.length; i++){
        let box = that.selection_box[i];
        let edge = null;

        // in edge
        if (box.snapshot_edge["in"] > 0){
            edge = [box, box, box.snapshot_edge["in"]];
            that.snapshot_edge.push(edge);
        }

        // out edge
        if (box.snapshot_edge["out"] > 0){
            edge = [box, box, box.snapshot_edge["out"]];
            that.snapshot_edge.push(edge);
        }

        // within edge
        if (box.snapshot_edge["within"] > 0){
            edge = [box, box, box.snapshot_edge["within"]];
            that.snapshot_edge.push(edge);
        }

        // between edge
        for (let j = 0; j < that.selection_box.length; j++){
            let count = box.snapshot_edge["between"][j];
            if (count > 0){
                edge = [box, that.selection_box[j], count];
                that.snapshot_edge.push(edge);
            }
        }
    }

    that._create_snapshot();
    that._update_snapshot();
    that._remove_snapshot();
};

GraphLayout.prototype._create_selection_box = function(){
    let that = this;

    let drag = d3.drag()
            .on("start", function(){
                console.log("start dragstarted");
                d3.event.sourceEvent.stopPropagation();
            })
            .on("drag", function(d){
                // d3.select(this).attr("x", d.x = d3.event.x).attr("y", d.y = d3.event.y)
                d.x = d3.mouse(that.main_group.node())[0];
                d.y = d3.mouse(that.main_group.node())[1];
                d.F1 = {
                    x:d.x-d.d/2*Math.cos(d.tao),
                    y:d.y-d.d/2*Math.sin(d.tao)
                };
                d.F2 = {
                    x:d.x+d.d/2*Math.cos(d.tao),
                    y:d.y+d.d/2*Math.sin(d.tao)
                };
                that._update_selection_box();
            })
            .on("end", async function(){

                await that.show_edges();
            });
    let transform = that.get_transform();
    let resizeing = false;
    let hovering = false;
    function show_resize_rect(group){
        let opatity = (resizeing||hovering)?1:0;
        group.selectAll(".resize-rect")
            .attr("opacity", opatity);
    }
    console.log("get transform:", transform);
    let sg = that.selection_group.selectAll(".selection-box")
        .data(that.selection_box, d => d.id)
        .enter()
        .append("g")
        .attr("opacity", 0)
        .attr("class", "selection-box")
        .attr("transform", d => "rotate("+(d.tao/Math.PI*180)+","+d.x+","+d.y+") translate("+(d.x)+","+ (d.y) +")")
        .call(drag)        
        .on("mousedown", function (d) {
            console.log("mousedown", d);
            // that.data_manager.edit_view.update_click_menu($('#graph-view-svg'), "box");
            that.data_manager.update_edit_state(d, "box");
            d3.event.stopPropagation();
        })
        .on("mouseover", function (d) {
            hovering = true;
            show_resize_rect(d3.select(this));
        })
        .on("mouseout", function (d) {
            hovering = false;
            show_resize_rect(d3.select(this));
        });
    sg.transition()
        .duration(AnimationDuration*3)
        .attr("opacity", 1);
    sg.append("ellipse")
        .attr("class", "box")
        .attr("rx", d => d.rx)
        .attr("ry", d => d.ry)
        .attr("cx", d => 0)
        .attr("cy", d => 0)
        .style("fill", "white")
        .style("fill-opacity", 0)
        .style("stroke-width", 2 * that.zoom_scale)
        .style("stroke", "gray")
        .style("cursor", "move");

    let rect_size = 6*that.zoom_scale;


    let rotating = false;
    let resize_box_group = sg.append("g")
        .attr("class", "resize");
    function resize_ellipse(d, mode, event, group){
        let top_rect = group.select("#resize-rect-top");
        let right_rect = group.select("#resize-rect-right");
        let bottom_rect = group.select("#resize-rect-bottom");
        let left_rect = group.select("#resize-rect-left");

        let rotate = false;
        if(mode === "top"){
            //event[1] = -Math.abs(event[1]);
            let delta = event[1] + d.ry;
            if(Math.abs(delta[0])>100 && Math.abs(delta[1]) > 100) return;
            d.y += delta/2*Math.cos(d.tao);
            d.x -= delta/2*Math.sin(d.tao);
            d.ry = (d.ry-event[1])/2;
            if(d.ry > d.rx){
                d.tao-=Math.PI/2;
                //d.tao = Math.atan(Math.tan(d.tao));
                let tmp = d.rx;
                d.rx = d.ry;
                d.ry = tmp;
                rotate = true;
            }
        }
        else if(mode === "right") {
            //event[0] = Math.abs(event[0]);
            let delta = event[0] - d.rx;
            if(Math.abs(delta[0])>100 && Math.abs(delta[1]) > 100) return;
            d.y += delta/2*Math.sin(d.tao);
            d.x += delta/2*Math.cos(d.tao);
            d.rx = (d.rx+event[0])/2;
            if(d.ry > d.rx){
                d.tao-=Math.PI/2;
                //d.tao = Math.atan(Math.tan(d.tao));
                let tmp = d.rx;
                d.rx = d.ry;
                d.ry = tmp;
                rotate = true;
            }
        }
        else if(mode === "bottom") {
            //event[1] = Math.abs(event[1]);
            let delta = event[1] - d.ry;
            if(Math.abs(delta[0])>100 && Math.abs(delta[1]) > 100) return;
            d.y += delta/2*Math.cos(d.tao);
            d.x -= delta/2*Math.sin(d.tao);
            d.ry = (d.ry+event[1])/2;
            if(d.ry > d.rx){
                d.tao-=Math.PI/2;
                //d.tao = Math.atan(Math.tan(d.tao));
                let tmp = d.rx;
                d.rx = d.ry;
                d.ry = tmp;
                rotate = true;
            }
        }
        else if(mode === "left") {
            //event[0] = -Math.abs(event[0]);
            let delta = event[0] + d.rx;
            if(Math.abs(delta[0])>100 && Math.abs(delta[1]) > 100) return;
            d.y += delta/2*Math.sin(d.tao);
            d.x += delta/2*Math.cos(d.tao);
            d.rx = (d.rx-event[0])/2;
            if(d.ry > d.rx){
                d.tao-=Math.PI/2;
                //d.tao = Math.atan(Math.tan(d.tao));
                let tmp = d.rx;
                d.rx = d.ry;
                d.ry = tmp;
                rotate = true;
            }
        }
        if(rotate) {
            rotating = true;
            setTimeout(function () {
                rotating = false
            }, 100);
            top_rect.attr("id", "resize-rect-right");
            right_rect.attr("id", "resize-rect-bottom");
            bottom_rect.attr("id", "resize-rect-left");
            left_rect.attr("id", "resize-rect-top");

        }
        d.s = d.rx * 2;
        d.d = Math.sqrt(d.rx*d.rx-d.ry*d.ry)*2;
        d.F1 = {
            x:d.x-d.d/2*Math.cos(d.tao),
            y:d.y-d.d/2*Math.sin(d.tao)
        };
        d.F2 = {
            x:d.x+d.d/2*Math.cos(d.tao),
            y:d.y+d.d/2*Math.sin(d.tao)
        };
        if(d.ry < 4){
            console.log("get")
        }
    }

    resize_box_group.append("rect")
        .attr("class", "resize-rect")
        .attr("id", "resize-rect-top")
        .attr("x", d => -rect_size/2)
        .attr("y", d => -d.ry-rect_size/2)
        .attr("width", rect_size)
        .attr("height", rect_size)
        .attr("fill", "gray")
        .attr("stroke-width", 0)
        .attr("opacity", 0)
        .style("cursor", "default")
        .call(d3.drag().on("start", function () {
            resizeing = true;
            show_resize_rect(d3.select(d3.select(this).node().parentNode.parentNode));
            d3.event.sourceEvent.stopPropagation();
        }).on("drag", function (d) {
                let rect = d3.select(this);
                let event = d3.mouse(d3.select(this).node().parentNode.parentNode);
                let class_name = rect.attr("id").split("-");
                class_name = class_name[class_name.length-1];
                resize_ellipse(d, class_name, event, d3.select(d3.select(this).node().parentNode.parentNode));
                that._update_selection_box();
        }).on("end", async function(){
            resizeing = false;
            show_resize_rect(d3.select(d3.select(this).node().parentNode.parentNode));
            await that.show_edges();
        }));

    resize_box_group.append("rect")
        .attr("class", "resize-rect")
        .attr("id", "resize-rect-bottom")
        .attr("x", d => -rect_size/2)
        .attr("y", d => d.ry-rect_size/2)
        .attr("width", rect_size)
        .attr("height", rect_size)
        .attr("fill", "gray")
        .attr("stroke-width", 0)
        .attr("opacity", 0)
        .style("cursor", "default")
        .call(d3.drag().on("start", function () {
            resizeing = true;
            show_resize_rect(d3.select(d3.select(this).node().parentNode.parentNode));
            d3.event.sourceEvent.stopPropagation();
        }).on("drag", function (d) {
            if(rotating) return;
                let rect = d3.select(this);
                let event = d3.mouse(d3.select(this).node().parentNode.parentNode);
                let class_name = rect.attr("id").split("-");
                class_name = class_name[class_name.length-1];
                resize_ellipse(d, class_name, event, d3.select(d3.select(this).node().parentNode.parentNode));

                that._update_selection_box();
        }).on("end", async function(){
            resizeing = false;
            show_resize_rect(d3.select(d3.select(this).node().parentNode.parentNode));
            await that.show_edges();
        }));

    resize_box_group.append("rect")
        .attr("class", "resize-rect")
        .attr("id", "resize-rect-left")
        .attr("x", d => -d.rx-rect_size/2)
        .attr("y", d => -rect_size/2)
        .attr("width", rect_size)
        .attr("height", rect_size)
        .attr("fill", "gray")
        .attr("stroke-width", 0)
        .attr("opacity", 0)
        .style("cursor", "default")
        .call(d3.drag().on("start", function () {
            resizeing = true;
            show_resize_rect(d3.select(d3.select(this).node().parentNode.parentNode));
            d3.event.sourceEvent.stopPropagation();
        }).on("drag", function (d) {
            if(rotating) return;
                let rect = d3.select(this);
                let event = d3.mouse(d3.select(this).node().parentNode.parentNode);
                let class_name = rect.attr("id").split("-");
                class_name = class_name[class_name.length-1];
                resize_ellipse(d, class_name, event, d3.select(d3.select(this).node().parentNode.parentNode));
                that._update_selection_box();
        }).on("end", async function(){
            resizeing = false;
            show_resize_rect(d3.select(d3.select(this).node().parentNode.parentNode));
            await that.show_edges();
        }));

    resize_box_group.append("rect")
        .attr("class", "resize-rect")
        .attr("id", "resize-rect-right")
        .attr("x", d => d.rx-rect_size/2)
        .attr("y", d => -rect_size/2)
        .attr("width", rect_size)
        .attr("height", rect_size)
        .attr("fill", "gray")
        .attr("stroke-width", 0)
        .attr("opacity", 0)
        .style("cursor", "default")
        .call(d3.drag().on("start", function () {
            resizeing = true;
            show_resize_rect(d3.select(d3.select(this).node().parentNode.parentNode));
            d3.event.sourceEvent.stopPropagation();
        }).on("drag", function (d) {
            if(rotating) return;
                let rect = d3.select(this);
                let event = d3.mouse(d3.select(this).node().parentNode.parentNode);
                let class_name = rect.attr("id").split("-");
                class_name = class_name[class_name.length-1];
                resize_ellipse(d, class_name, event, d3.select(d3.select(this).node().parentNode.parentNode));
                that._update_selection_box();
        }).on("end", async function(){
            resizeing = false;
            show_resize_rect(d3.select(d3.select(this).node().parentNode.parentNode));
            await that.show_edges();
        }));

};

GraphLayout.prototype._update_selection_box = function(){
    let that = this;
    let transform = that.get_transform();

    // update data
    for(let i = 0; i < that.selection_box.length; i++){
        let nodes = Object.values(that.get_nodes())
            .filter(d => inbox(that.selection_box[i], that.if_focus_selection_box?d.focus_x:that.center_scale_x(d.x), that.if_focus_selection_box?d.focus_y:that.center_scale_y(d.y)));
        that.selection_box[i].nodes = nodes;
        let label_dist = nodes.map(d =>d.label.slice(-1)[0]);
        let label_count = new Array(12).fill(0);
        label_dist.forEach(b => {label_count[b] = label_count[b] + 1});
        let max_count_cls = -1;
        let max_count = 0;
        for (let i = 0; i < label_count.length; i++){
            if(label_count[i] > max_count){
                max_count = label_count[i];
                max_count_cls = i;
            }
        }
        that.selection_box[i].label_count = label_count;
        that.selection_box[i].max_count_cls = max_count_cls;
    }
    console.log("new selection box:", that.selection_box);

    // TODO: highlight 
    if (that.selection_box.length > 0){
        d3.selectAll(".node-dot").attr("r", d => 3.5 * that.zoom_scale);
        for (let j = 0; j < that.selection_box.length; j++){
            let selection_idxs = that.selection_box[j].nodes.map(d => d.id);
            // that.highlight(selection_idxs);
            for (let i = 0; i < selection_idxs.length; i++){
                d3.select("#id-" + selection_idxs[i])
                    .attr("r", d => 5 * that.zoom_scale);
            }
        }
    }

    let sg = that.selection_group.selectAll(".selection-box")
        .data(that.selection_box, d => d.id)
        .attr("transform", d => "rotate("+(d.tao/Math.PI*180)+","+d.x+","+d.y+") translate("+(d.x)+","+ (d.y) +")");
    sg.selectAll(".box")
        .attr("rx", d => d.rx)
        .attr("ry", d => d.ry)
        .style("stroke-width", 2 * that.zoom_scale)
        .style("stroke", d => d.max_count_cls === -1? UnlabeledColor:CategoryColor[d.max_count_cls]);

    let rect_size = 6*that.zoom_scale;
    sg.select(".resize").select("#resize-rect-top")
        .attr("fill", d => d.max_count_cls === -1? UnlabeledColor:CategoryColor[d.max_count_cls])
        .attr("x", d => -rect_size/2)
        .attr("y", d => -d.ry-rect_size/2)
        .attr("width", rect_size)
        .attr("height", rect_size);
    sg.select(".resize").select("#resize-rect-bottom")
        .attr("fill", d => d.max_count_cls === -1? UnlabeledColor:CategoryColor[d.max_count_cls])
        .attr("x", d => -rect_size/2)
        .attr("y", d => d.ry-rect_size/2)
        .attr("width", rect_size)
        .attr("height", rect_size);
    sg.select(".resize").select("#resize-rect-left")
        .attr("fill", d => d.max_count_cls === -1? UnlabeledColor:CategoryColor[d.max_count_cls])
        .attr("x", d => -d.rx-rect_size/2)
        .attr("y", d => -rect_size/2)
        .attr("width", rect_size)
        .attr("height", rect_size);
    sg.select(".resize").select("#resize-rect-right")
        .attr("fill", d => d.max_count_cls === -1? UnlabeledColor:CategoryColor[d.max_count_cls])
        .attr("x", d => d.rx-rect_size/2)
        .attr("y", d => -rect_size/2)
        .attr("width", rect_size)
        .attr("height", rect_size);
};

GraphLayout.prototype._remove_selection_box = function(){
    let that = this;
    that.selection_group.on('mousedown.drag', null);
                that.lasso_or_zoom("zoom");
    that.selection_group.selectAll(".selection-box")
        .data(that.selection_box, d => d.id)
        .exit()
        .remove();

};

GraphLayout.prototype.set_rect_selection = function(){
    let that = this;
    that.svg.on("mousedown", function(){
        console.log("set rect selection mousedown");
        let event = d3.mouse(that.main_group.node());
        that.selection_box.push({
            "x": event[0],
            "y": event[1],
            "width": 0.1,
            "height": 0.1,
            "id": that.selection_box_id_count
        });
        that.selection_box_id_count += 1;
        that._create_selection_box();
        // d3.event.sourceEvent.stopPropagation();
        that.svg.on("mousemove", function(){
            let event = d3.mouse(that.main_group.node());
            let start_x = that.selection_box[that.selection_box.length-1].x;
            let start_y = that.selection_box[that.selection_box.length-1].y; 
            that.selection_box[that.selection_box.length-1].width = event[0] - start_x;
            that.selection_box[that.selection_box.length-1].height = event[1] - start_y;
            that._update_selection_box();
        })
    })
    .on("mouseup", async function(){
        that.svg.on("mousemove", null);
        await that.show_edges();
        that.highlight_plg.reset_selection();
    })
};

GraphLayout.prototype.remove_rect_selection = function(){

};

GraphLayout.prototype._create_snapshot = function(){
    let that = this;
    let sg = that.snapshot_group.selectAll("g.snapshot")
        .data(that.selection_box, d => d.id)
        .enter()
        .append("g")
        .attr("class", "snapshot")
        .attr("transform", d => "translate("+(d.x)+","+ (d.y) +")");

    sg.append("rect")
        .attr("class", "snapshot-box")
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", "white")
        .style("fill-opacity", 0)
        .style("stroke", "gray")
        .style("sroke-width", 2);
    
    let dist_group = sg.append("g")
        .attr("class", "snapshot-dist");
        dist_group.selectAll("rect")
        .data(d => d.label_count)
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * 5)
        .attr("y", d => 0)
        .attr("width", 5)
        .attr("height", d => d * 10);
};

GraphLayout.prototype._update_snapshot = function(){

};

GraphLayout.prototype._remove_snapshot = function(){

};

GraphLayout.prototype.delete_box = async function(id){
    let that = this;
    for(let i = 0; i < that.selection_box.length; i++){
        if (that.selection_box[i].id === id){
            that.selection_box.splice(i, 1);
            break;
        }
    }
    that._remove_selection_box();
    await that.show_edges();
}

GraphLayout.prototype.get_path = function(){
    let that = this;
    let path = {
        "in": [],
        "out": [],
        "within": [],
        "between": [],
        "in_nodes": [],
        "out_nodes": []
    };
    let highlights = [];

    for (let i in DataLoader.state.complete_graph){
        DataLoader.state.complete_graph[i].box_id = -1;
    }
    
    let all_nodes = that.selection_box.map(d => d.nodes);
    all_nodes.push(that.focus_nodes);

    for (let i = 0; i < all_nodes.length; i++){
        let focus_nodes = all_nodes[i];
        for (let j = 0; j < focus_nodes.length; j++){
            focus_nodes[j].box_id = i;
            focus_nodes[j].visited = false;
        }
    }

    for (let i = 0; i < all_nodes.length; i++){
        let focus_nodes = all_nodes[i];
        for (let j = 0; j < focus_nodes.length; j++){
            // focus_nodes[j].box_id = i;
            let node = focus_nodes[j];
            if (node.visited) continue;
            highlights.push(node.id);
             
            // process from
            let from = node.from;
            let from_weight = node.from_weight;
            for (let k = 0; k < from.length; k++){
                if (from_weight[k] > 0){
                    //TODO: it is not a safe code
                    let from_node = DataLoader.state.complete_graph[from[k]];
                    if (from_node.box_id !== undefined && from_node.box_id > -1){
                        if (from_node.box_id == node.box_id){
                            path.within.push([from_node, node, from_weight[k]]);
                        }
                        else{
                            path.between.push([from_node, node, from_weight[k]]);
                        }
                    }
                    else{
                        path.in.push([from_node, node, from_weight[k]]);
                        path.in_nodes.push(from_node);
                    }
                }
            }
            // process to
            let to = node.to;
            let to_weight = node.to_weight;
            for (let k = 0; k < to.length; k++){
                if (to_weight[k] > 0){
                    let to_node = DataLoader.state.complete_graph[to[k]];
                    if (!(to_node.box_id !== undefined && to_node.box_id > -1)){
                        path.out.push([node, to_node, to_weight[k]]);
                        path.out_nodes.push(to_node);
                    }
                }
            }

            node.visited = true;
        }
    }

    // for (let i = 0; i < that.selection_box.length; i++){
    //     let focus_nodes = that.selection_box[i].nodes;
    //     for (let j = 0; j < focus_nodes.length; j++){
    //         focus_nodes[j].box_id = -1;
    //     }
    // }

    that.all_path = path;
    that.highlights = highlights;
    return [path, highlights];
};

GraphLayout.prototype.show_edges = async function(modes){
    let that = this;
    that.get_path();
    let edge_type_data = {};
    let edge_type_range = [];
    for (let i in that.all_path){
        let len = that.all_path[i].length;
        edge_type_data[i] = len;
        edge_type_range.push(i); 
    }
    that.data_manager.update_edge_type_bar(edge_type_data);
    // that.set_path();
    that.data_manager.state.path = that.all_path;
    that.data_manager.state.highlights = that.highlights;
    console.log("selection box highlights:", that.highlights);
    that.multi_step_out = 0;
    that.multi_step_in = 0;
    await that.data_manager.update_graph_view(false);
    that.data_manager.set_propagation_filter_data(that.step_count[2], that.step_count[0], that.step_count[1]);
    
    // that.update_snapshot();
};

GraphLayout.prototype.focus_selection_box = function () {
    let that = this;
    that.data_manager.focus_selection_box(that.selection_box);
};

GraphLayout.prototype.unfocus_selection_box = function () {
    let that = this;
    that.data_manager.unfocus_selection_box(that.selection_box);
};