import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  Sliders, 
  Target 
} from 'lucide-react';
import { simulateScenario, formatCurrency } from '../api';

export default function SimulatorTab() {
  const [scenarioType, setScenarioType] = useState('job_loss');
  const [durationMonths, setDurationMonths] = useState(3);
  const [expenseAmount, setExpenseAmount] = useState(50000);
  const [rateHike, setRateHike] = useState(15);
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    runSimulation();
  }, []);

  async function runSimulation(overrideParams = null) {
    try {
      setLoading(true);
      setError(null);

      let params = {};
      if (overrideParams) {
        params = overrideParams;
      } else if (scenarioType === 'job_loss') {
        params = { type: 'job_loss', duration_months: Number(durationMonths) };
      } else if (scenarioType === 'large_expense') {
        params = { type: 'large_expense', amount: Number(expenseAmount) };
      } else if (scenarioType === 'rate_change') {
        params = { type: 'rate_change', new_rate: Number(rateHike) };
      }

      const res = await simulateScenario(params);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handlePreset(preset) {
    if (preset === 'job_loss_3m') {
      setScenarioType('job_loss');
      setDurationMonths(3);
      runSimulation({ type: 'job_loss', duration_months: 3 });
    } else if (preset === 'large_expense_50k') {
      setScenarioType('large_expense');
      setExpenseAmount(50000);
      runSimulation({ type: 'large_expense', amount: 50000 });
    } else if (preset === 'large_expense_75k') {
      setScenarioType('large_expense');
      setExpenseAmount(75000);
      runSimulation({ type: 'large_expense', amount: 75000 });
    } else if (preset === 'rate_hike_15') {
      setScenarioType('rate_change');
      setRateHike(15);
      runSimulation({ type: 'rate_change', new_rate: 15 });
    }
  }

  // Combine trajectories for unified chart rendering
  const combinedTrajectory = (result?.baseline_trajectory || []).map((base, idx) => {
    const scn = result?.scenario_trajectory?.[idx] || {};
    return {
      date: base.date,
      day: base.day,
      baseline: base.expected_balance,
      scenario: scn.expected_balance
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#087F8C]" />
          <span>What-If Financial Stress Simulator</span>
        </h2>
        <p className="text-xs text-[#667085]">
          Simulate shock events (income disruption, emergency capital expenditure, interest rate spikes) and quantify exact runway & goal timeline deltas.
        </p>
      </div>

      {/* Preset Quick Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#667085] font-medium">Quick Presets:</span>
        <button
          onClick={() => handlePreset('job_loss_3m')}
          className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F0F2EF] border border-[#E5E7EB] text-xs text-[#172033] font-medium transition shadow-xs"
        >
          💼 Job Loss (3 Mo)
        </button>
        <button
          onClick={() => handlePreset('large_expense_50k')}
          className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F0F2EF] border border-[#E5E7EB] text-xs text-[#172033] font-medium transition shadow-xs"
        >
          🏥 Emergency Medical (₹50k)
        </button>
        <button
          onClick={() => handlePreset('large_expense_75k')}
          className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F0F2EF] border border-[#E5E7EB] text-xs text-[#172033] font-medium transition shadow-xs"
        >
          💻 Major Tech Purchase (₹75k)
        </button>
        <button
          onClick={() => handlePreset('rate_hike_15')}
          className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F0F2EF] border border-[#E5E7EB] text-xs text-[#172033] font-medium transition shadow-xs"
        >
          📈 15% Rent/Inflation Hike
        </button>
      </div>

      {/* Configuration Form */}
      <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          
          <div>
            <label className="block text-xs font-medium text-[#667085] mb-1.5">Scenario Type</label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#087F8C]"
            >
              <option value="job_loss">Income Disruption (Job Loss)</option>
              <option value="large_expense">Unplanned Lump-Sum Expense</option>
              <option value="rate_change">Fixed Mandate / Rent Increase</option>
            </select>
          </div>

          {scenarioType === 'job_loss' && (
            <div>
              <label className="block text-xs font-medium text-[#667085] mb-1.5">Disruption Duration (Months)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#087F8C]"
              />
            </div>
          )}

          {scenarioType === 'large_expense' && (
            <div>
              <label className="block text-xs font-medium text-[#667085] mb-1.5">Lump-Sum Amount (₹)</label>
              <input
                type="number"
                step="5000"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#087F8C]"
              />
            </div>
          )}

          {scenarioType === 'rate_change' && (
            <div>
              <label className="block text-xs font-medium text-[#667085] mb-1.5">Recurring Mandate Spike (%)</label>
              <input
                type="number"
                step="1"
                value={rateHike}
                onChange={(e) => setRateHike(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#087F8C]"
              />
            </div>
          )}

          <div>
            <button
              onClick={() => runSimulation()}
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg bg-[#087F8C] hover:bg-[#066873] text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
            >
              {loading ? 'Simulating Trajectory...' : 'Run Stress Simulation'}
            </button>
          </div>

        </div>
      </div>

      {/* Before / After Impact Cards */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
            <span className="text-xs font-medium text-[#667085]">90-Day Projected Liquidity</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-bold text-[#087F8C]">
                {formatCurrency(result.baseline_summary.ending_expected)}
              </span>
              <span className="text-xs text-[#667085]">→</span>
              <span className="text-lg font-bold text-[#C2415A]">
                {formatCurrency(result.scenario_summary.ending_expected)}
              </span>
            </div>
            <div className="text-[11px] text-[#C2415A] font-semibold mt-1">
              Net Impact: {formatCurrency(result.variance.balance_delta)}
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
            <span className="text-xs font-medium text-[#667085]">Runway Days (Buffer &gt; ₹25k)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-bold text-[#168A5B]">
                {result.baseline_summary.runway_days}d
              </span>
              <span className="text-xs text-[#667085]">→</span>
              <span className={`text-lg font-bold ${result.scenario_summary.runway_days < 60 ? 'text-[#C2415A]' : 'text-[#C77A00]'}`}>
                {result.scenario_summary.runway_days}d
              </span>
            </div>
            <div className="text-[11px] text-[#667085] mt-1">
              Runway delta: {result.variance.runway_days_delta} days
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
            <span className="text-xs font-medium text-[#667085]">Lowest Cash Trough</span>
            <div className="text-lg font-bold text-[#172033] mt-1">
              {formatCurrency(result.scenario_summary.lowest_projected)}
            </div>
            <div className="text-[11px] text-[#667085] mt-1">
              {result.scenario_summary.lowest_projected > 0 ? (
                <span className="text-[#168A5B] font-medium">Remains solvent throughout</span>
              ) : (
                <span className="text-[#C2415A] font-semibold">Insolvency risk breached</span>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Side-by-side Overlay Trajectory Chart */}
      <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#172033]">Baseline vs Stress Scenario Trajectory</h3>
            <p className="text-xs text-[#667085]">Direct side-by-side comparison of account balance over 90 days.</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#087F8C]" />
              <span className="text-[#172033] font-medium">Baseline (No Shock)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#C2415A]" />
              <span className="text-[#172033] font-medium">Scenario Applied</span>
            </div>
          </div>
        </div>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedTrajectory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF" 
                fontSize={11}
                tick={{ fill: '#667085' }}
                tickFormatter={(val) => {
                  const parts = val.split('-');
                  return `${parts[1]}/${parts[2]}`;
                }}
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={11}
                tick={{ fill: '#667085' }}
                tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-[#FFFFFF] p-3 rounded-lg border border-[#E5E7EB] shadow-md text-xs space-y-1">
                        <div className="font-semibold text-[#172033]">{item.date}</div>
                        <div className="text-[#087F8C] font-medium">Baseline: {formatCurrency(item.baseline)}</div>
                        <div className="text-[#C2415A] font-medium">Stress: {formatCurrency(item.scenario)}</div>
                        <div className="text-[#667085] pt-1 border-t border-[#E5E7EB]">
                          Gap: {formatCurrency(item.scenario - item.baseline)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="baseline" 
                stroke="#087F8C" 
                strokeWidth={2} 
                dot={false}
                name="Baseline"
              />
              <Line 
                type="monotone" 
                dataKey="scenario" 
                stroke="#C2415A" 
                strokeWidth={2} 
                dot={false}
                name="Scenario"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Goal Timeline Impact Table */}
      {result?.goal_impacts && (
        <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <h3 className="text-sm font-semibold text-[#172033] mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#087F8C]" />
            <span>Projected Impact on Financial Goals</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.goal_impacts.map((g) => (
              <div key={g.goal_id} className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E7EB] flex flex-col justify-between space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#172033]">{g.name}</h4>
                    <span className="text-[11px] text-[#667085]">Target: {formatCurrency(g.target_amount)} by {g.target_date}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                    g.impact_status.includes('Severe')
                      ? 'bg-[#FCECEF] text-[#C2415A] border-[#C2415A]/20'
                      : g.impact_status.includes('Moderate')
                      ? 'bg-[#FFF5E5] text-[#C77A00] border-[#C77A00]/20'
                      : 'bg-[#EAF7F0] text-[#168A5B] border-[#168A5B]/20'
                  }`}>
                    {g.impact_status}
                  </span>
                </div>
                <p className="text-xs text-[#667085]">{g.timeline_impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3.5 rounded-lg bg-[#F0F2EF] border border-[#E5E7EB] text-[11px] text-[#667085]">
        💡 <strong>Analytical Caveat:</strong> Scenario simulations are illustrative heuristic stress-tests based on 180-day baseline spend patterns. They do not constitute financial guarantees or certified solvency declarations.
      </div>

    </div>
  );
}
