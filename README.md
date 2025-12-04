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

- **Wallet Registration** - Register new users with wallet address
- **Wallet Login** - Login with existing wallet address (no signature)
- **JWT Tokens** - Stateless authentication
- **Auto-create Assets** - New users receive 1 Land + 1 Plant automatically

### 👤 User Management

- **Profile Management** - Get/Update username, avatar, network
- **Multi-chain Support** - Sui, Ethereum networks
- **QR Code Generation** - For user identity and social interactions

### 📦 Inventory System

- **Complete Item Management** - View, add, remove, transfer all items
- **Item Categories** - Seeds, Fruits, Fertilizers, Event Rewards
- **Filtering & Search** - Filter by category, search by item type
- **Item Transfer** - Send items to other users (by wallet or user ID)
- **Rich Metadata** - Item names, rarity, icons, descriptions
- **Inventory Summary** - Quick overview of totals by category

### 🎁 Phygital Exchange (Real-world Rewards)

- **Multi-resource Pricing** - Redeem rewards using Trees / Mushrooms / Spores (FRUIT_TREE / FRUIT_MUSHROOM / FRUIT_ALGAE)
- **Reward Catalog API** - `GET /phygital/rewards` returns price table + current balances
- **Redeem Flow** - `POST /phygital/redeem` spends resources and records an off-chain redemption request
- **History Tracking** - `GET /phygital/redemptions` lists past redemptions for the user

| Reward                 | Exchange Cost                                |
| ---------------------- | -------------------------------------------- |
| **Tote Bag**           | 1 Tree / 7 Mushrooms / 14 Spores            |
| **Lottery Ticket**     | 5 Trees / 50 Mushrooms / 100 Spores         |
| **Razer Headset**      | 10 Trees / 200 Mushrooms / 400 Spores       |
| **$300 Voucher**       | 50 Trees / 1000 Mushrooms / 2000 Spores     |
| **1 Chi Gold 9999**    | 100 Trees / 2000 Mushrooms / 4000 Spores    |
| **Latest iPhone**      | 150 Trees / 3000 Mushrooms / 6000 Spores    |
| **1 Seed NFT**         | _5000 Mushrooms / 10000 Spores_ (no Trees)  |

### 🛒 Gold Shop

- **Gold Currency** - Uses `balanceGold` from the user profile as soft currency
- **Weekly / Daily Limits** - Some items have per-day or per-week purchase caps
- **Mushroom Spore Exchange** - Convert Algae Spores into Mushrooms via the shop

| Item                    | Price / Requirement                            | Limit             |
| ----------------------- | ---------------------------------------------- | ----------------- |
| **Shovel**              | 500 Gold                                       | 1 / week          |
| **Bug Catch Glove**     | 30 Gold                                        | Unlimited         |
| **Growth Water**        | 100 Gold                                       | 1 / day           |
| **Fish Food**           | 20 Gold                                        | Unlimited         |
| **Mushroom Spore Swap** | 0 Gold + 5x Algae Spore (FRUIT_ALGAE) → 1x Mushroom (FRUIT_MUSHROOM) | 2 / week |

### 📍 Event Check-in (Location Service)

- **FundX Integration** - Microservice communication via REST API
- **Active Events** - Get upcoming events from FundX
- **Check-in System** - Validate event time and status
- **Reward System** - 3x SEED_COMMON per check-in
- **Duplicate Prevention** - One check-in per user per event

### 🌱 Ecology Service (Plant Lifecycle)

- **Auto Plant on Register** - New users receive 1 Land + 1 Plant (SEED stage) automatically
- **Plant Growth Stages** - Plants grow through SEED → SPROUT → BLOOM → FRUIT
- **Social Watering** - Water any plant to help it grow (rate limit: 1 water per hour per plant)
- **Growth Thresholds** - 3 waters to SPROUT, 8 to BLOOM, 15 to FRUIT
- **Harvest System** - Harvest fruits when plant reaches FRUIT stage (base 3 + bonus fruits)
- **72h Wilt System** - Plants automatically marked as DEAD if not interacted with for 72 hours
- **Cron Job** - Automatic wilt check runs every hour
- **Health Status** - Real-time health tracking (HEALTHY, WILTING, CRITICAL, DEAD)

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
POST /auth/register                        # Register new user
POST /auth/login                           # Login with wallet address
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

#### Inventory Management

```http
GET    /inventory                    # Get complete inventory (with filters)
GET    /inventory/summary            # Get inventory summary
POST   /inventory/add                # Add item (admin/system)
DELETE /inventory/remove             # Remove item
POST   /inventory/transfer           # Transfer item to another user
GET    /inventory/check/:type/:amt   # Check item availability
```

#### Shop

```http
GET  /shop/gold           # Get Gold Shop catalog and current gold balance
POST /shop/gold/purchase  # Purchase an item from the Gold Shop
```

#### Phygital Exchange

```http
GET  /phygital/rewards      # Bảng giá + số dư hiện tại
POST /phygital/redeem       # Đổi quà phygital
GET  /phygital/redemptions  # Lịch sử đổi thưởng
```

#### Ecology Service (Garden & Plants)

```http
GET  /garden             # Get user's garden (all lands with plants and growth info)
POST /plant/plant        # Plant a seed on a land plot
PATCH /plant/:id/water   # Water a plant (social feature)
POST /plant/:id/harvest  # Harvest fruits from mature plant
```

### Example: Register Flow

