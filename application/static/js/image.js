/*
* added by Changjian Chen, 20191015
* */

let ImageLayout = function (container){
    let that = this;
    that.container = container;
    that.GraphView = null;

    let bbox = that.container.node().getBoundingClientRect();
    let width = bbox.width;
    let height = bbox.height;
    let origin_layout_width = width - 20;
    let layout_width = width - 20;
    let layout_height = height - 40;
    let img_offset_x = 20;
    let img_offset_y = 10;
    let iter = 0;
    let img_padding = 10;
    let grid_size = 50;
    let grid_offset = 10;
    let detail_pos = -1;
    let state = null;
    let img_width = layout_width-img_padding * 2;
    let img_height = layout_height-img_padding*2;
    let legend_height = 25;
    let AnimationDuration = 500;
    let longAnimationDuration = 500;
    let neighbor_border = 10;
    let shortAnimationDuration = 10;
    let max_height = 525;
    let get_neighbors_url = "/info/neighbors";
    let get_label_url = "/graph/label";
    let get_entropy_url = "/graph/entropy";
    let x_grid_num = parseInt((layout_width-5)/(grid_offset+grid_size));
    let color_unlabel = UnlabeledColor;
    let color_label = CategoryColor;
    console.log("Image view", "layout width", layout_width, "layout height", layout_height);
    let showing_image = true;

    let img_url = null;
    let img_grid_urls = [];
    let img_neighbors_ids = [];
    let show_neighbor_mode = false;
    let k_num = 6;
    let current_mode = "grid";

    let data_manager = null;

    let svg = that.container.select("#info");
    let detail_group = svg.select("#detail-group");
    let img_neighbors = svg.append("g").attr("id", "neighbor-group").attr("opacity", 0);
    let img_neighbors_g = null;
    let img_grids = svg.append("g").attr("id", "grid-group");
    let img_grids_g = null;
    let use_ground_truth = false;


    that._init = function(){
        svg.select(function(){return this.parentNode}).style("height", (height-10)+"px");
        svg.attr("width", layout_width)
            .attr("height", layout_height);

        // draw img neighbor boundary
        img_neighbors.append("line")
            .attr("id", "img-neighbor-boundary")
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("opacity", 0.9);
        img_neighbors.append("text")
            .attr("x", img_padding+(grid_size+grid_offset)/2)
            .attr("y", img_padding*2)
            .attr("text-anchor", "middle")
            .text("Image");
        img_neighbors.append("text")
            .attr("x", img_padding+(grid_size+grid_offset)-5+neighbor_border)
            .attr("y", img_padding*2)
            .attr("text-anchor", "start")
            .text("Nearest Neighbors");
        set_font(img_neighbors.selectAll("text"));

        // switch event
        $("#showNearestNeighbors")
            .on("input", function (e, d) {
                if(current_mode === "grid"){
                    current_mode = "neighbor";
                }
                else if(current_mode === "neighbor"){
                    current_mode = "grid";
                }
                that.switch_show_mode(current_mode);
            })
    };

    that.set_data_manager = function(_data_manager) {
        data_manager = _data_manager;
    };

    that.component_update = async function(state) {
        console.log("image component update:", state);
        state.img_grid_urls = state.img_grid_urls.filter(d => [91, 11779, 5882].indexOf(d.id)===-1);
        let new_ids = state.img_grid_urls.map(d => d.id);
        let old_ids = img_grid_urls.map(d => d.id);
        if(state.sort){
            new_ids.sort((a, b) => a-b);
            old_ids.sort((a, b) => a-b);
        }

        if(new_ids+'' === old_ids+'' && (!state.re_fetch)) return ;


        await that._update_data(state);
        if(img_url !== undefined && img_url !== null){
            detail_pos = -1;
            // AnimationDuration = shortAnimationDuration;
            that._show_detail(img_url, img_grid_urls.length);
        }
        else {
            that._show_detail(null, -1);
        }
        await that._update_view();
    };

    that._update_data = async function(state) {
        // console.log("image layout data:", state);
        if(state.img_grid_urls.length < 0 ){
            img_url = state.img_grid_urls[0];
            while (img_grid_urls.length>0) img_grid_urls.pop();
        }
        else{
            img_url = null;
            while (img_grid_urls.length>0) img_grid_urls.pop();
            for(let url of state.img_grid_urls){
                img_grid_urls.push(url)
            }
        }
        let ids = img_grid_urls.reduce(function (acc, url) {
            acc.push(url.id);
            return acc;
        }, []);
        await that.get_img_entropy(ids);
        if(state.sort){
            img_grid_urls.sort(function (a, b) {
            return b.entropy - a.entropy;
        });
        }

        console.log("sorted urls:", img_grid_urls);
        ids = img_grid_urls.reduce(function (acc, url) {
            acc.push(url.id);
            return acc;
        }, []);
        console.log("sorted ids:", ids);
        await that.get_neighbors_data(ids);
        await that.get_image_label(img_neighbors_ids.reduce(function (acc, url) {
            acc.push(url.id);
            return acc;
        }, []))
    };

    that._update_view =async function() {
        let neighbor_row_num = k_num+1;
        layout_width = parseFloat(svg.attr("width")) - 20;
        // img_width = layout_width-img_padding * 2;
        let img_size = 250;
        let container_height = -1;
        if(show_neighbor_mode){
            let height = legend_height + img_padding*2+Math.floor((img_neighbors_ids.length-1)/x_grid_num+1)*(grid_size+grid_offset)+img_size;
            container_height = Math.min(height, max_height);
            svg.attr("height", height);
            svg.attr("width", img_padding*2 + (neighbor_row_num)*(grid_size+grid_offset)-2 + (i%neighbor_row_num===0?0:8));
            $("#info-div").css("width", "100%");
        }
        else {

            svg.attr("width", origin_layout_width);
            layout_width = parseFloat(svg.attr("width")) - 20;
            // img_width = layout_width-img_padding * 2;
            // img_size = img_width>img_height?img_height:img_width;
            let height = img_padding*2+Math.floor((img_grid_urls.length-1)/x_grid_num+1)*(grid_size+grid_offset)+img_size;
            container_height = Math.min(height, max_height);
            svg.attr("height", height);
        }
        // $(".info-svg-div").css("height", container_height+"px");
        // $("#image-row .content-container").css("height", (container_height+30)+"px");


        if(show_neighbor_mode){
            that.clear_show_grid_data();
        }
        else {
            that.clear_show_neighbors_data();
        }
        that._create();
        that._update();
        that._remove();
        if(show_neighbor_mode){
            console.log("visible");
            setTimeout(function () {
                $("#image-row .simplebar-horizontal").css("visibility", "visible");
            }, 500);
        }
        else {
            console.log("hidden");
            setTimeout(function () {
                $("#image-row .simplebar-horizontal").css("visibility", "hidden");
            }, 500);
        }
    };

    that._show_detail = function (d, i) {
        if(i===-1){
            detail_pos = -1;
            detail_group.style("opacity", 0);
            showing_image = false;
            return;
        }
        showing_image = true;
                img_url = d;
                console.log("show detail:", img_url);
                layout_width = parseFloat(svg.attr("width"));
                let img_width = x_grid_num*(grid_size+grid_offset)-grid_offset-img_padding*2;
                let img_size = 250;
                let x_padding = (layout_width-img_size)/2;
                if (detail_pos === -1) {
                    detail_pos = i;
                    detail_group.transition()
                        .duration(AnimationDuration)
                        .style("opacity", 1);
                    detail_group.select("image")
                        .attr("xlink:href", img_url.url)
                        .attr("x", img_padding)
                        .attr("y", img_padding+(Math.floor(i/x_grid_num)+1)*(grid_size+grid_offset))
                        .attr("width", 0)
                        .attr("height", 0)
                        .transition()
                        .duration(AnimationDuration)
                        .attr("x", x_padding)
                        .attr("y", img_padding+(Math.floor(i/x_grid_num)+1)*(grid_size+grid_offset))
                        .attr("width", img_size)
                        .attr("height", img_size);
                    that._update_view();
                } else if (detail_pos === i) {
                    detail_pos = -1;
                    detail_group.transition()
                        .duration(AnimationDuration)
                        .style("opacity", 0);
                    detail_group.select("image")
                        .transition()
                        .duration(AnimationDuration)
                        .attr("x", x_padding)
                        .attr("y", img_padding+(Math.floor(i/x_grid_num)+1)*(grid_size+grid_offset))
                        .attr("width", 0)
                        .attr("height", 0);
                    that._update_view();
                } else {
                    detail_pos = i;
                    detail_group.transition()
                        .duration(AnimationDuration)
                        .style("opacity", 1);
                    detail_group.select("image")
                        .attr("xlink:href", img_url.url)
                        .transition()
                        .duration(AnimationDuration)
                        .attr("x", x_padding)
                        .attr("y", img_padding+(Math.floor(i/x_grid_num)+1)*(grid_size+grid_offset))
                        .attr("width", 0)
                        .attr("height", 0)
                        .on("end", function () {
                            let image = d3.select(this);
                            image.remove();
                        });
                    detail_group.append("image")
                        .attr("xlink:href", img_url.url)
                        .attr("x", img_padding)
                        .attr("y", img_padding+(Math.floor(i/x_grid_num)+1)*(grid_size+grid_offset))
                        .attr("width", 0)
                        .attr("height", 0)
                        .transition()
                        .duration(AnimationDuration)
                        .attr("x", x_padding)
                        .attr("y", img_padding+(Math.floor(i/x_grid_num)+1)*(grid_size+grid_offset))
                        .attr("width", img_size)
                        .attr("height", img_size);
                    that._update_view();
                }
            };

    that._create = function() {
        AnimationDuration = longAnimationDuration;
        img_grids_g =  img_grids.selectAll(".grid-image")
            .data(img_grid_urls);
        img_grids.selectAll("image").data(img_grid_urls);
        img_grids.selectAll("rect").data(img_grid_urls);
        let img_grids_enters = img_grids_g.enter()
            .append("g")
            .attr("class", "grid-image")
            .attr("transform", "translate(0,0)");

        img_grids_enters.append("image")
            .attr("xlink:href", d => d.url)
            .attr("x", (d, i) => img_padding+(i%x_grid_num)*(grid_size+grid_offset))
            .attr("y", (d, i) => img_padding+Math.floor(i/x_grid_num)*(grid_size+grid_offset))
            .attr("width", grid_size)
            .attr("height", grid_size);

        img_grids_enters.append("rect")
            .attr("x", (d, i) => img_padding+(i%x_grid_num)*(grid_size+grid_offset)-2)
            .attr("y", (d, i) => img_padding+Math.floor(i/x_grid_num)*(grid_size+grid_offset)-2)
            .attr("width", grid_size+4)
            .attr("height", grid_size+4)
            .attr("stroke-width", 4)
            .attr("stroke", function (d) {
                if(use_ground_truth) return color_label[d.truth];
                if(d.label[iter] === -1) return color_unlabel;
                    else return color_label[d.label[iter]];
            })
            .attr("fill-opacity", 0)
            .on("mouseenter", function (d) {
                if(!show_neighbor_mode)
                    GraphView.highlight_nodes(d.id)
            } )
            .on("mouseout", function (d) {
                if(!show_neighbor_mode)
                    GraphView.remove_node_highlight()
            })
            .on("click", function (d, i) {
                if(!show_neighbor_mode)
                    that._show_detail(d, i);
                // return color_unlabel;
                // // TODO get label from back-end
                // let node = d.node.datum();
                // if(node.label[iter] === -1) return color_unlabel;
                //     else return color_label[node.label[iter]];
            });

        img_neighbors_g = img_neighbors.selectAll(".neighbor-image")
            .data(img_neighbors_ids);
        img_neighbors.selectAll("image").data(img_neighbors_ids);
        img_neighbors.selectAll("rect").data(img_neighbors_ids);
        let img_neighbors_enters = img_neighbors_g.enter()
            .append("g")
            .attr("class", "neighbor-image")
            .attr("transform", "translate(0,0)");

        let neighbor_row_num = k_num+1;
        img_neighbors_enters.append("image")
            .attr("xlink:href", d => d.url)
            .attr("x", (d, i) => img_padding+(i%neighbor_row_num)*(grid_size+grid_offset) + (i%neighbor_row_num===0?0:neighbor_border))
            .attr("y", (d, i) => legend_height + img_padding+Math.floor(i/neighbor_row_num)*(grid_size+grid_offset))
            .attr("width", grid_size)
            .attr("height", grid_size);

        img_neighbors_enters.append("rect")
            .attr("x", (d, i) => img_padding+(i%neighbor_row_num)*(grid_size+grid_offset)-2 + (i%neighbor_row_num===0?0:neighbor_border))
            .attr("y", (d, i) => legend_height + img_padding+Math.floor(i/neighbor_row_num)*(grid_size+grid_offset)-2)
            .attr("width", grid_size+4)
            .attr("height", grid_size+4)
            .attr("stroke-width", 4)
            .attr("stroke", function (d) {
                if(use_ground_truth) return color_label[d.truth];
                if(d.label[iter] === -1) return color_unlabel;
                    else return color_label[d.label[iter]];
            })
            .attr("fill-opacity", 0)
            .on("click", function (d, i) {
                // that._show_detail(d, i);
                // return color_unlabel;
                // // TODO get label from back-end
                // let node = d.node.datum();
                // if(node.label[iter] === -1) return color_unlabel;
                //     else return color_label[node.label[iter]];
            });

    };

    that._update = function() {
        let img_size = 250;
        img_grids_g.selectAll("image")
            .attr("xlink:href", d => d.url);

        img_grids_g.selectAll("rect")
            .transition()
            .duration(AnimationDuration)
            .attr("stroke", function (d) {
                if(use_ground_truth) return color_label[d.truth];
                if(d.label[iter] === -1) return color_unlabel;
                    else return color_label[d.label[iter]];
            });

        // img_grids_g.select("rect")
        //     .attr("stroke", function (d) {
        //
        //         });

        img_grids_g
            .transition()
            .duration(AnimationDuration)
            .attr("transform", (d, i) => "translate(" + 0 + ", " +
                ((detail_pos !== -1 && Math.floor(i / x_grid_num) >  Math.floor(detail_pos / x_grid_num)) * (img_padding*3+img_size)) + ")");

        let neighbor_row_num = k_num+1;
        img_neighbors_g.selectAll("image")
            .attr("xlink:href", d => d.url);

        img_neighbors_g
            .transition()
            .duration(AnimationDuration)
            .attr("transform", (d, i) => "translate(" + 0 + ", " +
                ((detail_pos !== -1 && Math.floor(i / neighbor_row_num) >  Math.floor(detail_pos / neighbor_row_num)) * (img_padding*3+img_size)) + ")");

        img_neighbors_g.selectAll("rect")
            .transition()
            .duration(AnimationDuration)
            .attr("stroke", function (d) {
                if(use_ground_truth) return color_label[d.truth];
                if(d.label[iter] === -1) return color_unlabel;
                    else return color_label[d.label[iter]];
            })

    };

    that._remove = function() {
        img_grids_g
            .exit()
            .remove();

        img_neighbors_g
            .exit()
            .remove();
    };

    that.setIter = function(newiter){
        iter = newiter;
        that._update_view();
    };

    that.clear_show_grid_data = function(){
        return new Promise((resolve, reject) => {

            layout_width = parseFloat(svg.attr("width")) - 20;
            img_width = layout_width-img_padding * 2;
            let img_size = img_width>img_height?img_height:img_width;
            detail_group
                .transition()
                .duration(AnimationDuration)
                .style("opacity", 0);
            img_grids
                .transition()
                .duration(AnimationDuration)
                .attr("opacity", 0)
                .on("end", resolve);
            img_neighbors
                .transition()
                .duration(AnimationDuration)
                .attr("opacity", 1)
                .on("end", resolve);
            img_neighbors.select("#img-neighbor-boundary")
                .attr("x1", img_padding+(grid_size+grid_offset)-5+neighbor_border/2)
                .attr("x2", img_padding+(grid_size+grid_offset)-5+neighbor_border/2)
                .attr("y1", img_padding+legend_height)
                .attr("y2", legend_height + img_padding+Math.floor((img_neighbors_ids.length-1)/(k_num+1)+1)*(grid_size+grid_offset)-9)
        })
    };

    that.clear_show_neighbors_data = function() {
        return new Promise((resolve, reject) => {
            if(showing_image) {
                detail_group
                .transition()
                .duration(AnimationDuration)
                .style("opacity", 1);
            }
            img_neighbors
                .transition()
                .duration(AnimationDuration)
                .attr("opacity", 0)
                .on("end", resolve);
            img_grids
                .transition()
                .duration(AnimationDuration)
                .attr("opacity", 1)
                .on("end", resolve);
        })
    };

    that.get_neighbors_data = function(img_ids) {
        return new Promise(function (resolve, reject) {
            $.post(get_neighbors_url, {
                img_ids:JSON.stringify(img_ids),
                k:k_num
            },function (d) {
                let neighbors = d;
                for(let idx=0; idx<neighbors.length; idx++){
                    neighbors[idx].unshift(img_ids[idx]);
                    for(let i=0; i<neighbors[idx].length; i++){
                        let id = neighbors[idx][i];
                        neighbors[idx][i] = {
                            url:data_manager.image_url + "?filename=" + id + ".jpg",
                            id:id,
                        }
                    }
                }
                img_neighbors_ids = [];
                for(let neighbor of neighbors){
                    img_neighbors_ids = img_neighbors_ids.concat(neighbor)
                }
                console.log("Get neighbors:", img_neighbors_ids);
                resolve();
            })
        })
    };

    that.get_img_entropy = function(img_ids) {
        return new Promise(function (resolve, reject) {
            $.post(get_entropy_url, {
                img_ids:JSON.stringify(img_ids)
            },function (d) {
                let entropys = d;
                for(let idx=0; idx<entropys.length; idx++){
                    img_grid_urls[idx].entropy = entropys[idx];
                }
                console.log("Get entropys:", img_grid_urls);
                resolve();
            })
        })
    };

    that.get_image_label = function(img_ids) {
        return new Promise(function (resolve, reject) {
            $.post(get_label_url, {
                img_ids:JSON.stringify(img_ids),
            }, function (d) {
                for(let row_idx=0; row_idx<img_grid_urls.length; row_idx++){
                    for(let i=0; i<k_num+1; i++){
                        let j = row_idx*(k_num+1)+i;
                        if(i === 0){
                            img_grid_urls[row_idx].label = d[j].label;
                            img_grid_urls[row_idx].truth = d[j].truth;
                        }
                        img_neighbors_ids[j].label = d[j].label;
                        img_neighbors_ids[j].truth = d[j].truth;
                    }
                }
                resolve();
            })
        })
    };

    that.switch_show_mode = function(mode) {
        if(mode === "grid") {
            show_neighbor_mode = false;
            that._update_view();
        }
        else if (mode === "neighbor"){
            show_neighbor_mode = true;
            that._update_view();
        }
    };

    that.if_show_ground_truth = function(flag) {
        use_ground_truth = flag;
        that._update_view();
    };

    that.init = function(){
        that._init();
    }.call();

};
