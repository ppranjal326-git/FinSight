import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle2 
} from 'lucide-react';
import { fetchForecast, formatCurrency } from '../api';

export default function ForecastTab() {
  const [horizon, setHorizon] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadForecast(horizon);
  }, [horizon]);

  async function loadForecast(days) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchForecast(days);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-[#FFFFFF] p-3.5 rounded-lg border border-[#E5E7EB] shadow-md text-xs space-y-1.5 min-w-[220px]">
          <div className="font-semibold text-[#172033] border-b border-[#E5E7EB] pb-1 flex justify-between">
            <span>{item.date}</span>
            <span className="text-[#087F8C]">Day {item.day}</span>
          </div>
          <div className="flex justify-between items-center text-[#667085]">
            <span>Expected Balance:</span>
            <span className="font-bold text-[#172033]">{formatCurrency(item.expected_balance)}</span>
          </div>
          <div className="flex justify-between items-center text-[#667085]">
            <span>Confidence Range:</span>
            <span className="text-[#172033] font-medium">
              {formatCurrency(item.min_balance)} - {formatCurrency(item.max_balance)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[#667085]">
            <span>Net Daily Change:</span>
            <span className={item.net_daily >= 0 ? 'text-[#168A5B] font-semibold' : 'text-[#C2415A] font-semibold'}>
              {item.net_daily >= 0 ? '+' : ''}{formatCurrency(item.net_daily)}
            </span>
          </div>
          {item.events && (
            <div className="mt-1 pt-1 border-t border-[#E5E7EB] text-[11px] text-[#C77A00] font-medium">
              • {item.events}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#087F8C]" />
            <span>Probabilistic Cash Flow Forecast</span>
          </h2>
          <p className="text-xs text-[#667085]">
            Projections incorporate a daily ±1.5σ confidence corridor reflecting discretionary spending volatility and fixed obligations.
          </p>
        </div>

        {/* Horizon Selector */}
        <div className="flex items-center gap-1 bg-[#F0F2EF] p-1 rounded-lg border border-[#E5E7EB]">
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setHorizon(days)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                horizon === days
                  ? 'bg-[#087F8C] text-[#FFFFFF] shadow-xs'
                  : 'text-[#667085] hover:text-[#172033]'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
            <span className="text-xs font-medium text-[#667085]">Starting Liquidity</span>
            <div className="text-xl font-bold text-[#172033] mt-1">
              {formatCurrency(data.starting_balance)}
            </div>
            <div className="text-[11px] text-[#667085] mt-1">HDFC Checking Active</div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
            <span className="text-xs font-medium text-[#667085]">Projected Ending Range</span>
            <div className="text-xl font-bold text-[#087F8C] mt-1">
              {formatCurrency(data.ending_expected)}
            </div>
            <div className="text-[11px] text-[#667085] mt-1 flex justify-between">
              <span>Min: {formatCurrency(data.ending_min)}</span>
              <span>Max: {formatCurrency(data.ending_max)}</span>
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
            <span className="text-xs font-medium text-[#667085]">Lowest Projected Dip</span>
            <div className="text-xl font-bold text-[#C77A00] mt-1">
              {formatCurrency(data.lowest_projected)}
            </div>
            <div className="text-[11px] text-[#168A5B] mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Solvency Maintained
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
            <span className="text-xs font-medium text-[#667085]">Liquidity Runway Buffer</span>
            <div className="text-xl font-bold text-[#168A5B] mt-1">
              {data.runway_days}+ Days
            </div>
            <div className="text-[11px] text-[#667085] mt-1">Above ₹25,000 safety threshold</div>
          </div>

        </div>
      )}

      {/* Main Chart Container */}
      <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#172033]">Daily Projected Balance Trajectory</h3>
            <p className="text-xs text-[#667085]">
              Light teal band represents range of uncertainty. Solid teal line represents expected trajectory.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#087F8C]" />
              <span className="text-[#172033] font-medium">Expected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#E6F4F2] border border-[#087F8C]/30" />
              <span className="text-[#667085]">Confidence Band (Min-Max)</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-[360px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#087F8C] border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="h-[360px] flex items-center justify-center text-[#C2415A] text-sm">
            {error}
          </div>
        ) : (
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data?.trajectory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                  domain={['dataMin - 15000', 'dataMax + 15000']}
                  tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Confidence Corridor Band */}
                <Area 
                  type="monotone" 
                  dataKey="max_balance" 
                  stroke="transparent" 
                  fill="#E6F4F2"
                  fillOpacity={0.8}
                  name="Max Range"
                />
                <Area 
                  type="monotone" 
                  dataKey="min_balance" 
                  stroke="#087F8C"
                  strokeOpacity={0.3}
                  strokeDasharray="4 4"
                  fill="#FFFFFF" 
                  name="Min Range"
                />

                {/* Core Expected Trajectory Line */}
                <Line 
                  type="monotone" 
                  dataKey="expected_balance" 
                  stroke="#087F8C" 
                  strokeWidth={2.5} 
                  dot={false}
                  activeDot={{ r: 5, fill: '#087F8C', stroke: '#FFFFFF', strokeWidth: 2 }}
                  name="Expected Balance"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Scheduled Future Cash Inflows & Outflows */}
      {data && (
        <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <h3 className="text-sm font-semibold text-[#172033] mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#087F8C]" />
            <span>Key Calendar Events In Projection Window</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.trajectory
              .filter(item => item.events)
              .slice(0, 9)
              .map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-[#F0F2EF]/50 border border-[#E5E7EB] flex items-start justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-[#087F8C]">{item.date}</div>
                    <div className="text-xs text-[#172033] mt-0.5 font-medium">{item.events}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#667085]">Balance:</span>
                    <div className="text-xs font-bold text-[#172033]">{formatCurrency(item.expected_balance)}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
}
