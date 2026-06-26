from fastapi import APIRouter
from app.schemas.response import APIResponse

router = APIRouter()

@router.get("/status")
async def blockchain_status():
    return APIResponse(message="Blockchain is operational", data={"network": "Polygon Amoy", "rpc": "Connected"})
