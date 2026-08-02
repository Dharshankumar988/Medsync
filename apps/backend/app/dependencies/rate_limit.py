from slowapi import Limiter
from slowapi.util import get_remote_address

# Create a rate limiter instance
# get_remote_address gets the client IP for rate limiting
limiter = Limiter(key_func=get_remote_address)
