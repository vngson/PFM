# Chính sách bảo mật

> Phiên bản 1.0 — Có hiệu lực từ 04/08/2026

Chính sách bảo mật này giải thích cách Personal Finance Manager (PFM) thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu cá nhân của bạn theo Nghị định 13/2023/NĐ-CP của Chính phủ Việt Nam về bảo vệ dữ liệu cá nhân (PDPD).

## 1. Người kiểm soát dữ liệu

Người kiểm soát dữ liệu cá nhân của bạn là cá nhân/văn phòng vận hành PFM. Liên hệ qua email được công bố trên trang chủ.

## 2. Loại dữ liệu được thu thập

PFM xử lý các loại **dữ liệu cá nhân** sau:

- **Dữ liệu định danh**: tên đăng nhập, địa chỉ email
- **Dữ liệu tài chính** (dữ liệu cá nhân nhạy cảm theo Điều 2 Khoản 5 PDPD):
  - Giao dịch thu chi (số tiền, danh mục, tài khoản, ghi chú, ngày)
  - Tài khoản tài chính (tên, loại tiền tệ, số dư)
  - Danh mục chi tiêu
  - Ngân sách định kỳ
  - Giao dịch định kỳ

## 3. Mục đích xử lý

Dữ liệu của bạn được xử dụng **chỉ** cho các mục đích sau:

- Cung cấp tính năng quản lý tài chính cá nhân
- Tạo báo cáo, biểu đồ thu chi theo yêu cầu của bạn
- Đồng bộ giữa các thiết bị khi bạn đăng nhập

Chúng tôi **không** sử dụng dữ liệu cho quảng cáo, phân tích hành vi, hoặc chia sẻ cho bên thứ ba.

## 4. Cơ sở pháp lý

Việc xử lý dữ liệu dựa trên **sự đồng ý** của bạn (Điều 9 PDPD). Bạn có thể thu hồi đồng ý bằng cách xóa tài khoản.

## 5. Thời gian lưu trữ

Dữ liệu được lưu trữ cho đến khi bạn **yêu cầu xóa tài khoản**. Trong vòng 30 ngày sau khi xóa, bạn có thể đăng nhập lại để khôi phục. Sau 30 ngày, dữ liệu bị xóa vĩnh viễn.

## 6. Quyền của bạn

Theo Điều 14 PDPD, bạn có các quyền:

- **Quyền truy cập**: xem dữ liệu của bạn trong ứng dụng
- **Quyền chỉnh sửa**: sửa giao dịch, danh mục, tài khoản
- **Quyền xóa**: yêu cầu xóa tài khoản
- **Quyền xuất dữ liệu**: tải JSON đầy đủ dữ liệu trong **Cài đặt → Xuất dữ liệu**
- **Quyền khiếu nại**: gửi khiếu nại tới cơ quan có thẩm quyền

## 7. Bảo mật

- Mật khẩu được hash bằng **bcrypt** (qua Supabase Auth)
- Kết nối qua **HTTPS** bắt buộc
- Row Level Security (RLS) chặn mọi truy cập giữa các user
- Session JWT lưu trong httpOnly cookie
- Bạn nên dùng mật khẩu mạnh và bật xác thực hai yếu tố nếu email provider hỗ trợ

## 8. Thay đổi chính sách

Mọi thay đổi chính sách sẽ được thông báo qua email và yêu cầu bạn đồng ý lại. Phiên bản cũ được lưu trong hồ sơ đồng ý (`consent_records`).

## 9. Liên hệ

Mọi câu hỏi về quyền riêng tư gửi về email công bố trên trang chủ.