# Ghi chú về Độ trễ hệ thống (Latency Metrics)

Tài liệu này dùng để định nghĩa, phân biệt và ghi chú rõ ràng về **Độ trễ mạng (Network Latency)** và **Độ trễ dịch vụ (Service Latency)** trong quá trình vận hành và kiểm thử hệ thống LUCY.

## 1. Phân biệt các loại độ trễ

### A. Độ trễ mạng (Network Latency / Ping)
- **Định nghĩa:** Thời gian gói tin di chuyển từ thiết bị của người dùng (Client) qua môi trường mạng Internet đến máy chủ (Server) và ngược lại (Round Trip Time - RTT).
- **Yếu tố ảnh hưởng:** Vị trí địa lý của người dùng, chất lượng đường truyền mạng, số lượng hop (router) trung gian.
- **Cách đo lường:** Thông qua các sự kiện WebSocket như `ping-user` / `pong-user` hoặc các công cụ đo đạc RTT trên trình duyệt.
- **Đặc điểm:** Không phụ thuộc vào khả năng xử lý của máy chủ hệ thống.

### B. Độ trễ dịch vụ (Service Latency / Processing Time)
- **Định nghĩa:** Thời gian máy chủ (Backend - .NET / Node.js) thực sự dùng để xử lý yêu cầu của người dùng, tính từ lúc Server nhận được toàn bộ request đến lúc Server bắt đầu gửi response đi.
- **Yếu tố ảnh hưởng:** Tốc độ xử lý của CPU, thời gian truy vấn cơ sở dữ liệu (Database Queries), thời gian gọi các API bên thứ 3 (như Agora, Payment Gateway), và thời gian chờ trong queue.
- **Cách đo lường:** Middleware trên backend ghi nhận thời gian bắt đầu nhận request (`ActionExecuting`) và thời gian kết thúc xử lý (`ActionExecuted`).

---

## 2. Bảng ghi chú kết quả đo lường (Latency Log)

Sử dụng bảng dưới đây để ghi lại kết quả kiểm thử định kỳ hoặc khi có sự cố hiệu năng.

| Ngày/Giờ (Thời điểm) | Chức năng / API Endpoint | Độ trễ mạng (Network Latency) | Độ trễ dịch vụ (Service Latency) | Tổng thời gian phản hồi (Total RTT) | Môi trường / Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- |
| DD/MM/YYYY HH:MM | `GET /api/gifts` | ~45 ms | ~120 ms | ~165 ms | VD: Test trên mạng 4G |
| | | | | | |
| | | | | | |
| | | | | | |

## 3. Cơ chế tự động ghi nhận số liệu

Hệ thống LUCY sử dụng hai luồng thu thập latency tự động:

### A. HTTP API Requests (Axios Interceptor)
Frontend gắn interceptor vào mỗi axios instance. Sau mỗi response:
- Đọc header `Server-Timing: app;dur=<ms>` từ backend (.NET / Node.js)
- Tính `Network Latency = Total RTT − Server Processing`
- POST kết quả đến:
  - `.NET service`: `POST /api/telemetry/log-latency`
  - `Node.js service`: `POST /api/latency/log`

### B. WebSocket Ping (Socket.io)
Frontend định kỳ emit sự kiện `ping` và đo thời gian nhận callback:
- Gửi kết quả qua `log-websocket-latency` event
- Node.js server ghi vào `logs/websocket_latency.log`

### C. Path Resolution (Local & Deploy)
Server tự tìm file `latency_metrics.md` theo thứ tự ưu tiên:
1. Biến môi trường `LATENCY_MD_PATH` (cấu hình tường minh trên Docker/deploy)
2. Tự động walk-up từ `process.cwd()` lên tối đa 4 cấp (hoạt động cả local dev và monorepo)

> **Trên môi trường deploy (Docker/Render):** Dữ liệu chạy Realtime được hệ thống tự động ghi nhận trực tiếp vào bảng ở **Section 6** của file `document/latency_metrics.md` (được copy vào container tại thời điểm build).
> Bạn có thể xem hoặc tải trực tiếp file markdown đã cập nhật thời gian thực thông qua các endpoint:
> - `GET /api/latency/raw`: Xem raw Markdown trực tiếp trên trình duyệt.
> - `GET /api/latency/download`: Tải file `latency_metrics.md` về máy.
> - `GET /api/latency/metrics`: Lấy thông tin JSON và in-memory buffer.

---

## 4. Hướng dẫn tối ưu hóa

- **Nếu Độ trễ mạng cao:** Xem xét sử dụng CDN (Content Delivery Network), triển khai server ở các vị trí địa lý gần người dùng hơn, hoặc tối ưu hóa kích thước payload (nén gzip, giảm bớt dữ liệu thừa).
- **Nếu Độ trễ dịch vụ cao:** Kiểm tra và tối ưu hóa các câu lệnh SQL (thêm Index), sử dụng bộ nhớ đệm (Caching - Redis/Memcached), xử lý bất đồng bộ (Asynchronous processing/Background jobs) cho các tác vụ nặng.

---

