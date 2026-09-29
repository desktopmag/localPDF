import usePageSeo from '@/hooks/usePageSeo';

/**
 * Client-side SEO for SPA routes (title, description, canonical, Open Graph, Twitter).
 */
export default function Seo(props) {
  usePageSeo(props);
  return null;
}
