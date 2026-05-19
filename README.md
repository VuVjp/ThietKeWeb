# Nhom8_ThietKeWeb – Hệ thống Quản lý Khách sạn

Dự án **Nhóm 8 – Thiết Kế Web**: Xây dựng hệ thống quản lý khách sạn toàn diện với backend ASP.NET Core và frontend React + TypeScript.

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | ASP.NET Core 10.0 |
| ORM | Entity Framework Core (SQL Server) |
| Xác thực | JWT Bearer Token + Google OAuth |
| Frontend | React 19 + TypeScript + Vite |
| Tài liệu API | Swagger / OpenAPI |

---

## 📁 Cấu trúc dự án

```text
Nhom8_ThietKeWeb/
├── BE/                  # Backend ASP.NET Core
│   ├── Auth/            # Xác thực & Phân quyền
│   ├── Controllers/     # API Controllers
│   ├── Data/            # Database Context
│   ├── Dtos/            # Data Transfer Objects
│   ├── Entities/        # Entity Models
│   ├── Migrations/      # EF Core Migrations
│   ├── Repositories/    # Tầng truy cập dữ liệu
│   ├── Services/        # Business Logic
│   └── Program.cs       # Cấu hình ứng dụng
└── FE/                  # Frontend React + TypeScript + Vite
    └── src/
```

---

## ✅ Các chức năng đã thực hiện

### 1) Xác thực & Phân quyền (`/api/auth`)
- Đăng ký / Đăng nhập (JWT + Refresh Token)
- Đăng nhập Google OAuth
- Làm mới token / Đăng xuất
- **Phân quyền theo vai trò (RBAC)**: kiểm soát truy cập theo **Role** và **Permission**

### 2) Các module nghiệp vụ chính
- Hồ sơ người dùng (`/api/userProfile`)
- Quản lý người dùng (`/api/userManagement`)
- Quản lý phòng (`/api/rooms`)
- Quản lý loại phòng (`/api/roomTypes`)
- Quản lý tiện nghi (`/api/amenities`)
- Quản lý kho thiết bị phòng (`/api/roomInventories`)
- Quản lý bài viết/blog (`/api/articles`)
- Quản lý danh mục bài viết (`/api/articleCategories`)
- Quản lý địa điểm tham quan (`/api/attractions`)
- Quản lý vai trò & quyền hạn (`/api/roles`)

---

## 🔐 RBAC: Role & Permission

Hệ thống dùng **4 vai trò chính**:
- **Admin**: toàn quyền hệ thống
- **Receptionist**: lễ tân – vận hành phòng + quản lý nội dung (CMS) + quản lý kho thiết bị
- **Housekeeping**: buồng phòng – cập nhật trạng thái vệ sinh + cập nhật kho thiết bị
- **Guest**: khách hàng bên ngoài – **không có quyền nội bộ** (các quyền dành cho khách hàng sẽ được tách riêng theo nhu cầu)

### Danh sách Permission (24 quyền)

| Nhóm | Quyền |
|---|---|
| Bài viết | `create_article`, `update_article`, `delete_article`, `update_thumbnail` |
| Danh mục bài viết | `create_article_category`, `update_article_category`, `delete_article_category` |
| Phòng | `get_all_rooms`, `create_room`, `update_room`, `delete_room` |
| Trạng thái phòng | `change_room_status`, `change_room_cleaning_status` |
| Loại phòng | `manage_room_type` |
| Kho thiết bị | `get_all_room_inventory`, `create_room_inventory`, `update_room_inventory`, `delete_room_inventory` |
| Tiện nghi | `create_amenity`, `update_amenity`, `delete_amenity` |
| Địa điểm tham quan | `manage_attraction` |
| Người dùng & Vai trò | `manage_user`, `manage_role`, `assign_role` |

---

## 🧩 Permission được gắn cho Role nào?

> Mapping dưới đây là cấu hình RBAC đã chốt:
- Receptionist **chỉ cập nhật trạng thái phòng** (không tạo/sửa/xóa phòng)
- Housekeeping **có xem kho** và **chỉ update kho** (không create/delete kho)
- Guest là khách hàng bên ngoài ⇒ **không gán permission nội bộ**

### 1) Admin
**Có tất cả quyền** (full permissions):
- Toàn bộ 24 permission ở danh sách trên.

### 2) Receptionist (Lễ tân)
**Phòng & trạng thái phòng**
- `get_all_rooms`
- `change_room_status`
- `change_room_cleaning_status`

**Kho thiết bị phòng (inventory)**
- `get_all_room_inventory`
- `create_room_inventory`
- `update_room_inventory`
- `delete_room_inventory`

**Bài viết / CMS**
- `create_article`
- `update_article`
- `delete_article`
- `update_thumbnail`
- `create_article_category`
- `update_article_category`
- `delete_article_category`

### 3) Housekeeping (Buồng phòng)
**Phòng & vệ sinh**
- `get_all_rooms`
- `change_room_cleaning_status`

