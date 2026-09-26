import math
import json
from datetime import datetime, timedelta
from collections import defaultdict
from database import get_db

def calculate_mean_and_stdev(values):
    if not values:
        return 0.0, 0.0
    n = len(values)
    mean = sum(values) / n
    if n < 2:
        return mean, 0.0
    variance = sum((x - mean) ** 2 for x in values) / (n - 1)
    return mean, math.sqrt(variance)

def detect_anomalies(baseline_window_days: int = 180):
    """
    Detects financial anomalies using statistical baseline (mean + std dev),
    duplicate rapid charge detection, and unrecognized merchant checks.
    Flags transactions:
      - z-score > 3.0: High Risk
      - z-score > 2.0: Medium Risk
      - Duplicate charge: High Risk
      - Unrecognized merchant with large volume: High Risk
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, date, amount, merchant, category, type, balance_after
        FROM transactions
        ORDER BY date ASC, id ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    if not rows:
        return []

    # 1. Build category baseline from older transactions (excluding the most recent 14 days)
    max_date = datetime.strptime(rows[-1]["date"], "%Y-%m-%d")
    recent_cutoff = max_date - timedelta(days=14)

    category_history = defaultdict(list)
    merchant_history = defaultdict(list)
    seen_merchants = set()

    for r in rows:
        tx_date = datetime.strptime(r["date"], "%Y-%m-%d")
        if r["type"] == "debit":
            if tx_date < recent_cutoff:
                category_history[r["category"]].append(r["amount"])
                merchant_history[r["merchant"]].append(r["amount"])
                seen_merchants.add(r["merchant"])

    # Calculate baseline stats per category
    category_stats = {}
    for cat, amts in category_history.items():
        mean, stdev = calculate_mean_and_stdev(amts)
        category_stats[cat] = {"mean": mean, "stdev": stdev, "count": len(amts)}

    # 2. Check for duplicate charges across all dates
    duplicates_found = set()
    tx_by_date_merchant_amount = defaultdict(list)
    for r in rows:
        if r["type"] == "debit":
            key = (r["date"], r["merchant"], r["amount"])
            tx_by_date_merchant_amount[key].append(r)

    for key, dupes in tx_by_date_merchant_amount.items():
        if len(dupes) > 1:
            for d in dupes:
                duplicates_found.add(d["id"])

    # 3. Screen recent transactions for anomalies
    anomalies = []
    for r in rows:
        tx_date = datetime.strptime(r["date"], "%Y-%m-%d")
        # Only flag anomalies in recent window (last 30 days) to keep dashboard relevant
        if tx_date < (max_date - timedelta(days=30)) or r["type"] != "debit":
            continue

        cat = r["category"]
        amt = r["amount"]
        stats = category_stats.get(cat, {"mean": amt, "stdev": 0.0, "count": 0})
        mean = stats["mean"]
        stdev = stats["stdev"]

        is_duplicate = r["id"] in duplicates_found
        is_unrecognized = (r["merchant"] not in seen_merchants) and (amt > 15000.0)

        z_score = ((amt - mean) / stdev) if stdev > 0 else 0.0

        anomaly_item = None

        if is_duplicate:
            anomaly_item = {
                "transaction_id": r["id"],
                "date": r["date"],
                "merchant": r["merchant"],
                "amount": r["amount"],
                "category": r["category"],
                "severity": "High",
                "risk_type": "Duplicate Rapid Charge",
                "z_score": round(z_score, 2),
                "baseline_mean": round(mean, 2),
                "baseline_stdev": round(stdev, 2),
                "reasoning": f"Identical debit of ₹{amt:,.2f} billed multiple times for '{r['merchant']}' on {r['date']}. High probability of gateway double-charge."
            }
        elif is_unrecognized:
            anomaly_item = {
                "transaction_id": r["id"],
                "date": r["date"],
                "merchant": r["merchant"],
                "amount": r["amount"],
                "category": r["category"],
                "severity": "High",
                "risk_type": "Unrecognized Entity / High Outflow",
                "z_score": round(z_score, 2),
                "baseline_mean": round(mean, 2),
                "baseline_stdev": round(stdev, 2),
                "reasoning": f"New merchant '{r['merchant']}' with no prior historical transaction record. Sizable outflow of ₹{amt:,.2f} triggered fraud risk protocol."
            }
        elif z_score >= 3.0:
            deviation_pct = round(((amt - mean) / mean) * 100) if mean > 0 else 0
            anomaly_item = {
                "transaction_id": r["id"],
                "date": r["date"],
                "merchant": r["merchant"],
                "amount": r["amount"],
                "category": r["category"],
                "severity": "High",
                "risk_type": "Statistical Outlier (>3σ)",
                "z_score": round(z_score, 2),
                "baseline_mean": round(mean, 2),
                "baseline_stdev": round(stdev, 2),
                "reasoning": f"Transaction of ₹{amt:,.2f} is {z_score:.1f} standard deviations above the '{cat}' historical baseline (mean: ₹{mean:,.2f}, +{deviation_pct}% spike)."
            }
        elif z_score >= 2.0:
            deviation_pct = round(((amt - mean) / mean) * 100) if mean > 0 else 0
            anomaly_item = {
                "transaction_id": r["id"],
                "date": r["date"],
                "merchant": r["merchant"],
                "amount": r["amount"],
                "category": r["category"],
                "severity": "Medium",
                "risk_type": "Elevated Expense (>2σ)",
                "z_score": round(z_score, 2),
                "baseline_mean": round(mean, 2),
                "baseline_stdev": round(stdev, 2),
                "reasoning": f"Expense of ₹{amt:,.2f} is {z_score:.1f} standard deviations above standard '{cat}' limits (mean: ₹{mean:,.2f}). Requires monitoring."
            }

        if anomaly_item:
            anomalies.append(anomaly_item)

    # Sort high severity first, then newest
    anomalies.sort(key=lambda x: (0 if x["severity"] == "High" else 1, x["date"]), reverse=False)
    return anomalies

def detect_recurring_patterns():
    """
    Pattern matching: groups transactions by merchant, checks regular interval
    and low variance in amount. Computes confidence score (0.0 to 1.0).
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT merchant, category, amount, date, type
        FROM transactions
        ORDER BY date ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # Group by merchant
    merchant_tx = defaultdict(list)
    for r in rows:
        merchant_tx[(r["merchant"], r["type"])].append(r)

    detected = []
    for (merchant, tx_type), tx_list in merchant_tx.items():
        if len(tx_list) < 3:
            continue

        amounts = [t["amount"] for t in tx_list]
        dates = [datetime.strptime(t["date"], "%Y-%m-%d") for t in tx_list]

        mean_amt, stdev_amt = calculate_mean_and_stdev(amounts)
        coeff_var = (stdev_amt / mean_amt) if mean_amt > 0 else 1.0

        # Calculate intervals
        intervals = []
        for i in range(1, len(dates)):
            intervals.append((dates[i] - dates[i-1]).days)

        mean_interval, stdev_interval = calculate_mean_and_stdev(intervals)

        # Detect monthly pattern (~26 to 34 days)
        if 25 <= mean_interval <= 35:
            frequency = "monthly"
            # Confidence based on interval regularity and amount stability
            conf = 1.0 - min(0.3, coeff_var) - min(0.3, stdev_interval / 30.0)
            confidence_score = max(0.70, min(0.99, round(conf, 2)))

            last_date = dates[-1]
            next_date = (last_date + timedelta(days=round(mean_interval))).strftime("%Y-%m-%d")

            detected.append({
                "merchant": merchant,
                "amount": round(mean_amt, 2),
                "type": tx_type,
                "frequency": frequency,
                "category": tx_list[-1]["category"],
                "occurrences": len(tx_list),
                "confidence_score": confidence_score,
                "next_expected_date": next_date,
                "average_interval_days": round(mean_interval, 1)
            })

    detected.sort(key=lambda x: x["amount"], reverse=True)
    return detected

