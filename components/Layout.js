import Head from 'next/head';
import AnnouncementBanner from './AnnouncementBanner';
import Footer from './Footer';

export default function Layout({ children, title = 'Future of the Job Search' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content="Modern job search platform connecting employers with talented candidates" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
      <AnnouncementBanner />
      <main className="container-fluid container-sm mt-4 px-3 px-sm-4">{children}</main>
      <Footer />
    </>
  );
}
