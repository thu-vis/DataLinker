let GraphHighlight = function (parent) {
    let that = this;

    // parent
    let view = null;

    let lasso = null;
    let if_lasso = false;
    let if_select_edge = false;
    let lasso_btn_path = null;
    let fisheye_btn_path = null;
    let zoom_in_path = null;
    let influence_to_btn_path = null;
    let influence_from_btn_path =null;
    let select_edge_btn_path = null;
    let edit_btn_path = null;
    let focus_selection_btn_path = null;
    let lasso_select_path = [];
    let btn_select_color = "#560731";
    let if_focus_selection = false;

    let path_width_scale = 1.75;
    let path_begin_width = 2*path_width_scale;
    let path_end_width = 0.4;
    let path_mid_width = (path_begin_width+path_end_width)/2;
    let show_voronoi_flag = false;
    let show_voronoi_path = null;

    that._init = function () {
        that.set_view(parent);
        lasso = d3.lasso()
            .closePathSelect(true)
            .closePathDistance(100);
        lasso_btn_path = d3.select("#lasso-btn").select("path");
        zoom_in_path = d3.select("#zoomin-btn").selectAll("path");
        influence_from_btn_path = d3.select("#influence-from-btn").select("path");
        influence_to_btn_path = d3.select("#influence-to-btn").select("path");
        edit_btn_path = d3.select("#apply-delete-btn").select("path");
        select_edge_btn_path = d3.select("#select-edge-btn").select("path");
        focus_selection_btn_path = d3.select("#focus-btn").selectAll("path");
        show_voronoi_path = d3.select("#show-voronoi").select("svg").selectAll("*");

        


        $("#lasso-btn")
            .click(function () {
                if_focus_selection = false;
                // that._change_lasso_mode();
                $("#lasso-btn").css("background-color", btn_select_color);
                lasso_btn_path.attr("stroke", "white").attr("fill", "white");
                view.lasso_or_zoom("lasso");
            });

        $("#zoomin-btn")
            .click(function () {
                if_focus_selection = true;
                // that._change_lasso_mode();
                $("#zoomin-btn").css("background-color", btn_select_color);
                zoom_in_path.attr("stroke", "white").attr("fill", "white");
                view.lasso_or_zoom("lasso");
            });

        $("#focus-btn")
            .click(function () {
                // that._change_lasso_mode();
                if(!view.if_focus_selection_box){
                    $("#focus-btn").css("background-color", btn_select_color);
                    focus_selection_btn_path.attr("stroke", "white").attr("fill", "white");
                    view.focus_selection_box();
                }
                else {
                    $("#focus-btn").css("background-color", "white");
                    focus_selection_btn_path.attr("stroke", "black").attr("fill", "black");
                    view.unfocus_selection_box();
                }
            });

        $("#show-voronoi")
        .click(function () {
                // that._change_lasso_mode();
                if(!show_voronoi_flag){
                    $("#show-voronoi").css("background-color", btn_select_color);
                    show_voronoi_path.style("stroke", "white").style("fill", "white");
                    show_voronoi_flag = true
                }
                else {
                    $("#show-voronoi").css("background-color", "white");
                    show_voronoi_path.style("stroke", "black").style("fill", "black");
                    show_voronoi_flag = false
                }
                view.if_show_voronoi(show_voronoi_flag);
            });


        $("#home-btn")
            .click(function () {
                view.data_manager.graph_home();
            });

        $("#refresh-btn")
            .click(function () {
                d3.select("#refresh-btn").select("use").attr("xlink:href", "#animate-update-icon");
                view.data_manager.eval_edit_info();
            });


        $("#select-edge-btn")
        .click(function () {
                that._change_edge_select_mode();
            });

        $("#remove-nodes")
            .click(function () {
                view.remove_nodes();
            });

        that.add_btn_style();
    };

    that.reset_selection = function(){
        if(!if_focus_selection){
            $("#lasso-btn").css("background-color", "white");
            lasso_btn_path.attr("stroke", "black").attr("fill", "black");
            view.lasso_or_zoom("zoom");
        }
        else {
            $("#zoomin-btn").css("background-color", "white");
            zoom_in_path.attr("stroke", "black").attr("fill", "black");
            view.lasso_or_zoom("zoom");
        }
    };

    that.add_btn_style = function() {
        let btn_ids = ["apply-delete-btn", "lasso-btn", "fisheye-btn", "home-btn", "refresh-btn", "influence-to-btn", "influence-from-btn",
            "select-edge-btn", "loaddataset-button", "setk-button", "localk-button", "focus-btn", "remove-nodes", "show-voronoi", "zoomin-btn", "zoomout-btn"];
        for(let btn_id of btn_ids){
            let select_id = "#"+btn_id;
            let path = d3.select(select_id).selectAll("path");
            let polygon = d3.select(select_id).selectAll("polygon");
            let line = d3.select(select_id).select("svg").selectAll("*");
            $(select_id)
            .on("mouseover", function () {
            if (d3.select(select_id).style("background-color") === "rgba(0, 0, 0, 0)"
                || d3.select(select_id).style("background-color") === "white"
                || d3.select(select_id).style("background-color") === "rgb(255, 255, 255)") {
                d3.select(select_id).style("background", "gray");
                path.attr("stroke", "white").attr("fill", "white");
                polygon.attr("stroke", "white").attr("fill", "white");
                if(select_id === "#show-voronoi")
                    line.style("stroke", "white").style("fill", "white");
            }
        })
            .on("mousemove", function () {
            if (d3.select(select_id).style("background-color") === "rgba(0, 0, 0, 0)"
                || d3.select(select_id).style("background-color") === "white"
                || d3.select(select_id).style("background-color") === "rgb(255, 255, 255)") {
                d3.select(select_id).style("background", "gray");
                path.attr("stroke", "white").attr("fill", "white");
                polygon.attr("stroke", "white").attr("fill", "white");
                if(select_id === "#show-voronoi")
                    line.style("stroke", "white").style("fill", "white");
            }
        })
            .on("mouseout", function () {
            if (d3.select(select_id).style("background-color") === "gray") {
                d3.select(select_id).style("background", "white");
                path.attr("stroke", "black").attr("fill", "black");
                polygon.attr("stroke", "black").attr("fill", "black");
                if(select_id === "#show-voronoi")
                    line.style("stroke", "black").style("fill", "black");
            }
        });
        }

    };

    that.set_view = function (new_parent) {
        view = new_parent;
    };

    that.set_lasso = function() {
        view.svg.select(".lasso").remove();
        lasso.items(view.get_nodes_in_group())
            .targetArea(view.svg)
            .on("start", that.lasso_start)
            .on("draw", that.lasso_draw)
            .on("end", that.lasso_end);
        view.svg.call(lasso);
    };

    that.remove_lasso = function() {
        view.svg.on(".dragstart", null);
        view.svg.on(".drag", null);
        view.svg.on(".dragend", null);
        view.svg.select(".lasso").remove();
    };

    that.lasso_start = function () {
        lasso_select_path = [];
        lasso.items()
            .attr("r", d => view.r(d.id)) // reset size
            .classed("not_possible", true)
            .classed("selected", false);
    };

    that.lasso_draw = function () {
        let path_node = d3.mouse(view.main_group.node());
        lasso_select_path.push({x:path_node[0], y:path_node[1]});
        // Style the possible dots
        lasso.possibleItems()
            .classed("not_possible", false)
            .classed("possible", true)
            .attr("r", 5 * view.zoom_scale);
        //
        // // Style the not possible dot
        lasso.notPossibleItems()
            .classed("not_possible", true)
            .classed("possible", false)
            .attr("r", d => view.r(d.id));

    };

    that.lasso_end =async function () {
        function distance(x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x1-x2, 2)+ Math.pow(y1-y2, 2));
        }
        function convexHull (arr) {
            //
            let hull_generator = new ConvexHullGrahamScan();
            for(let a of arr) {
                hull_generator.addPoint(a.x, a.y);
            }
            return hull_generator.getHull().map(d => [d.x, d.y]);

            //
                const n = arr.length;
                // There must be at least 3 points
                if(n < 3) {
                    return arr;
                }
                const hull = [];
                let l = 0;
                for(let i = 0; i < n; i++) {
                    if(arr[i].x < arr[l].x) {
                        l = i;
                    }
                }

                let p = l, q;
                do{
                    hull.push(arr[p]);
                    q = (p + 1) % n;
                    for(let i = 0; i < n; i++) {
                        if(orientation(arr[p], arr[i], arr[q]) === 2) {
                            q = i;
                        }
                    }
                    p = q;
                }while(p !== l);
                return hull;

            }
        function orientation (p, q, r) {
            const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
            if(val === 0) {
                return 0;
            }
            return (val > 0) ? 1 : 2;
        }
        function get_area(d, h, k, tao, convex_hull, return_max_s = false) {
            let F1 = {
                x:h-d/2*Math.cos(tao),
                y:k-d/2*Math.sin(tao)
            };
            let F2 = {
                x:h+d/2*Math.cos(tao),
                y:k+d/2*Math.sin(tao)
            };
            let max_s= 0;
            for(let node of convex_hull){
                //let s = distance(node.x, node.y, F1.x, F1.y) + distance(node.x, node.y, F2.x, F2.y);
                max_s = Math.max(max_s, distance(node[0], node[1], F1.x, F1.y) + distance(node[0], node[1], F2.x, F2.y))
            }
            if(return_max_s) return {
                area:Math.PI*max_s/4*Math.sqrt(max_s*max_s-d*d),
                s: max_s,
                F1:F1,
                F2:F2
            };
            return Math.PI*max_s/4*Math.sqrt(max_s*max_s-d*d);
        }
        function get_mid(min_d, max_d) {
            return min_d + (3-Math.sqrt(5))/2*(max_d-min_d);
        }
        function ellipse(path) {
            let convexhull = convexHull(path);
            console.log("find convex hull", convexhull);

            // step 1: find h,k, tao
            let node_a, node_b;
            let max_dis = 0;
            for(let u of path){
                for(let v of path){
                    let dis = distance(u.x, u.y, v.x, v.y);
                    if(dis > max_dis) {
                        max_dis = dis;
                        node_a = u;
                        node_b = v;
                    }
                }
            }
            let h = (node_a.x+node_b.x)/2;
            let k = (node_a.y+node_b.y)/2;
            let tao = Math.PI/2;
            if(node_a.x!==node_b.x) tao = Math.atan((node_a.y-node_b.y)/(node_a.x-node_b.x));
            // step 2: d
            let min_d = 0;
            let max_d = 0;
            for(let node of path){
                max_d = Math.max(max_d, 2*distance(node.x, node.y, h, k));
            }
            let mid_d = get_mid(min_d, max_d);
            let min_d_area = get_area(min_d, h, k, tao, convexhull);
            let max_d_area = get_area(max_d, h, k, tao, convexhull);
            let mid_d_area = get_area(mid_d, h, k, tao, convexhull);
            while (true){
                console.log(min_d, mid_d, max_d);
                let new_mid_d = get_mid(mid_d, max_d);
                let new_mid_area = get_area(new_mid_d, h, k, tao, convexhull);
                if(new_mid_area < mid_d_area){
                    min_d = mid_d;
                    min_d_area = mid_d_area;
                    mid_d = new_mid_d;
                    mid_d_area = new_mid_area;
                }
                else {
                    max_d = new_mid_d;
                    max_d_area = new_mid_area;
                    mid_d = get_mid(min_d, max_d);
                    mid_d_area = get_area(mid_d, h, k, tao, convexhull)
                }
                if(max_d-min_d < 1e-4) break;
            }
            let min_res = get_area(mid_d, h, k, tao, convexhull, true);
            let s = min_res.s * 1;
            let rx = s/2;
            let ry = Math.sqrt(s*s-mid_d*mid_d)/2;
            console.log(min_res);
            return {
                cx:h,
                cy:k,
                rx:rx,
                ry:ry,
                s:s,
                F1:min_res.F1,
                F2:min_res.F2,
                d:mid_d,
                tao:tao
            }
        }

        let path_node = d3.mouse(view.main_group.node());
        lasso_select_path.push({x:path_node[0], y:path_node[1]});
        lasso.items()
            .classed("not_possible", false)
            .classed("possible", false);

        let lasso_paths = lasso.selectedItems().data().map(function (d) {
                return {x:view.center_scale_x(d.x), y:view.center_scale_y(d.y)}
        });
        // let lasso_paths = lasso_select_path;
        console.log(lasso_paths);
        if(lasso_paths.length === 0) return ;
        // zoom in
        if(if_focus_selection){
            let new_area = {};
            let min_x = 10000;
            let min_y = 10000;
            let max_x = -10000;
            let max_y = -10000;
            for(let node of lasso.selectedItems().data()) {
                min_x = Math.min(min_x, node.x);
                max_x = Math.max(max_x, node.x);
                min_y = Math.min(min_y, node.y);
                max_y = Math.max(max_y, node.y);
            }
            let width = max_x - min_x;
            let height = max_y - min_y;
            let new_wh = width/height;
            let wh = view.width/view.height;
            if(wh > new_wh){
                    min_x -= (height * wh - width) / 2;
                    max_x += (height * wh - width) / 2;
                    min_x = min_x;
                    width = max_x - min_x;
            }
            else if(wh < new_wh){
                    min_y -= (width / wh - height) / 2;
                    max_y += (width / wh - height) / 2;
                    min_y = min_y;
                    height = max_y - min_y;
            }
            min_x -= width * 0.5;
            min_y -= height * 0.5;
            width *= 2;
            height *= 2;
            new_area = {
                x:min_x,
                y:min_y,
                width:width,
                height:height
            };
            view.zoom_into_area(new_area);
            // view._center_tsne(view.data_manager.state.nodes);
            // lasso_paths = lasso.selectedItems().data().map(function (d) {
            //         return {x:view.center_scale_x(d.x), y:view.center_scale_y(d.y)}
            // });
            view.data_manager.state.rescale = false;
            await view.data_manager.update_graph_view(false);
            that.reset_selection();
            return ;
        }
        let ellipse_path = ellipse(lasso_paths);
        view.selection_box.push({
            "x": ellipse_path.cx,
            "y": ellipse_path.cy,
            "rx":ellipse_path.rx,
            "ry":ellipse_path.ry,
            "tao":ellipse_path.tao,
            "F1":ellipse_path.F1,
            "F2":ellipse_path.F2,
            "s":ellipse_path.s,
            "d":ellipse_path.d,
            "id": view.selection_box_id_count
        });
        view.selection_box_id_count += 1;

        view._create_selection_box();
        view._update_selection_box();
        await view.show_edges();
        that.reset_selection();
    };


    // highlight change
    that.highlight_changes = function(){

    };

    // dehighlight change
    that.dehighlight_change = function(){

    };

    that.highlight = function(nodes, select_ids) {
        console.log("Highlight nodes:", select_ids);
        // if(select_ids.length<20)
            view.data_manager.update_image_view(select_ids); // TODO: disable by changjian
        //first check if all select_id are in nodes
        let all_load = true;
        let new_ids = [];
        for(let id of select_ids){
            if(nodes[id] === undefined){
                new_ids.push(id);
                all_load = false;
            }
        }
        if(all_load === true){
            view.data_manager.show_highlight_node(select_ids);
            // if(select_ids.length){                
            //     view.data_manager.get_selected_flows(select_ids);
            // } // TODO: disabled by changjian
        }
        else {
            view.fetch_points(select_ids, new_ids, "highlight", select_ids);
        }
    };

    that.highlight_pure = function(){

    };


    that._change_lasso_mode = function () {
        if (if_lasso) {
            if_lasso = false;
            $("#lasso-btn").css("background-color", "gray");
            lasso_btn_path.attr("stroke", "white").attr("fill", "white");
            view.lasso_or_zoom("zoom")
        } else {
            if_lasso = true;
            $("#lasso-btn").css("background-color", btn_select_color);
            lasso_btn_path.attr("stroke", "white").attr("fill", "white");
            view.lasso_or_zoom("lasso");
        }
    };

    that._change_edge_select_mode = function () {
        if (if_select_edge) {
            if_select_edge = false;
            $("#select-edge-btn").css("background-color", "gray");
            select_edge_btn_path.attr("stroke", "white").attr("fill", "white");
            view.lasso_or_zoom("zoom")
        } else {
            if_select_edge = true;
            $("#select-edge-btn").css("background-color", btn_select_color);
            select_edge_btn_path.attr("stroke", "white").attr("fill", "white");
            view.lasso_or_zoom("edge-select");
        }
    };

    that.if_lasso = function() {
        return if_lasso;
    };

    that._line_line_intersect = function(line1, line2) {
        function btwn(a, b1, b2) {
          if ((a >= b1) && (a <= b2)) { return true; }
          if ((a >= b2) && (a <= b1)) { return true; }
          return false;
        }
      var x1 = line1.x1, x2 = line1.x2, x3 = line2.x1, x4 = line2.x2;
      var y1 = line1.y1, y2 = line1.y2, y3 = line2.y1, y4 = line2.y2;
      var pt_denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      var pt_x_num = (x1*y2 - y1*x2) * (x3 - x4) - (x1 - x2) * (x3*y4 - y3*x4);
      var pt_y_num = (x1*y2 - y1*x2) * (y3 - y4) - (y1 - y2) * (x3*y4 - y3*x4);
      if (pt_denom == 0) { return "parallel"; }
      else {
        var pt = {'x': pt_x_num / pt_denom, 'y': pt_y_num / pt_denom};
        if (btwn(pt.x, x1, x2) && btwn(pt.y, y1, y2) && btwn(pt.x, x3, x4) && btwn(pt.y, y3, y4)) { return pt; }
        else { return "not in range"; }
      }
    };

    that._path_line_intersections = function(path_d3, line) {

      let pts = [];
      let pathEl = path_d3.node();
      let pathLength = pathEl.getTotalLength();
      let n_segments = Math.round(pathLength/5);
      for (var i=0; i<n_segments; i++) {
        var pos1 = pathEl.getPointAtLength(pathLength * i / n_segments);
        var pos2 = pathEl.getPointAtLength(pathLength * (i+1) / n_segments);
        var line1 = {x1: pos1.x, x2: pos2.x, y1: pos1.y, y2: pos2.y};
        let begin = line.node().getPointAtLength(0);
        let end = line.node().getPointAtLength(line.node().getTotalLength()-1);
        var line2 = {x1: begin.x, x2: end.x,
                     y1: begin.y, y2: end.y};
        var pt = that._line_line_intersect(line1, line2);
        if (typeof(pt) != "string") {
          pts.push(pt);
          return true
        }
      }
      return false;

    };

    that.set_select_edge = function (){
        function draw_line(selection) {
            let xy0,
            path,
            keep = false,
            line = d3.line()
                     .x(function(d){ return d[0]; })
                     .y(function(d){ return d[1]; });

        selection
            .on('mousedown', function(){
                view.main_group.select("#select-edge_path").remove();
                 view.remove_path_highlight();
                keep = true;
                xy0 = d3.mouse(view.main_group.node());
                path = view.main_group
                         .append('path')
                         .attr("id", "select-edge_path")
                         .attr('d', line([xy0, xy0]))
                        .attr("stroke", "black")
                        .attr("stroke-width", view.zoom_scale);
                view.data_manager.edit_view.update_click_menu($('#graph-view-svg'), "edges");
            })
            .on('mouseup', function(){
                keep = false;
                let paths = d3.selectAll(".propagation-path");
                let line = view.main_group.select("#select-edge_path");
                let highlight_paths = [];
                paths.each(function () {
                    let path = d3.select(this);
                    if(that._path_line_intersections(path, line)){
                        highlight_paths.push(path);

                    }
                });
                let path_keys = [];
                view.main_group.select("#select-edge_path").remove();
                for(let path of highlight_paths){
                    let key = path.datum();
                    path_keys.push([key[0], key[1]]);
                }
                if(path_keys.length === 0){
                    view.data_manager.edit_view.remove_menu($("#graph-view-svg"))
                }
                else {
                    view.highlight_paths(path_keys.map(d => d[0].id+","+d[1].id));
                }
                view.data_manager.update_edit_state(path_keys, "delete edge");
                console.log("find paths:", path_keys)
            })
            .on('mousemove', function(){
                if (keep) {
                    Line = line([xy0, d3.mouse(view.main_group.node()).map(function(x){ return x - 1; })]);
                    path.attr('d', Line);
                }
            });
        }
        view.svg.call(draw_line);
    };

    that.remove_select_edge = function() {
        view.main_group.select("#select-edge_path").remove();
        view.svg.on('mousedown', null);
        view.svg.on('mouseup', null);
        view.svg.on('mousemove', null);
    };

    that.init = function () {
        that._init();
    }.call();
};