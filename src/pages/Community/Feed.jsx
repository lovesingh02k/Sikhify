import { useRef } from 'react';
import { Link } from 'react-router-dom';
import CommunityLayout from '../../components/community/CommunityLayout.jsx';
import PostComposer from '../../components/community/PostComposer.jsx';
import PostList from '../../components/community/PostList.jsx';
import { Empty } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useReactPage } from '../../hooks/useReactPage.js';

export default function Feed() {
  useReactPage('Community — Sikhify.in', 'The Sikhify community: share with the Sangat, join groups, and learn together — respectfully.');
  const { user } = useAuth();
  const list = useRef(null);
  return (
    <CommunityLayout title={<>The <span className="gold">Sangat</span></>} crumbs={[{ label: 'Community' }]}
      sub={user ? `Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh, ${user.name.split(' ')[0]}. Here's what the Sangat is sharing.` : 'Share with the Sangat, join groups and learn together — respectfully.'}>
      <PostComposer onCreated={(p) => list.current?.prepend(p)} />
      <h2 className="sr-only">{user ? 'Your feed' : 'Latest posts'}</h2>
      <PostList ref={list} scope="feed" empty={(
        <Empty icon="message" title="No posts yet" text="Be the first to share something with the Sangat — a question, a reflection or news from your Gurdwara.">
          {user ? null : <Link className="sk-btn sk-btn-gold sk-btn-sm" to="/signup?next=%2Fcommunity">Join the community</Link>}
          <Link className="sk-btn sk-btn-sm" to="/community/groups">Browse groups</Link>
        </Empty>
      )} />
    </CommunityLayout>
  );
}