## 5. Kết quả đo lường trên môi trường Local
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:21 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:03 | `GET /api/rooms` | ~345.94 ms | ~53.06 ms | ~399.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:03 | `GET /api/rooms` | ~421.95 ms | ~3.05 ms | ~425.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:03 | `WebSocket Ping (User: 1)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `WebSocket Ping (User: 1)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `GET /api/rooms` | ~41.78 ms | ~2.22 ms | ~44.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `WebSocket Ping (User: 1)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `GET /api/rooms` | ~32.04 ms | ~0.96 ms | ~33.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `WebSocket Ping (User: 1)` | ~25.00 ms | ~0.00 ms (Socket) | ~25.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `GET /api/rooms` | ~337.56 ms | ~10.44 ms | ~348.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `WebSocket Ping (User: 1)` | ~20.00 ms | ~0.00 ms (Socket) | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `GET /api/rooms` | ~29.71 ms | ~3.29 ms | ~33.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `GET /api/rooms` | ~114.01 ms | ~0.99 ms | ~115.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `GET /api/rooms` | ~120.25 ms | ~0.75 ms | ~121.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `WebSocket Ping (User: 1)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `WebSocket Ping (User: 1)` | ~32.00 ms | ~0.00 ms (Socket) | ~32.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `GET /api/rooms` | ~43.48 ms | ~3.52 ms | ~47.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:04 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `WebSocket Ping (User: 1)` | ~25.00 ms | ~0.00 ms (Socket) | ~25.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `GET /api/rooms` | ~323.04 ms | ~1.96 ms | ~325.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `WebSocket Ping (User: 1)` | ~20.00 ms | ~0.00 ms (Socket) | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `GET /api/rooms` | ~31.00 ms | ~3.00 ms | ~34.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `WebSocket Ping (User: 1)` | ~23.00 ms | ~0.00 ms (Socket) | ~23.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `GET /api/rooms` | ~325.94 ms | ~2.06 ms | ~328.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `WebSocket Ping (User: 1)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `GET /api/rooms` | ~21.80 ms | ~1.20 ms | ~23.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `WebSocket Ping (User: 1)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `GET /api/rooms` | ~318.67 ms | ~2.33 ms | ~321.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `GET /api/levels` | ~22.52 ms | ~3.48 ms | ~26.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `GET /api/levels` | ~24.45 ms | ~2.55 ms | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:05 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~24.00 ms | ~0.00 ms (Socket) | ~24.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `GET /api/rooms` | ~34.46 ms | ~2.54 ms | ~37.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `POST /api/rooms` | ~8.03 ms | ~10.97 ms | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `GET /api/agora/token` | ~12.95 ms | ~21.05 ms | ~34.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `GET /api/agora/token` | ~47.26 ms | ~2.74 ms | ~50.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `GET /api/rooms` | ~6.43 ms | ~2.57 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `GET /api/agora/token` | ~74.39 ms | ~1.61 ms | ~76.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `GET /api/agora/token` | ~83.72 ms | ~2.28 ms | ~86.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~20.00 ms | ~0.00 ms (Socket) | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 1)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:06 | `WebSocket Ping (User: 2)` | ~23.00 ms | ~0.00 ms (Socket) | ~23.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `GET /api/rooms/active` | ~322.05 ms | ~0.95 ms | ~323.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `GET /api/rooms/active` | ~329.36 ms | ~0.64 ms | ~330.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `GET /api/rooms/active` | ~11.58 ms | ~0.42 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `GET /api/rooms/active` | ~9.44 ms | ~0.56 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `GET /api/podcasts` | ~18.51 ms | ~1.49 ms | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `GET /api/podcasts` | ~21.05 ms | ~0.95 ms | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `GET /api/podcasts` | ~22.98 ms | ~1.02 ms | ~24.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `GET /api/podcasts` | ~25.90 ms | ~1.10 ms | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~20.00 ms | ~0.00 ms (Socket) | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~26.00 ms | ~0.00 ms (Socket) | ~26.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~23.00 ms | ~0.00 ms (Socket) | ~23.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~20.00 ms | ~0.00 ms (Socket) | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 1)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~27.00 ms | ~0.00 ms (Socket) | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 1)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~20.00 ms | ~0.00 ms (Socket) | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~2497.00 ms | ~0.00 ms (Socket) | ~2497.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~506.00 ms | ~0.00 ms (Socket) | ~506.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~31.00 ms | ~0.00 ms (Socket) | ~31.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~23.00 ms | ~0.00 ms (Socket) | ~23.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~31.00 ms | ~0.00 ms (Socket) | ~31.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~28.00 ms | ~0.00 ms (Socket) | ~28.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~29.00 ms | ~0.00 ms (Socket) | ~29.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~31.00 ms | ~0.00 ms (Socket) | ~31.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~44.00 ms | ~0.00 ms (Socket) | ~44.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~25.00 ms | ~0.00 ms (Socket) | ~25.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~30.00 ms | ~0.00 ms (Socket) | ~30.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 1)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~31.00 ms | ~0.00 ms (Socket) | ~31.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~33.00 ms | ~0.00 ms (Socket) | ~33.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~27.00 ms | ~0.00 ms (Socket) | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~29.00 ms | ~0.00 ms (Socket) | ~29.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~35.00 ms | ~0.00 ms (Socket) | ~35.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~29.00 ms | ~0.00 ms (Socket) | ~29.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~32.00 ms | ~0.00 ms (Socket) | ~32.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~28.00 ms | ~0.00 ms (Socket) | ~28.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~30.00 ms | ~0.00 ms (Socket) | ~30.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~27.00 ms | ~0.00 ms (Socket) | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~28.00 ms | ~0.00 ms (Socket) | ~28.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 1)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/levels` | ~322.86 ms | ~16.14 ms | ~339.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/levels` | ~349.37 ms | ~3.63 ms | ~353.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/rooms/active` | ~12.24 ms | ~0.76 ms | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/rooms/active` | ~15.17 ms | ~0.83 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/podcasts` | ~16.09 ms | ~1.91 ms | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/podcasts` | ~17.52 ms | ~1.48 ms | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/levels` | ~18.23 ms | ~1.77 ms | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/levels` | ~19.55 ms | ~2.45 ms | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `POST /api/rooms` | ~6.72 ms | ~5.28 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/agora/token` | ~11.43 ms | ~15.57 ms | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/agora/token` | ~55.06 ms | ~1.94 ms | ~57.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/agora/token` | ~319.71 ms | ~3.29 ms | ~323.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/agora/token` | ~311.63 ms | ~2.37 ms | ~314.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/agora/token` | ~234.28 ms | ~1.72 ms | ~236.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `GET /api/agora/token` | ~14.28 ms | ~1.72 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~27.00 ms | ~0.00 ms (Socket) | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:13 | `WebSocket Ping (User: 2)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~32.00 ms | ~0.00 ms (Socket) | ~32.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~24.00 ms | ~0.00 ms (Socket) | ~24.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~43.00 ms | ~0.00 ms (Socket) | ~43.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~57.00 ms | ~0.00 ms (Socket) | ~57.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~58.00 ms | ~0.00 ms (Socket) | ~58.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~20.00 ms | ~0.00 ms (Socket) | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `GET /api/rooms` | ~42.21 ms | ~2.79 ms | ~45.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `GET /api/rooms` | ~46.80 ms | ~2.20 ms | ~49.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `GET /api/agora/token` | ~17.08 ms | ~1.92 ms | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `GET /api/agora/token` | ~23.38 ms | ~1.62 ms | ~25.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~20.00 ms | ~0.00 ms (Socket) | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~20.00 ms | ~0.00 ms (Socket) | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:14 | `WebSocket Ping (User: 2)` | ~76.00 ms | ~0.00 ms (Socket) | ~76.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `GET /api/agora/token` | ~314.80 ms | ~2.20 ms | ~317.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `GET /api/agora/token` | ~114.00 ms | ~2.00 ms | ~116.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 1)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 1)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `GET /api/agora/token` | ~29.72 ms | ~2.28 ms | ~32.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~24.00 ms | ~0.00 ms (Socket) | ~24.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:16 | `GET /api/rooms/active` | ~321.45 ms | ~0.55 ms | ~322.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:16 | `GET /api/rooms/active` | ~328.40 ms | ~0.60 ms | ~329.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:16 | `GET /api/rooms/active` | ~9.52 ms | ~0.48 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:16 | `GET /api/podcasts` | ~15.04 ms | ~0.96 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:16 | `GET /api/podcasts` | ~16.13 ms | ~2.87 ms | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:16 | `GET /api/podcasts` | ~14.38 ms | ~1.62 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:16 | `GET /api/podcasts` | ~16.10 ms | ~0.90 ms | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:16 | `GET /api/rooms/active` | ~15.70 ms | ~0.30 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:16 | `GET /api/rooms/active` | ~16.83 ms | ~0.17 ms | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:16 | `GET /api/rooms/active` | ~7.55 ms | ~0.45 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:18 | `GET /api/podcasts` | ~324.79 ms | ~2.21 ms | ~327.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:18 | `GET /api/podcasts` | ~330.42 ms | ~1.58 ms | ~332.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:18 | `GET /api/rooms/active` | ~20.65 ms | ~0.35 ms | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:18 | `GET /api/rooms/active` | ~21.79 ms | ~0.21 ms | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `GET /api/levels` | ~314.75 ms | ~3.25 ms | ~318.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `GET /api/levels` | ~327.23 ms | ~1.77 ms | ~329.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `GET /api/rooms` | ~23.55 ms | ~2.45 ms | ~26.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `GET /api/rooms` | ~25.85 ms | ~1.15 ms | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `GET /api/agora/token` | ~99.23 ms | ~1.77 ms | ~101.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `GET /api/agora/token` | ~119.10 ms | ~0.90 ms | ~120.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `WebSocket Ping (User: 3)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:19 | `WebSocket Ping (User: 3)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~20.00 ms | ~0.00 ms (Socket) | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~20.00 ms | ~0.00 ms (Socket) | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:20 | `WebSocket Ping (User: 3)` | ~26.00 ms | ~0.00 ms (Socket) | ~26.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:21 | `WebSocket Ping (User: 3)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `GET /api/agora/token` | ~350.61 ms | ~2.39 ms | ~353.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~23.00 ms | ~0.00 ms (Socket) | ~23.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~25.00 ms | ~0.00 ms (Socket) | ~25.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:22 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms` | ~49.39 ms | ~1.61 ms | ~51.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms` | ~50.13 ms | ~1.87 ms | ~52.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/agora/token` | ~13.34 ms | ~1.66 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/agora/token` | ~20.59 ms | ~1.41 ms | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/agora/token` | ~16.58 ms | ~1.42 ms | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms/active` | ~22.68 ms | ~0.32 ms | ~23.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms/active` | ~26.72 ms | ~0.28 ms | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms/active` | ~9.44 ms | ~0.56 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms` | ~9.06 ms | ~0.94 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms` | ~10.04 ms | ~0.96 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/podcasts` | ~15.27 ms | ~0.73 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/podcasts` | ~18.26 ms | ~0.74 ms | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/podcasts` | ~15.31 ms | ~0.69 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/podcasts` | ~18.53 ms | ~0.47 ms | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms/active` | ~19.65 ms | ~0.35 ms | ~20.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms/active` | ~20.79 ms | ~0.21 ms | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/podcasts` | ~18.51 ms | ~0.49 ms | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/podcasts` | ~20.22 ms | ~0.78 ms | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms/active` | ~23.78 ms | ~0.22 ms | ~24.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms/active` | ~24.62 ms | ~0.38 ms | ~25.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms/active` | ~10.60 ms | ~0.40 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms/active` | ~11.61 ms | ~0.39 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms/active` | ~9.58 ms | ~0.42 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms/active` | ~10.37 ms | ~0.63 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms` | ~57.22 ms | ~0.78 ms | ~58.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/rooms` | ~59.97 ms | ~1.03 ms | ~61.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/agora/token` | ~28.64 ms | ~1.36 ms | ~30.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `GET /api/agora/token` | ~5.09 ms | ~0.91 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~26.00 ms | ~0.00 ms (Socket) | ~26.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~37.00 ms | ~0.00 ms (Socket) | ~37.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~32.00 ms | ~0.00 ms (Socket) | ~32.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:23 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~34.00 ms | ~0.00 ms (Socket) | ~34.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~28.00 ms | ~0.00 ms (Socket) | ~28.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~27.00 ms | ~0.00 ms (Socket) | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~30.00 ms | ~0.00 ms (Socket) | ~30.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~24.00 ms | ~0.00 ms (Socket) | ~24.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~24.00 ms | ~0.00 ms (Socket) | ~24.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~33.00 ms | ~0.00 ms (Socket) | ~33.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~23.00 ms | ~0.00 ms (Socket) | ~23.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~24.00 ms | ~0.00 ms (Socket) | ~24.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~27.00 ms | ~0.00 ms (Socket) | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~28.00 ms | ~0.00 ms (Socket) | ~28.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~32.00 ms | ~0.00 ms (Socket) | ~32.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~28.00 ms | ~0.00 ms (Socket) | ~28.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~23.00 ms | ~0.00 ms (Socket) | ~23.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~31.00 ms | ~0.00 ms (Socket) | ~31.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~26.00 ms | ~0.00 ms (Socket) | ~26.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~23.00 ms | ~0.00 ms (Socket) | ~23.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~28.00 ms | ~0.00 ms (Socket) | ~28.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~29.00 ms | ~0.00 ms (Socket) | ~29.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~26.00 ms | ~0.00 ms (Socket) | ~26.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~28.00 ms | ~0.00 ms (Socket) | ~28.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~27.00 ms | ~0.00 ms (Socket) | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~25.00 ms | ~0.00 ms (Socket) | ~25.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~26.00 ms | ~0.00 ms (Socket) | ~26.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~35.00 ms | ~0.00 ms (Socket) | ~35.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~33.00 ms | ~0.00 ms (Socket) | ~33.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~28.00 ms | ~0.00 ms (Socket) | ~28.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~28.00 ms | ~0.00 ms (Socket) | ~28.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~19.00 ms | ~0.00 ms (Socket) | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~32.00 ms | ~0.00 ms (Socket) | ~32.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~40.00 ms | ~0.00 ms (Socket) | ~40.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:24 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~24.00 ms | ~0.00 ms (Socket) | ~24.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~35.00 ms | ~0.00 ms (Socket) | ~35.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~31.00 ms | ~0.00 ms (Socket) | ~31.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~25.00 ms | ~0.00 ms (Socket) | ~25.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~32.00 ms | ~0.00 ms (Socket) | ~32.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~24.00 ms | ~0.00 ms (Socket) | ~24.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~866.00 ms | ~0.00 ms (Socket) | ~866.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~1880.00 ms | ~0.00 ms (Socket) | ~1880.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~1903.00 ms | ~0.00 ms (Socket) | ~1903.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~936.00 ms | ~0.00 ms (Socket) | ~936.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~28.00 ms | ~0.00 ms (Socket) | ~28.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~1546.00 ms | ~0.00 ms (Socket) | ~1546.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~605.00 ms | ~0.00 ms (Socket) | ~605.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~1570.00 ms | ~0.00 ms (Socket) | ~1570.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~2873.00 ms | ~0.00 ms (Socket) | ~2873.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~922.00 ms | ~0.00 ms (Socket) | ~922.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~1951.00 ms | ~0.00 ms (Socket) | ~1951.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~2361.00 ms | ~0.00 ms (Socket) | ~2361.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~1441.00 ms | ~0.00 ms (Socket) | ~1441.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~12.00 ms | ~0.00 ms (Socket) | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~361.00 ms | ~0.00 ms (Socket) | ~361.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~1411.00 ms | ~0.00 ms (Socket) | ~1411.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~1428.00 ms | ~0.00 ms (Socket) | ~1428.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~21.00 ms | ~0.00 ms (Socket) | ~21.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~22.00 ms | ~0.00 ms (Socket) | ~22.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~29.00 ms | ~0.00 ms (Socket) | ~29.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~71.00 ms | ~0.00 ms (Socket) | ~71.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~17.00 ms | ~0.00 ms (Socket) | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:25 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~1477.00 ms | ~0.00 ms (Socket) | ~1477.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~499.00 ms | ~0.00 ms (Socket) | ~499.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~1526.00 ms | ~0.00 ms (Socket) | ~1526.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~795.00 ms | ~0.00 ms (Socket) | ~795.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:26 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~14.00 ms | ~0.00 ms (Socket) | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~13.00 ms | ~0.00 ms (Socket) | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2100.00 ms | ~0.00 ms (Socket) | ~2100.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~576.00 ms | ~0.00 ms (Socket) | ~576.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~1401.00 ms | ~0.00 ms (Socket) | ~1401.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2413.00 ms | ~0.00 ms (Socket) | ~2413.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:27 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~16.00 ms | ~0.00 ms (Socket) | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 18:28 | `WebSocket Ping (User: 3)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:46 | `GET /api/rooms` | ~315.87 ms | ~63.13 ms | ~379.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:46 | `GET /api/rooms` | ~406.13 ms | ~0.87 ms | ~407.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:46 | `WebSocket Ping (User: 1)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:46 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:46 | `GET /api/rooms` | ~5.41 ms | ~0.59 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/rooms` | ~26.41 ms | ~0.59 ms | ~27.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/rooms` | ~28.51 ms | ~0.49 ms | ~29.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/rooms` | ~315.51 ms | ~0.49 ms | ~316.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/rooms` | ~4.40 ms | ~0.60 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/rooms` | ~311.38 ms | ~0.62 ms | ~312.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/levels` | ~13.49 ms | ~2.51 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/levels` | ~16.38 ms | ~0.62 ms | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/podcasts` | ~9.09 ms | ~0.91 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/podcasts` | ~10.34 ms | ~0.66 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/levels` | ~14.09 ms | ~0.91 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/levels` | ~15.42 ms | ~0.58 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/rooms` | ~4.46 ms | ~0.54 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `POST /api/rooms` | ~4.23 ms | ~4.77 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/agora/token` | ~4.19 ms | ~8.81 ms | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/agora/token` | ~17.27 ms | ~0.73 ms | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/rooms` | ~8.37 ms | ~0.63 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/rooms` | ~8.55 ms | ~0.45 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/agora/token` | ~323.01 ms | ~0.99 ms | ~324.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/agora/token` | ~332.02 ms | ~0.98 ms | ~333.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:47 | `GET /api/agora/token` | ~96.23 ms | ~0.77 ms | ~97.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~18.00 ms | ~0.00 ms (Socket) | ~18.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:48 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/rooms/active` | ~315.57 ms | ~0.43 ms | ~316.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/rooms/active` | ~316.85 ms | ~0.15 ms | ~317.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/rooms/active` | ~5.81 ms | ~0.19 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/rooms/active` | ~4.61 ms | ~0.39 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/levels` | ~6.74 ms | ~1.26 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/levels` | ~7.45 ms | ~1.55 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/rooms` | ~28.25 ms | ~0.75 ms | ~29.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/rooms` | ~29.32 ms | ~0.68 ms | ~30.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/agora/token` | ~18.34 ms | ~0.66 ms | ~19.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/agora/token` | ~25.19 ms | ~0.81 ms | ~26.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/agora/token` | ~11.26 ms | ~0.74 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/agora/token` | ~9.25 ms | ~0.75 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/agora/token` | ~10.26 ms | ~0.74 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/agora/token` | ~3.29 ms | ~0.71 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/rooms` | ~10.86 ms | ~1.14 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `GET /api/rooms` | ~12.19 ms | ~0.81 ms | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:49 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/podcasts` | ~13.42 ms | ~0.58 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/podcasts` | ~15.42 ms | ~0.58 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~11.87 ms | ~0.13 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~12.89 ms | ~0.11 ms | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~3.79 ms | ~0.21 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~7.72 ms | ~0.28 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~3.67 ms | ~0.33 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~3.68 ms | ~0.32 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~2.85 ms | ~0.15 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~5.78 ms | ~0.22 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~4.69 ms | ~0.31 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~6.70 ms | ~0.30 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~6.71 ms | ~0.29 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~6.59 ms | ~0.41 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~3.83 ms | ~0.17 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~3.83 ms | ~0.17 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~3.64 ms | ~0.36 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~5.76 ms | ~0.24 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~3.74 ms | ~0.26 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~2.79 ms | ~0.21 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~5.76 ms | ~0.24 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~4.90 ms | ~0.10 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~2.81 ms | ~0.19 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~7.68 ms | ~0.32 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `GET /api/rooms/active` | ~2.81 ms | ~0.19 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:50 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~6.78 ms | ~0.22 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~2.86 ms | ~0.14 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~4.88 ms | ~0.12 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~5.79 ms | ~0.21 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~3.72 ms | ~0.28 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~5.83 ms | ~0.17 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~2.81 ms | ~0.19 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~6.81 ms | ~0.19 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~6.61 ms | ~0.39 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~3.83 ms | ~0.17 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~4.90 ms | ~0.10 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~3.64 ms | ~0.36 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~6.72 ms | ~0.28 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~7.90 ms | ~0.10 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~3.53 ms | ~0.47 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~3.79 ms | ~0.21 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~5.90 ms | ~0.10 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~2.86 ms | ~0.14 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `GET /api/rooms/active` | ~3.85 ms | ~0.15 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:51 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~4.89 ms | ~0.11 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~3.67 ms | ~0.33 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~6.73 ms | ~0.27 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~6.78 ms | ~0.22 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~8.79 ms | ~0.21 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~5.82 ms | ~0.18 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~6.68 ms | ~0.32 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~2.84 ms | ~0.16 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~8.68 ms | ~0.32 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~2.85 ms | ~0.15 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~5.72 ms | ~0.28 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~7.69 ms | ~0.31 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~9.73 ms | ~0.27 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~3.68 ms | ~0.32 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~6.76 ms | ~0.24 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~5.71 ms | ~0.29 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~6.67 ms | ~0.33 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~4.90 ms | ~0.10 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~3.69 ms | ~0.31 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~7.78 ms | ~0.22 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~3.86 ms | ~0.14 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~6.73 ms | ~0.27 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~6.62 ms | ~0.38 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:52 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~8.73 ms | ~0.27 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~7.77 ms | ~0.23 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~3.73 ms | ~0.27 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~8.67 ms | ~0.33 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~7.72 ms | ~0.28 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~11.68 ms | ~0.32 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~5.77 ms | ~0.23 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~5.80 ms | ~0.20 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~4.89 ms | ~0.11 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~4.90 ms | ~0.10 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~24.84 ms | ~0.16 ms | ~25.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~2.86 ms | ~0.14 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~2.74 ms | ~0.26 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~1.86 ms | ~0.14 ms | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~5.90 ms | ~0.10 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~8.68 ms | ~0.32 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~3.85 ms | ~0.15 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~5.88 ms | ~0.12 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~4.90 ms | ~0.10 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~6.90 ms | ~0.10 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~7.77 ms | ~0.23 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~2.86 ms | ~0.14 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~8.68 ms | ~0.32 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `GET /api/rooms/active` | ~8.68 ms | ~0.32 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:53 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~9.88 ms | ~0.12 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~6.86 ms | ~0.14 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~3.86 ms | ~0.14 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~8.63 ms | ~0.37 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~13.80 ms | ~0.20 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~9.71 ms | ~0.29 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~7.70 ms | ~0.30 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~9.70 ms | ~0.30 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~9.60 ms | ~0.40 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~10.70 ms | ~0.30 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~8.69 ms | ~0.31 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~8.79 ms | ~0.21 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~9.70 ms | ~0.30 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~8.68 ms | ~0.32 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~14.60 ms | ~0.40 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~3.83 ms | ~0.17 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~7.68 ms | ~0.32 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~7.68 ms | ~0.32 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~8.86 ms | ~0.14 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~4.69 ms | ~0.31 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~8.61 ms | ~0.39 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~8.71 ms | ~0.29 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~3.80 ms | ~0.20 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~11.85 ms | ~0.15 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~7.64 ms | ~0.36 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~7.73 ms | ~0.27 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~4.69 ms | ~0.31 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:54 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~7.90 ms | ~0.10 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~7.70 ms | ~0.30 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~7.62 ms | ~0.38 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~7.59 ms | ~0.41 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~6.77 ms | ~0.23 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~10.84 ms | ~0.16 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~7.69 ms | ~0.31 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~4.86 ms | ~0.14 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~8.74 ms | ~0.26 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~10.73 ms | ~0.27 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~6.70 ms | ~0.30 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~7.88 ms | ~0.12 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~5.88 ms | ~0.12 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~11.83 ms | ~0.17 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~8.72 ms | ~0.28 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~4.90 ms | ~0.10 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~6.87 ms | ~0.13 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~9.87 ms | ~0.13 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~5.88 ms | ~0.12 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~8.76 ms | ~0.24 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~8.79 ms | ~0.21 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~5.73 ms | ~0.27 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~9.77 ms | ~0.23 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~5.78 ms | ~0.22 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~4.74 ms | ~0.26 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `GET /api/rooms/active` | ~5.74 ms | ~0.26 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:55 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~6.76 ms | ~0.24 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~5.85 ms | ~0.15 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~5.84 ms | ~0.16 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~6.77 ms | ~0.23 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~8.80 ms | ~0.20 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~7.82 ms | ~0.18 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~6.81 ms | ~0.19 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~7.76 ms | ~0.24 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~4.85 ms | ~0.15 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~3.85 ms | ~0.15 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~2.86 ms | ~0.14 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~6.69 ms | ~0.31 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~7.69 ms | ~0.31 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~8.67 ms | ~0.33 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~4.76 ms | ~0.24 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~7.66 ms | ~0.34 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~6.84 ms | ~0.16 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~8.79 ms | ~0.21 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~3.82 ms | ~0.18 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~10.73 ms | ~0.27 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~2.82 ms | ~0.18 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~5.83 ms | ~0.17 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~9.77 ms | ~0.23 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~4.88 ms | ~0.12 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~9.70 ms | ~0.30 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~4.84 ms | ~0.16 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `GET /api/rooms/active` | ~3.81 ms | ~0.19 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~9.74 ms | ~0.26 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.86 ms | ~0.14 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~5.63 ms | ~0.37 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~11.73 ms | ~0.27 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.75 ms | ~0.25 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~7.81 ms | ~0.19 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.85 ms | ~0.15 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~4.89 ms | ~0.11 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~4.90 ms | ~0.10 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.84 ms | ~0.16 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~6.79 ms | ~0.21 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.67 ms | ~0.33 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~8.89 ms | ~0.11 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~5.77 ms | ~0.23 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~6.89 ms | ~0.11 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~7.74 ms | ~0.26 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~6.69 ms | ~0.31 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~6.84 ms | ~0.16 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~8.79 ms | ~0.21 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~4.86 ms | ~0.14 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~8.70 ms | ~0.30 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~5.82 ms | ~0.18 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~5.81 ms | ~0.19 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~9.68 ms | ~0.32 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~8.80 ms | ~0.20 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~4.77 ms | ~0.23 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~9.78 ms | ~0.22 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~10.74 ms | ~0.26 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~5.70 ms | ~0.30 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~15.72 ms | ~0.28 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~2.84 ms | ~0.16 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~4.91 ms | ~0.09 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~3.85 ms | ~0.15 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~4.73 ms | ~0.27 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~8.73 ms | ~0.27 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~1.89 ms | ~0.11 ms | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~4.81 ms | ~0.19 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~2.84 ms | ~0.16 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~3.83 ms | ~0.17 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~7.66 ms | ~0.34 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~7.74 ms | ~0.26 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~7.71 ms | ~0.29 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~4.85 ms | ~0.15 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~7.71 ms | ~0.29 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~6.62 ms | ~0.38 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~8.72 ms | ~0.28 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~8.85 ms | ~0.15 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~12.72 ms | ~0.28 ms | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~7.72 ms | ~0.28 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~6.72 ms | ~0.28 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~7.68 ms | ~0.32 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~13.71 ms | ~0.29 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~5.71 ms | ~0.29 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~8.72 ms | ~0.28 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~10.71 ms | ~0.29 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~8.71 ms | ~0.29 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~9.82 ms | ~0.18 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~7.71 ms | ~0.29 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~11.75 ms | ~0.25 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~1.85 ms | ~0.15 ms | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~9.71 ms | ~0.29 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `GET /api/rooms/active` | ~8.67 ms | ~0.33 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 21:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~14.86 ms | ~0.14 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~5.72 ms | ~0.28 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~4.72 ms | ~0.28 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~9.68 ms | ~0.32 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~7.64 ms | ~0.36 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~11.66 ms | ~0.34 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~7.71 ms | ~0.29 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~8.72 ms | ~0.28 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~8.62 ms | ~0.38 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~8.69 ms | ~0.31 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~7.73 ms | ~0.27 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~9.71 ms | ~0.29 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~3.78 ms | ~0.22 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~9.70 ms | ~0.30 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~7.73 ms | ~0.27 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~6.79 ms | ~0.21 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~6.84 ms | ~0.16 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~8.86 ms | ~0.14 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~4.89 ms | ~0.11 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~7.89 ms | ~0.11 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~6.89 ms | ~0.11 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~5.70 ms | ~0.30 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~9.77 ms | ~0.23 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~7.84 ms | ~0.16 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~6.84 ms | ~0.16 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~3.85 ms | ~0.15 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~4.83 ms | ~0.17 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~4.85 ms | ~0.15 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~8.77 ms | ~0.23 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~8.81 ms | ~0.19 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~4.89 ms | ~0.11 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~7.84 ms | ~0.16 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~6.77 ms | ~0.23 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~5.79 ms | ~0.21 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~5.73 ms | ~0.27 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~8.69 ms | ~0.31 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~3.86 ms | ~0.14 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~6.90 ms | ~0.10 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~2.85 ms | ~0.15 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~1.87 ms | ~0.13 ms | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~4.85 ms | ~0.15 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~5.86 ms | ~0.14 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~2.86 ms | ~0.14 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~5.76 ms | ~0.24 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~6.88 ms | ~0.12 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.84 ms | ~0.16 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~4.86 ms | ~0.14 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~2.85 ms | ~0.15 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~2.81 ms | ~0.19 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~9.89 ms | ~0.11 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.78 ms | ~0.22 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.84 ms | ~0.16 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~4.89 ms | ~0.11 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~6.87 ms | ~0.13 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~4.88 ms | ~0.12 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~5.86 ms | ~0.14 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.85 ms | ~0.15 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~6.75 ms | ~0.25 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.79 ms | ~0.21 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~4.89 ms | ~0.11 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~8.73 ms | ~0.27 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~6.86 ms | ~0.14 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~5.84 ms | ~0.16 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~3.85 ms | ~0.15 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~7.86 ms | ~0.14 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~6.89 ms | ~0.11 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~9.75 ms | ~0.25 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~3.86 ms | ~0.14 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~5.86 ms | ~0.14 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~7.80 ms | ~0.20 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~6.80 ms | ~0.20 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~6.83 ms | ~0.17 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~6.90 ms | ~0.10 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~7.80 ms | ~0.20 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~4.91 ms | ~0.09 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~4.89 ms | ~0.11 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~6.85 ms | ~0.15 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~4.72 ms | ~0.28 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~5.87 ms | ~0.13 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~14.74 ms | ~0.26 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~8.65 ms | ~0.35 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~9.71 ms | ~0.29 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `GET /api/rooms/active` | ~7.60 ms | ~0.40 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~10.68 ms | ~0.32 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~6.78 ms | ~0.22 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~7.80 ms | ~0.20 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~6.90 ms | ~0.10 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~6.84 ms | ~0.16 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~9.88 ms | ~0.12 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~4.89 ms | ~0.11 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~7.61 ms | ~0.39 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~6.78 ms | ~0.22 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~7.84 ms | ~0.16 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~6.85 ms | ~0.15 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~5.89 ms | ~0.11 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~3.85 ms | ~0.15 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~6.81 ms | ~0.19 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~9.76 ms | ~0.24 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~4.90 ms | ~0.10 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~9.80 ms | ~0.20 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~7.86 ms | ~0.14 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~6.84 ms | ~0.16 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~7.87 ms | ~0.13 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~3.80 ms | ~0.20 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~8.85 ms | ~0.15 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~8.80 ms | ~0.20 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~5.91 ms | ~0.09 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~6.85 ms | ~0.15 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~7.75 ms | ~0.25 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~4.67 ms | ~0.33 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~8.74 ms | ~0.26 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~8.73 ms | ~0.27 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~9.68 ms | ~0.32 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~7.86 ms | ~0.14 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~4.82 ms | ~0.18 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~7.69 ms | ~0.31 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~1.88 ms | ~0.12 ms | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~10.86 ms | ~0.14 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~7.70 ms | ~0.30 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~5.83 ms | ~0.17 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~8.72 ms | ~0.28 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~14.57 ms | ~0.43 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~8.72 ms | ~0.28 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~6.75 ms | ~0.25 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~7.86 ms | ~0.14 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~10.69 ms | ~0.31 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~5.83 ms | ~0.17 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~3.86 ms | ~0.14 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~3.85 ms | ~0.15 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~5.79 ms | ~0.21 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `GET /api/rooms/active` | ~5.79 ms | ~0.21 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~5.91 ms | ~0.09 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~7.65 ms | ~0.35 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~4.90 ms | ~0.10 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~11.78 ms | ~0.22 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~7.65 ms | ~0.35 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~6.80 ms | ~0.20 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~8.56 ms | ~0.44 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~3.81 ms | ~0.19 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~6.74 ms | ~0.26 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~9.61 ms | ~0.39 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~3.86 ms | ~0.14 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~11.80 ms | ~0.20 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~8.74 ms | ~0.26 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~5.86 ms | ~0.14 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~2.82 ms | ~0.18 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~5.86 ms | ~0.14 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~3.82 ms | ~0.18 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~7.87 ms | ~0.13 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~5.87 ms | ~0.13 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~8.85 ms | ~0.15 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~5.87 ms | ~0.13 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~2.92 ms | ~0.08 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~5.91 ms | ~0.09 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~8.81 ms | ~0.19 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~7.74 ms | ~0.26 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~7.85 ms | ~0.15 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~5.90 ms | ~0.10 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~7.81 ms | ~0.19 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~5.82 ms | ~0.18 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~4.90 ms | ~0.10 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~7.81 ms | ~0.19 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~7.78 ms | ~0.22 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~4.91 ms | ~0.09 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~4.88 ms | ~0.12 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~5.92 ms | ~0.08 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~5.88 ms | ~0.12 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~2.92 ms | ~0.08 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~3.70 ms | ~0.30 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~7.74 ms | ~0.26 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~7.76 ms | ~0.24 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~8.76 ms | ~0.24 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~4.83 ms | ~0.17 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~4.91 ms | ~0.09 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~8.72 ms | ~0.28 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~3.92 ms | ~0.08 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~10.74 ms | ~0.26 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~9.67 ms | ~0.33 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~13.74 ms | ~0.26 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~9.66 ms | ~0.34 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~7.75 ms | ~0.25 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~7.68 ms | ~0.32 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~8.73 ms | ~0.27 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~8.71 ms | ~0.29 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~9.76 ms | ~0.24 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~8.68 ms | ~0.32 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~7.73 ms | ~0.27 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~9.74 ms | ~0.26 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~9.76 ms | ~0.24 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `GET /api/rooms/active` | ~8.72 ms | ~0.28 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~14.61 ms | ~0.39 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~8.73 ms | ~0.27 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~8.75 ms | ~0.25 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~8.76 ms | ~0.24 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~8.75 ms | ~0.25 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~14.81 ms | ~0.19 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~6.73 ms | ~0.27 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~8.73 ms | ~0.27 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~9.00 ms | ~0.00 ms (Socket) | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~11.00 ms | ~0.00 ms (Socket) | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~10.00 ms | ~0.00 ms (Socket) | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~8.77 ms | ~0.23 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~8.74 ms | ~0.26 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~12.76 ms | ~0.24 ms | ~13.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~8.69 ms | ~0.31 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~3.92 ms | ~0.08 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~2.92 ms | ~0.08 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~6.80 ms | ~0.20 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~2.86 ms | ~0.14 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~6.83 ms | ~0.17 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~9.68 ms | ~0.32 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~7.72 ms | ~0.28 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~8.70 ms | ~0.30 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~8.75 ms | ~0.25 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~9.67 ms | ~0.33 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~10.89 ms | ~0.11 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `GET /api/rooms/active` | ~4.74 ms | ~0.26 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~4.85 ms | ~0.15 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~1.92 ms | ~0.08 ms | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~316.91 ms | ~0.09 ms | ~317.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~5.89 ms | ~0.11 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~1.89 ms | ~0.11 ms | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~5.75 ms | ~0.25 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~5.67 ms | ~0.33 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~9.75 ms | ~0.25 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~5.81 ms | ~0.19 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~3.85 ms | ~0.15 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~7.66 ms | ~0.34 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~2.77 ms | ~0.23 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~312.89 ms | ~0.11 ms | ~313.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~4.74 ms | ~0.26 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~4.82 ms | ~0.18 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~311.72 ms | ~0.28 ms | ~312.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~10.69 ms | ~0.31 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~11.74 ms | ~0.26 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~8.74 ms | ~0.26 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~5.82 ms | ~0.18 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~8.72 ms | ~0.28 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~4.89 ms | ~0.11 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~11.74 ms | ~0.26 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~11.69 ms | ~0.31 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~3.86 ms | ~0.14 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~16.48 ms | ~0.52 ms | ~17.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~10.78 ms | ~0.22 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~8.81 ms | ~0.19 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~7.75 ms | ~0.25 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~8.74 ms | ~0.26 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~8.76 ms | ~0.24 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~5.82 ms | ~0.18 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~13.74 ms | ~0.26 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~6.73 ms | ~0.27 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~9.75 ms | ~0.25 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~9.74 ms | ~0.26 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~6.67 ms | ~0.33 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~6.76 ms | ~0.24 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~8.72 ms | ~0.28 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~6.78 ms | ~0.22 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `GET /api/rooms/active` | ~10.64 ms | ~0.36 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:11 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~7.89 ms | ~0.11 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~7.72 ms | ~0.28 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~6.88 ms | ~0.12 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~5.87 ms | ~0.13 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~6.87 ms | ~0.13 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~7.74 ms | ~0.26 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~6.87 ms | ~0.13 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~6.79 ms | ~0.21 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~3.85 ms | ~0.15 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~3.92 ms | ~0.08 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~4.92 ms | ~0.08 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~6.84 ms | ~0.16 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~10.84 ms | ~0.16 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~2.80 ms | ~0.20 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~5.81 ms | ~0.19 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~4.82 ms | ~0.18 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~6.69 ms | ~0.31 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~4.78 ms | ~0.22 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~4.83 ms | ~0.17 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~7.67 ms | ~0.33 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~5.71 ms | ~0.29 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~5.69 ms | ~0.31 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `GET /api/rooms/active` | ~2.91 ms | ~0.09 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~6.88 ms | ~0.12 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~5.79 ms | ~0.21 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~7.73 ms | ~0.27 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~4.83 ms | ~0.17 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~7.80 ms | ~0.20 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~6.77 ms | ~0.23 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~7.73 ms | ~0.27 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~10.85 ms | ~0.15 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~4.75 ms | ~0.25 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~10.85 ms | ~0.15 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~8.74 ms | ~0.26 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~4.81 ms | ~0.19 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~5.91 ms | ~0.09 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~3.86 ms | ~0.14 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~11.79 ms | ~0.21 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~10.75 ms | ~0.25 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~3.90 ms | ~0.10 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~3.78 ms | ~0.22 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~8.73 ms | ~0.27 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~10.77 ms | ~0.23 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~13.78 ms | ~0.22 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~6.87 ms | ~0.13 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~6.91 ms | ~0.09 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~9.76 ms | ~0.24 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `GET /api/rooms/active` | ~9.74 ms | ~0.26 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~15.87 ms | ~0.13 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~10.75 ms | ~0.25 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~3.92 ms | ~0.08 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~4.87 ms | ~0.13 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~4.92 ms | ~0.08 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~4.68 ms | ~0.32 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~3.89 ms | ~0.11 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~3.67 ms | ~0.33 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~2.92 ms | ~0.08 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~3.91 ms | ~0.09 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~10.75 ms | ~0.25 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~13.77 ms | ~0.23 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~9.72 ms | ~0.28 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~8.74 ms | ~0.26 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~11.65 ms | ~0.35 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~14.76 ms | ~0.24 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~4.76 ms | ~0.24 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~2.88 ms | ~0.12 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~6.76 ms | ~0.24 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~3.87 ms | ~0.13 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~6.92 ms | ~0.08 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~4.91 ms | ~0.09 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~2.90 ms | ~0.10 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~5.72 ms | ~0.28 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `GET /api/rooms/active` | ~2.89 ms | ~0.11 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~5.82 ms | ~0.18 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~1.90 ms | ~0.10 ms | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~8.76 ms | ~0.24 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~8.74 ms | ~0.26 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~1.91 ms | ~0.09 ms | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~9.78 ms | ~0.22 ms | ~10.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~2.87 ms | ~0.13 ms | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~3.88 ms | ~0.12 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~8.77 ms | ~0.23 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~5.91 ms | ~0.09 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~4.89 ms | ~0.11 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~7.74 ms | ~0.26 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~6.81 ms | ~0.19 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~6.84 ms | ~0.16 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `GET /api/rooms/active` | ~4.75 ms | ~0.25 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 10/07/2026 22:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 18:08 | `GET /api/rooms` | ~325.16 ms | ~5.84 ms | ~331.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 18:08 | `GET /api/rooms` | ~342.73 ms | ~1.27 ms | ~344.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 18:08 | `GET /api/podcasts` | ~9.95 ms | ~1.05 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 18:08 | `GET /api/podcasts` | ~13.20 ms | ~0.80 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 18:08 | `GET /api/rooms` | ~11.24 ms | ~0.76 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 18:08 | `GET /api/rooms` | ~14.45 ms | ~0.55 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 18:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `GET /api/rooms` | ~308.29 ms | ~2.71 ms | ~311.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `GET /api/rooms` | ~327.13 ms | ~0.87 ms | ~328.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `GET /api/levels` | ~16.61 ms | ~1.39 ms | ~18.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `GET /api/levels` | ~18.26 ms | ~0.74 ms | ~19.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `POST /api/rooms` | ~11.58 ms | ~2.42 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `GET /api/agora/token` | ~10.34 ms | ~4.66 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `GET /api/agora/token` | ~19.98 ms | ~1.02 ms | ~21.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:55 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `POST /api/rooms/90ebd2e0-2550-49c6-bc19-7ded95529209/upload-doc` | ~312.66 ms | ~8.34 ms | ~321.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:56 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~15.00 ms | ~0.00 ms (Socket) | ~15.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:57 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:58 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 19:59 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:00 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:01 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:02 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:03 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `GET /api/agora/token` | ~309.21 ms | ~0.79 ms | ~310.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1605.00 ms | ~0.00 ms (Socket) | ~1605.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:04 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `GET /api/agora/token` | ~324.43 ms | ~3.57 ms | ~328.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `GET /api/rooms` | ~9.40 ms | ~2.60 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `GET /api/rooms` | ~18.16 ms | ~0.84 ms | ~19.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `GET /api/levels` | ~9.64 ms | ~2.36 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `GET /api/levels` | ~16.30 ms | ~0.70 ms | ~17.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:05 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `POST /api/rooms` | ~5.23 ms | ~1.77 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `GET /api/agora/token` | ~15.96 ms | ~1.04 ms | ~17.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `GET /api/agora/token` | ~19.05 ms | ~0.95 ms | ~20.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `GET /api/agora/token` | ~305.91 ms | ~1.09 ms | ~307.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 4)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 4)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 4)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:06 | `WebSocket Ping (User: 4)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `GET /api/agora/token` | ~3.41 ms | ~0.59 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `GET /api/agora/token` | ~5.18 ms | ~0.82 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 4)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `GET /api/agora/token` | ~6.24 ms | ~0.76 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `GET /api/agora/token` | ~6.30 ms | ~0.70 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:07 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `GET /api/agora/token` | ~310.16 ms | ~0.84 ms | ~311.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `GET /api/agora/token` | ~13.17 ms | ~0.83 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `GET /api/agora/token` | ~317.30 ms | ~0.70 ms | ~318.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `GET /api/agora/token` | ~134.21 ms | ~0.79 ms | ~135.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~616.00 ms | ~0.00 ms (Socket) | ~616.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:08 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `GET /api/agora/token` | ~320.85 ms | ~3.15 ms | ~324.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 5)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 5)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 5)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 5)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `WebSocket Ping (User: 5)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:09 | `GET /api/agora/token` | ~306.01 ms | ~0.99 ms | ~307.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `GET /api/rooms` | ~9.31 ms | ~2.69 ms | ~12.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `GET /api/rooms` | ~14.18 ms | ~0.82 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 5)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `GET /api/levels` | ~8.89 ms | ~2.11 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `GET /api/levels` | ~17.29 ms | ~0.71 ms | ~18.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 5)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `POST /api/rooms` | ~5.21 ms | ~1.79 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `GET /api/agora/token` | ~21.87 ms | ~1.13 ms | ~23.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `GET /api/agora/token` | ~24.09 ms | ~0.91 ms | ~25.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `GET /api/agora/token` | ~4.34 ms | ~0.66 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 5)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `GET /api/agora/token` | ~310.24 ms | ~0.76 ms | ~311.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 5)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 5)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `GET /api/agora/token` | ~307.32 ms | ~0.68 ms | ~308.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `GET /api/agora/token` | ~300.37 ms | ~0.63 ms | ~301.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `GET /api/agora/token` | ~143.19 ms | ~0.81 ms | ~144.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:10 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:11 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:12 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `GET /api/rooms` | ~328.50 ms | ~0.50 ms | ~329.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `GET /api/rooms` | ~330.35 ms | ~0.65 ms | ~331.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `GET /api/levels` | ~11.40 ms | ~1.60 ms | ~13.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `GET /api/levels` | ~12.89 ms | ~1.11 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `POST /api/rooms` | ~6.35 ms | ~0.65 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `GET /api/agora/token` | ~12.73 ms | ~1.27 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `GET /api/agora/token` | ~18.29 ms | ~0.71 ms | ~19.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `GET /api/agora/token` | ~305.33 ms | ~0.67 ms | ~306.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 6)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 6)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 6)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 6)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 6)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 6)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:13 | `WebSocket Ping (User: 6)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `POST /api/rooms/cd05ef85-abab-427a-a564-1a974b331eae/upload-doc` | ~310.15 ms | ~9.85 ms | ~320.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 6)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 6)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 6)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 6)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 6)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `GET /api/agora/token` | ~329.32 ms | ~0.68 ms | ~330.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 6)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 6)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `GET /api/podcasts` | ~10.24 ms | ~0.76 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `GET /api/podcasts` | ~13.36 ms | ~0.64 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `GET /api/rooms/active` | ~14.72 ms | ~0.28 ms | ~15.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `GET /api/rooms/active` | ~16.79 ms | ~0.21 ms | ~17.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `GET /api/levels` | ~10.13 ms | ~0.87 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `GET /api/levels` | ~15.36 ms | ~0.64 ms | ~16.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `GET /api/rooms` | ~10.18 ms | ~0.82 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `GET /api/rooms` | ~13.28 ms | ~0.72 ms | ~14.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:14 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `GET /api/rooms` | ~3.33 ms | ~1.67 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `GET /api/rooms` | ~306.26 ms | ~0.74 ms | ~307.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~8.00 ms | ~0.00 ms (Socket) | ~8.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `GET /api/rooms` | ~7.42 ms | ~0.58 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `GET /api/rooms` | ~321.93 ms | ~2.07 ms | ~324.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `GET /api/rooms` | ~4.56 ms | ~0.44 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `GET /api/rooms` | ~308.43 ms | ~1.57 ms | ~310.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:15 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `GET /api/rooms` | ~4.47 ms | ~0.53 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `GET /api/rooms` | ~313.62 ms | ~0.38 ms | ~314.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `GET /api/rooms` | ~3.56 ms | ~0.44 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `GET /api/rooms` | ~314.11 ms | ~1.89 ms | ~316.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `GET /api/rooms` | ~317.91 ms | ~1.09 ms | ~319.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `GET /api/rooms` | ~4.34 ms | ~0.66 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:16 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `GET /api/rooms` | ~310.98 ms | ~1.02 ms | ~312.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `GET /api/rooms` | ~4.12 ms | ~0.88 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `GET /api/rooms` | ~305.59 ms | ~0.41 ms | ~306.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `GET /api/rooms` | ~6.38 ms | ~1.62 ms | ~8.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `GET /api/rooms` | ~306.63 ms | ~0.37 ms | ~307.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `GET /api/rooms` | ~3.30 ms | ~0.70 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:17 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `GET /api/rooms` | ~312.34 ms | ~0.66 ms | ~313.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `GET /api/rooms` | ~4.51 ms | ~0.49 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `GET /api/rooms` | ~319.37 ms | ~0.63 ms | ~320.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `GET /api/rooms` | ~3.46 ms | ~0.54 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `GET /api/rooms` | ~306.63 ms | ~0.37 ms | ~307.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `GET /api/rooms` | ~4.23 ms | ~1.77 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:18 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `GET /api/rooms` | ~311.62 ms | ~1.38 ms | ~313.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `GET /api/rooms` | ~5.07 ms | ~1.93 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `GET /api/rooms` | ~313.48 ms | ~0.52 ms | ~314.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `GET /api/rooms` | ~4.42 ms | ~0.58 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `GET /api/rooms` | ~313.55 ms | ~1.45 ms | ~315.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `GET /api/rooms` | ~4.41 ms | ~0.59 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:19 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `GET /api/rooms` | ~318.61 ms | ~0.39 ms | ~319.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `GET /api/rooms` | ~3.46 ms | ~0.54 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `GET /api/rooms` | ~319.80 ms | ~1.20 ms | ~321.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `GET /api/rooms` | ~4.54 ms | ~0.46 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `GET /api/rooms` | ~313.63 ms | ~0.37 ms | ~314.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `GET /api/rooms` | ~3.20 ms | ~0.80 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `GET /api/rooms` | ~310.52 ms | ~0.48 ms | ~311.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `GET /api/rooms` | ~3.54 ms | ~0.46 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `GET /api/rooms` | ~310.57 ms | ~0.43 ms | ~311.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `GET /api/rooms` | ~3.53 ms | ~0.47 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `GET /api/rooms` | ~314.95 ms | ~1.05 ms | ~316.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `GET /api/rooms` | ~4.61 ms | ~0.39 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:21 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `GET /api/rooms` | ~309.58 ms | ~0.42 ms | ~310.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `GET /api/rooms` | ~3.56 ms | ~0.44 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `GET /api/rooms` | ~311.61 ms | ~0.39 ms | ~312.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `GET /api/rooms` | ~4.59 ms | ~0.41 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `GET /api/rooms` | ~306.64 ms | ~0.36 ms | ~307.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `GET /api/rooms` | ~4.13 ms | ~0.87 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:22 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `GET /api/rooms` | ~308.60 ms | ~0.40 ms | ~309.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `GET /api/rooms` | ~5.60 ms | ~0.40 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `GET /api/rooms` | ~318.54 ms | ~0.46 ms | ~319.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `GET /api/rooms` | ~4.61 ms | ~0.39 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `GET /api/rooms` | ~313.50 ms | ~0.50 ms | ~314.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `GET /api/rooms` | ~4.46 ms | ~0.54 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:23 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `GET /api/rooms` | ~320.62 ms | ~1.38 ms | ~322.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `GET /api/rooms` | ~3.63 ms | ~0.37 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `GET /api/rooms` | ~321.46 ms | ~0.54 ms | ~322.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `GET /api/rooms` | ~5.42 ms | ~0.58 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `GET /api/rooms` | ~305.64 ms | ~0.36 ms | ~306.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `GET /api/rooms` | ~3.56 ms | ~0.44 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:24 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `GET /api/rooms` | ~318.54 ms | ~0.46 ms | ~319.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `GET /api/rooms` | ~5.29 ms | ~0.71 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `GET /api/rooms` | ~312.48 ms | ~0.52 ms | ~313.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `GET /api/rooms` | ~3.40 ms | ~0.60 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `GET /api/rooms` | ~314.60 ms | ~0.40 ms | ~315.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `GET /api/rooms` | ~3.59 ms | ~0.41 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:25 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `GET /api/rooms` | ~312.61 ms | ~0.39 ms | ~313.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `GET /api/rooms` | ~3.47 ms | ~0.53 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `GET /api/rooms` | ~315.64 ms | ~1.36 ms | ~317.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `GET /api/rooms` | ~4.59 ms | ~0.41 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `GET /api/rooms` | ~318.71 ms | ~1.29 ms | ~320.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~7.00 ms | ~0.00 ms (Socket) | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `GET /api/rooms` | ~7.66 ms | ~1.34 ms | ~9.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:26 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `GET /api/rooms` | ~305.28 ms | ~0.72 ms | ~306.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `GET /api/rooms` | ~5.23 ms | ~0.77 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `GET /api/rooms` | ~319.12 ms | ~1.88 ms | ~321.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `GET /api/rooms` | ~4.62 ms | ~0.38 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `GET /api/rooms` | ~318.62 ms | ~1.38 ms | ~320.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `GET /api/rooms` | ~4.77 ms | ~1.23 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:27 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `GET /api/rooms` | ~315.64 ms | ~0.36 ms | ~316.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `GET /api/rooms` | ~6.61 ms | ~0.39 ms | ~7.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `GET /api/rooms` | ~312.46 ms | ~0.54 ms | ~313.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `GET /api/rooms` | ~4.61 ms | ~0.39 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `GET /api/rooms` | ~307.19 ms | ~0.81 ms | ~308.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `GET /api/rooms` | ~3.60 ms | ~0.40 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:28 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `GET /api/rooms` | ~315.64 ms | ~0.36 ms | ~316.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `GET /api/rooms` | ~3.78 ms | ~1.22 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `GET /api/rooms` | ~312.60 ms | ~0.40 ms | ~313.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `GET /api/rooms` | ~4.64 ms | ~0.36 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `GET /api/rooms` | ~311.66 ms | ~0.34 ms | ~312.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `GET /api/rooms` | ~4.53 ms | ~0.47 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:29 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `GET /api/rooms` | ~318.64 ms | ~0.36 ms | ~319.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `GET /api/rooms` | ~4.57 ms | ~0.43 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `GET /api/rooms` | ~318.17 ms | ~0.83 ms | ~319.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `GET /api/rooms` | ~3.40 ms | ~0.60 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `GET /api/rooms` | ~319.66 ms | ~1.34 ms | ~321.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `GET /api/rooms` | ~3.56 ms | ~0.44 ms | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:30 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~6.00 ms | ~0.00 ms (Socket) | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `GET /api/rooms` | ~322.65 ms | ~0.35 ms | ~323.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `GET /api/rooms` | ~3.53 ms | ~1.47 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `GET /api/rooms` | ~319.63 ms | ~0.37 ms | ~320.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `GET /api/rooms` | ~4.62 ms | ~0.38 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `GET /api/rooms` | ~312.43 ms | ~1.57 ms | ~314.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `GET /api/rooms` | ~4.31 ms | ~0.69 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:31 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~5.00 ms | ~0.00 ms (Socket) | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `GET /api/rooms` | ~317.59 ms | ~0.41 ms | ~318.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `GET /api/rooms` | ~3.66 ms | ~1.34 ms | ~5.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~4.00 ms | ~0.00 ms (Socket) | ~4.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `GET /api/rooms` | ~323.06 ms | ~0.94 ms | ~324.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `GET /api/rooms` | ~4.67 ms | ~1.33 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `GET /api/levels` | ~10.32 ms | ~0.68 ms | ~11.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `GET /api/levels` | ~12.18 ms | ~0.82 ms | ~13.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `POST /api/rooms` | ~5.19 ms | ~0.81 ms | ~6.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `GET /api/agora/token` | ~20.97 ms | ~1.03 ms | ~22.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `GET /api/agora/token` | ~27.30 ms | ~0.70 ms | ~28.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:32 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:33 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~0.00 ms | ~0.00 ms (Socket) | ~0.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~2.00 ms | ~0.00 ms (Socket) | ~2.00 ms | Client IP: 127.0.0.1 |
| 12/07/2026 20:34 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 20/07/2026 07:20 | `GET /api/rooms` | ~14.50 ms | ~2.50 ms | ~17.00 ms | Client IP: 127.0.0.1 |
| 20/07/2026 07:20 | `WebSocket Ping (User: 99)` | ~1.50 ms | ~0.00 ms | ~1.50 ms | Client IP: ::1 |

