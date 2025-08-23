import Head from 'next/head';
import AnnouncementBanner from './AnnouncementBanner';
import Footer from './Footer';

export default function Layout({ children, title = 'Future of the Job Search' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <AnnouncementBanner />
      <main className="container mt-4">{children}</main>
      <Footer />
    </>
  );
}
