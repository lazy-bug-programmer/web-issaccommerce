"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSocialSettings } from "@/lib/actions/social-settings.action";
import { SocialSettings } from "@/lib/domains/social-settings.domain";

export default function ContactPage() {
  const router = useRouter();
  const [socialLinks, setSocialLinks] = useState<SocialSettings>({
    whatsapp_link: "",
    telegram_link: "",
  });

  useEffect(() => {
    const fetchSocialSettings = async () => {
      try {
        const response = await getSocialSettings();
        if (response.data) {
          setSocialLinks({
            whatsapp_link: response.data.whatsapp_link,
            telegram_link: response.data.telegram_link,
          });
        }
      } catch (error) {
        console.error("Failed to fetch social settings:", error);
      } finally {
      }
    };

    fetchSocialSettings();
  }, []);

  const handleNavigate = (url: string) => {
    if (url) {
      router.push(("https://" + url).trim());
    }
  };

  return (
    <div className="py-16 px-4 min-h-[80vh]">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="md:flex">
          <div className="md:shrink-0 bg-blue-600 md:w-1/3 p-8 text-white flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
            <p className="mb-6">
              We&apos;d love to hear from you. Our team is always ready to
              assist.
            </p>
          </div>

          <div className="p-8 md:p-12 md:w-2/3">
            <h1 className="text-3xl font-bold mb-4 text-gray-800">
              Contact Us
            </h1>
            <p className="text-gray-600 mb-8">
              Connect with us instantly through your preferred messaging
              platform
            </p>

            <div className="space-y-4">
              {/* WhatsApp Button */}
              <button
                onClick={() => handleNavigate(socialLinks.whatsapp_link)}
                className="flex items-center gap-4 p-4 border border-green-200 bg-white hover:bg-green-50 text-green-600 rounded-lg transition-all duration-300 w-full group"
              >
                <div className="bg-green-100 p-3 rounded-full group-hover:bg-green-200 transition-colors">
                  <Image
                    src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                    alt="WhatsApp Logo"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                </div>
                <div>
                  <div className="font-semibold">WhatsApp</div>
                  <div className="text-sm text-gray-500">
                    Chat with us instantly
                  </div>
                </div>
              </button>

              {/* Telegram Button */}
              <button
                onClick={() => handleNavigate(socialLinks.telegram_link)}
                className="flex items-center gap-4 p-4 border border-blue-200 bg-white hover:bg-blue-50 text-blue-600 rounded-lg transition-all duration-300 w-full group"
              >
                <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
                  <Image
                    src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
                    alt="Telegram Logo"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                </div>
                <div>
                  <div className="font-semibold">Telegram</div>
                  <div className="text-sm text-gray-500">
                    Message us on Telegram
                  </div>
                </div>
              </button>
            </div>

            <p className="mt-8 text-sm text-gray-500 text-center">
              We typically respond within 24 hours during business days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
