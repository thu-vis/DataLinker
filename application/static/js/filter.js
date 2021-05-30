
let FilterLayout = function (container) {
    let that = this;
    that.container = container;

    let bbox = that.container.node().getBoundingClientRect();
    let width = bbox.width;
    let height = bbox.height;
    let layout_width = width - 20;
    let layout_height = height - 20;
    let widget_width = null;
    let widget_height = null;
    let data_manager = null;
    let AnimationDuration = 1000;
    let color_unlabel = UnlabeledColor;
    let color_label = CategoryColor;
    let checkbox_width = 14;
    let checkbox_r = 3.5;
    // svg
    let uncertainty_svg = null;
    let label_svg = null;
    let indegree_svg = null;
    let outdegree_svg = null;
    let edgeInfluence_svg = null;
    let edgeType_svg = null;
    let consistency_svg = null;
    let kdegree_svg = null;

    //data
    let label_widget_data = null;
    let label_widget_range = [-1, -1];
    let uncertainty_widget_data = null;
    let uncertainty_widget_range = [-1, -1];
    let indegree_widget_data = null;
    let indegree_widget_range = [-1, -1];
    let outdegree_widget_data = null;
    let outdegree_widget_range = [-1, -1];
    let influence_widget_data = null;
    let influence_widget_range = [-1,-1];
    let consistency_widget_data = null;
    let consistency_widget_range = [-1, -1];
    let kdegree_widget_data = null;
    let kdegree_widget_range = [0, 0];
    let edgetype_data = null;
    let edgetype_range = [];
    let label_names = [];

    //filter flag
    let control_items = {};
    let label_items = {};
    let uncertain_items = {};
    let indegree_items = {};
    let outdegree_items = {};
    let consistency_items = {};
    let kdegree_items = {};

    let edge_type_icons = {
        "in":null,
        "out":null,
        // "within":null,
        // "between":null
    };
    let edge_type_rects = {
        "in":null,
        "out":null,
        // "within":null,
        // "between":null
    };
    let edge_type_checkboxes = {
        "in": null,
        "out": null,
        // "within": null,
        // "between": null
    };

    //label
    let label_rect = {};

    that._init = function () {
        uncertainty_svg = container.select("#current-uncertainty-svg");
        label_svg = container.select("#current-label-svg");
        indegree_svg = container.select("#current-indegree-svg");
        outdegree_svg = container.select("#current-outdegree-svg");
        edgeInfluence_svg = container.select("#current-edgeinfluence-svg");
        edgeType_svg = container.select("#current-edgetype-svg");
        consistency_svg = container.select("#current-consistency-svg");
        kdegree_svg = container.select("#current-kdegree-svg");

        widget_width = parseInt($("#current-uncertainty-svg").width());
        widget_height = parseInt($("#current-uncertainty-svg").height());

        edge_type_icons["in"] = container.select("#in_icon");
        edge_type_icons["out"] = container.select("#out_icon");
        // edge_type_icons["within"] = container.select("#within_icon");
        // edge_type_icons["between"] = container.select("#between_icon");

        edge_type_checkboxes["in"] = container.select("#in-checkbox");
        edge_type_checkboxes["out"] = container.select("#out-checkbox");
        // edge_type_checkboxes["within"] = container.select("#within-checkbox");
        // edge_type_checkboxes["between"] = container.select("#between-checkbox");


    };

    that.set_data_manager = function(new_data_manager) {
        data_manager = new_data_manager;
    };

    that.component_update = function(state) {
        console.log("get filter state:", state);
        that._update_data(state);
        that._update_view();
    };

    that._update_data = function(state) {
        label_names = ["Unlabeled"].concat(state.label_names);
        label_widget_data = state.label_widget_data;
        label_widget_range = state.label_widget_range;
        uncertainty_widget_data = state.uncertainty_widget_data;
        uncertainty_widget_range = state.uncertainty_widget_range;
        indegree_widget_data = state.indegree_widget_data;
        indegree_widget_range = state.indegree_widget_range;
        outdegree_widget_data = state.outdegree_widget_data;
        outdegree_widget_range = state.outdegree_widget_range;
        influence_widget_data = state.influence_widget_data;
        influence_widget_range = state.influence_widget_range;
        consistency_widget_data = state.consistency_widget_data;
        consistency_widget_range = state.consistency_widget_range;
        edgetype_data = state.edgetype_data;
        edgetype_range = state.edgetype_range;
        kdegree_widget_data = state.kdegree_widget_data;
        kdegree_widget_range = state.kdegree_widget_range;
        if(kdegree_widget_data.length === 1){
            kdegree_widget_data = [0,kdegree_widget_data[0], 0];
            kdegree_widget_range = [-1,1];
        }

        // init flags
        kdegree_items = {};
        uncertain_items = {};
        label_items = {};
        indegree_items = {};
        outdegree_items = {};
        control_items = {};
        consistency_items = {};
        for(let i=0; i< uncertainty_widget_data.length; i++){
            if(i<uncertainty_widget_range[0] || i>uncertainty_widget_range[1]){
                for(let node_id of uncertainty_widget_data[i]){
                    uncertain_items[node_id] = false;
                }
            }
            else {
                for(let node_id of uncertainty_widget_data[i]){
                    uncertain_items[node_id] = true;
                }
            }
        }
        for(let i=0; i< indegree_widget_data.length; i++){
            if(i<indegree_widget_range[0] || i>indegree_widget_range[1]){
                for(let node_id of indegree_widget_data[i]){
                    indegree_items[node_id] = false;
                }
            }
            else {
                for(let node_id of indegree_widget_data[i]){
                    indegree_items[node_id] = true;
                }
            }
        }
        for(let i=0; i< outdegree_widget_data.length; i++){
            if(i<outdegree_widget_range[0] || i>outdegree_widget_range[1]){
                for(let node_id of outdegree_widget_data[i]){
                    outdegree_items[node_id] = false;
                }
            }
            else {
                for(let node_id of outdegree_widget_data[i]){
                    outdegree_items[node_id] = true;
                }
            }
        }
        for(let i=0; i< consistency_widget_data.length; i++){
            if(i<consistency_widget_range[0] || i>consistency_widget_range[1]){
                for(let node_id of consistency_widget_data[i]){
                    consistency_items[node_id] = false;
                }
            }
            else {
                for(let node_id of consistency_widget_data[i]){
                    consistency_items[node_id] = true;
                }
            }
        }
        for(let i=0; i< label_widget_data.length; i++){
            if(label_widget_range.indexOf(i)===-1){
                for(let node_id of label_widget_data[i]){
                    label_items[node_id] = false;
                }
            }
            else {
                for(let node_id of label_widget_data[i]){
                    label_items[node_id] = true;
                }
            }
        }
        for(let node_bins of uncertainty_widget_data){
            for(let node_id of node_bins){
                control_items[node_id] = label_items[node_id]&&
                    indegree_items[node_id]&&outdegree_items[node_id] && consistency_items[node_id];
            }
        }
    };

    that._update_view = function() {
        that._draw_widget(uncertainty_widget_data, uncertainty_svg, "uncertainty", uncertainty_widget_range, uncertain_items);
        that._draw_widget(consistency_widget_data, consistency_svg, "consistency", consistency_widget_range, consistency_items);
        that.label_scented_widget();
        // that._draw_widget(indegree_widget_data, indegree_svg, "indegree", indegree_widget_range, indegree_items);
        // that._draw_widget(outdegree_widget_data, outdegree_svg, "outdegree", outdegree_widget_range, outdegree_items);
        // that._draw_widget(kdegree_widget_data, kdegree_svg, "kdegree", kdegree_widget_range, kdegree_items);
        that._draw_degree_widget(kdegree_widget_data, kdegree_svg, kdegree_widget_range);
        that.draw_edge_influence_widget(influence_widget_data, edgeInfluence_svg, "influence", influence_widget_range);
        that.draw_edge_type_widget(edgetype_data, edgeType_svg, "edgetype", edgetype_range);

        set_font(that.container.selectAll("text"));
        kdegree_svg.select("#current-kdegree-texts-start").attr("font-size", "12px").attr("fill", "rgb(127,127,127)");
        kdegree_svg.select("#current-kdegree-texts-end").attr("font-size", "12px").attr("fill", "rgb(127,127,127)");
    };

    that.label_scented_widget = function() {
        let i = 0;
        // label interval
        let min_label_id = -1;
        let max_label_id = data_manager.state.label_names.length-1;
        let label_cnt = max_label_id-min_label_id+1;
        function interval_idx(label_id){
            return label_id;
        }


        // label distribution
        let label_distribution = label_widget_data;
        for(let distribute of label_distribution){
            distribute.avg_consistency = data_manager.graph_view.get_average_consistency(data_manager.state.complete_graph, distribute);
            console.log("label",i,"consistency",distribute.avg_consistency);
            distribute.avg_consistency = Math.pow(distribute.avg_consistency, 3);
            i++;
        }
        let max_len = 0;
        for(let label_ary of label_distribution){
            if(max_len < label_ary.length){
                max_len = label_ary.length;
            }
        }
        for(let label_ary of label_distribution){
            label_ary.height = ((label_ary.length/max_len>0.5?1:-1)*Math.pow(Math.abs(2*label_ary.length/max_len-1), 1/1.3)+1)/2;
            // label_ary.height = label_ary.length / max_len;
        }
        console.log("label distribution:", label_distribution);

        // draw
        label_rect = {};
        let container = label_svg;
        let container_width = widget_width;
        let container_height = widget_height;
        // container.selectAll("*").remove();
        let paddinginner_len = (container_width * 0.8 - 14*label_distribution.length)/((label_distribution.length-1));
        let paddinginner = paddinginner_len/(14 + paddinginner_len);
        console.log("padding inner", paddinginner);
        let paddingoutter = 0;
        if(label_distribution.length < 10) paddingoutter = 0.4;
        let x = d3.scaleBand().rangeRound([container_width*0.1, container_width*0.9], .05).paddingInner(paddinginner).paddingOuter(paddingoutter).domain(d3.range(label_cnt));
        let y = d3.scaleLinear().range([container_height*  0.7, container_height*0.05]).domain([0, 1]);
        // draw rect

        if(container.select("#current-label-rects").size() === 0){
            container.append("g")
                .attr("id", "current-label-rects");
        }
        let rects = container.select("#current-label-rects").selectAll("rect").data(label_distribution);

        rects
            .enter()
            .append("rect")
            .attr("class", "widget-bar-chart")
            .style("fill", (d, i) => i===0?color_unlabel:color_label[i-1])
            .attr("x", function(d, i) { return x(i); })
            .attr("width", x.bandwidth())
            .attr("y", function(d, i) { return y(d.height)-3; })
            .attr("height", function(d) {
              return container_height*  0.7 - y(d.height);
          })
            .attr("opacity", (d, i) => (label_widget_range.indexOf(i) > -1)?1:0.2)
            .on("mouseover", function (d, i) {
                let rect = label_rect[i].rect;
                let checkbox = label_rect[i].checkbox;
                if(rect.attr("opacity") == 1){
                    rect.attr("opacity", 0.5);
                }
            })
            .on("mouseout", function (d, i) {
                let rect = label_rect[i].rect;
                let checkbox = label_rect[i].checkbox;
                if(rect.attr("opacity") == 0.5){
                    rect.attr("opacity", 1);
                }
            })
            .on("click", function (d, i) {
                let rect = label_rect[i].rect;
                let checkbox = label_rect[i].checkbox;
                if(rect.attr("opacity") != 0.2){
                    // no select
                    rect.attr("opacity", 0.2);
                    checkbox.select("rect").attr("fill", (d,i) => "white");
                    for(let id of label_rect[i].data){
                        label_items[id] = false;
                    }
                    that.update_widget_showing_items(label_rect[i].data);
                    label_widget_range.splice(label_widget_range.indexOf(i), 1);
                }
                else {
                    rect.attr("opacity", 0.5);
                    checkbox.select("rect").attr("fill", (d,i) => d.label===0?color_unlabel:color_label[d.label-1]);
                    for(let id of label_rect[i].data){
                        label_items[id] = true;
                    }
                    that.update_widget_showing_items(label_rect[i].data);
                    label_widget_range.push(i);
                }
            })
            .each(function (d, i) {
                let rect = d3.select(this);
                label_rect[i] = {
                    label:i,
                    rect:rect,
                    data:d
                }
            });
        rects
            .each(function (d, i) {
                let rect = d3.select(this);
                label_rect[i] = {
                    label:i,
                    rect:rect,
                    data:d
                }
            });
        rects.each(function (d) {
           let rect = d3.select(this);
           if(rect.attr("opacity")==0.2){
               for(let id of d){
                   label_items[id] = false;
               }
           }
           else {
               for(let id of d){
                   label_items[id] = true;
               }
           }
        });
        rects.transition()
            .duration(AnimationDuration)
            .attr("x", function(d, i) { return x(i); })
            .attr("width", x.bandwidth())
            .attr("y", function(d, i) { return y(d.height)-3; })
            .attr("height", function(d) {
                  return container_height*  0.7 - y(d.height);
              })
            .attr("opacity", (d, i) => (label_widget_range.indexOf(i) > -1)?1:0.2);
        rects.exit()
            .transition()
            .duration(AnimationDuration)
            .remove();
        // draw axis
        if(container.select("#current-label-axis").size() === 0){
            container.append("g")
            .attr("id", "current-label-axis")
            .append("line")
            .attr("x1", container_width*0.1)
            .attr("y1", container_height*  0.7)
            .attr("x2", container_width*0.9)
            .attr("y2", container_height*  0.7)
            .attr("stroke", "black")
            .attr("stroke-width", 1);
        }
        // draw checkbox
        //if(container.select(".current-label-checkbox").size() === 0){
            let bandwidth = checkbox_width;
            let xoffset = (x.bandwidth()-bandwidth)/2;
            let yoffset = x.bandwidth()*0.15;
            let groups = container
                .selectAll(".current-label-checkbox")
                .data(Object.values(label_rect))
			    .enter()
                .append("g")
                .attr("class", "current-label-checkbox")
                .each(function (d, i) {
                    label_rect[i].checkbox = d3.select(this);
                })
                .attr("transform", (d, i) => "translate("+(x(label_rect[i].label)+xoffset)+","+(container_height*  0.7+yoffset)+")")
                .on("mouseover", function (d, i) {
                    let rect = label_rect[i].rect;
                    let checkbox = label_rect[i].checkbox;
                    if(rect.attr("opacity") == 1){
                        rect.attr("opacity", 0.5);
                    }
                })
                .on("mouseout", function (d, i) {
                    let rect = label_rect[i].rect;
                    if(rect.attr("opacity") == 0.5){
                        rect.attr("opacity", 1);
                    }
                })
                .on("click", function (d, i) {
                    let rect = label_rect[i].rect;
                    let checkbox = label_rect[i].checkbox;
                    if(rect.attr("opacity") != 0.2){
                        // no select
                        rect.attr("opacity", 0.2);
                        checkbox.select("rect").attr("fill", (d,i) =>  "white");
                        for(let id of label_rect[i].data){
                            label_items[id] = false;
                        }
                        that.update_widget_showing_items(label_rect[i].data);
                        label_widget_range.splice(label_widget_range.indexOf(i), 1);
                    }
                    else {
                        rect.attr("opacity", 0.5);
                        checkbox.select("rect").attr("fill", (d,i) => (d.label===0?color_unlabel:color_label[d.label-1]));
                        for(let id of label_rect[i].data){
                            label_items[id] = true;
                        }
                        that.update_widget_showing_items(label_rect[i].data);
                        label_widget_range.push(i);
                    }
                });
            groups.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", checkbox_width)
                .attr("height", checkbox_width)
                .attr("rx", checkbox_r)
                .attr("ry", checkbox_r)
                .attr("fill", (d,i) => label_rect[i].rect.attr("opacity")==1 ? (i===0?color_unlabel:color_label[i-1]) : "white")
                .attr("stroke", (d,i) => (i===0?color_unlabel:color_label[i-1]));
            groups.append("text")
                .style("stroke", "white")
                .style("fill", "white")
                .attr("text-anchor", "middle")
                .attr("x", checkbox_width/2)
                .attr("y", checkbox_width/2 + 5)
                .text("\u2714");


            // container.append("g")
            //     .attr("id", "current-label-checkbox-hover")
            //     .selectAll("rect")
            //     .data(Object.values(label_rect))
            //     .enter()
            //     .append("rect")
            //     .attr("x", (d, i) => x(label_rect[i].label)+offset)
            //     .attr("y", container_height*  0.7+offset)
            //     .attr("width", bandwidth)
            //     .attr("height", bandwidth)
            //     .attr("opacity", 0)
            //     .on("mouseover", function (d, i) {
            //         let rect = label_rect[i].rect;
            //         let checkbox = label_rect[i].checkbox;
            //         if(rect.attr("opacity") == 1){
            //             rect.attr("opacity", 0.5);
            //         }
            //     })
            //     .on("mouseout", function (d, i) {
            //         let rect = label_rect[i].rect;
            //         let checkbox = label_rect[i].checkbox;
            //         if(rect.attr("opacity") == 0.5){
            //             rect.attr("opacity", 1);
            //         }
            //     })
            //     .on("click", function (d, i) {
            //         let rect = label_rect[i].rect;
            //         let checkbox = label_rect[i].checkbox;
            //         if(rect.attr("opacity") != 0.2){
            //             // no select
            //             rect.attr("opacity", 0.2);
            //             checkbox.attr("xlink:href", "#check-no-select");
            //             for(let id of label_rect[i].data){
            //                 label_items[id] = false;
            //             }
            //             that.update_widget_showing_items(label_rect[i].data);
            //             label_widget_range.splice(label_widget_range.indexOf(i), 1);
            //         }
            //         else {
            //             rect.attr("opacity", 0.5);
            //             checkbox.attr("xlink:href", "#check-select");
            //             for(let id of label_rect[i].data){
            //                 label_items[id] = true;
            //             }
            //             that.update_widget_showing_items(label_rect[i].data);
            //             label_widget_range.push(i);
            //         }
            //     });
            // container.append("g")
            //     .attr("id", "current-label-checkbox")
            //     .selectAll("use")
            //     .data(Object.values(label_rect))
            //     .enter()
            //     .append("use")
            //     .attr("xlink:href", (d, i) => label_widget_range.indexOf(i)>-1?"#check-select":"#check-no-select")
            //     .attr("x", (d, i) => x(label_rect[i].label)+offset)
            //     .attr("y", container_height*  0.7+offset)
            //     .attr("width", bandwidth)
            //     .attr("height", bandwidth)
            //     .each(function (d, i) {
            //         let checkbox = d3.select(this);
            //         label_rect[i].checkbox = checkbox;
            //     })

        //else {
        //     let bandwidth = checkbox_width;
        //     let xoffset = (x.bandwidth()-bandwidth)/2;
        //     let yoffset = x.bandwidth()*0.15;
            container.selectAll(".current-label-checkbox")
                .data(Object.values(label_rect));
            container.selectAll(".current-label-checkbox")
                .each(function (d, i) {
                        label_rect[i].checkbox = d3.select(this);
                    });
            container.selectAll(".current-label-checkbox")
                .select("rect")
                .data(Object.values(label_rect));

            container.selectAll(".current-label-checkbox")
                .each(function (d, i) {
                    label_rect[i].checkbox = d3.select(this);
                })
                .attr("transform", (d, i) => "translate("+(x(label_rect[i].label)+xoffset)+","+(container_height*  0.7+yoffset)+")");

            container.selectAll(".current-label-checkbox")
                .select("rect")
                .transition()
                .duration(AnimationDuration)
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", checkbox_width)
                .attr("height", checkbox_width)
                .attr("rx", checkbox_r)
                .attr("ry", checkbox_r)
                .attr("fill", (d,i) => label_rect[d.label].rect.attr("opacity")==1 ? (d.label===0?color_unlabel:color_label[d.label-1]) : "white");

            container.selectAll(".current-label-checkbox")
                .select("text")
                .transition()
                .duration(AnimationDuration)
                .attr("x", checkbox_width/2)
                .attr("y", checkbox_width/2 + 5)
        //}

        // draw label glyph
        if(label_distribution.length >= 11){
            console.log("STL data");
            if(container.select("#current-label-glyphs").size() === 0){
                container.append("g")
                    .attr("id", "current-label-glyphs");
            }
            let glyphs = container.select("#current-label-glyphs").selectAll("use").data(label_distribution);
            glyphs.enter()
                .append("use")
                .attr("xlink:href", (d,i) => "#stl-class-"+(i-1))
                .attr("x", function(d, i) { return x(i); })
                .attr("y", function(d, i) {
                    let offset = 0;
                    if(d.length/max_len < 0.3) offset = -18;

                    return y(d.length/max_len)+offset;
                })
                .attr("width", 18)
                .attr("height", 18);
            glyphs
                .transition()
                .duration(AnimationDuration)
                .attr("x", function(d, i) { return x(i); })
                .attr("y", function(d, i) {
                    let offset = 0;
                    if(d.length/max_len < 0.3) offset = -18;

                    return y(d.length/max_len)+offset;
                })
                .attr("width", 18)
                .attr("height", 18);

            glyphs.exit()
            .transition()
            .duration(AnimationDuration)
            .remove();
        }

        // draw label legend
        if(container.select("#current-label-legends").size() === 0){
            container.append("g")
                .attr("id", "current-label-legends");
        }
        let legends = container.select("#current-label-legends").selectAll("text").data(label_names);
        legends.enter()
            .append("text")
            .attr("class", "legend")
            .attr("text-anchor", "start")
            .attr("font-size", 15)
            .attr("fill", FontColor)
            .attr("x", x.bandwidth()*0.4)
            .attr("y", 0)
            .attr("transform", function(d, i){
                let xcor=x(i);
                let ycor=container_height*  0.7+23;
                return "translate(" + (xcor)
                    + ", " + ycor + ") rotate(30)";
            })
            .text(d => d)
            .each(function () {
                let text = d3.select(this);
                set_font(text);
            });
        legends
            .text(d => d)
            .transition()
            .duration(AnimationDuration)
            .attr("x", x.bandwidth()*0.4)
            .attr("y", 0)
            .attr("transform", function(d, i){
                let xcor=x(i);
                let ycor=container_height*  0.7+23;
                return "translate(" + (xcor)
                    + ", " + ycor + ") rotate(30)";
            });
    };

    that.update_widget_showing_items = function() {
        let remove_nodes = [];
        let add_nodes = [];
        for(let node_id of Object.keys(control_items)){
            let new_flag = label_items[node_id]&&indegree_items[node_id]&&outdegree_items[node_id]&&consistency_items[node_id];
            if(new_flag === true && control_items[node_id] === false){
                add_nodes.push(node_id);
                control_items[node_id] = new_flag;
            }
            else if(new_flag === false && control_items[node_id] === true){
                remove_nodes.push(node_id);
                control_items[node_id] = new_flag;
            }

        }
        if(remove_nodes.length >0 || add_nodes.length>0){
            console.log(remove_nodes, add_nodes);
            // TODO
            data_manager.change_visible_items(control_items);
            // data_manager.change_glyphs(control_items);
        }

    };

    that.update_glyph_showing_items = function() {
        let show_glyphs = Object.keys(uncertain_items).map(d => parseInt(d)).filter(d => uncertain_items[d]===true);
        console.log("show glyphs:", show_glyphs);
        data_manager.change_glyphs(show_glyphs);
    };

    that._draw_widget = function(distribution, container, type, range, visible_items){
        // distribution
        let max_len = 0;
        let bar_cnt = distribution.length;
        for(let node_ary of distribution){
            if(max_len < node_ary.length){
                max_len = node_ary.length;
            }
        }
        // draw
        let container_width = widget_width;
        let container_height = widget_height;
        let paddinginner_len = (container_width * 0.8 - 11*distribution.length)/((distribution.length-1));
        let paddinginner = paddinginner_len/(11 + paddinginner_len);
        let x = d3.scaleBand().rangeRound([container_width*0.1, container_width*0.9], .05).paddingInner(paddinginner).domain(d3.range(bar_cnt));
        let y = d3.scaleLinear().range([container_height*  0.7, container_height*0.05]).domain([0, 1]);
        let drag_interval = x.step();

        //draw bar chart
        if(container.select("#current-"+type+"-rects").size() === 0){
            container.append("g")
                .attr("id", "current-"+type+"-rects");
        }
        let rects = container.select("#current-"+type+"-rects").selectAll("rect").data(distribution);
        // draw x-axis
        if(container.select("#current-"+type+"-axis-in").size() === 0){
            container.append("g")
                .attr("id","current-"+type+"-axis-out")
                .append("line")
                .attr("x1", container_width*0.1)
                .attr("y1", container_height*  0.7)
                .attr("x2", container_width*0.9)
                .attr("y2", container_height*  0.7)
                .attr("stroke", "rgb(227,231,235)")
                .attr("stroke-linecap", "round")
                .attr("transform", "translate(0, 0)")
                .attr("stroke-width", 5);

            container.append("g")
                .attr("id","current-"+type+"-axis-in")
                .append("line")
                .attr("x1", container_width*0.1+range[0]*drag_interval-2)
                .attr("y1", container_height*  0.7)
                .attr("x2", Math.min(container_width*0.1+(range[1]+1)*drag_interval+2, container_width*0.9))
                .attr("y2", container_height*  0.7)
                .attr("stroke", "rgb(166,166,166)")
                .attr("stroke-linecap", "round")
                .attr("transform", "translate(0, 0)")
                .attr("stroke-width", 5);
        }

        if(container.select("#current-"+type+"-texts").size() === 0){
             let textsg = container.append("g")
                .attr("id", "current-"+type+"-texts");
             textsg.append("text")
                 .attr("id", "current-"+type+"-texts-start")
                 .attr("x", container_width*0.1-5)
                 .attr("y", container_height* 0.7+10)
                 .attr("text-anchor", "end")
                 .text(0);
             textsg.append("text")
                 .attr("id", "current-"+type+"-texts-end")
                 .attr("x", container_width*0.9+5)
                 .attr("y", container_height* 0.7+10)
                 .attr("text-anchor", "start")
                 .text(function () {
                    if(type === "consistency") return 6;
                    if(type === "kdegree") return kdegree_widget_data.length-1;
                    return 1;
                 });
        }
        else {
            let textsg = container.select("#current-"+type+"-texts");
            textsg.select("#current-"+type+"-texts-end")
                .text(function () {
                    if(type === "consistency") return 6;
                    if(type === "kdegree") return kdegree_widget_data.length-1;
                    return 1;
                 });
        }
        let textsg = container.select("#current-"+type+"-texts");

        //create
        rects
            .enter()
            .append("rect")
            .attr("class", "widget-bar-chart")
            .style("fill", "rgb(127, 127, 127)")
            .attr("x", function(d, i) { return x(i); })
            .attr("width", x.bandwidth())
            .attr("y", function(d, i) { return y(type==="uncertainty"?Math.pow(d.length/max_len, 1/2):d.length/max_len)-3; })
            .attr("height", function(d) {
                return container_height*  0.7 - y(type==="uncertainty"?Math.pow(d.length/max_len, 1/2):d.length/max_len);
            })
            .attr("opacity", (d, i) => (i>=range[0]&&i<=range[1])?1:0.5);
        //update
        rects.transition()
            .duration(AnimationDuration)
            .attr("x", function(d, i) { return x(i); })
            .attr("width", x.bandwidth())
            .attr("y", function(d, i) { return y(type==="uncertainty"?Math.pow(d.length/max_len, 1/2):d.length/max_len)-3; })
            .attr("height", function(d) {
                return container_height*  0.7 - y(type==="uncertainty"?Math.pow(d.length/max_len, 1/2):d.length/max_len);
            })
            .attr("opacity", (d, i) => (i>=range[0]&&i<=range[1])?1:0.5);
        //remove
        rects.exit()
            .transition()
            .duration(AnimationDuration)
            .attr("opacity", 0)
            .remove();



        //draw dragble
        let draggable_item_path = "M0 -6 L6 6 L-6 6 Z";
        let start_drag = null;
        let end_drag = null;
        let start_text = null;
        let end_text = null;
        let start_drag_g = null;
        let end_drag_g = null;

        if(container.select(".start-drag").size() === 0){
            start_drag_g = textsg.append("g");
            end_drag_g = textsg.append("g");
            start_drag = start_drag_g.append("path")
                .attr("class", "start-drag")
                .attr("d", draggable_item_path)
                .attr("fill", "rgb(127, 127, 127)");
            start_text = start_drag_g.append("g")
                .attr("class","start-text")
                .attr("opacity", 0);
            start_text.append("path")
                .attr("transform", "translate(0,-5)")
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("d", "M0 0 L 4 -4 L 15 -4 L 15 -20 L -15 -20 L -15 -4 L -4 -4 Z");
            start_text.append("text")
                .attr("x",0)
                .attr("y", -13)
                .attr("text-anchor", "middle")
                .text((type==="consistency"||type==="kdegree")?range[0]:range[0]/20);
            start_drag_g.attr("transform", "translate("+(container_width*0.1+range[0]*drag_interval-2)+","+(container_height*0.75)+")");

            end_drag = end_drag_g.append("path")
                .attr("class", "end-drag")
                .attr("d", draggable_item_path)
                .attr("fill", "rgb(127, 127, 127)");
            end_text = end_drag_g.append("g")
                .attr("class","end-text")
                .attr("opacity", 0);
            end_text.append("path")
                .attr("transform", "translate(0,-5)")
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("d", "M0 0 L 4 -4 L 15 -4 L 15 -20 L -15 -20 L -15 -4 L -4 -4 Z");
            end_text.append("text")
                .attr("x",0)
                .attr("y", -13)
                .attr("text-anchor", "middle")
                .text((type==="consistency"||type==="kdegree")?range[1]:(range[1]+1)/20);
            end_drag_g.attr("transform", "translate("+(Math.min(container_width*0.1+(range[1]+1)*drag_interval+2, container_width*0.9))+","+(container_height*0.75)+")");
        }
        else {
            start_drag = container.select(".start-drag").each(function () {
                start_drag_g = d3.select(this.parentNode);
            });
            end_drag = container.select(".end-drag").each(function () {
                end_drag_g = d3.select(this.parentNode);
            });
            start_text = container.select(".start-text");
            end_text = container.select(".end-text");
            start_text.select("text").text((type==="consistency"||type==="kdegree")?range[0]:range[0]/20);
            end_text.select("text").text((type==="consistency"||type==="kdegree")?range[1]:(range[1]+1)/20);
            start_drag_g.transition()
                .duration(AnimationDuration)
                .attr("transform", "translate("+(container_width*0.1+range[0]*drag_interval-2)+","+(container_height*0.75)+")");
            end_drag_g.transition()
                .duration(AnimationDuration)
                .attr("transform", "translate("+(Math.min(container_width*0.1+(range[1]+1)*drag_interval+2, container_width*0.9))+","+(container_height*0.75)+")");
        }



        container.select("#current-"+type+"-axis-in").select("line").attr("x1", container_width*0.1+range[0]*drag_interval-2).attr("x2", Math.min(container_width*0.1+(range[1]+1)*drag_interval+2, container_width*0.9));

        start_drag.call(d3.drag()
                    .on("drag", function () {
                        start_text.attr("opacity", 1);
                        end_text.attr("opacity", 1);
                        let x = d3.mouse(container.node())[0];
                        let drag_btn = d3.select(this);
                        let drag_btn_g = d3.select(this.parentNode);
                        let min_x = container_width*0.09;
                        let max_x = -1;
                        let end_pos = end_drag_g.attr("transform").slice(end_drag_g.attr("transform").indexOf("(")+1, end_drag_g.attr("transform").indexOf(","));
                        max_x = parseFloat(end_pos);
                        if((x<=min_x)||(x>=max_x)) return;
                        drag_btn_g.attr("transform", "translate("+(x)+","+(container_height*0.75)+")");
                        container.select("#current-"+type+"-axis-in").select("line").attr("x1", x);
                        container.selectAll("rect").attr("opacity", function (d, i) {
                            let change = false;
                            let rect = d3.select(this);
                            let rect_x = parseFloat(rect.attr("x"));
                            let rect_width = parseFloat(rect.attr("width"));
                            if((rect_x>=x)&&(rect_x+rect_width<=max_x)){
                                // in control
                                if(rect.attr("opacity")!=1)change = true;
                                for(let id of d){
                                    visible_items[id] = true;
                                }
                                if(change) {
                                    // if(type === "uncertainty"){
                                    //     that.update_glyph_showing_items();
                                    // }
                                    // else {
                                    //     that.update_widget_showing_items(d);
                                    // }
                                    range[0] = i;
                                    start_text.select("text").text((type==="consistency"||type==="kdegree")?range[0]: range[0]/20);
                                    end_text.select("text").text((type==="consistency"||type==="kdegree")?range[1]: (range[1]+1)/20);
                                }
                                return 1
                            }
                            if(rect.attr("opacity")!=0.5)change = true;
                            for(let id of d){
                                    visible_items[id] = false;
                            }
                            if(change) {
                                // if(type === "uncertainty"){
                                //     that.update_glyph_showing_items();
                                // }
                                // else {
                                //     that.update_widget_showing_items(d);
                                // }
                                range[0] = i+1;
                                start_text.select("text").text((type==="consistency"||type==="kdegree")?range[0]: range[0]/20);
                                    end_text.select("text").text((type==="consistency"||type==="kdegree")?range[1]: (range[1]+1)/20);

                            }
                            return 0.5
                        })
                    }).on("end", function () {
                        start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
                        if(type === "uncertainty"){
                                        that.update_glyph_showing_items();
                                    }
                                    else {
                                        that.update_widget_showing_items();
                                    }
                    }));
        end_drag.call(d3.drag()
                    .on("drag", function () {
                        start_text.attr("opacity", 1);
                        end_text.attr("opacity", 1);
                        let x = d3.mouse(container.node())[0];
                        let drag_btn = d3.select(this);
                        let drag_btn_g = d3.select(this.parentNode);
                        let max_x = container_width*0.91;
                        let min_x = -1;
                        let end_pos = start_drag_g.attr("transform").slice(start_drag_g.attr("transform").indexOf("(")+1, start_drag_g.attr("transform").indexOf(","));
                        min_x = parseFloat(end_pos);
                        if((x<=min_x)||(x>=max_x)) return;
                        drag_btn_g.attr("transform", "translate("+(x)+","+(container_height*0.75)+")");
                        container.select("#current-"+type+"-axis-in").select("line").attr("x2", x);
                        container.selectAll("rect").attr("opacity", function (d, i) {
                            let change = false;
                            let rect = d3.select(this);
                            let rect_x = parseFloat(rect.attr("x"));
                            let rect_width = parseFloat(rect.attr("width"));
                            if((rect_x>=min_x)&&(rect_x+rect_width<=x)){
                                // in control
                                if(rect.attr("opacity")!=1)change = true;
                                for(let id of d){
                                    visible_items[id] = true;
                                }
                                if(change) {
                                    // if(type === "uncertainty"){
                                    //     that.update_glyph_showing_items();
                                    // }
                                    // else {
                                    //     that.update_widget_showing_items(d);
                                    // }
                                    range[1] = i;
                                    start_text.select("text").text((type==="consistency"||type==="kdegree")?range[0]: range[0]/20);
                                    end_text.select("text").text((type==="consistency"||type==="kdegree")?range[1]: (range[1]+1)/20);
                                }
                                return 1
                            }
                            if(rect.attr("opacity")!=0.5)change = true;
                            for(let id of d){
                                    visible_items[id] = false;
                            }
                            if(change) {
                                // if(type === "uncertainty"){
                                //     that.update_glyph_showing_items();
                                // }
                                // else {
                                //     that.update_widget_showing_items(d);
                                // }
                                range[1] = i-1;
                                start_text.select("text").text((type==="consistency"||type==="kdegree")?range[0]: range[0]/20);
                                end_text.select("text").text((type==="consistency"||type==="kdegree")?range[1]: (range[1]+1)/20);
                            }
                            return 0.5
                        })
                    })
                    .on("end", function () {
                        start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
                        if(type === "uncertainty"){
                                        that.update_glyph_showing_items();
                                    }
                                    else {
                                        that.update_widget_showing_items();
                                    }
                    }));
        start_drag.on("mouseover", function () {
            start_text.attr("opacity", 1);
                        end_text.attr("opacity", 1);
        })
            .on("mouseout", function () {
                start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
            });
        end_drag.on("mouseover", function () {
            start_text.attr("opacity", 1);
                        end_text.attr("opacity", 1);
        })
            .on("mouseout", function () {
                start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
            });
    };

    that._draw_degree_widget = function(distribution, container, range){
        let type = "kdegree";
        let min_xv = -range[0];
        let max_xv = range[1];
        let mrange = [0, 0];
        // distribution
        let max_len = 0;
        let bar_cnt = distribution.length;
        for(let node_ary of distribution){
            if(max_len < node_ary){
                max_len = node_ary;
            }
        }
        if(max_len === 0) max_len = 1;
        // draw
        let container_width = widget_width;
        let container_height = widget_height;
        let paddinginner_len = (container_width * 0.8 - 11*distribution.length)/((distribution.length-1));
        let paddinginner = paddinginner_len/(11 + paddinginner_len);
        let x = d3.scaleBand().rangeRound([container_width*0.1, container_width*0.9], .05).paddingInner(paddinginner).paddingOuter(0.1).domain(d3.range(bar_cnt));
        let y = d3.scaleLinear().range([container_height*  0.7, container_height*0.05]).domain([0, 1]);
        let drag_interval = x.step();
        let x_0_min = x(min_xv);
        let x_0_max = x(min_xv)+x.bandwidth();
        let x_0_minband = x(min_xv)+x.bandwidth()/2-x.step()/2;
        let x_0_maxband = x(min_xv)+x.bandwidth()/2+x.step()/2;
        let bandwidth = x.bandwidth();
        let step = x.step();
        // init
        // data_manager.graph_view.set_step_out(0);
        // data_manager.graph_view.set_step_in(0);
        // draw marker
        if(container.select("marker").size() === 0){
            container.append("marker")
                .attr("id", "arrow-gray")
                .attr("refX", 2)
                .attr("refY", 2)
                .attr("markerWidth", 30)
                .attr("markerHeight", 30)
                .attr("orient", "auto")
                .attr("markerUnits", "strokeWidth")
                .append("path")
                .attr("d", "M-1,16 L15,8 L-1,0")
                .attr("stroke", "rgb(127,127,127)")
                .attr("fill", "transparent")
                .attr("opacity", 1)
                .attr("stroke-width", 1);
        }

        //draw bar chart
        if(container.select("#current-"+type+"-rects").size() === 0){
            container.append("g")
                .attr("id", "current-"+type+"-rects");
        }
        let rects = container.select("#current-"+type+"-rects").selectAll("rect").data(distribution);
        // draw x-axis
        if(container.select("#current-"+type+"-axis-in").size() === 0){
            container.append("g")
                .attr("id","current-"+type+"-axis-out")
                .append("line")
                .attr("x1", container_width*0.1)
                .attr("y1", container_height*  0.7)
                .attr("x2", container_width*0.9)
                .attr("y2", container_height*  0.7)
                .attr("stroke", "rgb(227,231,235)")
                .attr("stroke-linecap", "round")
                .attr("transform", "translate(0, 0)")
                .attr("stroke-width", 5);

            container.append("g")
                .attr("id","current-"+type+"-axis-in")
                .append("line")
                .attr("x1", x_0_minband)
                .attr("y1", container_height*  0.7)
                .attr("x2", x_0_maxband)
                .attr("y2", container_height*  0.7)
                .attr("stroke", "rgb(166,166,166)")
                .attr("stroke-linecap", "round")
                .attr("transform", "translate(0, 0)")
                .attr("stroke-width", 5);
        }

        // draw in out arrow
        if(container.select(".current-"+type+"-arrow-in").size() === 0) {
            container.append("path")
                .attr("class", "current-"+type+"-arrow-in")
                .attr("d", "M {0} {1} L {2} {3} L {4} {5}".format(container_width*0.1, container_height*  0.85, (container_width*0.1 + x_0_min)/2,  container_height*  0.85, x_0_min-5,  container_height*  0.85))
                .attr("marker-end", d => "url(#arrow-gray)")
                .attr("stroke", "rgb(127,127,127)")
                .attr("stroke-width", 1);
            container.append("path")
                .attr("class", "current-"+type+"-arrow-out")
                .attr("d", "M {0} {1} L {2} {3} L {4} {5}".format(x_0_max+5,  container_height*  0.85, (container_width*0.9 + x_0_max)/2,  container_height*  0.85, container_width*0.9, container_height*  0.85))
                .attr("marker-end", d => "url(#arrow-gray)")
                .attr("stroke", "rgb(127,127,127)")
                .attr("stroke-width", 1);
            container.append("circle")
                 .attr("id", "current-"+type+"-arrow-mid")
                 .attr("cx", (x_0_min+x_0_max)/2)
                 .attr("cy", container_height*  0.85)
                 .attr("r", 6)
                 .attr("fill", UnlabeledColor);

        }
        else {
            container
                .select(".current-"+type+"-arrow-in")
                .transition()
                .duration(AnimationDuration)
                .attr("d", "M {0} {1} L {2} {3} L {4} {5}".format(container_width*0.1, container_height*  0.85, (container_width*0.1 + x_0_min)/2,  container_height*  0.85, x_0_min-5,  container_height*  0.85))
            container
                .select(".current-"+type+"-arrow-out")
                .transition()
                .duration(AnimationDuration)
                .attr("d", "M {0} {1} L {2} {3} L {4} {5}".format(x_0_max+5,  container_height*  0.85, (container_width*0.9 + x_0_max)/2,  container_height*  0.85, container_width*0.9, container_height*  0.85))
            container.select("#current-"+type+"-arrow-mid")
                .attr("cx", (x_0_min+x_0_max)/2);
        }

        if(container.select("#current-"+type+"-texts").size() === 0){
             let textsg = container.append("g")
                .attr("id", "current-"+type+"-texts");
             textsg.append("text")
                 .attr("id", "current-"+type+"-texts-start")
                 .attr("x", (container_width*0.1 + x_0_min)/2)
                 .attr("y", container_height*  0.95)
                 .attr("font-size", "12px")
                 .attr("fill", "rgb(127,127,127)")
                 .attr("text-anchor", "middle")
                 .text("in");
             textsg.append("text")
                 .attr("id", "current-"+type+"-texts-end")
                 .attr("x", (container_width*0.9 + x_0_max)/2)
                 .attr("y", container_height*  0.95)
                 .attr("font-size", "12px")
                 .attr("fill", "rgb(127,127,127)")
                 .attr("text-anchor", "middle")
                 .text("out");

        }
        else {
            let textsg = container.select("#current-"+type+"-texts");
            textsg.select("#current-"+type+"-texts-start")
                .attr("x", (container_width*0.1 + x_0_min)/2)
                .attr("y", container_height*  0.95)
                .text("in");
            textsg.select("#current-"+type+"-texts-end")
                .attr("x", (container_width*0.9 + x_0_max)/2)
                .attr("y", container_height*  0.95)
                .text("out");

        }
        let textsg = container.select("#current-"+type+"-texts");

        //create
        rects
            .enter()
            .append("rect")
            .attr("class", "widget-bar-chart")
            .style("fill", "rgb(127, 127, 127)")
            .attr("x", function(d, i) { return x(i); })
            .attr("width", x.bandwidth())
            .attr("y", function(d, i) { return y(d/max_len)-3; })
            .attr("height", function(d) {
                return container_height*  0.7 - y(d/max_len);
            })
            .attr("opacity", (d,i) => Math.abs(i - min_xv)<=0?1:0.5);
        //update
        rects.transition()
            .duration(AnimationDuration)
            .attr("x", function(d, i) { return x(i); })
            .attr("width", x.bandwidth())
            .attr("y", function(d, i) { return y(d/max_len)-3; })
            .attr("height", function(d) {
                return container_height*  0.7 - y(d/max_len);
            })
            .attr("opacity", (d,i) => Math.abs(i - min_xv)<=0?1:0.5);
        //remove
        rects.exit()
            .transition()
            .duration(AnimationDuration)
            .attr("opacity", 0)
            .remove();



        //draw dragble
        let draggable_item_path = "M0 -6 L6 6 L-6 6 Z";
        let start_drag = null;
        let end_drag = null;
        let start_text = null;
        let end_text = null;
        let start_drag_g = null;
        let end_drag_g = null;

        if(container.select(".start-drag").size() === 0){
            start_drag_g = textsg.append("g");
            end_drag_g = textsg.append("g");
            start_drag = start_drag_g.append("path")
                .attr("class", "start-drag")
                .attr("d", draggable_item_path)
                .attr("fill", "rgb(127, 127, 127)");
            start_text = start_drag_g.append("g")
                .attr("class","start-text")
                .attr("opacity", 0);
            start_text.append("path")
                .attr("transform", "translate(0,-5)")
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("d", "M0 0 L 4 -4 L 15 -4 L 15 -20 L -15 -20 L -15 -4 L -4 -4 Z");
            start_text.append("text")
                .attr("x",0)
                .attr("y", -13)
                .attr("text-anchor", "middle")
                .text("in:"+(0));
            start_drag_g.attr("transform", "translate("+(x_0_minband)+","+(container_height*0.75)+")");

            end_drag = end_drag_g.append("path")
                .attr("class", "end-drag")
                .attr("d", draggable_item_path)
                .attr("fill", "rgb(127, 127, 127)");
            end_text = end_drag_g.append("g")
                .attr("class","end-text")
                .attr("opacity", 0);
            end_text.append("path")
                .attr("transform", "translate(0,-5)")
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("d", "M0 0 L 4 -4 L 19 -4 L 19 -20 L -19 -20 L -19 -4 L -4 -4 Z");
            end_text.append("text")
                .attr("x",0)
                .attr("y", -13)
                .attr("text-anchor", "middle")
                .text("out:"+0);
            end_drag_g.attr("transform", "translate("+(x_0_maxband)+","+(container_height*0.75)+")");
        }
        else {
            start_drag = container.select(".start-drag").each(function () {
                start_drag_g = d3.select(this.parentNode);
            });
            end_drag = container.select(".end-drag").each(function () {
                end_drag_g = d3.select(this.parentNode);
            });
            start_text = container.select(".start-text");
            end_text = container.select(".end-text");
            start_text.select("text").text("in:"+(0));
            end_text.select("text").text("out:"+0);
            start_drag_g.transition()
                .duration(AnimationDuration)
                .attr("transform", "translate("+(x_0_minband)+","+(container_height*0.75)+")");
            end_drag_g.transition()
                .duration(AnimationDuration)
                .attr("transform", "translate("+(x_0_maxband)+","+(container_height*0.75)+")");
        }



        container.select("#current-"+type+"-axis-in").select("line").attr("x1", x_0_minband)
            .attr("x2", x_0_maxband);

        start_drag.call(d3.drag()
                    .on("drag", function () {
                        start_text.attr("opacity", 1);
                        end_text.attr("opacity", 1);
                        let x = d3.mouse(container.node())[0];
                        let drag_btn = d3.select(this);
                        let drag_btn_g = d3.select(this.parentNode);
                        let min_x = container_width*0.09;
                        let max_x = -1;
                        let end_pos = end_drag_g.attr("transform").slice(end_drag_g.attr("transform").indexOf("(")+1, end_drag_g.attr("transform").indexOf(","));
                        max_x = parseFloat(end_pos);
                        if((x<=min_x)||(x>=max_x)||(x>=x_0_minband)) return;
                        drag_btn_g.attr("transform", "translate("+(x)+","+(container_height*0.75)+")");
                        container.select("#current-"+type+"-axis-in").select("line").attr("x1", x);
                        container.selectAll("rect").attr("opacity", function (d, i) {
                            let change = false;
                            let rect = d3.select(this);
                            let rect_x = parseFloat(rect.attr("x"));
                            let rect_width = parseFloat(rect.attr("width"));
                            if((rect_x>=x)&&(rect_x+rect_width<=max_x)){
                                // in control
                                if(rect.attr("opacity")!=1)change = true;

                                if(change) {
                                    // if(type === "uncertainty"){
                                    //     that.update_glyph_showing_items();
                                    // }
                                    // else {
                                    //     that.update_widget_showing_items(d);
                                    // }
                                    mrange[0] = i-min_xv;
                                    start_text.select("text").text("in:"+(-mrange[0]));
                                    end_text.select("text").text("out:"+mrange[1]);
                                }
                                return 1
                            }
                            if(rect.attr("opacity")!=0.5)change = true;
                            if(change) {
                                // if(type === "uncertainty"){
                                //     that.update_glyph_showing_items();
                                // }
                                // else {
                                //     that.update_widget_showing_items(d);
                                // }
                                mrange[0] = i+1-min_xv;
                                start_text.select("text").text("in:"+(-mrange[0]));
                                    end_text.select("text").text("out:"+mrange[1]);


                            }
                            return 0.5
                        })
                    }).on("end", function () {
                        start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
                        data_manager.graph_view.set_step_in(-mrange[0]);
                    }));
        end_drag.call(d3.drag()
                    .on("drag", function () {
                        start_text.attr("opacity", 1);
                        end_text.attr("opacity", 1);
                        let x = d3.mouse(container.node())[0];
                        let drag_btn = d3.select(this);
                        let drag_btn_g = d3.select(this.parentNode);
                        let max_x = container_width*0.91;
                        let min_x = -1;
                        let end_pos = start_drag_g.attr("transform").slice(start_drag_g.attr("transform").indexOf("(")+1, start_drag_g.attr("transform").indexOf(","));
                        min_x = parseFloat(end_pos);
                        if((x<=min_x)||(x>=max_x)||(x<=x_0_maxband)) return;
                        drag_btn_g.attr("transform", "translate("+(x)+","+(container_height*0.75)+")");
                        container.select("#current-"+type+"-axis-in").select("line").attr("x2", x);
                        container.selectAll("rect").attr("opacity", function (d, i) {
                            let change = false;
                            let rect = d3.select(this);
                            let rect_x = parseFloat(rect.attr("x"));
                            let rect_width = parseFloat(rect.attr("width"));
                            if((rect_x>=min_x)&&(rect_x+rect_width<=x)){
                                // in control
                                if(rect.attr("opacity")!=1)change = true;
                                if(change) {
                                    // if(type === "uncertainty"){
                                    //     that.update_glyph_showing_items();
                                    // }
                                    // else {
                                    //     that.update_widget_showing_items(d);
                                    // }
                                    mrange[1] = i-min_xv;
                                    start_text.select("text").text("in:"+(-mrange[0]));
                                    end_text.select("text").text("out:"+mrange[1]);

                                }
                                return 1
                            }
                            if(rect.attr("opacity")!=0.5)change = true;
                            if(change) {
                                // if(type === "uncertainty"){
                                //     that.update_glyph_showing_items();
                                // }
                                // else {
                                //     that.update_widget_showing_items(d);
                                // }
                                mrange[1] = i-1-min_xv;
                                start_text.select("text").text("in:"+(-mrange[0]));
                                    end_text.select("text").text("out:"+mrange[1]);
                            }
                            return 0.5
                        })
                    })
                    .on("end", function () {
                        start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
                        data_manager.graph_view.set_step_out(mrange[1]);

                    }));
        start_drag.on("mouseover", function () {
            start_text.attr("opacity", 1);
                        end_text.attr("opacity", 1);
        })
            .on("mouseout", function () {
                start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
            });
        end_drag.on("mouseover", function () {
            start_text.attr("opacity", 1);
                        end_text.attr("opacity", 1);
        })
            .on("mouseout", function () {
                start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
            });
    };

    that.get_visible_items = function() {
        return control_items;
    };

    that.get_glyph_items = function() {
        return Object.keys(uncertain_items).map(d => parseInt(d)).filter(d => uncertain_items[d]===true);;
    };

    that.get_ranges = function() {
        return [uncertainty_widget_range, label_widget_range, indegree_widget_range, outdegree_widget_range, influence_widget_range, edgetype_range, consistency_widget_range, kdegree_widget_range]
    };

    that.draw_edge_influence_widget = function(distribution, container, type, range){
        // distribution
        let max_len = 0;
        let bar_cnt = distribution.length;
        for(let node_ary of distribution){
            if(max_len < node_ary){
                max_len = node_ary;
            }
        }
        // draw
        let container_width = widget_width;
        let container_height = widget_height;
        let x = d3.scaleBand().rangeRound([container_width*0.1, container_width*0.9], .05).paddingInner(0.05).domain(d3.range(bar_cnt));
        let y = d3.scaleLinear().range([container_height*  0.7, container_height*0.05]).domain([0, 1]);
        let drag_interval = x.step();

        //draw bar chart
        if(container.select("#current-"+type+"-rects").size() === 0){
            container.append("g")
                .attr("id", "current-"+type+"-rects");
        }
        let rects = container.select("#current-"+type+"-rects").selectAll("rect").data(distribution);
        // draw x-axis
        if(container.select("#current-"+type+"-axis-in").size() === 0){
            container.append("g")
                .attr("id","current-"+type+"-axis-out")
                .append("line")
                .attr("x1", container_width*0.1)
                .attr("y1", container_height*  0.7)
                .attr("x2", container_width*0.9)
                .attr("y2", container_height*  0.7)
                .attr("stroke", "rgb(227,231,235)")
                .attr("stroke-linecap", "round")
                .attr("transform", "translate(0, 0)")
                .attr("stroke-width", 5);

            container.append("g")
                .attr("id","current-"+type+"-axis-in")
                .append("line")
                .attr("x1", container_width*0.1+range[0]*drag_interval-2)
                .attr("y1", container_height*  0.7)
                .attr("x2", container_width*0.1+(range[1]+1)*drag_interval+2)
                .attr("y2", container_height*  0.7)
                .attr("stroke", "rgb(166,166,166)")
                .attr("stroke-linecap", "round")
                .attr("transform", "translate(0, 0)")
                .attr("stroke-width", 5);
        }

        if(container.select("#current-"+type+"-texts").size() === 0){
             let textsg = container.append("g")
                .attr("id", "current-"+type+"-texts");
             textsg.append("text")
                 .attr("id", "current-"+type+"-texts-start")
                 .attr("x", container_width*0.1-5)
                 .attr("y", container_height*  0.7+10)
                 .attr("text-anchor", "end")
                 .text("0");
             textsg.append("text")
                 .attr("id", "current-"+type+"-texts-end")
                 .attr("x", container_width*0.9+5)
                 .attr("y", container_height*  0.7+10)
                 .attr("text-anchor", "start")
                 .text("1")
        }
        let textsg = container.select("#current-"+type+"-texts");
        //create
        rects
            .enter()
            .append("rect")
            .attr("class", "widget-bar-chart")
            .style("fill", "rgb(127, 127, 127)")
            .attr("x", function(d, i) { return x(i); })
            .attr("width", x.bandwidth())
            .attr("y", function(d, i) {
                let val = d/max_len;
                val = Math.max(val, 0.05);
                val = d===0?d:val;
                return y(val)-3;
            })
            .attr("height", function(d) {
                let val = d/max_len;
                val = Math.max(val, 0.05);
                val = d===0?d:val;
                return container_height*  0.7 - y(val);
            })
            .attr("opacity", (d, i) => (i>=range[0]&&i<=range[1])?1:0.5);
        //update
        rects.transition()
            .duration(AnimationDuration)
            .attr("x", function(d, i) { return x(i); })
            .attr("width", x.bandwidth())
            .attr("y", function(d, i) {
                let val = d/max_len;
                val = Math.max(val, 0.05);
                val = d===0?d:val;
                return y(val)-3;
            })
            .attr("height", function(d) {
                let val = d/max_len;
                val = Math.max(val, 0.05);
                val = d===0?d:val;
                return container_height*  0.7 - y(val);
            })
            .attr("opacity", (d, i) => (i>=range[0]&&i<=range[1])?1:0.5);
        //remove
        rects.exit()
            .transition()
            .duration(AnimationDuration)
            .attr("opacity", 0)
            .remove();

        //draw dragble
        let draggable_item_path = "M0 -6 L6 6 L-6 6 Z";

        let start_drag = null;
        let end_drag = null;
        let start_text = null;
        let end_text = null;
        let start_drag_g = null;
        let end_drag_g = null;
        if(container.select(".start-drag").size() === 0){
            start_drag_g = textsg.append("g");
            end_drag_g = textsg.append("g");
            start_drag = start_drag_g.append("path")
                .attr("class", "start-drag")
                .attr("d", draggable_item_path)
                .attr("fill", "rgb(127, 127, 127)");
            start_text = start_drag_g.append("g")
                .attr("class","start-text")
                .attr("opacity", 0);
            start_text.append("path")
                .attr("transform", "translate(0,-5)")
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("d", "M0 0 L 4 -4 L 15 -4 L 15 -20 L -15 -20 L -15 -4 L -4 -4 Z");
            start_text.append("text")
                .attr("x",0)
                .attr("y", -13)
                .attr("text-anchor", "middle")
                .text(range[0]/20);
            start_drag_g.attr("transform", "translate("+(container_width*0.1+range[0]*drag_interval-2)+","+(container_height*0.75)+")");

            end_drag = end_drag_g.append("path")
                .attr("class", "end-drag")
                .attr("d", draggable_item_path)
                .attr("fill", "rgb(127, 127, 127)");
            end_text = end_drag_g.append("g")
                .attr("class","end-text")
                .attr("opacity", 0);
            end_text.append("path")
                .attr("transform", "translate(0,-5)")
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("d", "M0 0 L 4 -4 L 15 -4 L 15 -20 L -15 -20 L -15 -4 L -4 -4 Z");
            end_text.append("text")
                .attr("x",0)
                .attr("y", -13)
                .attr("text-anchor", "middle")
                .text((range[1]+1)/20);
            end_drag_g.attr("transform", "translate("+(container_width*0.1+(range[1]+1)*drag_interval+2)+","+(container_height*0.75)+")");
        }
        else {
            start_drag = container.select(".start-drag").each(function () {
                start_drag_g = d3.select(this.parentNode);
            });
            end_drag = container.select(".end-drag").each(function () {
                end_drag_g = d3.select(this.parentNode);
            });
            start_text = container.select(".start-text");
            end_text = container.select(".end-text");
            start_text.select("text").text(range[0]/20);
            end_text.select("text").text((range[1]+1)/20);
            start_drag_g.transition()
                .duration(AnimationDuration)
                .attr("transform", "translate("+(container_width*0.1+range[0]*drag_interval-2)+","+(container_height*0.75)+")");
            end_drag_g.transition()
                .duration(AnimationDuration)
                .attr("transform", "translate("+(container_width*0.1+(range[1]+1)*drag_interval+2)+","+(container_height*0.75)+")");
        }
        start_drag.call(d3.drag()
                    .on("drag", function () {
                        start_text.attr("opacity", 1);
                        end_text.attr("opacity", 1);
                        let x = d3.mouse(container.node())[0];
                        let drag_btn = d3.select(this);
                        let drag_btn_g = d3.select(this.parentNode);
                        let min_x = container_width*0.09;
                        let max_x = -1;
                        let end_pos = end_drag_g.attr("transform").slice(end_drag_g.attr("transform").indexOf("(")+1, end_drag_g.attr("transform").indexOf(","));
                        max_x = parseFloat(end_pos);
                        if((x<=min_x)||(x>=max_x)) return;
                        drag_btn_g.attr("transform", "translate("+(x)+","+(container_height*0.75)+")");
                        container.select("#current-"+type+"-axis-in").select("line").attr("x1", x);
                        container.selectAll("rect").attr("opacity", function (d, i) {
                            let change = false;
                            let rect = d3.select(this);
                            let rect_x = parseFloat(rect.attr("x"));
                            let rect_width = parseFloat(rect.attr("width"));
                            if((rect_x>=x)&&(rect_x+rect_width<=max_x)){
                                // in control
                                if(rect.attr("opacity")!=1)change = true;
                                if(change) {

                                    range[0] = i;
                                    // data_manager.update_edge_filter(range[0], range[1]);
                                    start_text.select("text").text(range[0]/20);
                                    end_text.select("text").text((range[1]+1)/20);
                                }
                                return 1
                            }
                            if(rect.attr("opacity")!=0.5)change = true;
                            if(change) {

                                range[0] = i+1;
                                start_text.select("text").text(range[0]/20);
                                    end_text.select("text").text((range[1]+1)/20);
                            }
                            return 0.5
                        })
                    })
                    .on("end", function () {
                        start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
                        data_manager.update_edge_filter(range[0], range[1]);
                    }));
            end_drag.call(d3.drag()
                    .on("drag", function () {
                        start_text.attr("opacity", 1);
                        end_text.attr("opacity", 1);
                        let x = d3.mouse(container.node())[0];
                        let drag_btn = d3.select(this);
                        let drag_btn_g = d3.select(this.parentNode);
                        let max_x = container_width*0.91;
                        let min_x = -1;
                        let end_pos = start_drag_g.attr("transform").slice(start_drag_g.attr("transform").indexOf("(")+1, start_drag_g.attr("transform").indexOf(","));
                        min_x = parseFloat(end_pos);
                        if((x<=min_x)||(x>=max_x)) return;
                        drag_btn_g.attr("transform", "translate("+(x)+","+(container_height*0.75)+")");
                        container.select("#current-"+type+"-axis-in").select("line").attr("x2", x);

                        container.selectAll("rect").attr("opacity", function (d, i) {
                            let change = false;
                            let rect = d3.select(this);
                            let rect_x = parseFloat(rect.attr("x"));
                            let rect_width = parseFloat(rect.attr("width"));
                            if((rect_x>=min_x)&&(rect_x+rect_width<=x)){
                                // in control
                                if(rect.attr("opacity")!=1)change = true;
                                if(change) {
                                    range[1] = i;
                                    start_text.select("text").text(range[0]/20);
                                    end_text.select("text").text((range[1]+1)/20);
                                }
                                return 1
                            }
                            if(rect.attr("opacity")!=0.5)change = true;
                            if(change) {
                                range[1] = i-1;
                                start_text.select("text").text(range[0]/20);
                                    end_text.select("text").text((range[1]+1)/20);
                                // data_manager.update_edge_filter(range[0], range[1]);
                            }
                            return 0.5
                        })
                    })
                    .on("end", function () {
                        start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
                        data_manager.update_edge_filter(range[0], range[1]);
                    }));
            start_drag.on("mouseover", function () {
                start_text.attr("opacity", 1);
                            end_text.attr("opacity", 1);
            })
            .on("mouseout", function () {
                start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
            });
        end_drag.on("mouseover", function () {
            start_text.attr("opacity", 1);
                        end_text.attr("opacity", 1);
        })
            .on("mouseout", function () {
                start_text.attr("opacity", 0);
                        end_text.attr("opacity", 0);
            });
    };

    that.draw_edge_type_widget = function(distribution, container, type, range){
        // distribution
        let types = ["in", "out"];
        let data = [];
        for(let edge_type of types){
            data.push({
                "type":edge_type,
                "cnt":distribution[edge_type],
                "show":range.indexOf(edge_type)>-1
            })
        }
        let max_len = 1;
        let bar_cnt = data.length;
        for(let node_ary of data){
            if(max_len < node_ary.cnt){
                max_len = node_ary.cnt;
            }
        }
        // draw
        let container_width = widget_width;
        let container_height = d3.select("#current-edgetype-widget").node().getBoundingClientRect().height;
        let x = d3.scaleBand().rangeRound([container_width*0.1, container_width*0.9], .05).paddingInner(0.7).paddingOuter(0.7).domain(d3.range(bar_cnt));
        let y = d3.scaleLinear().range([container_height*  0.7, container_height*0.05]).domain([0, 1]);

        //draw bar chart
        if(container.select("#current-"+type+"-rects").size() === 0){
            container.append("g")
                .attr("id", "current-"+type+"-rects");
        }
        let rects = container.select("#current-"+type+"-rects").selectAll("rect").data(data);
        //create
        rects
            .enter()
            .append("rect")
            .attr("class", "widget-bar-chart")
            .style("fill", "rgb(127, 127, 127)")
            .attr("x", function(d, i) { return x(i); })
            .attr("width", x.bandwidth())
            .attr("y", function(d, i) { return y(d.cnt/max_len)-3; })
            .attr("height", function(d) {
                return container_height*  0.62 - y(d.cnt/max_len);
            })
            .attr("opacity", (d, i) => d.show?1:0.2)
            .on("mouseover", function (d, i) {
                let rect = d3.select(this);
                if(rect.attr("opacity") == 1){
                    rect.attr("opacity", 0.5);
                }
            })
            .on("mouseout", function (d, i) {
                let rect = d3.select(this);
                if(rect.attr("opacity") == 0.5){
                    rect.attr("opacity", 1);
                }
            })
            .on("click", function (d, i) {
                let rect = d3.select(this);
                if(rect.attr("opacity") != 0.2){
                    // no select
                    rect.attr("opacity", 0.2);
                    that.set_edge_type_checkbox(edge_type_checkboxes[d.type], false);
                    let index = range.indexOf(d.type);
                    if (index !== -1) range.splice(index, 1);
                }
                else {
                    rect.attr("opacity", 0.5);
                    that.set_edge_type_checkbox(edge_type_checkboxes[d.type], true);
                    let index = range.indexOf(d.type);
                    if (index === -1) range.push(d.type);
                }
                data_manager.update_edge_type_filter(range);
            })
            .each(function (d) {
                let rect = d3.select(this);
                edge_type_rects[d.type] = rect;
            });
        //update
        rects.transition()
            .duration(AnimationDuration)
            .attr("x", function(d, i) { return x(i); })
            .attr("width", x.bandwidth())
            .attr("y", function(d, i) { return y(d.cnt/max_len)-3; })
            .attr("height", function(d) {
                return container_height*  0.62 - y(d.cnt/max_len);
            })
            .attr("opacity", (d, i) => d.show?1:0.2);
        rects.each(function (d) {
                let rect = d3.select(this);
                edge_type_rects[d.type] = rect;
                if(d.show){
                    that.set_edge_type_checkbox(edge_type_checkboxes[d.type], true);
                }
                else {
                    that.set_edge_type_checkbox(edge_type_checkboxes[d.type], false);
                }
            });
        //remove
        rects.exit()
            .transition()
            .duration(AnimationDuration)
            .attr("opacity", 0)
            .remove();

        // draw x-axis
        if(container.select("#current-"+type+"-axis").size() === 0){
            container.append("g")
                .attr("id","current-"+type+"-axis")
                .append("line")
                .attr("x1", container_width*0.1)
                .attr("y1", container_height*  0.62)
                .attr("x2", container_width*0.9)
                .attr("y2", container_height*  0.62)
                .attr("stroke", "black")
                .attr("stroke-width", 1);
        }

        // icons
        for(let type_id of Object.keys(edge_type_checkboxes)){
            let checkbox = edge_type_checkboxes[type_id];
            let rect = edge_type_rects[type_id];
            let d = rect.datum();
            checkbox
                .on("mouseover", function () {
                    if(rect.attr("opacity") == 1){
                        rect.attr("opacity", 0.5);
                    }
                })
                .on("mouseout", function () {
                    if(rect.attr("opacity") == 0.5){
                        rect.attr("opacity", 1);
                    }
                })
                .on("click", function () {
                if(rect.attr("opacity") != 0.2){
                    // no select
                    rect.attr("opacity", 0.2);
                    that.set_edge_type_checkbox(checkbox, false);
                    let index = range.indexOf(d.type);
                    if (index !== -1) range.splice(index, 1);
                }
                else {
                    rect.attr("opacity", 0.5);
                    that.set_edge_type_checkbox(checkbox, true);
                    let index = range.indexOf(d.type);
                    if (index === -1) range.push(d.type);
                }
                data_manager.update_edge_type_filter(range);
            })
            that.set_edge_type_checkbox(checkbox, d.show)
        }
    };

    that.set_edge_type_icon_opacity = function(selection, opacity){
        let path = selection.selectAll("path");
        let polygon = selection.selectAll("polygon");
        path
            .transition()
            .duration(AnimationDuration)
            .attr("opacity", opacity);
        polygon
            .transition()
            .duration(AnimationDuration)
            .attr("opacity", opacity);
    };

    that.set_edge_type_checkbox = function(selection, is_check){
        selection.select("text")
            .style("stroke", is_check?"black":"white")
            .style("fill", is_check?"black":"white");
    };

    that.init = function () {
        that._init();
    }.call();
};