# 🌱 OverGuild Backend - Farm Service

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

Backend service for OverGuild - A Web3 GameFi platform where users grow virtual plants through social interactions, event participation, and GitHub contributions.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Deployment](#-deployment)

## ✨ Features

### 🔐 Authentication
- **Metamask Wallet Login** - Single-step wallet-based login (no signature)
- **JWT Tokens** - Stateless authentication
- **Auto-create Assets** - New users receive 1 Land + 1 Plant automatically

### 👤 User Management
- **Profile Management** - Get/Update username, avatar, network
- **Multi-chain Support** - Sui, Ethereum networks
- **Inventory Tracking** - Seeds, items, event rewards
- **QR Code Generation** - For user identity and social interactions

### 📍 Event Check-in (Location Service)
- **FundX Integration** - Microservice communication via REST API
- **Active Events** - Get upcoming events from FundX
- **Check-in System** - Validate event time and status
- **Reward System** - 3x SEED_COMMON per check-in
- **Duplicate Prevention** - One check-in per user per event

### 🌱 Game Mechanics (MVP)
- **Land Ownership** - Users can own multiple land plots
- **Plant Growth** - Plants grow from SEED → SPROUT → BLOOM → FRUIT
- **Social Watering** - Water other users' plants
- **72h Wilt System** - Plants die if not interacted with for 72 hours

## 🛠 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) - Open-source Firebase alternative
- **ORM**: [Prisma](https://www.prisma.io/) - Next-generation ORM
- **Authentication**: [@nestjs/jwt](https://docs.nestjs.com/security/authentication) - Wallet-based JWT tokens
- **Documentation**: [Swagger/OpenAPI](https://swagger.io/) - Interactive API docs
- **Package Manager**: [pnpm](https://pnpm.io/) - Fast, disk space efficient

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Supabase account
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/FundX-OGX/Backend-Farm.git
cd Backend-Farm
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Setup environment variables**
```bash
cp env.example .env
```

Edit `.env` with your credentials (see [Environment Variables](#-environment-variables))

4. **Generate Prisma client**
```bash
pnpm prisma generate
```

5. **Run database migrations** (if needed)
```bash
# Pull schema from Supabase
pnpm prisma db pull

# Or push schema to Supabase
pnpm prisma db push
```

6. **Start development server**
```bash
pnpm run start:dev
```

Server will start on `http://localhost:3000`

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Supabase
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# JWT
JWT_SECRET="your-secret-key-change-in-production"

# FundX API (Microservice)
FUNDX_API_URL="https://backend-fundx.onrender.com"

# Server
PORT=3000
```

### Where to find credentials:

1. **Supabase Dashboard** → Settings → Database
   - `DATABASE_URL` (Connection pooling)
   - `DIRECT_URL` (Direct connection)

2. **Supabase Dashboard** → Settings → API
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **JWT_SECRET**: Generate with `openssl rand -base64 32`

## 🗄️ Database Setup

### Schema Overview

The database uses PostgreSQL via Supabase with the following main tables:

- `users` - User profiles and authentication
- `lands` - Land plots owned by users
- `plants` - Plants growing on lands
- `seeds` - Seed inventory
- `inventory` - Consumable items (water, fertilizer)
- `inventory_items` - Event rewards and check-in logs
- `missions` - Active missions
- `mission_logs` - Mission history
- `soulbound_tokens` - On-chain achievements

### Initial Setup

1. **Create tables in Supabase**

Run the SQL in Supabase SQL Editor (Settings → SQL Editor):

```sql
-- Tables are auto-created via Prisma schema
-- Or manually run migrations
```

2. **Sync Prisma with database**

```bash
# Pull existing schema from Supabase
pnpm prisma db pull

# Generate Prisma client
pnpm prisma generate
```

3. **Verify tables**

```bash
# Check Prisma Studio
pnpm prisma studio
```

## 📚 API Documentation

### Interactive Docs (Swagger)

Once the server is running, visit:

```
http://localhost:3000/api
```

### Main Endpoints

#### Authentication

```http
POST /auth/login                          # Login with wallet address
```

#### User Profile

```http
GET   /user/profile      # Get current user profile
PATCH /user/profile      # Update profile
GET   /user/qr           # Get QR code data
```

#### Events (Location Service)

```http
GET  /events/active      # Get active/upcoming events
POST /events/check-in    # Check-in to event
```

#### Game (Future)

```http
POST /plant/plant        # Plant a seed
POST /plant/:id/water    # Water a plant
POST /plant/:id/harvest  # Harvest fruits
```

### Example: Login Flow

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xYourAddress",
    "username": "Alice",
    "network": "sui",
    "avatar": "https://example.com/avatar.png"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "walletAddress": "0x...",
    "username": "Alice",
    "network": "sui",
    "landsCount": 1,
    "plantsCount": 1
  },
  "isNewUser": true
}
```

## 📁 Project Structure

```
backend-farm/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── auth/                  # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── decorators/
│   │       └── current-user.decorator.ts
│   ├── user/                  # User profile module
│   │   ├── user.controller.ts
│   │   └── user.service.ts
│   ├── event/                 # Event check-in module
│   │   ├── event.controller.ts
│   │   ├── event.service.ts
│   │   ├── fundx-api.client.ts
│   │   └── dto/
│   │       └── check-in.dto.ts
│   ├── land/                  # Land management (future)
│   ├── plant/                 # Plant growth (future)
│   ├── seed/                  # Seed inventory (future)
│   ├── supabase/              # Supabase client
│   ├── app.module.ts          # Root module
│   └── main.ts                # Entry point
├── .env                       # Environment variables
├── package.json
└── README.md
```

## 💻 Development

### Available Scripts

```bash
# Development
pnpm run start:dev          # Start with hot-reload

# Production
pnpm run build              # Build for production
pnpm run start:prod         # Run production build

# Database
pnpm prisma generate        # Generate Prisma client
pnpm prisma studio          # Open Prisma Studio
pnpm prisma db pull         # Pull schema from database
pnpm prisma db push         # Push schema to database

# Testing
pnpm run test               # Run unit tests
pnpm run test:e2e           # Run e2e tests
pnpm run test:cov           # Test coverage

# Linting
pnpm run lint               # Run ESLint
pnpm run format             # Format with Prettier
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Commit changes
git add .
git commit -m "feat: your feature description"

# Push to remote
git push origin feature/your-feature

# Create Pull Request on GitHub
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## 🚀 Deployment

### Deploy to Render/Railway/Heroku

1. **Set environment variables** in platform dashboard

2. **Build command**:
```bash
pnpm install && pnpm prisma generate && pnpm run build
```

3. **Start command**:
```bash
pnpm run start:prod
```

4. **Health check endpoint**: `/` (returns "OverGuild Backend is running!")

### Deploy to AWS/GCP/Azure

Use Docker:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g pnpm
RUN pnpm install
COPY . .
RUN pnpm prisma generate
RUN pnpm run build
EXPOSE 3000
CMD ["pnpm", "run", "start:prod"]
```

## 🔗 Related Services

- **FundX Backend**: https://backend-fundx.onrender.com
- **Frontend**: (Coming soon)
- **Smart Contracts**: (Coming soon)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Team

- **Backend Lead**: [Your Name]
- **Organization**: FundX-OGX

## 📞 Support

- GitHub Issues: [Create an issue](https://github.com/FundX-OGX/Backend-Farm/issues)
- Discord: (Add your Discord server)
- Email: (Add your email)

## 🎯 Roadmap

### ✅ Phase 1 (MVP - Completed)
- [x] Metamask authentication
- [x] User profile management
- [x] Event check-in system
- [x] FundX API integration
- [x] Reward system

### 🚧 Phase 2 (In Progress)
- [ ] Plant growth mechanics
- [ ] Social watering system
- [ ] Seed planting
- [ ] Harvest & composting
- [ ] 72h wilt mechanism (cron job)

### 📅 Phase 3 (Planned)
- [ ] Mission system (daily/weekly)
- [ ] Marketplace
- [ ] Land expansion
- [ ] GitHub integration
- [ ] Soulbound tokens (on-chain)

### 🔮 Phase 4 (Future)
- [ ] Guild system
- [ ] Leaderboards
- [ ] PvP mechanics
- [ ] NFT integration
- [ ] Mobile app support

---

<p align="center">Made with ❤️ by the OverGuild Team</p>
