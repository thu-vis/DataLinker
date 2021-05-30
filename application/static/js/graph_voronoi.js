// Created by Changjian, 20200406

let GraphVoronoi = function(parent){
    let that = this;

    // parent
    let view = null;

    // group
    that.voronoi_group = null;
    that.voronoi_in_group = null;
    that.boundary_in_group = null;
    that.boundary_group = null;
    that.sub_bar_group = null;

    
    // data
    let color_unlabel = UnlabeledColor;
    let color_label = CategoryColor;
    that.voronoi_data = {"edges": [], "cells": []};
    let AnimationDuration = 300;
    let create_ani = AnimationDuration;
    let update_ani = AnimationDuration;
    let remove_ani = AnimationDuration * 0.1;
    let class_cnt = null;
    let small_inner_bounder = null;
    let large_inner_bounder = null;
    let outer_bounder = null;
    that.cell_data = [];
    that.boundarys = [];
    that.max_num = 10;


    // flag
    // that.show_voronoi = false;
    that.simple_bar = false;
    that.drag_activated = false;
    that.drag_node = null;
    that.second_drag_node = null;
    that.comparison_flag = false;

    // function
    // scale_function = function(x){
    //     if (x < 0.15) x /= 4;
    //     if (x > 0.2 && x < 0.5) { x = x * 2;}
    //     return Math.pow(x, 0.4);
    // }

    // scale_function = function(x, simple_bar){
    //     if (DataName === "stl"){
    //         if (simple_bar){
    //             if (x < 0.127) x /= 2.5;
    //             if (x > 0.8) {
    //                 if(x > 0.859 && (x < 0.8749 || x > 0.875)) x *= 1.7;
    //             }
    //         }
    //         else{
    //             if (x < 0.05) x /= 4;
    //         }
    //         if (x > 0.2 && x < 0.5) { x = x * 2;}
    //         else if (x > 0.18) {x = x + 0.1;}
    //         return Math.pow(x, 0.4);
    //     }
    //     else{
    //         if (x > 1) x = x * 1.8;
    //         if (x > 0.01 && x < 0.5) x = x * 4;
    //         // if (x > 1) x = 1;
    //         return Math.pow(x, 0.4);
    //     }
    // };

     scale_function = function(x, simple_bar){
        if (DataName === "stl"){
            if (simple_bar){
                if (x < 0.127 && (Math.abs(x - 0.125)>0.001)) x /= 2.5;
                if (x > 0.8) {
                    if(x > 0.859 && (x < 0.8749 || x > 0.875)) x *= 1.7;
                }
            }
            else{
                if (x < 0.05) x /= 4;
            }
            if (x > 0.2 && x < 0.5) { x = x * 2;}
            else if (x > 0.18) {x = x + 0.1;}
            return Math.pow(x, 0.4);
        }
        else{
            if (x > 0.99) x = x * 1.8;
            if (x > 0.01 && x < 0.5) x = x * 4;
            // if (x > 1) x = 1;
            return Math.pow(x, 0.4);
        }
    };



    that._init = function(){
        that.set_view(parent);
    };

    that.set_view = function (new_parent) {
        view = new_parent;
        that.voronoi_group = view.voronoi_group;
        that.boundary_group = view.voronoi_group.append("g").attr("class", "boundary-g");
    };

    that.convexity = function (paths, nodes) {
        // convex
        function orientation (p, q, r) {
            const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
            if(val === 0) {
                return 0;
            }
            return (val > 0) ? 1 : 2;
        }
        function convexHull (arr) {
            //
            let hull_generator = new ConvexHullGrahamScan();
            for(let a of arr) {
                hull_generator.addPoint(a[0], a[1]);
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
                    if(arr[i][0] < arr[l][0]) {
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
        function perimeter(arr) {
            let dis = 0;
            for(let i=0; i<arr.length; i++) {
                dis += Math.sqrt(Math.pow(arr[i][0] - arr[(i+1)%arr.length][0], 2) + Math.pow(arr[i][1] - arr[(i+1)%arr.length][1], 2))
            }
            return dis;
        }
        let convexhull = convexHull(paths);
        return perimeter(paths) / perimeter(convexhull);

        // vertex
        let line_inter_line = function(ps1, pe1, ps2, pe2) {
                        // Get A,B of first line - points : ps1 to pe1
                        let A1 = pe1[1]-ps1[1];
                        let B1 = ps1[0]-pe1[0];
                        // Get A,B of second line - points : ps2 to pe2
                        let A2 = pe2[1]-ps2[1];
                        let B2 = ps2[0]-pe2[0];

                        // Get delta and check if the lines are parallel
                        let delta = A1*B2 - A2*B1;
                        if(delta == 0) return null;

                        // Get C of first and second lines
                        let C2 = A2*ps2[0]+B2*ps2[1];
                        let C1 = A1*ps1[0]+B1*ps1[1];
                        //invert delta to make division cheaper
                        let invdelta = 1/delta;
                        // now return the Vector2 intersection point
                        let res = {
                            x:(B2*C1 - B1*C2)*invdelta,
                            y: (A1*C2 - A2*C1)*invdelta
                        };
                        if(((res.x-ps1[0])*(res.x-pe1[0]) > 0 && Math.abs((res.x-ps1[0])*(res.x-pe1[0])) > 1e-3) || ((res.x-ps2[0])*(res.x-pe2[0]) > 0 && Math.abs((res.x-ps2[0])*(res.x-pe2[0])) > 1e-3)) {
                            return null;
                        }
                        return res;
                    };
        let in_nodes = nodes.filter(d => view.if_in_cell(d, paths, true));
        if(in_nodes.length === 0) {
            console.log("No nodes in this cell");
            return 0;
        }
        let convex_cnt = 0;
        let all_cnt = Math.pow(in_nodes.length, 2);
        for(let u of in_nodes) {
            for(let v of in_nodes) {
                if(u === v) {
                    convex_cnt++;
                    continue
                }
                let intersect = false;
                for(let i=0; i<paths.length; i++) {
                    if(line_inter_line([view.center_scale_x(u.x), view.center_scale_y(u.y)], [view.center_scale_x(v.x), view.center_scale_y(v.y)],
                        paths[i], paths[(i+1)%paths.length])) {
                        intersect = true;
                        break;
                    }
                }
                if(!intersect) convex_cnt++;
            }
        }
        return convex_cnt/all_cnt;
    };

    that.separation = function (nodes, cell_path1, cell_path2, cell_label1, cell_label2, lines) {
        let pDistance = function (x, y, x1, y1, x2, y2) {

              var A = x - x1;
              var B = y - y1;
              var C = x2 - x1;
              var D = y2 - y1;

              var dot = A * C + B * D;
              var len_sq = C * C + D * D;
              var param = -1;
              if (len_sq != 0) //in case of 0 length line
                  param = dot / len_sq;

              var xx, yy;

              if (param < 0) {
                xx = x1;
                yy = y1;
              }
              else if (param > 1) {
                xx = x2;
                yy = y2;
              }
              else {
                xx = x1 + param * C;
                yy = y1 + param * D;
              }

              var dx = x - xx;
              var dy = y - yy;
              return Math.sqrt(dx * dx + dy * dy);
            };

        let wrong_nodes = nodes.filter(function (node) {
            if(view.if_in_cell(node, cell_path1, true, false) && (node.label[node.label.length - 1] === cell_label2)){
                return true
            }
            else if(view.if_in_cell(node, cell_path2, true, false) && (node.label[node.label.length - 1] === cell_label1)) {
                return true
            }
            return false
        });
        return wrong_nodes.length;
        let dis = wrong_nodes.reduce(function (acc, cur) {
            let min_dis = 100000;
            for(let i=0; i<lines.length; i++) {
                let dis = pDistance(cur.x, cur.y, lines[i][0], lines[i][1],
                    lines[(i+1)%lines.length][0], lines[(i+1)%lines.length][1]);
                if(dis < min_dis) min_dis = dis;
            }
            return acc + min_dis;
        }, 0);

        return dis;
    };

    that.get_nearest_nodes = function(cells) {
        for(let cell of cells) {
            let nodes = cell._old_nodes;
            for(let node of nodes) {
                let min_dis = 10000000;
                let min_line = null;
                for(let segments of cell.segments) {
                    for(let line_node of segments.lines) {
                        let dis = Math.pow(line_node[0]-node.x, 2) + Math.pow(line_node[1]-node.y, 2);
                        if(dis < min_dis) {
                            min_dis = dis;
                            min_line = line_node;
                        }
                    }
                }
                min_line.nodes.push(node);
            }
        }
    };

    that.optimize_paths = function (segments, cells) {
        cells.forEach(function (value) {
           value.border = false;
        });
        for (var i = 0;i < segments.length;i++) {
            var segment = segments[i];
            if (segment.cells.length == 1) {
                cells[segment.cells[0]].border = true;
            }
        }
        let all_new_lines = [];
        let alpha = 0.02;
        if(DataName == "oct") {
            alpha = 0.0000000001;
        }

        let all_separation = 0;
        let all_separation_cnt = 0;
        for(let segment of segments) {
            for(let line of segment.lines) {
                line.nodes = [];
            }
        }
        that.get_nearest_nodes(cells);
        for(let segment of segments) {
            if(segment.cells.length < 2) {
                all_new_lines.push(segment.lines);
                continue;
            }
            let debug_key = segment.cells[0] +","+ segment.cells[1];
            if((debug_key == "2,5")) {
                console.log("get")
            }
            let lines = segment.lines;

            // init score matrix
            let scores = [];
            for(let i=0; i<=lines.length; i++){
                let score = [];
                for(let j=0; j<=i; j++) {
                    score.push({
                        convexity: ((i===0)||(j===0))?0:10000000,
                        separation: ((i===0)||(j===0))?0:10000000,
                        lines: (j===0)?[lines[0]]:[]
                    })
                }
                scores.push(score);
            }
            let cell_paths = [[], []];
            let cell_borders = [];
            cell_borders[0] = cells[segment.cells[0]]['border'];
            cell_borders[1] = cells[segment.cells[1]]['border'];
            let begin_idx1 = cells[segment.cells[0]].segments.indexOf(segment);
            let direction1 = cells[segment.cells[0]].segment_directions[begin_idx1];
            for(let i=(begin_idx1+1)%cells[segment.cells[0]].segments.length; i!==begin_idx1; i = (i+1)%cells[segment.cells[0]].segments.length) {
                if(cells[segment.cells[0]].segment_directions[i] === 1) {
                    cell_paths[0] = cell_paths[0].concat(cells[segment.cells[0]].segments[i].lines)
                }
                else {
                    cell_paths[0] = cell_paths[0].concat(cells[segment.cells[0]].segments[i].lines.map(d=>d).reverse());
                }
            }
            let begin_idx2 = cells[segment.cells[1]].segments.indexOf(segment);
            let direction2 = cells[segment.cells[1]].segment_directions[begin_idx2];
            for(let i=(begin_idx2+1)%cells[segment.cells[1]].segments.length; i!==begin_idx2; i = (i+1)%cells[segment.cells[1]].segments.length) {
                if(cells[segment.cells[1]].segment_directions[i] === 1) {
                    cell_paths[1] = cell_paths[1].concat(cells[segment.cells[1]].segments[i].lines)
                }
                else {
                    cell_paths[1] = cell_paths[1].concat(cells[segment.cells[1]].segments[i].lines.map(d=>d).reverse());
                }
            }


            let cell_nodes = [[], []];
            cell_nodes[0] = cell_paths[0].reduce(function (acc, cur) {
                return acc.concat(cur.nodes);
            }, []);
            cell_nodes[1] = cell_paths[1].reduce(function (acc, cur) {
                return acc.concat(cur.nodes);
            }, []);
            let nodes = segment.lines.reduce(function (acc, cur) {
                            return acc.concat(cur.nodes)
                        }, []);
            cell_nodes[0] = cell_nodes[0].concat(nodes);
            cell_nodes[1] = cell_nodes[1].concat(nodes);
            for (let i = 1; i <= lines.length; i++) {
                if(i === lines.length) {
                    console.log("get")
                }
                for (let j = 1; j < i; j++) {
                    let min_score = {
                        convexity: 10000000,
                        separation: 10000000,
                        lines:[]
                    };
                    for (let k = j; k < i; k++) {
                        // convex

                        let cur_lines = scores[k][j-1].lines.map(d=>d);
                        cur_lines.push(segment.lines[i-1]);
                        let cur_lines_all = cur_lines.concat(segment.lines.slice(i));
                        let convex = 1.0;
                        if (cell_borders[0] && !cell_borders[1]) {
                            convex = that.convexity(cell_paths[1].concat(cur_lines_all), cell_nodes[1]);
                            convex *= convex;
                        }
                        else if (cell_borders[1] && !cell_borders[0]) {
                            convex = that.convexity(cell_paths[0].concat(cur_lines_all), cell_nodes[0]);
                            convex *= convex;
                        }
                        else {
                            convex = that.convexity(cell_paths[0].concat(cur_lines_all), cell_nodes[0])
                                * that.convexity(cell_paths[1].concat(cur_lines_all), cell_nodes[1]);
                        }
                        // let convex = that.convexity(cell_paths[0].concat(cur_lines_all), cell_nodes[0])
                        //     * that.convexity(cell_paths[1].concat(cur_lines_all), cell_nodes[1]);
                        convex = Math.round(convex*100)/100;
                        // separation
                        let full_path1 = cell_paths[0];

                        let separation = that.separation(nodes, cell_paths[0].concat(direction1===1?cur_lines_all:cur_lines_all.map(d=>d).reverse()),
                            cell_paths[1].concat(direction2===1?cur_lines_all:cur_lines_all.map(d=>d).reverse()),
                            segment.cells[0], segment.cells[1], cur_lines_all);
                        // separation = 0;
                        if(separation>0) {
                            all_separation += separation;
                            all_separation_cnt ++;
                        }
                        if((min_score.convexity+min_score.separation*alpha) > (convex+separation*alpha)) {
                            min_score = {
                                convexity: convex,
                                separation: separation,
                                lines: cur_lines
                            }
                        }
                    }

                    scores[i][j] = min_score;
                }
            }
            let min_score = {
                        convexity: 10000000,
                        separation: 10000000,
                        lines:[]
                    };
            for(let j = 1; j < lines.length; j++) {
                let cur_score = scores[lines.length][j];
                if((min_score.convexity+min_score.separation*alpha) > (cur_score.convexity + cur_score.separation*alpha)) {
                    min_score = {
                        convexity: cur_score.convexity,
                        separation: cur_score.separation,
                        lines: cur_score.lines
                    }
                }
            }
            if(DataName == "stl") {
                if((debug_key == "3,5") || (debug_key == "5,3")) {
                    min_score = scores[lines.length][1];
                    // let anchor = [4, -15.5];
                    // anchor.nodes = [];
                    // min_score.lines.splice(1, 0, anchor)
                }
                else if((debug_key == "4,5") || (debug_key == "5,4") || (debug_key == "7,5") || (debug_key == "5,7")) {
                    min_score = scores[lines.length][1];
                    // let anchor = [7, -5.5];
                    // anchor.nodes = [];
                    // min_score.lines.splice(1, 0, anchor)
                }
            }
            if(DataName == "oct") {
                if((debug_key == "0,2") || (debug_key == "2,0")) {
                    min_score = scores[lines.length][2];
                }
                else if((debug_key != "0,2") && (debug_key != "2,0")) {
                    min_score = scores[lines.length][1];
                }
            }

            if (min_score.lines.length > 2) {
                console.log(min_score.lines);
                if(DataName === "stl")
                    min_score.lines[1][1] += 1;
            }
            all_new_lines.push(min_score.lines)
        }
        console.log("separation average:", all_separation/all_separation_cnt);
        for(let i=0; i<segments.length; i++) {
            segments[i].lines = all_new_lines[i];
        }
    };

    that.show_voronoi = function(nodes, outliers){
        let voronoi_nodes = nodes.filter(d => outliers[d.id] === undefined);
        // let voronoi_nodes = nodes.filter(d => true);
        that.voronoi_data = view.cal_voronoi(voronoi_nodes);
        that.simple_bar = new Array(that.voronoi_data.length).fill(1).map(d => true);
        that.optimize_paths(that.voronoi_data.segments, that.voronoi_data);

        for(let node of nodes){
            let find = false;
            for(let cell of that.voronoi_data){
                if(view.if_in_cell(node, cell)) {
                    find = true;
                    cell.nodes.push(node);
                    break;
                }
            }
            if(!find) {
                console.log("Error: point not in any cells", node);
            }
        }
        for(let cell of that.voronoi_data) {
            let center = cell.nodes.reduce(function (acc, node) {
                acc.x += node.x;
                acc.y += node.y;
                return acc;
            }, {x:0,y:0});
            center.x /= cell.nodes.length;
            center.y /= cell.nodes.length;
            cell.site = [0, 0];
            cell.site[0] = center.x;
            cell.site[1] = center.y;
        }
        // let cat_0 = that.voronoi_data.cells[3].simple_summary[0].in;
        // let cat_1 = that.voronoi_data.cells[3].simple_summary[1].in;
        // console.log("cat heter:", cat_1/(cat_0+cat_1));
        console.log("Voronoi diagrams:", that.voronoi_data);
        that.update_view();
    };

    that.max_search_deep = 30;

    that.place_barchart = function(){
        let step = 0.5;
        for (let i = 0; i < that.voronoi_data.length; i++){
            let cell = that.voronoi_data[i];
            if (cell.x && cell.y){
                continue;
            }
            let cell_x = cell.site[0];
            let cell_y = cell.site[1];
            console.log("cell position", cell_x, cell_y, 
                cell.chart_width / view.scale, cell.chart_height/view.scale);
            let nodes = cell.nodes;
            let deep = 1;
            let min_node_cnt = 100000;
            let best_dx = -1;
            let best_dy = -1;
            let find = false;
            let cell_paths = cell.segments.reduce(function (acm, cur) {
                let ary = [];
                if(acm.length === 0) {
                    ary = cur.lines.slice(1, cur.lines.length)
                }
                else {
                    let last_node = acm[acm.length-1];
                    let cur_node = cur.begin_node;
                    if((last_node[0] === cur_node[0]) && (last_node[1] === cur_node[1])) {
                        ary = cur.lines.slice(1, cur.lines.length)
                    }
                    else {
                        ary = cur.lines.map(d => d).reverse().slice(1, cur.lines.length)
                    }
                }
                acm = acm.concat(ary);
                return acm;
            }, []);
            for (; deep < that.max_search_deep; deep++){
                for(let dx = -deep; dx <= deep; dx++){
                    for(let dy = -(deep-Math.abs(dx)); dy <= deep-Math.abs(dx); dy++){
                        cell_x = cell.site[0] + dx * step;
                        cell_y = cell.site[1] + dy * step;
                        if((view.center_scale_y(cell_y+cell.chart_height/view.scale) > 600) || (view.center_scale_y(cell_y) < 0)) continue;
                        let contain_nodes_cnt = 0;
                        let k = 0;
                        let if_in_poly = view.if_in_cell({x:cell_x, y:cell_y}, cell_paths, true)
                                    && view.if_in_cell({x:cell_x, y:cell_y + cell.chart_height/view.scale}, cell_paths, true)
                                    && view.if_in_cell({x:cell_x + cell.chart_width / view.scale, y:cell_y}, cell_paths, true)
                                    && view.if_in_cell({x:cell_x + cell.chart_width / view.scale, y:cell_y + cell.chart_height/view.scale}, cell_paths, true);
                        if(!if_in_poly) continue;
                        for (; k < nodes.length; k++){
                            if (nodes[k].x > (cell_x- cell.chart_width / view.scale) && nodes[k].x < (cell_x + cell.chart_width*1.5 / view.scale)
                                && nodes[k].y > (cell_y - cell.chart_height*0.5/view.scale) && nodes[k].y < (cell_y + cell.chart_height*1.5/view.scale)){
                                    contain_nodes_cnt++;
                                }
                        }
                        if (contain_nodes_cnt < min_node_cnt){
                            min_node_cnt = contain_nodes_cnt;
                            best_dx = dx;
                            best_dy = dy;
                        }
                        if(min_node_cnt === 0){
                            find = true;
                            break;
                        }
                    }
                    if(find) break;
                }
                if(find) break;
            }
            cell.x = cell.site[0] + best_dx * step;
            cell.y = cell.site[1] + best_dy * step;
            cell.x = view.center_scale_x(cell.x);
            cell.y = view.center_scale_y(cell.y);
            console.log("final cell position", cell.x, cell.y, best_dx, best_dy, cell.label);
        }
    };

    that.disable_voronoi = function(){
        that.voronoi_data = [];
        that.voronoi_data.segments = [];
        that.update_view();
    };

    that.change_bar_mode = function(i, flag){
        that.simple_bar[i] = flag;
        that.update_view();
    };
    
    that.change_max_num = function(num){
        that.max_num = num;
        that.update_view();
    };

    that.show_comparison = function(){
        that.comparison_flag = true; 
        let data = [];
        let class_cnt = that.drag_node.summary.length;
        bar_width = 4 * view.zoom_scale;
        small_inner_bounder = 1.5 * view.zoom_scale * 1;
        large_inner_bounder = 3 * view.zoom_scale * 1;
        outer_bounder = 3 * view.zoom_scale;
        chart_width = bar_width*(2*class_cnt)
            +large_inner_bounder*(class_cnt-1)
            +small_inner_bounder*class_cnt+outer_bounder*2;
        chart_height = 80 * 0.8 * view.zoom_scale;
        let max_num = -1;
        for (let i = 0; i < class_cnt; i++){
            max_num = Math.max(max_num, that.drag_node.summary[i].in);
            max_num = Math.max(max_num, that.second_drag_node.summary[i].in);
        }
        for (let i = 0; i < class_cnt; i++){
            let drag_summary = that.drag_node.summary[i];
            let second_drag_summary = that.second_drag_node.summary[i];
            let value = drag_summary.in / max_num;
            let second_value = second_drag_summary.in / max_num;
            data.push({
                id: i * 2 ,
                x: outer_bounder+(bar_width*2+small_inner_bounder+large_inner_bounder)*i,
                y: chart_height*0.8-chart_height*0.7*scale_function(value),
                w: bar_width,
                h:chart_height*0.7*scale_function(value),
                color: color_label[i]
            });
            data.push({
                id: i * 2 + 1,
                x: outer_bounder + bar_width + small_inner_bounder +(bar_width*2+small_inner_bounder+large_inner_bounder)*i,
                y: chart_height*0.8-chart_height*0.7*scale_function(second_value),
                w: bar_width,
                h: chart_height*0.7*scale_function(second_value),
                color: color_label[i]
            });
        }
        that.show_group = that.voronoi_group.append("g")
            .attr("class", "comparison-group")
            .attr("transform", "translate("+(100)
            +","+(100)+")");
        
        that.show_group
            .append("rect")
            .attr("class", "barchart-shadow")
            .attr("x", 1.5)
            .attr("y", 1.5)
            .attr("width", chart_width)
            .attr("height", chart_height)
            .style("fill", "#969696");
        that.show_group.append("rect")
            .attr("class", "barchart-background")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", chart_width)
            .attr("height", chart_height)
            .style("fill", "white")
            .style("stroke", "#d8d7d7")
            .style("stroke-width", 1);
        that.show_group.append("g")
            .attr("class", "bar-group")
            .selectAll("rect.edge-summary-rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "edge-summary-rect")
            .attr("id", (d, i) => "edge-bar-in-"+i)
            .attr("x", (d, i) => d.x)
            .attr("y", (d, i) => d.y)
            .attr("width", (d, i) => d.w)
            .attr("height", (d, i) => d.h)
            .attr("fill", (d, i) => d.color);

    };

    that.remove_comparison = function(){
        that.comparison_flag = false; 

    };

    that.update_view = function(){
        that.cell_data = [];
        if(that.voronoi_data)
        for (let i = 0; i < that.voronoi_data.length; i++){
            let cell = that.voronoi_data[i];
            let summary = that.simple_bar[i] ? cell.simple_summary : cell.summary;
            let class_cnt = summary.length;
            cell.bar_width = 4 * view.zoom_scale * 2;
            small_inner_bounder = 1.5 * view.zoom_scale * 0;
            large_inner_bounder = 3 * view.zoom_scale * 2;
            outer_bounder = 3 * view.zoom_scale * 2;
            cell.chart_width = cell.bar_width*(class_cnt)+large_inner_bounder*(class_cnt-1)+small_inner_bounder*class_cnt+outer_bounder*2;
            cell.chart_height = 50 * 0.8 * view.zoom_scale * 2;
            cell.summary_data = summary;
            cell.simple_bar = that.simple_bar[i];
            cell.id  = i;
            that.cell_data.push(cell);
        }
        that.place_barchart();
        console.log("that.cell_data", that.cell_data.map(d => d.summary_data), "simple_bar", that.simple_bar);
        that.voronoi_in_group = that.voronoi_group.selectAll("g.voronoi-cell")
            .data(that.cell_data, d => d.id);
        that.boundary_in_group = that.boundary_group.selectAll("path.boundary")
            .data(that.voronoi_data.segments, d => d.begin_node+","+d.end_node);

        that._create();
        that._update();
        that._remove();
    };

    that._remove = function(){
        that.voronoi_in_group.exit()
            .transition()
            .duration(remove_ani)
            .attr("opacity", 0)
            .remove();
        that.sub_bar_group
            .exit()
            .transition()
            .duration(remove_ani)
            .attr("opacity", 0)
            .remove();
        that.boundary_in_group
            .exit()
            .transition()
            .duration(remove_ani)
            .attr("opacity", 0)
            .remove();
    };

    that._update = function(){
        that.boundary_in_group.selectAll("path.boundary")
            .attr("d", d => drawer(d.lines))
            .attr("fill", "none")
            .attr("stroke-width", 2)
            .attr("stroke", "#a9a9a9");

        that.voronoi_in_group
            // .selectAll(".voronoi-edge")
            .selectAll(".barchart-shadow")
            .attr("width", d => d.chart_width)
            .attr("height", d => d.chart_height);

        that.voronoi_in_group
            .selectAll(".barchart-background")
            .attr("width", d => d.chart_width)
            .attr("height", d => d.chart_height);

        that.voronoi_in_group
            .selectAll(".bar-group")
            .attr("transform", d => 
                "translate("+(d.x)
                +","+(d.y)+")");

        that.voronoi_in_group.selectAll(".voronoi-edges")
        .each(function (d) {
            return
            let group = d3.select(this);
            if(view.show_init_voronoi) {
                group.selectAll("path")
                    .data(d.halfedges)
                    .attr("class", "voronoi-edge")
                    .attr("d", d => view.get_cell_path(d, that.scale, that.voronoi_data))
                    .style("fill", "none")
                    .style("stroke-width", 2)
                    .style("stroke", "#a9a9a9")
                    .on("mouseover", function (d) {
                        console.log(that.voronoi_data.edges[d])
                    });
            }
            else {
                group.selectAll("path")
                    .data(d.skeleton)
                    .attr("class", "voronoi-edge")
                    .attr("d", d => view.get_skeleton_path(d, view.scale, that.voronoi_data))
                    .style("fill", "none")
                    .style("stroke-width", 2)
                    .style("stroke", "#a9a9a9")
                    .on("mouseover", function (d) {
                        console.log(d)
                    });

            }

        });


        that.sub_bar_group
            .attr("id", (d, i) => "edge-bar-in-"+i)
            .attr("x", (d, i) => d.x)
            .attr("y", (d, i) => d.y)
            .attr("width", (d, i) => d.w)
            .attr("height", (d, i) => d.h)
            .attr("fill", (d, i) => d.color);
        
    };

    that._create = function(){
        let drawer = d3.line().x(d => view.center_scale_x(d[0])).y(d => view.center_scale_y(d[1]));
        that.boundary_in_group.enter()
            .append("path")
            .attr("class", "boundary")
            .attr("d", d => drawer(d.lines))
            .attr("fill", "none")
            .attr("stroke-width", 2)
            .attr("stroke", "#a9a9a9")
            .on("mouseover", function (d) {
                console.log("boundary:", d)
            });



        let v_g = that.voronoi_in_group.enter()
        .append("g")
        .attr("class", "voronoi-cell");

        v_g.append("g")
        .attr("class", "voronoi-edges")
        .each(function (d) {
            return
            let group = d3.select(this);
            if(view.show_init_voronoi) {
                group.selectAll("path")
                    .data(d.halfedges)
                    .enter()
                    .append("path")
                    .attr("class", "voronoi-edge")
                    .attr("d", d => view.get_cell_path(d, that.scale, that.voronoi_data))
                    .style("fill", "none")
                    .style("stroke-width", 2)
                    .style("stroke", "#a9a9a9")
                    .on("mouseover", function (d) {
                        console.log(that.voronoi_data.edges[d])
                    });
            }
            else {
                group.selectAll("path")
                    .data(d.skeleton)
                    .enter()
                    .append("path")
                    .attr("class", "voronoi-edge")
                    .attr("d", d => view.get_skeleton_path(d, view.scale, that.voronoi_data))
                    .style("fill", "none")
                    .style("stroke-width", 2)
                    .style("stroke", "#a9a9a9")
                    .on("mouseover", function (d) {
                        console.log(d)
                    });

            }

        });

        let sub_v_g = v_g.append("g")
        .attr("class", "bar-group")
            .attr("transform", d => 
                "translate("+(d.x)
                +","+(d.y)+")")
            // .call(d3.drag().on("start", function(d){
            //     console.log("start dragstarted");
            //     that.drag_activated = true;
            //     that.drag_node = d;
            //     d3.event.sourceEvent.stopPropagation();
            // })
            // .on("drag", function(d){
            //     if (!that.drag_activated) return;
            //     d.x = d3.mouse(view.main_group.node())[0];
            //     d.y = d3.mouse(view.main_group.node())[1];
            //     d3.select(this).attr("transform",
            //         d => "translate("+(d.x)
            //         +","+(d.y)+")");
            // })
            // .on("end", function(d){
            //     d.x = d3.mouse(view.main_group.node())[0];
            //     d.y = d3.mouse(view.main_group.node())[1];
            //     console.log("drag end", d.x, d.y);
            //     that.drag_activated = false;
            //     // if (that.second_drag_node){
            //     //     that.show_comparison();
            //     // }
            // }));

        // let sub_v_g = that.voronoi_group.selectAll("g.voronoi-cell")
        // .data(that.cell_data, d => d.id)
        // .selectAll(".bar-group");
        sub_v_g.append("rect")
            .attr("class", "barchart-shadow")
            .attr("x", 1.5)
            .attr("y", 1.5)
            .attr("width", d => d.chart_width)
            .attr("height", d => d.chart_height)
            .style("fill", "#969696");
        sub_v_g.append("rect")
            .attr("class", "barchart-background")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", d => d.chart_width)
            .attr("height", d => d.chart_height)
            .style("fill", "white")
            .style("stroke", "#d8d7d7")
            .style("stroke-width", 1)
            .on("click", function(d, i){
                that.change_bar_mode(i, !that.simple_bar[i]);
            });
        that.sub_bar_group = that.voronoi_group.selectAll("g.voronoi-cell")
            .data(that.cell_data, d => d.id)
            .selectAll(".bar-group")
            .selectAll("rect.edge-summary-rect")
            .data(function(d){
                let data = [];
                let max_num = -1;
                for (let i = 0; i < d.summary_data.length; i++){
                    max_num = Math.max(max_num, d.summary_data[i].in);
                }
                // that.max_num = 5;
                for (let i = 0; i < d.summary_data.length; i++){
                    let value = d.summary_data[i].in / that.max_num;
                    let path = d.summary_data[i].path;
                    if(isNaN(value)){
                        console.log("get");
                    }
                    let idx = d.summary_data[i].idx;
                    let path_2 = [];
                    if(idx > -1){
                        path_2 = that.cell_data[idx].total_summary[d.label].path;
                    }
                    d.summary_data[i].value = value;
                    console.log("value:",value);
                    data.push({
                        id: d.id,
                        value: value,
                        label: d.label,
                        idx: idx,
                        x: outer_bounder+(d.bar_width+small_inner_bounder+large_inner_bounder)*i,
                        y: d.chart_height*0.9-d.chart_height*0.7*scale_function(value, d.simple_bar),
                        w: d.bar_width,
                        h: d.chart_height*0.7*scale_function(value, d.simple_bar),
                        color: idx === -1 ? "gray" : color_label[idx],
                        path: path.concat(path_2)
                    });
                }
                console.log("data, ", data);
                return data;
            });
        that.sub_bar_group.enter()
            .append("rect")
            .attr("class", "edge-summary-rect")
            .attr("id", (d, i) => "edge-bar-in-"+i)
            .attr("x", (d, i) => d.x)
            .attr("y", (d, i) => d.y)
            .attr("width", (d, i) => d.w)
            .attr("height", (d, i) => d.h)
            .attr("fill", (d, i) => d.color)
            .on("click", function(d){
                if(that.simple_bar[d.id]){
                    that.change_bar_mode(d.id, !that.simple_bar[d.id]);
                }
                else{
                    console.log("bar click", d.path, d.id);
                    view.data_manager.highlight_path(d.path);
                    d3.event.stopPropagation();
                }
            })
        };

    that.init = function () {
        that._init();
    }.call();
}