```bash
curl -X POST http://localhost:3000/auth/register \
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
    "avatar": "https://example.com/avatar.png",
    "xp": 0,
    "reputationScore": 0,
    "landsCount": 1,
    "plantsCount": 1
  }
}
```

**Error Response (409 Conflict)** - If user already exists:

```json
{
  "statusCode": 409,
  "message": "User with this wallet address already exists"
}
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
    "avatar": "https://example.com/avatar.png",
    "xp": 0,
    "reputationScore": 0,
    "landsCount": 1,
    "plantsCount": 1
  }
}
```

**Error Response (404 Not Found)** - If user doesn't exist:

```json
{
  "statusCode": 404,
  "message": "User not found. Please register first."
}
```

### Example: Ecology Service Flow

#### 1. Get Garden (View all plants)

```bash
curl -X GET http://localhost:3000/garden \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:

```json
[
  {
    "landId": "uuid",
    "plotIndex": 0,
    "soilQuality": { "fertility": 50, "hydration": 50 },
    "plant": {
      "id": "plant-uuid",
      "type": "SOCIAL",
      "stage": "SEED",
      "interactions": 0,
      "plantedAt": "2025-11-29T...",
      "lastInteractedAt": "2025-11-29T...",
      "age": 0
    },
    "growth": {
      "currentStage": "SEED",
      "nextStage": "SPROUT",
      "progress": 0,
      "interactionsNeeded": 3
    },
    "health": {
      "status": "HEALTHY",
      "hoursToWilt": 71,
      "isWilting": false,
      "isCritical": false,
      "wiltTime": "2025-12-02T...",
      "message": "Plant is healthy. 71 hours until wilt"
    },
    "watering": {
      "canWaterNow": true,
      "nextWaterTime": null
    },
    "status": "GROWING"
  }
]
```

### Example: Phygital Exchange

```bash
TOKEN="YOUR_JWT"

# 1. Xem bảng giá + số dư hiện tại
curl -X GET http://localhost:3000/phygital/rewards \
  -H "Authorization: Bearer $TOKEN"

# 2. Đổi Túi Tote bằng 14 Bào tử (FRUIT_ALGAE)
curl -X POST http://localhost:3000/phygital/redeem \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rewardKey": "TOTE_BAG",
    "paymentType": "SPORE",
    "contact": "@farmer123",
    "note": "Ship tại event OGX"
  }'
```

Sample response:

```json
{
  "success": true,
  "message": "Đã đổi Túi Tote bằng Bào tử",
  "reward": { "key": "TOTE_BAG", "name": "Túi Tote" },
  "payment": {
    "resource": "SPORE",
    "label": "Bào tử",
    "cost": 14,
    "remaining": 26
  },
  "redemption": {
    "id": "uuid",
    "status": "PENDING",
    "createdAt": "2025-12-04T13:00:00.000Z"
  }
}
```

#### 2. Water Plant

```bash
curl -X PATCH http://localhost:3000/plant/PLANT_ID/water \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:

```json
{
  "plant": { ... },
  "stageChanged": true,
  "oldStage": "SEED",
  "newStage": "SPROUT",
  "interactions": 3,
  "nextStage": "BLOOM",
  "interactionsNeeded": 5,
  "progress": 37,
  "message": "🎉 Plant grew to SPROUT stage!"
}
```

#### 3. Harvest Plant (when FRUIT stage)

```bash
curl -X POST http://localhost:3000/plant/PLANT_ID/harvest \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:

```json
{
  "success": true,
  "harvest": {
    "fruitYield": 6,
    "baseYield": 3,
    "bonusYield": 3,
    "plantType": "SOCIAL",
    "interactions": 15
  },
  "message": "🎉 Harvested 6 fruits! Land is now empty and ready for a new seed."
}
```

#### Growth Stages:

- **SEED** (0 interactions) → **SPROUT** (3 interactions) → **BLOOM** (8 interactions) → **FRUIT** (15 interactions)

#### Wilt System:

- Plants must be watered/interacted with within **72 hours** or they will be marked as **DEAD**
- Health status: `HEALTHY` → `WILTING` (< 24h) → `CRITICAL` (< 12h) → `DEAD` (0h)
- Cron job runs every hour to check and mark wilted plants

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
│   ├── inventory/             # Inventory management module
│   │   ├── inventory.controller.ts
│   │   ├── inventory.service.ts
│   │   ├── inventory.module.ts
│   │   ├── constants/
│   │   │   └── item-types.ts
│   │   └── dto/
│   │       ├── query-inventory.dto.ts
│   │       └── add-item.dto.ts
│   ├── land/                  # Land management
│   ├── plant/                 # Plant growth & lifecycle
│   ├── seed/                  # Seed operations
│   ├── fertilizer/            # Fertilizer & composting
│   ├── mission/               # Mission system
│   ├── soulbound-token/       # Achievement badges
│   ├── progression/           # User progression
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

- [x] Wallet authentication (no signature)
- [x] User profile management
- [x] Event check-in system
- [x] FundX API integration
- [x] Reward system

### ✅ Phase 2 (Completed)

- [x] Plant growth mechanics (SEED → SPROUT → BLOOM → FRUIT)
- [x] Social watering system
- [x] Seed planting
- [x] Harvest & composting
- [x] 72h wilt mechanism (cron job runs every hour)
- [x] **Inventory system** - Complete item management with transfer, filtering, search
- [x] Fertilizer system with composting
- [x] Mission system (daily/weekly)
- [x] Soulbound tokens (achievement badges)

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
