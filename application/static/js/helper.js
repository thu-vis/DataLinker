/*
* added by Changjian Chen, 20191015
* */

function number_format (number, decimals, dec_point, thousands_sep) {
    // http://kevin.vanzonneveld.net
    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +     bugfix by: Michael White (http://getsprink.com)
    // +     bugfix by: Benjamin Lupton
    // +     bugfix by: Allan Jensen (http://www.winternet.no)
    // +    revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +     bugfix by: Howard Yeend
    // +    revised by: Luke Smith (http://lucassmith.name)
    // +     bugfix by: Diogo Resende
    // +     bugfix by: Rival
    // +      input by: Kheang Hok Chin (http://www.distantia.ca/)
    // +   improved by: davook
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Jay Klehr
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Amir Habibi (http://www.residence-mixte.com/)
    // +     bugfix by: Brett Zamir (http://brett-zamir.me)
    // +   improved by: Theriault
    // +      input by: Amirouche
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: number_format(1234.56);
    // *     returns 1: '1,235'
    // *     example 2: number_format(1234.56, 2, ',', ' ');
    // *     returns 2: '1 234,56'
    // *     example 3: number_format(1234.5678, 2, '.', '');
    // *     returns 3: '1234.57'
    // *     example 4: number_format(67, 2, ',', '.');
    // *     returns 4: '67,00'
    // *     example 5: number_format(1000);
    // *     returns 5: '1,000'
    // *     example 6: number_format(67.311, 2);
    // *     returns 6: '67.31'
    // *     example 7: number_format(1000.55, 1);
    // *     returns 7: '1,000.6'
    // *     example 8: number_format(67000, 5, ',', '.');
    // *     returns 8: '67.000,00000'
    // *     example 9: number_format(0.9, 0);
    // *     returns 9: '1'
    // *    example 10: number_format('1.20', 2);
    // *    returns 10: '1.20'
    // *    example 11: number_format('1.20', 4);
    // *    returns 11: '1.2000'
    // *    example 12: number_format('1.2000', 3);
    // *    returns 12: '1.200'
    // *    example 13: number_format('1 000,50', 2, '.', ' ');
    // *    returns 13: '100 050.00'
    // Strip all characters but numerical ones.
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + Math.round(n * k) / k;
        };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}

let star_path = function(out_radius, inner_radius, center_x, center_y) {
    // added by changjian, 201912251013
    // generating star shape in a path format
    let svgdata='M ' + center_x + ' ' + center_y + '\n';
    let npoints = 5;
    let baseAngle = Math.PI / npoints;
    let counter = 0;
    let oddeven = 0;
    let r = 0;
    let cmd = '';
    let x = 0;
    let y = 0;
    let yangle = 0;
    let skew = 0;
    for (i = 0; i <= Math.PI * 2; i += baseAngle) {
        if (oddeven === 0) {
            /* Start on inner radius. */
            r = inner_radius;
            oddeven = 1;
            yangle = i;
        }
        else {
            /* Even points on outer radius. */
            r = out_radius;
            oddeven = 0;
            yangle = i + (baseAngle * skew);
        }

        if (counter === 0) {
            cmd = 'M';
        }
        else {
            cmd = 'L';
        }

        xsvg = number_format((r * Math.sin(i)) + center_x, 3, '.', '');
        ysvg = number_format((r * Math.cos(yangle)) + center_y, 3, '.', '');

        svgdata += cmd + ' ' + xsvg + ' ' + ysvg + '\n';

        counter++;
    }
    return svgdata;
};

let twoD_sum = function(mat){
    let sum = 0;
    for (let i = 0; i < mat.length; i++){
        for (let j = 0; j < mat[i].length; j++){
            sum = sum + mat[i][j];
        }
    }
    return sum;
};

let dist_100 = function(n){
    n = n % 100;
    if (n < 50){
        return 0;
    }
    else if (n < 70){
        return 1;
    }
    else if (n < 85){
        return 2;
    }
    else if (n < 95){
        return 3;
    }
    else{
        return 4;
    }
}

let oneD_sum = function(vec){
    let sum = 0;
    for (let i = 0; i < vec.length; i++){
        sum += vec[i];
    }
    return sum;
};

let bezier_tapered = function(begin, mid, end, begin_width, mid_width, end_width){
    begin_width /= 2;
    mid_width /= 2;
    end_width /= 2;
    let cen = {
        x:(begin.x+end.x)/2,
        y:(begin.y+end.y)/2
    };
    let direct = {
        x:mid.x-cen.x,
        y:mid.y-cen.y
    };
    let direct_len = Math.sqrt(direct.x*direct.x + direct.y*direct.y);
    direct.x /= direct_len;
    direct.y /= direct_len;

    let begin1 = {
        x: begin.x + direct.x * begin_width,
        y: begin.y + direct.y * begin_width
    };
    let mid1 = {
        x: mid.x + direct.x * mid_width,
        y: mid.y + direct.y * mid_width
    };
    let end1 = {
        x: end.x + direct.x * end_width,
        y: end.y + direct.y * end_width
    };
    let begin2 = {
        x: begin.x - direct.x * begin_width,
        y: begin.y - direct.y * begin_width
    };
    let mid2 = {
        x: mid.x - direct.x * mid_width,
        y: mid.y - direct.y * mid_width
    };
    let end2 = {
        x: end.x - direct.x * end_width,
        y: end.y - direct.y * end_width
    };
    return "M {0} {1} Q {2} {3}, {4} {5} L {6} {7} Q {8} {9}, {10} {11} Z".format(
        begin1.x, begin1.y, mid1.x, mid1.y, end1.x, end1.y,
        end2.x, end2.y, mid2.x, mid2.y, begin2.x, begin2.y
    )
};

let curve_tapered = function(pts, begin_width, end_width) {
    begin_width /= 2;
    end_width /= 2;
    let pt_num = pts.length;
    let cur_width = begin_width;
    let width_step = [];
    let begin_per = 2/5;
    let end_per = 9/10;
    for(let i=0; i<pt_num; i++) {
        let per = i/pt_num;
        if(per < begin_per) {
            width_step.push(0)
        }
        else if(per > end_per) {
            width_step.push(0)
        }
        else {
            width_step.push((begin_width-end_width)/((end_per-begin_per)* pt_num))
        }
    }
    let curve_pts = [];
    for(let i=1; i<pt_num-1; i++) {
        let last = pts[i-1];
        let cur = pts[i];
        let next = pts[i+1];
        let cen = {
            x: cur.x - last.x,
            y: cur.y - last.y
        };
        let direct = {
            x: -cen.y,
            y: cen.x
        };
        let direct_len = Math.sqrt(direct.x*direct.x + direct.y*direct.y);
        direct.x /= direct_len;
        direct.y /= direct_len;
        if(i === 1){
            curve_pts.push([{
                x: last.x + direct.x * cur_width,
                y: last.y + direct.y * cur_width
            }, {
                x: last.x - direct.x * cur_width,
                y: last.y - direct.y * cur_width
            }])
        }
        cur_width -= width_step[i-1];
        curve_pts.push([{
                x: cur.x + direct.x * cur_width,
                y: cur.y + direct.y * cur_width
        }, {
                x: cur.x - direct.x * cur_width,
                y: cur.y - direct.y * cur_width
        }]);
        if(i === pt_num-2){
            cur_width -= width_step[i];
            curve_pts.push([{
                x: next.x + direct.x * cur_width,
                y: next.y + direct.y * cur_width
            }, {
                    x: next.x - direct.x * cur_width,
                    y: next.y - direct.y * cur_width
            }])
        }
    }
    let curve_str = "M "+curve_pts[0][0].x+" "+curve_pts[0][0].y+" ";
    let last = curve_pts[0][0];
    let another = curve_pts[0][1];
    let anothers = [another];
    for(let i=1; i<pt_num; i++) {
        // let direct = [last.x-another.x, last.y-another.y];
        // let direct2 = [curve_pts[i][0].x-curve_pts[i][1].x, curve_pts[i][0].y-curve_pts[i][1].y];
        // if((direct[0]*direct2[0] + direct[1]*direct2[1]) > 0)
        if(true)
        {
            last = curve_pts[i][0];
            another = curve_pts[i][1];
        }
        else {
            last = curve_pts[i][1];
            another = curve_pts[i][0];
        }
        anothers.push(another);
        curve_str += "L "+last.x+" "+last.y+" ";
    }
    for(let i=pt_num-1; i>=0; i--) {
        curve_str += "L "+anothers[i].x+" "+anothers[i].y+" ";
    }
    curve_str += "Z";
    return curve_str;
};

let curve_mid = function (u, v, radius) {
        function distance(u, v) {
            return Math.sqrt(Math.pow(v[0] - u[0], 2) + Math.pow(v[1] - u[1], 2));
        }
        // let mid = [(u[0]+v[0])/2, (u[1]+v[1])/2];
        // // console.log(Math.sqrt(Math.pow(u[0]-v[0], 2), Math.pow(u[1]-v[1], 2)))
        // // let c = Math.sqrt(Math.pow(u[0]-v[0], 2), Math.pow(u[1]-v[1], 2))*0.3;
        // let c = 800+(Math.random()-0.5)*5;
        // if(u[1] === v[1]) {
        //     u[1] += 0.00005
        // }
        // let tmp = Math.sqrt(c/(1+Math.pow((u[0]-v[0])/(u[1]-v[1]), 2)));
        // let res_x1 = tmp+(u[0]+v[0])/2;
        // let res_x2 = -tmp+(u[0]+v[0])/2;
        // let res_y1 = (u[0]-v[0])*(res_x1-(u[0]+v[0])/2)/(v[1]-u[1])+(u[1]+v[1])/2;
        // let res_y2 = (u[0]-v[0])*(res_x2-(u[0]+v[0])/2)/(v[1]-u[1])+(u[1]+v[1])/2;
        // if((res_x1-(u[0]+v[0])/2)*(v[1]-u[1])-(v[0]-u[0])*(res_y1-(u[1]+v[1])/2) < 0){
        //     return [res_x1, res_y1]
        // }
        // else {
        //     return [res_x2, res_y2]
        // }
    let mid = [(u[0]+v[0])/2, (u[1]+v[1])/2];
    let a = distance(mid, u);
    let r = radius;
    let b = Math.sqrt(r*r-a*a);
    let xa = mid[0]-u[0];
    let ya = mid[1]-u[1];
    let res_x1 = mid[0] + b*ya/a;
    let res_y1 = mid[1] - b*xa/a;
    let res_x2 = mid[0] - b*ya/a;
    let res_y2 = mid[1] + b*xa/a;
    if((Math.abs(distance([res_x1, res_y1], u)-r)>1e-4) ||
    (Math.abs(distance([res_x1, res_y1], v)-r)>1e-4)||
    (Math.abs(distance([res_x2, res_y2], u)-r)>1e-4)||
    (Math.abs(distance([res_x2, res_y2], v)-r)>1e-4)){
        console.log("R ERROR!!!!!!!!!");
        return false
    }
    let center = [];
    if((res_x1-(u[0]+v[0])/2)*(v[1]-u[1])-(v[0]-u[0])*(res_y1-(u[1]+v[1])/2) < 0){
            center = [res_x1, res_y1]
    }
    else {
        center = [res_x2, res_y2]
    }
    let c = a*a/b;
    let mid_center = [center[0]-mid[0], center[1]-mid[1]];
    let res_mid = [mid_center[0]*c/b, mid_center[1]*c/b];
    let res = [mid[0]-res_mid[0], mid[1]-res_mid[1]];
    return res;

};

let get_vector_degree = function (u, v) {
    function distance(u, v) {
            return Math.sqrt(Math.pow(v[0] - u[0], 2) + Math.pow(v[1] - u[1], 2));
        }
    let multi = u[0]*v[0]+u[1]*v[1];
    let u_dis = distance(u,[0,0]);
    let v_dis = distance(v,[0,0]);
    let cos = multi/(u_dis*v_dis);
    return Math.acos(cos);
};

function deepCopy(obj) {
    let _obj = Array.isArray(obj) ? [] : {}
    for (let i in obj) {
      _obj[i] = typeof obj[i] === 'object' ? deepCopy(obj[i]) : obj[i]
    }
    return _obj
  }

String.prototype.format = String.prototype.f = function () {
    var s = this,
        i = arguments.length;

    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};

function change_path(sp, ep, hspace, vspace){
    let c1 = {
        x: sp.x,
        y: sp.y + vspace
    };
    let c2 = {
        x: sp.x - hspace,
        y: sp.y
    };
    let c3 = {
        x: ep.x - hspace,
        y: ep.y 
    };
    let c4 = {
        x: ep.x,
        y: ep.y - vspace
    };
    let m1 = {
        x: sp.x - hspace,
        y: sp.y + vspace
    };
    let m2 = {
        x: ep.x - hspace,
        y: ep.y - vspace
    };
    return "M {0}, {1} C {2}, {3} {4}, {5} {6}, {7} L {8} {9} C {10}, {11} {12}, {13} {14}, {15}".format(
        sp.x, sp.y, c1.x, c1.y, c2.x,
        c2.y, m1.x, m1.y, m2.x, m2.y, 
        c3.x, c3.y, c4.x, c4.y, ep.x, ep.y
    )
}

function change_straight(sp, ep){
    return "M {0}, {1} L {2}, {3}".format(
        sp.x, sp.y, ep.x, ep.y
    )
}

function zip(rows){
    return rows[0].map((_,c)=>rows.map(row=>row[c]));
}

function set_font(selection) {
    selection.attr("font-family", '"Helvetica Neue", Helvetica, Arial, sans-serif')
        .attr("font-size", "14px")
        .attr("font-weight", 700)
        .attr("color", "#333333")
}

function average(nums) {
    return nums.reduce((a, b) => a + b) / nums.length;
}

Array.prototype.delRepeat=function(){
    var newArray=[];
    var provisionalTable = {};
    for (var i = 0, item; (item= this[i]) != null; i++) {
    if (!provisionalTable[item]) {
    newArray.push(item);
    provisionalTable[item] = true;
    }
    }
    return newArray;
    }

function delRepeatDictArr(dict_arr){
    for (let i = 0; i < dict_arr.length; i++){
        dict_arr[i].visited = false;
    }
    let new_arr = [];
    for (let i = 0; i < dict_arr.length; i++){
        if (dict_arr[i].visited) continue;
        new_arr.push(dict_arr[i]);
        dict_arr[i].visited = true;
    }
    return new_arr;
}

function delRepeatPath(path){
    let check_dir = {};
    let new_path = [];
    for (let i = 0; i < path.length; i++){
        let p = path[i];
        let id = p[0].id + "-" + p[1].id;
        if (check_dir[id] === undefined){
            check_dir[id] = 1;
            new_path.push(p);
        }
    }
    return new_path;
}



function variableWidthPath(src, target, src_width, target_width) {
    let gap = 15;
    let src_to_target_norm_vector = {
        "x": target.y - src.y,
        "y": -target.x + src.x
    };
    let src_to_target_norm_vector_length = Math.sqrt(src_to_target_norm_vector.x * src_to_target_norm_vector.x +
        src_to_target_norm_vector.y * src_to_target_norm_vector.y);
    src_to_target_norm_vector.x /= src_to_target_norm_vector_length;
    src_to_target_norm_vector.y /= src_to_target_norm_vector_length;

    let first_point = {
        "x": src.x + src_width / 2 * src_to_target_norm_vector.x,
        "y": src.y + src_width / 2 * src_to_target_norm_vector.y
    };
    let second_point = {
        "x": target.x + target_width / 2 * src_to_target_norm_vector.x,
        "y": target.y + target_width / 2 * src_to_target_norm_vector.y
    };
    let third_point = {
        "x": target.x - target_width / 2 * src_to_target_norm_vector.x,
        "y": target.y - target_width / 2 * src_to_target_norm_vector.y
    };
    let fourth_point = {
        "x": src.x - src_width / 2 * src_to_target_norm_vector.x,
        "y": src.y - src_width / 2 * src_to_target_norm_vector.y
    };
    let length = Math.sqrt(Math.pow(target.x - src.x, 2) + Math.pow(target.y - src.y, 2));

    if (length > 0) {
        return "M {0}, {1} a{4},{4} 0 0,0 {2},{3} L {5}, {6} a{9},{9} 0 0,1 {7},{8}".format(
            first_point.x, first_point.y,
            second_point.x - first_point.x, second_point.y - first_point.y, 1.8 * length,
            third_point.x, third_point.y,
            -third_point.x + fourth_point.x, -third_point.y + fourth_point.y, 1.8 * length
        )
    }
    else {
        return "M {0}, {1} a{4},{4} 0 0,0 {2},{3} L {5}, {6} a{9},{9} 0 0,0 {7},{8}".format(
            second_point.x, second_point.y,
            first_point.x - second_point.x, first_point.y - second_point.y, 1.8 * length,
            fourth_point.x, fourth_point.y,
            fourth_point.x - third_point.x, fourth_point.y - third_point.y, 1.8 * length
  )}
}

var intersect = function(rect1, rect2, padding_label) {
    return !((rect1.x + rect1.w + padding_label < rect2.x) || (rect2.x + rect2.w + padding_label < rect1.x) ||
        (rect1.y + rect1.h + padding_label < rect2.y) || (rect2.y + rect2.h + padding_label < rect1.y))
};

let path_rect_intersect = function(path, rect){
    let res = path.old_res;
    let len = res.length;
    let half = Math.round(len/2);
    return bezierIntersect.quadBezierAABB(res[0].x, res[0].y,
        res[half].x, res[half].y, res[len-1].x, res[len-1].y,
        rect.x, rect.y, rect.x + rect.w, rect.y + rect.h)
};

function quadrant(center, point){
    let x = point.x - center.x;
    let y = point.y - center.y;
    if (x > 0){
        if (y > 0){
            return 0;
        }
        else{
            return 3;
        }
    }
    else{
        if (y > 0){
            return 1;
        }
        else{
            return 2;
        }
    }
}



function label_layout(nodes, path, zoom_scale){
    // let img_width = 12 * zoom_scale;
    // let img_height = 12  * zoom_scale;
    // let padding = 0  * zoom_scale;
    
    let img_width = 10 / 3 * zoom_scale;
    let img_height = 10 / 3  * zoom_scale;
    let padding = 0.1  * zoom_scale;

    function return_rect(node, j){
        let x = node.x;
        let y = node.y;
        if (j === 3){
            y = y - img_height;
            x = x + img_width * 0.02;
        }
        else if (j === 2){
            x = x - img_width;
            y = y - img_height;
        }
        else if (j === 1){
            x = x - img_width;
            y = y + img_height * 0.02;
        }
        else if (j === 0){
            x = x + img_width * 0.02;
            y = y + img_height * 0.02;
        }
        return {
                "x": x, 
                "y": y, 
                "w": img_width * 0.98, 
                "h": img_height * 0.98,
                "url": DataLoader.image_url + "?filename=" + node.id + ".jpg"
                }
    }

    function update_nodes_quad(focus_node, quad, start){
        let rect = return_rect(focus_node, quad);
        for (let i = start + 1; i < nodes.length; i++){
            let node = nodes[i];
            for (let j = 0; j < 4; j++){
                if (node.quad[j] < 0) continue;
                virtual_rect = return_rect(node, j);
                if (intersect(rect, virtual_rect, padding)) node.quad[j] = -1;
            }
        }
    };

    for (let i = 0; i < nodes.length; i++){
        if (nodes[i].quad === undefined){
            nodes[i].quad = [0, 0, 0, 0]; // 0 for candidate; 1 for taken; -1 for forbidden
        }
        let m = Math.max(...nodes[i].quad);
        if (m < 1){
            nodes[i].quad = [0, 0, 0, 0];
        }
        for (let j = 0; j < 4; j++){
            let rect = return_rect(nodes[i], j);
            for (let k = 0; k < path.length; k++){
                if (path_rect_intersect(path[k], rect)){
                    nodes[i].quad[j] = -1;
                    break;
                }
            }
            if (nodes[i].quad[j] < 0) continue;
            for (let k = 0; k < nodes.length; k++){
                if (k === i) continue;
                let x = nodes[k].x;
                let y = nodes[k].y;
                if (x > (rect.x - padding) && x < (rect.x + rect.w + padding) && y > (rect.y - padding) && y < (rect.y + rect.h + padding)){
                    nodes[i].quad[j] = -1;
                    break;
                }
            }
        }
    }

    // sort
    for (let i = 0; i < nodes.length; i++){
        nodes[i].placed = 0;
        for (let j = 0; j < 4; j++){
            if (nodes[i].quad[j] === 1){
                nodes[i].placed = 1;
            }
        }
    }
    nodes.sort( (a,b) => b.placed - a.placed);
    // nodes.sort( (a,b) => (b.id===9867) - (a.id===9867));
    // console.log("label layout nodes", nodes);
    // path.forEach(d => {
    //     let src = d[0];
    //     let tgt = d[1];
    //     let src_quad = quadrant(src, tgt);
    //     let tgt_quad = quadrant(tgt, src);
    //     src.quad[src_quad] = -1;
    //     tgt.quad[tgt_quad] = -1;
    // });


    let sorted_nodes = nodes; // TODO
    let imgs = [];
    for (let i = 0; i < nodes.length; i++){
        let node = nodes[i];
        for (let j = 0; j < 4; j++){
            if (node.quad[j] < 0) continue;
            else{
                node.quad[j] = 1;
                imgs.push({
                    "node": node,
                    "quad": j,
                    "w": img_width / zoom_scale, 
                    "h": img_height / zoom_scale,
                    "url": DataLoader.image_url + "?filename=" + node.id + ".jpg"
                });
                update_nodes_quad(node, j, i);
                break;
            }
            // if (can_place) break;
            // else{
            //     node.quad[j] = 0;
            // }
        }
    }
    console.log("label layout", imgs);
    return imgs;
};

function get_multiple_connected_static(node, all_graph, threshold){
    // in step
    // Object.value(all_graph).forEach(d => d.visited = false);
    for (let onenode of Object.values(all_graph)){
        onenode.visited = false;
    }
    in_step_count = [];
    candi_queue = [node];
    for(let i = 0; i < 100; i++){
        new_queue = [];
        if(candi_queue.length === 0) break;
        in_step_count.push(candi_queue.length);
        for (let j = 0; j < candi_queue.length; j++){
            let n = candi_queue[j];
            let from_list = n.from;
            let from_weight = n.from_weight;
            for (let k = 0; k < from_list.length; k++){
                if (all_graph[from_list[k]].visited === true) continue;
                if (from_weight[k] > threshold[0] && from_weight[k]< threshold[1]){
                    new_queue.push(all_graph[from_list[k]]);
                    all_graph[from_list[k]].visited = true;
                }
            }
        }
        candi_queue = new_queue;
    }
    in_step_count = in_step_count.slice(1);
    if (in_step_count.length === 0) in_step_count = [0];

    // out step
    for (let onenode of Object.values(all_graph)){
        onenode.visited = false;
    }
    out_step_count = [];
    candi_queue = [node];
    for(let i = 0; i < 100; i++){
        new_queue = [];
        if(candi_queue.length === 0) break;
        out_step_count.push(candi_queue.length);
        for (let j = 0; j < candi_queue.length; j++){
            let n = candi_queue[j];
            if (n.visited === true) continue;
            let to_list = n.to;
            let to_weight = n.to_weight;
            for (let k = 0; k < to_list.length; k++){
                if (to_weight[k] > threshold[0] && to_weight[k]< threshold[1]){
                    new_queue.push(all_graph[to_list[k]]);
                }
            }
            n.visited = true;
        }
        candi_queue = new_queue;
    }
    out_step_count = out_step_count.slice(1);
    if (out_step_count.length === 0) out_step_count = [0];
    console.log("in step, out step", in_step_count, out_step_count);
    min_step = in_step_count.length;
    out_step = out_step_count.length;
    total_step = in_step_count.reverse().concat([1].concat(out_step_count));
    
    return [min_step, out_step, total_step]
}

function get_step_count_statistic(highlights, all_graph){
        // get step_count randomly
        let in_step_count = [0, 0, 0, 0, 0];
        let out_step_count = [0, 0, 0, 0, 0];
        let highlight_nodes = highlights.map(d => all_graph[d]);
        for (let i = 0; i < highlight_nodes.length; i++){
            // in step
            let from_list = highlight_nodes[i].from;
            for(let j = 0; j < from_list.length; j++){
                in_step_count[dist_100(from_list[j])] += 1;
            }
            let to_list = highlight_nodes[i].to;
            for(let j = 0; j < to_list.length; j++){
                out_step_count[dist_100(to_list[j])] += 1;
            }
        }
        return [5, 5, in_step_count.reverse().concat([highlights.length].concat(out_step_count))];
    
}

function get_multiple_connected_path(node, all_graph, in_step, out_step, threshold){
    let path = [];
    // all_graph = DataLoader.state.complete_graph;
    // in step
    candi_queue = [node];
    for(let i = 0; i < in_step; i++){
        new_queue = [];
        for (let j = 0; j < candi_queue.length; j++){
            let n = candi_queue[j];
            let from_list = n.from;
            let from_weight = n.from_weight;
            for (let k = 0; k < from_list.length; k++){
                if (from_weight[k] > threshold[0] && from_weight[k]< threshold[1]){
                    path.push([all_graph[from_list[k]], n, from_weight[k]]);
                    new_queue.push(all_graph[from_list[k]]);
                }
            }
        }
        candi_queue = new_queue;
    }

    // out step
    candi_queue = [node];
    for(let i = 0; i < out_step; i++){
        new_queue = [];
        for (let j = 0; j < candi_queue.length; j++){
            let n = candi_queue[j];
            let to_list = n.to;
            let to_weight = n.to_weight;
            for (let k = 0; k < to_list.length; k++){
                if (to_weight[k] > threshold[0] && to_weight[k]< threshold[1]){
                    path.push([n, all_graph[to_list[k]], to_weight[k]]);
                    new_queue.push(all_graph[to_list[k]]);
                }
            }
        }
        candi_queue = new_queue;
    }

    return path;
};