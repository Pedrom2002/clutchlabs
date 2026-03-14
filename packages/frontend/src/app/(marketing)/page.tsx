import Link from 'next/link'
import {
  BarChart3,
  Brain,
  ChevronRight,
  Map,
  Shield,
  Target,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from 'lucide-react'
import { EmailCaptureForm } from '@/components/marketing/email-capture-form'
import { tiers } from '@/lib/pricing-data'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description:
      'Our ML models (Mamba, GraphSAGE, CatBoost) analyze every round to find tactical patterns, positioning errors, and optimal utility usage.',
  },
  {
    icon: Map,
    title: '2D/3D Heatmaps',
    description:
      'Visualize player positioning, spray patterns, utility lineups, and kill zones with interactive heatmaps across all maps.',
  },
  {
    icon: TrendingUp,
    title: 'Player Ratings & Trends',
    description:
      'ELO-style ratings combining aim mechanics, game sense, utility impact, and teamwork. Track improvement over time.',
  },
  {
    icon: Target,
    title: 'Economy Optimization',
    description:
      'AI predicts optimal buy/save decisions, eco-round win probability, and identifies economy mismanagement patterns.',
  },
  {
    icon: Shield,
    title: 'Tactical Playbook',
    description:
      'Automatically detect and catalog team strategies with similarity clustering. Find counter-strats from pro matches.',
  },
  {
    icon: BarChart3,
    title: 'Live Match Prediction',
    description:
      'Real-time round win prediction using transformer models. Understand momentum shifts and key turning points.',
  },
]

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,107,0,0.08),transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary-dim text-primary text-sm px-4 py-1.5 rounded-full mb-8 font-medium">
            <Zap className="h-4 w-4" />
            Early Access — Join the Beta
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight max-w-4xl mx-auto">
            AI-Powered <span className="text-primary">CS2</span> Analytics
          </h1>
          <p className="mt-6 text-lg md:text-xl text-text-muted max-w-2xl mx-auto leading-relaxed">
            Upload your demos and let our ML models find what humans miss. Positioning errors,
            tactical patterns, economy leaks, and player improvement paths — all automated.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <EmailCaptureForm />
            <p className="text-text-dim text-sm">Free during beta. No credit card required.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">
            From Demo to Insights in <span className="text-primary">3 Steps</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Upload,
                title: 'Upload Demo',
                desc: 'Drop your .dem file or connect your FACEIT account for automatic imports.',
              },
              {
                step: '02',
                icon: Brain,
                title: 'AI Analysis',
                desc: '7 specialized ML models process every tick, round, and economy decision.',
              },
              {
                step: '03',
                icon: BarChart3,
                title: 'Get Insights',
                desc: 'Interactive dashboards with heatmaps, ratings, tactical breakdowns, and improvement tips.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-bg-card border border-border rounded-xl p-8 hover:border-border-hover transition-colors"
              >
                <div className="text-primary font-mono text-sm mb-4">{item.step}</div>
                <item.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">
            Everything You Need to <span className="text-primary">Level Up</span>
          </h2>
          <p className="text-text-muted text-center mb-16 max-w-xl mx-auto">
            Built by CS2 players for CS2 players. Our AI models are trained on thousands of pro
            matches.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-bg-card border border-border rounded-xl p-6 hover:border-border-hover transition-colors group"
              >
                <feature.icon className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple <span className="text-primary">Pricing</span>
          </h2>
          <p className="text-text-muted text-center mb-16">
            Start free, upgrade when you need more.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`bg-bg-card border rounded-xl p-6 flex flex-col ${
                  tier.popular ? 'border-primary' : 'border-border'
                }`}
              >
                {tier.popular && (
                  <div className="text-xs text-primary font-medium mb-2">Most Popular</div>
                )}
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold">&euro;{tier.price}</span>
                  <span className="text-text-dim text-sm">/month</span>
                </div>
                <div className="text-sm text-text-muted mb-4">{tier.demos}</div>
                <ul className="flex-1 space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="text-sm text-text-muted flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`text-center text-sm font-medium py-2.5 rounded-lg transition-colors ${
                    tier.popular
                      ? 'bg-primary hover:bg-primary-hover text-white'
                      : 'bg-bg-elevated hover:bg-border text-text'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Users className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Game?</h2>
          <p className="text-text-muted mb-8">
            Join the beta and be the first to experience AI-powered CS2 analytics.
          </p>
          <div className="flex justify-center">
            <EmailCaptureForm />
          </div>
        </div>
      </section>
    </>
  )
}
