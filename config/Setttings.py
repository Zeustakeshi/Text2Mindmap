from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = ""
    ollama_chat_model: str = ""
    ollama_embedding_model: str = ""
    mindmap_generate_max_retry: int = 3

    class Config:
        env_file = ".env"


settings = Settings()
