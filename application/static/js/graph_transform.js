let GraphTransform = function (parent) {
    let that = this;

    // parent
    let view = null;

    // transform const
    let zoom_scale = 1;
    let transform = null;
    let zoom = null;
    let current_level = 0;
    let send_zoom_cnt = 0;
    let send_zoom_request = [];
    // let AnimationDuration = 1500;
    let zoom_maintain_status = [];
    let zoom_slider = null;
    let zoom_text = null;


    that._init = function () {
        that.set_view(parent);
        zoom_slider = d3.select("#zoom-slider").select("input");
        zoom_text = d3.select("#zoom-slider").select("p");
    };

    that.set_view = function (new_parent) {
        view = new_parent;
    };

    that.apply_transform = function(transform){

        view.main_group.attr("transform", transform);
        that.set_zoom_slider_value(transform.k);
    };

    that.get_transform = function() {
        return transform;
    };

    that.zoomed = function() {
        that.apply_transform(d3.event.transform);

        // maintain size
        let now_time = Date.now();
        let last_time = zoom_maintain_status.length>0 ? zoom_maintain_status[zoom_maintain_status.length-1] : 0;
        if(now_time - last_time > 300){
            console.log("maintain size");
            zoom_maintain_status.push(now_time);
            view.maintain_size(d3.event.transform);
        }
        let target_level = current_level;
        let current_level_scale = Math.pow(2, target_level);
        while (d3.event.transform.k > 2 * current_level_scale) {
            current_level_scale *= 2;
            target_level += 1;
        }
        while (d3.event.transform.k < current_level_scale / 1.5 && target_level > 0) {
            current_level_scale /= 2;
            target_level -= 1;
        }
        current_level = target_level;
        console.log(d3.event.transform);
        if (transform === null) {
            transform = d3.event.transform;
        }
        d3.selectAll(".iw-contextMenu").style("display", "none");
        console.log("zoomed", d3.event.transform.x, d3.event.transform.y,d3.event.transform.k);
    };

    that.zoom_end = function() {
        that.apply_transform(d3.event.transform);
        view.maintain_size(d3.event.transform);
        let target_level = current_level;
        let current_level_scale = Math.pow(2, target_level);
        while (d3.event.transform.k > 2 * current_level_scale) {
            current_level_scale *= 2;
            target_level += 1;
        }
        while (d3.event.transform.k < current_level_scale / 1.5 && target_level > 0) {
            current_level_scale /= 2;
            target_level -= 1;
        }
        current_level = target_level;

        if (transform === null || d3.event.transform.k !== transform.k
            || Math.abs(d3.event.transform.x - transform.x) > 1
            || Math.abs(d3.event.transform.y - transform.y) > 1) {
            view.width = $('#graph-view-svg').width();
            view.height = $('#graph-view-svg').height();
            // main_group.select('#debug-shouxing')
            //     .attr('x', -d3.event.transform.x / d3.event.transform.k)
            //     .attr('y', -d3.event.transform.y / d3.event.transform.k)
            //     .attr('width', width / d3.event.transform.k)
            //     .attr('height', height / d3.event.transform.k);
            let start_x = view.center_scale_x_reverse(-d3.event.transform.x / d3.event.transform.k);
            let start_y = view.center_scale_y_reverse(-d3.event.transform.y / d3.event.transform.k);
            let end_x = view.center_scale_x_reverse((view.width - d3.event.transform.x) / d3.event.transform.k);
            let end_y = view.center_scale_y_reverse((view.height - d3.event.transform.y) / d3.event.transform.k);

            let area = {
                'x': start_x,
                'y': start_y,
                'width': end_x - start_x,
                'height': end_y - start_y
            };
            console.log(d3.event.transform, area, current_level);
            let send_zoom_idx = send_zoom_cnt++;
            send_zoom_request[send_zoom_idx] = true;

            setTimeout(function () {
                    if(send_zoom_request[send_zoom_idx+1] === undefined){
                        console.log(send_zoom_idx);
                        console.log("recv:", area, target_level);
                        // transform = d3.event.transform;
                        view.data_manager.zoom_graph_view_notify(area, target_level);
                    }
                }, 500);

        }
        // else if (transform !== null && d3.event.transform.k === transform.k
        //     && Math.abs(d3.event.transform.x - transform.x) < 1
        //     && Math.abs(d3.event.transform.y - transform.y) < 1) {
        //     view.data_manager.highlight_nodes([])
        // }
        // else {
            transform = d3.event.transform;
        // }
        console.log("zoom end", d3.event.transform.x, d3.event.transform.y,d3.event.transform.k)
    };

    that.set_zoom_slider_value = function(v) {
        console.log(v);
        zoom_slider.property("value", v);
        zoom_text.html((Math.round(v*100)-17)+"%");
    };

    that.set_zoom = function () {
        function slider_value_change(transform){

              that.apply_transform(transform);
              view.maintain_size(transform);
              let target_level = current_level;
              let current_level_scale = Math.pow(2, target_level);
              while (transform.k > 2 * current_level_scale) {
                current_level_scale *= 2;
                target_level += 1;
            }
              while (transform.k < current_level_scale / 1.5 && target_level > 0) {
                    current_level_scale /= 2;
                    target_level -= 1;
                }
              current_level = target_level;
              view.width = $('#graph-view-svg').width();
              view.height = $('#graph-view-svg').height();
              let start_x = view.center_scale_x_reverse(-transform.x /transform.k);
              let start_y = view.center_scale_y_reverse(-transform.y / transform.k);
              let end_x = view.center_scale_x_reverse((view.width - transform.x) / transform.k);
              let end_y = view.center_scale_y_reverse((view.height - transform.y) / transform.k);

              let area = {
                  'x': start_x,
                  'y': start_y,
                  'width': end_x - start_x,
                  'height': end_y - start_y
              };
              let send_zoom_idx = send_zoom_cnt++;
              send_zoom_request[send_zoom_idx] = true;

              setTimeout(function () {
                  if(send_zoom_request[send_zoom_idx+1] === undefined){
                                console.log(send_zoom_idx);
                                console.log("recv:", area, target_level);
                                // transform = d3.event.transform;
                                view.data_manager.zoom_graph_view_notify(area, target_level);
                            }}, 500);
        };
        zoom = d3.zoom()
            .scaleExtent([0.6, 250])
            .on('start', function () {
                // d3.selectAll(".iw-contextMenu").style("display", "none");
                // focus_node_change_switch = true;
                // focus_edge_change_switch = true;
            })
            .on("zoom", that.zoomed)
            .on("end", that.zoom_end);
        // view.svg.on(".drag", null);
        //     view.svg.on(".dragend", null); //disabled by changjian
        view.svg.call(zoom);
        zoom_slider.attr("value", 1)
          .attr("min", zoom.scaleExtent()[0])
          .attr("max", zoom.scaleExtent()[1])
          .attr("step", (zoom.scaleExtent()[1] - zoom.scaleExtent()[0]) / 100)
          .on("input", function () {
              let v = zoom_slider.property("value");
              transform.k = v;
              slider_value_change(transform);
          });
        $("#zoom-slider-add")
            .on("mouseover", function () {
                $("#zoom-slider-add").css("background", "rgb(198,198,198)");
            })
            .on("mouseout", function () {
                $("#zoom-slider-add").css("background", "white");
            })
            .on("click", function () {
            transform.k += 0.1;
            if(transform.k > zoom.scaleExtent()[1]){
                transform.k = zoom.scaleExtent()[1];
            }
            slider_value_change(transform);
        });
        $("#zoom-slider-minus")
            .on("mouseover", function () {
                $("#zoom-slider-minus").css("background", "rgb(198,198,198)");
            })
            .on("mouseout", function () {
                $("#zoom-slider-minus").css("background", "white");
            })
            .on("click", function () {
            transform.k -= 0.1;
            if(transform.k < zoom.scaleExtent()[0]){
                transform.k = zoom.scaleExtent()[0];
            }
            slider_value_change(transform);
        })
    };

    that.remove_zoom = function() {
        view.svg.on('.zoom', null);
    };

    that.update_zoom_scale = function (new_zoom_scale){
        zoom_scale = new_zoom_scale;
        view.update_zoom_scale(zoom_scale);
    };

    that.fetch_points = function (select_ids, new_nodes, type = "highlight", tdata){
        // first, figure out whether all selection nodes are in current area
        $.post("/graph/getArea", {
                    "must_show_nodes":JSON.stringify(select_ids),
                    "width":view.width,
                    "height":view.height
                }, function (data) {
                let now_area = view.get_area();
                let selection_area = data.area;
                if((selection_area.x>=now_area.x)
                    &&((selection_area.width+selection_area.x)<=(now_area.x+now_area.width))
                    &&(selection_area.y>=now_area.y)
                    &&((selection_area.height+selection_area.y)<=(now_area.y+now_area.height))){
                    // all selection nodes in now area
                    console.log("in area");
                    view.data_manager.state.is_zoom = false;
                    let must_show_nodes = Object.keys(view.get_nodes()).map(d => parseInt(d));
                    console.log("now area", now_area);
                    view.data_manager.fetch_graph_node(must_show_nodes.concat(new_nodes), now_area,
                        current_level, view.width/view.height, type, tdata);
                }
                else {
                    // some selection nodes not in now area,need to zoom in to that area
                    console.log("out of area");
                    view.data_manager.state.is_zoom = true;
                    // merge area
                    // get k and level
                    view.width = $("#graph-view-svg").width();
                    view.height = $("#graph-view-svg").height();
                    let new_area = that._merge_rect(now_area, data.area, view.width/view.height);
                    new_area.x -= 1;
                    new_area.y -= 1;
                    new_area.width += 2;
                    new_area.height += 2;
                    let main_group_min_x = view.center_scale_x(new_area.x);
                    let main_group_min_y = view.center_scale_y(new_area.y);
                    let main_group_max_x = view.center_scale_x(new_area.x+new_area.width);
                    let main_group_max_y = view.center_scale_y(new_area.y+new_area.height);
                    let maingroup_k = Math.min(view.width/(main_group_max_x-main_group_min_x), view.height/(main_group_max_y-main_group_min_y));
                    let target_level = current_level;
                    let current_level_scale = Math.pow(2, target_level);
                    while (maingroup_k > 2 * current_level_scale) {
                            current_level_scale *= 2;
                            target_level += 1;
                    }
                    while (maingroup_k < current_level_scale / 1.5 && target_level > 0) {
                            current_level_scale /= 2;
                            target_level -= 1;
                    }
                    current_level = target_level;
                    zoom_scale = 1.0 / maingroup_k;
                    console.log("current level", current_level, "current area", new_area);
                    view.data_manager.fetch_graph_node(select_ids, new_area, current_level,
                        view.width/view.height, type, tdata);
                }
            });
    };

    that._merge_rect = function(a, b, wh = 0) {
        let x_min = Math.min(a.x, b.x);
        let x_max = Math.max(a.x+a.width, b.x+b.width);
        let y_min = Math.min(a.y, b.y);
        let y_max = Math.max(a.y+a.height, b.y+b.height);
        let new_rect = {
            x:x_min,
            y:y_min,
            width:x_max-x_min,
            height:y_max-y_min
        };
        if(wh !== 0){
            let new_wh = new_rect.width/new_rect.height;
            if(wh > new_wh){
                    x_min -= (new_rect["height"] * wh - new_rect["width"]) / 2;
                    x_max += (new_rect["height"] * wh - new_rect["width"]) / 2;
                    new_rect["x"] = x_min;
                    new_rect["width"] = x_max - x_min;
            }
            else if(wh < new_wh){
                    y_min -= (new_rect["width"] / wh - new_rect["height"]) / 2;
                    y_max += (new_rect["width"] / wh - new_rect["height"]) / 2;
                    new_rect["y"] = y_min;
                    new_rect["height"] = y_max - y_min;
            }
        }
        return new_rect
    };

    that.zoom_into_area = function (new_area) {
         view.width = $("#graph-view-svg").width();
         view.height = $("#graph-view-svg").height();
         let main_group_min_x = view.center_scale_x(new_area.x);
         let main_group_min_y = view.center_scale_y(new_area.y);
         let main_group_max_x = view.center_scale_x(new_area.x + new_area.width);
         let main_group_max_y = view.center_scale_y(new_area.y + new_area.height);
         let maingroup_k = Math.min(view.width/(main_group_max_x-main_group_min_x), view.height/(main_group_max_y-main_group_min_y));
         console.log("old transform", transform);
         if(transform === null){
                transform = {
                    toString: function () {
                        let self = this;
                        return 'translate(' + self.x + "," + self.y + ") scale(" + self.k + ")";
                    }
                };
         }
         transform.k = maingroup_k;
         transform.x = view.width/2-(main_group_min_x+main_group_max_x)/2*maingroup_k;
         transform.y = view.height/2-(main_group_min_y+main_group_max_y)/2*maingroup_k;
         let target_level = current_level;
        let current_level_scale = Math.pow(2, target_level);
        while (transform.k > 2 * current_level_scale) {
            current_level_scale *= 2;
            target_level += 1;
        }
        while (transform.k < current_level_scale / 1.5 && target_level > 0) {
            current_level_scale /= 2;
            target_level -= 1;
        }
        current_level = target_level;

        view.data_manager.state.area = new_area;
        view.data_manager.fetch_nodes(new_area, current_level, []);

    };

    that._update_transform = function(new_area) {
        return new Promise(function (resolve, reject) {
            view.width = $("#graph-view-svg").width();
            view.height = $("#graph-view-svg").height();
            let main_group_min_x = view.center_scale_x(new_area.x);
            let main_group_min_y = view.center_scale_y(new_area.y);
            let main_group_max_x = view.center_scale_x(new_area.x + new_area.width);
            let main_group_max_y = view.center_scale_y(new_area.y + new_area.height);
            let maingroup_k = Math.min(view.width/(main_group_max_x-main_group_min_x), view.height/(main_group_max_y-main_group_min_y));
            console.log("old transform", transform);
            if(transform === null){
                transform = {
                    toString: function () {
                        let self = this;
                        return 'translate(' + self.x + "," + self.y + ") scale(" + self.k + ")";
                    }
                };
            }
            transform.k = maingroup_k;
            transform.x = view.width/2-(main_group_min_x+main_group_max_x)/2*maingroup_k;
            transform.y = view.height/2-(main_group_min_y+main_group_max_y)/2*maingroup_k;
            console.log(AnimationDuration, transform);
            view.maintain_size(transform, true);
            // view.svg
            //     .transition()
            //     .duration(AnimationDuration)
            //     .call(zoom.transform, d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.k))
            //     .on("end", resolve);
            view.main_group.transition()
                .duration(AnimationDuration)
                .attr("transform", transform)
                .on("end", function () {
                    view.svg.call(zoom.transform, d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.k));
                    resolve();
                });

        });
    };

    // that.get_area = function(){
    //     return area;
    // };

    that.get_level = function(){
        return current_level;
    };


    that.init = function () {
        that._init();
    }.call();
};