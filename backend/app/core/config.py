import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017/hr_interviews"
    OPENAI_API_KEY: str = ""
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 100
    ALLOWED_EXTENSIONS: Union[List[str], str] = [".mp3", ".wav", ".m4a", ".mp4", ".mov", ".webm"]
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("ALLOWED_EXTENSIONS", "CORS_ORIGINS", mode="before")
    @classmethod
    def parse_flexible_list(cls, v) -> List[str]:
        if isinstance(v, list):
            return v

        if isinstance(v, str):
            v = v.strip()

            if (v.startswith("'") and v.endswith("'")) or \
               (v.startswith('"') and v.endswith('"')):
                v = v[1:-1].strip()

            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(i).strip() for i in parsed]
            except (json.JSONDecodeError, ValueError):
                pass

            try:
                parsed = json.loads(v.replace("'", '"'))
                if isinstance(parsed, list):
                    return [str(i).strip() for i in parsed]
            except (json.JSONDecodeError, ValueError):
                pass

            v = v.replace("[", "").replace("]", "")
            return [
                item.strip().strip("'\"")
                for item in v.split(",")
                if item.strip()
            ]

        return []

    @property
    def MAX_FILE_SIZE_BYTES(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
