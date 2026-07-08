import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.blockchain import BlockchainTask, BlockchainTaskStatus, BlockchainAuditLog
from app.models.prescription import Prescription
from app.blockchain.services.record_registry import MedicalRecordRegistryService
from app.utils.hash import generate_prescription_hash
import logging

logger = logging.getLogger("blockchain_worker")

async def process_blockchain_tasks():
    logger.info("Starting Blockchain Background Worker...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                # Find pending or retrying tasks that are ready
                now = datetime.now(timezone.utc)
                stmt = select(BlockchainTask).where(
                    (BlockchainTask.status.in_([BlockchainTaskStatus.PENDING, BlockchainTaskStatus.RETRYING])) &
                    ((BlockchainTask.next_retry_time == None) | (BlockchainTask.next_retry_time <= now))
                ).order_by(BlockchainTask.created_at).limit(5)
                
                result = await db.execute(stmt)
                tasks = result.scalars().all()

                for task in tasks:
                    task.status = BlockchainTaskStatus.PROCESSING
                    await db.commit()

                    # Fetch related prescription
                    presc_stmt = select(Prescription).where(Prescription.id == task.prescription_id)
                    presc_res = await db.execute(presc_stmt)
                    prescription = presc_res.scalar_one_or_none()

                    if not prescription:
                        task.status = BlockchainTaskStatus.FAILED
                        task.error_message = "Prescription not found in database"
                        await db.commit()
                        continue

                    try:
                        # Fetch items (would need a joinedload in real app or separate query)
                        # For simplicity, we just hash the core prescription data
                        prescription_data = {
                            "prescription_id": str(prescription.id),
                            "patient_id": str(prescription.patient_id),
                            "doctor_id": str(prescription.doctor_id),
                            "diagnosis": prescription.diagnosis
                        }
                        sha256_hash = generate_prescription_hash(prescription_data)

                        # Submit to blockchain
                        receipt = MedicalRecordRegistryService.register_record(
                            record_id=prescription.id,
                            storage_type="PostgreSQL",
                            storage_reference=f"table=prescriptions,id={prescription.id}",
                            sha256_hash=sha256_hash,
                            owner_id=prescription.patient_id,
                            version=prescription.version
                        )

                        # Success
                        task.status = BlockchainTaskStatus.CONFIRMED
                        
                        prescription.blockchain_status = "CONFIRMED"
                        prescription.blockchain_tx_hash = receipt['transactionHash']
                        prescription.block_number = receipt['blockNumber']
                        prescription.hash = sha256_hash
                        prescription.registered_at = datetime.now(timezone.utc).isoformat()
                        
                        audit = BlockchainAuditLog(
                            transaction_hash=receipt['transactionHash'],
                            block_number=receipt['blockNumber'],
                            gas_used=receipt['gasUsed'],
                            wallet_address=receipt.get('from', None), # Web3 client needs to return 'from'
                            chain_id=80002,
                            explorer_url=f"https://amoy.polygonscan.com/tx/{receipt['transactionHash']}",
                            confirmation_time=datetime.now(timezone.utc),
                            prescription_id=prescription.id
                        )
                        db.add(audit)
                        await db.commit()
                        logger.info(f"Successfully processed task for prescription {prescription.id}")

                    except Exception as e:
                        logger.error(f"Failed to process task {task.id}: {str(e)}")
                        task.retry_count += 1
                        task.error_message = str(e)
                        if task.retry_count >= task.max_retries:
                            task.status = BlockchainTaskStatus.FAILED
                            prescription.blockchain_status = "FAILED"
                        else:
                            task.status = BlockchainTaskStatus.RETRYING
                            # Exponential backoff
                            delay = 2 ** task.retry_count
                            task.next_retry_time = datetime.now(timezone.utc) + timedelta(minutes=delay)
                        
                        await db.commit()
        except Exception as e:
            logger.error(f"Critical error in blockchain worker loop: {e}")
            
        # Sleep to prevent high CPU usage when queue is empty
        await asyncio.sleep(5)
