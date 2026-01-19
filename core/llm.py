from langchain_ollama import ChatOllama

from config.Setttings import settings

# Sync LLM for backwards compatibility
sync_llm = ChatOllama(
    model=settings.ollama_chat_model,
    base_url=settings.ollama_base_url
)

# Async LLM for non-blocking operations in streaming endpoints
async_llm = ChatOllama(
    model=settings.ollama_chat_model,
    base_url=settings.ollama_base_url
)

