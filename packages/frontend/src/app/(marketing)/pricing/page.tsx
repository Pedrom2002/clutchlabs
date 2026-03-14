import Link from 'next/link'
import { Check } from 'lucide-react'
import { tiers } from '@/lib/pricing-data'

export default function PricingPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-bold text-center mb-4">
        Plans & <span className="text-primary">Pricing</span>
      </h1>
      <p className="text-text-muted text-center mb-16 max-w-xl mx-auto">
        Start free and scale as your team grows. All plans include core demo parsing and analysis.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`bg-bg-card border rounded-xl p-6 flex flex-col ${
              tier.popular ? 'border-primary ring-1 ring-primary/20' : 'border-border'
            }`}
          >
            {tier.popular && (
              <div className="text-xs text-primary font-medium mb-2">Most Popular</div>
            )}
            <h3 className="text-xl font-bold">{tier.name}</h3>
            <p className="text-text-muted text-sm mt-1 mb-4">{tier.description}</p>
            <div className="mb-2">
              <span className="text-4xl font-bold">&euro;{tier.price}</span>
              <span className="text-text-dim text-sm">/month</span>
            </div>
            <div className="text-sm text-accent font-medium mb-6">{tier.demos}</div>
            <ul className="flex-1 space-y-3 mb-6">
              {tier.features.map((f) => (
                <li key={f} className="text-sm text-text-muted flex items-start gap-2">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className={`text-center text-sm font-medium py-3 rounded-lg transition-colors ${
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
  )
}
