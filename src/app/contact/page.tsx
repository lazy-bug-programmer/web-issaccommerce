import Image from "next/image";

export default function ContactPage() {
  const whatsappNumber = "5551234567890";
  const telegramUsername = "yourusername";

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
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
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
              </a>

              {/* Telegram Button */}
              <a
                href={`https://t.me/${telegramUsername}`}
                target="_blank"
                rel="noopener noreferrer"
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
              </a>
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
