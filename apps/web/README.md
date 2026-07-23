# Phỏng vấn IT Web

Frontend Next.js cho nền tảng luyện phỏng vấn IT bằng tiếng Việt. Ứng dụng gồm landing page public, trang học câu hỏi, phòng luyện tập, mock interview, pricing, account, auth và admin.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript strict
- Tailwind CSS v4
- Zustand
- Axios client dùng cookie refresh token
- lucide-react
- react-intersection-observer cho animation vào viewport

## Visual Direction

Thiết kế hiện tại đi theo hướng dark technical cockpit: rõ ràng, tập trung, ít màu phụ, dùng Be Vietnam Pro để đọc tiếng Việt tốt.

Public landing/pricing dùng một lớp nhận diện giàu hình ảnh hơn:

- nền chung `#0f172a` / `rgb(15, 23, 42)`,
- glow tím-trắng dịu ở mép trên hoặc mép dưới,
- background image trong `public/images/landing-redesign/`,
- glassmorphism cho button, card, pill topic,
- header lớn có thể dùng `text-edge-fade` và `landing-heading-gradient`,
- animation mượt bằng opacity + transform.

UI sản phẩm bên trong vẫn ưu tiên token trong `src/app/globals.css`: nền tối, surface charcoal, border mỏng, accent tím, trạng thái success/danger riêng.

## Landing Structure

Homepage hiện tại gồm:

1. `Hero` với background image và CTA glass.
2. `TopicsPreview` nằm trong `Hero`, dạng pill marquee chạy từ phải sang trái.
3. `FeaturesSection` với background workflow thay đổi theo feature và tự chuyển sau 10 giây.
4. `QuestionBankShowcase` dùng hình nền ngân hàng câu hỏi.
5. `Footer` cùng tone slate-purple.

Không dùng lại `hero-bg.png`, `HowItWorks`, hoặc CTA section cũ cho landing.

## Run

Từ root monorepo:

```bash
npm run web:dev
npm run web:build
npm run web:test
```

## Docs

- `../../DESIGN.md`: design system và visual language tổng quan.
- `AGENTS.md`: quy tắc kỹ thuật và styling riêng cho frontend.
