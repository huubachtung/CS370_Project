from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_predict_empty_text_should_fail():
    res = client.post("/predict", json={"text": ""})
    assert res.status_code in [400, 422]


def test_predict_too_long_text_should_fail():
    long_text = "a" * 6000
    res = client.post("/predict", json={"text": long_text})
    assert res.status_code in [400, 422]