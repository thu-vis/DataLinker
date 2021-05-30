/*
 * Author: zhaowei
 * Date: 2019.11.6
 * Description: kk layout and utils
*/

'use strict';
(function (my) {
    let _ = {};
    my.KKlayout = _;

    _.layoutFast = function(graph, ref, dep, stab) {
        let roundSum = 300;

        let nodes = _.utils.dic2arr(graph.node);
        let key2idx = {};
        nodes.forEach((item, i)=>{
            key2idx[item.id] = i;
        });
        let context = {
            graph, nodes, key2idx
        };
		let adjMat = _.stress.getAdjMat(context);
        let idealMatrix = _.stress.getFullDistMatrix(context, adjMat);
        let weightMat = _.stress.getWeightMatrix(idealMatrix);

        let newPos = {};
        Math.seedrandom(nodes.length>0?nodes[0].id+'':'empty nodes');
        if (ref === undefined) {
            for (let i=0;i<nodes.length;++i) {
                newPos[i] = {
                    x: Math.random(),
                    y: Math.random()
                };
            }
        } else {
            for (let i=0;i<nodes.length;++i) {
                newPos[i] = Object.assign({x:0, y:0}, ref.node_pos[nodes[i].id]);
            }
        }

        let _updateXY = (res,node,key)=>{
            res[key] += wij*(node[j][key]+sij*(node[i][key]-node[j][key])); 
        }

        let wij = undefined,
            edij = undefined,
            sij = undefined,
            i = undefined,
            j = undefined;

        for (let roundno = 0; roundno<roundSum;++roundno) {
            for (i=0;i<nodes.length;++i) {
                let num = {x:0, y:0},
                    den = 0;
                for (j=0;j<nodes.length;++j) {
                    if (i==j) {
                        continue;
                    }
                    wij = weightMat.m[i][j],
                    edij = Math.sqrt((newPos[i].x-newPos[j].x)*(newPos[i].x-newPos[j].x)+(newPos[i].y-newPos[j].y)*(newPos[i].y-newPos[j].y));
                    if (edij < 1e-8) {
                        sij = 0;
                    } else {
                        sij = idealMatrix.m[i][j] / edij; 
                    }
                    _updateXY(num,newPos,'x');
                    _updateXY(num,newPos,'y'); 
                    den += wij;
                }
                newPos[i] = {
                    x: num.x / (den+1e-8),
                    y: num.y / (den+1e-8)
                };
            } 
        } 
        for (let nid in newPos) {
            graph.node[nodes[nid].id].x = newPos[nid].x;
            graph.node[nodes[nid].id].y = newPos[nid].y;
        }
        return graph;
    };

    _.layout = function (graph, ref, dep, usedep) {
        let ncnt = Object.values(graph.node).length;
        let ecnt = graph.link.length;
        let idx2id = {};
        let idx = 0;
        for(let id in graph.node){
            idx2id[idx] = id;
            idx++;
        }
        // set depend coordinate
        let radix = -1;
        let dx = [];
        let dy = [];
        let bstab = [];
        for(let i=0; i<ncnt; i++){
            dx.push(0.0);
            dy.push(0.0);
            bstab.push(false);
        }
        if(usedep){
            radix = _.setDepend(graph, dx, dy, bstab, dep, idx2id);
        }
        let usedRadix = true;
        if(radix === -1){
            usedRadix = false;
            radix = 0;
        }

        // set reference coordinate (beginning point of iteration)
        let x = [];
        let y = [];
        for(let i = 0; i<ncnt; i++){
            x.push(0.0);
            y.push(0.0);
        }
        _.setRef(x, y, ref, radix, idx2id);

        /***********************************************************************
		 * layout the graph using modified kamada-kawai layout
		 **********************************************************************/

        // special case : one node.
		if (1 === ncnt) {
			x[0] = 0;
			y[0] = 0;
			return _.wrap(graph, x, y);
		}
        let nodes = _.utils.dic2arr(graph.node);
        let key2idx = {};
        nodes.forEach((item, i)=>{
            key2idx[item.id] = i;
        });
        let context = {
            graph, nodes, key2idx
        };
		let adjMat = _.stress.getAdjMat(context);
        let idealMatrix = _.stress.getFullDistMatrix(context, adjMat);
        let weightMat = _.stress.getWeightMatrix(idealMatrix);
        let deltaMat = _.stress.getDeltaMat(idealMatrix, weightMat);
        
        let ttt=0;
        for (let key of [adjMat, idealMatrix, weightMat]) {
            console.log(ttt,'---- ',key)
            ttt+=1; 
        }


        //let coords = _.getRandomLayout(); // {x:[,,,], y:[,,,]}
        let xx = [], yy = [];

        for(let i in x){
            if(i != radix){
                xx.push(x[i]);
                yy.push(y[i])
            }
        }
        let coords = {
            x: new Vector(ncnt, xx),
            y: new Vector(ncnt, yy) };
        let trimLaplacian = _.stress.getTrimLaplacian(weightMat, radix);
        let trimLz = _.stress.getTrimLz(deltaMat, coords, radix);

        let energy = _.stress.calculateStress(idealMatrix,
            weightMat, coords, radix);
        if (energy >= 1e-5) {
            let ratio = 0,
                stopToleration = 1e-5,
                equationToleration = 1e-7;
            for (let cnt=0;cnt<300;++cnt) {
                coords.x = _.stress.CGSolver(
                    trimLaplacian, trimLz.multiplyVector(coords.x), equationToleration);
                coords.y = _.stress.CGSolver(
                    trimLaplacian, trimLz.multiplyVector(coords.y), equationToleration);

                let localEnergy = _.stress.calculateStress(
                    idealMatrix, weightMat, coords, radix);
                ratio = localEnergy / energy;
                energy = localEnergy;
                // console.log("optimization: ", cnt, ratio, energy);
                if (Math.abs(ratio - 1)<stopToleration) break;
                trimLz = _.stress.getTrimLz(deltaMat, coords, radix);
            }
        }

        coords.x.v.splice(radix, 0, 0);
        coords.y.v.splice(radix, 0, 0);
        for(let i=0; i<ncnt; i++){
            x[i] = coords.x.v[i];
            y[i] = coords.y.v[i]
        }
        let res = _.wrap(graph, x, y);
        console.log(res);
        return res;
    };

    _.wrap = function(graph, x, y){
        let newgraph = JSON.parse(JSON.stringify(graph));
        let i=0;
        for(let id in newgraph.node){
            let p = newgraph.node[id];
            p.x = x[i];
            p.y = y[i];
            i++;
        }
        return newgraph;
    };

    _.setDepend = function (graph, dx, dy, bstab, depend, idx2id) {
        if(undefined === depend){
            return -1;
        }else {
            let radix = -1;
            let rx = 0, ry = 0;
            for (let i=0; i<dx.length; i++) {
                let id = idx2id[i];
				let p = depend.node_pos[id];
				if (p === undefined) {
					continue;
				} else if (-1 === radix) {
					radix = i;
					dx[i] = 0;
					dy[i] = 0;
					bstab[i] = true;

					rx = p.x;
					ry = p.y;
				} else {
					dx[i] = p.x - rx;
					dy[i] = p.y - ry;
					bstab[i] = true;
				}
			}
            return radix;
        }
    };

    _.setRef = function(x, y, ref, radix, idx2id){
        let rx = 0, ry = 0;
        if (undefined === ref) {
			rx = Math.random();
			ry = Math.random();

			for (let i = 0; i < x.length; i++) {
				if (radix === i) {
					continue;
				} else {
					x[i] = Math.random() - rx;
					y[i] = Math.random() - ry;
				}
			}
		}else {
                let id = idx2id[radix];
                let p = ref.node_pos[id];
                if (undefined === p) {
                    rx = Math.random();
                    ry = Math.random();
                } else {
                    rx = p.x;
                    ry = p.y;
                }
                for (let i = 0; i < x.length; i++) {
                    if (radix === i) {
                        continue;
                    } else {
                        id = idx2id[i];
                        p = ref.node_pos[id];
                        if (undefined === p) {
                            x[i] = Math.random();
                            y[i] = Math.random();
                        } else {
                            x[i] = p.x;
                            y[i] = p.y;
                        }
                        x[i] -= rx;
                        y[i] -= ry;
                    }
                }
            }
    };


    _.stress = {};
    _.stress.zeroArray = function(len) {
        let arr = new Array(len);
        for (let i=0;i<len;++i)
            arr[i] = 0;
        return arr;
    };
    /**
     * Conjugate gradient method to solve the equation MatX = vector.
     * It is the numeric method, assign the toleration for terminating
     * the program.
     */
    _.stress.CGSolver = function(mat, vec, toleration) {
        let lastNuo = 0, nuo = 0;
        let res = vec,
            p = undefined,
            vecX = new Vector(vec.size, _.stress.zeroArray(vec.size)),
            stopNuo = Math.max(1e-20, toleration*toleration);

        let temp = 0;
        for (let cnt=0;cnt<1000;++cnt) {
            nuo = res.norm(2);
            if (nuo < stopNuo) {
                break;
            }

            if (cnt == 0) {
                p = res.copy();
            } else {
                let ratio = nuo/lastNuo;
                for (let i=0;i<p.size;++i) {
                    p.v[i] = p.v[i]*ratio + res.v[i];
                }
            }

            let mat2vec = mat.multiplyVector(p);
            temp = nuo / (p.dotMultiply(mat2vec)+1e-30);
            vecX.eachWithVector(p, (a,b)=>(a+b*temp));
            res = res.copy().eachWithVector(mat2vec, (a,b)=>(a-b*temp));
            lastNuo = nuo;
            //temp = cnt;
        }
        //console.log('cnt=', temp);
        return vecX;
    };
    _.stress.getAdjMat = function(ctx) {
        let m = {};
        for (let e of ctx.graph.link) {
            let from = ctx.key2idx[e[0]],
                to = ctx.key2idx[e[1]];
            _.utils.ensureDicForGraphEdge(m, from, to, 0);
            let w = 1+5*2.0/(_.utils.getDegree(ctx.graph, e[0]) + _.utils.getDegree(ctx.graph, e[1]));
            m[from][from] +=  w;
            m[to][to] += w;
            m[from][to] = w;
            m[to][from] = w;
        }
        let num = ctx.nodes.length;
        return new Matrix(num, num, m);
    };
    _.stress.getFullDistMatrix = function(ctx, adjmat) {
        let positiveInfinity = 1e10,
            realInfinity = 5;
        let num = ctx.nodes.length;
        let mm = adjmat.copy().updateEach((v,r,c)=>((v==0 || r==c)?positiveInfinity:(1.0/v)));
        let m = mm.m;
        for (let i=0;i<num;++i) {
            _.utils.ensureDicValue(m, i, {});
            for (let j=0;j<num;++j) {
                _.utils.ensureDicValue(m[i], j, positiveInfinity);
            }
        }
        for (let k=0;k<num;++k) {
            for (let i=0;i<num;++i) {
                for (let j=0;j<num;++j) {
                    if (m[i][k] == positiveInfinity || m[k][j] == positiveInfinity) {
                        continue;
                    }
                    m[i][j] = Math.min(m[i][j], m[i][k]+m[k][j]);
                }
            }
        }
        for (let i = 0; i < num; i++) {
            for (let j = 0; j < num; j++) {
                if (j === i)
                    continue;
                if (positiveInfinity === m[i][j]) {
                    m[i][j] = realInfinity;
                }
            }
        }
        return mm;
    };
    /**
     * Set the weight of wij.
     * Choose alpha=-2 in equation wij=dij^alpha of the paper
     * (Graph Drawing by Stress Majorization).
     */
    _.stress.getWeightMatrix = function(idealMatrix) {
        return idealMatrix.copy().updateEach((v,r,c)=>(
            (r==c)?0:(1.0/(v*v)) ));
    };
    /**
     * Construct the delta matrix by weight and ideal distance. More detail see
     * the paper <<Graph Drawing by Stress Majorization>>.
     */
    _.stress.getDeltaMat = function(idealMatrix, weightMat) {
        return weightMat.copy().updateEach((v,r,c)=>(
            (r==c)?0:(idealMatrix.m[r][c]*v)
        ));
    };
    /**
     * Get the weighted laplacian matrix and then trim the radix row and column.
     */
    _.stress.getTrimLaplacian = function(weightMat, radix) {
        let num = weightMat.rowSize;
        let m = {},
            cnti = 0,
            cntj = 0;
        weightMat = weightMat.m;
        for (let i=0;i<num;++i) {
            if (i == radix) {
                continue;
            }
            cntj = 0;
            for (let j=0;j<i;++j) {
                if (j == radix) {
                    _.utils.ensureDicValue(m, cnti, {});
                    _.utils.ensureDicValue(m[cnti], cnti, 0);
                    m[cnti][cnti] += weightMat[i][j];
                } else {
                    _.utils.ensureDicForGraphEdge(m, cnti, cntj, 0);
                    m[cnti][cntj] -= weightMat[i][j];
                    m[cntj][cnti] = m[cnti][cntj];
                    m[cnti][cnti] += weightMat[i][j];
                    m[cntj][cntj] += weightMat[i][j];
                    ++cntj;
                }
            }
            ++cnti;
        }
        return new Matrix(num-1, num-1, m);
    };
    /**
     * Get the trimed Lz matrix in the paper.
     */
    _.stress.getTrimLz = function(deltaMat, coords, radix) {
        let num = deltaMat.rowSize;
        let m = {},
            cnti = 0,
            cntj = 0;

        let _getLen = (a,b)=>(a*a+b*b+1e-30);

        deltaMat = deltaMat.m;
        for (let i=0;i<num;++i) {
            if (radix == i) {
                continue;
            }
            _.utils.ensureDicValue(m, cnti, {});
            _.utils.ensureDicValue(m[cnti], cnti, 0);
            m[cnti][cnti] += deltaMat[i][radix]/Math.sqrt(_getLen(coords.x.v[cnti], coords.y.v[cnti]));
            cntj = cnti+1;
            for (let j=i+1;j<num;++j) {
                if (radix == j) {
                    continue;
                }
                _.utils.ensureDicForGraphEdge(m, cnti, cntj, 0);
                let dist = _getLen(coords.x.v[cnti]-coords.x.v[cntj], coords.y.v[cnti]-coords.y.v[cntj]);
                m[cnti][cntj] = -deltaMat[i][j]/Math.sqrt(dist);
                m[cntj][cnti] = m[cnti][cntj];
                m[cnti][cnti] -= m[cnti][cntj];
                m[cntj][cntj] -= m[cnti][cntj];
                ++cntj;
            }
            ++cnti;
        }
        return new Matrix(num-1, num-1, m);

    };
    _.stress.calculateStress = function(idealMatrix, weightMat, coords, radix, stab) {
        let num = idealMatrix.rowSize;

        let _getXY = (idx)=>{
            if (idx<radix) {
                return {x: coords.x.v[idx], y:coords.y.v[idx]};
            } else if (idx>radix) {
                return {x: coords.x.v[idx-1], y:coords.y.v[idx-1]};
            } else {
                return {x:0, y:0};
            }
        };

        let _l2dis = (a,b)=>((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y));

        idealMatrix = idealMatrix.m;
        weightMat = weightMat.m;
        let result = 0;
        for (let i=0;i<num;++i) {
            let ci = _getXY(i);
            let total = 0;
            for (let j=i+1;j<num;++j) {
                let cj = _getXY(j);
                let dist = Math.sqrt(_l2dis(ci, cj));
                total += (dist - idealMatrix[i][j])*(dist - idealMatrix[i][j])*weightMat[i][j];
            }
            if (stab !== undefined) {
                total *= (1-stab.param);
                if (stab.coords[i] !== undefined) {
                    total += stab.param*stab.weight*_l2dis(ci, stab.coords[i]);
                }
            }
            result += total;
        }
        return result;
    };

    _.utils = {};
    _.utils.dic2arr = function(dic) {
        let arr = [];
        for (let key in dic) {
            arr.push({
                id: key,
                data: dic[key] });
        }
        return arr;
    };
    _.utils.ensureDicValue = function(dic, key, value) {
        if (dic[key] === undefined) {
            dic[key] = value;
        }
    };
    _.utils.getSetChange = function(pre_set, cur_set) {
        let res = {enter:[], update:[], exit:[]}; // like d3.js
        for (let key in pre_set) {
            if (cur_set[key] === undefined) {
                res.exit.push(key);
            } else {
                res.update.push(key);
            }
        }
        for (let key in cur_set) {
            if (pre_set[key] === undefined) {
                res.enter.push(key);
            }
        }
        return res;
    };
    _.utils.ensureDicForGraphEdge = function(m, from, to, default_value) {
        default_value = (default_value===undefined)?0:default_value;
        _.utils.ensureDicValue(m, from, {});
        _.utils.ensureDicValue(m, to, {});
        _.utils.ensureDicValue(m[from], from, default_value);
        _.utils.ensureDicValue(m[from], to, default_value);
        _.utils.ensureDicValue(m[to], from, default_value);
        _.utils.ensureDicValue(m[to], to, default_value);
    };
    _.utils.getDegree = function(graph, id){
        let degree = 0;
        // for(let edgeid in graph.link){
        //     let edge = graph.link[edgeid];
        //     if(edge[0] == id || edge[1] == id){
        //         degree++;
        //     }
        // }
        degree = graph.node[id].degree;
        return degree
    };

    /** Customized heap structure on array */
    _.utils.heap = {};
    /**
     * @param comp_func: function for comparing two objects in the heap. it should return <0, 0, >0 (as a<b, a==b, a>b).
     */
    _.utils.heap.goTop = function(comp_func, swap_func, arr, idx) {
        let cur = idx,
            tt = undefined;
        while (true) {
            if (cur == 0) {
                return;
            }
            let f = Math.floor(cur/2),
                flag = comp_func(arr[f], arr[cur]);
            if (flag <= 0) break;
            swap_func(arr, f, cur);
            cur = f;
        }
    };
    _.utils.heap.goDown = function(comp_func, swap_func, arr, idx) {
        let cur = idx,
            tt = undefined;
        while (true) {
            let son = cur*2;
            if (son>=arr.length) break;
            if ((son+1)<arr.length) {
                if (comp_func(arr[son], arr[son+1])>0) {
                    son = son+1;
                }
            }
            if (comp_func(arr[cur], arr[son])<=0) break;
            swap_func(arr, cur, son);
            cur = son;
        }
    };
    _.utils.heap.getHeapTool = function(comp_func, swap_func) {
        let obj = {};
        obj.comp_func = comp_func;
        if (swap_func === undefined) {
            swap_func = function(arr, f, son) {
                let tt = arr[f];
                arr[f] = arr[son];
                arr[son] = tt;
            };
        }
        obj.swap_func = swap_func;

        obj.push = function(arr, item) {
            arr.push(item);
            obj.swap_func(arr, arr.length-1, arr.length-1);
            _.utils.heap.goTop(obj.comp_func, obj.swap_func, arr, arr.length-1);
        };
        obj.pop = function(arr, idx) {
            if (idx >= arr.length) {
                return undefined;
            }
            if (idx<arr.length-1) {
                obj.swap_func(arr, idx, arr.length-1);
            }
            let p = arr.pop();
            if (idx<arr.length) {
                _.utils.heap.goDown(obj.comp_func, obj.swap_func, arr, idx);
                if (idx>0) {
                    _.utils.heap.goTop(obj.comp_func, obj.swap_func, arr, idx);
                }
            }
            return p;
        };
        return obj;
    };
})(window);

