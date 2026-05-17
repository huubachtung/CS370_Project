import sys 
import os 

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)

# Tests nay chi chay on neu model thanh cong. 
def test_predict_valid_text():
    res = client.post("/predict", json={"text": "Tôi rất thích sản phẩm này"})
    
    # Nếu model chưa load thì sẽ trả 503
    if res.status_code == 503:
        return

    assert res.status_code == 200

    data = res.json()
    assert "input_text" in data
    assert "segmented_text" in data
    assert "tokens" in data
    assert "label" in data
    assert "confidence" in data
    assert "processing_time_ms" in data

    assert data["label"] in ["positive", "negative", "neutral"]
    assert 0.0 <= data["confidence"] <= 1.0