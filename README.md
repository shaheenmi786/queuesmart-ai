Backend (Flask)
cd server
source venv/bin/activate          # macOS/Linux (venv already exists)
# or on Windows: ..\server_venv\Scripts\activate
pip install -r requirements.txt   # first time only
python utils/seed.py              # populate DB + seed accounts (first time only)
python app.py                     # starts on http://127.0.0.1:5000
Frontend (React/Vite)
cd client
npm install                       # first time only
npm run dev                       # starts on http://127.0.0.1:5173
Tests
cd server
source venv/bin/activate
pytest tests -v  