import Header from './Header';
import Footer from './Footer';

export default function SiteLayout({ children }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header />
      {/* Reserves the viewport while a page's code loads, so the footer never flashes up and then jumps down (layout shift). */}
      <div className="sk-route">{children}</div>
      <Footer />
    </>
  );
}
