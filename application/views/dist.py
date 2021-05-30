import os
from flask import abort, session
from flask import render_template, jsonify
from flask import Blueprint, request
from .utils.config_utils import config
import json
import time

from .exchange_port import *

dist = Blueprint("dist", __name__)


@dist.route("/dist/GetFlows", methods=["POST", "GET"])
def app_get_flows():
    data = json.loads(request.data)
    selected_idxs = [int(i) for i in data]
    return get_flows(selected_idxs)

@dist.route("/dist/GetSelectedFlows", methods=["POST", "GET"])
def app_get_selected_flows():
    data = json.loads(request.data)
    print(data) # for debug
    # return jsonify(data)
    return get_selected_flows(data["path_id"])