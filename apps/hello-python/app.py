from flask import Flask
import os

app = Flask(__name__)

@app.route('/')
def hello():
    return '''
    <!DOCTYPE html>
    <html>
      <head>
        <title>Hello Python</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .container {
            text-align: center;
            color: white;
          }
          h1 {
            font-size: 3rem;
            margin: 0;
          }
          p {
            font-size: 1.2rem;
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Hello from Python!</h1>
          <p>This is a Flask app deployed from a monorepo</p>
        </div>
      </body>
    </html>
    '''

@app.route('/health')
def health():
    return {'status': 'ok', 'app': 'hello-python'}

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
