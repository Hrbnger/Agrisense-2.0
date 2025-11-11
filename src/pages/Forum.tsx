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
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">🌱 AgriSense Forum</h1>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin w-6 h-6" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition w-full">
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
                <CardTitle className="text-sm sm:text-base">
                  {post.profiles?.full_name || "Anonymous"}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex flex-col gap-2">
                <h2 className="font-semibold text-base sm:text-lg">{post.title}</h2>
                <p className="text-gray-700 text-sm sm:text-base">{post.content}</p>

                <Button
                  variant="outline"
                  onClick={() => handleViewPost(post)}
                  className="text-xs sm:text-sm mt-2 self-start"
                >
                  View Discussion
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPost && (
        <Card className="mt-6 w-full">
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="text-lg sm:text-xl">{selectedPost.title}</CardTitle>
            <p className="text-gray-600 text-sm sm:text-base">{selectedPost.content}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <h3 className="font-semibold text-sm sm:text-base">Comments</h3>

            {selectedPost.comments.length === 0 ? (
              <p className="text-gray-500 text-sm">No comments yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedPost.comments.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 border-t pt-2"
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
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.profiles?.full_name || "Anonymous"}</p>
                      <p className="text-gray-700 text-sm">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 min-h-[80px]"
              />
              <Button onClick={handleAddComment} className="sm:w-auto w-full">
                Post
              </Button>
            </div>

            <Button
              variant="ghost"
              className="mt-4 text-sm self-start"
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
