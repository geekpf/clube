import React from 'react';
import { LogOut, User, CreditCard, ShoppingBag } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LayoutProps {
  children: React.ReactNode;
  userEmail: string | null | undefined;
}

export const Layout: React.FC<LayoutProps> = ({ children, userEmail }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">
                  C
                </div>
                <span className="font-bold text-xl text-gray-800">Clube<span className="text-green-600">49</span></span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-xs text-gray-500">Logado como</span>
                <span className="text-sm font-medium text-gray-900">{userEmail}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Clube de Benefícios. Integração Supabase & AbacatePay.
        </div>
      </footer>
    </div>
  );
};