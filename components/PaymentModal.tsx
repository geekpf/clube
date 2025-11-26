import React, { useState } from 'react';
import { X, Copy, CheckCircle, Loader2, CreditCard } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: () => void;
  amount: number;
  description: string;
  pixCode: string; // The "copy/paste" code
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, onClose, onConfirmPayment, amount, description, pixCode 
}) => {
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = () => {
    setVerifying(true);
    // Simulate checking AbacatePay status
    setTimeout(() => {
      setVerifying(false);
      onConfirmPayment();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Pagamento via PIX
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-4">
                    {description}
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center mb-4 border border-gray-200">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      R$ {amount.toFixed(2).replace('.', ',')}
                    </div>
                    {/* Placeholder QR Code visual */}
                    <div className="w-48 h-48 bg-gray-200 mb-2 flex items-center justify-center rounded">
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`} alt="QR Code PIX" className="w-full h-full" />
                    </div>
                    <p className="text-xs text-gray-400">Escaneie o QR Code no seu app de banco</p>
                  </div>

                  <div className="relative">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Pix Copia e Cola</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input 
                        type="text" 
                        readOnly 
                        value={pixCode}
                        className="focus:ring-green-500 focus:border-green-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 bg-gray-100 text-gray-500 p-2 border"
                      />
                      <button 
                        onClick={handleCopy}
                        className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 shadow-sm text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none"
                      >
                        {copied ? <CheckCircle size={16} className="text-green-500"/> : <Copy size={16}/>}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button 
              type="button" 
              onClick={handleVerify}
              disabled={verifying}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Verificando...
                </>
              ) : (
                'Já realizei o pagamento'
              )}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};