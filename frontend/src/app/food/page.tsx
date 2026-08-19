import { redirect } from 'next/navigation';

/** Alias historique — l’accueil Food est désormais `/`. */
export default function FoodRedirectPage() {
  redirect('/');
}
