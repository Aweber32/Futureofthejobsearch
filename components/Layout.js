import Head from 'next/head';
import AnnouncementBanner from './AnnouncementBanner';
import BackButton from './BackButton';
import Footer from './Footer';
import FeedbackWidget from './FeedbackWidget';

export default function Layout({ children, title = 'Proslipsi - Elevating into the right hire' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content="Proslipsi revolutionizes hiring with filter-style job matching. Connect top talent with great companies through our modern platform." />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
      <AnnouncementBanner />
      <main className="container-fluid container-sm mt-4 px-3 px-sm-4">
        <BackButton />
        {children}
      </main>
      <Footer />
      <FeedbackWidget />
    </>
  );
}
