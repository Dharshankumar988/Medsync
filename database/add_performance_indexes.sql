-- MedSync Performance Indexes
-- Run during maintenance window. All indexes use IF NOT EXISTS for safety.

-- Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status ON appointments(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_status ON appointments(doctor_id, status);

-- Prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_status ON prescriptions(patient_id, status);

-- Medical Records
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON medical_records(doctor_id);

-- AI Chat
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);

-- Blockchain
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_event_queue_status ON blockchain_event_queue(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_event_queue_status_created ON blockchain_event_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_blockchain_audit_logs_entity_id ON blockchain_audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_sync_tasks_status ON blockchain_sync_tasks(status);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- Pharmacy Orders
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_prescription_id ON pharmacy_orders(prescription_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy_id ON pharmacy_orders(pharmacy_id);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Verification
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);
