# Giải Thích Thư Mục `app`

Chào các bạn sinh viên yêu thích Python! Trong thế giới kiến trúc code Python, đặc biệt là khi dùng nền tảng tạo máy chủ mới nổi tên là FastAPI thì cấu trúc ngầm luôn khuyên lập trình viên nên "nhốt riêng" các đoạn code não bộ của mình vào một chiếc hòm gọi tên là thư mục `app` (Application - Ứng dụng).

- Trong cấu trúc quản trị của Python, thư mục này được coi là một **"Gói Mã Nguồn"** (Package).
- `app/` sẽ dồn chứa toàn bộ tập hợp những tinh hoa liên quan tới trí tuệ nhân tạo của bài Lab: từ kịch bản chạy module học máy Transformer PhoBERT, cho đến thuật toán tự bóc tách chuỗi ngôn ngữ PyVi, và không thể thiếu là ông Lễ tân FastAPI đang trực tiếp canh cửa đón luồng dữ liệu ạt đi vào từ bên mảng NodeJS. 
- Lợi ích của việc làm sạch tươm tất, cô lập mọi thứ logic tinh túy giấu vào lòng thư mục `app/` như đồ án mẫu này là để sau này bọn em dễ dàng tạo ra phiên bản công ty, đóng gói chọc vô mấy hộp ảo hoá (như Docker) được mượt mà hơn gấp trăm lần so với việc để file nằm phơi vãi la liệt bên ngoài.
