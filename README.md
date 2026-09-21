# PocketFree

부부·가족 가계부. Next.js App Router + Supabase (Auth/Kakao, Postgres RLS).

## 준비

1. [Supabase](https://supabase.com/dashboard) 프로젝트 생성
2. SQL Editor에서 아래를 **순서대로** 실행
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_ensure_workspace.sql` (기존 계정 백필, 없으면 홈이 비어 보일 수 있음)
   - `supabase/migrations/003_create_workspace.sql` (워크스페이스 생성 RLS)
   - `supabase/migrations/004_product_features.sql` (월 예산, 반복 거래, 프로필 RLS)
3. `supabase/verify.sql` 로 함수·테이블이 있는지 확인
4. Kakao 로그인: `supabase/README.md` 참고
5. 초대·정산 2인 확인: `supabase/SMOKE.md`

```bash
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 입력
npm install
npm run dev
```

브라우저에서 http://localhost:3000

anon key는 `eyJ` 로 시작하는 JWT여야 합니다. 프로젝트 ref 문자열을 넣으면 로그인 루프가 납니다.

## 주요 기능

- 카카오 로그인, 개인/공유 워크스페이스, 초대 링크
- 거래 추가·수정·삭제, 홈 기간 요약, 달력, 카테고리 통계
- 카테고리 월 예산, 반복 거래(앱 오픈 시 해당 월 자동 생성)
- 기간별 CSV 내보내기, 닉네임 수정, 1/N 정산(선택한 달)

프론트만으로 동작합니다. Spring Boot는 필요 없습니다.

## 탭 URL

하단 탭은 `/?tab=home|stats|calendar|settings` 로 유지됩니다.
