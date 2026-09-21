# Supabase 설정 가이드

## 1. SQL 스키마 적용
1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **SQL Editor** → New query
3. [`migrations/001_init.sql`](./migrations/001_init.sql) 전체 내용을 붙여넣고 Run
4. [`migrations/002_ensure_workspace.sql`](./migrations/002_ensure_workspace.sql) Run (기존 가입자 백필 + Realtime)
5. [`migrations/003_create_workspace.sql`](./migrations/003_create_workspace.sql) Run (워크스페이스 생성 RLS)
6. [`migrations/004_product_features.sql`](./migrations/004_product_features.sql) Run (월 예산, 반복 거래, 프로필 RLS)
7. [`verify.sql`](./verify.sql) 로 함수·테이블 존재 확인

초대·정산 2인 확인은 [`SMOKE.md`](./SMOKE.md) 를 따릅니다.

## 2. Kakao 로그인
1. Authentication → Providers → **Kakao** 활성화
2. Kakao Developers에서 Redirect URI 추가:
   - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. Supabase Redirect URLs에 프론트 콜백 추가:
   - `http://localhost:3000/auth/callback`
4. Kakao 앱 키는 **REST API 키**를 Supabase client_id에 넣습니다.
5. `account_email` 동의는 Kakao 비즈 앱 + 동의 항목이 필요합니다.

## 3. 환경 변수
`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

anon key는 JWT(`eyJ`로 시작)여야 합니다.

## 4. Realtime (선택)
Database → Replication → `transactions` 테이블 활성화

## 5. 실행
```bash
npm run dev
```
프론트만으로 동작합니다. Spring Boot 백엔드는 필요 없습니다.
