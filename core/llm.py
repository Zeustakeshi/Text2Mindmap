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


def get_llm(llm_config=None):
    """
    Factory function to create appropriate LLM instance based on config.
    
    Args:
        llm_config: LLMConfig object with llm_type and api_key
        
    Returns:
        LLM instance (Ollama or Gemini)
    """
    if llm_config is None:
        return async_llm

    # Import here to avoid circular imports
    from routers.mindmap.dto import LLMType

    if llm_config.llm_type == LLMType.GEMINI and llm_config.api_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=llm_config.api_key
        )

    # Default to Ollama
    return async_llm
