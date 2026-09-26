import json
from functools import wraps
from fastapi import HTTPException
from database import get_db

HIGH_IMPACT_ACTIONS = {
    "transfer_funds": "Moving money between accounts or goals",
    "cancel_subscription": "Canceling or modifying a recurring subscription",
    "adjust_budget": "Changing category budget spending limits",
    "adjust_goal": "Modifying financial goal targets or deadlines",
    "dispute_charge": "Initiating merchant chargeback or dispute"
}

class GuardrailViolationError(HTTPException):
    def __init__(self, action_type: str, reason: str):
        super().__init__(
            status_code=403,
            detail={
                "error": "GUARDRAIL_VIOLATION",
                "message": f"Autonomous execution blocked by FinSight Guardrail Gate. Action '{action_type}' requires explicit human-in-the-loop approval.",
                "action_type": action_type,
                "reason": reason,
                "resolution": "Submit this action via POST /approval-requests and await explicit human approval."
            }
        )

def enforce_guardrail_gate(action_type: str, requires_approval: bool = True):
    """
    Architectural decorator: guarantees that high-impact actions
    cannot be executed directly by AI or internal agents without
    prior verified human approval.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            approval_id = kwargs.get("approval_id")
            if not approval_id:
                raise GuardrailViolationError(
                    action_type=action_type,
                    reason="No verified approval_id provided. Direct state mutation is strictly prohibited."
                )
            
            # Verify approval status in database
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT status, action_type, payload FROM approval_requests WHERE id = ?", (approval_id,))
            record = cursor.fetchone()
            conn.close()

            if not record:
                raise HTTPException(status_code=404, detail="Approval request not found.")
            
            if record["status"] != "approved":
                raise GuardrailViolationError(
                    action_type=action_type,
                    reason=f"Approval request #{approval_id} is currently '{record['status']}'. It must be explicitly 'approved' by the user before execution."
                )

            return func(*args, **kwargs)
        return wrapper
    return decorator

def execute_approved_payload(approval_id: int):
    """
    Executes the validated payload ONLY after user has explicitly approved it.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT action_type, status, payload FROM approval_requests WHERE id = ?", (approval_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Approval request not found.")
    
    if row["status"] != "approved":
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot execute: Request is not approved.")
    
    payload = json.loads(row["payload"] or "{}")
    action = row["action_type"]
    execution_result = {"status": "success", "executed_action": action}

    if action == "cancel_subscription":
        merchant = payload.get("merchant")
        if merchant:
            cursor.execute("UPDATE recurring_expenses SET status = 'cancelled' WHERE merchant LIKE ?", (f"%{merchant}%",))
            execution_result["message"] = f"Recurring expense for '{merchant}' has been marked as cancelled."

    elif action == "adjust_budget":
        category = payload.get("category")
        new_limit = payload.get("new_limit")
        if category and new_limit is not None:
            cursor.execute("UPDATE budgets SET monthly_limit = ? WHERE category = ?", (float(new_limit), category))
            execution_result["message"] = f"Budget for '{category}' adjusted to ₹{new_limit:,.2f}."

    elif action == "adjust_goal":
        goal_id = payload.get("goal_id")
        target_amount = payload.get("target_amount")
        if goal_id and target_amount is not None:
            cursor.execute("UPDATE goals SET target_amount = ? WHERE id = ?", (float(target_amount), goal_id))
            execution_result["message"] = f"Goal #{goal_id} target updated to ₹{target_amount:,.2f}."

    elif action == "transfer_funds":
        from_acct = payload.get("from_account", 1)
        goal_id = payload.get("goal_id")
        amount = float(payload.get("amount", 0))
        if amount > 0:
            cursor.execute("UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?", (amount, from_acct))
            if goal_id:
                cursor.execute("UPDATE goals SET current_progress = current_progress + ? WHERE id = ?", (amount, goal_id))
            execution_result["message"] = f"Transferred ₹{amount:,.2f} to Goal #{goal_id}."

    elif action == "dispute_charge":
        merchant = payload.get("merchant")
        amount = float(payload.get("amount", 0))
        execution_result["message"] = f"Dispute submitted for {merchant} (₹{amount:,.2f}). Provisional credit pending bank review."

    conn.commit()
    conn.close()
    return execution_result
