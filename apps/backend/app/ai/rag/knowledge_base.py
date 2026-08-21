"""
Knowledge Base — Dynamic, database-sourced knowledge for Admin-only RAG.
Queries live Supabase/PostgreSQL data to build context documents.
"""
import logging
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger("medsync.ai.knowledge_base")


# Static medical knowledge (kept for fallback/enrichment)
MEDICAL_KNOWLEDGE_BASE: List[Dict[str, str]] = [
    {
        "id": "protocol_001",
        "category": "cardiology",
        "title": "Management of Acute Myocardial Infarction",
        "content": "For Acute Myocardial Infarction (AMI), immediate administration of Aspirin 162-325 mg is recommended. Sublingual nitroglycerin should be given for chest pain unless contraindicated (e.g., right ventricular infarction, recent PDE5 inhibitor use). Oxygen therapy only if O2 saturation is <90%. Consider P2Y12 inhibitor and systemic anticoagulation based on STEMI vs NSTEMI guidelines.",
        "source": "AHA/ACC Clinical Guidelines 2023"
    },
    {
        "id": "drug_001",
        "category": "pharmacology",
        "title": "Lisinopril Drug Profile",
        "content": "Lisinopril is an ACE inhibitor used for hypertension and heart failure. Common side effects include dry cough, hyperkalemia, and dizziness. Contraindicated in pregnancy and patients with a history of angioedema. Monitor renal function and serum potassium levels regularly.",
        "source": "MedSync Pharmacopeia"
    },
    {
        "id": "protocol_002",
        "category": "endocrinology",
        "title": "Type 2 Diabetes Mellitus Initial Therapy",
        "content": "First-line therapy for T2DM is Metformin and comprehensive lifestyle modifications (diet, exercise, weight loss). If A1C target is not achieved after 3 months, consider adding a GLP-1 receptor agonist, SGLT2 inhibitor, or DPP-4 inhibitor based on ASCVD risk, heart failure, or CKD status.",
        "source": "ADA Standards of Medical Care"
    },
    {
        "id": "symptom_001",
        "category": "neurology",
        "title": "Differential Diagnosis for Acute Headache",
        "content": "Red flag symptoms for headache (SNOOP): Systemic symptoms (fever, weight loss), Neurologic symptoms or abnormal signs, Onset is sudden (thunderclap), Older onset (>50 years), Previous headache history different. Differential includes subarachnoid hemorrhage, meningitis, mass lesion, temporal arteritis, migraine, and tension headache.",
        "source": "Clinical Neurology Reference"
    },
    {
        "id": "protocol_003",
        "category": "pulmonology",
        "title": "Asthma Exacerbation Management",
        "content": "Mild to moderate exacerbations: SABA (Albuterol) via nebulizer or MDI with spacer, up to 3 doses in first hour. Consider short course of oral corticosteroids (e.g., Prednisone 40-50 mg/day for 5-7 days). Monitor peak expiratory flow (PEF) and oxygen saturation. Maintain SpO2 >92% (>95% in pregnancy).",
        "source": "GINA Guidelines"
    }
]


# SQL queries for dynamic database context (Admin RAG)
DB_CONTEXT_QUERIES = {
    "platform_stats": {
        "title": "Platform Statistics",
        "source": "MedSync Database",
        "query": """
            SELECT
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE role = 'PATIENT') as total_patients,
                (SELECT COUNT(*) FROM users WHERE role = 'DOCTOR') as total_doctors,
                (SELECT COUNT(*) FROM users WHERE role = 'PHARMACY') as total_pharmacies,
                (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') as active_users,
                (SELECT COUNT(*) FROM users WHERE status = 'PENDING') as pending_users,
                (SELECT COUNT(*) FROM users WHERE status = 'SUSPENDED') as suspended_users
        """
    },
    "appointment_stats": {
        "title": "Appointment Statistics",
        "source": "MedSync Database",
        "query": """
            SELECT
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled,
                COUNT(CASE WHEN appointment_date >= CURRENT_DATE THEN 1 END) as upcoming
            FROM appointments
        """
    },
    "prescription_stats": {
        "title": "Prescription Statistics",
        "source": "MedSync Database",
        "query": """
            SELECT
                COUNT(*) as total_prescriptions,
                COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'DISPENSED' THEN 1 END) as dispensed,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days
            FROM prescriptions
        """
    },
    "recent_activity": {
        "title": "Recent Platform Activity",
        "source": "MedSync Database",
        "query": """
            SELECT
                (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_7d,
                (SELECT COUNT(*) FROM appointments WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_appointments_7d,
                (SELECT COUNT(*) FROM ai_chat_sessions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as ai_sessions_7d
        """
    },
    "doctor_stats": {
        "title": "Doctor Overview",
        "source": "MedSync Database",
        "query": """
            SELECT
                COUNT(*) as total_doctors,
                COUNT(CASE WHEN is_verified = true THEN 1 END) as verified,
                COUNT(CASE WHEN is_verified = false THEN 1 END) as unverified
            FROM doctors
        """
    },
}


def load_documents() -> List[Dict[str, str]]:
    """Load static medical knowledge base (synchronous fallback)."""
    return MEDICAL_KNOWLEDGE_BASE


async def load_database_context(db: AsyncSession) -> List[Dict[str, str]]:
    """Query live database and build context documents for Admin RAG."""
    documents = []

    for key, config in DB_CONTEXT_QUERIES.items():
        try:
            result = await db.execute(text(config["query"]))
            row = result.fetchone()
            if row:
                # Convert row to readable content
                columns = result.keys()
                pairs = []
                for col in columns:
                    val = getattr(row, col, None)
                    label = col.replace("_", " ").title()
                    pairs.append(f"{label}: {val}")
                content = "; ".join(pairs)

                documents.append({
                    "id": f"db_{key}",
                    "category": "platform_data",
                    "title": config["title"],
                    "content": content,
                    "source": config["source"],
                })
        except Exception as e:
            logger.warning(f"Failed to query {key}: {e}")
            continue

    return documents


async def load_all_documents(db: AsyncSession = None) -> List[Dict[str, str]]:
    """Load both static knowledge and dynamic database context."""
    docs = list(MEDICAL_KNOWLEDGE_BASE)  # Always include static

    if db is not None:
        try:
            db_docs = await load_database_context(db)
            docs.extend(db_docs)
        except Exception as e:
            logger.error(f"Failed to load database context: {e}")

    return docs
