import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pocketfree.app',
  appName: 'PocketFree',
  webDir: 'public',
  server: {
    url: 'https://only-escape-hope-front.vercel.app',
    cleartext: true,
    allowNavigation: [
      'only-escape-hope-front.vercel.app',
      '*.supabase.co',
      '*.kakao.com',
    ],
  },
};

export default config;
