import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare, ThumbsUp, Clock, Send, Search, Users, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ENABLE_POST_LIKES = false;
const ENABLE_COMMENT_LIKES = false;
const ENABLE_POST_RATINGS = true;

interface ForumPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count?: number;
  user_has_liked?: boolean;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

export default function Forum() {
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [key: string]: Comment[] }>({});
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ full_name: string; avatar_url: string | null; updated_at?: string } | null>(null);
  const [ratingsAvailable, setRatingsAvailable] = useState<boolean>(true);
  const [avgRatings, setAvgRatings] = useState<{[postId: string]: { avg: number; count: number }}>({});
  const [userRatings, setUserRatings] = useState<{[postId: string]: number}>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  /** ---------- AUTH CHECK & PROFILE FETCH ---------- */
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(user.id);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileData) {
      setCurrentUserProfile(profileData);
    } else {
      // Auto-create profile
      const userMetadata: any = user.user_metadata || {};
      const email = user.email || '';
      const fullName = userMetadata.full_name || userMetadata.name || 
                       (email ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1) : 'User');
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          full_name: fullName,
          email,
          updated_at: new Date().toISOString(),
        })
        .select("full_name, avatar_url, updated_at")
        .single();
      if (newProfile) setCurrentUserProfile(newProfile);
    }
  };

  useEffect(() => {
    checkUser();
    fetchPosts();

    /** ---------- REALTIME SUBSCRIPTIONS ---------- */
    const postsChannel = supabase
      .channel('forum-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async (payload) => {
        const postId = payload.new.post_id;
        await fetchPosts();
        await fetchCommentsWithProfilesAndLikes(postId);
      })
      .subscribe();

    return () => supabase.removeChannel(postsChannel);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    const profileChannel = supabase
      .channel(`profile:${currentUserId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${currentUserId}` }, (payload) => {
        setCurrentUserProfile({
          full_name: payload.new.full_name,
          avatar_url: payload.new.avatar_url,
          updated_at: payload.new.updated_at,
        });
        fetchPosts();
      })
      .subscribe();
    return () => supabase.removeChannel(profileChannel);
  }, [currentUserId]);

  /** ---------- FETCH POSTS ---------- */
  const fetchPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    let postsData: any[] | null = null;
    try {
      const res = await supabase.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(20);
      postsData = res.data;
    } catch {
      const res = await supabase.from("forum_posts").select("id, user_id, title, content, created_at").limit(20);
      postsData = res.data;
    }
    if (!postsData) return;

    const userIds = [...new Set(postsData.map(p => p.user_id))];
    const { data: profilesData } = userIds.length > 0
      ? await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds)
      : { data: [] };

    // Ratings
    let ratingsByPost: {[id:string]: {avg:number; count:number}} = {};
    let myRatings: {[id:string]: number} = {};
    if (ENABLE_POST_RATINGS) {
      try {
        const postIds = postsData.map(p => p.id);
        const [allRatingsRes, myRatingsRes] = await Promise.all([
          supabase.from("post_ratings").select("post_id, rating").in("post_id", postIds),
          user ? supabase.from("post_ratings").select("post_id, rating").eq("user_id", user.id) : Promise.resolve({ data: [] })
        ] as any);
        const allRows = (allRatingsRes as any)?.data || [];
        const buckets: {[id:string]: {sum:number; count:number}} = {};
        allRows.forEach((r: any) => {
          if (!buckets[r.post_id]) buckets[r.post_id] = { sum: 0, count: 0 };
          buckets[r.post_id].sum += Number(r.rating) || 0;
          buckets[r.post_id].count += 1;
        });
        Object.keys(buckets).forEach(id => {
          const b = buckets[id];
          ratingsByPost[id] = { avg: b.count ? b.sum / b.count : 0, count: b.count };
        });
        const mine = (myRatingsRes as any)?.data || [];
        mine.forEach((r: any) => { myRatings[r.post_id] = Number(r.rating) || 0; });
        setRatingsAvailable(true);
      } catch { setRatingsAvailable(false); }
    }

    setAvgRatings(ratingsByPost);
    setUserRatings(myRatings);

    const postsWithProfiles = postsData.map(post => ({
      ...post,
      profiles: profilesData?.find(p => p.user_id === post.user_id) || null
    }));
    setPosts(postsWithProfiles as any);
  };

  /** ---------- FETCH COMMENTS ---------- */
  const fetchCommentsWithProfilesAndLikes = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: commentsData } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (!commentsData) return;

    const userIds = [...new Set(commentsData.map(c => c.user_id))];
    const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);

    let likesCountByComment: Record<string, number> = {};
    let userLikedComments: string[] = [];
    if (ENABLE_COMMENT_LIKES) {
      const commentIds = commentsData.map(c => c.id);
      const { data: likeRows } = await supabase.from("comment_likes").select("comment_id").in("comment_id", commentIds);
      (likeRows || []).forEach((r: any) => likesCountByComment[r.comment_id] = (likesCountByComment[r.comment_id] || 0) + 1);
      if (user) {
        const { data: userLikes } = await supabase.from("comment_likes").select("comment_id").eq("user_id", user.id).in("comment_id", commentIds);
        userLikedComments = (userLikes || []).map((r: any) => r.comment_id);
      }
    }

    const commentsWithProfiles = commentsData.map(comment => {
      const profile = profilesData?.find(p => p.user_id === comment.user_id) || null;
      const resolvedProfile = profile || (comment.user_id === currentUserId && currentUserProfile 
        ? { user_id: currentUserId, full_name: currentUserProfile.full_name, avatar_url: currentUserProfile.avatar_url }
        : { user_id: comment.user_id, full_name: "Anonymous", avatar_url: null });
      return { ...comment, likes_count: likesCountByComment[comment.id] || 0, user_has_liked: userLikedComments.includes(comment.id), profiles: resolvedProfile };
    });

    setComments(prev => ({ ...prev, [postId]: commentsWithProfiles }));
  };

  /** ---------- POST / COMMENT HANDLERS ---------- */
  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    await supabase.from("forum_posts").insert({ user_id: user.id, title: newTitle, content: newContent });
    setNewTitle(""); setNewContent(""); fetchPosts();
    setLoading(false);
  };

  const handleAddComment = async (postId: string) => {
    const commentText = newComment[postId];
    if (!commentText?.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content: commentText });
    setNewComment(prev => ({ ...prev, [postId]: "" }));
    fetchCommentsWithProfilesAndLikes(postId); fetchPosts();
  };

  const handleRatePost = async (postId: string, rating: number) => {
    if (!ENABLE_POST_RATINGS) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    await supabase.from("post_ratings").delete().eq("post_id", postId).eq("user_id", user.id);
    await supabase.from("post_ratings").insert({ post_id: postId, user_id: user.id, rating });
    fetchPosts();
  };

  const handleToggleComments = async (postId: string) => {
    if (expandedPost === postId) setExpandedPost(null);
    else { setExpandedPost(postId); if (!comments[postId]) await fetchCommentsWithProfilesAndLikes(postId); }
  };

  /** ---------- SEARCH FILTER ---------- */
  const filteredPosts = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.content.toLowerCase().includes(searchQuery.toLowerCase()));

  /** ---------- RENDER ---------- */
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="relative mb-8 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-green-100 dark:from-primary/30 dark:via-primary/20 dark:to-green-900/20 p-8 text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-200/30 dark:bg-green-800/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">Community Forum</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Connect, share knowledge, and grow together with fellow farmers and agriculture enthusiasts
            </p>
          </div>
        </div>
        {/* SEARCH */}
        <div className="mb-8 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search posts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-12 pl-12 border-2 focus:border-primary" />
        </div>
        {/* POSTS */}
        <div className="space-y-4 mb-8">
          {filteredPosts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                  <MessageSquare className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No posts found</h3>
              </CardContent>
            </Card>
          ) : filteredPosts.map(post => (
            <Card key={post.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50 hover:border-l-primary">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={post.profiles?.avatar_url || undefined} />
                    <AvatarFallback>{(post.profiles?.full_name || "A").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl mb-2">{post.title}</CardTitle>
                    <CardDescription className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-foreground">{post.profiles?.full_name || "Anonymous"}</span>
                      <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground mb-6 whitespace-pre-wrap">{post.content}</p>
                <div className="flex items-center gap-4 pt-4 border-t">
                  {ENABLE_POST_RATINGS && ratingsAvailable && (
                    <div className="flex items-center gap-2">
                      {[1,2,3,4,5].map(star => (
                        <button key={star} onClick={() => handleRatePost(post.id, star)} className={`transition-colors ${(userRatings[post.id]||0)>=star ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}>★</button>
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">{avgRatings[post.id]?.avg?.toFixed(1)||"0.0"} ({avgRatings[post.id]?.count||0})</span>
                    </div>
                  )}
                  <Button size="sm" onClick={() => handleToggleComments(post.id)}>{post.comments_count || 0} Comments</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
