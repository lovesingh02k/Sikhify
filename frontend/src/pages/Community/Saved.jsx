import { Link } from 'react-router-dom';
import CommunityLayout from '../../components/community/CommunityLayout.jsx';
import PostList from '../../components/community/PostList.jsx';
import { Empty } from '../../components/ui/States.jsx';
import { useReactPage } from '../../hooks/useReactPage.js';

export default function Saved() {
  useReactPage('Saved posts — Sikhify community', 'Posts you saved in the Sikhify community.', { noindex: true });
  return (
    <CommunityLayout title="Saved posts" sub="Only you can see what you've saved.">
      <PostList scope="saved" empty={(
        <Empty icon="bookmark" title="No saved posts yet" text="Press Save on any post to keep it here.">
          <Link className="sk-btn sk-btn-sm" to="/community">Go to the feed</Link>
        </Empty>
      )} />
      <p className="sk-card-meta">Looking for saved Gurbani, Hukamnamas or lessons? Those bookmarks are on each page (e.g. <a className="panel-view-all" href="/hukamnama">Hukamnama</a>) and stay in this browser.</p>
    </CommunityLayout>
  );
}
