import { Routes } from '@/routes';
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect(Routes.KeywordPro);
}
