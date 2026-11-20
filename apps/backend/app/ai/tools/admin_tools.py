import json
import uuid
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.audit_log import AdminAIAuditLog

class AdminAITools:
    """Tools accessible to the Admin AI for operational, analytics, and administrative actions."""
    
    @staticmethod
    def get_tool_definitions() -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "list_users",
                    "description": "Lists users in the system optionally filtered by role or search term (email or name).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "role": {
                                "type": "string",
                                "description": "Optional user role to filter by ('doctor', 'patient', 'pharmacy', 'hospital', 'admin')"
                            },
                            "search": {
                                "type": "string",
                                "description": "Optional search string to filter by name or email"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of users to return",
                                "default": 50
                            }
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_user",
                    "description": "Permanently deletes a non-admin user from the system.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_id": {
                                "type": "string",
                                "description": "The UUID of the user to delete"
                            },
                            "reason": {
                                "type": "string",
                                "description": "The reason for deletion"
                            }
                        },
                        "required": ["user_id", "reason"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "query_database_analytics",
                    "description": "Executes a read-only SQL query on the database to answer analytics, platform monitoring, or data retrieval queries across users, patients, doctors, pharmacies, hospitals, appointments, prescriptions, medicines, medicine_orders, blockchain_transactions, api_request_logs, and audit_logs. Only SELECT queries are permitted.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The SQL query to execute. Must be read-only (SELECT). Example: SELECT COUNT(*) FROM appointments;"
                            }
                        },
                        "required": ["query"]
                    }
                }
            }
        ]

    @staticmethod
    async def execute_tool(db: AsyncSession, admin_id: uuid.UUID, session_id: uuid.UUID, function_name: str, kwargs: Dict[str, Any]) -> str:
        """Executes a requested tool function and logs the action."""
        
        result_msg = ""
        action = f"tool_call:{function_name}"
        resource_type = "user"
        resource_id = None
        fields_accessed = kwargs
        
        try:
            if function_name == "list_users":
                role_filter = kwargs.get("role")
                search_term = kwargs.get("search")
                limit = kwargs.get("limit", 50)
                
                stmt = (
                    select(
                        User.id, User.email, User.role, User.status,
                        Patient.full_name.label("patient_name"),
                        Doctor.full_name.label("doctor_name")
                    )
                    .outerjoin(Patient, Patient.user_id == User.id)
                    .outerjoin(Doctor, Doctor.user_id == User.id)
                    .limit(limit)
                )
                
                if role_filter:
                    try:
                        role_enum = UserRole(role_filter.upper())
                        stmt = stmt.where(User.role == role_enum)
                    except ValueError:
                        return json.dumps({"error": f"Invalid role: {role_filter}"})
                        
                if search_term:
                    search_pat = f"%{search_term.strip()}%"
                    stmt = stmt.where(
                        or_(
                            User.email.ilike(search_pat),
                            Patient.full_name.ilike(search_pat),
                            Doctor.full_name.ilike(search_pat)
                        )
                    )
                        
                res = await db.execute(stmt)
                rows = res.all()
                
                user_list = []
                for row in rows:
                    role_val = row.role.name if hasattr(row.role, "name") else str(row.role)
                    status_val = row.status.name if hasattr(row.status, "name") else str(row.status)
                    name = row.patient_name or row.doctor_name
                    user_list.append({
                        "id": str(row.id),
                        "email": row.email,
                        "role": role_val,
                        "status": status_val,
                        "name": name
                    })
                result_msg = json.dumps({"users": user_list, "count": len(user_list)})
                
            elif function_name == "delete_user":
                target_user_id = kwargs.get("user_id")
                reason = kwargs.get("reason", "No reason provided")
                
                try:
                    target_uuid = uuid.UUID(target_user_id)
                    resource_id = target_uuid
                except Exception:
                    return json.dumps({"error": "Invalid user_id format."})
                    
                target_user = await db.scalar(select(User).where(User.id == target_uuid))
                if not target_user:
                    return json.dumps({"error": "User not found."})
                    
                if target_user.role == UserRole.ADMIN:
                    return json.dumps({"error": "Cannot delete admin users via AI."})
                    
                await db.delete(target_user)
                await db.commit()
                result_msg = json.dumps({"success": True, "message": f"User {target_user_id} deleted successfully."})
                
            elif function_name == "query_database_analytics":
                sql_query = kwargs.get("query", "").strip()
                # Strip trailing semicolons for consistency
                clean_query = sql_query.rstrip(";").strip()
                
                # Check for read-only query
                upper_start = clean_query.upper()
                if not (upper_start.startswith("SELECT") or upper_start.startswith("WITH")):
                    return json.dumps({"error": "Security Policy Violation: Only SELECT and WITH (CTE) queries are allowed."})
                
                # Disallow modifying keywords using word boundaries
                forbidden_pattern = r"\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|exec|execute)\b"
                if re.search(forbidden_pattern, clean_query, flags=re.IGNORECASE):
                    return json.dumps({"error": "Security Policy Violation: Mutation statements are strictly prohibited."})
                
                # Disallow sensitive credential columns
                security_blocks = r"\b(password_hash|pin_hash|security_pin_hash|encrypted_password)\b"
                if re.search(security_blocks, clean_query, flags=re.IGNORECASE):
                    return json.dumps({"error": "Security Policy Violation: Access to security credential fields is restricted."})
                
                # Normalize MySQL date functions to PostgreSQL/ANSI syntax
                normalized_query = re.sub(r"\bCURDATE\(\)", "CURRENT_DATE", clean_query, flags=re.IGNORECASE)
                normalized_query = re.sub(r"\bDATE_SUB\(\s*CURRENT_DATE\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)", r"CURRENT_DATE - INTERVAL '\1 days'", normalized_query, flags=re.IGNORECASE)
                normalized_query = re.sub(r"\bDATE_SUB\(\s*NOW\(\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)", r"NOW() - INTERVAL '\1 days'", normalized_query, flags=re.IGNORECASE)
                normalized_query = re.sub(r"\bINTERVAL\s+(\d+)\s+DAY\b", r"INTERVAL '\1 days'", normalized_query, flags=re.IGNORECASE)
                
                # Detect dialect for SQLite compatibility shim
                dialect_str = ""
                try:
                    bind = getattr(db, "bind", None)
                    if bind and hasattr(bind, "dialect") and not isinstance(bind, (MagicMock if 'MagicMock' in globals() else type)):
                        dialect_str = str(getattr(bind.dialect, "name", "")).lower()
                    elif hasattr(db, "sync_session"):
                        conn = db.sync_session.connection()
                        if hasattr(conn, "dialect"):
                            dialect_str = str(getattr(conn.dialect, "name", "")).lower()
                except Exception:
                    dialect_str = ""

                if isinstance(dialect_str, str) and "sqlite" in dialect_str:
                    normalized_query = re.sub(r"\bILIKE\b", "LIKE", normalized_query, flags=re.IGNORECASE)
                    normalized_query = re.sub(r"(?:NOW\(\)|CURRENT_DATE)\s*-\s*INTERVAL\s*'(\d+)\s*days?'", r"date('now', '-\1 days')", normalized_query, flags=re.IGNORECASE)
                    normalized_query = re.sub(r"\bNOW\(\)", "CURRENT_TIMESTAMP", normalized_query, flags=re.IGNORECASE)
                
                from sqlalchemy import text
                res = await db.execute(text(normalized_query))
                rows = res.fetchall()
                # Convert rows to dicts
                columns = res.keys()
                results = []
                for row in rows:
                    results.append({col: (str(val) if val is not None else None) for col, val in zip(columns, row)})
                
                result_msg = json.dumps({"results": results[:100], "count": len(results), "truncated": len(results) > 100})
                
            else:
                return json.dumps({"error": f"Unknown tool: {function_name}"})
                
        except Exception as e:
            return json.dumps({"error": f"Database Query Error: {str(e)}"})

        # Create audit log
        try:
            audit_log = AdminAIAuditLog(
                admin_id=admin_id,
                session_id=session_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                fields_accessed=fields_accessed,
                details=result_msg
            )
            db.add(audit_log)
            await db.commit()
        except Exception as e:
            import logging
            logging.getLogger("medsync.ai.admin_tools").error(f"Failed to create audit log: {e}")
            
        return result_msg
