import { Link, useNavigate, useParams } from 'react-router-dom';
import CommunityLayout from '../../components/community/CommunityLayout.jsx';
import PostCard from '../../components/community/PostCard.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { postService } from '../../services/community/index.js';

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const state = useAsync(() => postService.get(id), [id]);
  const p = state.data;
  useReactPage(p ? `${p.author.name}: “${p.body.slice(0, 60)}${p.body.length > 60 ? '…' : ''}” — Sikhify` : 'Post — Sikhify community', p ? p.body.slice(0, 160) : undefined);
  return (
    <CommunityLayout title="Post" crumbs={[{ label: 'Community', to: '/community' }, ...(p && p.group ? [{ label: p.group.name, to: `/community/groups/${p.group.slug}` }] : []), { label: 'Post' }]}>
      <AsyncView state={state} errorTitle={state.error && state.error.kind === 'notFound' ? 'This post is not available' : undefined}>
        {(post) => <PostCard post={post} showComments linkToPost={false} onRemoved={() => navigate('/community')} />}
      </AsyncView>
      {state.error && state.error.kind === 'notFound' ? (
        <Empty title="It may have been deleted, hidden, or posted in a private group." text="">
          <Link className="sk-btn sk-btn-sm" to="/community">Back to the community</Link>
        </Empty>
      ) : null}
    </CommunityLayout>
  );
}
