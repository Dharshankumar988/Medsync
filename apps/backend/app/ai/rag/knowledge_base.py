from typing import List, Dict

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

def load_documents() -> List[Dict[str, str]]:
    """Simulates loading from a database or external document store."""
    return MEDICAL_KNOWLEDGE_BASE
