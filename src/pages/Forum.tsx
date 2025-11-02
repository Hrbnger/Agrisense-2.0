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

interface ForumPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  user_has_liked?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

const Forum = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [key: string]: Comment[] }>({});
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchPosts();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('forum-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, fetchPosts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Subscribe to current user profile updates
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`profile:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          setCurrentUserProfile({
            full_name: payload.new.full_name,
            avatar_url: payload.new.avatar_url,
          });
          // Also refetch posts to update displayed names/avatars
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
    
    // Fetch current user's profile
    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profileData) {
        setCurrentUserProfile(profileData);
      }
    }
  };

  const fetchPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: postsData, error: postsError } = await supabase
      .from("forum_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching posts:", postsError);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
      return;
    }

    const userIds = [...new Set(postsData.map(post => post.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);

    // Check which posts the user has liked
    let userLikes: string[] = [];
    if (user) {
      // Try reading from post_likes if it exists; otherwise fallback (no per-user like state)
      try {
        const { data: likesData, error } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id);
        if (!error) {
          userLikes = likesData?.map(like => like.post_id) || [];
        }
      } catch (_) {
        // Table might not exist; ignore
      }
    }

    const postsWithProfiles = postsData.map(post => ({
      ...post,
      profiles: profilesData?.find(p => p.user_id === post.user_id) || null,
      user_has_liked: userLikes.includes(post.id)
    }));

    setPosts(postsWithProfiles as any);
  };

  const handleLike = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like posts",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      if (post.user_has_liked) {
        // Try unlike in post_likes; if fails, decrement likes_count directly
        let failed = false;
        try {
          const { error } = await supabase
            .from("post_likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id);
          if (error) failed = true;
        } catch { failed = true; }

        if (failed) {
          await supabase
            .from("forum_posts")
            .update({ likes_count: Math.max((post.likes_count || 0) - 1, 0) })
            .eq("id", postId);
        }
      } else {
        // Try like in post_likes; if fails, increment likes_count directly
        let failed = false;
        try {
          const { error } = await supabase
            .from("post_likes")
            .insert({ post_id: postId, user_id: user.id });
          if (error) failed = true;
        } catch { failed = true; }

        if (failed) {
          await supabase
            .from("forum_posts")
            .update({ likes_count: (post.likes_count || 0) + 1 })
            .eq("id", postId);
        }
      }
      // refresh list
      fetchPosts();
    } catch (_) {
      toast({ title: "Error", description: "Failed to update like", variant: "destructive" });
    }
  };

  const fetchComments = async (postId: string) => {
    const { data: commentsData, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
      return;
    }

    const userIds = [...new Set(commentsData.map(comment => comment.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);

    const commentsWithProfiles = commentsData.map(comment => ({
      ...comment,
      profiles: profilesData?.find(p => p.user_id === comment.user_id) || null
    }));

    setComments(prev => ({ ...prev, [postId]: commentsWithProfiles as any }));
  };

  const handleToggleComments = async (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!comments[postId]) {
        await fetchComments(postId);
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const commentText = newComment[postId];
    if (!commentText?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to comment",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content: commentText
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } else {
      setNewComment(prev => ({ ...prev, [postId]: "" }));
      await fetchComments(postId);
      fetchPosts(); // Refresh to update comment count
    }
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a post",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const { error } = await supabase.from("forum_posts").insert({
      user_id: user.id,
      title: newTitle,
      content: newContent,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Post created successfully",
      });
      setNewTitle("");
      setNewContent("");
      fetchPosts();
    }
    setLoading(false);
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Header Section */}
        <div className="relative mb-8 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-green-100 dark:from-primary/30 dark:via-primary/20 dark:to-green-900/20 p-8 text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-200/30 dark:bg-green-800/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
              Community Forum
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Connect, share knowledge, and grow together with fellow farmers and agriculture enthusiasts
            </p>
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{posts.length} Posts</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Growing Community</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search posts, questions, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 text-base pl-12 border-2 focus:border-primary transition-colors"
          />
        </div>

        {/* Posts List */}
        <div className="space-y-4 mb-8">
          {filteredPosts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                  <MessageSquare className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No posts found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery ? "Try adjusting your search terms" : "Be the first to start a discussion!"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => document.getElementById('create-post-title')?.scrollIntoView({ behavior: 'smooth' })}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create First Post
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post) => (
              <Card key={post.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50 hover:border-l-primary">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarImage src={post.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-green-600 text-white font-semibold">
                        {(post.profiles?.full_name || "A").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">{post.title}</CardTitle>
                      <CardDescription className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{post.profiles?.full_name || "Anonymous"}</span>
                        </div>
                        <span className="hidden sm:inline">•</span>
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                          })}
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground mb-6 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <button 
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        post.user_has_liked 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'text-muted-foreground hover:bg-muted hover:text-primary'
                      }`}
                    >
                      <ThumbsUp className={`h-4 w-4 ${post.user_has_liked ? 'fill-current' : ''}`} />
                      <span className="font-medium">{post.likes_count || 0}</span>
                    </button>
                    <button 
                      onClick={() => handleToggleComments(post.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-all ${
                        expandedPost === post.id ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-medium">{post.comments_count || 0}</span>
                      <span className="hidden sm:inline">Comments</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedPost === post.id && (
                    <div className="mt-6 pt-6 border-t space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-1 w-8 bg-primary rounded-full"></div>
                        <h4 className="font-semibold text-sm text-muted-foreground">COMMENTS</h4>
                        <div className="flex-1 h-1 bg-muted rounded-full"></div>
                      </div>
                      {/* Comments List */}
                      {comments[post.id]?.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No comments yet. Be the first to comment!</p>
                        </div>
                      )}
                      {comments[post.id]?.map((comment) => (
                        <div key={comment.id} className="flex gap-3 group">
                          <Avatar className="h-8 w-8 mt-1 border border-border">
                            <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-green-500/20 text-xs font-medium">
                              {(comment.profiles?.full_name || "A").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-muted/50 rounded-lg p-4 hover:bg-muted/70 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-sm text-foreground">
                                {comment.profiles?.full_name || "Anonymous"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
                          </div>
                        </div>
                      ))}

                      {/* Add Comment */}
                      {currentUserId && (
                        <div className="flex gap-2 pt-2">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src={currentUserProfile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                              {(currentUserProfile?.full_name || currentUserId || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 flex gap-2">
                            <Input
                              placeholder="Write a comment..."
                              value={newComment[post.id] || ""}
                              onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment(post.id);
                                }
                              }}
                              className="border-2 focus:border-primary"
                            />
                            <Button 
                              onClick={() => handleAddComment(post.id)}
                              size="default"
                              className="px-4"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create Post Section */}
        <Card id="create-post-title" className="border-2 border-primary/20 hover:border-primary/40 transition-colors bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  Create New Post
                </CardTitle>
                <CardDescription className="mt-1">Share your farming questions or insights with the community</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Post Title</label>
              <Input
                placeholder="Enter a clear, descriptive title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-base h-12 border-2 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Content</label>
              <Textarea
                placeholder="What's on your mind? Share your thoughts, questions, or farming tips..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={6}
                className="resize-none border-2 focus:border-primary"
              />
            </div>
            <Button 
              onClick={handleCreatePost} 
              disabled={loading || !newTitle.trim() || !newContent.trim()}
              size="lg"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-green-600 hover:from-primary/90 hover:to-green-600/90 transition-all"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Publish Post
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center py-12 mt-8">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-muted/50 border border-border">
            <Users className="h-5 w-5 text-primary" />
            <p className="text-muted-foreground font-medium">
              Join the conversation. Find your community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forum;