function Vector(size, arr) {
        this.v = (arr===undefined)?new Array(size):arr;
        this.size = size;
    };

Vector.prototype.copy = function() {
    let newArr = new Array(this.size);
    for (let i=0;i<this.size;++i) {
        newArr[i] = this.v[i];
    }
    return new Vector(this.size, newArr);
};

Vector.prototype.norm = function(num) {
    let sum = 0;
    for (let i=0;i<this.size;++i) {
        sum += this.v[i]**num;
    }
    return sum;
};

Vector.prototype.normalize = function() {
    let norm2 = Math.sqrt(this.norm(2));
    if (norm2 < 1e-8) {
        norm2 = 1e-8; // avoid dividing by zero.
    }
    for (let i=0;i<this.size;++i)
        this.v[i] /= norm2;
    return this;
};

Vector.prototype.eachWithVector = function(vec, func) {
    if (this.size != vec.size) {
        console.log("Error: sizes of two vectors dismatch.")
        return undefined;
    }
    for (let i=0;i<this.size;++i) {
        this.v[i] = func(this.v[i], vec.v[i]);
    }
    return this;
};

Vector.prototype.dotMultiply = function(vec) {
    if (this.size != vec.size) {
        console.log("Error: sizes of two vectors dismatch.")
        return undefined;
    }
    return (this.copy().eachMultiplyVector(vec).norm(1));
};

