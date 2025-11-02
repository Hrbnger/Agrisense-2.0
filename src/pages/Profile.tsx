/**
 * Profile Component - User profile management page
 * 
 * Features:
 * - Edit user profile information (name, bio, location, phone)
 * - Upload and manage profile avatar/image
 * - Validates file types and sizes for avatar uploads
 * - Supports both Supabase Storage and base64 fallback for avatars
 * - Auto-navigates to dashboard after successful update
 */
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, User, X } from "lucide-react";

const Profile = () => {
  // Profile data from database
  const [profile, setProfile] = useState<any>(null);
  // Form field states
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  // Avatar management states
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // Current avatar URL
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null); // Preview of newly selected image
  const [uploadingAvatar, setUploadingAvatar] = useState(false); // Upload in progress
  const [loading, setLoading] = useState(false); // Form submission in progress
  // Reference to hidden file input for avatar selection
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * Effect: Load user profile on component mount
   * Fetches current user's profile data and populates the form fields
   */
  useEffect(() => {
    fetchProfile();
  }, []);

  /**
   * Fetch current user's profile from database
   * Redirects to auth page if user is not logged in
   */
  const fetchProfile = async () => {
    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Fetch profile data from profiles table
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Populate form fields with existing profile data
    if (data) {
      setProfile(data);
      setFullName(data.full_name || "");
      setBio(data.bio || "");
      setLocation(data.location || "");
      setPhone(data.phone || "");
      setAvatarUrl(data.avatar_url || null);
    }
  };

  /**
   * Handle avatar image file selection
   * 
   * Validates the selected file (type and size) and creates a preview
   * using FileReader to convert image to base64 data URL.
   * 
   * @param e - File input change event
   */
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - must be an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size - maximum 5MB to prevent large uploads
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Convert file to base64 data URL for preview
    // This allows displaying the image before uploading
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Handle avatar image upload
   * 
   * Tries to upload to Supabase Storage first. If storage bucket doesn't exist
   * or upload fails, falls back to storing base64 data URL directly in database.
   * 
   * Steps:
   * 1. Convert preview (base64) to blob
   * 2. Upload blob to Supabase Storage (avatars bucket)
   * 3. Get public URL from storage
   * 4. Update profile with avatar URL
   * 5. Fallback to base64 if storage fails
   */
  const handleAvatarUpload = async () => {
    if (!avatarPreview) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploadingAvatar(true);

    try {
      // Convert base64 preview to blob for upload
      const response = await fetch(avatarPreview);
      const blob = await response.blob();
      // Extract file extension from MIME type (e.g., 'png' from 'image/png')
      const fileExt = blob.type.split('/')[1];
      // Create unique filename: user-id-timestamp.extension
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Try uploading to Supabase Storage first (preferred method)
      const { error: uploadError } = await supabase.storage
        .from('avatars') // Storage bucket name
        .upload(filePath, blob, {
          cacheControl: '3600', // Cache for 1 hour
          upsert: false // Don't overwrite existing files
        });

      // If storage bucket doesn't exist or upload fails, use base64 fallback
      if (uploadError) {
        console.warn('Storage upload failed, using base64:', uploadError);
        // Store base64 data URL directly in database
        // This works even if Supabase Storage isn't configured
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: avatarPreview })
          .eq("user_id", user.id);

        if (updateError) throw updateError;
        
        setAvatarUrl(avatarPreview);
        toast({
          title: "Avatar updated",
          description: "Your avatar has been updated successfully",
        });
        setAvatarPreview(null);
        setUploadingAvatar(false);
        return;
      }

      // Storage upload succeeded, get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile record with the storage URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Update local state and clear preview
      setAvatarUrl(publicUrl);
      setAvatarPreview(null);
      toast({
        title: "Avatar updated",
        description: "Your avatar has been updated successfully",
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      // Clear file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle profile form submission
   * 
   * Updates user profile in database with form field values.
   * After successful update, refetches profile and navigates to dashboard
   * so user can see their updated name/avatar immediately.
   */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update profile record with all form fields
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        bio,
        location,
        phone,
        avatar_url: avatarUrl, // May have been updated via handleAvatarUpload
      })
      .eq("user_id", user.id);

    if (error) {
      // Show error message if update fails
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    } else {
      // Success: refetch profile to ensure we have latest data
      await fetchProfile();
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      // Navigate back to dashboard after delay
      // Delay ensures database update has propagated before dashboard refetches
      setTimeout(() => {
        navigate("/dashboard");
      }, 800);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              {/* Avatar Section */}
              <div className="space-y-4 mb-6 pb-6 border-b">
                <Label>Profile Avatar</Label>
                <div className="flex items-center gap-4">
                  {/* Current/Preview Avatar */}
                  <div className="relative">
                    {avatarPreview ? (
                      <div className="relative">
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                        />
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile avatar"
                        className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-primary">
                        <User className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {avatarPreview ? "Change Image" : "Upload Avatar"}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                      {avatarPreview && (
                        <Button
                          type="button"
                          onClick={handleAvatarUpload}
                          disabled={uploadingAvatar}
                          className="flex items-center gap-2"
                        >
                          {uploadingAvatar ? "Uploading..." : "Save Avatar"}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a profile picture (JPG, PNG, max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
