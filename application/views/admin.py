from flask import Blueprint, render_template, abort, session, send_file, request
import os
from sklearn.svm import SVC

admin = Blueprint("admin", __name__)

@admin.route("/")
def index():
    session["logged_in"] = True
    # get model here

    return render_template("index.html")
