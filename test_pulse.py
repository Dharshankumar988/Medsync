
import httpx;
import asyncio;

async def main():
    supabase_url = 'https://abkxpvizmyowhkjjvjlx.supabase.co'
    supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFia3hwdml6bXlvd2hramp2amx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0Mjk0NjYsImV4cCI6MjA5OTAwNTQ2Nn0.6WQhC3k6iA0au2IsEhmIhBDZKshIGEMcm-c8YZW6k6w'
    
    async with httpx.AsyncClient() as client:
        # Register a test user directly with Supabase API
        signup_url = f'{supabase_url}/auth/v1/signup'
        auth_data = {'email': 'testagent2@medsync.com', 'password': 'Password123!'}
        headers = {'apikey': supabase_key, 'Content-Type': 'application/json'}
        r = await client.post(signup_url, json=auth_data, headers=headers)
        if r.status_code not in (200, 201):
            print('Supabase signup failed:', r.text)
            return
            
        token = r.json().get('access_token')
        if not token:
            print('No token returned during signup (email confirmation might be required).')
            return
            
        print('Got token!')
        
        # Test PULSE
        pulse_url = 'https://entangled-dealmaker-storable.ngrok-free.dev/api/v1/ai/pulse/chat'
        pulse_data = {'message': 'Hello, explain what you can do.', 'context': {}, 'patient_id': 'test_patient'}
        pulse_headers = {'Authorization': f'Bearer {token}', 'Origin': 'http://localhost:3000'}
        r = await client.post(pulse_url, json=pulse_data, headers=pulse_headers, timeout=60.0)
        print('PULSE Status:', r.status_code)
        if r.status_code == 200:
            print('PULSE Response:', r.json()['response'][:100])
        else:
            print('PULSE Error:', r.text)

asyncio.run(main())

