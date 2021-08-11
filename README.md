DataLinker
======================
Codes for the interactive analysis system, DataLinker, described in our paper "Interactive Graph Construction for Graph-Based Semi-Supervised Learning" (TVCG 2021).

Introduction
--
DataLinker is a visual analysis tool for graph-based semi-supervised learning (GSSL).
It supports users to explore the graph structure for better understanding of label propagation in GSSL,
identify which part of the graph may cause performance deterioration,
and modify the graph structure for better model performance.
A video demo is available at: https://youtu.be/LLDzHn9qyc4.
![](teaser.png)

Requirements
----------
```
tqdm==4.36.1
numpy==1.19.0
matplotlib==2.1.0
pandas==0.25.1
scipy==1.5.0
Flask==1.1.1
scikit_learn==0.21.3
anytree==2.8.0
Flask-Cors==3.0.9
Flask-Script==2.0.6
Flask-Session==0.3.2
ipython==7.16.1
joblib==0.16.0
networkx==2.5
numba==0.50.1
opencv-python==4.4.0.46
cffi==1.14.0
```
You can simply install them with `pip install -r requirements.txt`. This code is tested on Windows and with python3.6. 

Or if you are an anaconda or linux user follow these instructions.
1.  git clone git@github.com:thu-vis/DataLinker.git
 
2.  cd DataLinker/
 
3.  conda create -n sslt python=3.6
 
4.  conda activate sslt
 
5.  pip install -r requirements.txt


Quick Start with Demo Data
-----------------
Step 1: download demo data from [here](https://drive.google.com/file/d/1kOthHFC6Wszeh01Rvb3_SLbp3s6522im/view?usp=sharing), and unpack it in the root folder DataLinker (or DataLinker-main if you download the code with "download ZIP").

Step 2: setup the system:
```python manage.py run 8181```

Step 3: visit http://localhost:8181/ in a browser.

## Citation
If you use this code for your research, please consider citing:
```
@article{chen2021interactive,
  title={Interactive Graph Construction for Graph-Based Semi-Supervised Learning},
  author={Chen, Changjian and Wang, Zhaowei and Wu, Jing and Wang, Xiting and Guo, Lan-Zhe and Li, Yu-Feng and Liu, Shixia},
  journal={IEEE Transactions on Visualization and Computer Graphics},
  year={2021},
  volume={27},
  number={9},
  pages={3701-3716}
}
```

## Contact
If you have any problem about this code, feel free to contact
- ccj17@mails.tsinghua.edu.cn

or describe your problem in Issues.
