import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv('c:/IMP PROJECTS/Medsync/portable_runner/.env')
engine = create_async_engine(os.getenv('DATABASE_URL'))

async def run():
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_accepting_appointments BOOLEAN DEFAULT TRUE;'))
    print('Column added!')

asyncio.run(run())
