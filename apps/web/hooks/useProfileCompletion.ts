import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ProfileCompletionStatus {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
}

export function useProfileCompletion(userId: string | undefined, role: string | undefined) {
  const [status, setStatus] = useState<ProfileCompletionStatus>({
    percentage: 0,
    missingFields: [],
    isComplete: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !role) {
      setIsLoading(false);
      return;
    }

    async function checkProfile() {
      setIsLoading(true);
      try {
        let missing: string[] = [];
        let totalFields = 0;
        let filledFields = 0;
        
        // 1. Check common fields (users table)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('profile_picture_url, cover_image_url, bio, phone_number') // phone_number might be in role tables, but check what exists
          .eq('id', userId)
          .single();

        if (!userError && userData) {
          const commonChecks = [
            { field: userData.profile_picture_url, label: 'Profile Picture' },
            { field: userData.bio, label: 'Bio/About' },
          ];
          
          commonChecks.forEach(check => {
            totalFields++;
            if (check.field && check.field.trim() !== '') filledFields++;
            else missing.push(check.label);
          });
        }

        // 2. Check role specific fields
        if (role === 'patient') {
          const { data: patientData } = await supabase
            .from('patients')
            .select('date_of_birth, gender, blood_group, address, emergency_contact_number, allergies, chronic_diseases, phone_number')
            .eq('user_id', userId)
            .single();

          if (patientData) {
            const checks = [
              { field: patientData.date_of_birth, label: 'Date of Birth' },
              { field: patientData.gender, label: 'Gender' },
              { field: patientData.blood_group, label: 'Blood Group' },
              { field: patientData.address, label: 'Address' },
              { field: patientData.emergency_contact_number, label: 'Emergency Contact' },
              { field: patientData.phone_number, label: 'Phone Number' },
            ];
            
            checks.forEach(check => {
              totalFields++;
              if (check.field && check.field.trim() !== '') filledFields++;
              else missing.push(check.label);
            });
          }
        } else if (role === 'doctor') {
          const { data: doctorData } = await supabase
            .from('doctors')
            .select('specialization, license_number, experience_years, qualifications, consultation_hours, clinic_address')
            .eq('user_id', userId)
            .single();

          if (doctorData) {
            const checks = [
              { field: doctorData.specialization, label: 'Specialization' },
              { field: doctorData.license_number, label: 'License Number' },
              { field: doctorData.experience_years?.toString(), label: 'Years of Experience' },
              { field: doctorData.qualifications, label: 'Qualifications' },
              { field: doctorData.consultation_hours, label: 'Consultation Timings' },
            ];
            
            checks.forEach(check => {
              totalFields++;
              if (check.field && check.field.trim() !== '') filledFields++;
              else missing.push(check.label);
            });
          }
        } else if (role === 'pharmacy') {
          const { data: pharmacyData } = await supabase
            .from('pharmacies')
            .select('license_number, gst_number, address, operating_hours, working_days, contact_number')
            .eq('user_id', userId)
            .single();

          if (pharmacyData) {
            const checks = [
              { field: pharmacyData.license_number, label: 'Pharmacy License' },
              { field: pharmacyData.gst_number, label: 'GST Number' },
              { field: pharmacyData.address, label: 'Location/Address' },
              { field: pharmacyData.operating_hours, label: 'Store Timings' },
              { field: pharmacyData.working_days, label: 'Working Days' },
            ];
            
            checks.forEach(check => {
              totalFields++;
              if (check.field && check.field.trim() !== '') filledFields++;
              else missing.push(check.label);
            });
          }
        }

        const percentage = totalFields === 0 ? 0 : Math.round((filledFields / totalFields) * 100);
        
        setStatus({
          percentage,
          missingFields: missing,
          isComplete: percentage === 100,
        });

      } catch (err) {
        console.error('Error fetching profile completion status:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkProfile();
  }, [userId, role]);

  return { ...status, isLoading };
}
