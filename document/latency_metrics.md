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

| Ngày/Giờ (Thời điểm) | Chức năng / API Endpoint | Độ trễ mạng (Network Latency) | Độ trễ dịch vụ (Service Latency) | Tổng thời gian phản hồi (Total RTT) | Môi trường / Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~3.00 ms | ~0.00 ms (Socket) | ~3.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 2)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| 09/07/2026 18:20 | `WebSocket Ping (User: 1)` | ~1.00 ms | ~0.00 ms (Socket) | ~1.00 ms | Client IP: 127.0.0.1 |
| ... | ... | ... | ... | ... | ... |
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
| 20/07/2026 07:30 | `WebSocket Ping (User: 101)` | ~90 ms | ~0.00 ms | ~90.00 ms | Render (Singapore) — Client IP: 203.0.113.195 |
| 20/07/2026 07:40 | `WebSocket Ping (User: 101)` | ~90 ms | ~0.00 ms | ~90.00 ms | Render (Singapore) — Client IP: 203.0.113.195 |
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
