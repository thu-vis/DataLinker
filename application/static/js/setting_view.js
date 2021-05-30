let SettingLayout = function () {
    let that = this;
    // ui
    let dataset_selection_util = null;
    let form = null;
    let pulldown_id = "#pulldown";
    let update_k_btn = null;
    let now_dataset = null;
    let rangeSlider = null;
    let slider = null;
    let range = null;
	let value = null;
	
	let rect_width = 18;

    let k = 0;
	let AnimationDuration = 1000;
	
	that.check_list = [];
	that.k = 0;
	that.local_range = [];

	let svg = d3.select("#categories-checkbox");

	let data_manager = null;

    that._init = function () {
		dataset_selection_util = {
	f: {
		addStyle: function (elem, prop, val, vendors) {
			var i, ii, property, value
			if (!dataset_selection_util.f.isElem(elem)) {
				elem = document.getElementById(elem)
			}
			if (!dataset_selection_util.f.isArray(prop)) {
				prop = [prop]
				val = [val]
			}
			for (i = 0; i < prop.length; i += 1) {
				var thisProp = String(prop[i]),
					thisVal = String(val[i])
				if (typeof vendors !== "undefined") {
					if (!dataset_selection_util.f.isArray(vendors)) {
						vendors.toLowerCase() == "all" ? vendors = ["webkit", "moz", "ms", "o"] : vendors = [vendors]
					}
					for (ii = 0; ii < vendors.length; ii += 1) {
						elem.style[vendors[i] + thisProp] = thisVal
					}
				}
				thisProp = thisProp.charAt(0).toLowerCase() + thisProp.slice(1)
				elem.style[thisProp] = thisVal
			}
		},
		cssLoaded: function (event) {
			var child = dataset_selection_util.f.getTrg(event)
			child.setAttribute("media", "all")
		},
		events: {
			cancel: function (event) {
				dataset_selection_util.f.events.prevent(event)
				dataset_selection_util.f.events.stop(event)
			},
			prevent: function (event) {
				event = event || window.event
				event.preventDefault()
			},
			stop: function (event) {
				event = event || window.event
				event.stopPropagation()
			}
		},
		getSize: function (elem, prop) {
			return parseInt(elem.getBoundingClientRect()[prop], 10)
		},
		getTrg: function (event) {
			event = event || window.event
			if (event.srcElement) {
				return event.srcElement
			} else {
				return event.target
			}
		},
		isElem: function (elem) {
			return (dataset_selection_util.f.isNode(elem) && elem.nodeType == 1)
		},
		isArray: function(v) {
			return (v.constructor === Array)
		},
		isNode: function(elem) {
			return (typeof Node === "object" ? elem instanceof Node : elem && typeof elem === "object" && typeof elem.nodeType === "number" && typeof elem.nodeName==="string" && elem.nodeType !== 3)
		},
		isObj: function (v) {
			return (typeof v == "object")
		},
		replaceAt: function(str, index, char) {
			return str.substr(0, index) + char + str.substr(index + char.length);
		}
	}
};

		form = {
f: {
	init: {
		register: function () {
			var child, children = document.getElementsByClassName("field"), i
			for (i = 0; i < children.length; i += 1) {
				child = children[i]
				dataset_selection_util.f.addStyle(child, "Opacity", 1)
			}
			children = document.getElementsByClassName("psuedo_select")
			for (i = 0; i < children.length; i += 1) {
				child = children[i]
				child.addEventListener("click", form.f.select.toggle)
			}
		},
		unregister: function () {
			//just here as a formallity
			//call this to stop all ongoing timeouts are ready the page for some sort of json re-route
		}
	},
	select: {
		blur: function (field) {
			field.classList.remove("focused")
			var child, children = field.childNodes, i, ii, nested_child, nested_children
			for (i = 0; i < children.length; i += 1) {
				child = children[i]
				if (dataset_selection_util.f.isElem(child)) {
					if (child.classList.contains("deselect")) {
						child.parentNode.removeChild(child)
					} else if (child.tagName == "SPAN") {
						if (!field.dataset.value) {
							dataset_selection_util.f.addStyle(child, ["FontSize", "Top"], ["16px", "32px"])
						}
					} else if (child.classList.contains("psuedo_select")) {
						nested_children = child.childNodes
						for (ii = 0; ii < nested_children.length; ii += 1) {
							nested_child = nested_children[ii]
							if (dataset_selection_util.f.isElem(nested_child)) {
								if (nested_child.tagName == "SPAN") {
									if (!field.dataset.value) {
										dataset_selection_util.f.addStyle(nested_child, ["Opacity", "Transform"], [0, "translateY(24px)"])
									}
								} else if (nested_child.tagName == "UL") {
										dataset_selection_util.f.addStyle(nested_child, ["Height", "Opacity"], [0, 0])
								}
							}
						}
					}
				}
			}
		},
		focus: function (field) {
			field.classList.add("focused")
			var bool = false, child, children = field.childNodes, i, ii, iii, nested_child, nested_children, nested_nested_child, nested_nested_children, size = 0
			for (i = 0; i < children.length; i += 1) {
				child = children[i]
				dataset_selection_util.f.isElem(child) && child.classList.contains("deselect") ? bool = true : null
			}
			if (!bool) {
				child = document.createElement("div")
				child.className = "deselect"
				child.addEventListener("click", form.f.select.toggle)
				field.insertBefore(child, children[0])
			}
			for (i = 0; i < children.length; i += 1) {
				child = children[i]
				if (dataset_selection_util.f.isElem(child) && child.classList.contains("psuedo_select")) {
					nested_children = child.childNodes
					for (ii = 0; ii < nested_children.length; ii += 1) {
						nested_child = nested_children[ii]
						if (dataset_selection_util.f.isElem(nested_child) && nested_child.tagName == "UL") {
							size = 0
							nested_nested_children = nested_child.childNodes
							for (iii = 0; iii < nested_nested_children.length; iii += 1) {
								nested_nested_child = nested_nested_children[iii]
								if (dataset_selection_util.f.isElem(nested_nested_child) && nested_nested_child.tagName == "LI") {
									size += dataset_selection_util.f.getSize(nested_nested_child, "height")
								}
							}
							dataset_selection_util.f.addStyle(nested_child, ["Height", "Opacity"], [size + "px", 1])
						}
					}
				}
			}
		},
		selection: function (child, parent) {
			var children = parent.childNodes, i, ii, nested_child, nested_children, time = 0, value
			if (dataset_selection_util.f.isElem(child) && dataset_selection_util.f.isElem(parent)) {
				parent.dataset.value = child.dataset.value
				value = child.innerHTML
			}
			for (i = 0; i < children.length; i += 1) {
				child = children[i]
				if (dataset_selection_util.f.isElem(child)) {
					if (child.classList.contains("psuedo_select")) {
						nested_children = child.childNodes
						for (ii = 0; ii < nested_children.length; ii += 1) {
							nested_child = nested_children[ii]
							if (dataset_selection_util.f.isElem(nested_child) && nested_child.classList.contains("selected")) {
								if (nested_child.innerHTML)  {
									time = 1E2
									dataset_selection_util.f.addStyle(nested_child, ["Opacity", "Transform"], [0, "translateY(24px)"], "all")
								}
								setTimeout(function (c, v) {
									c.innerHTML = v
									dataset_selection_util.f.addStyle(c, ["Opacity", "Transform", "TransitionDuration"], [1, "translateY(0px)", ".1s"], "all")
								}, time, nested_child, value)
							}
						}
					} else if (child.tagName == "SPAN" && child.className !== "pulldown-icon") {
						console.log(child.tagName);
						dataset_selection_util.f.addStyle(child, ["FontSize", "Top"], ["12px", "8px"])
				   }
			   }
			}
		},
		toggle: function (event) {
			dataset_selection_util.f.events.stop(event)
			var child = dataset_selection_util.f.getTrg(event), children, i, parent
			if($(child).attr("class") === "option"){
				that.choose($(child).attr("id"));
			}
			switch (true) {
				case (child.classList.contains("psuedo_select")):
				case (child.classList.contains("deselect")):
					parent = child.parentNode
					break
				case (child.classList.contains("options")):
					parent = child.parentNode.parentNode
					break
				case (child.classList.contains("option")):
					parent = child.parentNode.parentNode.parentNode
					form.f.select.selection(child, parent)
					break
			}
			parent.classList.contains("focused") ? form.f.select.blur(parent) : form.f.select.focus(parent)
		}
	}
}};

		form.f.init.register();

		// add data
		$("#add-data").slider(
			{ 
				id: "slider0", 
				min: 1, 
				max: 2000, 
				range: false, 
				value: 500
			});
		$("#add-data").on("slide", function(slideEvt) {
			$("#data-num").text(slideEvt.value);
		}); 


		// global slider
		$("#global-k").slider(
			{ 
				id: "slider1", 
				min: 1, 
				max: 9, 
				range: false, 
				value: 3
			});
		$("#global-k").on("slide", function(slideEvt) {
			$("#k-value").text(slideEvt.value);
		}); 

		// local slider
		$("#local-k").slider(
			{ 
				id: "slider2",
				min: 1,
				max: 50,
				range: true, 
				value: [1,4]
			});
		$("#setk-button").on("click", function(slideEvt){
			d3.select(this).select("use").attr("xlink:href", "#animate-setk-icon")
		});

		$("#local-k").on("slide", function(slideEvt){
			let v = slideEvt.value;
			$("#k-range").text("[" + v[0] + "," + v[1] + "]");
		})
		
		$('#localk-button').on('click', function() {
			d3.select(this).select("use").attr("xlink:href", "#animate-localk-icon")
		});

		$('#loaddataset-button').on('click', function() {
			d3.select(this).select("use").attr("xlink:href", "#animate-update-icon")
		});

	};
	
    that.component_update = async function(state) {
        console.log("get setting state:", state);
        that._update_data(state);
        that._update_view();
	};
	
	that._update_data = function(state){
		let label_num = state.label_names.length;
		that.check_list = new Array(label_num).fill(1);
		console.log("check_list", that.check_list);
	};

	that._update_view = function(){
		that._create();
		that._update();
		that._remove();
	};

	that._create = function(){
		// let groups = svg.selectAll("g")
		// 	.data(that.check_list)
		// 	.enter()
		// 	.append("g")
		// 	.attr("transform", (d,i) => "translate("+ (rect_width * 1.1 * i) + 
		// 		"," + (30 - rect_width / 2) +")")
		// 	.on("click", function(d, i){
		// 		that.check_list[i] = !that.check_list[i];
		// 		d3.select(this)
		// 			.select("rect")
		// 			.attr("fill", that.check_list[i] ? CategoryColor[i] : "white");
		// 	});
		// groups.append("rect")
		// 	.attr("x", 0)
		// 	.attr("y", 0)
		// 	.attr("width", rect_width)
		// 	.attr("height", rect_width)
		// 	.attr("rx", rect_width / 4)
		// 	.attr("ry", rect_width / 4)
		// 	.attr("fill", (d,i) => that.check_list[i] ? CategoryColor[i] : "white")
		// 	.attr("stroke", (d,i) => CategoryColor[i]);
		// groups.append("text")
		// 	.style("stroke", "white")
		// 	.style("fill", "white")
		// 	.attr("text-anchor", "middle")
		// 	.attr("x", rect_width / 2)
		// 	.attr("y", rect_width / 2 + 6)
		// 	.text("\u2714");
	};

	that._update = function(){
		// let groups = svg.selectAll("g")
		// 	.data(that.check_list)
		// 	.attr("transform", (d,i) => "translate("+ (rect_width * 1.1 * i) + 
		// 		"," + (30 - rect_width / 2) +")");
	};

	that._remove = function(){
		// let groups = svg.selectAll("g")
		// 	.data(that.check_list)
		// 	.exit();

		// groups.remove();
	};


    that.choose = function (dataset){
    	if(dataset === now_dataset) return;
    	now_dataset = dataset;
    	$(".pulldown-dataset").click();
    	$("#"+dataset).click();
    	choose(dataset);
	};


    that.setk_ui = function(k) {
		$("#global-k").slider("setValue", k, true);
	};

	that.get_local_update_setting = function(){
		let range = $("#local-k").slider("getValue");
		return {
			range: range,
			selected_categories: that.check_list
		}
	};

    that.init = function () {
        that._init();
	}.call();
	
	that.set_data_manager = function(new_data_manager){
        that.data_manager = new_data_manager;
	}
};