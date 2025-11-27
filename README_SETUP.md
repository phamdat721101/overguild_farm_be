# 🌱 OverGuild Backend - Setup Guide

## ✅ Current Status

### Schema Design (Land + Plant separated)
```
User (new signup)
  └─ Land (plot 0, soil: 50/50)
      └─ Plant (type: SOCIAL, stage: SEED)
```

### Features Implemented
- ✅ Metamask wallet authentication (challenge-response)
- ✅ JWT-based authorization
- ✅ User profile management (network, avatar, username)
- ✅ Auto-create 1 Land + 1 Plant for new users
- ✅ Swagger API documentation at `/api`

---

## 🚀 Next Steps

### 1. Run SQL Migration
Open Supabase SQL Editor and run:
```bash
SETUP_LAND_PLANT.sql
```

### 2. Test the Flow
```bash
node test-land-plant.js
```

Expected result:
```json
{
  "user": {
    "landsCount": 1,
    "plantsCount": 1
  },
  "isNewUser": true
}
```

### 3. View API Docs
Server running at: http://localhost:3000
Swagger UI: http://localhost:3000/api

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/challenge` | Get nonce for wallet signature |
| POST | `/auth/login` | Login with wallet signature |
| GET | `/user/profile` | Get current user profile (JWT required) |
| PATCH | `/user/profile` | Update user profile (JWT required) |
| GET | `/user/qr` | Get QR code data (JWT required) |

---

## 🔮 Future Implementation

### Phase 1: Core Gameplay
- [ ] `POST /game/plant` - Plant a seed on land
- [ ] `POST /game/water/:plantId` - Water a plant (social interaction)
- [ ] `POST /game/harvest/:plantId` - Harvest fruit from plant
- [ ] `GET /garden` - View all user's lands and plants

### Phase 2: Economy & Inventory
- [ ] Inventory system (seeds, water, fertilizer)
- [ ] Mission system (daily/weekly tasks)
- [ ] Composting (burn fruit → fertilizer)

### Phase 3: Advanced Features
- [ ] 72h Wilt Mechanism (cron job)
- [ ] Location-based events (GPS check-in)
- [ ] Soulbound tokens (on-chain CV)
- [ ] Land expansion (buy more plots)

---

## 🛠️ Tech Stack
- **Framework**: NestJS
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Auth**: JWT + Ethers.js (wallet signature)
- **Docs**: Swagger/OpenAPI
