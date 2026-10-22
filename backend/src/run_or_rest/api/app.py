from fastapi import FastAPI

from run_or_rest.config import APP_TITLE


def create_app() -> FastAPI:
    return FastAPI(title=APP_TITLE)
