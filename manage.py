from flask_script import Manager, Server
from application import create_app

app = create_app()
manager = Manager(app)

# manager.add_command("run", Server())

@manager.command
def run(port):
    app.run(host="0.0.0.0", port=port, debug=True)

if __name__ == "__main__":
    manager.run()