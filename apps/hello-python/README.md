# Hello Python

A simple Flask application demonstrating Python deployment from the monorepo.

## Local Development

```bash
cd apps/hello-python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Visit `http://localhost:8080`

## Deployment

This app automatically deploys to Fly.io when changes are pushed to the main branch.

**Manual deployment:**
```bash
cd apps/hello-python
fly deploy
```

## Tech Stack

- Python 3.11
- Flask
- Gunicorn
