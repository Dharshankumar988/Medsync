import sys
import traceback
sys.path.append(".")

try:
    from app.main import app
except Exception as e:
    traceback.print_exc()
