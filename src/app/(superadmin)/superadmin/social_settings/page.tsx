"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getOrCreateDefaultSocialSettings,
  updateDefaultSocialSettings,
} from "@/lib/actions/social-settings.action";
import { SocialSettings } from "@/lib/domains/social-settings.domain";
import { toast } from "sonner";

export default function SocialSettingsPage() {
  const [settings, setSettings] = useState<SocialSettings>({
    whatsapp_link: "",
    telegram_link: "",
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const result = await getOrCreateDefaultSocialSettings();
        if (result.data) {
          setSettings({
            whatsapp_link: result.data.whatsapp_link || "",
            telegram_link: result.data.telegram_link || "",
          });
        } else if (result.error) {
          toast(result.error);
        }
      } catch (error) {
        console.error("Failed to fetch social settings:", error);
        toast("Failed to load social settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const result = await updateDefaultSocialSettings(settings);

      if (result.data) {
        toast("Social settings updated successfully");
      } else if (result.error) {
        toast(result.error);
      }
    } catch (error) {
      console.error("Failed to update social settings:", error);
      toast("Failed to update social settings");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Social Media Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>
            Configure social media links that will be displayed on your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading settings...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp_link">WhatsApp Link</Label>
                <Input
                  id="whatsapp_link"
                  name="whatsapp_link"
                  value={settings.whatsapp_link}
                  onChange={handleChange}
                  placeholder="https://wa.me/your-number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram_link">Telegram Link</Label>
                <Input
                  id="telegram_link"
                  name="telegram_link"
                  value={settings.telegram_link}
                  onChange={handleChange}
                  placeholder="https://t.me/your-username"
                />
              </div>

              <Button type="submit" disabled={updating}>
                {updating ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
