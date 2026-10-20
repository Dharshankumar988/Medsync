import pytest
import uuid
from app.services.security_service import hash_pin, verify_pin, validate_pharmacy_pin
from app.models.pharmacy import Pharmacy
from app.schemas.pharmacy_system import RestockOrderItemResponse, RestockOrderResponseData

@pytest.mark.asyncio
async def test_validate_pharmacy_pin_auto_enrolls():
    """Test that a pharmacy without an existing PIN auto-enrolls a valid 6-digit PIN."""
    from unittest.mock import AsyncMock, MagicMock
    db = AsyncMock()
    user_id = uuid.uuid4()
    pharmacy = Pharmacy(
        id=uuid.uuid4(),
        user_id=user_id,
        business_name="Test Pharmacy",
        security_pin_hash=None
    )
    
    class MockResult:
        def scalar_one_or_none(self):
            return pharmacy
            
    db.execute.return_value = MockResult()
    
    # Enter 6-digit PIN
    is_valid = await validate_pharmacy_pin(db, user_id, "654321")
    assert is_valid is True
    assert pharmacy.security_pin_hash is not None
    assert verify_pin("654321", pharmacy.security_pin_hash)

@pytest.mark.asyncio
async def test_validate_pharmacy_pin_existing_pin():
    """Test that a pharmacy with an existing PIN validates correctly."""
    from unittest.mock import AsyncMock
    db = AsyncMock()
    user_id = uuid.uuid4()
    pharmacy = Pharmacy(
        id=uuid.uuid4(),
        user_id=user_id,
        business_name="Test Pharmacy",
        security_pin_hash=hash_pin("123456")
    )
    
    class MockResult:
        def scalar_one_or_none(self):
            return pharmacy
            
    db.execute.return_value = MockResult()
    
    assert await validate_pharmacy_pin(db, user_id, "123456") is True
    assert await validate_pharmacy_pin(db, user_id, "999999") is False

def test_restock_order_schemas():
    """Verify that restock schemas validate fields properly."""
    item = RestockOrderItemResponse(
        id=str(uuid.uuid4()),
        medicine_name="Amoxicillin 500mg",
        quantity=50,
        status="PENDING",
        expected_delivery="2026-10-20T10:00:00Z",
        created_at="2026-10-20T09:58:00Z"
    )
    assert item.quantity == 50
    assert item.status == "PENDING"
