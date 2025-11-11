import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Forum() {
  const [posts, setPosts] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch all forum posts with author info
  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("forum_posts")
      .select(`
        id,
        user_id,
        title,
        content,
        created_at,
        comments_count,
        likes_count,
        profiles:profiles!forum_posts_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) console.error("Error fetching posts:", error);
    else setPosts(data || []);

    setLoading(false);
  };

  // ✅ Fetch comments for one post with author info
  const fetchComments = async (postId: string) => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        user_id,
        content,
        created_at,
        profiles:profiles!comments_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) console.error("Error fetching comments:", error);
    return data || [];
  };

  const handleViewPost = async (post: any) => {
    setSelectedPost({ ...post, comments: [] });
    const comments = await fetchComments(post.id);
    setSelectedPost((prev) => ({ ...prev, comments }));
  };

  const handleAddComment = async () => {
    if (!selectedPost || !commentText.trim()) return;

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return alert("Please log in to comment");

    const { error } = await supabase.from("comments").insert({
      post_id: selectedPost.id,
      user_id: user.id,
      content: commentText.trim(),
    });

    if (error) {
      console.error("Error adding comment:", error);
      alert("Failed to post comment");
      return;
    }

    setCommentText("");
    const updatedComments = await fetchComments(selectedPost.id);
    setSelectedPost((prev) => ({ ...prev, comments: updatedComments }));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">🌱 AgriSense Forum</h1>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin w-6 h-6" />
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition">
              <CardHeader className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage
                    src={post.profiles?.avatar_url || "/default-avatar.png"}
                    alt={post.profiles?.full_name || "User"}
                  />
                  <AvatarFallback>
                    {post.profiles?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <CardTitle>{post.profiles?.full_name || "Anonymous"}</CardTitle>
              </CardHeader>

              <CardContent>
                <h2 className="font-semibold text-lg mb-1">{post.title}</h2>
                <p className="text-gray-700 mb-2">{post.content}</p>

                <Button
                  variant="outline"
                  onClick={() => handleViewPost(post)}
                  className="text-sm"
                >
                  View Discussion
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPost && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{selectedPost.title}</CardTitle>
            <p className="text-gray-600">{selectedPost.content}</p>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-2">Comments</h3>
            {selectedPost.comments.length === 0 ? (
              <p className="text-gray-500 text-sm">No comments yet</p>
            ) : (
              selectedPost.comments.map((c) => (
                <div
                  key={c.id}
                  className="border-t py-2 flex items-start gap-3"
                >
                  <Avatar>
                    <AvatarImage
                      src={c.profiles?.avatar_url || "/default-avatar.png"}
                      alt={c.profiles?.full_name || "User"}
                    />
                    <AvatarFallback>
                      {c.profiles?.full_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {c.profiles?.full_name || "Anonymous"}
                    </p>
                    <p className="text-gray-700">{c.content}</p>
                  </div>
                </div>
              ))
            )}

            <div className="flex gap-2 mt-3">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
              />
              <Button onClick={handleAddComment}>Post</Button>
            </div>

            <Button
              variant="ghost"
              className="mt-4 text-sm"
              onClick={() => setSelectedPost(null)}
            >
              ← Back to posts
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
