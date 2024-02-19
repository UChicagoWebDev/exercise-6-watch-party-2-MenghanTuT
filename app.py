import string
import random
from datetime import datetime
from flask import *
# from flask import Flask, g, request
from functools import wraps
import sqlite3

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/watchparty.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None

def new_user():
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (name, password, api_key) ' + 
        'values (?, ?, ?) returning id, name, password, api_key',
        (name, password, api_key),
        one=True)
    return u

def new_room():
    name = "Unnamed Room #" + ''.join(random.choices(string.digits, k=6))
    r = query_db('insert into rooms (name) values (?) returning id, name',
        (name,),
        one=True)
    return r

# check API
def api_key_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('Authorization')
        user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
        if api_key and user:
            return f(*args, **kwargs)
        else:
            # print(api_key, "\n", user)
            return jsonify({"error": "Authentication failed"}), 403
    return decorated_function

# TODO: If your app sends users to any other routes, include them here.
#       (This should not be necessary).
@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/room')
@app.route('/room/<chat_id>')
def index(chat_id=None):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404

# -------------------------------- API ROUTES ----------------------------------

# TODO: Create the API

# @app.route('/api/signup')
# def login():
#   ...

@app.route('/api/signup', methods=['POST'])
def api_signup():
    user = new_user()
    return {'id': user['id'], 'name': user['name'], 'api_key': user['api_key'], 'password': user['password']}

# @app.route('/api/login')
# def login():
#   ... 

@app.route('/api/login', methods=['GET', 'POST'])
def api_login():
    if request.method == 'POST':
        username = request.json.get('username')
        password = request.json.get('password')
        user = query_db('SELECT * FROM users WHERE name = ? AND password = ?', [username, password], one=True)
        if user:
            return {'api_key': user['api_key']}
        else:
            return {'error': 'Invalid credentials'}, 401

@app.route('/api/username', methods=['POST'])
@api_key_required
def update_username():
    data = request.get_json()
    username = data.get('username')
    api_key = request.headers.get('Authorization')
    try:
        query_db('UPDATE users SET name = ? WHERE api_key = ?', [username, api_key])
        return jsonify({"message": "Username updated successfully"}), 200
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/password', methods=['POST'])
@api_key_required
def update_password():
    data = request.get_json()
    password = data.get('password')
    api_key = request.headers.get('Authorization')
    try:
        query_db('UPDATE users SET password = ? WHERE api_key = ?', [password, api_key])
        return jsonify({"message": "Password updated successfully"}), 200
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/roomcreation', methods=['POST'])
@api_key_required
def create_room():
    newroom = new_room()
    return {'id': newroom['id'], 'name': newroom['name']}

@app.route('/api/getrooms', methods=['GET'])
def get_rooms():
    try:
        rooms = query_db('SELECT id, name FROM rooms')
        rooms_list = [dict(room) for room in rooms]
        return jsonify(rooms_list), 200
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/room/<int:room_id>', methods=['GET'])
@api_key_required
def getRoomName(room_id):
    try:
        rooms = query_db('SELECT id, name FROM rooms WHERE id = ?', [room_id])
        rooms = [dict(room) for room in rooms]
        return jsonify(rooms[0]), 200
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/room/<int:room_id>', methods=['POST'])
@api_key_required
def rename_room(room_id):
    new_name = request.json.get('new_name')
    try:
        query_db('UPDATE rooms SET name = ? WHERE id = ?', [new_name, room_id])
        return jsonify({"message": "Room name updated successful"}), 200
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/room/<int:room_id>/messages', methods=['POST'])
@api_key_required
def post_message(room_id):
    try:
        message = request.json.get('comment')
        api_key = request.headers.get('Authorization')
        user_id, name = query_db('SELECT id, name FROM users WHERE api_key = ?', [api_key], one=True)
        print(user_id,"\n", name, "\n", room_id,"\n", message)
        if user_id:
            query_db('insert into messages (user_id, room_id, body) values (?, ?, ?)', (user_id, room_id, message), one=True)
        return jsonify({"message": "Comment post successful"}), 200
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/room/<int:room_id>/messages', methods=['GET'])
@api_key_required
def get_messages(room_id):
    try:
        messages = query_db("""SELECT m.id, m.body, u.name
        FROM messages as m
        INNER JOIN users u ON m.user_id = u.id
        WHERE m.room_id = ?""",
        [room_id])
        if messages:
            messages = [dict(message) for message in messages]
        # print(messages)
        return jsonify(messages), 200
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500
