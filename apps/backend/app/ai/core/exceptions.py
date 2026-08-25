class AIException(Exception):
    """Base exception for AI subsystem"""
    def __init__(self, message: str, error_code: str = "INTERNAL_SERVER_ERROR", status_code: int = 500):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)

class ConfigurationException(AIException):
    def __init__(self, message: str = "AI Configuration Error"):
        super().__init__(message, "CONFIGURATION_ERROR", 500)

class GroqMissingKeyException(AIException):
    def __init__(self, message: str = "Groq API key is missing or not configured."):
        super().__init__(message, "MISSING_GROQ_API_KEY", 500)

class GroqInvalidKeyException(AIException):
    def __init__(self, message: str = "Groq API key is invalid."):
        super().__init__(message, "INVALID_GROQ_API_KEY", 500)

class GroqModelException(AIException):
    def __init__(self, message: str = "Configured Groq model is invalid or unavailable."):
        super().__init__(message, "INVALID_GROQ_MODEL", 500)

class GroqRateLimitException(AIException):
    def __init__(self, message: str = "Groq API rate limit exceeded."):
        super().__init__(message, "GROQ_RATE_LIMIT", 429)

class GroqTimeoutException(AIException):
    def __init__(self, message: str = "Groq API request timed out."):
        super().__init__(message, "GROQ_TIMEOUT", 504)

class GroqNetworkException(AIException):
    def __init__(self, message: str = "Network error connecting to Groq."):
        super().__init__(message, "GROQ_NETWORK_ERROR", 502)

class GroqProviderException(AIException):
    def __init__(self, message: str = "Groq provider encountered an error."):
        super().__init__(message, "GROQ_PROVIDER_ERROR", 502)

class RAGDatabaseException(AIException):
    def __init__(self, message: str = "RAG database query failed."):
        super().__init__(message, "RAG_DATABASE_ERROR", 500)

class RAGPermissionException(AIException):
    def __init__(self, message: str = "Unauthorized RAG access."):
        super().__init__(message, "RAG_PERMISSION_ERROR", 403)

class DiagnosticModelException(AIException):
    def __init__(self, message: str = "Diagnostic model failed."):
        super().__init__(message, "DIAGNOSTIC_MODEL_ERROR", 500)

class AuthorizationException(AIException):
    def __init__(self, message: str = "Not authorized to perform this AI action."):
        super().__init__(message, "AUTHORIZATION_ERROR", 403)

class ValidationException(AIException):
    def __init__(self, message: str = "Invalid input or configuration."):
        super().__init__(message, "VALIDATION_ERROR", 400)

class AIPromptInjectionException(AIException):
    def __init__(self, message: str = "Unsafe or restricted content detected."):
        super().__init__(message, "VALIDATION_ERROR", 400)
