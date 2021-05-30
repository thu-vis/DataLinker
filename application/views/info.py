import os
import json
from flask import send_file, jsonify
from flask import Blueprint, request

from .exchange_port import *

info = Blueprint("info", __name__)

@info.route("/info/image", methods=["GET"])
def info_get_image():
    id = request.args["filename"].split(".")[0]
    id = int(id)
    if id == 2098:
        id = 25
    if id < 0:
        return jsonify({
            "err_msg": "id error"
        })
    image_path = get_image_path(id)
    print(image_path)
    return send_file(image_path)


@info.route("/info/neighbors", methods=["POST"])
def info_get_neighbors():
    ids = json.loads(request.form["img_ids"])
    k = int(request.form["k"])
    return get_img_neighbors(ids, k)