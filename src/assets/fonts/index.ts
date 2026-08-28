import localFont from 'next/font/local';

export const fontNotoSans = localFont({
  src: [
    {
      path: './NotoSans-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './NotoSans-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './NotoSans-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './NotoSans-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: './NotoSans-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-noto-sans',
});

export const fontNotoSerif = localFont({
  src: [
    {
      path: './NotoSerif-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-noto-serif',
});

export const fontNotoSansMono = localFont({
  src: [
    {
      path: './NotoSansMono-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-noto-sans-mono',
});
