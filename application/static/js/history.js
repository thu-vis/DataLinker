
let HistoryLayout = function (container) {
    let that = this;
    that.container = container;

    let bbox = that.container.node().getBoundingClientRect();
    let width = bbox.width;
    let height = bbox.height;
    let margin_horizontal = 5;
    let layout_width = width - margin_horizontal * 2;
    let layout_height = height * 0.8;
    let max_height = 500;
    let title_height = 30;
    let action_id_center = layout_width * 0.13;
    let cell_center = layout_width * 0.5;
    let text_center = layout_width * 0.77;
    let cell_height = 60;
    let cell_width = layout_width;
    let action_width = 30;
    let dist_start = cell_center - layout_width * 0.2 + action_width+60;
    let action_begin = cell_center - layout_width * 0.2;
    let dist_width = layout_width * 0.05;
    let data_manager = null;
    let legend_height = 70;
    let gray_color = "#A9A9A9";
    let AnimationDuration = 500;
    let create_ani = AnimationDuration;
    let update_ani = AnimationDuration;
    let remove_ani = AnimationDuration * 0;
    let action_type_size = 20;
    let action_type_orders = {
        "labeling":0,
        "local-update":1,
        "remove-edge":2,
        "remove-node":3

    };

    that.svg = container.select("#history-view").select("svg");
    that.line_group = that.svg.append("g").attr("id", "line");
    that.cell_group = that.svg.append("g").attr("id", "cell");
    that.legend_group = that.svg.append("g").attr("id", "legend");

    let node_color = "rgb(127,127,127)";

    that._init = function () {
        container.select("#history-view")
            .style("height", (height * 0.80)+"px");
        that.svg.attr("width", width)
            .attr("height", layout_height);
        that.line_group.attr("transform", "translate(" + margin_horizontal + ", " + 0 + ")");
        that.cell_group.attr("transform", "translate(" + margin_horizontal + ", " + 0 + ")");
        that.legend_group.attr("transform", "translate(" + margin_horizontal + ", " + 0 + ")");

        // let legend = ["# edge changes", "# added labels", "# added instances", "# label changes"];
        let legend = [];
        that.legend_group.selectAll("text.legend")
            .data(legend)
            .enter()
            .append("text")
            .attr("class", "legend")
            .attr("text-anchor", "start")
            .attr("font-size", "12px")
            .attr("x", 0)
            .attr("y", 0)
            .attr("transform", function(d, i){
                return "translate(" + (dist_start + (i + 0.5) * dist_width)
                    + ", " + 8 + ") rotate(30)";
            })
            .style("opacity", 0)
            .text(d => d)
            // .each(function () {
            //     let legend = d3.select(this);
            //     set_font(legend);
            // });
    };

    that.set_data_manager = function(new_data_manager) {
        data_manager = new_data_manager;
    };

    that.component_update = function(state) {
        that._update_data(state.history_data);
        that._update_view();
    };

    that._update_data = function(data) {
        // history data
        that.history_data = data.history.reverse();
        for(let one_history of that.history_data){
            one_history.actions.sort(function (a, b) {
                return action_type_orders[a] - action_type_orders[b]
            })
        }
        for (let i = 0; i < that.history_data.length; i++){
            let hdata = that.history_data[i];
            hdata.height = [];
            for (let j = 0; j < hdata.dist.length; j++){
                let rect_height = hdata.dist[j] * cell_height * 0.8;
                hdata.height.push(rect_height === 0 ? 1 : rect_height);
            }
        }
        // focus data
        that.focus_id = data.current_id;
        // legend height
        that.legend_height = that.history_data.length * cell_height;
        // line data
        that.line_data = [];
        let cnt = that.history_data.length;
        for(let row_idx = 0; row_idx < cnt; row_idx++){
            let row_data = that.history_data[row_idx];
            let end_idx = row_data.id;
            let end_point = {
                x: action_id_center,
                y: (cnt - end_idx - 0.5) * cell_height 
            };
            for(let start_idx of row_data.children){
                let start_point = {
                    x: action_id_center,
                    y: (cnt - start_idx - 0.5) * cell_height
                };
                let d = null;
                if ((start_idx - end_idx) == 1){
                    d = change_straight(start_point, end_point);
                }
                else{
                    d = change_path(start_point, end_point, 30, 40);
                }
                that.line_data.push({
                    "path": d,
                    "id": start_idx + "-" + end_idx
                });
            }
        }

        if (cnt * cell_height + legend_height > layout_height){
            that.svg.attr("height", cnt * cell_height + legend_height);
        }
    };

    that._update_view = function() {
        that._create();
        that._update();
        that._remove();
    };

    that._create = function(){
        // create cells
        console.log("history_data", that.history_data);
        that.cells = that.cell_group.selectAll("g.cell")
            .data(that.history_data, d => d.id);
        let cells = that.cells
            .enter()
            .append("g")
            .attr("class", "cell")
            .attr("id", d => "id-" + d.id)
            .attr("transform", 
                (_,i) => "translate(" + 0 + ", " + i * cell_height + ")")
            .style("opacity", 0);
        cells
            .on("mouseover", that.highlight)
            .on("mouseout", that.delighlight)
            .transition()
            .duration(create_ani)
            .delay(remove_ani + update_ani)
            .style("opacity", 1);
        cells.append("rect")
            .attr("class", "background")
            .attr("x", 0)
            .attr("y", 1)
            .attr("width", cell_width)
            .attr("height", cell_height - 1)
            .style("fill", "white")
            .style("fill-opacity", 0)
            .on("click", function(d){
                data_manager.highlight_nodes(d.change_idx);
            });
        cells.append("circle")
            .attr("class", "action-circle")
            .attr("cx", action_id_center)
            .attr("cy", cell_height * 0.5)
            .attr("r", 10)
            .style("fill", d => d.id === that.focus_id ? 
                "rgb(127, 127, 127)" : "rgb(222, 222, 222)");

        let history = cells.append("g")
            .attr("class", "action-type-g");
        history.selectAll("use")
            .data(function (d) {
                return  d.actions.map(function (one) {
                    return {
                        "action":one,
                        "all":d.actions.length
                    }
                });
            })
            .enter()
            .append("use")
            .attr("xlink:href", d => "#action-"+d.action)
            .attr("x", function (d, i) {
                let all = d.all;
                return action_begin+20+action_type_size/2-(action_type_size+5)/2*all+(action_type_size+5)*i;
            })
            .attr("y", function (d) {
                return cell_height - 30;
            })
            .attr("width", action_type_size)
            .attr("height", action_type_size);

            
        cells.append("text")
            .attr("class", "action-id")
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("x", action_id_center)
            .attr("y", cell_height * 0.5 + 4.5)
            .text(d => d.id);
        cells.append("rect")
            .attr("class", ".bottom-line")
            .attr("x", action_id_center + margin_horizontal)
            .attr("y", cell_height)
            .attr("width", cell_width - action_id_center - margin_horizontal * 6)
            .attr("height", 1)
            .style("fill", "rgb(222,222,222)");
        cells.selectAll("rect.change")
            .data(d=>d.height)
            .enter()
            .append("rect")
            .attr("class", "change")
            .attr("x", (_,i) => dist_start + (i+1) * dist_width)
            .attr("y", d => cell_height - d)
            .attr("width", dist_width * 0.95)
            .attr("height", d => d)
            .style("fill", node_color);
        cells.selectAll("text.text-change")
            .data(d => zip([d.unnorm_dist, d.height]))
            .enter()
            .append("text")
            .attr("class", "text-change")
            .attr("text-anchor", "middle")
            .attr("x", (_,i) => dist_start + (i+1 + 0.5) * dist_width)
            .attr("y", d => cell_height - d[1] - 1)
            .attr("font-size", "12px")
            .text(d => d[0])
            // .each(function () {
            //     let text = d3.select(this);
            //     set_font(text);
            // });
        cells.append("text")
            .attr("font-family", '"Helvetica Neue", Helvetica, Arial, sans-serif')
            .attr("font-size", "12px")
            .attr("font-weight", 700)
            .attr("fill", "#333333")
            .attr("text-anchor", "start")
            .attr("x", text_center)
            .attr("y", cell_height * 0.5 + 4.5)
            .attr("text-anchor", "start")
            .text(d => d.margin);

        let icon_g = that.cells.append("g")
            .attr("class", "reset-icon")
            .attr("transform", "translate(" + (text_center + 40) + ", " + (cell_height * 0.5 - 8) + ")")
            .on("click", function(d){
                that.focus_id = d.id;
                data_manager.set_history(that.focus_id);
                that._update();
            });
        
        icon_g.append("rect")
            .attr("x", 2)
            .attr("y", 2)
            .attr("width", 15)
            .attr("height", 15)
            .style("fill", "white")
            .style("fill-opacity", 0);
        icon_g
            .append("path")
            .attr("d", "M9.354 1.646a.5.5 0 00-.708 0l-2.5 2.5a.5.5 0 000 .708l2.5 2.5a.5.5 0 10.708-.708L7.207 4.5l2.147-2.146a.5.5 0 000-.708z")
            .attr("fill", "gray");
        icon_g
            .append("path")
            .attr("d", "M10 4.5A5.5 5.5 0 114.5 10a.5.5 0 00-1 0 6.5 6.5 0 103.25-5.63l.5.865A5.472 5.472 0 0110 4.5z")
            .attr("fill", "gray");

        // //draw line
        that.lines = that.line_group.selectAll("path")
            .data(that.line_data, d => d.id);
        that.lines
            .enter()
            .append("path")
            .attr("stroke-width", 2.0)
            .attr("fill-opacity", 0)
            .attr("stroke", node_color)
            .style("stroke", "rgb(222, 222, 222)")
            .attr("d", d => d.path)
            .style("opacity", 0)
            .transition()
            .duration(create_ani)
            .delay(remove_ani + update_ani)
            .style("opacity", 1);
    };

    that._update =  function() {
        // update cells
        that.cells
            .transition()
            .duration(update_ani)
            .delay(remove_ani)
            .attr("transform", (_,i) => "translate(" + 0 + ", " + i * cell_height + ")");
        that.cells.select("circle")
            .style("fill", d => d.id === that.focus_id ?
                "rgb(127, 127, 127)" : "rgb(222, 222, 222)");

        // update lines
        that.lines
            .transition()
            .duration(update_ani)
            .delay(remove_ani)
            .attr("d",d => d.path)

        that.legend_group.selectAll("text.legend")
            .transition()
            .duration(update_ani)
            .delay(remove_ani)
            .attr("transform", function(d, i){
                return "translate(" + (dist_start + (i+1.5 + 0.5) * dist_width )
                    + ", " + (that.legend_height + 8) + ") rotate(30)";
            })
            .style("opacity", 1);

        let new_height = Math.min(that.legend_height + 78, max_height);
        that.svg.attr("height", that.legend_height + 78);
        $("#history-view").css("height", new_height+"px");
        $("#history-row").css("height", (new_height+83)+"px");
        $("#history-row .content-container").css("height", (new_height+40)+"px");
        let image_height = 500+440-new_height;
        $(".info-svg-div").css("height", image_height+"px");
        $("#image-row .content-container").css("height", (image_height+30)+"px");

        
    };

    that._remove = function() {
        // remove cells
        that.cells
            .exit()
            .remove();

        // remove lines
        that.lines
        .exit()
        .remove();

    };

    that.highlight = function(d){
        console.log("highlight in History view");
        that.cell_group.select("#id-" + d.id)
            .select("rect.background")
            .style("fill-opacity", 0.1)
            .style("fill", "gray");
    };

    that.delighlight = function(){
        console.log("dehighlight in History view");
        that.svg.selectAll("g.cell")
            .select("rect.background")
            .style("fill-opacity", 0);
    };

    that.init = function () {
        that._init();
    }.call();
};