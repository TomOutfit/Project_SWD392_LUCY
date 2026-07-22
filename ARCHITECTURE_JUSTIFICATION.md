# BÁO CÁO PHÂN TÍCH VÀ THIẾT KẾ KIẾN TRÚC PHẦN MỀM (SOFTWARE ARCHITECTURE & DESIGN REPORT)
## Dự án: LUCY — Gamified Social Audio & Language Learning Platform
**Môn học**: SWD392 - Software Architecture and Design

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG (HIGH-LEVEL ARCHITECTURE)

Dự án **LUCY** ứng dụng kết hợp 2 phong cách kiến trúc hiện đại bậc nhất trong phát triển phần mềm:
1. **Kiến trúc Microservices đa ngôn ngữ (Polyglot Microservices Architecture)**.
2. **Kiến trúc Xử lý Thời gian thực hai kênh (Dual-Channel Real-Time Architecture)**.

```mermaid
graph TD
    Client[React 18 + Vite Client SPA] -->|Port 80/443| Gateway[Nginx Reverse Proxy & API Gateway]
    
    subgraph "Microservices Cluster"
        Gateway -->|/api/v1/*, /api/auth, /api/wallet, /api/xp| NET[.NET 9 Financial & Auth Microservice\n- Financial Ledger & Transactions\n- Auth JWT & User Profiles\n- XP & Leveling Engine]
        Gateway -->|/api/rooms, /api/podcasts, /socket.io/*| NJS[Node.js Real-time Audio & Content Microservice\n- Real-time Socket.IO Engine\n- Agora RTC Signaling & Observer\n- Audio File Upload & Streaming]
    end

    subgraph "Real-Time Media Infrastructure"
        Client <-->|WebRTC Full-Duplex Audio Stream| Agora[Agora RTC Cloud SFU Server]
        Client <-->|WebSocket Dual-Way Low Latency Signals| NJS
    end
    
    NET -->|EF Core / ACID| DB1[(SQLite / SQL Server\nnet_service.db)]
    NJS -->|Drizzle ORM| DB2[(SQLite / Drizzle\nlucy.db)]
    NJS <-->|Inter-Service REST & Async Queue| NET
```

---

## 2. PHÂN TÍCH CHI TIẾT THEO CÁC PHONG CÁCH KIẾN TRÚC CHÍNH

### 2.1. Kiến trúc Microservices (Microservices Architecture)

