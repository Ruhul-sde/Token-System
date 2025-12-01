
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-[#455185] to-[#2a3357] border-t border-white/20 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Company Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-3">Ticket System</h3>
            <p className="text-white/70 text-sm">
              Support Management Platform for streamlined customer service and issue tracking.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/dashboard" className="text-white/70 hover:text-white text-sm transition-colors">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-3">Contact Us</h3>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>📧 support@ticketsystem.com</li>
              <li>📞 +1 (555) 123-4567</li>
              <li>📍 123 Business St, Suite 100</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-6 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/60 text-sm">
            © 2025 Akshay Software Technologies Private Limited. All rights reserved.
          </p>
          <div className="flex gap-4 mt-3 md:mt-0">
            <a href="#" className="text-white/60 hover:text-white text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-white/60 hover:text-white text-sm transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
