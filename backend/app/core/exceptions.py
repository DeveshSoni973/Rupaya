class RupayaException(Exception):
    """Base exception for all domain errors"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class NotFoundError(RupayaException):
    """Raised when a resource is not found"""
    pass


class UnauthorizedError(RupayaException):
    """Raised when authentication fails"""
    pass


class ForbiddenError(RupayaException):
    """Raised when a user lacks permission"""
    pass


class ConflictError(RupayaException):
    """Raised when there is a state conflict (e.g. user already exists)"""
    pass


class ValidationError(RupayaException):
    """Raised when business logic validation fails"""
    pass
