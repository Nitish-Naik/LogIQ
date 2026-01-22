from flask import Flask, request, render_template
import psycopg2
import os

app = Flask(__name__)


def get_db_connection():
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME", "logsdb"),
        user=os.getenv("DB_USER", "devlogs"),
        password=os.getenv("DB_PASSWORD", "devlogs"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432")
    )


def vulnerable_search(username_input):
    conn = get_db_connection()
    cur = conn.cursor()

    
    query = f"SELECT * FROM users_cs WHERE username = '{username_input}';"

    cur.execute(query)
    rows = cur.fetchall()

    cur.close()
    conn.close()
    return query, rows



def safe_search(username_input):
    conn = get_db_connection()
    cur = conn.cursor()


    cur.execute("SELECT * FROM users_cs WHERE username = %s;", (username_input,))
    rows = cur.fetchall()

    cur.close()
    conn.close()
    return rows



@app.route("/", methods=["GET", "POST"])
def index():
    result = None
    query = None
    mode = "vulnerable"  

    if request.method == "POST":
        username = request.form.get("username")
        mode = request.form.get("mode")

        if mode == "vulnerable":
            query, result = vulnerable_search(username)
        else:
            query = "SELECT * FROM users_cs WHERE username = %s;"
            result = safe_search(username)

    return render_template(
        "index.html",
        result=result,
        query=query,
        mode=mode
    )


if __name__ == "__main__":
    app.run(debug=True)


# ' OR '1'='1
# alice
