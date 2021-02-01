import json
from typing import Dict, Any, List
from flask import Flask, request
from nebula import database

app = Flask(__name__)
db = database.Database()

@app.route("/addUser")
def add_user():
    db.add_user(request.headers["UserID"])
    db.commit_changes()
    return "Done", 200

@app.route("/fetchUser")
def fetch_user():
    data = db.fetch_user(request.headers["UserID"])

    if data is not None:
        user_data = {}
        data = list(data)
        user_data["id"] = data[0]
        user_data["xp"] = data[1]
        user_data["rep"] = data[2]
        user_data["balance"] = data[3]
        user_data["color"] = data[4]
        user_data["lastRep"] = data[5]
        return json.dumps(user_data), 200
    else:
        return "undefined", 200

@app.route("/updateUser")
def update_user():
    update_data: Dict[str, Any] = json.loads(request.headers["Data"])
    update_data_keys: List[str] = list(update_data.keys())

    if len(update_data_keys) == 1:
        db.update_user_column(request.headers["UserID"], update_data_keys[0], update_data[update_data_keys[0]])
    else:
        db.update_user_columns(request.headers["UserID"], update_data)

    db.commit_changes()
    return "Done", 200

@app.route("/updateUserIncrement")
def update_user_increment():
    update_data: Dict[str, Any] = json.loads(request.headers["Data"])
    update_data_keys: List[str] = list(update_data.keys())

    print(update_data)
    db.update_user_column_increment(request.headers["UserID"], update_data_keys[0], update_data[update_data_keys[0]])

    return "Done", 200

@app.route("/deleteUser")
def delete_user():
    db.delete_user(request.headers["UserID"])
    db.commit_changes()
    return "Done", 200

@app.route("/test")
def test():
    print(request.headers["Test"])
    return "", 200

if __name__ == "__main__":
    app.run()