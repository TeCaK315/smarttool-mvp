# SmartTool MVP

Optimize Your Supply Chain Effortlessly

## Features

- **Automated Data Analysis** — Automatically analyze and report on data inputs.
- **User-Friendly Interface** — Design an intuitive interface for easy data input and report generation.
- **GDPR Compliance Feature** — Implement data handling practices that comply with GDPR regulations.
- **Cost Optimization Suggestions** — Provide actionable suggestions for cost reduction based on data analysis.

## How It Works

1. **User logs into the platform** — Dashboard with options to input supply chain data
2. **User inputs supply chain data and parameters** — Form fields for data entry
3. **User submits data for analysis** — Processing screen with estimated waiting time
4. **User receives the supply chain report** — Downloadable report with insights and recommendations

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL)
- **Payments:** Stripe
- **AI:** OpenAI GPT-4o-mini

## Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd smarttool-mvp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys (optional — app works in demo mode without them)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file:

```env
RESEND_API_KEY=re_xxxxxxxxxxxx  # Resend API key for sending emails (optional)
EMAIL_FROM=noreply@yourdomain.com  # From email address (optional)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co  # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Supabase service role key (server only)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Stripe publishable key
STRIPE_SECRET_KEY=sk_test_...  # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...  # Stripe webhook secret
STRIPE_PRO_PRICE_ID=price_...  # Stripe Pro plan price ID
OPENAI_API_KEY=sk-...  # OpenAI API key
OPENAI_MODEL=gpt-4o-mini  # OpenAI model
NEXT_PUBLIC_APP_URL=http://localhost:3000  # App base URL
```

## Demo Mode

This project works **out of the box without any API keys**. When `OPENAI_API_KEY` is not set, the app runs in demo mode with pre-generated realistic results.

To enable live AI analysis, add your OpenAI API key to `.env.local`.

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| Basic | $19.99/mo | 5 reports/month, Email support |
| Pro | $49.99/mo | Unlimited reports, Priority support |

## Project Structure

```
smarttool-mvp/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── page.tsx      # Landing page
│   │   ├── dashboard/    # Main application
│   │   │   ├── page.tsx  # Dashboard with input form
│   │   │   └── analysis/ # Results page
│   │   ├── api/          # API routes
│   │   └── login/        # Authentication
│   ├── components/       # Reusable UI components
│   └── lib/              # Utilities & configurations
├── public/               # Static assets
├── .env.example          # Environment variables template
└── package.json          # Dependencies (59 files total)
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

The app will work immediately in demo mode. Add API keys later for live functionality.

### Supabase Setup (Optional)

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration SQL from `src/lib/migrations/`
3. Add Supabase URL and anon key to environment variables
4. Auth and data persistence will be enabled automatically

## License

MIT