Vector.prototype.eachMultiplyVector = function(vec) {
    if (this.size != vec.size) {
        console.log("Error: sizes of two vectors dismatch.")
        return undefined;
    }
    this.eachWithVector(vec, (a,b)=>(a*b));
    return this;
};

Vector.prototype.toMatrix = function(diagonal_flag) {
    diagonal_flag = (diagonal_flag === undefined)?false:diagonal_flag;
    if (diagonal_flag) {
        let mat = {};
        for (let i=0;i<this.size;++i) {
            mat[i] = {};
            mat[i][i] = this.v[i];
        }
        return new Matrix(this.size, this.size, mat);
    } else {
        // as a matrix with shape=(size,1)
        let mat = {};
        for (let i=0;i<this.size;++i) {
            mat[i]={0:this.v[i]};
        }
        return new Matrix(this.size, 1, mat);
    }
};

function Matrix(row_size, col_size, matrix) {
    this.rowSize = row_size;
    this.colSize = col_size;
    this.m = (matrix === undefined)?{}:matrix;
};

Matrix.prototype.updateEach = function(update_func) {
    for (let row in this.m) {
        for (let col in this.m[row]) {
            this.m[row][col] = update_func(this.m[row][col], row, col);
        }
    }
    return this;
};

Matrix.prototype.copy = function() {
    let ensure = KKlayout.utils.ensureDicValue;
    let newM = {};
    for (let row in this.m) {
        newM[row] = {};
        for (let col in this.m[row]) {
            newM[row][col] = this.m[row][col];
        }
    }
    return new Matrix(this.rowSize, this.colSize, newM);
};

