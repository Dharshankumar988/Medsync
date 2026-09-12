import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def main():
    if not DATABASE_URL:
        print("DATABASE_URL is not set.")
        return

    print(f"Connecting to database...")
    engine = create_async_engine(DATABASE_URL)
    
    seed_file_path = "../../database/seed_dummy_data.sql"
    
    if not os.path.exists(seed_file_path):
        print(f"File not found: {seed_file_path}")
        # Try local path
        seed_file_path = "../database/seed_dummy_data.sql"
        if not os.path.exists(seed_file_path):
             seed_file_path = "database/seed_dummy_data.sql"
             if not os.path.exists(seed_file_path):
                 print("Could not find seed file.")
                 return

    print(f"Executing {seed_file_path}...")
    with open(seed_file_path, "r") as f:
        sql = f.read()

    statements = [s.strip() for s in sql.split(';') if s.strip()]

    async with engine.begin() as conn:
        for stmt in statements:
            if stmt:
                await conn.execute(text(stmt))
        
    print("Seed data applied successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
