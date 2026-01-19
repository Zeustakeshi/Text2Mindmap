from langchain_ollama import ChatOllama

from config.Setttings import settings

llm = ChatOllama(
    model=settings.ollama_chat_model,
    base_url=settings.ollama_base_url
)

