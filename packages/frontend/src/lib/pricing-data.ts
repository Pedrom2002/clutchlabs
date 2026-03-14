export interface PricingTier {
  name: string
  price: string
  description: string
  demos: string
  features: string[]
  popular?: boolean
}

export const tiers: PricingTier[] = [
  {
    name: 'Free',
    price: '0',
    description: 'Try it out with basic analysis.',
    demos: '5 demos/month',
    features: ['Basic kill/death stats', 'Round-by-round timeline', '1 team, 5 players', '7 day data retention'],
  },
  {
    name: 'Solo',
    price: '9',
    description: 'For individual players serious about improving.',
    demos: '30 demos/month',
    features: [
      'AI-powered insights',
      'Heatmaps & positioning analysis',
      'Player ratings & trends',
      'Economy analysis',
      '1 team, 5 players',
      '90 day data retention',
    ],
    popular: true,
  },
  {
    name: 'Team',
    price: '39',
    description: 'For teams that want a competitive edge.',
    demos: '150 demos/month',
    features: [
      'Everything in Solo',
      'Tactical playbook builder',
      'Opponent scouting',
      '3 teams, 10 players each',
      '1 year data retention',
      'Priority support',
    ],
  },
  {
    name: 'Pro',
    price: '129',
    description: 'For professional teams and organizations.',
    demos: 'Unlimited demos',
    features: [
      'Everything in Team',
      'API access',
      'Custom ML models',
      'Unlimited teams & players',
      'Unlimited data retention',
      'Dedicated support',
      'White-label options',
    ],
  },
]