Matrix.prototype.transpose = function() {
    let ensure = KKlayout.utils.ensureDicValue;
    let m = {};
    for (let i in this.m) {
        for (let j in this.m[i]) {
            ensure(m, j, {});
            ensure(m[j], i, this.m[i][j]);
        }
    }
    return new Matrix(this.colSize, this.rowSize, m);
};

// A matrix is right multiplied by a vector, return a vector.
Matrix.prototype.multiplyVector = function(vec) {
    let res = new Array(this.rowSize);
    for (let i=0;i<this.rowSize;++i) {
        res[i] = 0;
        if (this.m[i] !== undefined) {
            for (let col in this.m[i]) {
                res[i] += (this.m[i][col]*vec.v[col]);
            }
        }
    }
    return new Vector(this.rowSize, res);
};

Matrix.prototype.multiplyMatrix = function(vv) {
    let ensure = KKlayout.utils.ensureDicValue;
    if (this.colSize != vv.rowSize) {
        console.log("Error: size dismatch!");
        alert("Error!");
    }

    let m = {};
    for (let i in this.m) {
        for (let k in vv.m) {
            if (this.m[i][k] === undefined) {
                continue;
            }
            for (let j in vv.m[k]) {
                ensure(m, i, {});
                ensure(m[i], j, 0);
                m[i][j] += this.m[i][k]*vv.m[k][j];
            } 
        } 
    } 
    return new Matrix(this.rowSize, vv.colSize, m);
};

