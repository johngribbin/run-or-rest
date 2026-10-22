from fastapi.testclient import TestClient

from run_or_rest.api.app import create_app


def test_openapi_document_is_titled_run_or_rest() -> None:
    client = TestClient(create_app())

    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "Run or Rest"
