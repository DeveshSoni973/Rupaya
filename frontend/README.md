# Rupaya Frontend

Next.js frontend for the Rupaya expense splitting application.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Package Manager**: Bun
- **State Management**: React Context/Hooks

## Local Development

### Prerequisites

- Node.js 18+ or Bun
- Backend API running (see [backend README](../backend/README.md))

### Setup

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Set up environment variables**
   ```bash
   # Create .env.local file
   echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
   ```

3. **Start development server**
   ```bash
   bun dev
   ```

The app will be available at `http://localhost:3000`

## Production Deployment

### Deploy to Vercel

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed instructions.

**Quick steps:**

1. Push code to GitHub
2. Import project on Vercel
3. Configure:
   - Framework: Next.js
   - Root Directory: `frontend`
   - Build Command: `bun run build`
   - Install Command: `bun install`
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
   ```
5. Deploy!

### Environment Variables

**Development** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Production** (Vercel Dashboard):
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
NEXT_TELEMETRY_DISABLED=1
```

⚠️ **Important**: All client-side environment variables must be prefixed with `NEXT_PUBLIC_`

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   ├── (dashboard)/       # Dashboard pages
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   └── ...               # Feature components
│   ├── lib/                   # Utilities and helpers
│   │   ├── api.ts            # API client
│   │   └── ...
│   └── types/                 # TypeScript types
├── public/                    # Static assets
├── Dockerfile                 # Docker image (not used for Vercel)
├── vercel.json               # Vercel configuration
├── next.config.ts            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
└── package.json              # Dependencies
```

## Features

- 🔐 **Authentication**: Login, register, JWT token management
- 👥 **Groups**: Create and manage expense groups
- 💰 **Bills**: Add, edit, delete expenses
- 📊 **Summary**: View balances and settlements
- 🔍 **Search**: Find users to add to groups
- 📱 **Responsive**: Mobile-friendly design

## Scripts

```bash
# Development
bun dev              # Start dev server
bun build            # Build for production
bun start            # Start production server
bun lint             # Run ESLint
bun type-check       # Run TypeScript compiler

# Using npm/yarn/pnpm
npm run dev
npm run build
npm run start
```

## API Integration

The frontend communicates with the backend via REST API. All API calls are centralized in `src/lib/api.ts`.

### Example API Usage

```typescript
import { api } from '@/lib/api';

// Login
const response = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password'
});

// Get groups
const groups = await api.get('/groups');

// Create bill
const bill = await api.post(`/groups/${groupId}/bills`, {
  description: 'Dinner',
  amount: 50.00,
  // ...
});
```

## Styling

This project uses **Tailwind CSS** for styling. Custom styles are in:
- `src/app/globals.css` - Global styles and Tailwind directives
- Component files - Inline Tailwind classes

### Tailwind Configuration

See `tailwind.config.ts` for theme customization.

## Routing

Next.js App Router is used for routing:

- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - User dashboard
- `/groups/[id]` - Group details
- `/groups/[id]/settings` - Group settings

## Authentication

Authentication is handled via JWT tokens:
- Access token stored in memory (React state)
- Refresh token stored in httpOnly cookie
- Automatic token refresh on API calls
- Redirect to login on 401 errors

## Troubleshooting

### API connection fails
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend is running and accessible
- Check browser console for CORS errors
- Ensure backend CORS allows your frontend domain

### Build fails
- Clear `.next` directory: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && bun install`
- Check for TypeScript errors: `bun run type-check`

### Environment variables not working
- Ensure variables are prefixed with `NEXT_PUBLIC_`
- Restart dev server after changing `.env.local`
- On Vercel, redeploy after adding variables

### Styling issues
- Clear Tailwind cache
- Check `tailwind.config.ts` configuration
- Verify `globals.css` is imported in root layout

## Deployment Checklist

- [ ] Set `NEXT_PUBLIC_API_URL` to production backend URL
- [ ] Update backend CORS to allow frontend domain
- [ ] Test authentication flow
- [ ] Test all API endpoints
- [ ] Verify responsive design
- [ ] Check browser console for errors
- [ ] Test on multiple browsers

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit a pull request

## License

MIT
