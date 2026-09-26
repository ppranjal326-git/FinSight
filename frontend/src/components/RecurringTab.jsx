import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  Trash2, 
  Shield 
} from 'lucide-react';
import { fetchRecurring, createApprovalRequest, formatCurrency } from '../api';

export default function RecurringTab({ onActionSubmitted }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingMerchant, setCancellingMerchant] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadRecurring();
  }, []);

  async function loadRecurring() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchRecurring();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestCancellation(item) {
    try {
      setCancellingMerchant(item.merchant);
      await createApprovalRequest({
        action_type: 'cancel_subscription',
        description: `Cancel recurring subscription: ${item.merchant}`,
        impact_summary: `Saves ₹${item.amount.toLocaleString()}/month (₹${(item.amount * 12).toLocaleString()}/year). Redirects cash to goals.`,
        risk_level: 'Low',
        payload: {
          merchant: item.merchant,
          monthly_savings: item.amount
        }
      });

      setFeedback(`Cancellation request for "${item.merchant}" submitted to Human Approval Gate.`);
      if (onActionSubmitted) onActionSubmitted();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      alert(`Error submitting cancellation: ${err.message}`);
    } finally {
      setCancellingMerchant(null);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#087F8C]" />
            <span>Recurring Expenses & Subscriptions</span>
          </h2>
          <p className="text-xs text-[#667085]">
            Detected via temporal interval matching (regular ~30-day frequency) and low coefficient of variation in transaction amounts.
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-xs">
              <span className="text-[#667085]">Monthly Committed: </span>
              <strong className="text-[#172033] font-bold">{formatCurrency(data.total_monthly_recurring_spend)}</strong>
            </div>
            <div className="px-3.5 py-1.5 rounded-lg bg-[#EAF7F0] border border-[#168A5B]/25 text-xs">
              <span className="text-[#667085]">Recurring Inflows: </span>
              <strong className="text-[#168A5B] font-bold">{formatCurrency(data.total_monthly_recurring_income)}</strong>
            </div>
          </div>
        )}
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
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F0F2EF] border-b border-[#E5E7EB] text-[#667085] uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Merchant / Service</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Pattern Confidence</th>
                  <th className="py-3 px-4">Next Due Date</th>
                  <th className="py-3 px-4 text-right">Human-in-the-Loop Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {data?.items?.map((item, idx) => {
                  const isDebit = item.type === 'debit';
                  const confPct = Math.round(item.confidence_score * 100);

                  return (
                    <tr key={idx} className="hover:bg-[#F6F7F4] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#172033]">{item.merchant}</div>
                        <div className="text-[11px] text-[#667085]">{item.occurrences} observed cycles (avg {item.average_interval_days}d)</div>
                      </td>
                      <td className="py-3 px-4 text-[#667085]">
                        {item.category}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded bg-[#F0F2EF] text-[#172033] font-medium text-[11px] border border-[#E5E7EB]">
                          {item.frequency}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span className={isDebit ? 'text-[#172033]' : 'text-[#168A5B]'}>
                          {isDebit ? '-' : '+'}{formatCurrency(item.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#F0F2EF] h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#087F8C] rounded-full" 
                              style={{ width: `${confPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-[#087F8C]">{confPct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#172033] font-mono text-[11px]">
                        {item.next_expected_date}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isDebit ? (
                          <button
                            onClick={() => handleRequestCancellation(item)}
                            disabled={cancellingMerchant === item.merchant}
                            className="px-2.5 py-1 rounded bg-[#FFFFFF] hover:bg-[#FCECEF] border border-[#E5E7EB] hover:border-[#C2415A]/30 text-[#C2415A] text-[11px] font-medium transition inline-flex items-center gap-1 disabled:opacity-50"
                            title="Propose cancellation via Approval Gate (Agent cannot cancel autonomously)"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{cancellingMerchant === item.merchant ? 'Submitting...' : 'Request Cancel'}</span>
                          </button>
                        ) : (
                          <span className="text-[#168A5B] text-[11px] font-semibold">Income Source</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info notice about Guardrail */}
      <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E7EB] text-xs text-[#667085] flex items-start gap-3 shadow-xs">
        <Shield className="w-4 h-4 text-[#087F8C] flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#172033]">Architectural Protection:</strong> FinSight never cancels subscriptions or alters recurring mandates automatically. Requesting a cancellation creates an entry in the pending approvals queue, which will only execute upon your explicit signature.
        </div>
      </div>

    </div>
  );
}