**Kho thiết bị phòng**
- `get_all_room_inventory`
- `update_room_inventory`

### 4) Guest (Khách hàng)
- **Không gán permission nội bộ** trong danh sách 24 quyền hiện tại.

---

# 🔎 API Endpoints & Quyền cần có (Permission Matrix)

## 1) Auth (`/api/auth`) – Không yêu cầu permission
| Method | Endpoint | Yêu cầu |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/google-login` | Public |
| POST | `/api/auth/refresh-token` | Public |
| POST | `/api/auth/logout` | Public |

## 2) User Profile (`/api/userProfile`)
| Method | Endpoint | Yêu cầu |
|---|---|---|
| GET | `/api/userProfile/my-profile` | **JWT** (`[Authorize]`) |
| PUT | `/api/userProfile/update-profile` |  **JWT** (`[Authorize]`) |
| PUT | `/api/userProfile/change-password` | **JWT** (`[Authorize]`) |
| POST | `/api/userProfile/upload-avatar` |  **JWT** (`[Authorize]`) |


## 3) User Management (`/api/userManagement`) – `manage_user`
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/userManagement` | `manage_user` |
| POST | `/api/userManagement` | `manage_user` |
| PUT | `/api/userManagement/{userId}` | `manage_user` |
| PUT | `/api/userManagement/{userId}/change-role` | `manage_user` |
| DELETE | `/api/userManagement/{userId}` | `manage_user` |

## 4) Roles (`/api/roles`)
| Method | Endpoint | Permission |
|---|---|---|
| POST | `/api/roles/assign-permission` | `manage_role` (và có `[Authorize]`) |
| GET | `/api/roles/my-permissions` | `[Authorize]` |

## 5) Rooms (`/api/rooms`)
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/rooms` | Public (không gắn permission) |
| GET | `/api/rooms/{id}` | Public (không gắn permission) |
| POST | `/api/rooms` | `create_room` |
| PUT | `/api/rooms/{id}` | `update_room` |
| DELETE | `/api/rooms/{id}` | `delete_room` |
| PATCH | `/api/rooms/{id}/status` | `change_room_status` |
| PATCH | `/api/rooms/{id}/cleaning-status` | `change_room_cleaning_status` |

## 6) Room Inventories (`/api/roomInventories`)
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/roomInventories` | `get_all_room_inventory` |
| GET | `/api/roomInventories/room/{roomId}` | Public (không gắn permission) |
| GET | `/api/roomInventories/{id}` | Public (không gắn permission) |
| POST | `/api/roomInventories` | `create_room_inventory` |
| PUT | `/api/roomInventories/{id}` | `update_room_inventory` |
| DELETE | `/api/roomInventories/{id}` | `delete_room_inventory` |
| POST | `/api/roomInventories/clone/{idClone}/to/{newRoomId}` | `create_room_inventory` |

## 7) Room Types (`/api/roomTypes`) – `manage_room_type`
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/roomTypes` | Public |
| GET | `/api/roomTypes/{id}` | Public |
| POST | `/api/roomTypes` | `manage_room_type` |
| PUT | `/api/roomTypes/{id}` | `manage_room_type` |
| DELETE | `/api/roomTypes/{id}` | `manage_room_type` |
| POST | `/api/roomTypes/{id}/images` | `manage_room_type` |
| DELETE | `/api/roomTypes/images/{imageId}` | `manage_room_type` |
| PATCH | `/api/roomTypes/{roomTypeId}/images/{imageId}/set-primary` | `manage_room_type` |

## 8) Amenities (`/api/amenities`)
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/amenities` | Public |
| GET | `/api/amenities/{id}` | Public |
| POST | `/api/amenities` | `create_amenity` |
| PUT | `/api/amenities/{id}` | `update_amenity` |
| DELETE | `/api/amenities/{id}` | `delete_amenity` |

## 9) Articles (`/api/articles`)
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/articles` | Public |
| GET | `/api/articles/{id}` | Public |
| POST | `/api/articles` | `create_article` |
| PUT | `/api/articles/{id}` | `update_article` |
| DELETE | `/api/articles/{id}` | `delete_article` |
| POST | `/api/articles/{id}/thumbnail` | `update_thumbnail` |

## 10) Article Categories (`/api/articleCategories`)
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/articleCategories` | Public |
| GET | `/api/articleCategories/{id}` | Public |
| POST | `/api/articleCategories` | `create_article_category` |
| PUT | `/api/articleCategories/{id}` | `update_article_category` |
| DELETE | `/api/articleCategories/{id}` | `delete_article_category` |

