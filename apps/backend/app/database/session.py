from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

import importlib.util

db_url = settings.DATABASE_URL
if "postgresql+asyncpg" in db_url and importlib.util.find_spec("asyncpg") is None:
    # Fallback for Windows ARM local dev without asyncpg
    db_url = "sqlite+aiosqlite:///:memory:"

engine_args = {"echo": False}
if "sqlite" not in db_url:
    engine_args.update({
        "pool_size": 20,
        "max_overflow": 30,
        "pool_pre_ping": True,
        "pool_recycle": 300,
    })
else:
    # Required for async SQLite in-memory
    from sqlalchemy.pool import StaticPool
    engine_args.update({
        "poolclass": StaticPool,
        "connect_args": {"check_same_thread": False}
    })

engine = create_async_engine(db_url, **engine_args)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
