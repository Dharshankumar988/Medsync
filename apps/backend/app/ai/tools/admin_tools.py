import json
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserRole
from app.models.audit_log import AdminAIAuditLog

class AdminAITools:
    """Tools accessible to the Admin AI for specific operational actions."""
    
    @staticmethod
    def get_tool_definitions() -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "list_users",
                    "description": "Lists users in the system optionally filtered by role.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "role": {
                                "type": "string",
                                "description": "Optional user role to filter by (e.g. 'doctor', 'patient', 'pharmacy', 'admin')"
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
                    "description": "Permanently deletes a user from the system.",
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
                    "description": "Executes a read-only SQL query on the database to answer analytics or general queries. Do NOT query personal details (email, phone, biometric data) of doctors or patients.",
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
                limit = kwargs.get("limit", 50)
                
                stmt = select(User).limit(limit)
                if role_filter:
                    try:
                        role_enum = UserRole(role_filter.upper())
                        stmt = stmt.where(User.role == role_enum)
                    except ValueError:
                        return json.dumps({"error": f"Invalid role: {role_filter}"})
                        
                res = await db.execute(stmt)
                users = res.scalars().all()
                
                user_list = [{"id": str(u.id), "email": u.email, "role": u.role.name} for u in users]
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
                if not sql_query.upper().startswith("SELECT"):
                    return json.dumps({"error": "Only SELECT queries are allowed."})
                
                # Basic PII filtering
                blocked_terms = ["email", "password_hash", "pin_hash", "biometric", "phone", "contact_number", "contact_email", "emergency_contact"]
                query_lower = sql_query.lower()
                for term in blocked_terms:
                    if term in query_lower:
                        return json.dumps({"error": f"Security Policy Violation: Access to '{term}' is restricted."})
                
                from sqlalchemy import text
                res = await db.execute(text(sql_query))
                rows = res.fetchall()
                # Convert rows to dicts
                columns = res.keys()
                results = []
                for row in rows:
                    results.append({col: str(val) for col, val in zip(columns, row)})
                
                result_msg = json.dumps({"results": results[:100], "count": len(results), "truncated": len(results) > 100})
                
            else:
                return json.dumps({"error": f"Unknown tool: {function_name}"})
                
        except Exception as e:
            return json.dumps({"error": str(e)})

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
