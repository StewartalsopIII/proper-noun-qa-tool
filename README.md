# Proper Noun QA Tool

A Next.js application that helps identify and correct proper nouns in transcripts.

## Features

- Upload and analyze transcripts to identify proper nouns
- Review suggested corrections for proper nouns
- Export corrected transcripts

## Authentication

This application uses [Clerk](https://clerk.com/) for authentication.

### Setting up Clerk

1. Sign up for a Clerk account at [clerk.com](https://clerk.com/)
2. Create a new application in the Clerk dashboard
3. Copy your Publishable Key and Secret Key
4. Create a `.env.local` file at the root of your project with the following variables:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

## Development

### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Clerk keys and OpenRouter API key

### Running locally

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Deployment

### Deploying to Vercel

1. Push your repository to GitHub
2. Import the project in Vercel
3. Set the following environment variables in Vercel:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL` (optional)
4. Deploy

## License

[MIT](LICENSE)
