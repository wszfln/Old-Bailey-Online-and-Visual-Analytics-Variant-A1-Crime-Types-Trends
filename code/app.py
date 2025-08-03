from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

# Problem page routing placeholder
for i in range(1, 11):
    exec(f"""
@app.route("/q{i}")
def q{i}():
    return render_template("q{i}.html")
""")

if __name__ == "__main__":
    app.run(debug=True)