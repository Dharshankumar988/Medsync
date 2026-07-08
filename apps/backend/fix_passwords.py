import asyncio
from sqlalchemy import text
from app.database.session import AsyncSessionLocal
from app.core.security import get_password_hash

async def fix_passwords():
    async with AsyncSessionLocal() as db:
        # Generate valid hashes
        valid_hash = get_password_hash("Demo@1234")
        admin_hash = get_password_hash("Admin@1234")

        # Update dummy users
        await db.execute(text(f"UPDATE users SET password_hash = '{admin_hash}' WHERE role = 'ADMIN'"))
        await db.execute(text(f"UPDATE users SET password_hash = '{valid_hash}' WHERE role != 'ADMIN'"))
        
        await db.commit()
    print("Passwords fixed!")

if __name__ == "__main__":
    asyncio.run(fix_passwords())
