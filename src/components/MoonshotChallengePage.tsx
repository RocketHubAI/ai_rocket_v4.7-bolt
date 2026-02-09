import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, BarChart3, Users, FileText, Bot, LayoutDashboard, UserCircle,
  Zap, Wrench, TrendingUp, ChevronDown, Play
} from 'lucide-react';
import { AppDemoModal } from './AppDemoModal';

type TabId = 'home' | 'features' | 'prizes' | 'rbg' | 'timeline' | 'how' | 'eligibility' | 'faq' | 'terms';

export const MoonshotChallengePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [countdown, setCountdown] = useState({ days: '--', hours: '--', minutes: '--', seconds: '--' });
  const [expandedAccordion, setExpandedAccordion] = useState<number | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const targetDate = new Date('2026-01-15T00:00:00').getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setCountdown({
          days: days.toString().padStart(2, '0'),
          hours: hours.toString().padStart(2, '0'),
          minutes: minutes.toString().padStart(2, '0'),
          seconds: seconds.toString().padStart(2, '0')
        });
      }
    };

    const interval = setInterval(updateCountdown, 1000);
    updateCountdown();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      const scrollPos = window.scrollY + 100;

      sections.forEach(section => {
        const top = (section as HTMLElement).offsetTop;
        const height = (section as HTMLElement).offsetHeight;
        const id = section.getAttribute('id') as TabId;

        if (scrollPos >= top && scrollPos < top + height) {
          setActiveTab(id);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 60,
        behavior: 'smooth'
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const features = [
    { icon: RefreshCw, title: 'All Your Data Connected', description: 'Connect Documents, Financials, and more. AI analyzes all your data for comprehensive insights.', color: 'orange' },
    { icon: BarChart3, title: 'Smart Visualizations', description: 'Turn conversations into actionable insights with AI-generated charts, graphs, and visual reports.', color: 'blue' },
    { icon: Users, title: 'Team Collaboration', description: 'Work together with your team and AI in shared conversations. @mention team members and AI for instant insights.', color: 'emerald' },
    { icon: FileText, title: 'Automated Reports', description: 'Schedule automated reports delivered to your inbox. Stay informed with daily, weekly, or monthly insights.', color: 'yellow' },
    { icon: Bot, title: 'Agent Builder', description: 'Design and deploy custom AI Agents to complete tasks autonomously.', color: 'pink' },
    { icon: LayoutDashboard, title: 'Team Dashboard', description: 'Real-time AI updated team info & insights on the metrics that matter most.', color: 'cyan' },
    { icon: UserCircle, title: 'AI Specialists', description: 'Create specialized AI team members like Business Coach, Finance Director, Marketing Manager and more.', color: 'teal' },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'hover:border-orange-500/50' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'hover:border-blue-500/50' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'hover:border-emerald-500/50' },
    yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'hover:border-yellow-500/50' },
    pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'hover:border-pink-500/50' },
    teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'hover:border-teal-500/50' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'hover:border-cyan-500/50' },
  };

  return (
    <div className="min-h-screen font-[Outfit,sans-serif]" style={{ background: '#0A0F1C', color: '#F9FAFB' }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex justify-center gap-1 flex-wrap" style={{ background: 'rgba(10, 15, 28, 0.95)' }}>
        {[
          { id: 'home', label: 'Home' },
          { id: 'features', label: 'Features' },
          { id: 'prizes', label: 'Prizes' },
          { id: 'how', label: 'How It Works' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'rbg', label: 'RBG Matrix' },
          { id: 'eligibility', label: 'Eligibility' },
          { id: 'faq', label: 'FAQ' },
          { id: 'terms', label: 'Terms' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => scrollToSection(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-orange-500 to-emerald-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Hero Section */}
      <section id="home" className="min-h-[calc(100vh-60px)] flex items-center justify-center pt-16 pb-8 px-4 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-emerald-500 px-5 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wider mb-6 animate-pulse">
            Registration Open Now | Challenge Starts Jan 15
          </div>

          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-3xl md:text-4xl" style={{ background: 'linear-gradient(145deg, #5BA4E6, #3B82C4)', boxShadow: '0 8px 32px rgba(59, 130, 196, 0.4)' }}>
              🚀
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white">AI Rocket</h1>
          </div>
          <p className="text-gray-500 mb-5 tracking-wider text-sm">AI Built for Entrepreneurs and Their Teams</p>

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-3">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 bg-clip-text text-transparent">$5M AI Moonshot Challenge</span>
          </h2>
          <div className="mb-6 max-w-3xl mx-auto">
            <p className="text-lg md:text-xl text-gray-300">
              Transform your Team to AI-Powered
            </p>
            <p className="text-lg md:text-xl text-gray-300">
              Free & Unlimited Access to the Most Powerful AI-Suite for Work
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-6">
            {[
              { value: '$5M', label: 'Total Prize Pool' },
              { value: '300', label: 'Team Slots' },
              { value: '90', label: 'Days Unlimited' },
              { value: '10', label: 'Winners' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-orange-500 to-emerald-500 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-center flex-wrap mb-6">
            <Link
              to="/moonshot/register"
              className="px-6 py-3 rounded-full text-base font-bold bg-gradient-to-r from-orange-500 to-emerald-500 text-white shadow-lg shadow-orange-500/40 hover:scale-105 transition-transform"
            >
              Register Now
            </Link>
            <button
              onClick={() => scrollToSection('faq')}
              className="px-6 py-3 rounded-full text-base font-bold bg-gray-800 text-white border border-white/10 hover:border-orange-500 transition-all"
            >
              FAQ
            </button>
          </div>

          <div>
            <p className="text-gray-400 mb-3 text-sm">Powered by</p>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div className="flex flex-col items-center gap-1">
                <img src="/claude_logo.png" alt="Claude" className="w-10 h-10 rounded-xl" />
                <span className="text-white font-semibold text-xs">Claude</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <img src="/gemini_app_logo.jpeg" alt="Gemini" className="w-10 h-10 rounded-xl" />
                <span className="text-white font-semibold text-xs">Gemini</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <img src="/gpt_app_logo.png" alt="OpenAI" className="w-10 h-10 rounded-xl bg-white p-1.5" />
                <span className="text-white font-semibold text-xs">OpenAI</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - NEW */}
      <section id="features" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-emerald-500 bg-clip-text text-transparent">AI Rocket Features</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            AI that Works for Work - Built for Entrepreneurs and their Teams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* App Demo - Interactive Preview (First Box) */}
          <button
            onClick={() => setShowDemoModal(true)}
            className="bg-gradient-to-br from-blue-600/20 to-emerald-600/20 backdrop-blur-sm border-2 border-blue-500/30 rounded-xl p-6 hover:border-blue-400/60 hover:from-blue-600/30 hover:to-emerald-600/30 transition-all duration-300 text-left group"
          >
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">App Demo</h3>
            <p className="text-gray-400 text-sm">
              Explore how AI Rocket + Astra Intelligence can Launch your team to AI-Powered
            </p>
          </button>

          {features.map((feature, idx) => {
            const colors = colorClasses[feature.color];
            return (
              <div
                key={idx}
                className={`bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 rounded-xl p-6 transition-all duration-300 ${colors.border}`}
              >
                <div className={`w-14 h-14 rounded-lg ${colors.bg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-7 h-7 ${colors.text}`} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Powered By */}
        <div className="text-center mt-16">
          <p className="text-gray-400 mb-6">Powered by</p>
          <div className="flex items-center justify-center gap-12 flex-wrap">
            <div className="flex flex-col items-center gap-2">
              <img src="/claude_logo.png" alt="Claude" className="w-14 h-14 rounded-xl" />
              <span className="text-white font-semibold">Claude</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src="/gemini_app_logo.jpeg" alt="Gemini" className="w-14 h-14 rounded-xl" />
              <span className="text-white font-semibold">Gemini</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src="/gpt_app_logo.png" alt="OpenAI" className="w-14 h-14 rounded-xl bg-white p-2" />
              <span className="text-white font-semibold">OpenAI</span>
            </div>
          </div>
        </div>

        {/* Value Prop Box */}
        <div className="max-w-4xl mx-auto mt-16 bg-gradient-to-br from-blue-500/10 via-emerald-500/10 to-orange-500/10 border border-gray-700 rounded-2xl p-10 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            AI That Works For Work
          </h3>
          <p className="text-gray-300 text-lg mb-6">
            Stop switching between apps. Get instant answers from your business data, collaborate with your team in real-time, and make data-driven decisions with AI-powered insights—all in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Built for Entrepreneurs and their Teams</span>
            </div>
          </div>
        </div>
      </section>

      {/* Prizes Section */}
      <section id="prizes" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-emerald-500 bg-clip-text text-transparent">Prize Structure</span>
          </h2>
          <p className="text-xl text-gray-400">Win equity in RocketHub.AI plus lifetime Ultra Plan subscription.</p>
        </div>

        {/* Podium - Top 3 */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white text-center mb-6">The Podium</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { place: '1st Place', amount: '$2,000,000', medal: '🥇', color: '#FFD700' },
              { place: '2nd Place', amount: '$1,000,000', medal: '🥈', color: '#C0C0C0' },
              { place: '3rd Place', amount: '$600,000', medal: '🥉', color: '#CD7F32' },
            ].map((prize, idx) => (
              <div
                key={idx}
                className="bg-gray-800/80 border border-white/10 rounded-3xl p-8 text-center relative overflow-hidden hover:scale-105 hover:shadow-xl hover:shadow-orange-500/20 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: prize.color }} />
                <div className="text-6xl mb-4">{prize.medal}</div>
                <div className="text-xl font-bold text-gray-400 mb-3">{prize.place}</div>
                <div className="text-4xl font-black bg-gradient-to-r from-orange-500 to-emerald-500 bg-clip-text text-transparent mb-2">{prize.amount}</div>
                <div className="text-gray-500 mb-4">Equity prize in RocketHub.AI</div>
                <div className="text-emerald-400 font-semibold">Lifetime Ultra Plan</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 Finishers - Places 4-10 */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white text-center mb-6">Top 10 Finishers</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { place: '4th', amount: '$400,000' },
              { place: '5th', amount: '$300,000' },
              { place: '6th', amount: '$225,000' },
              { place: '7th', amount: '$175,000' },
              { place: '8th', amount: '$125,000' },
              { place: '9th', amount: '$100,000' },
              { place: '10th', amount: '$75,000' },
            ].map((prize, idx) => (
              <div
                key={idx}
                className="bg-gray-800/80 border border-white/10 rounded-2xl p-4 text-center hover:border-orange-500/50 transition-all"
              >
                <div className="text-lg font-bold text-gray-400 mb-2">{prize.place}</div>
                <div className="text-xl font-bold bg-gradient-to-r from-orange-500 to-emerald-500 bg-clip-text text-transparent mb-2">{prize.amount}</div>
                <div className="text-xs text-emerald-400">Lifetime Ultra Plan</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bonus Prize */}
        <div className="bg-gray-800/80 border-2 border-emerald-500 rounded-3xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">🎁 Participation Bonus</h3>
          <p className="text-xl text-gray-300">
            All teams that submit valid prize applications receive a <span className="text-emerald-400 font-bold">1-year unlimited subscription</span> to AI Rocket!
          </p>
        </div>

        {/* Impact Mission */}
        <div className="mt-12 bg-gradient-to-r from-orange-500/15 to-emerald-500/15 border-2 border-orange-500 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="text-7xl">🌍</div>
          <div>
            <h3 className="text-2xl font-extrabold text-white mb-2">Our Belief: EPIC Entrepreneurs Change the World for Good</h3>
            <p className="text-xl text-orange-400 italic font-semibold mb-4">"The most powerful businesses are those that create positive impact"</p>
            <p className="text-gray-300 mb-4">We're fueling entrepreneurs and their teams to create lasting positive impacts using AI-Powered Business with AI Rocket.</p>
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-2 rounded-full border border-orange-500 text-white text-sm font-semibold">25% Scoring: Impact Statement</span>
              <span className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-emerald-500 text-white text-sm font-semibold">Mission-Driven Innovation</span>
              <span className="px-4 py-2 rounded-full border border-orange-500 text-white text-sm font-semibold">🚀 World-Changing Entrepreneurs</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-emerald-500 bg-clip-text text-transparent">How It Works</span>
          </h2>
          <p className="text-xl text-gray-400">Simple steps to win $5M in prizes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { num: 1, icon: '✍️', title: 'Register Your Team', desc: 'Registration opens Jan 5. Provide your name, email, team name, and industry. Answer 5 quick questions and receive your unique launch code.' },
            { num: 2, icon: '🎯', title: 'Enter the Challenge', desc: 'On Jan 15, use your launch code to create your account. First 300 teams to setup and launch their AI Rockets enter with Free & Unlimited 90-Day Access.' },
            { num: 3, icon: '🚀', title: 'Use AI Rocket', desc: 'Get unlimited access for 90 days (Jan 15 - Apr 15). Transform your business with AI across Run, Build, and Grow dimensions.' },
            { num: 4, icon: '📱', title: 'Engage & Share', desc: 'Share your transformation journey on social media tagging RocketHub.AI and AI Rocket for bonus points. Top 20 teams with social engagement earn extra points.' },
            { num: 5, icon: '📝', title: 'Submit Application', desc: 'During Apr 6-10, submit your Prize Application with Impact Statement and RBG summaries (100 words each).' },
            { num: 6, icon: '🏆', title: 'Win Prizes', desc: 'Winners announced Apr 13-16. Top 10 teams win equity prizes and Lifetime Ultra Plan subscriptions. Advisory Committee evaluates Impact Statement (25%), RBG answers (25%), and Astra scores (50%).' },
          ].map((step, idx) => (
            <div key={idx} className="bg-gray-800/80 border border-white/10 rounded-2xl p-8 text-center relative hover:border-orange-500 transition-all">
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-emerald-500 flex items-center justify-center text-white font-bold border-4 border-gray-900">
                {step.num}
              </div>
              <div className="text-4xl mb-4">{step.icon}</div>
              <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-gray-400">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Accordion */}
        <div className="max-w-3xl mx-auto mt-16 space-y-4">
          {[
            { title: 'Winner Criteria & Scoring', icon: '🎯', content: ['Impact Statement (25%): Your answer demonstrating alignment with our core mission', 'RBG Matrix Summaries (25%): Written summaries (100 words each for Run, Build, Grow)', 'Astra Intelligence Score (50%): Automated tracking of your AI Rocket usage', 'Social Media Bonus Points: Top 20 teams that mention AI Rocket on social media earn extra points'] },
            { title: 'Social Media Bonus Points', icon: '📱', content: ['Bonus points awarded to the top 20 teams that mention AI Rocket in their social media posts', 'LinkedIn: Professional updates about your AI transformation journey', 'X/Twitter: Real-time insights and progress updates', 'Facebook: Community engagement and milestone celebrations', 'Posts must be authentic, substantive content about your experience'] },
            { title: 'Team Structure', icon: '👥', content: ['Primary User: The registered team leader who manages the account', 'Additional Members: Additional team members can be invited once the team account is setup', 'Shared Access: All team members share the same Astra score', 'Team Collaboration: Coordinate across your team to maximize transformation'] },
          ].map((accordion, idx) => (
            <div key={idx} className="bg-gray-800/80 border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedAccordion(expandedAccordion === idx ? null : idx)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{accordion.icon}</span>
                  <span className="text-lg font-bold text-white">{accordion.title}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedAccordion === idx ? 'rotate-180' : ''}`} />
              </button>
              {expandedAccordion === idx && (
                <div className="px-6 pb-6">
                  <ul className="space-y-3">
                    {accordion.content.map((item, i) => (
                      <li key={i} className="text-gray-400 border-b border-white/5 pb-3">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Timeline Section */}
      <section id="timeline" className="py-24 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-emerald-500 bg-clip-text text-transparent">Challenge Timeline</span>
          </h2>
          <p className="text-xl text-gray-400">90 days to transform your business with AI</p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 to-emerald-500 transform -translate-x-1/2 hidden md:block" />

          {[
            { date: 'Jan 5, 2026', title: '📝 Registration Opens', desc: 'Registration opens for entrepreneurs and teams. Complete the registration form with your team details and receive your unique launch code for Challenge entry on Jan 15.' },
            { date: 'Jan 15, 2026', title: '🚀 Challenge Begins', desc: 'The first 300 teams to setup and successfully launch their AI Rockets enter the Challenge with Free & Unlimited 90-Day Access.' },
            { date: 'Jan 15 - Apr 15', title: '💻 Challenge Period', desc: 'Use AI Rocket to transform your business. Astra Intelligence tracks your usage automatically. Share your transformation journey on social media for bonus points.' },
            { date: 'Apr 6-10', title: '📝 Prize Applications', desc: 'Submit your Prize Application with Impact Statement and RBG Matrix summaries (100 words each for Run, Build, Grow).' },
            { date: 'Apr 13', title: '🏅 Winners Decided', desc: 'AI Rocket Advisory Committee reviews all applications and Astra scores. Top 10 teams selected for equity prizes and Lifetime Ultra Plan subscriptions.' },
            { date: 'Apr 13-16', title: '🏆 Winner Announcements', desc: 'Apr 13: All metrics & non-winner announcements. Apr 14: 3rd place. Apr 15: 2nd place. Apr 16: 1st place winner & Full AI Rocket App Launch!' },
          ].map((item, idx) => (
            <div key={idx} className={`flex items-center mb-12 ${idx % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
              <div className="flex-1" />
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-orange-500 to-emerald-500 border-4 border-gray-900 z-10 hidden md:block" />
              <div className="flex-1">
                <div className="bg-gray-800/80 border border-white/10 rounded-2xl p-6 mx-4 hover:border-orange-500 transition-all">
                  <div className="text-orange-500 font-bold text-xl mb-2">{item.date}</div>
                  <div className="text-white font-bold text-lg mb-2">{item.title}</div>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RBG Matrix Section */}
      <section id="rbg" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-emerald-500 bg-clip-text text-transparent">Run - Build - Grow Matrix</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">With AI transformation nearly free, RBG replaces ROI as the measure for AI-Powered business success.</p>
        </div>

        {/* Quote */}
        <div className="bg-gray-800/80 border-l-4 border-orange-500 rounded-xl p-6 max-w-3xl mx-auto mb-12">
          <p className="text-xl text-white italic mb-2">"With the cost of transformational AI nearly free, RBG (Run.Build.Grow with AI) can replace ROI as the goal for AI-Powered business."</p>
          <cite className="text-gray-500">- RocketHub AI Philosophy</cite>
        </div>

        {/* Scoring Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { pct: '25%', label: 'Impact Statement', desc: 'Your answer demonstrating the positive impact your AI-Powered business makes in the world' },
            { pct: '25%', label: 'RBG Answers', desc: 'Your written summaries (100 words each) for Run, Build, and Grow transformations' },
            { pct: '50%', label: 'Astra Metrics', desc: 'Automated tracking of your team\'s AI Rocket usage across RBG dimensions' },
          ].map((item, idx) => (
            <div key={idx} className="bg-gray-800/80 border border-white/10 rounded-2xl p-6 text-center hover:border-orange-500 transition-all">
              <div className="text-5xl font-black bg-gradient-to-r from-orange-500 to-emerald-500 bg-clip-text text-transparent mb-2">{item.pct}</div>
              <div className="text-xl font-bold text-white mb-3">{item.label}</div>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* RBG Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: 'RUN', color: 'orange', desc: 'How has AI Rocket transformed your team\'s ability to run the business using AI?', examples: ['Automated daily operations', 'AI-powered decision making', 'Streamlined workflows', 'Real-time business intelligence'] },
            { icon: Wrench, title: 'BUILD', color: 'yellow', desc: 'How has AI Rocket helped you build valuable tools for the business using AI?', examples: ['Custom AI workflows', 'Automated reporting systems', 'Integration with existing tools', 'New product capabilities'] },
            { icon: TrendingUp, title: 'GROW', color: 'emerald', desc: 'How has AI Rocket helped you grow revenue for the business using AI?', examples: ['Enhanced customer acquisition', 'Improved retention strategies', 'Revenue optimization', 'Market expansion capabilities'] },
          ].map((card, idx) => (
            <div key={idx} className="bg-gray-800/80 border border-white/10 rounded-3xl p-8 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 transition-all">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: card.color === 'orange' ? '#FF6B35' : card.color === 'yellow' ? '#F7931E' : '#00C49F' }} />
              <card.icon className={`w-12 h-12 mb-4 ${card.color === 'orange' ? 'text-orange-400' : card.color === 'yellow' ? 'text-yellow-400' : 'text-emerald-400'}`} />
              <h3 className="text-2xl font-extrabold text-white mb-3">{card.title}</h3>
              <p className="text-gray-400 mb-4">{card.desc}</p>
              <div className="space-y-2">
                {card.examples.map((ex, i) => (
                  <div key={i} className="bg-white/5 px-3 py-2 rounded-lg border-l-3 border-orange-500 text-sm text-gray-400">{ex}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Eligibility Section */}
      <section id="eligibility" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-emerald-500 bg-clip-text text-transparent">Who Can Participate</span>
          </h2>
          <p className="text-xl text-gray-400">Membership in qualifying entrepreneur masterminds required</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[
            { icon: '🌟', name: 'Gobundance', desc: 'Members of Gobundance mastermind' },
            { icon: '🚀', name: 'EO', desc: 'Entrepreneurs\' Organization members worldwide' },
            { icon: '💼', name: 'YPO', desc: 'Young Presidents\' Organization and YPO Gold members' },
            { icon: '🎯', name: 'Strategic Coach', desc: 'Strategic Coach program participants' },
            { icon: '🧠', name: 'Genius Network', desc: 'Genius Network members at all levels' },
            { icon: '💎', name: 'R360', desc: 'R360 community members' },
            { icon: '👥', name: 'Similar Groups', desc: 'Members of comparable entrepreneur mastermind organizations' },
          ].map((group, idx) => (
            <div key={idx} className="bg-gray-800/80 border border-white/10 rounded-2xl p-6 text-center hover:border-emerald-500 transition-all">
              <div className="text-4xl mb-3">{group.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{group.name}</h3>
              <p className="text-sm text-gray-400">{group.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-emerald-500 bg-clip-text text-transparent">Frequently Asked Questions</span>
          </h2>
          <p className="text-xl text-gray-400">Everything you need to know about the challenge</p>
        </div>

        <div className="space-y-4">
          {[
            { q: 'What is AI Rocket + Astra Intelligence?', a: 'AI Rocket is the most powerful AI suite built specifically for entrepreneurs and their teams. It combines the best AI models (Claude, Gemini, OpenAI) with your connected business data to deliver personalized insights. Astra Intelligence is AI Rocket\'s built-in analytics system that tracks how your team uses AI across Run, Build, and Grow dimensions, providing automated scoring and insights throughout the Challenge.' },
            { q: 'What is required to get Free & Unlimited AI usage for me and my team?', a: 'Simply register for the Challenge and use AI Rocket during the 90-day challenge period (Jan 15 - Apr 15). Your activity will automatically be tracked by Astra Intelligence to generate your team\'s score. To be considered for prizes, you must submit the Prize Application form during April 6-10. All registered teams get free unlimited access regardless of whether they submit for prize consideration.' },
            { q: 'What if I don\'t want to be in the Challenge but I do want the Free Unlimited AI?', a: 'You can absolutely use AI Rocket with free unlimited access during the challenge period without competing for prizes. Simply register, set up your team, and use the platform as much as you want. If you decide not to submit the Prize Application form during April 6-10, you won\'t be evaluated for prizes but you\'ll still have enjoyed 90 days of free unlimited AI access for your team.' },
            { q: 'What are the prize values?', a: 'The top 10 teams win equity prizes: 1st ($2M), 2nd ($1M), 3rd ($600K), 4th ($400K), 5th ($300K), 6th ($225K), 7th ($175K), 8th ($125K), 9th ($100K), 10th ($75K). All 10 winners also receive Lifetime Ultra Plan subscriptions. Values based on planned company valuation target of $250M.' },
            { q: 'How does Astra Intelligence scoring work?', a: 'Astra automatically tracks how your team uses AI Rocket throughout the challenge, assigning weighted scores across Run, Build, and Grow dimensions. These scores remain hidden until the challenge ends and represent 50% of your final evaluation score.' },
            { q: 'What is the Impact Statement?', a: 'The Impact Statement is a required part of your Final Application where you answer: "What positive impact are you able to make in the world with your new AI-Powered business?" This demonstrates alignment with our core mission and constitutes 25% of your challenge score.' },
            { q: 'How many team members can participate?', a: 'Each team has a primary user who manages the account. Additional team members can be invited once the team account is setup. All team members get full unlimited access during the challenge.' },
            { q: 'What happens if I don\'t win a top 10 spot?', a: 'All teams that submit valid prize applications during the April 6-10 window receive a 1-year unlimited subscription to AI Rocket—regardless of final placement!' },
            { q: 'How does AI Rocket handle my data privacy and security?', a: 'AI Rocket syncs with your selected data only after you give authorization, and only with selected data directed by you. The data sync is fully encrypted to the highest industry standards. AI Rocket will not train on or use any user data without express written consent.' },
            { q: 'When does registration open?', a: 'Registration opens January 5, 2026. Complete the registration form with your team details and receive your unique launch code. The Challenge officially launches January 15, 2026. Entry is limited to the first 300 teams who successfully launch their AI Rocket.' },
            { q: 'What happens after the Challenge ends?', a: 'AI Rocket fully launches to the public on April 16, 2026 with a 10-day unlimited trial, then upgrade required. Challenge participants get a 5-day countdown to continue their access before upgrade is required.' },
          ].map((faq, idx) => (
            <div key={idx} className="bg-gray-800/80 border border-white/10 rounded-2xl p-6 hover:border-orange-500 transition-all">
              <h4 className="text-lg font-bold text-white mb-3">{faq.q}</h4>
              <p className="text-gray-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Terms Section */}
      <section id="terms" className="py-24 px-4 max-w-5xl mx-auto">
        <div className="bg-gray-800/80 border border-white/10 rounded-3xl p-8 md:p-12">
          <div className="text-center mb-12 pb-8 border-b border-white/10">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-2">
              <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-emerald-500 bg-clip-text text-transparent">$5M AI Moonshot Challenge</span>
            </h2>
            <p className="text-gray-500">Official Terms & Conditions</p>
          </div>

          <div className="space-y-8 text-gray-400">
            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-3">1. Challenge Overview & Eligibility</h3>
              <p className="mb-2">The AI Rocket $5M Moonshot Challenge (the "Challenge") is organized and administered by RocketHub.AI, a registered trade name of Health Rocket Ventures LLC ("HRV," "Sponsor," "we," or "us").</p>
              <p className="mb-2"><strong className="text-white">Eligibility Requirements:</strong> Verified members in good standing of qualifying entrepreneur mastermind organizations: GoBundance, EO, YPO, Strategic Coach, Genius Network, R360, or similar groups as determined by Sponsor.</p>
              <p>Participation is limited to the first 300 eligible teams that complete registration. This is a skill-based contest where winners are determined by demonstrated effort, engagement, and measurable results achieved through use of the AI Rocket platform.</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-3">2. Challenge Period & Timeline</h3>
              <p className="mb-2">Registration opens January 5, 2026. The Challenge begins January 15, 2026 and runs through April 15, 2026.</p>
              <p className="mb-2">Prize applications must be submitted during April 6-10, 2026. Winners decided April 13, 2026.</p>
              <p>Winner announcements: April 13 (all metrics/non-winners), April 14 (3rd place), April 15 (2nd place), April 16 (1st place and full app launch).</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-3">3. Prizes & Valuation</h3>
              <p className="mb-2">Prizes consist of Phantom Equity Units in Health Rocket Ventures LLC for the top 10 teams: 1st Place (0.80%), 2nd Place (0.40%), 3rd Place (0.24%), 4th Place (0.16%), 5th Place (0.12%), 6th Place (0.09%), 7th Place (0.07%), 8th Place (0.05%), 9th Place (0.04%), 10th Place (0.03%). At the Sponsor's target company valuation of $250M, these stakes would represent approximately $2M, $1M, $600K, $400K, $300K, $225K, $175K, $125K, $100K, and $75K respectively.</p>
              <p className="mb-2"><strong className="text-white">IMPORTANT - NATURE OF PHANTOM EQUITY:</strong> Phantom Equity Units are contractual rights to receive a cash payment upon a Qualifying Liquidity Event (defined as a sale, merger, acquisition, or IPO of Health Rocket Ventures LLC). Phantom Equity Units do NOT constitute actual ownership, membership interests, or securities in HRV or any related entity. Holders have no voting rights, no rights to distributions, no rights to inspect company records, and no other rights associated with actual equity ownership.</p>
              <p className="mb-2"><strong className="text-white">VALUATION DISCLAIMER:</strong> Dollar values stated herein are based on projected future company valuations and are provided for illustrative purposes only. Health Rocket Ventures LLC is a pre-revenue startup. The current fair market value of these Phantom Equity Units is undetermined and may be nominal. Actual payout value, if any, will depend entirely on whether a Qualifying Liquidity Event occurs and the company valuation at that time. There is no guarantee that a Qualifying Liquidity Event will ever occur.</p>
              <p>All 10 winners receive Lifetime Ultra Plan subscriptions to AI Rocket. All valid prize applicants who do not place in the top 10 receive 1-year unlimited subscriptions.</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-3">4. Judging & Selection</h3>
              <p className="mb-2">Winners are selected by the AI Rocket Advisory Committee based on: Impact Statement (25%), RBG Matrix summaries (25%), Astra Intelligence automated scoring (50%), plus social media engagement and bonus points.</p>
              <p className="mb-2"><strong className="text-white">SKILL-BASED CONTEST:</strong> This Challenge is a skill-based contest. All scoring criteria measure participant effort, engagement, consistency of platform usage, quality of inputs, and demonstrable results. Winners are determined by skill and effort, not by chance.</p>
              <p className="mb-2"><strong className="text-white">SCORING DISCRETION:</strong> The AI Rocket Advisory Committee consists of RocketHub.AI leadership and designated advisors selected at Sponsor's sole discretion. The allocation of bonus points, weighting of social media engagement, and interpretation of all scoring criteria are at the sole and absolute discretion of the Sponsor and the Advisory Committee.</p>
              <p>All judging decisions, including automated AI scoring, are final and binding and are not subject to appeal, dispute, or review.</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-3">5. Participant Conduct & Requirements</h3>
              <p className="mb-2">Participants must use AI Rocket in good faith for legitimate business purposes.</p>
              <p className="mb-2"><strong className="text-white">Social Media Bonus Points:</strong> Bonus points will be awarded to the top 20 teams that mention AI Rocket in their social media posts. Posts on LinkedIn, X/Twitter, and Facebook tagging RocketHub.AI and AI Rocket are eligible for bonus consideration. All posts must comply with FTC disclosure guidelines and applicable platform terms of service.</p>
              <p>Fraudulent or manipulative activities, including artificial inflation of engagement metrics, false statements, or attempts to circumvent judging criteria, will result in immediate disqualification.</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-3">6. Intellectual Property & License to Use</h3>
              <p className="mb-2">By participating in the Challenge and submitting any materials (including Impact Statements, success stories, testimonials, social media posts, and any other content), participants grant RocketHub.AI and Health Rocket Ventures LLC a perpetual, worldwide, royalty-free, non-exclusive license to use, reproduce, modify, publish, distribute, and display such materials for marketing, promotional, and commercial purposes without additional compensation or approval.</p>
              <p>Participants represent and warrant that they have all necessary rights to grant this license and that submitted materials do not infringe upon any third-party intellectual property rights.</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-3">7. Privacy & Data</h3>
              <p className="mb-2">RocketHub.AI will collect and process participant data in accordance with its Privacy Policy, available at: <a href="https://airocket.app/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">https://airocket.app/privacy</a></p>
              <p className="mb-2"><strong className="text-white">Consent to Data Use in Judging:</strong> By participating, you consent to the collection and use of your platform usage data, engagement metrics, and submitted materials for purposes of judging and scoring, including processing by automated systems such as Astra Intelligence.</p>
              <p className="mb-2">Individual user information remains private; only anonymized or aggregated data may be shared for general marketing purposes.</p>
              <p><strong className="text-white">Winner Publicity:</strong> By accepting a prize, winners consent to the use of their name, likeness, biographical information, and statements for promotional purposes without additional compensation, except where prohibited by law.</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-3">8. Prize Fulfillment & Agreement</h3>
              <p className="mb-2">Winners will be required to execute a Phantom Equity Agreement within thirty (30) days of the Challenge closing date (April 15, 2026). The Phantom Equity Agreement will contain the full terms and conditions governing the Phantom Equity Units.</p>
              <p className="mb-2"><strong className="text-white">FORFEITURE:</strong> Failure to execute the Phantom Equity Agreement within the 30-day period will result in automatic forfeiture of the prize. Forfeited prizes will not be re-awarded.</p>
              <p><strong className="text-white">Tax Responsibility:</strong> Winners are solely responsible for any federal, state, or local taxes arising from receipt of prizes or any future payout from Phantom Equity Units.</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-3">9. Limitation of Liability</h3>
              <p className="mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, ROCKETHUB.AI AND HEALTH ROCKET VENTURES LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM:</p>
              <ul className="list-disc list-inside ml-4 mb-2 space-y-1">
                <li>Participation in the Challenge</li>
                <li>The value or lack of value of Phantom Equity Units at any time</li>
                <li>The occurrence or non-occurrence of any Qualifying Liquidity Event</li>
                <li>Company valuation, dilution, or any other corporate actions affecting potential payout amounts</li>
                <li>Any tax consequences to winners</li>
                <li>Technical failures, scoring errors, or judging determinations</li>
              </ul>
              <p>Participants agree that any claims arising from this Challenge shall be limited to actual direct damages not exceeding the value of any subscription fees paid, if any.</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-3">10. General Provisions</h3>
              <p className="mb-2"><strong className="text-white">Governing Law:</strong> This Challenge and these Terms of Service shall be governed by the laws of the State of New York without regard to conflicts of law principles.</p>
              <p className="mb-2"><strong className="text-white">Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>
              <p className="mb-2"><strong className="text-white">Modification:</strong> Sponsor reserves the right to modify these Terms, suspend, or cancel the Challenge at any time for any reason. Material changes will be communicated to registered participants.</p>
              <p><strong className="text-white">Entire Agreement:</strong> These Terms of Service, together with the Privacy Policy and any executed Phantom Equity Agreement, constitute the entire agreement between participants and Sponsor regarding the Challenge.</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-3">11. Contact Information</h3>
              <p className="mb-2"><strong className="text-white">RocketHub.AI (Health Rocket Ventures LLC)</strong></p>
              <p>Email: <a href="mailto:info@rockethub.ai" className="text-orange-500 hover:underline">info@rockethub.ai</a></p>
              <p>Website: <a href="https://www.airocket.app" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">https://www.airocket.app</a></p>
            </div>

            <div className="text-center pt-8 border-t border-white/10">
              <p className="text-gray-500"><strong>Effective Date:</strong> January 5, 2026</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 text-center relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-emerald-500 bg-clip-text text-transparent">Ready to Transform?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-10">Join 300 elite entrepreneurs competing to build AI-Powered businesses</p>

          <div className="flex justify-center gap-8 mb-10 flex-wrap">
            {[
              { value: countdown.days, label: 'Days' },
              { value: countdown.hours, label: 'Hours' },
              { value: countdown.minutes, label: 'Minutes' },
              { value: countdown.seconds, label: 'Seconds' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-orange-500 to-emerald-500 bg-clip-text text-transparent">{item.value}</div>
                <div className="text-gray-500 uppercase tracking-wider text-sm">{item.label}</div>
              </div>
            ))}
          </div>

          <Link
            to="/moonshot/register"
            className="px-10 py-5 rounded-full text-xl font-bold bg-gradient-to-r from-orange-500 to-emerald-500 text-white shadow-lg shadow-orange-500/40 hover:scale-105 transition-transform"
          >
            Register Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 text-center border-t border-white/10 bg-gray-800/50">
        <div className="text-3xl font-extrabold mb-6">
          <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-emerald-500 bg-clip-text text-transparent">RocketHub.AI</span>
        </div>
        <div className="flex justify-center gap-8 mb-6 flex-wrap">
          <a href="https://rockethub.ai" className="text-gray-400 hover:text-orange-500 transition-colors">Home</a>
          <a href="https://rockethub.ai/ai-rocket" className="text-gray-400 hover:text-orange-500 transition-colors">AI Rocket</a>
          <Link to="/terms" className="text-gray-400 hover:text-orange-500 transition-colors">Terms</Link>
          <Link to="/privacy" className="text-gray-400 hover:text-orange-500 transition-colors">Privacy</Link>
        </div>
        <p className="text-gray-500">© 2026 RocketHub.AI — Level Up Entrepreneurs Using AI</p>
      </footer>

      {/* Scroll to Top */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-emerald-500 text-white font-bold shadow-lg shadow-orange-500/40 hover:scale-110 transition-transform z-50"
      >
        ↑
      </button>

      <AppDemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
      />
    </div>
  );
};
