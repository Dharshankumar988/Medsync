from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, asc
from typing import Optional
from app.dependencies.db import get_db
from app.models.pharmacy_system import Medicine, MedicineCategory
from app.schemas.response import APIResponse
from pydantic import BaseModel

router = APIRouter()

class MedicineCreateRequest(BaseModel):
    name: str
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None

@router.get("/", response_model=APIResponse)
async def get_medicines(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = None,
    limit: int = Query(50, le=100)
):
    query = select(Medicine)
    
    if search:
        query = query.filter(or_(
            Medicine.name.ilike(f"%{search}%"),
            Medicine.generic_name.ilike(f"%{search}%"),
            Medicine.brand_name.ilike(f"%{search}%")
        ))
        
    query = query.order_by(asc(Medicine.name)).limit(limit)
    result = await db.execute(query)
    medicines = result.scalars().all()
    
    data = []
    for med in medicines:
        data.append({
            "id": str(med.id),
            "name": med.name,
            "generic_name": med.generic_name,
            "brand_name": med.brand_name,
            "strength": med.strength,
            "dosage_form": med.dosage_form
        })
        
    return APIResponse(message="Medicines retrieved", data=data)

@router.post("/", response_model=APIResponse)
async def create_medicine(
    req: MedicineCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    # Ensure there is a default category
    category_stmt = select(MedicineCategory).limit(1)
    cat_result = await db.execute(category_stmt)
    category = cat_result.scalar_one_or_none()
    
    if not category:
        category = MedicineCategory(name="General", description="General Medicines")
        db.add(category)
        await db.commit()
        await db.refresh(category)
        
    new_med = Medicine(
        name=req.name,
        generic_name=req.generic_name,
        brand_name=req.brand_name,
        strength=req.strength,
        dosage_form=req.dosage_form,
        category_id=category.id
    )
    
    db.add(new_med)
    await db.commit()
    await db.refresh(new_med)
    
    data = {
        "id": str(new_med.id),
        "name": new_med.name,
        "generic_name": new_med.generic_name,
        "brand_name": new_med.brand_name,
        "strength": new_med.strength,
        "dosage_form": new_med.dosage_form
    }
    
    return APIResponse(message="Medicine created successfully", data=data)
