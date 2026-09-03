import psycopg2
import jwt
from datetime import datetime, timedelta
import json

def run():
    conn_str = 'postgresql://postgres.abkxpvizmyowhkjjvjlx:dHaR_957516@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    cur.execute("SELECT id, role, email FROM users WHERE role = 'PATIENT' LIMIT 1")
    patient = cur.fetchone()
    
    cur.execute("SELECT id, role, email FROM users WHERE role = 'PHARMACY' LIMIT 1")
    pharmacy = cur.fetchone()
    
    conn.close()
    
    secret = 'fQ7ZAeu5NVjGPT/DSAkinVKq9D+myGGR/CriskPXkqfexNj6t1TL7VcG27G+gmziXim09RVPaK2x/G2iAyiS7g=='
    
    def make_token(user):
        if not user: return ''
        uid, role, email = user
        payload = {
            'aud': 'authenticated',
            'sub': str(uid),
            'email': email,
            'role': 'authenticated',
            'user_metadata': {'role': role},
            'exp': int((datetime.utcnow() + timedelta(days=1)).timestamp())
        }
        return jwt.encode(payload, secret, algorithm='HS256')

    with open('test_tokens.json', 'w') as f:
        json.dump({'patient': make_token(patient), 'pharmacy': make_token(pharmacy)}, f)
        
run()
