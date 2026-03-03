from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
import json
import os

class Settings(BaseSettings):
    MONGODB_URL: str
    OPENAI_API_KEY: str = ""
    
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 100
    
    ALLOWED_EXTENSIONS: List[str] = [".mp3", ".wav"]
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    @field_validator("ALLOWED_EXTENSIONS", "CORS_ORIGINS", mode="before")
    @classmethod
    def parse_json_list(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("'") and v.endswith("'"):
                v = v[1:-1]
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [item.strip() for item in v.split(",") if item.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
