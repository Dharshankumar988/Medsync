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