## 11) Attractions (`/api/attractions`)
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/attractions` | Public |
| GET | `/api/attractions/{id}` | Public |
| POST | `/api/attractions` | `manage_attraction` |
| PUT | `/api/attractions/{id}` | `manage_attraction` |
| DELETE | `/api/attractions/{id}` | `manage_attraction` |

---

## 🗃️ Cơ sở dữ liệu – 27 Entity Models

| Nhóm | Entities |
|---|---|
| Người dùng & Xác thực | `User`, `Role`, `Permission`, `RolePermission`, `RefreshToken` |
| Phòng & Loại phòng | `Room`, `RoomType`, `RoomImage`, `RoomTypeAmenity`, `Amenity` |
| Đặt phòng & Thanh toán | `Booking`, `BookingDetail`, `Invoice`, `Payment` |
| Dịch vụ | `Service`, `ServiceCategory`, `OrderService`, `OrderServiceDetail` |
| Trải nghiệm khách | `Review`, `Membership` |
| Kho & Bảo trì | `RoomInventory`, `LossAndDamage`, `AuditLog` |
| Nội dung | `Article`, `ArticleCategory` |
| Địa điểm | `Attraction` |

---

## 💾 Dữ liệu khởi tạo (Seed Data)

Hệ thống được khởi tạo sẵn với các dữ liệu cơ bản sau:

### 1) Hạng thành viên (Memberships)
| ID | Tên hạng | Điểm tối thiểu | Giảm giá |
|---|---|---|---|
| 1 | **Bronze** | 0 | 5.00% |
| 2 | **Silver** | 1000 | 10.00% |
| 3 | **Gold** | 5000 | 15.00% |
| 4 | **Platinum** | 10000 | 20.00% |

### 2) Vai trò (Roles)
Hệ thống bao gồm **8 vai trò chính**:
1. **Admin**: Quản trị viên hệ thống (System administrator)
2. **Manager**: Quản lý vận hành (Operations manager)
3. **Receptionist**: Nhân viên lễ tân (Front desk staff)
4. **Accountant**: Nhân viên kế toán (Accounting staff)
5. **Housekeeping**: Nhân viên buồng phòng (Housekeeping staff)
6. **Guest**: Khách hàng (Customer / guest)
7. **Maintenance**: Nhân viên bảo trì (Maintenance technician)
8. **Security**: Nhân viên bảo vệ (Security staff)

### 3) Quyền hạn (Permissions)
Bao gồm **21 quyền** hệ thống:
- **Hệ thống & Người dùng**: `VIEW_DASHBOARD`, `MANAGE_USERS`, `MANAGE_ROLES`, `VIEW_REPORTS`, `VIEW_FULL_AUDIT_LOGS`
- **Quản lý Phòng**: `MANAGE_ROOMS`, `MANAGE_ROOM_TYPES`, `MANAGE_AMENITY`, `UPDATE_CLEANING`
- **Quản lý Đặt phòng & Dịch vụ**: `MANAGE_BOOKINGS`, `MANAGE_SERVICES`, `MANAGE_INVOICE`, `MANAGE_VOUCHERS`
- **Kho & Thiết bị**: `MANAGE_INVENTORY`, `MANAGE_EQUIPMENTS`, `MANAGE_ROOM_INVENTORY`, `APPROVE_LOSS`
- **Nội dung & Khách hàng**: `MANAGE_ATTRACTIONS`, `MANAGE_ARTICLES`, `MANAGE_ARTICLE_CATEGORY`, `MANAGE_REVIEWS`

---

## ⚙️ Cấu hình Môi trường (Environment Setup)

Trước khi khởi chạy dự án, bạn cần thiết lập cấu hình môi trường cho cả Backend và Frontend:

### 1) Backend (`BE`)
Tạo file `BE/appsettings.json` (có thể sao chép từ `appsettings.json.example`) và cập nhật các thông tin:
- **ConnectionStrings**: Chuỗi kết nối đến cơ sở dữ liệu SQL Server.
- **Jwt**: `Key`, `Issuer`, `Audience` để tạo và xác thực Token.
- **CloudinarySettings**: Thông tin Cloudinary (`CloudName`, `ApiKey`, `ApiSecret`) dùng để lưu trữ hình ảnh.
- **EmailSettings**: Thông tin SMTP để gửi email (ví dụ: email xác nhận đặt phòng).
- **Momo**: Các khóa tích hợp cổng thanh toán MoMo (`PartnerCode`, `AccessKey`, `SecretKey`).

### 2) Frontend (`FE`)
Tạo file `FE/.env` (sao chép từ `FE/.env.example`) và thiết lập:
- `VITE_API_BASE_URL`: Địa chỉ API Backend (mặc định thường là `http://localhost:5082/api`).
- `VITE_GOOGLE_CLIENT_ID`: ID Client từ Google Cloud Console để thực hiện chức năng Đăng nhập bằng Google (Google OAuth).

---

## 🚀 Hướng dẫn chạy dự án
### Backend

```bash
cd BE
dotnet restore
dotnet ef database update
dotnet run
```

API Swagger: `https://localhost:<port>/swagger`

### Frontend

```bash
cd FE
npm install
npm run dev
```

---

## 👥 Thành viên nhóm 8
- Nguyễn Hoàng Nguyên Vũ 
- Phạm Minh Tình
- Ngô Quang Vinh
- Lù Vĩnh Văn
