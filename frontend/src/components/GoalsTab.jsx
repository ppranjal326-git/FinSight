import React, { useState, useEffect } from 'react';
import { 
  Target, 
  CheckCircle2, 
  Send
} from 'lucide-react';
import { fetchGoals, createApprovalRequest, formatCurrency } from '../api';

export default function GoalsTab({ onActionSubmitted }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transferGoalId, setTransferGoalId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchGoals();
      setGoals(res || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTransferRequest(goal) {
    try {
      setTransferGoalId(goal.goal_id);
      const transferAmount = Math.min(25000, goal.remaining_amount || 10000);

      await createApprovalRequest({
        action_type: 'transfer_funds',
        description: `Transfer ₹${transferAmount.toLocaleString()} from Checking surplus to "${goal.name}"`,
        impact_summary: `Accelerates ${goal.name} target completion without compromising minimum operational liquid reserves.`,
        risk_level: 'Low',
        payload: {
          from_account: 1,
          goal_id: goal.goal_id,
          amount: transferAmount
        }
      });

      setFeedback(`Capital transfer request for "${goal.name}" routed to Human Approval Gate!`);
      if (onActionSubmitted) onActionSubmitted();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      alert(`Error submitting transfer: ${err.message}`);
    } finally {
      setTransferGoalId(null);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-[#087F8C]" />
            <span>Target Goals & Amortized Timelines</span>
          </h2>
          <p className="text-xs text-[#667085]">
            Real-time tracking evaluated against your average monthly savings capacity (₹38,000/mo net cash flow).
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-lg bg-[#EAF7F0] border border-[#168A5B]/25 text-xs text-[#168A5B] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#168A5B] flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-[#FFFFFF] p-12 rounded-xl border border-[#E5E7EB] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#087F8C] border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#C2415A]/30 text-[#C2415A] text-sm">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((g) => {
            const isCompleted = g.status === 'Completed';
            const isOnTrack = g.status === 'On-Track';
            const isAtRisk = g.status === 'At-Risk';

            const statusClass = 
              isCompleted || isOnTrack 
                ? 'bg-[#EAF7F0] text-[#168A5B] border border-[#168A5B]/20' 
                : isAtRisk 
                ? 'bg-[#FFF5E5] text-[#C77A00] border border-[#C77A00]/20' 
                : 'bg-[#FCECEF] text-[#C2415A] border border-[#C2415A]/20';

            const barColor =
              isCompleted || isOnTrack ? 'bg-[#168A5B]' : isAtRisk ? 'bg-[#C77A00]' : 'bg-[#C2415A]';

            return (
              <div key={g.goal_id} className="bg-[#FFFFFF] p-6 rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between space-y-4">
                
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#172033]">{g.name}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusClass}`}>
                          {g.status}
                        </span>
                      </div>
                      <span className="text-xs text-[#667085] mt-0.5 block">
                        Priority: <strong className="text-[#172033] font-medium">{g.priority}</strong> • Deadline: <strong className="text-[#172033] font-medium">{g.target_date}</strong> ({g.months_remaining} mo left)
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-[#172033]">
                        {formatCurrency(g.current_progress)}
                      </div>
                      <div className="text-xs text-[#667085]">
                        of {formatCurrency(g.target_amount)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-[#F0F2EF] h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${barColor} rounded-full transition-all duration-300`}
                        style={{ width: `${g.progress_percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-[#667085] mt-1.5 font-medium">
                      <span>{g.progress_percentage}% Funded</span>
                      <span>Gap: {formatCurrency(g.remaining_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Contribution Requirements & Human-in-the-loop action */}
                <div className="pt-3 border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[#667085] block text-[11px]">Required Monthly Funding:</span>
                    <strong className="text-[#087F8C] font-semibold text-sm">
                      {formatCurrency(g.required_monthly_contribution)}/mo
                    </strong>
                  </div>

                  {!isCompleted && (
                    <button
                      onClick={() => handleTransferRequest(g)}
                      disabled={transferGoalId === g.goal_id}
                      className="px-3 py-1.5 rounded-lg bg-[#E6F4F2] hover:bg-[#087F8C] hover:text-white text-[#087F8C] font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      title="Propose funding allocation via Approval Gate"
                    >
                      <Send className="w-3 h-3" />
                      <span>{transferGoalId === g.goal_id ? 'Routing...' : 'Route Allocation Request'}</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
