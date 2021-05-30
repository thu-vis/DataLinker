/*
* added by Changjian Chen, 20191015
* */

let MatrixLayout = function (container){
    let that = this;
    that.container = container;

    let bbox = that.container.node().getBoundingClientRect();
    let width = bbox.width;
    let height = bbox.height;
    let layout_width = width - 20;
    let layout_height = height - 20;
    console.log("GraphLayout", "layout width", layout_width, "layout height", layout_height);

    let data_manager = null;

    that._init = function(){

    };

    that.set_data_manager = function(_data_manager){
        data_manager = _data_manager;
    };

    that.component_update = function(state){
        console.log("graph component update");
        that._update_data(data);
        that._update_view();
    };

    that._update_data = function(state){

    };

    that._update_view = function(){

    };

    that.init = function(){
        that._init();
    }.call();

};

