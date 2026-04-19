# Hướng Dẫn Chi Tiết Dành Cho Sinh Viên (Phần Engine - Node.js)

Chào các bạn sinh viên năm 2! Đây là tài liệu giải thích chi tiết về cấu trúc và các thành phần của thư mục `engine/`. Thư mục này chứa mã nguồn TypeScript (Node.js) đóng vai trò là khối xử lý trung tâm (orchestrator), tiếp nhận dữ liệu đầu vào, kiểm tra tính hợp lệ và giao tiếp với phía AI Service.

## 1. Các File Quản Lý Thư Viện Node.js (Hệ Sinh Thái Module)

Khi làm code bằng **Node.js**, các bạn sẽ thường xuyên bắt gặp 3 thành phần sau. Đây là cơ chế quản lý thư viện (Package Management):

* **`package.json`**:
   - **Định nghĩa**: Được xem là "Chứng minh thư" của dự án.
   - **Chức năng**: Khai báo siêu dữ liệu (tên dự án, phiên bản tác giả). Nó định nghĩa các câu lệnh khởi chạy ngắn gọn (ở phần `"scripts"` như `npm run dev`, `npm start`). Quan trọng nhất: nó ghi chú danh sách các thư viện mã nguồn mở cần tải về để code chạy được (ví dụ như `zod`, `typescript`) dưới mục `"dependencies"`.

* **`package-lock.json`**:
   - **Định nghĩa**: File khoá phiên bản tự động.
   - **Chức năng**: Cố định (lock) chính xác phiên bản của từng thư viện bạn cài và mọi thư viện con của chúng. Chẳng hạn, thư viện `zod` tải về bản `3.21.4`, nó sẽ ghi chặt vào đây để khi bạn hoặc một người bạn khác tải code về gõ lệnh `npm install`, máy cũng tiếp tục tải chuẩn bản `3.21.4`, tránh lỗi xung đột do cập nhật phiên bản. **File này tự sinh ra và bạn không cần (không nên) sửa bằng tay.**

* **Thư mục `node_modules/`**:
   - **Định nghĩa**: Nơi lưu trữ bộ nhớ thực tế của các tài nguyên thư viện mạng.
   - **Chức năng**: Khi bạn gõ `npm install`, phần mềm quản lý gói của NodeJS (NPM) sẽ vào Internet, tải toàn bộ mã nguồn của các thư viện khai báo trong file `package.json` về rồi vứt toàn bộ vào thư mục này. Nhờ đó code của bạn mới có thể "import" và xài.
   - **Lưu ý Cực Kỳ Quan Trọng**: Thư mục này vô cùng nặng và có thể hàng trăm Megabyte, và có cơ chế tự động tải bất cứ lúc nào nên sinh viên **tuyệt đối không tải (push) thư mục này lên GitHub**. Sẽ có một file `.gitignore` ẩn đi thư mục này đi để Git không bắt lầm.

* **`tsconfig.json`**:
   - **Định nghĩa**: File cấu hình dành riêng cho ngôn ngữ TypeScript.
   - **Chức năng**: Cho trình biên dịch biết cách dịch toàn bộ code TypeScript (ngôn ngữ có kiểu dữ liệu tĩnh mạnh mẽ) ra file JavaScript thông thường để Runtime NodeJS đọc được và chạy.

---

## 2. Cấu Trúc Thư Mục Mã Nguồn (`src/`)

Đây là nơi tập trung cho phép bạn trực tiếp viết logic của phần mềm. Mã nguồn (source code) được tách file (modules) theo nguyên lý thiết kế rất kỹ để code không bị dính chùm khó sửa:

* **`schemas.ts`**:
  - Dùng thư viện có tên là `zod` để định nghĩa rõ "Khung Dữ Liệu đầu vào/đầu ra phải có hình dạng như thế nào". Ví dụ kiểm tra dữ liệu vào có phải kiểu chuỗi văn bản không? Có rỗng không? Dữ liệu bị sai chuẩn sẽ bị chối ngay ở file này thay vì cố truyền đi làm hỏng server AI ở Python.

* **`ai-client.ts`**:
  - Đóng vai trò như một "Người Đưa Thư" trên Network (HTTP Client). Do module này với Python AI là 2 chương trình phân biệt lập, chúng ta cần nó gom dữ liệu người dùng thành các POST Request HTTP gửi qua máy chủ AI Server, rồi chớp lấy kết quả AI phản hồi mang về lại chương trình TypeScript.

* **`pipeline.ts`**:
  - Bộ phận cốt lõi (Orchestrator / Pipeline - Lộ trình thực thi). Nó cầm nhịp kịch bản điểu khiển toàn luồng thông tin: Nhận Input thô → đưa cho `schemas.ts` kiểm duyệt → Pass thì đưa cho `ai-client.ts` gửi lên não AI xử lý → Lấy output về báo thành công hoặc báo lỗi cho toàn hệ thống.

* **`index.ts`**:
  - File chạy đầu tiên (Entry Point) của phần Engine. Chứa những dòng để kích hoạt mọi đoạn code kia, và chạy một bản Demo giả lập đầu vào để mọi người có thể hình dung ra hệ thống đang phản hồi và in kết quả ra Text. Mọi dòng lệnh `npm start` đều trực tiếp kích hoạt khởi chạy dòng lệnh ở file này!
