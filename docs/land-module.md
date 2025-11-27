## Land Module Blueprint

### 1. Domain Goals
- Mỗi wallet chỉ có **1 khu đất** mặc định (mở rộng thêm nhiều ô sau).
- Chu trình: nhận đất → gieo hạt → hoàn thành task sự kiện → nở hoa → ra quả → claim bounty.
- Backend đóng vai trò đồng bộ off-chain (Supabase) với dữ liệu on-chain và trả về profile farm.

### 2. Data Structures (Supabase)
#### `lands`
| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid (pk) | |
| `wallet_address` | text (unique) | địa chỉ ví Base |
| `plot_index` | int | hỗ trợ multi-plot sau này |
| `soil_quality` | jsonb | `{ fertility: number, hydration: number }` |
| `seed_type` | text | loại hạt được giao |
| `growth_stage` | text | enum: `empty` → `seeded` → `sprout` → `bloom` → `fruit` → `harvested` |
| `growth_points` | int | điểm tiến trình dựa trên nhiệm vụ |
| `task_status` | jsonb | lưu trạng thái từng nhiệm vụ |
| `planted_at` | timestamptz | |
| `last_progress_at` | timestamptz | lần cập nhật gần nhất |
| `ready_at` | timestamptz | khi đạt `fruit` |
| `bounty_claimed_at` | timestamptz | |
| `metadata` | jsonb | thông tin bổ sung (season, eventId, art, ...) |
| `created_at` / `updated_at` | timestamptz | trigger cập nhật tự động |

#### `land_tasks`
| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid (pk) | |
| `wallet_address` | text | |
| `task_code` | text | ví dụ `daily_checkin`, `booth_visit`, `social_share` |
| `progress` | int | số lần hoàn thành |
| `target` | int | số lần cần đạt |
| `status` | text | `locked` → `in_progress` → `completed` → `rewarded` |
| `last_completed_at` | timestamptz | |

### 3. State Machine
```
empty ──assignSeed──▶ seeded
seeded ──task milestone 1──▶ sprout
sprout ──task milestone 2──▶ bloom
bloom ──task milestone 3──▶ fruit
fruit ──claim bounty──▶ harvested (đồng thời reset/chuẩn bị season mới)
```

- Mỗi milestone ánh xạ đến nhóm nhiệm vụ:  
  - **Milestone 1 (Sprout)**: điểm danh hàng ngày hoàn thành lần đầu.  
  - **Milestone 2 (Bloom)**: nhiệm vụ tương tác (đi booth, check QR...).  
  - **Milestone 3 (Fruit)**: nhiệm vụ nâng cao (đăng bài, invite bạn...).  
- `growth_points` = tổng điểm nhiệm vụ; mỗi stage yêu cầu ngưỡng khác, ví dụ `[0, 100, 250, 400]`.

### 4. Service Responsibilities
1. **LandService**
   - `getOrCreateLand(wallet)` → tạo bản ghi `empty`.
   - `assignSeed(wallet, seedType)` → set seed, stage `seeded`.
   - `recordTaskProgress(wallet, taskCode, delta)` → cập nhật `land_tasks`, tính `growth_points`, trigger stage up.
   - `claimBounty(wallet)` → xác nhận stage `fruit`, set `bounty_claimed_at`, phát sự kiện cho on-chain claim.
   - `resetSeason(wallet, seasonId)` → đưa về `empty`.

2. **TaskProgressService**
   - Khởi tạo danh sách task theo mùa.
   - Xử lý logic daily reset (điểm danh mở sau 24h).
   - Tổng hợp tiến trình để hiển thị UI.

### 5. API Surfaces (REST)
| Method | Path | Description |
| --- | --- | --- |
| `GET /land/:wallet` | trả về tổng quan đất + task progress |
| `POST /land/assign-seed` | body `{ wallet, seedType }` |
| `POST /land/task-progress` | body `{ wallet, taskCode, delta }` |
| `POST /land/claim-bounty` | body `{ wallet }` |
| `POST /land/reset` | body `{ wallet, seasonId }` (admin) |

Tất cả endpoint sẽ thông qua chữ ký on-chain (message + signature) để chắc chắn user hợp lệ. Tạm thời mock bằng header `x-wallet-address`.

### 6. Testing Strategy
- Unit: mock Supabase client để test LandService state machine, đặc biệt stage transition.
- Integration: e2e Nest Testing Module + in-memory Supabase (hoặc WireMock) để chạy flow: `assignSeed → progress → claim`.
***
### Next Step Proposal
1. Scaffold `SupabaseModule` + `LandModule`, định nghĩa DTO/enums.  
2. Implement `GET /land/:wallet` + `POST /land/assign-seed` với Supabase repository.  
3. Viết unit test cho `LandService` (mock Supabase).  
4. Mở rộng task progress logic.

