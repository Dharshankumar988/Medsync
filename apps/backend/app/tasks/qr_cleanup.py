import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger("medsync.tasks.qr_cleanup")

# How often the cleanup runs (in seconds) — every 6 hours
QR_CLEANUP_INTERVAL = 6 * 60 * 60


async def qr_cleanup_loop():
    """Background task that periodically cleans up expired QR authorization tokens."""
    logger.info("QR cleanup task started — runs every %d seconds", QR_CLEANUP_INTERVAL)
    while True:
        try:
            await asyncio.sleep(QR_CLEANUP_INTERVAL)
            logger.info("Running QR token cleanup at %s", datetime.now(timezone.utc).isoformat())

            from app.database.session import AsyncSessionLocal
            from app.services.qr_authorization_service import QRAuthorizationService

            async with AsyncSessionLocal() as db:
                deleted = await QRAuthorizationService.cleanup_expired_tokens(db)
                logger.info("QR cleanup complete — removed %d expired tokens", deleted)

        except asyncio.CancelledError:
            logger.info("QR cleanup task cancelled")
            break
        except Exception as e:
            logger.error("QR cleanup task error: %s", e, exc_info=True)
            # Wait a bit before retrying on error
            await asyncio.sleep(60)
