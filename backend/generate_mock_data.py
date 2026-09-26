import sqlite3
import random
import json
from datetime import datetime, timedelta
from pathlib import Path
from database import get_db, init_db

def generate_mock_data():
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    # Clear existing data for fresh seed
    cursor.execute("DELETE FROM approval_requests")
    cursor.execute("DELETE FROM goals")
    cursor.execute("DELETE FROM budgets")
    cursor.execute("DELETE FROM income_sources")
    cursor.execute("DELETE FROM recurring_expenses")
    cursor.execute("DELETE FROM transactions")
    cursor.execute("DELETE FROM accounts")

    # 1. Accounts
    cursor.execute("INSERT INTO accounts (name, current_balance) VALUES (?, ?)", ("HDFC Salary & Checking", 184520.0))
    checking_id = cursor.lastrowid

    cursor.execute("INSERT INTO accounts (name, current_balance) VALUES (?, ?)", ("ICICI High-Yield Savings", 350000.0))
    savings_id = cursor.lastrowid

    # 2. Income sources
    cursor.execute("""
    INSERT INTO income_sources (source_name, amount, frequency, last_received)
    VALUES (?, ?, ?, ?)
    """, ("TechCorp Senior Engineer Salary", 95000.0, "monthly", "2026-09-01"))

    cursor.execute("""
    INSERT INTO income_sources (source_name, amount, frequency, last_received)
    VALUES (?, ?, ?, ?)
    """, ("Fintech Advisory Retainer", 25000.0, "monthly", "2026-09-10"))

    # 3. Budgets
    budgets_data = [
        ("Rent & Housing", 30000.0, 28000.0),
        ("Groceries & Food", 16000.0, 14200.0),
        ("Dining & Cafes", 14000.0, 16850.0), # over budget
        ("Utilities & Bills", 8000.0, 5840.0),
        ("Subscriptions & Media", 6000.0, 4850.0),
        ("Shopping & Lifestyle", 18000.0, 96500.0), # massive overspend due to luxury anomaly
        ("Transport & Fuel", 8000.0, 6200.0),
        ("Healthcare & Fitness", 5000.0, 3100.0)
    ]
    for cat, limit, spent in budgets_data:
        cursor.execute("INSERT INTO budgets (category, monthly_limit, current_spent) VALUES (?, ?, ?)", (cat, limit, spent))

    # 4. Goals
    goals_data = [
        ("Emergency Fund (6 Months)", 400000.0, "2026-12-31", 350000.0, "High"),
        ("Japan Autumn Trip 2026", 220000.0, "2026-11-20", 145000.0, "Medium"),
        ("Home Down Payment", 1500000.0, "2027-12-31", 480000.0, "High"),
        ("Electric Vehicle Upgrade", 500000.0, "2027-06-30", 95000.0, "Low")
    ]
    for name, target, date_str, progress, prio in goals_data:
        cursor.execute("""
        INSERT INTO goals (name, target_amount, target_date, current_progress, priority)
        VALUES (?, ?, ?, ?, ?)
        """, (name, target, date_str, progress, prio))

    # 5. Recurring Expenses pre-seeds / detection ground truth
    recurring_data = [
        ("Godrej Properties - Rent", 28000.0, "monthly", "Rent & Housing", 0.99, "2026-10-05"),
        ("Cult.fit Premium Gym", 2499.0, "monthly", "Healthcare & Fitness", 0.96, "2026-10-22"),
        ("Netflix Premium 4K", 649.0, "monthly", "Subscriptions & Media", 0.98, "2026-10-14"),
        ("Airtel Fiber Gigabit", 1179.0, "monthly", "Utilities & Bills", 0.97, "2026-10-12"),
        ("Spotify Premium Family", 179.0, "monthly", "Subscriptions & Media", 0.98, "2026-10-18"),
        ("Tata Power BESCOM", 2850.0, "monthly", "Utilities & Bills", 0.92, "2026-10-10"),
        ("Apple One Premier", 365.0, "monthly", "Subscriptions & Media", 0.95, "2026-10-25"),
        ("AWS Web Services Hosting", 14250.0, "monthly", "Utilities & Bills", 0.89, "2026-10-22")
    ]
    for merch, amt, freq, cat, conf, next_date in recurring_data:
        cursor.execute("""
        INSERT INTO recurring_expenses (merchant, amount, frequency, category, confidence_score, next_expected_date, status)
        VALUES (?, ?, ?, ?, ?, ?, 'active')
        """, (merch, amt, freq, cat, conf, next_date))

    # 6. Generate 6 Months of Transaction History (from March 26, 2026 to September 26, 2026)
    # Start balance ~ 125,000
    current_balance = 125000.0
    transactions = []

    start_date = datetime(2026, 3, 26)
    end_date = datetime(2026, 9, 26)
    num_days = (end_date - start_date).days

    # Daily baseline generator
    for day_offset in range(num_days + 1):
        dt = start_date + timedelta(days=day_offset)
        date_str = dt.strftime("%Y-%m-%d")
        day_of_month = dt.day

        # 1st of month: TechCorp Salary Credit
        if day_of_month == 1:
            current_balance += 95000.0
            transactions.append({
                "date": date_str,
                "amount": 95000.0,
                "merchant": "TechCorp Salary Payroll",
                "category": "Income",
                "account_id": checking_id,
                "type": "credit",
                "balance_after": current_balance
            })

        # 10th of month: Retainer Fee
        if day_of_month == 10:
            current_balance += 25000.0
            transactions.append({
                "date": date_str,
                "amount": 25000.0,
                "merchant": "Fintech Advisory Retainer",
                "category": "Income",
                "account_id": checking_id,
                "type": "credit",
                "balance_after": current_balance
            })

        # 5th of month: Rent
        if day_of_month == 5:
            current_balance -= 28000.0
            transactions.append({
                "date": date_str,
                "amount": 28000.0,
                "merchant": "Godrej Properties - Rent",
                "category": "Rent & Housing",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

        # 10th: Tata Power Bill
        if day_of_month == 10:
            elec_bill = round(random.uniform(2600.0, 3100.0), 2)
            current_balance -= elec_bill
            transactions.append({
                "date": date_str,
                "amount": elec_bill,
                "merchant": "Tata Power BESCOM",
                "category": "Utilities & Bills",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

        # 12th: Broadband
        if day_of_month == 12:
            current_balance -= 1179.0
            transactions.append({
                "date": date_str,
                "amount": 1179.0,
                "merchant": "Airtel Fiber Gigabit",
                "category": "Utilities & Bills",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

        # 14th: Netflix
        if day_of_month == 14:
            current_balance -= 649.0
            transactions.append({
                "date": date_str,
                "amount": 649.0,
                "merchant": "Netflix Premium 4K",
                "category": "Subscriptions & Media",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

        # 18th: Spotify
        if day_of_month == 18:
            current_balance -= 179.0
            transactions.append({
                "date": date_str,
                "amount": 179.0,
                "merchant": "Spotify Premium Family",
                "category": "Subscriptions & Media",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

        # 22nd: Gym
        if day_of_month == 22:
            current_balance -= 2499.0
            transactions.append({
                "date": date_str,
                "amount": 2499.0,
                "merchant": "Cult.fit Premium Gym",
                "category": "Healthcare & Fitness",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

        # 25th: Apple One
        if day_of_month == 25:
            current_balance -= 365.0
            transactions.append({
                "date": date_str,
                "amount": 365.0,
                "merchant": "Apple One Premier",
                "category": "Subscriptions & Media",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

        # AWS hosting regular monthly charge (around 22nd)
        if day_of_month == 22 and dt.month < 9:
            current_balance -= 14250.0
            transactions.append({
                "date": date_str,
                "amount": 14250.0,
                "merchant": "AWS Cloud Infrastructure",
                "category": "Utilities & Bills",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

        # Groceries: ~2 times a week
        if dt.weekday() in [2, 6] and random.random() > 0.15:
            g_amt = round(random.uniform(1150.0, 2650.0), 2)
            merchant = random.choice(["Zepto Quick Mart", "Blinkit Instant", "Nature's Basket Organic"])
            current_balance -= g_amt
            transactions.append({
                "date": date_str,
                "amount": g_amt,
                "merchant": merchant,
                "category": "Groceries & Food",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

        # Dining & Cafes: 2-3 times a week
        if dt.weekday() in [1, 4, 5] and random.random() > 0.2:
            d_amt = round(random.uniform(380.0, 1650.0), 2)
            merchant = random.choice(["Starbucks Reserve", "Swiggy Gourmet Delivery", "Zomato DineOut", "Third Wave Coffee Roasters"])
            current_balance -= d_amt
            transactions.append({
                "date": date_str,
                "amount": d_amt,
                "merchant": merchant,
                "category": "Dining & Cafes",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

        # Transport & Fuel: 2 times a week
        if dt.weekday() in [0, 3] and random.random() > 0.25:
            t_amt = round(random.uniform(220.0, 780.0), 2)
            merchant = random.choice(["Uber India", "Ola Cabs Prime", "Shell Petrol Station"])
            current_balance -= t_amt
            transactions.append({
                "date": date_str,
                "amount": t_amt,
                "merchant": merchant,
                "category": "Transport & Fuel",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

        # Routine Shopping: occasional (1-2 times a month, ~1500 to 4500)
        if random.random() < 0.08:
            s_amt = round(random.uniform(1450.0, 4200.0), 2)
            merchant = random.choice(["Amazon Retail India", "Myntra Fashion Store", "Decathlon Sports"])
            current_balance -= s_amt
            transactions.append({
                "date": date_str,
                "amount": s_amt,
                "merchant": merchant,
                "category": "Shopping & Lifestyle",
                "account_id": checking_id,
                "type": "debit",
                "balance_after": current_balance
            })

    # =========================================================================
    # DELIBERATELY INSERTED ANOMALIES (CRITICAL FOR DEMO)
    # =========================================================================

    # 1. ANOMALY 1: Unusually massive transaction (Shopping baseline is ~2,500 with max ~4,500; this is 78,500 -> Z > 15)
    current_balance -= 78500.0
    transactions.append({
        "date": "2026-09-18",
        "amount": 78500.0,
        "merchant": "ChronoCraft Swiss Luxury Watches",
        "category": "Shopping & Lifestyle",
        "account_id": checking_id,
        "type": "debit",
        "balance_after": current_balance
    })

    # 2. ANOMALY 2: Duplicate rapid charge (AWS billed twice on Sept 22 within minutes)
    current_balance -= 14250.0
    transactions.append({
        "date": "2026-09-22",
        "amount": 14250.0,
        "merchant": "AWS Cloud Infrastructure",
        "category": "Utilities & Bills",
        "account_id": checking_id,
        "type": "debit",
        "balance_after": current_balance
    })

    current_balance -= 14250.0
    transactions.append({
        "date": "2026-09-22",
        "amount": 14250.0,
        "merchant": "AWS Cloud Infrastructure",
        "category": "Utilities & Bills",
        "account_id": checking_id,
        "type": "debit",
        "balance_after": current_balance
    })

    # 3. ANOMALY 3: Unrecognized foreign merchant / high risk international transfer
    current_balance -= 38900.0
    transactions.append({
        "date": "2026-09-24",
        "amount": 38900.0,
        "merchant": "CryptoVault Global Seychelles Ltd",
        "category": "Uncategorized",
        "account_id": checking_id,
        "type": "debit",
        "balance_after": current_balance
    })

    # Sort transactions chronologically
    transactions.sort(key=lambda x: x["date"])

    # Re-calculate running balance strictly
    running_balance = 145000.0
    for tx in transactions:
        if tx["type"] == "credit":
            running_balance += tx["amount"]
        else:
            running_balance -= tx["amount"]
        tx["balance_after"] = round(running_balance, 2)

    # Insert transactions into database
    for tx in transactions:
        cursor.execute("""
        INSERT INTO transactions (date, amount, merchant, category, account_id, type, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (tx["date"], tx["amount"], tx["merchant"], tx["category"], tx["account_id"], tx["type"], tx["balance_after"]))

    # Update account balance to latest balance_after
    cursor.execute("UPDATE accounts SET current_balance = ? WHERE id = ?", (round(running_balance, 2), checking_id))

    # 7. Seed Sample Approval Requests to demonstrate the Guardrail Gate
    cursor.execute("""
    INSERT INTO approval_requests (action_type, description, impact_summary, risk_level, status, created_at, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        "cancel_subscription",
        "Cancel Cult.fit Premium Gym Membership (Unused for 74 consecutive days)",
        "Saves ₹2,499/month (₹29,988/year). Zero adverse impact on savings goals; redirects funds to Emergency Fund.",
        "Low",
        "pending",
        "2026-09-25 11:30:00",
        json.dumps({"action": "cancel_subscription", "merchant": "Cult.fit Premium Gym", "monthly_savings": 2499.0})
    ))

    cursor.execute("""
    INSERT INTO approval_requests (action_type, description, impact_summary, risk_level, status, created_at, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        "dispute_duplicate_charge",
        "File automated merchant dispute for AWS Cloud Infrastructure duplicate charge (₹14,250)",
        "Recovers ₹14,250 into HDFC Checking account within 3-5 business days.",
        "Low",
        "pending",
        "2026-09-24 16:45:00",
        json.dumps({"action": "dispute_charge", "merchant": "AWS Cloud Infrastructure", "amount": 14250.0, "tx_date": "2026-09-22"})
    ))

    cursor.execute("""
    INSERT INTO approval_requests (action_type, description, impact_summary, risk_level, status, created_at, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        "reallocate_funds_to_goal",
        "Transfer ₹35,000 surplus from Checking to Japan Autumn Trip Goal",
        "Accelerates goal target date by 28 days without breaching 30-day minimum checking runway buffer.",
        "Medium",
        "pending",
        "2026-09-26 09:15:00",
        json.dumps({"action": "transfer_funds", "from_account": 1, "goal_id": 2, "amount": 35000.0})
    ))

    conn.commit()
    conn.close()
    print(f"Generated {len(transactions)} transactions with final checking balance: ₹{running_balance:,.2f}")

if __name__ == "__main__":
    generate_mock_data()