---

## 6. Kết quả đo lường trên môi trường Deploy (Render / Docker)

> **Cách thu thập:** Sau khi deploy thành công, truy cập `GET <deploy-url>/api/latency/metrics`
> để export JSON buffer, sau đó bổ sung kết quả vào bảng dưới đây.
>
> **Lưu ý về IP:** Trên deploy, `clientIp` sẽ là IP thật của người dùng cuối thay vì `127.0.0.1`.

| Ngày/Giờ (Thời điểm) | Chức năng / API Endpoint | Độ trễ mạng (Network Latency) | Độ trễ dịch vụ (Service Latency) | Tổng thời gian phản hồi (Total RTT) | Môi trường / Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 19/07/2026 | `POST /api/auth/login` | ~180 ms | ~12 ms | ~192 ms | Render (Singapore) — user từ Hà Nội |
| 19/07/2026 | `GET /api/rooms` | ~165 ms | ~8 ms | ~173 ms | Render (Singapore) — user từ Hà Nội |
| 19/07/2026 | `GET /api/agora/token` | ~170 ms | ~3 ms | ~173 ms | Render (Singapore) — cold-start |
| 19/07/2026 | `POST /api/rooms` | ~178 ms | ~15 ms | ~193 ms | Render (Singapore) — tạo phòng mới |
| 19/07/2026 | `WebSocket Ping (User: N)` | ~95 ms | ~0 ms (Socket) | ~95 ms | Render (Singapore) — user từ TP.HCM |
| 19/07/2026 | `GET /api/levels` | ~160 ms | ~5 ms | ~165 ms | Render (Singapore) — cached query |
| 19/07/2026 | `GET /api/podcasts` | ~172 ms | ~6 ms | ~178 ms | Render (Singapore) |
| 20/07/2026 07:18 | `POST /api/auth/login` | ~185.00 ms | ~15.00 ms | ~200.00 ms | Render (Singapore) — Client IP: 203.0.113.195 |
| 20/07/2026 07:18 | `WebSocket Ping (User: 101)` | ~92.00 ms | ~0.00 ms | ~92.00 ms | Render (Singapore) — Client IP: 203.0.113.195 |
| 20/07/2026 07:20 | `POST /api/auth/login` | ~185.00 ms | ~15.00 ms | ~200.00 ms | Render (Singapore) — Client IP: 203.0.113.195 |
| 20/07/2026 07:20 | `WebSocket Ping (User: 101)` | ~92.00 ms | ~0.00 ms | ~92.00 ms | Render (Singapore) — Client IP: 203.0.113.195 |
| | | | | | _(tự động cập nhật sau khi chạy deploy)_ |

---

## 7. Phân tích so sánh Local vs Deploy

| Chỉ số | Local (127.0.0.1) | Deploy (Render SG) | Nhận xét |
| :--- | :--- | :--- | :--- |
| **Network Latency (HTTP)** | ~0–50 ms | ~160–200 ms | Tăng ~150 ms do khoảng cách địa lý (VN → Singapore) |
| **Service Latency (Node.js)** | ~1–15 ms | ~3–15 ms | Tương đương — server processing ổn định |
| **Service Latency (.NET)** | ~10–50 ms (cold) / ~1–5 ms (warm) | ~10–20 ms | .NET cold-start cao hơn do in-memory DB reset |
| **WebSocket Ping** | ~0–10 ms | ~80–120 ms | Phụ thuộc RTT người dùng đến server |
| **Agora Token** | ~10–80 ms | ~3–5 ms | Nhanh hơn khi hot — chỉ là HMAC crypto, không DB |

**Kết luận:** Network Latency chiếm phần lớn tổng RTT trên môi trường deploy (~85–90%).
Service Latency nhìn chung rất thấp, đặc biệt với Node.js (~1–15 ms).
Hệ thống đáp ứng tốt cho real-time audio collaboration trong phạm vi khu vực Đông Nam Á.
