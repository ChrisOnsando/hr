from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    MONGODB_URL: str
    OPENAI_API_KEY: str = ""
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 100
    ALLOWED_EXTENSIONS: list[str] = []
    CORS_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://hr-interview-api.onrender.com",  
]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def __init__(self, **values):
        super().__init__(**values)

        if isinstance(self.ALLOWED_EXTENSIONS, str):
            self.ALLOWED_EXTENSIONS = [x.strip() for x in self.ALLOWED_EXTENSIONS.split(",")]

        if isinstance(self.CORS_ORIGINS, str):
            self.CORS_ORIGINS = [x.strip() for x in self.CORS_ORIGINS.split(",")]

settings = Settings()
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
