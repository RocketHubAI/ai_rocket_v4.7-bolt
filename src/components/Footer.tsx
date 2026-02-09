import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>

      <footer className="bg-gray-900 border-t border-gray-800 py-6 px-4 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Company Info */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                RocketHub.AI
              </h3>
              <p className="text-sm text-gray-400 mb-3">
                AI for Entrepreneurs and their Teams
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="w-4 h-4" />
                <a
                  href="mailto:support@rockethub.ai"
                  className="hover:text-blue-400 transition-colors"
                >
                  support@rockethub.ai
                </a>
              </div>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="text-white font-semibold mb-3">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/privacy"
                    className="text-sm text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2 group"
                  >
                    <Shield className="w-4 h-4 group-hover:text-blue-400" />
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-sm text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2 group"
                  >
                    <FileText className="w-4 h-4 group-hover:text-blue-400" />
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500">
                © {currentYear} RocketHub.AI. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-600">
                  Built with AI for Entrepreneurs
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
