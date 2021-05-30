from flask import Flask, jsonify, send_file, session, \
    request, render_template, send_from_directory
from flask_session import Session
from datetime import timedelta
from .views.admin import admin
from .views.graph import graph
from .views.info import info
from .views.dist import dist
from .views.history import history

def create_app():
    app = Flask(__name__)
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['JSON_SORT_KEYS'] = False
    app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False
    Session(app)

    app.config.from_object("config.DevelopmentConfig")

    app.register_blueprint(admin)
    app.register_blueprint(graph)
    app.register_blueprint(info)
    app.register_blueprint(dist)
    app.register_blueprint(history)
    # # this manner is somewhere wrong
    # app.config.update(
    #     DEBUG=True,
    #     SERVER_NAME = "0.0.0.0:8000"
    # )

    return app