import asyncio
import asyncpg
import uuid

async def main():
    conn = await asyncpg.connect('postgresql://postgres.abkxpvizmyowhkjjvjlx:dHaR_957516@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?ssl=require')
    
    user_id = 'a1000000-0000-0000-0000-000000000000'
    email = 'admin@medsync.com'
    pw_hash = '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiNb/ALeZ1g0aFukw3w/pQ8eQ984jW'
    
    print("Deleting existing records...")
    await conn.execute('DELETE FROM auth.identities WHERE user_id = $1', user_id)
    await conn.execute('DELETE FROM auth.users WHERE id = $1', user_id)
    
    print("Inserting auth.users...")
    try:
        await conn.execute('''
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, 
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
                created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
            ) VALUES (
                '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2, $3, 
                NOW(), '{"provider": "email", "providers": ["email"]}', '{}', 
                NOW(), NOW(), '', '', '', ''
            )
        ''', user_id, email, pw_hash)
    except Exception as e:
        print(f"Error inserting user: {e}")
    
    print("Inserting auth.identities...")
    try:
        await conn.execute('''
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, created_at, updated_at
            ) VALUES (
                $1, $2, $3, 'email', NOW(), NOW()
            )
        ''', str(uuid.uuid4()), user_id, f'{{"sub":"{user_id}","email":"{email}"}}')
    except Exception as e:
        print(f"Error inserting identity: {e}")
        
    print("Done!")
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