Matrix.prototype.getZeroLike = function() {
    let ensure = KKlayout.utils.ensureDicValue;
    let m = {};
    for (let i in this.m) {
        ensure(m, i, {});
        for (let j in this.m[i]) {
            ensure(m[i], j, 0);
        }
    }
    return new Matrix(this.rowSize, this.colSize, m);
};

Matrix.prototype.transitWithFunc = function(func, step_number, start_matrix) {
    let ensure = KKlayout.utils.ensureDicValue;
    let dM = this.copy(),
        baseM = undefined;
    if (start_matrix !== undefined) {
        start_matrix.updateEach((v,r,c)=>{
            ensure(dM.m, r, {});
            ensure(dM.m[r], c, 0);
            dM.m[r][c] -= v;
            return v;
        }); 
        baseM = dM.getZeroLike();
        start_matrix.updateEach((v,r,c)=>{
            baseM.m[r][c] = v;
            return v;
        });
    } else {
        baseM = this.getZeroLike();
    }
    dM.updateEach((v,r,c)=>(v/step_number));

    for (let stepi=1;stepi<=step_number;++stepi) {
        let tempM = dM.copy().updateEach((v,r,c)=>(baseM.m[r][c]+v*stepi));
        func(tempM);
    }
};

Matrix.prototype.toVector = function(only_diagonal) {
    only_diagonal = (only_diagonal === undefined)?false:only_diagonal;
    if (only_diagonal) {
        if (this.rowSize != this.colSize) {
            Console.log("Error: size dismatch, can not convert to Vector", this);
            return undefined;
        }
        let arr = new Array(this.rowSize);
        for (let i=0;i<this.rowSize;++i) {
            if (this.m[i] !== undefined && this.m[i][i] !== undefined) {
                arr[i] = this.m[i][i];
            } else {
                arr[i] = 0; // 0 for undefined value
            }
        }
        return new Vector(this.rowSize, arr);
    } else {
        let sz = Math.max(this.rowSize, this.colSize);
        let arr = new Array(sz);
        if (this.colSize == 1) {
            for (let i=0;i<this.rowSize;++i) {
                if (this.m[i] !== undefined && this.m[i][0] !== undefined) {
                    arr[i] = this.m[i][0];
                } else {
                    arr[i] = 0; // 0 for undefined value
                }
            }
        } else if (this.rowSize == 1 && this.m[0] !== undefined) {
            for (let i=0;i<this.colSize;++i) {
                if (this.m[0][i] !== undefined) {
                    arr[i] = this.m[0][i];
                } else {
                    arr[i] = 0; // 0 for undefined value
                }
            }
        } else {
            return undefined;
        }
        return new Vector(sz, arr);
    }
};