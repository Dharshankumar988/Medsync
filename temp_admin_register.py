from pydantic import BaseModel
class AdminRegisterRequest(BaseModel):
    email: str
    password: str

@router.post("/admin-register", response_model=APIResponse[dict])
async def admin_register(payload: AdminRegisterRequest, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    import uuid
    user_id = uuid.uuid4()
    try:
        await db.execute(
            text(""\"
            INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at) 
            VALUES (:id, '00000000-0000-0000-0000-000000000000', :email, crypt(:pwd, gen_salt('bf')), 'authenticated', 'authenticated', now())
            ""\"), 
            {"id": user_id, "email": payload.email, "pwd": payload.password}
        )
        await db.commit()
        return APIResponse(message="User created", data={"id": str(user_id)})
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
