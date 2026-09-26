import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import get_db, init_db
from generate_mock_data import generate_mock_data
from analytics import (
    detect_anomalies,
    detect_recurring_patterns,
    forecast_cash_flow,
    simulate_scenario,
    evaluate_goal_progress
)
from ai_agent import ai_categorize_transactions, ai_generate_recommendations, ai_chat
from guardrails import execute_approved_payload, HIGH_IMPACT_ACTIONS

app = FastAPI(
    title="FinSight Financial Risk & Cash Flow Agent",
    description="Full-stack AI-powered personal finance and risk agent API with Human-in-the-Loop guardrail gate.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to ensure DB is initialized
@app.on_event("startup")
def startup_event():
    init_db()

# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class CategorizeRequest(BaseModel):
    transaction_ids: Optional[List[int]] = None

class ScenarioSimulateRequest(BaseModel):
    type: str = Field(..., description="Scenario type: job_loss, large_expense, rate_change, income_reduction")
    duration_months: Optional[int] = 3
    amount: Optional[float] = 0.0
    date: Optional[str] = None
    new_rate: Optional[float] = 0.0

class ApprovalCreateRequest(BaseModel):
    action_type: str
    description: str
    impact_summary: str
    risk_level: str = "Low"
    payload: Optional[Dict[str, Any]] = None

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

# ==========================================
# ENDPOINTS
# ==========================================

@app.get("/")
def read_root():
    return {
        "agent": "FinSight",
        "status": "Online",
        "guardrail_gate": "Enforced",
        "human_in_the_loop": True,
        "endpoints": [
            "/dashboard", "/transactions/categorize", "/recurring/detect",
            "/anomalies", "/forecast", "/simulate", "/goals/{id}/progress",
            "/recommendations", "/approval-requests"
        ]
    }

@app.post("/reset-data")
def reset_database():
    """Resets and regenerates 6 months of mock data with anomalies and approvals."""
    generate_mock_data()
    return {"status": "success", "message": "Database reset to 6 months realistic baseline."}

@app.get("/dashboard")
def get_dashboard_summary():
    """Returns a consolidated executive summary for the dashboard."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, current_balance FROM accounts")
    accounts = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id, category, monthly_limit, current_spent FROM budgets")
    budgets = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id, name, target_amount, target_date, current_progress, priority FROM goals")
    goals = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id, action_type, description, impact_summary, risk_level, status FROM approval_requests WHERE status = 'pending'")
    pending_approvals = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT merchant, amount, frequency, next_expected_date FROM recurring_expenses WHERE status = 'active' ORDER BY next_expected_date ASC LIMIT 5")
    upcoming_bills = [dict(r) for r in cursor.fetchall()]

    conn.close()

    total_balance = sum(a["current_balance"] for a in accounts)
    total_budget_limit = sum(b["monthly_limit"] for b in budgets)
    total_budget_spent = sum(b["current_spent"] for b in budgets)

    # Anomaly counts
    anomalies = detect_anomalies(baseline_window_days=180)
    high_risk_anomalies = [a for a in anomalies if a["severity"] == "High"]

    # Goal evaluations
    goal_progress_list = []
    for g in goals:
        eval_res = evaluate_goal_progress(g["id"])
        if eval_res:
            goal_progress_list.append(eval_res)

    return {
        "total_liquid_balance": total_balance,
        "accounts": accounts,
        "monthly_budget": {
            "limit": total_budget_limit,
            "spent": total_budget_spent,
            "pct_used": round((total_budget_spent / total_budget_limit) * 100, 1) if total_budget_limit > 0 else 0
        },
        "budgets": budgets,
        "goals": goal_progress_list,
        "upcoming_bills": upcoming_bills,
        "pending_approvals_count": len(pending_approvals),
        "anomalies_count": len(anomalies),
        "high_risk_anomalies_count": len(high_risk_anomalies),
        "recent_anomalies": anomalies[:3]
    }

@app.get("/transactions")
def get_transactions(
    limit: int = 50,
    offset: int = 0,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT id, date, amount, merchant, category, account_id, type, balance_after FROM transactions WHERE 1=1"
    params = []

    if category:
        query += " AND category = ?"
        params.append(category)

    if search:
        query += " AND (merchant LIKE ? OR category LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY date DESC, id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT COUNT(*) as total FROM transactions")
    total_count = cursor.fetchone()["total"]
    conn.close()

    return {"total": total_count, "items": rows}

@app.post("/transactions/categorize")
def categorize_transactions_endpoint(payload: CategorizeRequest):
    """
    1. POST /transactions/categorize
    Auto-categorizes uncategorized transactions using Claude or pattern engine.
    """
    conn = get_db()
    cursor = conn.cursor()

    if payload.transaction_ids:
        placeholders = ",".join("?" for _ in payload.transaction_ids)
        cursor.execute(f"SELECT id, merchant, amount, category FROM transactions WHERE id IN ({placeholders})", payload.transaction_ids)
    else:
        cursor.execute("SELECT id, merchant, amount, category FROM transactions WHERE category = 'Uncategorized' OR category LIKE '%Other%' LIMIT 25")

    uncat_txs = [dict(r) for r in cursor.fetchall()]

    if not uncat_txs:
        conn.close()
        return {"categorized_count": 0, "results": [], "message": "No uncategorized transactions found."}

    categorized = ai_categorize_transactions(uncat_txs)

    for item in categorized:
        cursor.execute("""
            UPDATE transactions
            SET category = ?, merchant = ?
            WHERE id = ?
        """, (item["category"], item["merchant_normalized"], item["id"]))

    conn.commit()
    conn.close()

    return {
        "categorized_count": len(categorized),
        "results": categorized,
        "message": f"Successfully categorized {len(categorized)} transactions."
    }

@app.get("/recurring/detect")
def get_recurring_detect():
    """
    2. GET /recurring/detect
    Analyzes transaction history, detects recurring expenses/income using
    pattern matching (same merchant + similar amount + regular interval),
    and returns them with confidence scores.
    """
    detected = detect_recurring_patterns()

    total_monthly_recurring_spend = sum(
        d["amount"] for d in detected if d["type"] == "debit" and d["frequency"] == "monthly"
    )

    total_monthly_recurring_income = sum(
        d["amount"] for d in detected if d["type"] == "credit" and d["frequency"] == "monthly"
    )

    return {
        "detected_count": len(detected),
        "total_monthly_recurring_spend": round(total_monthly_recurring_spend, 2),
        "total_monthly_recurring_income": round(total_monthly_recurring_income, 2),
        "net_recurring_margin": round(total_monthly_recurring_income - total_monthly_recurring_spend, 2),
        "items": detected
    }

@app.get("/anomalies")
def get_anomalies_endpoint(baseline_window: int = Query(180, description="Baseline days to benchmark against")):
    """
    3. GET /anomalies
    Detects anomalies using statistical baseline (rolling mean + std dev per category/merchant);
    flags transactions >2 std dev from baseline as medium risk, >3 as high risk;
    flags duplicate rapid charges and unrecognized high-value merchants with human-readable reasoning.
    """
    anomalies = detect_anomalies(baseline_window_days=baseline_window)
    return {
        "anomalies_count": len(anomalies),
        "high_severity_count": len([a for a in anomalies if a["severity"] == "High"]),
        "medium_severity_count": len([a for a in anomalies if a["severity"] == "Medium"]),
        "items": anomalies
    }

@app.get("/forecast")
def get_forecast_endpoint(horizon_days: int = Query(30, description="Forecast horizon in days (30, 60, 90)")):
    """
    4. GET /forecast?horizon_days=30
    Projects cash flow using historical averages + recurring expenses/income;
    returns a daily projected balance array WITH a confidence band (min/max),
    not a single number.
    """
    result = forecast_cash_flow(horizon_days=horizon_days, scenario=None)
    return result

@app.post("/simulate")
def post_simulate_endpoint(scenario_req: ScenarioSimulateRequest):
    """
    5. POST /simulate
    Accepts scenario params like {type: "job_loss", duration_months: 3} or
    {type: "large_expense", amount: 50000, date: "2026-11-01"} and returns
    projected impact on balance trajectory and goal timelines side-by-side.
    """
    params = scenario_req.dict()
    result = simulate_scenario(params)
    return result

@app.get("/goals/{id}/progress")
def get_goal_progress_endpoint(id: int):
    """
    6. GET /goals/{id}/progress
    Computes on-track/at-risk/behind status and required monthly contribution
    to hit target_date.
    """
    progress = evaluate_goal_progress(id)
    if not progress:
        raise HTTPException(status_code=404, detail="Goal not found")
    return progress

@app.get("/goals")
def get_all_goals():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, target_amount, target_date, current_progress, priority FROM goals")
    goals = [dict(r) for r in cursor.fetchall()]
    conn.close()

    evaluations = []
    for g in goals:
        ev = evaluate_goal_progress(g["id"])
        if ev:
            evaluations.append(ev)

    return evaluations

@app.post("/recommendations")
def get_recommendations_endpoint():
    """
    7. POST /recommendations
    Uses Claude to generate 3-5 ranked, explainable recommendations based on
    current spending/budget/goal data. Each recommendation includes:
    action, reasoning, quantified impact, and risk_level.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, current_balance FROM accounts")
    accounts = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id, category, monthly_limit, current_spent FROM budgets")
    budgets = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id, name, target_amount, target_date, current_progress, priority FROM goals")
    goals = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT merchant, amount, category FROM recurring_expenses WHERE status = 'active'")
    recurring = [dict(r) for r in cursor.fetchall()]
    conn.close()

    anomalies = detect_anomalies(180)

    context_data = {
        "accounts": accounts,
        "budgets": budgets,
        "goals": goals,
        "recurring": recurring,
        "anomalies": anomalies
    }

    recs = ai_generate_recommendations(context_data)
    return {
        "recommendations": recs,
        "guardrail_status": "Active: All state-changing recommendations require explicit user approval before execution."
    }

@app.get("/approval-requests")
def get_approval_requests():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, action_type, description, impact_summary, risk_level, status, created_at, payload
        FROM approval_requests
        ORDER BY CASE status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END, id DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/approval-requests")
def create_approval_request(req: ApprovalCreateRequest):
    """
    8. POST /approval-requests
    Creates a pending approval request for any high-impact action
    (canceling subscription, moving money, adjusting budget, adjusting goal target).
    MUST NOT execute the action — only log it as pending.
    """
    conn = get_db()
    cursor = conn.cursor()
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO approval_requests (action_type, description, impact_summary, risk_level, status, created_at, payload)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
    """, (
        req.action_type,
        req.description,
        req.impact_summary,
        req.risk_level,
        created_at,
        json.dumps(req.payload or {})
    ))

    req_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": req_id,
        "status": "pending",
        "message": "Action successfully submitted to Guardrail Gate. Waiting for human approval.",
        "executed": False
    }

@app.post("/approval-requests/{id}/approve")
def approve_request(id: int):
    """
    9. POST /approval-requests/{id}/approve
    User explicitly approves; ONLY THEN does the action execute.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, status, action_type, description FROM approval_requests WHERE id = ?", (id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Approval request not found")

    if row["status"] != "pending":
        conn.close()
        return {"status": row["status"], "message": f"Request #{id} has already been {row['status']}."}

    cursor.execute("UPDATE approval_requests SET status = 'approved' WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    # Architecturally execute the approved action
    exec_result = execute_approved_payload(id)

    return {
        "id": id,
        "status": "approved",
        "message": f"Action approved by user. Execution completed.",
        "execution_details": exec_result
    }

@app.post("/approval-requests/{id}/reject")
def reject_request(id: int):
    """
    10. POST /approval-requests/{id}/reject
    Marks as rejected, nothing executes.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, status FROM approval_requests WHERE id = ?", (id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Approval request not found")

    cursor.execute("UPDATE approval_requests SET status = 'rejected' WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    return {
        "id": id,
        "status": "rejected",
        "message": f"Request #{id} rejected by user. No financial state changes executed."
    }

@app.get("/accounts")
def get_accounts():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, current_balance FROM accounts")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/budgets")
def get_budgets():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, category, monthly_limit, current_spent FROM budgets")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    """
    POST /chat
    Conversational AI endpoint for the FinSight floating chatbot.
    Fetches live dashboard context on every turn so the AI is always grounded in real data.
    """
    # Fetch live financial context (same data as /dashboard)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, current_balance FROM accounts")
    accounts = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT id, category, monthly_limit, current_spent FROM budgets")
    budgets = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT id, name, target_amount, target_date, current_progress, priority FROM goals")
    goals = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT merchant, amount, frequency, next_expected_date FROM recurring_expenses WHERE status = 'active' ORDER BY next_expected_date ASC LIMIT 5")
    upcoming_bills = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT COUNT(*) as cnt FROM approval_requests WHERE status = 'pending'")
    pending_count = cursor.fetchone()["cnt"]
    conn.close()

    total_balance = sum(a["current_balance"] for a in accounts)
    total_limit = sum(b["monthly_limit"] for b in budgets)
    total_spent = sum(b["current_spent"] for b in budgets)
    anomalies = detect_anomalies(baseline_window_days=180)
    high_risk = [a for a in anomalies if a["severity"] == "High"]

    context = {
        "total_liquid_balance": total_balance,
        "accounts": accounts,
        "monthly_budget": {
            "limit": total_limit,
            "spent": total_spent,
            "pct_used": round((total_spent / total_limit) * 100, 1) if total_limit > 0 else 0
        },
        "goals": goals,
        "upcoming_bills": upcoming_bills,
        "anomalies_count": len(anomalies),
        "high_risk_anomalies_count": len(high_risk),
        "recent_anomalies": anomalies[:3],
        "pending_approvals_count": pending_count
    }

    history = [{"role": m.role, "content": m.content} for m in (req.history or [])]
    reply = ai_chat(message=req.message, context=context, history=history)
    return {"reply": reply}
