"use client";

import Image from "next/image";

interface ContactButtonsProps {
  whatsappLink: string;
  telegramLink: string;
}

export default function ContactButtons({
  whatsappLink,
  telegramLink,
}: ContactButtonsProps) {
  return (
    <div className="space-y-4">
      {/* WhatsApp Button */}
      {whatsappLink && (
        <button
          onClick={() => {
            window.location.href = whatsappLink;
          }}
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
            <div className="text-sm text-gray-500">Chat with us instantly</div>
          </div>
        </button>
      )}

      {/* Telegram Button */}
      {telegramLink && (
        <button
          onClick={() => {
            window.location.href = telegramLink;
          }}
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
            <div className="text-sm text-gray-500">Message us on Telegram</div>
          </div>
        </button>
      )}

      {/* Display a message if no contact methods are configured */}
      {!whatsappLink && !telegramLink && (
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <p className="text-gray-500">
            No contact methods have been configured yet.
          </p>
        </div>
      )}
    </div>
  );
}