#### A. Cấu trúc các Microservices:
- **`net-service` (C# .NET 9 Microservice)**:
  - **Đảm nhận**: Quản lý Ví tiền, Nhật ký sổ kép (Ledger Transactions), Đổi quà (Gifts), Tích điểm XP, Mã hóa JWT Authentication.
  - **Lý do chọn .NET 9**: C# có tính đóng gói cao (Strongly Typed), Entity Framework Core hỗ trợ Transaction ACID nghiêm ngặt, thực thi thuật toán LINQ cực nhanh, bảo mật tuyệt đối cho dữ liệu tài chính.
- **`njs-service` (Node.js/TypeScript Microservice)**:
  - **Đảm nhận**: Quản lý các phòng học Live, Socket.IO Signaling Server, Khóa học 100 Level, Upload & Stream bài giảng Podcast, AI Speech Analytics.
  - **Lý do chọn Node.js**: Mô hình phi đồng bộ Single-Threaded Event Loop cho phép giữ hàng chục ngàn kết nối Socket.IO mở song song với lượng RAM rất nhỏ (<100MB).
- **`frontend` (React 18 SPA Microservice)**:
  - **Đảm nhận**: Giao diện người dùng thời gian thực, quản lý state tập trung via Zustand, tích hợp WebAudio API cho hiệu ứng âm thanh và sóng nhạc Visualizer.

#### B. Cơ chế Truyền thông giữa các Microservices (Inter-Service Communication):
1. **Synchronous Inter-Service REST API**: Node.js gọi trực tiếp sang .NET qua API `/api/xp/user/:id` để lấy điểm XP chính thức của người dùng.
2. **Asynchronous Retry Queue (Hàng chờ gởi lại bất đồng bộ)**: Khi ghi nhận XP từ phòng học sang .NET, nếu `net-service` gặp sự cố tải hoặc bảo trì, `njs-service` không làm đứt gãy phòng học mà tự động đưa payload vào hàng chờ `queueXpRecord` và thử lại định kỳ, đảm bảo **Fault Tolerance (Tính chịu lỗi)**.
3. **API Gateway Pattern (Nginx)**: Đóng vai trò điểm truy cập duy nhất (Single Entry Point), định tuyến thông minh (Smart Routing), ẩn toàn bộ cấu trúc địa chỉ IP/Port nội bộ của các microservice.

---

### 2.2. Kiến trúc Xử lý Thời gian thực (Real-Time System Architecture)

Hệ thống LUCY sử dụng **Mô hình Thời gian thực hai kênh (Dual-Channel Real-Time Pattern)**:

1. **Kênh Điều khiển Trạng thái (Signaling Channel via Socket.IO WebSocket)**:
   - Truyền tải tất cả các sự kiện thay đổi trạng thái trong phòng học với độ trễ **< 20ms**:
     - `join-room`, `leave-room`: Người dùng ra/vào phòng.
     - `hand-raise`, `grant-speak`: Giơ tay xin phát biểu & cấp quyền nói.
     - `audio-bar-visualizer`: Nhịp sóng âm thanh thời gian thực.
     - `recording-stopped`: Báo dừng và phát hành Podcast.
     - `xp-earned-batch`: Đẩy bảng thưởng XP tức thì cho cả phòng khi kết thúc buổi học.

2. **Kênh Truyền âm thanh Thoại Đa chiều (Media Channel via Agora WebRTC SFU)**:
   - Luồng tiếng thoại (Voice Stream) của người nói được nén qua Codec Opus và truyền qua mạng **Selective Forwarding Unit (SFU)** của Agora Cloud với độ trễ âm thanh **< 150ms**.
   - Thiết kế này giúp Server Node.js của LUCY không phải gánh nặng băng thông nén/phát âm thanh trực tiếp, giữ cho server luôn nhẹ và ổn định.

---

### 2.3. Các Design Pattern bổ trợ trong Dự án

| Phân hệ / Tính năng | Mẫu Thiết kế (Design Pattern) | Mô tả & Lợi ích mang lại |
| :--- | :--- | :--- |
| **Giao dịch tài chính** | **Double-Entry Ledger Pattern** | Mọi nạp/gửi quà/donate đều tạo 2 dòng ghi nợ/có đối ứng (`WalletLedger` & `GiftTransaction`), đảm bảo kiểm toán 100% dòng tiền. |
| **Vòng đời Phòng học** | **Finite State Machine (FSM)** | Phòng học chuyển đổi nghiêm ngặt `Lobby` $\rightarrow$ `Topic` $\rightarrow$ `Transition` $\rightarrow$ `Closed`, triệt tiêu hoàn toàn trạng thái sai luồng. |
| **Quản lý State Frontend**| **Atomic Store Pattern (Zustand)** | Quản lý state tập trung, tối ưu render và kết nối trực tiếp với Socket WebSocket ngoài vòng đời React Component. |
| **Kiểm soát Cấp độ** | **Policy-Based Level Guard** | Tính toán level động $\text{UserLevel} = \left\lfloor\frac{\text{XP}}{50}\right\rfloor + 1$ và chặn tự động người dùng vào phòng quá khó (`LevelId > UserLevel + 3`). |

---

## 3. BẢNG SO SÁNH MA TRẬN QUYẾT ĐỊNH KIẾN TRÚC (DECISION MATRIX)

| Tiêu chí | Monolith Thuần túy | Microservices Thuần túy (Docker/Kubernetes) | **Mô hình Hybrid của LUCY (Lựa chọn)** |
| :--- | :--- | :--- | :--- |
| **Độ phức tạp hạ tầng** | Rất thấp | Rất cao (Cần DevOps/Service Mesh) | **Vừa phải** (Tận dụng Nginx Proxy) |
| **Tốc độ Real-time** | Trung bình | Tốt (dính độ trễ Inter-service) | **Cực cao** (Node.js + Socket.IO trực tiếp) |
| **Tính an toàn tài chính** | Khá | Cần Distributed Transactions (Saga) | **Tối ưu** (.NET 9 đảm nhận ACID Ledger) |
| **Khả năng bảo trì** | Giảm dần theo thời gian | Cao | **Rất cao** (Tách biệt công nghệ phù hợp) |

---

## 4. KẾT LUẬN

Việc kết hợp **Kiến trúc Microservices đa ngôn ngữ (Node.js + .NET 9)** cùng **Hệ thống Xử lý Thời gian thực hai kênh (Socket.IO + WebRTC)** giúp dự án **LUCY** giải quyết hoàn hảo bài toán học ngoại ngữ tương tác nhóm:
- Đảm bảo trải nghiệm nói chuyện mượt mà, phản hồi tức thì dưới 50ms.
- Bảo mật tuyệt đối dữ liệu tài khoản và số dư ví theo chuẩn ngân hàng.
- Sẵn sàng mở rộng quy mô (Scale out) từng microservice độc lập khi lượng người dùng tăng cao.
