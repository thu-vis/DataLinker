/*
    default: binary type request
 */

var request_node = function (url, callback, type, method, headers, children, parents, data) {
    var myChildren = children || [];
    var myParents = parents || [];
    var myHeaders = headers || {
            "cache-control": "no-cache"
    };
    var myURL = url || "";
    var myMethod = method || "GET";
    var myType = type || "arraybuffer";
    var myStatus = "pending";
    var myData = data || "";
    // sleeping & pending & ready

    this.ready = function () {
        return myStatus === "ready";
    };

    this.pending = function() {
        return myStatus === "pending";
    };

    this.set_pending = function(){
        myStatus = "pending";
    };

    this.set_off = function() {
        myStatus = "sleeping";
    };

    this.set_on = function() {
        for (var i = 0; i < myParents.length; i ++) {
            if (!myParents[i].ready()) {
                myStatus = "pending";
                return;
            }
        }
        this.notify();
    };

    this.set_url = function(url) {
        myURL = url;
    };

    this.set_handler = function(handler) {
        callback = handler;
    };

    this.set_header = function(header){
       myHeaders = header;
    };

    this.set_data = function(data){
        myData = data;
    };

    this._add_parent = function (p) {
        myParents.push(p);
    };

    this._add_child = function (c) {
        myChildren.push(c);
    };

    this.set_url = function (url) {
        myURL = url;
    };

    this.depend_on = function (n) {
        myParents.push(n);
        n._add_child(this);
        return this;
    };

    this.clean_dependence = function(){
        myParents = [];
    };

    this.notify = function () {
        for (var i = 0; i < myParents.length; i ++) {
            if (!myParents[i].ready()) {
                return;
            }
        }
        var oReq = new XMLHttpRequest();
        // console.log(myURL);
        oReq.open(myMethod, myURL, true);
        oReq.responseType = myType;
        for (var key in myHeaders) {
            if (myHeaders.hasOwnProperty(key)) {
                oReq.setRequestHeader(key, myHeaders[key]);
            }
        }

        oReq.onload = function (oEvent) {
            callback(oReq.response);
            myStatus = "ready";
            //Modified by Weihao
            setTimeout(function () {
                for (let i = 0; i < myChildren.length; i ++) {
                    if (myChildren[i].pending())
                        myChildren[i].notify();
                }
            }, 0)
        };
        oReq.send(JSON.stringify(myData));

        return this;
    };
};
