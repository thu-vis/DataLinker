/*
* added by Changjian Chen, 20191015
* */

/*
    System information
*/
let ManifestApi = "/api/manifest";


/*
*  View Object
* */
let ConceptGraphView = null;
let FilterView = null;
let InstanceView = null;
let SearchView = null;

/*
    Const variables for data storage
*/
let DatasetName = null;
let DataLoader = null;
let GraphView = null;
let LossView = null;
let ImageView = null;
let HistoryView = null;
let EditView = null;
let SettingView = null;

let DataName = null;
debug = false;
/*
*  Color
* */
// let CategoryColor = [
//     "#4fa7ff",
//     "#ffa953",
//     "#55ff99",
//     "#ba9b96",
//     "#c982ce",
//     "#bcbd22",
//     "#e377c2",
//     "#990099",
//     "#17becf",
//     "#8c564b"
// ];


// stl
let CategoryColor_stl = [
    "#8c564b",
    "#ff7f0e",
    "#9467bd",
    "#d62728",
    "#1f77b4",
    "#2ca02c",
    "#e377c2",
    "#ffdb45",
    "#bcbd22",
    "#17becf",
    "#a6cee3"];


let CategoryColor = CategoryColor_stl;

// oct
let CategoryColor_oct = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#8c564b",
    "#17becf",
    "#e377c2",
    "#ffdb45",
    "#bcbd22",
    "#9467bd"];

let set_color = function(){
    if(DataName === "stl"){
        CategoryColor = CategoryColor_stl;
    }
    else{
        CategoryColor = CategoryColor_oct;
    }
}

    // "#a6cee3",
    // "#b2df8a"];

// let CategoryColor = ["#a6cee3",
//     "#1f78b4",
//     "#b2df8a",
//     "#33a02c",
//     "#fb9a99",
//     "#e31a1c",
//     "#fdbf6f",
//     "#ff7f00",
//     "#cab2d6",
//     "#6a3d9a",
//     "#ffff99",
// //     "#b15928"];

let UnlabeledColor = "#A9A9A9";

// 蓝色
// ["#deebf7",
// "#60a9ce",
// "#225982"],

// 橙色
//     ["#fef2e6",
//     "#fd9036",
//     "#f36c29"]

// ["#dfefff",
// "#4fa7ff",
// "#0063c6"], //蓝色
//
// ["#ffe5cc",
// "#ffa953",
// "#cc6600"], // 橙色； shixia


let CategorySequentialColor = [
    ["#c8e3ff",
        "#4fa7ff",
        "#0063c6"], //蓝色

    ["#ffe5cc",
        "#ffa953",
        "#cc6600"], //

    ["#bfffd9",
        "#22ff7a",
        "#00993e"], //

    ["#e6dbd9",
        "#ba9b96",
        "#7a5650"], //

    ["#ecd3ed",
        "#c982ce",
        "#8b3892"], //
];

let ThemeColor = "#9bcbff";
let Gray = "#a8a8a8";
let testColor = "#7f7f7f";
let FontColor = "#333333";

/*
    variables that debug needed
*/
AnimationDuration = 1500;


/*
    Keyboard status
 */
let ControlPressed = false;


let ClickFlag = null;

let introStart = function () {
    // init
    //// dist-view rect
    d3.select("#loss-view-svg #node_group").append("g").attr("id", "node-4-g");
    let nodes = d3.selectAll("#loss-view-svg *[id^='node-4']");
    let nodeG = d3.select("#node-4-g");
    for(let node of nodes.nodes()) {
        nodeG.node().appendChild(node.cloneNode(true))
    }
    //// dist-view links
    d3.select("#loss-view-svg #link_group").append("g").attr("id", "link-3-g");
    let links = d3.selectAll("#loss-view-svg *[id^='link-3']");
    let linkG = d3.select("#link-3-g");
    ////fixed position
    $("#main-row").css("position", "fixed");
    $("#filter-panel .content-container").css("height", '619px');
    $("#my-graph-all").css("height", '810px');

    for(let node of links.nodes()) {
        linkG.node().appendChild(node.cloneNode(true))
    }

    introJs().onbeforeexit(function () {
        nodeG.remove();
        linkG.remove();
      return true;
    })
        .setOptions({
      steps: [
          {
            element: document.querySelector('#dist-row'),
            intro: 'This is the Label Change view to show label changes as an evolving river.'
          },
          {
              element: document.querySelector('#graph-row'),
              intro: 'This is the Sample view to display samples as a combination of a scatterplot, a node-link diagram, and a bar chart.'
          },
          {
              element: document.querySelector('#filter-panel'),
              intro: 'Filtering panel helps focus on nodes and edges of interest.'
          },
          {
              element: document.querySelector('#history-row'),
              intro: 'The Action Trail records the modification history.'
          },
          {
              element: document.querySelector('#image-row'),
              intro: 'Information view shows the images of selected samples and their nearest neighbors.'
          },
          {
              element: document.querySelector('#node-4-g'),
              intro: 'The interactive graph construction usually start from the Label Change view.\n' +
                  'A stacked bar represents the distribution of samples among classes at this iteration.\n' +
                  'The bar color indicates the class, and the bar height encodes the number of samples.\n'
          },
          {
              element: document.querySelector('#link-3-g'),
              intro: 'Connections between stacked bars represent the exchange of samples, and the width of the connection encodes the number of samples.'
          },
          {
              title: '',
              intro: 'You can click bars or connections to select corresponding samples in the Sample view.'
          },
          {
              element: document.querySelector('#graph-view-svg'),
              intro: 'In the Sample view, each dot represents a sample. Colors indicate the classes.'
          },
          {
              element: document.querySelector('#explore-btns'),
              intro: 'You can zoom in/out to explore the data distribution.'
          },
          {
              element: document.querySelector('#lasso-btn'),
              intro: 'Select samples to inspect their edges.'
          },
          {
              element: document.querySelector('#show-voronoi'),
              intro: 'Enable the Voronoi-based partition to explore the edge distribution.'
          },
          {
              element: document.querySelector('#sample-filter'),
              intro: 'You can filter samples by the checkboxes and sliders.'
          },
          {
              element: document.querySelector('#remove-nodes'),
              intro: 'When you identify problematic samples, you can right click to label them or click the “trash” bottom to delete them.'
          },
          {
              element: document.querySelector('#parameter-tune'),
              intro: 'You can also modify the global or local k values.'
          },
          {
              title: '',
              intro: 'When you make some modifications, you can update the model.'
          }]
    }).start();
};

$(".help").click(function () {
    introStart()
});