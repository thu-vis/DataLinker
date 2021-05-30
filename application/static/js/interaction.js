/*
* added by Changjian Chen, 20200107
* */

function update_k(){
    let k = $("#global-k").slider("getValue");
    DataLoader.update_k(k);
}

function local_update_k(){
    DataLoader.local_update_k();
}

function add_data(){
    let data_num = $("#add-data").slider("getValue");
    DataLoader.add_data(data_num);
};

function update_filter_threshold(threshold){
    DataLoader.update_filter_threshold(threshold);
}

function change_dist_mode(){
    console.log("change_dist_mode exp");
    DataLoader.change_dist_mode();
    if (DataLoader.state.dist_mode){
        d3.select("#switch-label").text("Display all");
    }
    else{
        d3.select("#switch-label").text("Display changes only");
    }
}

function reset_spinner(){
    console.log("reset spinner");
    d3.select("#localk-button").select("use").attr("xlink:href", "#static-localk-icon");
    d3.select("#setk-button").select("use").attr("xlink:href", "#static-setk-icon");
    d3.select("#loaddataset-button").select("use").attr("xlink:href", "#static-upload-icon");
}

function add_new_categories(name, idxs){
    DataLoader.add_new_categories(name, idxs);
}