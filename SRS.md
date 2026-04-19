# Tài Liệu Đặc Tả Yêu Cầu Phần Mềm (Software Requirements Specification - SRS)

**Tên dự án:** Type-safe AI Data Pipeline
**Phiên bản tài liệu:** 1.0
**Mục đích tài liệu:** Phác thảo chi tiết và chuẩn hóa các yêu cầu về mặt chức năng, luồng vận hành, cũng như các giới hạn phi chức năng của hệ thống. Tài liệu này đóng vai trò như bản hợp đồng kỹ thuật dành cho đội phát triển lập trình, sinh viên chạy kiểm thử (Tester) cũng như nộp cho Giảng viên hướng dẫn môn học.

---

## 1. Giới Thiệu Tổng Quan (Introduction)

### 1.1 Mục Cơ Bản (Purpose)
Đây là một giải pháp thiết kế "Đường ống dữ liệu" (Pipeline) lai ghép sức mạnh giữa Node.js và Python. Hệ thống có nhiệm vụ cốt lõi: Tiếp nhận các câu văn tiếng Việt từ phía người sử dụng, lọc sạch các dữ liệu lỗi, dọn dẹp ngữ pháp và sau cùng đưa vào một Trí tuệ Nhân tạo Mô hình học máy (Kho dữ liệu PhoBERT) để tiên đoán cảm xúc (Sentiment Analysis) của người viết ra câu văn đó.

### 1.2 Phạm Vi và Giới Hạn (Scope)
Sản phẩm được chia tách thành mạng lưới kiến trúc Microservices gồm 2 phần độc lập:
- **Tầng Client/Engine (Viết bằng Node.js + TypeScript)**: Trực tiếp làm cổng nhận nhiệm vụ đầu tiên. Đóng vai trò thư ký phòng thủ, chặn và kiểm tra văn bản đầu vào thông qua hệ thống phân tích `Zod`, không cho rác lọt qua máy chủ AI.
- **Tầng Server AI (Viết bằng Python + FastAPI)**: Nơi chứa "Chất xám". Tiếp nhận lệnh, tiến hành thuật toán ghép dấu tiếng việt chuyên sâu và đưa vào chạy hàm phân tích trên Model Trí Nhân Tạo.

---

## 2. Yêu Cầu Chức Năng (Functional Requirements - FR)

Tập hợp những nhiệm vụ hoặc tính năng bắt buộc máy tính phải giải quyết được cho người dùng.

### FR1: Kiểm Duyệt Màn Lọc Đầu Vào (Data Validation)
- **Mô tả hành vi**: Trước khi Node.js thực sự "gửi" đoạn chat đi tính toán cảm xúc, hệ thống bắt buộc chạy lưới lọc `Zod Schema`.
- **Luật kiểm tra (Rules)**:
  - Input truyền vô bắt buộc phải chứa một khóa tên là `text` (định dạng Chữ/String).
  - Độ dài của câu văn `text` không được phép bỏ rỗng (tối thiểu lớn hơn 0).
  - Nghiêm cấm nhận vào văn bản lớn hơn 5000 ký tự để loại trừ khả năng người dùng đang gửi rác nhằm đánh sập / treo CPU server (Chống Spam).
- **Hành vi bắt lỗi**: Nếu vi phạm luật, NodeJS lập tức in màn hình lỗi (Reject/Fail Fast) chặn quy trình tại chỗ trong 0.1s thay vì truyền lên Python.

### FR2: Xác Thực Kép Tầng Hai (Dual Pydantic Validation)
- **Mô tả hành vi**: Ở máy chủ Python API, khi hứng Request, máy chủ phải lôi tiếp một khung sàng lọc `Pydantic` y hệt như bên Node.js ra chốt an ninh lại một lần nữa.
- **Mục đích của việc khai trùng lặp**: Giả sử một tin tặc dùng phần mềm (như Postman) đục thẳng bắn thư vào mặt máy chủ Python mà không thông qua nhánh cổng Node.js, Server Python vẫn cứng rắn bắt lỗi và tự vệ được.

### FR3: Giao Tiếp Liên Mạng (HTTP API Sync)
- **Mô tả hành vi**: Hệ điều phối Orchestrator của NodeJS (`pipeline.ts`) phải biết tự đóng gói thành HTTP POST gửi sang Server của FastAPI kèm Header JSON. Code phải xử lý được "Bắt lỗi mạng từ chối kết nối" (Try/Catch) nếu Server Python chưa bật.

