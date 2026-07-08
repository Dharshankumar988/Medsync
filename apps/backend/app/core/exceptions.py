class DomainException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

class UnauthorizedException(DomainException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, 401)

class ForbiddenException(DomainException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, 403)

class NotFoundException(DomainException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, 404)

class BadRequestException(DomainException):
    def __init__(self, message: str = "Bad Request"):
        super().__init__(message, 400)
