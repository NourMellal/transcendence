# Transcendence Frontend

React + TypeScript + Vite + Tailwind CSS frontend for the Transcendence application.

## Features

- **User Profile Component**: View and edit user information
  - Display username, email, and avatar
  - Edit username with inline form
  - Upload new avatar images
  - Real-time feedback with loading states
  - Success and error messages

## Technologies

- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

Start the development server:

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Building for Production

```bash
pnpm build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
pnpm preview
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Environment Variables

- `VITE_API_URL` - Backend API URL (default: `/api`)
- `VITE_USE_MOCK_API` - Use mock API for testing (default: `false`)

## Mock API

For testing without a backend, you can enable the mock API:

1. Set `VITE_USE_MOCK_API=true` in your `.env` file
2. The mock API simulates:
   - Fetching user profile data
   - Updating username
   - Uploading avatar images

## API Integration

The frontend expects the following API endpoints:

### GET /api/users/me
Returns the current user's profile.

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "avatar": "string?",
  "isTwoFAEnabled": boolean,
  "createdAt": "string",
  "updatedAt": "string"
}
```

### PATCH /api/users/me
Updates the current user's profile.

**Request (multipart/form-data):**
- `username` (optional): New username
- `avatar` (optional): New avatar image file

**Response:** Same as GET /api/users/me

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   └── Profile.tsx        # User profile component
│   ├── services/
│   │   ├── api.ts             # API client
│   │   └── mockApi.ts         # Mock API for testing
│   ├── types/
│   │   └── user.ts            # TypeScript types
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles with Tailwind
├── public/                    # Static assets
├── index.html                 # HTML template
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Component Usage

```tsx
import { Profile } from './components/Profile';

function App() {
  return <Profile />;
}
```

The Profile component handles all user interactions internally:
- Fetches user data on mount
- Manages loading and error states
- Handles form submission
- Provides visual feedback for all operations
