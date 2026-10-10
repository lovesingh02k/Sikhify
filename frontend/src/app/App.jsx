import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import SiteLayout from '../components/layout/SiteLayout.jsx';
import ErrorBoundary from '../components/status/ErrorBoundary.jsx';
import PageLoader from '../components/status/PageLoader.jsx';
import { COMING_SOON } from '../data/comingSoon.js';
import { useTrackClientNavigation, needsFreshDocument, reloadAsFreshDocument, RouteScrollReset } from './navigation.js';
import { RequireAuth, RequireCapability } from './guards.jsx';
import { CONTENT_TYPES, TYPE_BY_PATH } from '../../../shared/contentTypes.js';

// Each page (and the data it needs) is its own chunk, so a visit downloads only that page.
/* Existing Sikhify pages (HTML + controllers) */
const Home = lazy(() => import('../pages/Home.jsx'));
const Learn = lazy(() => import('../pages/Learn.jsx'));
const Gurbani = lazy(() => import('../pages/Gurbani.jsx'));
const Nitnem = lazy(() => import('../pages/Nitnem.jsx'));
const Hukamnama = lazy(() => import('../pages/Hukamnama.jsx'));
const SikhHistory = lazy(() => import('../pages/SikhHistory.jsx'));
const RehatMaryada = lazy(() => import('../pages/RehatMaryada.jsx'));
const FAQ = lazy(() => import('../pages/FAQ.jsx'));
const SikhMedia = lazy(() => import('../pages/SikhMedia.jsx'));
const Sitemap = lazy(() => import('../pages/Sitemap.jsx'));
const ComingSoon = lazy(() => import('../pages/ComingSoon.jsx'));
const NotFound = lazy(() => import('../pages/NotFound.jsx'));

/* React pages */
const VideoPage = lazy(() => import('../pages/Media/VideoPage.jsx'));
const GurusIndex = lazy(() => import('../pages/Gurus/GurusIndex.jsx'));
const GuruProfile = lazy(() => import('../pages/Gurus/GuruProfile.jsx'));
const DirectoryHub = lazy(() => import('../pages/Directory/DirectoryHub.jsx'));
const DirectoryList = lazy(() => import('../pages/Directory/DirectoryList.jsx'));
const EntryDetail = lazy(() => import('../pages/Directory/EntryDetail.jsx'));
const SubmitPage = lazy(() => import('../pages/Directory/SubmitPage.jsx'));
const ImageCredits = lazy(() => import('../pages/ImageCredits.jsx'));
// File named neutrally: ad/cookie blockers (e.g. Brave Shields) block scripts called "PrivacyPolicy".
const PrivacyPolicy = lazy(() => import('../pages/YourData.jsx'));
const About = lazy(() => import('../pages/About.jsx'));
const FestivalsIndex = lazy(() => import('../pages/Festivals/FestivalsIndex.jsx'));
const FestivalDetail = lazy(() => import('../pages/Festivals/FestivalDetail.jsx'));
const GurdwaraSearch = lazy(() => import('../pages/Gurdwaras/GurdwaraSearch.jsx'));
const GurdwaraDetail = lazy(() => import('../pages/Gurdwaras/GurdwaraDetail.jsx'));
const GurdwaraSuggest = lazy(() => import('../pages/Gurdwaras/GurdwaraSuggest.jsx'));

const Login = lazy(() => import('../pages/Auth/Login.jsx'));
const Signup = lazy(() => import('../pages/Auth/Signup.jsx'));
const ResetPassword = lazy(() => import('../pages/Auth/ResetPassword.jsx'));

