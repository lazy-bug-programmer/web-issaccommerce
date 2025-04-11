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

            <div className="space-y-4 mt-4">
              <div className="flex items-center space-x-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span>+1 (555) 123-4567</span>
              </div>
            </div>
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
