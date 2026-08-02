import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.database.session import AsyncSessionLocal
from app.models.api_log import ApiRequestLog

logger = logging.getLogger(__name__)

class APILoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip logging for high-frequency health check endpoints
        if request.url.path in ("/health", "/api/v1/health", "/"):
            response = await call_next(request)
            return response

        # Generate a request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = 500
            logger.error(f"Request failed: {str(e)}")
            raise e
        finally:
            process_time_ms = int((time.time() - start_time) * 1000)
            
            # Extract user if available (set by auth dependency)
            user_id = None
            if hasattr(request.state, "user") and request.state.user:
                user_id = request.state.user.id
                
            endpoint = request.url.path
            method = request.method
            ip_address = request.client.host if request.client else None
            
            # Only log API paths to the database, skip static/health routes if preferred
            if endpoint.startswith("/api/v1/blockchain"):
                # Basic sanitization of query parameters if they exist in the URL
                safe_endpoint = endpoint.split('?')[0] if '?' in endpoint else endpoint
                
                try:
                    async with AsyncSessionLocal() as session:
                        log_entry = ApiRequestLog(
                            user_id=user_id,
                            endpoint=safe_endpoint,
                            method=method,
                            status_code=status_code,
                            execution_time_ms=process_time_ms,
                            ip_address=ip_address,
                            request_id=request_id
                        )
                        session.add(log_entry)
                        await session.commit()
                except Exception as db_err:
                    logger.error(f"Failed to write API log to database: {str(db_err)}")
                    
            logger.info(f"{method} {endpoint} - {status_code} - {process_time_ms}ms")
            
        return response
