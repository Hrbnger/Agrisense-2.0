import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

export default function Forum() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [comments, setComments] = useState<{ [key: string]: Comment[] }>({});
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
  } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  /** ---------- AUTH CHECK ---------- */
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(user.id);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      setCurrentUserProfile(profileData);
    };
    checkUser();
    fetchPosts();

    const channel = supabase
      .channel("forum-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_posts" },
        fetchPosts
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        async (payload) => {
          const postId = payload.new?.post_id;
          if (postId) await fetchComments(postId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /** ---------- FETCH POSTS ---------- */
  const fetchPosts = async () => {
    const { data } = await supabase
      .from("forum_posts")
      .select("*, profiles(full_name, avatar_url)")
      .order("created_at", { ascending: false });
    if (data) setPosts(data);
  };

  /** ---------- FETCH COMMENTS ---------- */
  const fetchComments = async (postId: string) => {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(full_name, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (data) setComments((prev) => ({ ...prev, [postId]: data }));
  };

  /** ---------- CREATE POST ---------- */
  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({
        title: "Missing details",
        description: "Please fill in both title and content.",
        variant: "destructive",
      });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("forum_posts")
      .insert({
        user_id: user.id,
        title: newTitle,
        content: newContent,
      });

    if (error) {
      toast({
        title: "Post failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Post added!", description: "Your post is now live 🎉" });
      setNewTitle("");
      setNewContent("");
      fetchPosts();
    }
  };

  /** ---------- ADD COMMENT ---------- */
  const handleAddComment = async (postId: string) => {
    const content = newComment[postId];
    if (!content?.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    const { error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: user.id, content });
    if (!error) {
      setNewComment((prev) => ({ ...prev, [postId]: "" }));
      fetchComments(postId);
    }
  };

  /** ---------- TOGGLE COMMENTS DROPDOWN ---------- */
  const handleToggleComments = async (postId: string) => {
    if (expandedPost === postId) setExpandedPost(null);
    else {
      setExpandedPost(postId);
      if (!comments[postId]) await fetchComments(postId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Community Forum</h1>
          <p className="text-muted-foreground">
            Discuss ideas, share insights, and learn together 🌱
          </p>
        </div>

        {/* NEW POST CARD */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create a New Post</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Post Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="mb-3"
            />
            <Textarea
              placeholder="Write your thoughts..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="mb-3"
            />
            <Button onClick={handleCreatePost} className="w-full">
              <Send className="mr-2 h-4 w-4" /> Publish
            </Button>
          </CardContent>
        </Card>

        {/* POSTS */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No posts yet. Start the conversation!
            </p>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(post.profiles?.full_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold text-lg">{post.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {post.profiles?.full_name || "Anonymous"} •{" "}
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="mb-4 text-foreground whitespace-pre-wrap">
                    {post.content}
                  </p>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleComments(post.id)}
                    className="flex items-center gap-1"
                  >
                    {expandedPost === post.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <MessageSquare className="h-4 w-4" /> Comments
                  </Button>

                  {/* COMMENTS DROPDOWN */}
                  {expandedPost === post.id && (
                    <div className="mt-4 border-t pt-4 space-y-4">
                      {(comments[post.id] || []).map((c) => (
                        <div key={c.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={c.profiles?.avatar_url || undefined} />
                            <AvatarFallback>
                              {(c.profiles?.full_name || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {c.profiles?.full_name || "Anonymous"} •{" "}
                              {formatDistanceToNow(new Date(c.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                            <p className="text-foreground">{c.content}</p>
                          </div>
                        </div>
                      ))}

                      {/* ADD COMMENT INPUT */}
                      <div className="flex gap-2 pt-2">
                        <Textarea
                          placeholder="Write a comment..."
                          value={newComment[post.id] || ""}
                          onChange={(e) =>
                            setNewComment((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          className="flex-grow"
                        />
                        <Button onClick={() => handleAddComment(post.id)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
