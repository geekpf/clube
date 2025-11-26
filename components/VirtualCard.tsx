import React from 'react';
import { Profile } from '../types';
import { ShieldCheck, AlertCircle, QrCode } from 'lucide-react';

interface VirtualCardProps {
  profile: Profile;
}

export const VirtualCard: React.FC<VirtualCardProps> = ({ profile }) => {
  const isActive = profile.is_member && profile.membership_expires_at && new Date(profile.membership_expires_at) > new Date();
  
  // Create a display name from email if needed
  const displayName = profile.email ? profile.email.split('@')[0] : 'Membro Clube';
  
  // Format expiry date
  const expiryDate = profile.membership_expires_at 
    ? new Date(profile.membership_expires_at).toLocaleDateString('pt-BR') 
    : '---';

  // Generate a QR code URL for the member code
  const qrCodeUrl = profile.member_code 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${profile.member_code}`
    : null;

  return (
    <div className="w-full max-w-sm mx-auto perspective-1000">
      <div className={`relative w-full aspect-[1.586] rounded-2xl shadow-2xl overflow-hidden text-white transition-all duration-500 transform hover:scale-105 ${isActive ? 'bg-gradient-to-br from-green-700 via-green-600 to-emerald-800' : 'bg-gradient-to-br from-gray-600 to-gray-800 grayscale'}`}>
        
        {/* Background Texture/Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        
        <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center font-bold border border-white/30">
                C
              </div>
              <div>
                <h3 className="font-bold text-lg leading-none tracking-wide">Clube49</h3>
                <span className="text-[10px] uppercase tracking-wider opacity-80">Membro Oficial</span>
              </div>
            </div>
            {isActive ? (
              <div className="flex items-center gap-1 bg-green-400/20 backdrop-blur-md px-2 py-1 rounded-full border border-green-300/30">
                <ShieldCheck size={14} className="text-green-300" />
                <span className="text-xs font-semibold text-green-100">ATIVO</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-red-400/20 backdrop-blur-md px-2 py-1 rounded-full border border-red-300/30">
                <AlertCircle size={14} className="text-red-300" />
                <span className="text-xs font-semibold text-red-100">INATIVO</span>
              </div>
            )}
          </div>

          {/* Body Content */}
          <div className="flex justify-between items-end">
            <div className="flex-1 pr-4">
              <div className="mb-4">
                <p className="text-[10px] uppercase opacity-60 mb-0.5">Nome do Titular</p>
                <p className="font-medium text-lg truncate">{displayName}</p>
              </div>
              
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] uppercase opacity-60 mb-0.5">Código ID</p>
                  <p className="font-mono text-xl tracking-wider font-bold text-green-200">
                    {profile.member_code || '---'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase opacity-60 mb-0.5">Validade</p>
                  <p className="font-medium text-sm">{expiryDate}</p>
                </div>
              </div>
            </div>

            {/* QR Code Area */}
            <div className="bg-white p-2 rounded-lg shadow-inner">
               {isActive && qrCodeUrl ? (
                 <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16 object-cover" />
               ) : (
                 <div className="w-16 h-16 bg-gray-200 flex items-center justify-center">
                   <QrCode className="text-gray-400" size={24} />
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Instructions */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Apresente este cartão digital nos estabelecimentos parceiros para garantir seus benefícios.
        </p>
      </div>
    </div>
  );
};