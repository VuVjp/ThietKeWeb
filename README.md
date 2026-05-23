# 🏨 Nhom8_ThietKeWeb – Hệ Thống Quản Lý Khách Sạn Cao Cấp (Grandeur Hotel)

[![Core Tech](https://img.shields.io/badge/Backend-ASP.NET%20Core%2010.0-blueviolet?style=for-the-badge&logo=.net)](https://dotnet.microsoft.com/)
[![Frontend Tech](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Build Tool](https://img.shields.io/badge/Build%20Tool-Vite-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Style System](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Database](https://img.shields.io/badge/Database-SQL%20Server%20%26%20Redis-red?style=for-the-badge&logo=microsoft-sql-server)](https://www.microsoft.com/sql-server)

Dự án **Nhóm 8 – Thiết Kế Web** là một giải pháp chuyển đổi số toàn diện dành cho khách sạn cao cấp. Hệ thống được thiết kế theo mô hình Single Page Application (SPA) hiện đại với giao diện mượt mà ở phía Frontend (React 19 + TypeScript + Vite) kết hợp cùng API Backend mạnh mẽ, an toàn và có khả năng mở rộng tốt (ASP.NET Core 10.0 + EF Core + SQL Server + Redis Cache).

Hệ thống hỗ trợ quản lý trọn vẹn vòng đời trải nghiệm khách hàng (từ đặt phòng trực tuyến thanh toán MoMo, đặt dịch vụ đi kèm, gửi feedback/review) kết hợp cùng cổng quản lý nội bộ chặt chẽ (quản lý buồng phòng, trạng thái dọn dẹp vệ sinh, kho thiết bị hao mòn, chiến dịch marketing voucher qua email, phân quyền RBAC đa cấp).

---

## 🛠️ Công Nghệ & Thư Viện Sử Dụng

### 🖥️ Backend (BE)
*   **Framework Core:** .NET 10.0 (ASP.NET Core Web API)
*   **Database ORM:** Entity Framework Core (SQL Server)
*   **Caching & Session:** Redis Cache (StackExchange.Redis) tối ưu tốc độ phản hồi và lưu trữ token
*   **Xác thực bảo mật:** JWT Bearer Token kết hợp cơ chế kiểm tra Token Version trong bộ nhớ tạm để thu hồi token ngay lập tức khi người dùng đổi mật khẩu hoặc đăng xuất.
*   **Đăng nhập bên thứ ba:** Google OAuth 2.0 (`Google.Apis.Auth`)
*   **Xử lý hình ảnh:** Cloudinary API (`CloudinaryDotNet`) hỗ trợ lưu trữ và tối ưu hóa hình ảnh tải lên.
*   **Hệ thống gửi Email:** MailKit (`MailKit`) hỗ trợ gửi email tự động xác nhận đặt phòng, hóa đơn và voucher sinh nhật.
*   **Thanh toán điện tử:** Tích hợp cổng thanh toán trực tuyến MoMo API (Momo Payment Gateway).
*   **Tài liệu hóa API:** Swagger / OpenAPI (`Swashbuckle.AspNetCore`) tương tác trực quan.
*   **Real-time Communication:** ASP.NET Core SignalR đồng bộ hóa thông báo theo thời gian thực.
*   **Bảo mật mật khẩu:** BCrypt (`BCrypt.Net-Next`) băm mật khẩu nâng cao.

### 🎨 Frontend (FE)
*   **Framework:** React 19 + TypeScript (Khởi chạy bằng Vite)
*   **Styling & UI:** Tailwind CSS v4 (Hệ thống thiết kế tiện ích thế hệ mới) phối hợp với Ant Design (Antd) đem lại giao diện chuyên nghiệp, nhất quán.
*   **State Management:** Zustand (Quản lý trạng thái nhẹ nhàng, hiệu năng cực cao)
*   **Data Fetching:** TanStack React Query v5 (Quản lý cache API, tự động làm tươi dữ liệu)
*   **Icons:** Lucide React & Ant Design Icons phong phú, trực quan
*   **Biểu đồ thống kê:** Recharts hỗ trợ biểu diễn dữ liệu tài chính, đặt phòng sinh động.
*   **Bản đồ địa điểm:** Leaflet & React Leaflet vẽ bản đồ khu du lịch xung quanh khách sạn.
*   **Soạn thảo văn bản:** Tiptap Rich Text Editor cấu hình bài viết và tin tức khách sạn chuyên nghiệp.
*   **Đồng bộ real-time:** `@microsoft/signalr` kết nối thông báo thời gian thực với backend.
*   **Tiện ích khác:** Axios (gửi HTTP requests), XLSX (xuất báo cáo Excel), React Hot Toast (thông báo popup mượt mà).

---

## ⚙️ Các Dịch Vụ Chạy Ngầm (Background Services / Cron Jobs)
Backend được trang bị nhiều dịch vụ chạy ngầm để đảm bảo hệ thống vận hành tự động liên tục:
1.  **BookingAutoCancelBackgroundService:** Tự động hủy các đơn đặt phòng quá hạn check-in mà khách hàng không đến nhận phòng (dựa theo cấu hình thời gian ân hạn trong `appsettings.json`).
2.  **AuditLogCleanupBackgroundService:** Tự động dọn dẹp các bản ghi Audit Log quá hạn để tối ưu không gian cơ sở dữ liệu.
3.  **BirthdayVoucherJob:** Hệ thống tự động quét và gửi mã giảm giá (Voucher) chúc mừng sinh nhật qua Email cho các khách hàng thành viên có ngày sinh trong ngày.
4.  **DashboardSnapshotBackgroundService:** Chụp nhanh và lưu trữ dữ liệu thống kê doanh thu, số lượng đơn phòng định kỳ để tối ưu hóa hiệu năng tải trang Dashboard của Admin.
5.  **ReviewEligibilityCleanupBackgroundService:** Dọn dẹp trạng thái và quản lý điều kiện khách hàng được quyền đánh giá phòng sau khi lưu trú.

---

## 📁 Cấu Trúc Dự Án

```text
Nhom8_ThietKeWeb/
├── BE/                           # BACKEND (ASP.NET CORE 10.0 Web API)
│   ├── Auth/                     # Cấu hình JWT, Phân quyền Permission & Custom Handlers
│   ├── Cache/                    # Xử lý Caching Redis & Quản lý Token Version
│   ├── Configurations/           # Các lớp mapping cấu hình từ AppSettings
│   ├── Controllers/              # Tầng Controllers xử lý các HTTP API endpoints
│   ├── Data/                     # AppDbContext và cấu hình Fluent API
│   ├── Dtos/                     # Data Transfer Objects cho Request & Response
│   ├── Entities/                 # 27 Entity Models đại diện cho DB Schema
│   ├── Enums/                    # Các tập hợp hằng số định danh (Role, Status,...)
│   ├── Exceptions/               # Custom Middleware xử lý lỗi tập trung (ExceptionMiddleware)
│   ├── Hubs/                     # SignalR Hub cho thông báo real-time
│   ├── Migrations/               # Lịch sử Migration của Entity Framework Core
│   ├── Repositories/             # Tầng lưu trữ & thao tác DB (Generic & Specific Repositories)
│   ├── Services/                 # Tầng Business Logic xử lý nghiệp vụ chính
│   ├── Properties/               # Cấu hình khởi chạy dự án (launchSettings.json)
│   ├── appsettings.json          # Tập tin cấu hình chính (Cơ sở dữ liệu, JWT, Momo, Mail,...)
│   ├── Program.cs                # Entry point cấu hình Service Container & Middleware Pipeline
│   └── BE.csproj                 # Khai báo các gói thư viện NuGet của Backend
│
├── FE/                           # FRONTEND (REACT 19 + TYPESCRIPT + VITE)
│   ├── public/                   # Thư mục chứa tài nguyên tĩnh công cộng
│   ├── src/
│   │   ├── api/                  # Khởi tạo Axios client và định nghĩa các hàm gọi API
│   │   ├── assets/               # Hình ảnh, biểu tượng cục bộ
│   │   ├── auth/                 # Xử lý ngữ cảnh xác thực, token và lưu trữ thông tin đăng nhập
│   │   ├── components/           # Các UI Components tái sử dụng (Bảng, Form, Modal, Editor,...)
│   │   ├── hooks/                # Custom React Hooks sử dụng chung
│   │   ├── layout/               # Bố cục giao diện (Client Layout, Admin Layout, Sidebar, Navbar)
│   │   ├── mock/                 # Dữ liệu giả định phục vụ kiểm thử
│   │   ├── modules/              # Các phần xử lý nghiệp vụ dùng chung
│   │   ├── pages/                # Các trang màn hình chính của ứng dụng
│   │   │   ├── admin/            # Các trang giao diện Quản trị viên & Nhân viên (23+ màn hình)
│   │   │   ├── client/           # Các trang giao diện dành cho Khách hàng (15+ màn hình)
│   │   │   ├── LoginPage.tsx     # Đăng nhập chung
│   │   │   └── RegisterPage.tsx  # Đăng ký chung
│   │   ├── routes/               # Cấu hình điều hướng phân cấp (Public, Protected Routes)
│   │   ├── types/                # Định nghĩa các TypeScript interfaces / types
│   │   ├── utils/                # Các hàm tiện ích (Định dạng ngày, tiền tệ, chuyển đổi,...)
│   │   ├── App.tsx               # Cấu hình Router chính
│   │   ├── index.css             # Tập tin cấu hình CSS & Tailwind CSS toàn cục
│   │   └── main.tsx              # Điểm khởi đầu của ứng dụng React
│   ├── package.json              # Khai báo thư viện NPM và Scripts
│   ├── vite.config.ts            # Cấu hình của công cụ Vite
│   └── vercel.json               # Cấu hình triển khai ứng dụng lên Vercel
```

---

## 🗃️ Thiết Kế Cơ Sở Dữ Liệu (27 Entity Models)

Cơ sở dữ liệu được tổ chức chặt chẽ thành 8 nhóm nghiệp vụ liên kết với nhau:

| Phân Nhóm | Các Entities liên quan | Mô tả nhiệm vụ |
| :--- | :--- | :--- |
| **Người Dùng & Xác Thực** | `User`, `Role`, `Permission`, `RolePermission`, `RefreshToken` | Quản lý tài khoản, làm mới Token, lưu trữ phân quyền RBAC động. |
| **Phòng & Tiện Nghi** | `Room`, `RoomType`, `RoomImage`, `RoomTypeAmenity`, `Amenity` | Định nghĩa phòng khách sạn, hạng phòng (Deluxe, Suite,...), hình ảnh, tiện nghi đi kèm. |
| **Đặt Phòng & Tài Chính** | `Booking`, `BookingDetail`, `Invoice`, `Payment` | Ghi nhận chi tiết đơn phòng, trạng thái thanh toán, hóa đơn xuất ra cho khách hàng. |
| **Dịch Vụ Khách Sạn** | `Service`, `ServiceCategory`, `OrderService`, `OrderServiceDetail` | Quản lý menu dịch vụ (Spa, Hồ bơi, Nhà hàng,...) và chi tiết đơn gọi dịch vụ của phòng. |
| **Hồ Sơ & Khách Hàng** | `Review`, `Membership` | Đánh giá xếp hạng phòng từ khách hàng, quản lý hạng thành viên tích lũy điểm (Silver, Gold, Platinum). |
| **Kho & Thiết Bị** | `RoomInventory`, `LossAndDamage`, `Equipment` | Quản lý danh mục thiết bị vật tư trang bị trong mỗi phòng (Tivi, Tủ lạnh, Khăn,...) và xử lý đền bù hư hỏng mất mát. |
| **Hệ Thống & Nhật Ký** | `AuditLog`, `Notification` | Ghi nhận lịch sử thao tác của nhân viên phục vụ tra cứu bảo mật, thông báo thời gian thực. |
| **Nội Dung & Truyền Thông** | `Article`, `ArticleCategory`, `Attraction` | Hệ quản trị nội dung CMS (Tin tức, ưu đãi của khách sạn) và các địa điểm tham quan du lịch lân cận. |

---

## 🔐 Phân Quyền Hệ Thống (RBAC - Role Based Access Control)

Hệ thống hoạt động trên mô hình phân quyền động chặt chẽ thông qua các chính sách bảo mật (Policy-based Authorization) kết hợp 4 vai trò chính:

1.  **Admin (Quản Trị Viên):** Toàn quyền kiểm soát hệ thống, thiết lập phân quyền, cấu hình hệ thống, xem báo cáo doanh thu tối cao.
2.  **Receptionist (Lễ Tân):** Vận hành trạng thái phòng (Check-in/Check-out), quản lý nội dung bài viết tin tức (CMS), quản lý kho thiết bị vật tư, xử lý đặt phòng trực tiếp.
3.  **Housekeeping (Buồng Phòng):** Cập nhật trạng thái vệ sinh phòng thực tế, cập nhật kho thiết bị vật tư phòng khi dọn dẹp hoặc phát hiện hư hỏng.
4.  **Guest (Khách Hàng):** Khách du lịch sử dụng ứng dụng để tìm kiếm, đặt phòng trực tuyến, thanh toán, quản lý tài khoản cá nhân, xem điểm tích lũy thành viên.

### 📝 Chi Tiết Bản Đồ Quyền Hạn (Permission Matrix)

Hệ thống cung cấp hệ thống 24 permissions lõi được phân bổ động cho các Roles nội bộ:

| Nhóm Nghiệp Vụ | Tên Quyền Hạn | Quyền Admin | Quyền Lễ Tân (Receptionist) | Quyền Buồng Phòng (Housekeeping) |
| :--- | :--- | :---: | :---: | :---: |
| **Quản Lý Phòng** | `get_all_rooms` `create_room` `update_room``delete_room` | 
| **Vận Hành Phòng** | `change_room_status``change_room_cleaning_status` | 
| **Loại Phòng & Tiện Nghi** | `manage_room_type``create_amenity``update_amenity``delete_amenity` |
| **Kho Vật Tư Thiết Bị** | `get_all_room_inventory``create_room_inventory``update_room_inventory``delete_room_inventory` |
| **Quản Trị Nội Dung CMS** | `create_article``update_article``delete_article``update_thumbnail``create_article_category``update_article_category``delete_article_category` | 
| **Khu Vực & Địa Điểm** | `manage_attraction` |
| **Người Dùng & Vai Trò** | `manage_user``manage_role``assign_role` |

---

## 🔎 Bản Đồ Danh Sách API Endpoints Lõi

### 1️⃣ Xác Thực & Người Dùng (`/api/auth` & `/api/userProfile`)
*   `POST /api/auth/register` (Public) - Đăng ký tài khoản khách hàng mới.
*   `POST /api/auth/login` (Public) - Đăng nhập nhận Access Token & Refresh Token.
*   `POST /api/auth/google-login` (Public) - Đăng nhập nhanh thông qua tài khoản Google.
*   `POST /api/auth/refresh-token` (Public) - Cấp lại Access Token mới bằng Refresh Token hợp lệ.
*   `POST /api/auth/logout` (JWT Required) - Đăng xuất và vô hiệu hóa Token phiên hiện tại.
*   `GET /api/userProfile/my-profile` (JWT Required) - Lấy thông tin cá nhân hiện tại.
*   `PUT /api/userProfile/update-profile` (JWT Required) - Cập nhật thông tin tài khoản.
*   `PUT /api/userProfile/change-password` (JWT Required) - Thay đổi mật khẩu cá nhân.
*   `POST /api/userProfile/upload-avatar` (JWT Required) - Tải lên ảnh đại diện cá nhân (Lưu Cloudinary).

### 2️⃣ Quản Trị Hệ Thống (`/api/userManagement` & `/api/roles`)
*   `GET /api/userManagement` (`manage_user`) - Danh sách tất cả tài khoản trong hệ thống.
*   `PUT /api/userManagement/{userId}/change-role` (`manage_user`) - Thay đổi phân vai trò người dùng.
*   `POST /api/roles/assign-permission` (`manage_role`) - Thiết lập danh sách quyền hạn động cho vai trò.
*   `GET /api/roles/my-permissions` (JWT Required) - Lấy danh sách quyền hạn thực tế của phiên đăng nhập hiện tại.

### 3️⃣ Quản Lý Phòng & Loại Phòng (`/api/rooms` & `/api/roomTypes`)
*   `GET /api/rooms` (Public) - Tìm kiếm và lọc danh sách phòng trống.
*   `POST /api/rooms` (`create_room`) - Thêm mới phòng vào hệ thống vận hành.
*   `PATCH /api/rooms/{id}/status` (`change_room_status`) - Cập nhật trạng thái phòng (Trống, Đang có khách, Bảo trì,...).
*   `PATCH /api/rooms/{id}/cleaning-status` (`change_room_cleaning_status`) - Cập nhật trạng thái vệ sinh phòng (Sạch sẽ, Đang dọn, Chưa dọn).
*   `POST /api/roomTypes` (`manage_room_type`) - Tạo mới hạng phòng (Cấu hình giá phòng, số khách tối đa, diện tích).
*   `POST /api/roomTypes/{id}/images` (`manage_room_type`) - Tải lên chùm ảnh thực tế cho hạng phòng.

### 4️⃣ Kho Thiết Bị & Đền Bù (`/api/roomInventories`)
*   `GET /api/roomInventories` (`get_all_room_inventory`) - Danh sách kiểm kê vật tư thiết bị trong khách sạn.
*   `POST /api/roomInventories` (`create_room_inventory`) - Trang bị thêm vật tư cho một phòng cụ thể.
*   `POST /api/roomInventories/clone/{idClone}/to/{newRoomId}` (`create_room_inventory`) - Nhân bản nhanh danh sách vật tư mẫu sang phòng mới để tiết kiệm thời gian cấu hình.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Dự Án

### 📋 Yêu Cầu Hệ Thống Trước Khi Cài Đặt
*   [Node.js](https://nodejs.org/) (Phiên bản khuyến nghị LTS 20+)
*   [.NET SDK 10.0](https://dotnet.microsoft.com/download/dotnet/10.0)
*   [Microsoft SQL Server](https://www.microsoft.com/sql-server)
*   [Redis Server](https://redis.io/download/) (Chạy local trên cổng mặc định `6379` hoặc sử dụng Redis Cloud)

---

### 🖥️ Các Bước Khởi Chạy Backend (ASP.NET Core)

1.  **Di chuyển vào thư mục Backend:**
    ```bash
    cd BE
    ```

2.  **Cấu hình tệp cấu hình môi trường:**
    *   Sao chép tệp `appsettings.json.example` thành tệp `appsettings.json` mới:
        ```bash
        cp appsettings.json.example appsettings.json
        ```
    *   Mở tệp `appsettings.json` vừa tạo và cập nhật các thông số cấu hình quan trọng sau:
        *   `ConnectionStrings:DefaultConnection`: Chuỗi kết nối tới SQL Server của bạn.
        *   `ConnectionStrings:Redis`: Địa chỉ Redis server (mặc định `localhost:6379`).
        *   `Jwt:Key`: Khóa bí mật JWT (một chuỗi ngẫu nhiên dài hơn 32 ký tự).
        *   `CloudinarySettings`: Thông tin API từ tài khoản Cloudinary của bạn để lưu trữ ảnh phòng và avatar.
        *   `EmailSettings`: Cấu hình tài khoản SMTP (như Gmail App Password) để hệ thống gửi thư hóa đơn/voucher tự động.
        *   `Momo`: Cấu hình tích hợp ví điện tử MoMo nếu bạn muốn kiểm thử thanh toán trực tuyến.

3.  **Khôi phục các gói thư viện NuGet:**
    ```bash
    dotnet restore
    ```

4.  **Khởi tạo cơ sở dữ liệu và nạp Migrations:**
    ```bash
    dotnet ef database update
    ```
    *(Lưu ý: Cần cài đặt công cụ dotnet-ef toàn cục trước nếu chưa có: `dotnet tool install --global dotnet-ef`)*

5.  **Khởi chạy API Server:**
    ```bash
    dotnet run
    ```
    Sau khi chạy thành công, API Server sẽ lắng nghe tại địa chỉ mặc định: `http://localhost:5082`.
    *   Bạn có thể truy cập tài liệu API Swagger tại: `http://localhost:5082/swagger` hoặc `https://localhost:5082/swagger` để kiểm tra kết nối.

---

### 🎨 Các Bước Khởi Chạy Frontend (React + Vite)

1.  **Di chuyển vào thư mục Frontend:**
    ```bash
    cd ../FE
    ```

2.  **Cấu hình tệp môi trường:**
    *   Sao chép tệp `.env.example` thành tệp `.env` mới:
        ```bash
        cp .env.example .env
        ```
    *   Cập nhật cấu hình tệp `.env` phù hợp:
        ```env
        VITE_API_BASE_URL=http://localhost:5082/api
        VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_OAUTH_CLIENT_ID
        ```

3.  **Cài đặt các gói thư viện Node.js:**
    ```bash
    npm install
    ```

4.  **Khởi chạy máy chủ phát triển (Development Server):**
    ```bash
    npm run dev
    ```
    Máy chủ phát triển sẽ khởi động cực nhanh nhờ Vite và chạy tại địa chỉ: `http://localhost:5173`.
    *   Mở trình duyệt truy cập địa chỉ trên để trải nghiệm ứng dụng Web Quản Lý Khách Sạn!

5.  **Biên dịch dự án phục vụ triển khai (Production Build):**
    ```bash
    npm run build
    ```
    Bản build tối ưu hóa sẽ được tạo ra trong thư mục `dist`, sẵn sàng triển khai lên Vercel, Netlify hoặc Docker.

---

## 👥 Thành Viên Thực Hiện Dự Án (Nhóm 8)

Dự án được hoàn thành bởi sự nỗ lực và đóng góp của các thành viên lớp Thiết kế Web - Nhóm 8:

| STT | Họ & Tên | Vai Trò Chính | Nhiệm Vụ Đảm Nhận |
| :---: | :--- | :--- | :--- |
| 1 | **Nguyễn Hoàng Nguyên Vũ** | Team Leader & Fullstack Developer | Cấu trúc kiến trúc hệ thống, cài đặt hạ tầng BE (.NET Core 10), thiết lập DB Context, tích hợp ví thanh toán Momo, cấu hình JWT + Redis, đồng bộ SignalR và phát triển các trang Dashboard quản trị chính. |
| 2 | **Phạm Minh Tình** | Frontend Developer & UI Designer | Thiết kế giao diện UI/UX khách sạn, tối ưu hóa Tailwind CSS v4, xây dựng giao diện đặt phòng (Client Booking flow), tích hợp bản đồ khu du lịch lân cận, xây dựng trang hồ sơ khách hàng. |
| 3 | **Ngô Quang Vinh** | Backend Developer | Phát triển các phân hệ quản lý CMS (bài viết, tin tức, danh mục), xây dựng nghiệp vụ danh mục thiết bị vật tư, xử lý hệ thống đền bù hư hỏng (LossAndDamage), thiết lập AuditLog ghi vết hệ thống. |
| 4 | **Lù Vĩnh Văn** | Frontend Developer & Tester | Phát triển phân hệ Quản lý buồng phòng dọn dẹp vệ sinh (Housekeeping), xây dựng các form khai báo vật tư thiết bị phòng, viết tài liệu kiểm thử hộp đen và kiểm tra luồng nghiệp vụ. |

---
*Cảm ơn bạn đã quan tâm đến dự án **Hệ Thống Quản Lý Khách Sạn Grandeur Hotel** của chúng tôi! Mọi đóng góp hoặc thắc mắc xin vui lòng gửi email hoặc tạo Issue trực tiếp trên kho lưu trữ Git.*
