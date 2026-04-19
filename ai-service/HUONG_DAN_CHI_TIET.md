# Hướng Dẫn Chi Tiết Dành Cho Sinh Viên (Phần AI Service - Python)

Chào các bạn sinh viên năm 2! Tài liệu này sẽ đi sâu vào kiến trúc phần dịch vụ Trí Tuệ Nhân Tạo được cài đặt bằng nền tảng **Python**. 
Nhiệm vụ chính của dịch vụ máy chủ độc lập này là lắng nghe các HTTP (yêu cầu mạng) lấy ra dữ liệu văn bản từ cục Engine (Node.js), tiến hành các phương pháp từ tiền xử lý ngôn ngữ học đến vận chuyển vào bộ não Mạng Nơ ron và bắn kết quả trở lại.

## 1. Quản Lý Thư Viện Python (Hệ Sinh Thái Môi Trường)

Python có một quy tắc quản trị thư viện tương tự nhưng khác biệt kỹ thuật so với NodeJS:

* **File `requirements.txt`**:
   - **Định nghĩa**: File liệt kê một chiều tất cả các "dependency" (thư viện bên thứ 3) mà ứng dụng Python của bạn cần.
   - **Chức năng**: Cực kỳ giống với mục `"dependencies"` trong file `package.json` của NodeJS. Các thư viện AI phức tạp như `fastapi` (phần mềm tạo API web), `uvicorn`, hay `torch` (Thư viện Deeplearning tensor). Khi nộp bài hoặc mượn code của bạn, chỉ cần chạy đúng `pip install -r requirements.txt` là công cụ PIP sẽ tự lên mạng cài cho đúng y bộ môi trường như máy trước.

* **Môi Trường Ảo (Virtual Environment - `venv` hoặc `.venv`)**:
   - **Định nghĩa**: Một khu vực hoàn toàn cách ly chứa trình thông dịch Python và các thư viện chuyên biệt riêng cho dự án nay.
   - **Chức năng**: Khác với thư mục `node_modules` tải về phát ăn ngay trong dự án, thư viện cài qua pip của Python nếu không có thiết lập thường sẽ bị vứt thẳng vào thư mục hệ thống hệ điều hành (lộ thiên Global). Như vậy khi có các môn học dùng nhiều dự án cùng lúc, các phiên bản thư viện sẽ bị đè bẹp, gây "xung đột phiên bản". Các bạn luôn được yêu cầu tạo vòng bảo vệ là môi trường ảo (`python -m venv .venv`). Do đó sau khi Activate thư mục ẩn này, các file tải bằng pip mới chảy vào lưu trí trong vòng dự án.
   - **Lưu ý**: Tương tự như hệ `node_modules`, các folder chứa thư viện nặng như `.venv` **tuyệt đối không được tải lên Github**.

* **Cấu hình `run.py`**:
   - Đây là lệnh kích nổ máy chủ Web App framework ASGI (Uvicorn), làm nhiệm vụ lưu trữ các module để trực tổng đài túc trực và hứng dữ liệu liên hoàn từ port API mạng cục bộ (thường là 8000) vào máy nhà (Localhost).

---

## 2. Cấu Trúc Mã Nguồn Lệnh (`app/`)

Thư mục quan trọng gói các logic của trí tuệ nhân tạo và logic chuyển hướng luồng dữ liệu API:

* **`main.py`**: 
  - Đóng vai trò là cô/chú "Lễ tân" của ứng dụng! API Web sử dụng công nghệ của FastAPI được khỏi động và tạo ra các địa chỉ endpoint (như `POST /predict`). Người tiếp tân này đứng hứng gói tin được gửi tới, hướng dẫn gọi các file kiểm tra, chạy phân tích AI, rồi gộp tạo dữ liệu đầu ra phản hồi.

* **`schemas.py`**:
  - Ánh xạ lại y hệt thiết kế bảo mật của `schemas.ts` bên Typescript. Được dùng sức mạnh chuẩn hóa từ module `Pydantic`. Chức năng là giúp báo lỗi, bắt khách hàng bên ngoại (Client) phải bỏ vào cấu trúc Data chuẩn (không thể gửi vào Text bị lỗi / hay thiếu các trường bắt buộc). Nếu đúng chuẩn định dạng thì mới được vào khu xử lý cao cấp nhằm tránh phần mềm AI chết đơ.

* **`segmentation.py`**:
  - "Xử Lý Dữ Liệu Học Tự Nhiên Tiếng Việt"
  - Máy tính thường hiểu nhầm các cụm từ ghép đặc thù tiếng việt. Ví dụ chữ "sản phẩm" bản chất được máy dịch là 2 điểm từ "sản" + "phẩm". Nên nếu ném như vậy vô AI, độ chính xác nhận diện nội dung câu cực thấp. 
  - Module `segmentation` (áp dụng thư viện mã nguồn mở `PyVi` ra đời cho bài toán trên) dùng các quy luật chuyên rà quét lại chữ, và dán lại bằng gạch dưới là thành một biểu thức ngữ nghĩa: `sản_phẩm`! 

* **`model.py`**:
  - "Bộ Não Deep Learning Trọng Tâm". 
  - Ứng dụng công nghệ xử lý dữ liệu bằng Transformer (thư viện HuggingFace). Tải một Mạng Mô hình học ngôn ngữ kích thước lớn gọi là `vinai/phobert-base` do VinAI phát hành dành riêng cho mảng tiếng Việt.
  - Text đã được PyVi gắn kết đoạn ở bên trên sẽ được luân chuyển vào đây và đi qua nhiều quá trình tính nhẩm phân cấp hàng nghìn tham số toán học ma trận (Inference) từ đó dự đoán được phân loại nội dung này thuộc mục (Cảm xúc: Tích cực / Tiêu cực / Trung Tính). Phản hồi kết quả ngược về `main.py` báo cáo cho Client!
