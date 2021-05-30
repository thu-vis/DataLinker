import os
from flask import abort, session
from flask import render_template, jsonify
from flask import Blueprint, request
from .utils.config_utils import config
import json
import time

from .exchange_port import *

history = Blueprint("history", __name__)


@history.route("/history/GetHistory", methods=["POST", "GET"])
def app_get_history():
    return get_history()

@history.route("/history/SetHistory", methods=["POST", "GET"])
def app_set_history():
    data = json.loads(request.data)
    # id = data["id"]
    return set_history(data)
    

@history.route("/history/Retrain", methods=["POST", "GET"])
def app_retrain():
    data = json.loads(request.data)
    return retrain()