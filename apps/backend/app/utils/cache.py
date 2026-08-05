import time
from functools import wraps
from typing import Any, Callable

_cache = {}

def async_ttl_cache(ttl_seconds: int = 60):
    """
    A simple in-memory TTL cache decorator for async FastAPI endpoint functions.
    It completely bypasses the database for repetitive static queries.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create a cache key based on the function name and its kwargs
            # We ignore 'db' and 'current_user' since they aren't JSON serializable easily
            key_kwargs = {k: v for k, v in kwargs.items() if k not in ("db", "current_user", "request")}
            cache_key = f"{func.__name__}_{str(key_kwargs)}"
            
            now = time.time()
            if cache_key in _cache:
                cached_time, cached_value = _cache[cache_key]
                if now - cached_time < ttl_seconds:
                    return cached_value
            
            # Execute the function
            result = await func(*args, **kwargs)
            
            # Cache the result
            _cache[cache_key] = (now, result)
            return result
        return wrapper
    return decorator
