const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing Supabase connection...');
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'patient1@medsync.com',
    password: 'patient'
  });
  
  console.log('Auth:', authData?.user?.id, authError?.message);

  const { data: users, error: userError } = await supabase.from('users').select('*').limit(5);
  console.log('Users:', users?.length, userError);
  if (users?.length > 0) console.log(users[0]);

  const { data: appointments, error: apptError } = await supabase.from('appointments').select('*').limit(5);
  console.log('Appointments:', appointments?.length, apptError);
  if (appointments?.length > 0) console.log(appointments[0]);
}

test();