const Feed = lazy(() => import('../pages/Community/Feed.jsx'));
const Discover = lazy(() => import('../pages/Community/Discover.jsx'));
const Groups = lazy(() => import('../pages/Community/Groups.jsx'));
const GroupForm = lazy(() => import('../pages/Community/GroupForm.jsx'));
const GroupPage = lazy(() => import('../pages/Community/GroupPage.jsx'));
const GroupMembers = lazy(() => import('../pages/Community/GroupMembers.jsx'));
const PostPage = lazy(() => import('../pages/Community/PostPage.jsx'));
const Profile = lazy(() => import('../pages/Community/Profile.jsx'));
const Saved = lazy(() => import('../pages/Community/Saved.jsx'));
const Notifications = lazy(() => import('../pages/Community/Notifications.jsx'));
const AccountSettings = lazy(() => import('../pages/Community/AccountSettings.jsx'));

const AdminLayout = lazy(() => import('../pages/Admin/AdminLayout.jsx'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard.jsx'));
const AdminUsers = lazy(() => import('../pages/Admin/Users.jsx'));
const AdminPosts = lazy(() => import('../pages/Admin/Posts.jsx'));
const AdminComments = lazy(() => import('../pages/Admin/Comments.jsx'));
const AdminGroups = lazy(() => import('../pages/Admin/Groups.jsx'));
const AdminReports = lazy(() => import('../pages/Admin/Reports.jsx'));
const AdminSubmissions = lazy(() => import('../pages/Admin/Submissions.jsx'));
const AdminContent = lazy(() => import('../pages/Admin/Content.jsx'));
const AdminEntryEditor = lazy(() => import('../pages/Admin/EntryEditor.jsx'));
const AdminMedia = lazy(() => import('../pages/Admin/Media.jsx'));
const AdminHukamnamaList = lazy(() => import('../pages/Admin/HukamnamaList.jsx'));
const AdminHukamnamaEditor = lazy(() => import('../pages/Admin/HukamnamaEditor.jsx'));
// Named neutrally: ad blockers block scripts called "Analytics".
const AdminAnalytics = lazy(() => import('../pages/Admin/SiteStats.jsx'));
const AdminSettings = lazy(() => import('../pages/Admin/Settings.jsx'));
const AdminGurdwaras = lazy(() => import('../pages/Admin/Gurdwaras.jsx'));
const AdminGurdwaraEditor = lazy(() => import('../pages/Admin/GurdwaraEditor.jsx'));
const AdminFestivals = lazy(() => import('../pages/Admin/FestivalsList.jsx'));
const AdminFestivalEditor = lazy(() => import('../pages/Admin/FestivalEditor.jsx'));
const AdminBanners = lazy(() => import('../pages/Admin/Banners.jsx'));
const AdminBannerEditor = lazy(() => import('../pages/Admin/BannerEditor.jsx'));

const LEGACY_PAGES = [
  ['/', Home],
  ['/learn-sikhism', Learn],
  ['/gurbani', Gurbani],
  ['/nitnem', Nitnem],
  ['/hukamnama', Hukamnama],
  ['/sikh-history', SikhHistory],
  ['/rehat-maryada', RehatMaryada],
  ['/faq', FAQ],
  ['/sikh-media', SikhMedia],
  ['/sitemap', Sitemap],
];

/** Short and legacy URLs → canonical pages (search and hash are kept). */
const REDIRECTS = [
  ['/media', '/sikh-media'], ['/learn', '/learn-sikhism'], ['/history', '/sikh-history'], ['/rehat', '/rehat-maryada'],
  ['/signin', '/login'], ['/kids-zone', '/kids'], ['/sikh-calendar', '/festivals'],
];

/** Legacy `page.html` URLs (from the original static site) keep working. */
const legacy = (path) => (path === '/' ? '/index.html' : `${path}.html`);

/**
 * Legacy pages need a fresh document (their controllers attach global
 * listeners). After any client-side path change, reload instead of rendering.
 */
function Legacy({ component: Page, ...props }) {
  const fresh = !needsFreshDocument();
  useEffect(() => { if (!fresh) reloadAsFreshDocument(); }, [fresh]);
  return fresh ? <Page {...props} /> : <PageLoader />;
}

/** Redirect that keeps ?search and #hash; legacy targets get a full load. */
function Redirect({ to }) {
  const { search, hash } = useLocation();
  const target = to + search + hash;
  const react = ['/login', '/kids', '/community', '/festivals'].some((p) => to.startsWith(p));
  useEffect(() => { if (!react) window.location.replace(target); }, [react, target]);
  return react ? <Navigate to={target} replace /> : <PageLoader />;
}

/** /artist/:id → the artist view on the Kirtan & Katha page. */
function ArtistRedirect() {
  const { id } = useParams();
  useEffect(() => { window.location.replace('/sikh-media#artist=' + encodeURIComponent(id)); }, [id]);
  return <PageLoader />;
}

/** Old directory URLs (/gurdwaras, /gurdwaras/:slug) → the Global Gurdwara Directory (an old slug becomes a search). */
function OldGurdwaraRedirect() {
  const { slug } = useParams();
  const { search } = useLocation();
  const q = slug ? '?q=' + encodeURIComponent(slug.replace(/-/g, ' ')) : search;
  return <Navigate to={'/directory/gurdwaras' + q} replace />;
}

/** /directory/:type → /:type (canonical short URL). */
function DirectoryTypeRedirect() {
  const { type } = useParams();
  const key = CONTENT_TYPES[type] ? type : TYPE_BY_PATH[type];
  return key ? <Navigate to={'/' + CONTENT_TYPES[key].path} replace /> : <NotFound />;
}

const admin = (capability, element) => <RequireCapability capability={capability}>{element}</RequireCapability>;

export default function App() {
  const { pathname } = useLocation();
  useTrackClientNavigation();
  const soonPaths = new Set(COMING_SOON.map((p) => p.path));
  // Moving between Gurdwara directory places (country → state → city) keeps the search page mounted
  // (and its scroll position: the search scrolls to its own results).
  const boundaryKey = /^\/directory\/gurdwaras(\/(?!suggest$)[^/]+){0,3}\/?$/.test(pathname) ? '/directory/gurdwaras' : pathname;

  return (
    <SiteLayout>
      <RouteScrollReset pageKey={boundaryKey} />
      <ErrorBoundary key={boundaryKey}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {LEGACY_PAGES.flatMap(([path, Page]) => [
              <Route key={path} path={path} element={<Legacy component={Page} />} />,
              <Route key={legacy(path)} path={legacy(path)} element={<Legacy component={Page} />} />,
            ])}
            {COMING_SOON.flatMap((page) => [
              <Route key={page.path} path={page.path} element={<Legacy component={ComingSoon} page={page} />} />,
              <Route key={legacy(page.path)} path={legacy(page.path)} element={<Legacy component={ComingSoon} page={page} />} />,
            ])}
            {REDIRECTS.filter(([from]) => !soonPaths.has(from)).map(([from, to]) => <Route key={from} path={from} element={<Redirect to={to} />} />)}

            {/* Media: in-site video pages */}
            <Route path="/media/:videoId" element={<VideoPage />} />
            <Route path="/artist/:id" element={<ArtistRedirect />} />

            {/* Knowledge platform */}
            <Route path="/gurus" element={<GurusIndex />} />
            <Route path="/gurus/:id" element={<GuruProfile />} />
            <Route path="/directory" element={<DirectoryHub />} />
            <Route path="/directory/gurdwaras" element={<GurdwaraSearch />} />
            <Route path="/directory/gurdwaras/suggest" element={<GurdwaraSuggest />} />
            <Route path="/directory/gurdwaras/:country" element={<GurdwaraSearch />} />
            <Route path="/directory/gurdwaras/:country/:state" element={<GurdwaraSearch />} />
            <Route path="/directory/gurdwaras/:country/:state/:city" element={<GurdwaraSearch />} />
            <Route path="/directory/gurdwaras/:country/:state/:city/:slug" element={<GurdwaraDetail />} />
            <Route path="/gurdwaras" element={<OldGurdwaraRedirect />} />
            <Route path="/gurdwaras/:slug" element={<OldGurdwaraRedirect />} />
            <Route path="/directory/:type" element={<DirectoryTypeRedirect />} />
            {Object.entries(CONTENT_TYPES).flatMap(([type, t]) => [
              <Route key={type} path={'/' + t.path} element={<DirectoryList type={type} />} />,
              <Route key={type + '-detail'} path={'/' + t.path + '/:slug'} element={<EntryDetail type={type} />} />,
            ])}
            <Route path="/submit" element={<SubmitPage />} />
            <Route path="/image-credits" element={<ImageCredits />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/about" element={<About />} />

            {/* Sikh Festivals & Important Days */}
            <Route path="/festivals" element={<FestivalsIndex />} />
            <Route path="/festivals/:slug" element={<FestivalDetail />} />

            {/* Accounts */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {/* "Forgot password" was removed; old links go to Sign In (admins create reset links in Admin → Users). */}
            <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Community */}
            <Route path="/community" element={<Feed />} />
            <Route path="/community/discover" element={<Discover />} />
            <Route path="/community/groups" element={<Groups />} />
            <Route path="/community/groups/new" element={<RequireAuth><GroupForm /></RequireAuth>} />
            <Route path="/community/groups/:slug" element={<GroupPage />} />
            <Route path="/community/groups/:slug/members" element={<GroupMembers />} />
            <Route path="/community/groups/:slug/settings" element={<RequireAuth><GroupForm edit /></RequireAuth>} />
            <Route path="/community/post/:id" element={<PostPage />} />
            <Route path="/community/profile/:username" element={<Profile />} />
            <Route path="/community/saved" element={<RequireAuth><Saved /></RequireAuth>} />
            <Route path="/community/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
            <Route path="/community/settings" element={<RequireAuth><AccountSettings /></RequireAuth>} />

            {/* Admin — every API call is also checked on the server */}
            <Route path="/admin" element={admin('admin.access', <AdminLayout />)}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="posts" element={admin('community.moderate', <AdminPosts />)} />
              <Route path="comments" element={admin('community.moderate', <AdminComments />)} />
              <Route path="groups" element={admin('community.moderate', <AdminGroups />)} />
              <Route path="reports" element={admin('community.moderate', <AdminReports />)} />
              <Route path="submissions" element={admin('submission.review', <AdminSubmissions />)} />
              <Route path="content" element={admin('content.manage', <AdminContent />)} />
              <Route path="content/new" element={admin('content.manage', <AdminEntryEditor />)} />
              <Route path="content/:id" element={admin('content.manage', <AdminEntryEditor />)} />
              <Route path="gurdwaras" element={admin('content.manage', <AdminGurdwaras />)} />
              <Route path="gurdwaras/new" element={admin('content.manage', <AdminGurdwaraEditor />)} />
              <Route path="gurdwaras/:id" element={admin('content.manage', <AdminGurdwaraEditor />)} />
              <Route path="events" element={admin('content.manage', <AdminContent type="event" />)} />
              <Route path="personalities" element={admin('content.manage', <AdminContent type="personality" />)} />
              <Route path="news" element={admin('content.manage', <AdminContent type="news" />)} />
              <Route path="media" element={admin('content.manage', <AdminMedia />)} />
              <Route path="hukamnama" element={admin('content.manage', <AdminHukamnamaList />)} />
              <Route path="festivals" element={admin('content.manage', <AdminFestivals />)} />
              <Route path="festivals/new" element={admin('content.manage', <AdminFestivalEditor />)} />
              <Route path="festivals/:id" element={admin('content.manage', <AdminFestivalEditor />)} />
              <Route path="banners" element={admin('content.manage', <AdminBanners />)} />
              <Route path="banners/new" element={admin('content.manage', <AdminBannerEditor />)} />
              <Route path="banners/:id" element={admin('content.manage', <AdminBannerEditor />)} />
              <Route path="hukamnama/new" element={admin('content.manage', <AdminHukamnamaEditor />)} />
              <Route path="hukamnama/:id" element={admin('content.manage', <AdminHukamnamaEditor />)} />
              <Route path="analytics" element={admin('analytics.view', <AdminAnalytics />)} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </SiteLayout>
  );
}
