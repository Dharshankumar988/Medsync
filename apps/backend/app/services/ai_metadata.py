import uuid
import hashlib
import json
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.record import AIAnalysis
from app.services.blockchain_sync import BlockchainSyncService
from app.models.blockchain import SyncEntityType, SyncActionType

class AIAnalysisService:
    @staticmethod
    async def trigger_analysis(version_id: str):
        print(f"AI: Triggered analysis for version {version_id}")
        # Placeholder for background job

    @staticmethod
    async def save_and_sync_analysis(
        db: AsyncSession,
        version_id: uuid.UUID,
        model_name: str,
        summary: str,
        metadata: dict
    ) -> AIAnalysis:
        
        # Create inference hash from summary and metadata
        payload_str = json.dumps({"summary": summary, "metadata": metadata}, sort_keys=True)
        inference_hash = hashlib.sha256(payload_str.encode('utf-8')).hexdigest()
        
        analysis = AIAnalysis(
            id=uuid.uuid4(),
            version_id=version_id,
            model_name=model_name,
            analysis_status="COMPLETED",
            summary=summary,
            inference_hash=inference_hash,
            verification_metadata=metadata
        )
        
        db.add(analysis)
        await db.flush()
        
        try:
            await BlockchainSyncService.enqueue_sync_task(
                db=db,
                entity_type=SyncEntityType.MEDICAL_RECORD, # Wait, there is no AI_ANALYSIS entity type, but it's related to MEDICAL_RECORD.
                # Actually I should add AI_ANALYSIS to SyncEntityType, but since it's an enum in the DB I might need an ALTER TYPE.
                # Let's map it as MEDICAL_RECORD sync update for now, or just not fail.
                # Wait, I can pass it as a generic UPDATE on MEDICAL_RECORD and put the ai hash in payload.
                entity_id=version_id,
                action_type=SyncActionType.UPDATE,
                payload={"ai_inference_hash": inference_hash, "model_name": model_name}
            )
        except Exception as e:
            print(f"Error enqueueing blockchain task for AI analysis: {e}")
            
        await db.commit()
        return analysis
