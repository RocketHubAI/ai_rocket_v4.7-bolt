import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Users, Calculator, Zap, Crown, Target, AlertCircle, CheckCircle, MessageSquare, ArrowRight, Timer, Rocket, Star, X, Sparkles, FileText, BarChart3, Bot, Briefcase, Shield, Beaker, Layout, BookOpen } from 'lucide-react';

type StrategyType = 'trial' | 'freemium';

interface CalculatorInputs {
  strategyType: StrategyType;
  monthlySignups: number;
  conversionRatePro: number;
  conversionRatePlus: number;
  churnRate: number;
  costPerFreeUser: number;
  costPerProUser: number;
  trialLength: number;
}

export const PricingStrategyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'recommended' | 'calculator' | 'comparison' | 'ask-astra' | 'alternatives'>('recommended');

  const [inputs, setInputs] = useState<CalculatorInputs>({
    strategyType: 'trial',
    monthlySignups: 100,
    conversionRatePro: 15,
    conversionRatePlus: 5,
    churnRate: 5,
    costPerFreeUser: 2,
    costPerProUser: 15,
    trialLength: 10
  });

  const calculateProjections = useMemo(() => {
    const signupsPerMonth = inputs.monthlySignups;
    const conversionRatePro = inputs.conversionRatePro / 100;
    const conversionRateUltra = inputs.conversionRatePlus / 100;
    const churnRate = inputs.churnRate / 100;
    const proPricing = 99;
    const ultraPricing = 149;
    const previewPassPricing = 79;
    const avgSeatsPerTeam = 2.5;
    const seatPricePro = 29;
    const seatPriceUltra = 19;

    // Month 1
    const month1 = {
      signups: signupsPerMonth,
      freeUsers: signupsPerMonth,
      proUsers: 0,
      ultraUsers: 0,
      revenue: 0,
      costs: signupsPerMonth * inputs.costPerFreeUser,
      profit: -(signupsPerMonth * inputs.costPerFreeUser)
    };

    // Helper function for any month
    const calculateMonth = (months: number) => {
      const totalSignups = signupsPerMonth * months;
      const proConversions = totalSignups * conversionRatePro;
      const ultraConversions = totalSignups * conversionRateUltra;
      const retainedPro = proConversions * Math.pow(1 - churnRate, months);
      const retainedUltra = ultraConversions * Math.pow(1 - churnRate, months);
      const freeUsers = totalSignups - proConversions - ultraConversions;

      const proRevenue = retainedPro * proPricing + (retainedPro * (avgSeatsPerTeam - 1) * seatPricePro);
      const ultraRevenue = retainedUltra * ultraPricing + (retainedUltra * (avgSeatsPerTeam - 1) * seatPriceUltra);
      const revenue = proRevenue + ultraRevenue;
      const costs = (freeUsers * inputs.costPerFreeUser) + ((retainedPro + retainedUltra) * inputs.costPerProUser);

      return {
        signups: totalSignups,
        freeUsers,
        proUsers: retainedPro,
        ultraUsers: retainedUltra,
        revenue,
        costs,
        profit: revenue - costs
      };
    };

    const month3 = calculateMonth(3);
    const month6 = calculateMonth(6);
    const month12 = calculateMonth(12);

    const profitableAtMonth = (() => {
      for (let m = 1; m <= 12; m++) {
        const result = calculateMonth(m);
        if (result.profit > 0) return m;
      }
      return 13;
    })();

    return {
      month1,
      month3,
      month6,
      month12,
      mrr12: month12.revenue,
      arr12: month12.revenue * 12,
      avgLTV: ((proPricing + ultraPricing) / 2 * 12) / churnRate,
      profitableAtMonth
    };
  }, [inputs]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 text-transparent bg-clip-text">
                Pricing Strategy Explorer
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Free → Pro → Ultra: Complete Tiered Strategy
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-gray-500">Intro Pricing</div>
                <div className="text-sm font-semibold text-orange-500">First 500 Subscribers</div>
              </div>
              <Star className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {[
              { id: 'recommended', label: 'Plan Overview', icon: Crown },
              { id: 'calculator', label: 'Live Calculator', icon: Calculator },
              { id: 'comparison', label: 'Side-by-Side', icon: TrendingUp },
              { id: 'alternatives', label: 'Alternative Options', icon: Target },
              { id: 'ask-astra', label: 'Ask Astra', icon: MessageSquare }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'recommended' && (
          <PlanOverview formatCurrency={formatCurrency} formatNumber={formatNumber} />
        )}

        {activeTab === 'calculator' && (
          <LiveCalculator
            inputs={inputs}
            setInputs={setInputs}
            projections={calculateProjections}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
          />
        )}

        {activeTab === 'comparison' && (
          <ComprehensiveComparison formatCurrency={formatCurrency} formatNumber={formatNumber} />
        )}

        {activeTab === 'alternatives' && (
          <AlternativeOptions />
        )}

        {activeTab === 'ask-astra' && (
          <AskAstraPricing />
        )}
      </div>
    </div>
  );
};

