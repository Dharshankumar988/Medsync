from pydantic import BaseModel, Field
from typing import List, Optional

class ClinicalReasoning(BaseModel):
    summary: str = Field(description="A concise summary of the clinical reasoning.")
    model_interpretation: str = Field(description="Interpretation of the ML model's prediction.")
    confidence_context: str = Field(description="Contextualization of the ML model's confidence score.")
    key_findings: List[str] = Field(description="List of key findings observed in the scan based on the prediction.")
    possible_considerations: List[str] = Field(description="Differential diagnoses or other possible considerations.")
    recommended_next_steps: List[str] = Field(description="Recommended clinical next steps.")
    questions_for_clinician: List[str] = Field(description="Questions or areas the clinician should investigate further.")
    urgency: str = Field(description="Urgency of the findings (e.g., routine, soon, urgent).")
    disclaimer: str = Field(description="Standard medical disclaimer.")
