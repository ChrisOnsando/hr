import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGODB_URL: str
    OPENAI_API_KEY: str = ""
    
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 100
    ALLOWED_EXTENSIONS: List[str] = [".mp3", ".wav", ".m4a", ".mp4", ".mov", ".webm"]
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("ALLOWED_EXTENSIONS", "CORS_ORIGINS", mode="before")
    @classmethod
    def parse_flexible_list(cls, v: Union[str, List[str]]) -> List[str]:
        """
        This validator handles:
        1. Proper Python lists
        2. JSON strings like '["a", "b"]'
        3. Comma-separated strings like 'a,b,c'
        4. Values with accidental quotes from Render/Env files
        """
        if isinstance(v, list):
            return v
        
        if isinstance(v, str):
            v = v.strip()
            if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
                v = v[1:-1]
            
            v = v.replace("[", "").replace("]", "")
            
            if not v:
                return []

            return [
                item.strip().replace("'", "").replace('"', "") 
                for item in v.split(",") 
                if item.strip()
            ]
            
        return []

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()
