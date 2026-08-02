class AIException(Exception):
    """Base exception for AI subsystem"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class AIModelNotLoadedException(AIException):
    def __init__(self, model_name: str):
        super().__init__(f"Model '{model_name}' is not currently loaded or available.", 503)


class AIRateLimitException(AIException):
    def __init__(self, message: str = "AI service rate limit exceeded."):
        super().__init__(message, 429)


class AIPromptInjectionException(AIException):
    def __init__(self, message: str = "Unsafe or restricted content detected."):
        super().__init__(message, 400)


class AIExternalServiceException(AIException):
    def __init__(self, message: str = "External AI microservice is unreachable."):
        super().__init__(message, 502)


class AITimeoutException(AIException):
    def __init__(self, message: str = "AI request timed out."):
        super().__init__(message, 504)
