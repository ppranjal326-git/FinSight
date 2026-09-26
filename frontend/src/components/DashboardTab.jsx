import React from 'react';
import { 
  Wallet, 
  CreditCard, 
  AlertTriangle, 
  Calendar, 
  ArrowUpRight, 
  ShieldAlert, 
  Sparkles, 
  Clock
} from 'lucide-react';
import { formatCurrency } from '../api';

export default function DashboardTab({ dashboardData, setActiveTab, onRefresh }) {
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#087F8C] border-t-transparent"></div>
      </div>
    );
  }

  const {
    total_liquid_balance,
    accounts,
    monthly_budget,
    budgets,
    goals,
    upcoming_bills,
    anomalies_count,
    high_risk_anomalies_count,
    pending_approvals_count,
    recent_anomalies
  } = dashboardData;

  const checkingAccount = accounts?.find(a => a.name.includes('Checking') || a.id === 1);
  const savingsAccount = accounts?.find(a => a.name.includes('Savings') || a.id === 2);

  return (
    <div className="space-y-6">
      
      {/* Alert Banner if High-Risk Anomalies Exist */}
      {high_risk_anomalies_count > 0 && (
        <div className="rounded-xl bg-[#FCECEF] border border-[#C2415A]/30 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#FFFFFF] text-[#C2415A] border border-[#C2415A]/20 shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#172033]">
                  {high_risk_anomalies_count} Critical Financial Anomalies Flagged
                </h3>
                <p className="text-xs text-[#667085]">
                  Statistical outliers detected in recent debits including duplicate charges and unauthorized merchant patterns.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('anomalies')}
                className="px-3.5 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#FCECEF] border border-[#C2415A]/40 text-xs font-semibold text-[#C2415A] transition flex items-center gap-1.5"
              >
                <span>Inspect Anomaly Signals</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Liquid Reserves */}
        <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#667085]">Total Liquid Reserves</span>
            <div className="p-2 rounded-lg bg-[#E6F4F2] text-[#087F8C]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#172033] tracking-tight">
            {formatCurrency(total_liquid_balance)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#667085] pt-2 border-t border-[#E5E7EB]">
            <span>Checking: {formatCurrency(checkingAccount?.current_balance || 0)}</span>
            <span className="text-[#087F8C] font-medium">Savings: {formatCurrency(savingsAccount?.current_balance || 0)}</span>
          </div>
        </div>

        {/* Monthly Budget Spending */}
        <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#667085]">Monthly Discretionary Burn</span>
            <div className="p-2 rounded-lg bg-[#FFF5E5] text-[#C77A00]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#172033] tracking-tight">
              {formatCurrency(monthly_budget?.spent || 0)}
            </span>
            <span className="text-xs text-[#667085]">
              / {formatCurrency(monthly_budget?.limit || 0)}
            </span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-[#F0F2EF] h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  (monthly_budget?.pct_used || 0) > 100 
                    ? 'bg-[#C2415A]' 
                    : (monthly_budget?.pct_used || 0) > 80 
                    ? 'bg-[#C77A00]' 
                    : 'bg-[#087F8C]'
                }`}
                style={{ width: `${Math.min(100, monthly_budget?.pct_used || 0)}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-[11px] text-[#667085]">
              <span>{monthly_budget?.pct_used || 0}% of budget utilized</span>
              {(monthly_budget?.pct_used || 0) > 100 && (
                <span className="text-[#C2415A] font-semibold">Over Budget</span>
              )}
            </div>
          </div>
        </div>

        {/* Active Risk Anomalies */}
        <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#667085]">Detected Outliers</span>
            <div className="p-2 rounded-lg bg-[#FCECEF] text-[#C2415A]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#C2415A] tracking-tight">
              {anomalies_count || 0}
            </span>
            <span className="text-xs text-[#667085]">flagged items</span>
          </div>
          <div className="mt-3 text-xs text-[#667085] pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[#C2415A] font-medium">{high_risk_anomalies_count} High Severity (&gt;3σ)</span>
            <button 
              onClick={() => setActiveTab('anomalies')}
              className="text-[#087F8C] hover:text-[#066873] text-[11px] font-semibold flex items-center gap-0.5"
            >
              Review <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Guardrail Approvals Pending */}
        <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#667085]">Human Approval Gate</span>
            <div className="p-2 rounded-lg bg-[#E6F4F2] text-[#087F8C]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#087F8C] tracking-tight">
              {pending_approvals_count || 0}
            </span>
            <span className="text-xs text-[#667085]">pending actions</span>
          </div>
          <div className="mt-3 text-xs text-[#667085] pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[#168A5B] font-medium">Zero Auto-Execution</span>
            <button 
              onClick={() => setActiveTab('recommendations')}
              className="text-[#087F8C] hover:text-[#066873] text-[11px] font-semibold flex items-center gap-0.5"
            >
              Take Action <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Grid: Upcoming Bills & Goal Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Goal Progress & Recent Anomaly Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Financial Goals Tracking */}
          <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-[#172033]">Financial Goal Trajectories</h3>
                <p className="text-xs text-[#667085]">Computed against historical monthly net savings surplus (₹38,000/mo)</p>
              </div>
              <button 
                onClick={() => setActiveTab('goals')}
                className="text-xs text-[#087F8C] hover:text-[#066873] font-semibold flex items-center gap-1"
              >
                View Details <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {goals?.map((goal) => {
                const isPositive = goal.status === 'On-Track' || goal.status === 'Completed';
                const isWarning = goal.status === 'At-Risk';

                const statusBg = 
                  isPositive
                    ? 'bg-[#EAF7F0] text-[#168A5B] border border-[#168A5B]/20'
                    : isWarning
                    ? 'bg-[#FFF5E5] text-[#C77A00] border border-[#C77A00]/20'
                    : 'bg-[#FCECEF] text-[#C2415A] border border-[#C2415A]/20';

                const barColor = 
                  isPositive ? 'bg-[#168A5B]' : isWarning ? 'bg-[#C77A00]' : 'bg-[#C2415A]';

                return (
                  <div key={goal.goal_id} className="p-3.5 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB]">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#172033]">{goal.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${statusBg}`}>
                            {goal.status}
                          </span>
                        </div>
                        <span className="text-xs text-[#667085]">Target Date: {goal.target_date} ({goal.months_remaining} mo left)</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-[#172033]">
                          {formatCurrency(goal.current_progress)} / {formatCurrency(goal.target_amount)}
                        </div>
                        <div className="text-[11px] text-[#087F8C] font-medium">
                          Need: {formatCurrency(goal.required_monthly_contribution)}/mo
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#F0F2EF] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${goal.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Anomaly Preview */}
          <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-[#172033]">Recent Statistical Anomaly Signals</h3>
                <p className="text-xs text-[#667085]">Outliers exceeding expected distribution baselines</p>
              </div>
              <button 
                onClick={() => setActiveTab('anomalies')}
                className="text-xs text-[#087F8C] hover:text-[#066873] font-semibold flex items-center gap-1"
              >
                All Anomalies <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="space-y-2.5">
              {recent_anomalies?.map((a) => (
                <div key={a.transaction_id} className="p-3 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] flex items-start justify-between gap-4 hover:border-[#D1D5DB] transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#172033]">{a.merchant}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                        a.severity === 'High' 
                          ? 'bg-[#FCECEF] text-[#C2415A] border-[#C2415A]/20' 
                          : 'bg-[#FFF5E5] text-[#C77A00] border-[#C77A00]/20'
                      }`}>
                        {a.severity} Severity
                      </span>
                      <span className="text-[11px] text-[#667085]">{a.date}</span>
                    </div>
                    <p className="text-xs text-[#667085]">{a.reasoning}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-sm font-bold text-[#C2415A]">-{formatCurrency(a.amount)}</div>
                    <div className="text-[10px] text-[#667085]">Z-score: {a.z_score}σ</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Upcoming Recurring Bills & Budgets Breakdown */}
        <div className="space-y-6">
          
          {/* Upcoming Bills */}
          <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#087F8C]" />
                <h3 className="text-sm font-semibold text-[#172033]">Upcoming Obligations</h3>
              </div>
              <button 
                onClick={() => setActiveTab('recurring')}
                className="text-xs text-[#087F8C] hover:text-[#066873] font-semibold"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2.5">
              {upcoming_bills?.map((bill, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#F0F2EF]/60 border border-[#E5E7EB]">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-[#172033]">{bill.merchant}</div>
                    <div className="text-[11px] text-[#667085] flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-[#667085]" />
                      <span>Due: {bill.next_expected_date}</span>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-[#172033]">
                    {formatCurrency(bill.amount)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5E7EB]">
              <button
                onClick={() => setActiveTab('forecast')}
                className="w-full py-2 px-3 rounded-lg bg-[#E6F4F2] hover:bg-[#087F8C] hover:text-[#FFFFFF] text-xs font-semibold text-[#087F8C] transition text-center"
              >
                Simulate 30-Day Cash Flow Runway →
              </button>
            </div>
          </div>

          {/* Category Budgets Overview */}
          <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E5E7EB] shadow-xs">
            <h3 className="text-sm font-semibold text-[#172033] mb-3">Category Spending Caps</h3>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {budgets?.map((b) => {
                const pct = Math.round((b.current_spent / b.monthly_limit) * 100);
                const isOver = pct > 100;
                return (
                  <div key={b.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#172033] font-medium">{b.category}</span>
                      <span className={isOver ? 'text-[#C2415A] font-semibold' : 'text-[#667085]'}>
                        {formatCurrency(b.current_spent)} / {formatCurrency(b.monthly_limit)}
                      </span>
                    </div>
                    <div className="w-full bg-[#F0F2EF] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? 'bg-[#C2415A]' : pct > 80 ? 'bg-[#C77A00]' : 'bg-[#087F8C]'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
