import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const backendUrl = 'http://localhost:8000';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEndpoints() {
  console.log('Logging in to Supabase...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@medsync.com',
    password: 'admin' // Or whatever the admin password is, the user said 'admin123' earlier, but also 'admin@medsync.com / admin' here
  });

  if (error || !data.session) {
    // Try the other password
    console.log('Failed to login with admin. Trying admin123...', error?.message);
    const retry = await supabase.auth.signInWithPassword({
      email: 'admin@medsync.com',
      password: 'admin123'
    });
    if (retry.error || !retry.data.session) {
      console.error('Login failed completely:', retry.error?.message);
      return;
    }
    data.session = retry.data.session;
  }

  const token = data.session.access_token;
  console.log('Login successful. Testing endpoints...');

  const endpoints = [
    '/api/v1/admin/dashboard',
    '/api/v1/admin/operations',
    '/api/v1/admin/security',
    '/api/v1/admin/ai'
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios.get(`${backendUrl}${ep}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`PASS: ${ep} - ${res.status}`);
      console.log(JSON.stringify(res.data, null, 2).substring(0, 300) + '...\n');
    } catch (err) {
      console.error(`FAIL: ${ep} - ${err.response?.status} ${err.message}`);
      console.error(err.response?.data);
    }
  }

  console.log('\nTesting unauthorized access (no token)...');
  for (const ep of endpoints) {
    try {
      const res = await axios.get(`${backendUrl}${ep}`);
      console.log(`FAIL (Did not reject): ${ep} - ${res.status}`);
    } catch (err) {
      console.log(`PASS (Rejected): ${ep} - ${err.response?.status}`);
    }
  }
}

testEndpoints();
