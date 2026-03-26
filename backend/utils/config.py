from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    vlm_mode: str = "api"

    azure_openai_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = "gpt-5.3-chat"

    app_host: str = "0.0.0.0"
    app_port: int = 8000
    upload_dir: str = "./uploads"
    database_url: str = "sqlite:///./db/documind.db"

    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

UPLOAD_PATH = Path(settings.upload_dir)
UPLOAD_PATH.mkdir(parents=True, exist_ok=True)

DB_DIR = Path(settings.database_url.replace("sqlite:///", "")).parent
DB_DIR.mkdir(parents=True, exist_ok=True)