### FR4: Tiền Xử Lý Dấu Câu Tiếng Việt (Vietnamese Word Segmentation)
- **Mô tả hành vi**: Dịch vụ phải có khả năng lôi bộ thư viện cắt chữ `PyVi` để khôi phục cấu trúc văn phạm hệ tiếng Tiếng Việt (do Tiếng Việt có từ ghép rời cấu tạo thành 1 ý nghĩa).
- **Quy tắc bắt buộc**: Nếu nhập `"Tôi mua điện thoại"`, hệ thống tự phát hiện chữ điện và chữ thoại là một thuật ngữ, máy sẽ biến thành mảng `"Tôi mua điện_thoại"` trước khi cấp vào kho AI Model.

### FR5: Tiên Đoán Cảm Xúc Sử Dụng Mạng Nơron PhoBERT (AI Inference)
- **Mô tả hành vi**: Vận chuyển dữ liệu đã cắt cấu trúc vào mô hình Tensor lõi siêu lớn.
- **Dữ liệu đầu ra yêu cầu**: Hệ thống AI phải nhả lại được file JSON có chứa rành mạch 2 tham số:
  - `label`: Trả về Cảm xúc `"positive"`, `"negative"`, hoặc `"neutral"`.
  - `confidence`: Tính chính xác điểm số theo tỷ lệ % từ `0.00 -> 1.00`. Tính toán thời gian phản hồi bằng mili/giây (ms).

---

## 3. Yêu Cầu Phi Chức Năng (Non-Functional Requirements - NFR)

Tập hợp những giới hạn chất lượng liên quan tới Tối ưu hóa, Phần cứng, và Tốc độ. Rất quan trọng ở các môn học Kiến trúc Máy tính.

### NFR1: Quản Trị Bộ Nhớ Lõi RAM (Memory Lifecycle Management)
- Do mô hình PhoBERT là một file ma trận tĩnh nặng gấn **540 MB**. Hệ thống **KHÔNG ĐƯỢC PHÉP** chạy lệnh load lại mô hình ném vào não RAM mỗi khi có ông khách gửi một câu hỏi.
- **Bắt buộc**: File Model chỉ load từ ổ cứng sang bộ nhớ RAM **đúng 1 LẦN DUY NHẤT** vào giây phút bật chạy lệnh server (Áp dụng FastAPI Lifespan Startup), sau đó phải Cache giữ nó nổi vĩnh viễn trên RAM để đẩy tốc độ trả lời lên cao.

### NFR2: Chuẩn Hiệu Năng Thời Gian (Performance Standard)
- Một câu gửi test dưới tầm 100 chữ nếu chạy bằng CPU Intel/Mac thông thường thì tốc độ AI suy luận không được vượt qua đè ngưỡng 1,5 giây (1500ms) để mang lại cảm giác chạy mượt (Real-time interaction).

### NFR3: Tính Đóng Gói (Portability & Reproducibility)
- Sinh viên có khả năng nén Zip hoặc đẩy cả khối Git này đưa sang máy Macbook hay Windows của giảng viên chấm điểm. Miễn là máy thầy cô dùng lệnh `npm install` (ứng với `package.json`) và `pip install -r requirements.txt`, phần mềm bắt buộc phải tự khởi tạo tái sinh hoàn hảo các thư viện môi trường ngầm không bị gãy (Crash).

### NFR4: Bảo Mật Cấu Trúc (Type-Safe Synchronization Integrity)
- Mọi sửa đổi thêm cột biến trong `PredictRequest` (Pydantic ở nhánh AI Python) thì bắt buộc Engineer phải tự động bằng tay nhảy qua mở nhánh Node.js để update vào `Schemas.ts (Zod)`. Mọi phiên bản nếu trượt biến số schema sẽ vi phạm tiêu chuẩn làm việc nhóm.

---

## 4. Giao Diện Liên Kết (Interfaces & API)

1. **Giao Diện Máy Chủ API**: FastAPI mở cổng cố định trên `TCP Port 8000`.
2. **Ping Sức Khỏe (Health Check)**: Khai báo điểm giao tiếp `GET /health` để các hệ thống màn hình tự động chọc vào hỏi xem AI Model 540MB đã được load xong vào máy tính chưa? Tránh gửi văn bản lúc máy đang khởi động nặng CPU.
3. **Giao Diện Thao Tác (UI / Command Line)**: Hiện tại người dùng thực thi thông qua bảng đen lệnh Command Line Terminal, trải nghiệm chữ trả về thông qua chuẩn Log màn hình phân tách nội dung rõ ràng của NodeJS truyền xuống. Thích hợp làm Base cho đội lập trình FrontEnd viết App React sau này đắp lên!