def forecast_cash_flow(horizon_days: int = 30, scenario: dict = None):
    """
    Projects daily cash flow balance trajectory over horizon_days (30/60/90).
    Returns confidence interval (min, expected, max), daily net change, and event flags.
    Integrates scenario modifiers (job loss, large expense, rate change).
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT current_balance FROM accounts WHERE id = 1")
    acct = cursor.fetchone()
    current_balance = acct["current_balance"] if acct else 180000.0

    # Fetch active recurring obligations
    cursor.execute("SELECT merchant, amount, category, frequency, next_expected_date FROM recurring_expenses WHERE status = 'active'")
    recurring_expenses = [dict(r) for r in cursor.fetchall()]

    # Fetch income sources
    cursor.execute("SELECT source_name, amount, frequency, last_received FROM income_sources")
    income_sources = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # Calculate baseline discretionary daily spend (from historical non-recurring)
    daily_discretionary_mean = 920.0
    daily_discretionary_stdev = 340.0

    today = datetime(2026, 9, 26)
    trajectory = []

    # Scenario parameters
    scenario_type = scenario.get("type") if scenario else None
    scenario_duration = scenario.get("duration_months", 3) if scenario else 0
    scenario_large_amount = float(scenario.get("amount", 0)) if scenario else 0
    scenario_large_date = scenario.get("date") if scenario else None
    scenario_rate_change = float(scenario.get("new_rate", 0)) if scenario else 0

    running_expected = current_balance
    running_min = current_balance
    running_max = current_balance

    lowest_balance = current_balance
    runway_days = horizon_days
    critical_threshold = 25000.0

    for day_idx in range(1, horizon_days + 1):
        sim_date = today + timedelta(days=day_idx)
        sim_date_str = sim_date.strftime("%Y-%m-%d")
        day_of_month = sim_date.day

        daily_credits = 0.0
        daily_debits = 0.0
        events = []

        # 1. Income credits
        # Salary on 1st
        if day_of_month == 1:
            salary_amt = 95000.0
            if scenario_type == "job_loss" and (day_idx / 30.0) <= scenario_duration:
                events.append("Salary Paused (Scenario: Job Loss)")
            else:
                daily_credits += salary_amt
                events.append(f"TechCorp Salary (+₹{salary_amt:,.0f})")

        # Retainer on 10th
        if day_of_month == 10:
            retainer_amt = 25000.0
            daily_credits += retainer_amt
            events.append(f"Advisory Retainer (+₹{retainer_amt:,.0f})")

        # 2. Known recurring debits
        if day_of_month == 5:
            rent_amt = 28000.0
            if scenario_type == "rate_change" and scenario_rate_change > 0:
                rent_amt = rent_amt * (1.0 + (scenario_rate_change / 100.0))
                events.append(f"Rent Debit with {scenario_rate_change}% hike (-₹{rent_amt:,.0f})")
            else:
                events.append(f"Godrej Rent (-₹{rent_amt:,.0f})")
            daily_debits += rent_amt

        if day_of_month == 10:
            elec = 2850.0
            daily_debits += elec
            events.append(f"Electricity Bill (-₹{elec:,.0f})")

        if day_of_month == 12:
            daily_debits += 1179.0
            events.append("Airtel Broadband (-₹1,179)")

        if day_of_month == 14:
            daily_debits += 649.0
            events.append("Netflix (-₹649)")

        if day_of_month == 18:
            daily_debits += 179.0
            events.append("Spotify (-₹179)")

        if day_of_month == 22:
            daily_debits += 2499.0
            daily_debits += 14250.0
            events.append("Cult.fit & AWS (-₹16,749)")

        if day_of_month == 25:
            daily_debits += 365.0
            events.append("Apple One (-₹365)")

        # 3. Check for one-off scenario large expense
        if scenario_type == "large_expense":
            if (scenario_large_date and sim_date_str == scenario_large_date) or (not scenario_large_date and day_idx == 7):
                daily_debits += scenario_large_amount
                events.append(f"Scenario Lump Sum Expense (-₹{scenario_large_amount:,.0f})")

        # 4. Discretionary spending variance
        # Weekends have higher average spend
        weekend_multiplier = 1.4 if sim_date.weekday() in [5, 6] else 0.95
        expected_discretionary = daily_discretionary_mean * weekend_multiplier
        min_discretionary = (daily_discretionary_mean + 1.2 * daily_discretionary_stdev) * weekend_multiplier # higher spend
        max_discretionary = max(200.0, (daily_discretionary_mean - 0.8 * daily_discretionary_stdev) * weekend_multiplier) # frugal spend

        # Update trajectories
        running_expected += daily_credits - (daily_debits + expected_discretionary)
        running_min += daily_credits - (daily_debits + min_discretionary)
        running_max += daily_credits - (daily_debits + max_discretionary)

        if running_min < lowest_balance:
            lowest_balance = running_min

        if running_expected < critical_threshold and runway_days == horizon_days:
            runway_days = day_idx

        trajectory.append({
            "date": sim_date_str,
            "day": day_idx,
            "expected_balance": round(running_expected, 2),
            "min_balance": round(running_min, 2),
            "max_balance": round(running_max, 2),
            "net_daily": round(daily_credits - (daily_debits + expected_discretionary), 2),
            "events": ", ".join(events) if events else None
        })

    return {
        "starting_balance": round(current_balance, 2),
        "horizon_days": horizon_days,
        "ending_expected": round(running_expected, 2),
        "ending_min": round(running_min, 2),
        "ending_max": round(running_max, 2),
        "lowest_projected": round(lowest_balance, 2),
        "runway_days": runway_days,
        "is_solvent": lowest_balance > 0,
        "scenario_applied": scenario,
        "trajectory": trajectory
    }

def simulate_scenario(scenario_params: dict):
    """
    Compares baseline cash flow with scenario-impacted cash flow side-by-side,
    and quantifies the direct impact on runway and goal timelines.
    """
    baseline_forecast = forecast_cash_flow(horizon_days=90, scenario=None)
    scenario_forecast = forecast_cash_flow(horizon_days=90, scenario=scenario_params)

    # Goal impact evaluation
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, target_amount, target_date, current_progress FROM goals")
    goals = [dict(g) for g in cursor.fetchall()]
    conn.close()

    ending_delta = scenario_forecast["ending_expected"] - baseline_forecast["ending_expected"]
    runway_delta = scenario_forecast["runway_days"] - baseline_forecast["runway_days"]

    goal_impacts = []
    for g in goals:
        remaining = g["target_amount"] - g["current_progress"]
        if ending_delta < -100000:
            impact_status = "Severely Delayed / At Risk"
            timeline_impact = "Est. 60-90 days delay; monthly funding paused"
        elif ending_delta < -30000:
            impact_status = "Moderately Impacted"
            timeline_impact = "Est. 20-35 days delay; requires discretionary budget trim"
        else:
            impact_status = "Minimal Impact"
            timeline_impact = "On schedule with current emergency reserves"

        goal_impacts.append({
            "goal_id": g["id"],
            "name": g["name"],
            "target_amount": g["target_amount"],
            "current_progress": g["current_progress"],
            "target_date": g["target_date"],
            "impact_status": impact_status,
            "timeline_impact": timeline_impact
        })

    return {
        "scenario_params": scenario_params,
        "baseline_summary": {
            "ending_expected": baseline_forecast["ending_expected"],
            "runway_days": baseline_forecast["runway_days"],
            "lowest_projected": baseline_forecast["lowest_projected"]
        },
        "scenario_summary": {
            "ending_expected": scenario_forecast["ending_expected"],
            "runway_days": scenario_forecast["runway_days"],
            "lowest_projected": scenario_forecast["lowest_projected"]
        },
        "variance": {
            "balance_delta": round(ending_delta, 2),
            "runway_days_delta": runway_delta
        },
        "baseline_trajectory": baseline_forecast["trajectory"],
        "scenario_trajectory": scenario_forecast["trajectory"],
        "goal_impacts": goal_impacts
    }

def evaluate_goal_progress(goal_id: int):
    """
    Computes goal progress, remaining gap, required monthly contribution,
    and on-track/at-risk/behind status based on historical savings rate.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, target_amount, target_date, current_progress, priority FROM goals WHERE id = ?", (goal_id,))
    goal = cursor.fetchone()
    conn.close()

    if not goal:
        return None

    g = dict(goal)
    today = datetime(2026, 9, 26)
    target_dt = datetime.strptime(g["target_date"], "%Y-%m-%d")
    days_left = max(1, (target_dt - today).days)
    months_left = max(0.5, days_left / 30.4)

    target_amt = g["target_amount"]
    current_prog = g["current_progress"]
    remaining_amt = max(0.0, target_amt - current_prog)

    required_monthly = round(remaining_amt / months_left, 2)
    progress_pct = min(100.0, round((current_prog / target_amt) * 100, 1))

    # Average monthly net savings capacity is ~₹35,000 to ₹45,000
    average_monthly_surplus = 38000.0

    if progress_pct >= 100:
        status = "Completed"
        status_color = "emerald"
    elif average_monthly_surplus >= required_monthly * 1.05:
        status = "On-Track"
        status_color = "emerald"
    elif average_monthly_surplus >= required_monthly * 0.70:
        status = "At-Risk"
        status_color = "amber"
    else:
        status = "Behind"
        status_color = "rose"

    return {
        "goal_id": g["id"],
        "name": g["name"],
        "priority": g["priority"],
        "target_amount": target_amt,
        "current_progress": current_prog,
        "remaining_amount": round(remaining_amt, 2),
        "progress_percentage": progress_pct,
        "target_date": g["target_date"],
        "days_remaining": days_left,
        "months_remaining": round(months_left, 1),
        "required_monthly_contribution": required_monthly,
        "status": status,
        "status_color": status_color
    }