// Plan Overview Tab
const PlanOverview: React.FC<{
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
}> = ({ formatCurrency, formatNumber }) => {
  return (
    <div className="space-y-8">
      {/* Preview Pass Program */}
      <div className="bg-gradient-to-r from-orange-500/20 via-green-500/20 to-blue-500/20 rounded-xl p-6 border-2 border-orange-500/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-500 rounded-lg">
            <Star className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2 text-orange-400">Preview Pass Program - First 300 Only</h2>
            <p className="text-gray-300 mb-4">
              Starts with 10-day unlimited trial. Get Ultra Plan features with lifetime price protection. Limited to first 300 subscribers.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-sm text-gray-400">Price</div>
                <div className="text-lg font-bold text-orange-500">$79/month</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-sm text-gray-400">Features</div>
                <div className="text-lg font-bold text-orange-500">Ultra</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-sm text-gray-400">Minimum</div>
                <div className="text-lg font-bold text-orange-500">3 Months</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-sm text-gray-400">Lock-In</div>
                <div className="text-lg font-bold text-orange-500">Lifetime</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trial Overview */}
      <div className="bg-gradient-to-r from-green-500/20 via-blue-500/20 to-purple-500/20 rounded-xl p-6 border-2 border-green-500/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-500 rounded-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">10-Day Unlimited Access Trial (All Plans)</h2>
            <p className="text-gray-300 mb-4">
              Every plan starts with a 10-day trial. No credit card required. Full access to ALL features with NO limits. Experience the complete power of Astra Intelligence before choosing your plan.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-sm text-gray-400">Duration</div>
                <div className="text-lg font-bold text-green-500">10 Days</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-sm text-gray-400">Credit Card</div>
                <div className="text-lg font-bold text-green-500">Not Required</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-sm text-gray-400">Features</div>
                <div className="text-lg font-bold text-green-500">Unlimited</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-sm text-gray-400">After Trial</div>
                <div className="text-lg font-bold text-blue-500">Choose Plan</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Free Plan */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
          <div className="p-6 bg-gray-900/50">
            <h3 className="text-xl font-bold mb-2">Free Plan</h3>
            <div className="text-3xl font-bold mb-1">$0</div>
            <div className="text-sm text-gray-400">Forever free</div>
            <div className="text-xs text-green-500 mt-2 font-semibold">Starts with 10-day trial</div>
          </div>

          <div className="p-6 flex-1">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Chat Usage</span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Data Sync</span>
              </div>
              <div className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>3 Custom Visualizations Per Week</span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>1 Automated Report Per Week</span>
              </div>
              <div className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-500">No Financial Analysis</span>
              </div>
              <div className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-500">No Team Features</span>
              </div>
              <div className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-500">No AI Specialists</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="bg-gray-800 rounded-xl border-2 border-blue-500 overflow-hidden flex flex-col relative">
          <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            POPULAR
          </div>
          <div className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/10">
            <h3 className="text-xl font-bold mb-2">Pro Plan</h3>
            <div className="text-3xl font-bold mb-1">
              $99<span className="text-lg text-gray-400">/month</span>
            </div>
            <div className="text-sm text-blue-400 font-semibold">Intro Price for First 500 Subscribers</div>
            <div className="text-xs text-blue-300 mt-1">Then $149/mo</div>
            <div className="text-xs text-green-500 mt-2 font-semibold">Starts with 10-day trial</div>
          </div>

          <div className="p-6 flex-1">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="font-semibold">Everything in Free, Plus:</span>
              </div>
              <div className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Custom Visualizations</span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Automated Reports</span>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Financial Analysis</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>1 Team (You + 2 Free Members)</span>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>$29/Month Per Additional Member</span>
              </div>
              <div className="flex items-start gap-2">
                <Layout className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Create Up to 3 Team Dashboards</span>
              </div>
              <div className="flex items-start gap-2">
                <Bot className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Create Up to 3 Team Agents</span>
              </div>
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Create Up to 3 AI Specialists</span>
              </div>
              <div className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Create Up to 3 Team SOPs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra Plan */}
        <div className="bg-gray-800 rounded-xl border-2 border-purple-500 overflow-hidden flex flex-col relative">
          <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            ADVANCED
          </div>
          <div className="p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/10">
            <h3 className="text-xl font-bold mb-2">Ultra Plan</h3>
            <div className="text-3xl font-bold mb-1">
              $149<span className="text-lg text-gray-400">/month</span>
            </div>
            <div className="text-sm text-purple-400 font-semibold">Intro Price for First 500 Subscribers</div>
            <div className="text-xs text-purple-300 mt-1">Then $249/mo</div>
            <div className="text-xs text-green-500 mt-2 font-semibold">Starts with 10-day trial</div>
          </div>

          <div className="p-6 flex-1">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span className="font-semibold">Everything in Pro, Plus:</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Up to 3 Teams (Each with 2 Free Members)</span>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>$19/Month Per Additional Member</span>
              </div>
              <div className="flex items-start gap-2">
                <Bot className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Custom Agents</span>
              </div>
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited AI Specialists</span>
              </div>
              <div className="flex items-start gap-2">
                <Layout className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Team Dashboards</span>
              </div>
              <div className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Team SOPs</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Build with Astra (Create Custom Software)</span>
              </div>
              <div className="flex items-start gap-2">
                <Beaker className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Beta Access to New Features</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Structure Highlights */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4">Why Unlimited Chats and Data at All Levels?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <DollarSign className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="font-semibold mb-2">Low Marginal Cost</h3>
            <p className="text-sm text-gray-400">
              Chat and data sync costs are very low per user. Modern AI APIs and storage make it economical to offer unlimited usage even on the free tier.
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <Users className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="font-semibold mb-2">Maximum Engagement</h3>
            <p className="text-sm text-gray-400">
              Users who chat frequently and have all their data synced are highly engaged and unlikely to leave, creating strong product stickiness and habit formation.
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <TrendingUp className="w-8 h-8 text-purple-500 mb-3" />
            <h3 className="font-semibold mb-2">Natural Upgrade Path</h3>
            <p className="text-sm text-gray-400">
              With unlimited chat and data access, users discover value faster and hit visualization/report limits sooner, creating natural upgrade pressure to paid plans.
            </p>
          </div>
        </div>
      </div>

      {/* 10-Day Value Journey */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Rocket className="w-6 h-6 text-green-500" />
          10-Day Value Journey
        </h2>
        <p className="text-gray-300 mb-6">
          Astra guides users to experience transformative value with unlimited access to everything
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              days: 'Days 1-3',
              title: 'Complete Setup',
              items: ['Sync all Gmail & Google Drive data', 'Experience unlimited Astra questions', 'Generate multiple visualizations', 'Set up automated reports']
            },
            {
              days: 'Days 4-6',
              title: 'Explore Power Features',
              items: ['Try email control features', 'Create custom agents', 'Set up AI Jobs', 'Collaborate with team members']
            },
            {
              days: 'Days 7-9',
              title: 'See the Value',
              items: ['Review time saved metrics', 'See insights discovered', 'Experience automation benefits', 'Understand upgrade ROI']
            },
            {
              days: 'Day 10',
              title: 'Choose Your Plan',
              items: ['Clear comparison of Free vs Pro vs Ultra', 'Seamless upgrade flow', 'Keep all your data and setup', 'No disruption to workflow']
            }
          ].map((phase, idx) => (
            <div key={idx} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="px-3 py-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-full text-sm font-bold">
                  {phase.days}
                </div>
                <h3 className="font-semibold">{phase.title}</h3>
              </div>
              <div className="space-y-2">
                {phase.items.map((item, iidx) => (
                  <div key={iidx} className="flex items-start gap-2 text-sm text-gray-300">
                    <ArrowRight className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Live Calculator Tab
const LiveCalculator: React.FC<any> = ({ inputs, setInputs, projections, formatCurrency, formatNumber }) => {
  const handleInputChange = (key: keyof CalculatorInputs, value: number | string) => {
    setInputs({ ...inputs, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Calculator Inputs */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-500" />
          Revenue Model Calculator
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InputSlider
            label="Monthly Signups"
            value={inputs.monthlySignups}
            onChange={(v) => handleInputChange('monthlySignups', v)}
            min={10}
            max={500}
            step={10}
          />
          <InputSlider
            label="Pro Conversion Rate"
            value={inputs.conversionRatePro}
            onChange={(v) => handleInputChange('conversionRatePro', v)}
            min={5}
            max={40}
            step={1}
            suffix="%"
          />
          <InputSlider
            label="Ultra Conversion Rate"
            value={inputs.conversionRatePlus}
            onChange={(v) => handleInputChange('conversionRatePlus', v)}
            min={1}
            max={20}
            step={1}
            suffix="%"
          />
          <InputSlider
            label="Monthly Churn"
            value={inputs.churnRate}
            onChange={(v) => handleInputChange('churnRate', v)}
            min={1}
            max={20}
            step={1}
            suffix="%"
          />
          <InputSlider
            label="Cost/Free User"
            value={inputs.costPerFreeUser}
            onChange={(v) => handleInputChange('costPerFreeUser', v)}
            min={0}
            max={10}
            step={0.5}
            prefix="$"
          />
          <InputSlider
            label="Cost/Pro User"
            value={inputs.costPerProUser}
            onChange={(v) => handleInputChange('costPerProUser', v)}
            min={5}
            max={50}
            step={5}
            prefix="$"
          />
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Time to Profitable"
          value={projections.profitableAtMonth > 12 ? '12+ mo' : `Month ${projections.profitableAtMonth}`}
          color="text-green-500"
          icon={TrendingUp}
        />
        <MetricCard
          label="Year 1 ARR"
          value={formatCurrency(projections.arr12)}
          color="text-blue-500"
          icon={DollarSign}
        />
        <MetricCard
          label="Avg Customer LTV"
          value={formatCurrency(projections.avgLTV)}
          color="text-purple-500"
          icon={Users}
        />
        <MetricCard
          label="Month 12 MRR"
          value={formatCurrency(projections.mrr12)}
          color="text-yellow-500"
          icon={Timer}
        />
      </div>

      {/* Timeline Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <ProjectionCard
          title="Month 1"
          projections={projections.month1}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />
        <ProjectionCard
          title="Month 3"
          projections={projections.month3}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />
        <ProjectionCard
          title="Month 6"
          projections={projections.month6}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />
        <ProjectionCard
          title="Month 12"
          projections={projections.month12}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />
      </div>
    </div>
  );
};

// Input Slider Component
const InputSlider: React.FC<any> = ({ label, value, onChange, min, max, step, prefix = '', suffix = '' }) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <span className="text-sm font-bold text-white">{prefix}{value}{suffix}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
    />
    <div className="flex justify-between text-xs text-gray-500 mt-1">
      <span>{prefix}{min}{suffix}</span>
      <span>{prefix}{max}{suffix}</span>
    </div>
  </div>
);

// Metric Card Component
const MetricCard: React.FC<any> = ({ label, value, color, icon: Icon }) => (
  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
    <div className="flex items-start justify-between mb-2">
      <div className="text-xs text-gray-400">{label}</div>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div className={`text-xl font-bold ${color}`}>{value}</div>
  </div>
);

// Projection Card Component
const ProjectionCard: React.FC<any> = ({ title, projections, formatCurrency, formatNumber }) => (
  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
    <h3 className="font-semibold mb-4 text-center">{title}</h3>
    <div className="space-y-3 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-400">Signups</span>
        <span className="font-semibold text-blue-500">{formatNumber(projections.signups)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Pro Users</span>
        <span className="font-semibold text-green-500">{formatNumber(projections.proUsers)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Ultra Users</span>
        <span className="font-semibold text-purple-500">{formatNumber(projections.ultraUsers)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Free Users</span>
        <span className="font-semibold text-gray-500">{formatNumber(projections.freeUsers)}</span>
      </div>
      <div className="border-t border-gray-700 pt-2"></div>
      <div className="flex justify-between">
        <span className="text-gray-400">Revenue</span>
        <span className="font-semibold text-green-500">{formatCurrency(projections.revenue)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Costs</span>
        <span className="font-semibold text-orange-500">{formatCurrency(projections.costs)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span className="text-gray-300">Profit</span>
        <span className={projections.profit > 0 ? 'text-green-500' : 'text-red-500'}>
          {formatCurrency(projections.profit)}
        </span>
      </div>
    </div>
  </div>
);

// Comprehensive Comparison Tab
const ComprehensiveComparison: React.FC<any> = ({ formatCurrency, formatNumber }) => {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-2">Complete Plan Comparison</h2>
        <p className="text-gray-400">
          Side-by-side comparison of Free, Pro, and Ultra plans
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="p-4 text-left font-semibold border-b border-gray-700">Feature</th>
                <th className="p-4 text-center font-semibold border-b border-gray-700">
                  <div className="text-lg">Free</div>
                  <div className="text-xs text-gray-400 font-normal">$0/month</div>
                </th>
                <th className="p-4 text-center font-semibold border-b border-gray-700 bg-blue-500/10">
                  <div className="text-lg">Pro</div>
                  <div className="text-xs text-gray-400 font-normal">$99/month</div>
                  <div className="text-xs text-blue-400 font-semibold mt-1">Intro: First 500</div>
                </th>
                <th className="p-4 text-center font-semibold border-b border-gray-700 bg-purple-500/10">
                  <div className="text-lg">Ultra</div>
                  <div className="text-xs text-gray-400 font-normal">$149/month</div>
                  <div className="text-xs text-purple-400 font-semibold mt-1">Intro: First 500</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow
                feature="Chat & Usage"
                free="Unlimited"
                pro="Unlimited"
                plus="Unlimited"
                highlight="all"
              />
              <ComparisonRow
                feature="Data Sync"
                free="Unlimited"
                pro="Unlimited"
                plus="Unlimited"
                highlight="all"
              />
              <ComparisonRow
                feature="Custom Visualizations"
                free="3 Per Week"
                pro="Unlimited"
                plus="Unlimited"
                highlight="pro"
              />
              <ComparisonRow
                feature="Automated Reports"
                free="1 Per Week"
                pro="Unlimited"
                plus="Unlimited"
                highlight="pro"
              />
              <ComparisonRow
                feature="Financial Analysis"
                free="No"
                pro="Yes"
                plus="Yes"
                highlight="pro"
              />
              <ComparisonRow
                feature="Team Members"
                free="None"
                pro="1 Team (You + 2 Free)"
                plus="3 Teams (2 Free Each)"
                highlight="plus"
              />
              <ComparisonRow
                feature="Additional Members"
                free="-"
                pro="$29/Month"
                plus="$19/Month"
                highlight="plus"
              />
              <ComparisonRow
                feature="Team Dashboards"
                free="None"
                pro="Up to 3"
                plus="Unlimited"
                highlight="plus"
              />
              <ComparisonRow
                feature="Team Agents"
                free="None"
                pro="Up to 3"
                plus="Unlimited"
                highlight="plus"
              />
              <ComparisonRow
                feature="AI Specialists"
                free="None"
                pro="Up to 3"
                plus="Unlimited"
                highlight="plus"
              />
              <ComparisonRow
                feature="Team SOPs"
                free="None"
                pro="Up to 3"
                plus="Unlimited"
                highlight="plus"
              />
              <ComparisonRow
                feature="Create with Astra"
                free="No"
                pro="No"
                plus="Yes"
                highlight="plus"
              />
              <ComparisonRow
                feature="Beta Access to New Features"
                free="No"
                pro="No"
                plus="Yes"
                highlight="plus"
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Comparison Row Component
const ComparisonRow: React.FC<any> = ({ feature, free, pro, plus, highlight }) => (
  <tr className="border-b border-gray-700 hover:bg-gray-900/50">
    <td className="p-4 font-medium">{feature}</td>
    <td className={`p-4 text-center ${highlight === 'all' ? 'bg-gray-700/30 font-semibold' : ''}`}>
      {free}
    </td>
    <td className={`p-4 text-center ${highlight === 'pro' || highlight === 'all' ? 'bg-blue-500/10 font-semibold' : ''}`}>
      {pro}
    </td>
    <td className={`p-4 text-center ${highlight === 'plus' || highlight === 'all' ? 'bg-purple-500/10 font-semibold' : ''}`}>
      {plus}
    </td>
  </tr>
);

// Alternative Options Component
const AlternativeOptions: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-orange-500/10 rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-2">Alternative Pricing Strategies</h2>
        <p className="text-gray-400">
          Other approaches we considered before landing on the current tiered freemium model
        </p>
      </div>

      {/* Option 1: Simple Free + Pro */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-start gap-3 mb-4">
          <Target className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold mb-2">Option 1: Simple Two-Tier (Free + Pro Only)</h3>
            <p className="text-gray-400 text-sm">Basic freemium with just Free ($0) and Pro ($99/month)</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Pros
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Extremely Simple Decision for Users - Only one upgrade path</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Lower Cognitive Load - No need to compare multiple paid tiers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Easier to Market - Clear messaging: "Free or Pro"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Simpler Development - Less feature gating complexity</span>
              </li>
            </ul>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
              <X className="w-5 h-5" />
              Cons
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Leaves Money on the Table - Power users would pay more</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>No Anchor Effect - No premium tier to make Pro seem reasonable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Limited Team Monetization - Single price point for all team sizes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Harder to Upsell - No natural progression beyond Pro</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Option 2: Usage-Based Pricing */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-start gap-3 mb-4">
          <Calculator className="w-6 h-6 text-purple-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold mb-2">Option 2: Usage-Based Pricing</h3>
            <p className="text-gray-400 text-sm">Pay per visualization, AI message, or document synced</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Pros
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Fair Pricing Model - Users pay for what they actually use</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Lower Entry Barrier - Small users pay very little</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Revenue Scales with Value - Heavy users automatically pay more</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Natural Cost Alignment - Pricing matches infrastructure costs</span>
              </li>
            </ul>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
              <X className="w-5 h-5" />
              Cons
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Unpredictable Costs - Users can't budget monthly expenses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Usage Anxiety - Users hesitate to use features freely</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Complex to Understand - Harder to explain than fixed tiers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Billing Complexity - More customer support for billing questions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Reduces Engagement - Users may avoid features to save money</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Option 3: Seat-Based Only */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-start gap-3 mb-4">
          <Users className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold mb-2">Option 3: Pure Seat-Based Pricing</h3>
            <p className="text-gray-400 text-sm">Fixed price per user/seat with all features included</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Pros
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Completely Predictable - Easy for companies to budget</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Scales with Team Growth - Revenue grows with customer expansion</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Simple Pricing Math - Count seats, multiply by price</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Industry Standard - Familiar model (Slack, Notion, etc.)</span>
              </li>
            </ul>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
              <X className="w-5 h-5" />
              Cons
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>High Barrier for Solo Users - $29/month minimum is steep</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Discourages Growth - Companies hesitate to add team members</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>No Free Tier - Loses viral/network effect opportunities</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Seat Management Overhead - Tracking who's active/inactive</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Power User Opportunity Lost - Heavy users pay same as light users</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Option 4: Trial-Only (No Free Tier) */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-start gap-3 mb-4">
          <Timer className="w-6 h-6 text-yellow-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold mb-2">Option 4: Trial-Only Model (No Permanent Free Tier)</h3>
            <p className="text-gray-400 text-sm">10-day free trial, then must convert to Pro or lose access</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Pros
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Higher Conversion Pressure - Users must decide: pay or leave</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Faster Revenue - Convert or churn happens quickly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Lower Free User Costs - No permanent free tier infrastructure load</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Qualified Leads Only - Everyone who tries is serious</span>
              </li>
            </ul>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
              <X className="w-5 h-5" />
              Cons
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Massive Churn Risk - Most users will leave after trial</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>No Viral Growth - Can't share/collaborate on free tier</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Loses Future Converts - Users who need more time are lost</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Negative Perception - Feels less generous/accessible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Data Loss Fear - Users worry about losing work after trial</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Why Current Model Won */}
      <div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-green-500/30">
        <div className="flex items-start gap-3">
          <Crown className="w-8 h-8 text-green-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold mb-3 text-green-400">Why the Current Three-Tier Model Wins</h3>
            <div className="space-y-3 text-gray-300">
              <p className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Maximizes Reach & Revenue:</strong> Free tier drives adoption, Pro captures individuals, Ultra monetizes power users and teams</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Psychological Anchoring:</strong> Ultra at $149 makes Pro at $99 feel like a great deal</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Clear Upgrade Path:</strong> Natural progression as users need more (visualizations → teams → multiple teams)</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Predictable Costs:</strong> Users know exactly what they'll pay each month, unlike usage-based</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Viral Growth Enabled:</strong> Free forever tier allows network effects and word-of-mouth</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Ask Astra Component
const AskAstraPricing: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ id: string; text: string; isUser: boolean }>>([
    {
      id: '1',
      text: "Hi! I can help you understand the pricing strategy and answer questions about:\n\n• Why unlimited chat and data for all users?\n• How the 10-day trial creates conversion\n• Preview Pass Program ($79/mo for first 300)\n• Free vs Pro vs Ultra differences\n• Intro pricing for first 500 subscribers\n\nWhat would you like to know?",
      isUser: false
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "Why is chat and data unlimited for free users?",
    "Tell me about the Preview Pass Program",
    "How does the 10-day trial drive conversion?",
    "Why Ultra for only $50 more?",
    "What's the intro pricing for first 500 subscribers?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userMsg = { id: Date.now().toString(), text: input, isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      let responseText = "Based on the pricing strategy, here's my insight...";

      if (input.toLowerCase().includes('unlimited') || input.toLowerCase().includes('chat') || input.toLowerCase().includes('data')) {
        responseText = "Unlimited chat and data sync for all users is strategic:\n\n1. Low Marginal Cost: Modern AI APIs and storage costs are very low per user\n2. Maximum Engagement: Frequent chat creates habit formation and stickiness\n3. Value Discovery: Users discover value faster with unlimited access\n4. Natural Upgrade Path: Users hit visualization/report limits sooner, creating upgrade pressure\n5. Competitive Advantage: Most competitors limit usage, we don't\n\nIt's a loss leader that drives engagement and conversion.";
      } else if (input.toLowerCase().includes('preview') || input.toLowerCase().includes('$79')) {
        responseText = "Preview Pass Program ($79/month for first 300 subscribers):\n\n• Full Ultra Plan features at nearly 50% off\n• Lifetime price protection (stays $79/mo forever)\n• 3-month minimum subscription required\n• Cancel anytime after 3 months\n• Includes: Unlimited visualizations, reports, 3 teams, unlimited agents/jobs, Create with Astra, Beta access to new features\n\nThis creates 300 power users who become evangelists. They get insane value ($149 features for $79) and will refer others. Future price increases make their deal even better over time.";
      } else if (input.toLowerCase().includes('10-day') || input.toLowerCase().includes('conversion')) {
        responseText = "The 10-day unlimited trial is designed for fast value demonstration:\n\n• Days 1-3: Complete setup with unlimited features\n• Days 4-6: Explore power features (agents, jobs, teams)\n• Days 7-9: See measurable value and time saved\n• Day 10: Natural decision point while value is fresh\n\nUnlimited access during trial means users experience the FULL product, not a limited version. They know exactly what they'll lose if they downgrade to Free.";
      } else if (input.toLowerCase().includes('ultra') || input.toLowerCase().includes('plus') || input.toLowerCase().includes('$50')) {
        responseText = "Ultra at $149 ($50 more than Pro) targets:\n\n• Multi-team organizations\n• Users who need multiple custom agents\n• Companies with complex automation needs\n• Early adopters who want beta access to new features\n\nThe $50 premium is strategic:\n1. Not too expensive (< 2x Pro price)\n2. Covers cost of unlimited agents/jobs\n3. Volume pricing on members (scale-friendly)\n4. Beta access creates exclusivity\n5. Creates clear upgrade path from Pro\n\nExpect 20-25% of Pro users to eventually upgrade to Ultra.";
      } else if (input.toLowerCase().includes('intro') || input.toLowerCase().includes('first 500') || input.toLowerCase().includes('500')) {
        responseText = "Intro pricing for first 500 subscribers:\n\n• Pro: $99/mo (then $149/mo)\n• Ultra: $149/mo (then $249/mo)\n• Saves $50-100/month for early adopters\n• NOT lifetime - price increases after first 500\n\nThis creates urgency ('only 500 spots') while keeping long-term pricing flexible. Early adopters get 33-40% discount during intro period. After 500 subscribers, prices reflect true value and market positioning.";
      }

      const response = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false
      };
      setMessages(prev => [...prev, response]);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-2">Ask Astra About Pricing</h2>
        <p className="text-gray-400 text-sm">
          Get insights on the pricing strategy, conversion tactics, and plan structure.
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setInput(q)}
              className="px-3 py-2 bg-gray-900 hover:bg-gray-700 text-sm rounded-lg transition-colors border border-gray-700"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="h-[300px] overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-4 ${
                msg.isUser
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                  : 'bg-gray-900 text-gray-200 border border-gray-700'
              }`}>
                <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-700 p-4 bg-gray-900">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about pricing strategy..."
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
