import React, { useEffect, useState } from 'react';
import { supabase } from './services/supabase';
import { Layout } from './components/Layout';
import { SetupGuide } from './components/SetupGuide';
import { PaymentModal } from './components/PaymentModal';
import { VirtualCard } from './components/VirtualCard';
import { createBilling } from './services/abacateService';
import { Profile, Coupon, UserCoupon, Transaction } from './types';
import { Lock, Unlock, CreditCard, Ticket, ShoppingCart, Loader2, Wallet, History, Gift, CreditCard as CardIcon, User } from 'lucide-react';

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Action Loading States
  const [purchasing, setPurchasing] = useState(false); // For coupons
  const [purchasingMembership, setPurchasingMembership] = useState(false); // For membership
  
  // App State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');

  // Payment State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: 0, description: '', pixCode: '', type: '' as 'membership' | 'premium', couponId: '' });

  // Load Initial Data
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        fetchUserData(session.user.id);
        fetchCoupons();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id);
        fetchCoupons();
      } else {
        setProfile(null);
        setMyCoupons([]);
        setTransactions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    // 1. Get Profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    setProfile(profileData);

    // 2. Get User Coupons
    const { data: userCouponsData } = await supabase
      .from('user_coupons')
      .select('*, coupons(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    setMyCoupons(userCouponsData || []);

    // 3. Get Transactions
    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    setTransactions(transactionsData || []);
  };

  const fetchCoupons = async () => {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('value_real', { ascending: true });
    setCoupons(data || []);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Conta criada! Você já pode fazer login.");
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const initiateMembershipPayment = async () => {
    setPurchasingMembership(true);
    try {
      const response = await createBilling(49.90, profile?.email || "customer@example.com", "Anuidade Clube49");
      setPaymentData({
        amount: 49.90,
        description: "Anuidade Clube49 - Acesso por 1 ano + R$49,90 em créditos",
        pixCode: response.pixCode || '',
        type: 'membership',
        couponId: ''
      });
      setPaymentModalOpen(true);
    } catch (error) {
      console.error("Payment init error:", error);
      alert("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setPurchasingMembership(false);
    }
  };

  const initiatePremiumCouponPayment = async (coupon: Coupon) => {
    setPurchasingMembership(true); // Reusing state for loading indication
    try {
      const response = await createBilling(coupon.cost_monetary || 0, profile?.email || "customer@example.com", `Cupom Premium: ${coupon.title}`);
      setPaymentData({
        amount: coupon.cost_monetary || 0,
        description: `Compra Cupom Premium: ${coupon.title}`,
        pixCode: response.pixCode || '',
        type: 'premium',
        couponId: coupon.id
      });
      setPaymentModalOpen(true);
    } catch (error) {
      console.error("Payment init error:", error);
      alert("Erro ao iniciar pagamento.");
    } finally {
      setPurchasingMembership(false);
    }
  };

  const buyStandardCoupon = async (coupon: Coupon) => {
    if (!profile) return;
    
    // Safety check
    if (profile.credits < (coupon.cost_credits || 0)) {
        alert("Saldo insuficiente!");
        return;
    }

    setPurchasing(true);

    try {
        // Use the Secure RPC function
        const { data, error } = await supabase.rpc('buy_coupon', {
            p_user_id: profile.id,
            p_coupon_id: coupon.id,
            p_cost: Number(coupon.cost_credits) // Explicit number cast
        });

        if (error) throw error;

        // Check the JSON response from the function
        if (data && data.success) {
            await fetchUserData(profile.id);
            alert(data.message || "Cupom resgatado!");
            // Scroll to my coupons
            document.getElementById('my-coupons-section')?.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert(data?.message || "Erro ao resgatar cupom.");
        }
    } catch (error: any) {
        console.error('Error buying coupon:', error);
        alert("Erro ao processar compra: " + error.message);
    } finally {
        setPurchasing(false);
    }
  };

  const confirmPayment = async () => {
    setPaymentModalOpen(false);
    setLoading(true); // Show global loading while processing backend
    
    try {
      if (!profile) return;

      console.log("Processing payment confirmation for type:", paymentData.type);

      if (paymentData.type === 'membership') {
         // Call Secure RPC for Membership Activation
         const { data, error } = await supabase.rpc('activate_membership', {
            p_user_id: profile.id,
            p_amount: 49.90,
            p_description: "Anuidade Paga via Pix"
         });

         if (error) {
           console.error("RPC Error:", error);
           if (error.code === 'PGRST202' || error.message.includes('function not found')) {
              alert("ERRO CRÍTICO: Função de banco de dados não encontrada. Por favor, copie o código do quadro amarelo 'SetupGuide' e rode no Supabase.");
              return;
           }
           throw error;
         }

         if (data && !data.success) throw new Error(data.message);

         alert("Parabéns! Você agora é membro do Clube49. Seus créditos foram adicionados.");
      } else if (paymentData.type === 'premium') {
         // For premium coupons paid with money, we use buy_coupon with cost 0 (since money was paid externally)
         const { data, error } = await supabase.rpc('buy_coupon', {
            p_user_id: profile.id,
            p_coupon_id: paymentData.couponId,
            p_cost: 0 // Cost in CREDITS is 0 because user paid CASH
         });
         
         if (error) throw error;
         if (data && !data.success) throw new Error(data.message);

         alert("Pagamento confirmado! Seu cupom premium está disponível.");
         document.getElementById('my-coupons-section')?.scrollIntoView({ behavior: 'smooth' });
      }
      
      // Force reload user data to update UI (credits, membership status)
      await fetchUserData(profile.id);

    } catch (error: any) {
      console.error("Error confirming payment:", error);
      alert("Erro ao processar ativação: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-green-600">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              C
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            {isLogin ? 'Bem-vindo ao Clube' : 'Criar Conta'}
          </h2>
          {authError && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition font-medium"
            >
              {isLogin ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-green-600 hover:text-green-500"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout userEmail={session.user.email}>
      
      <SetupGuide />

      <PaymentModal 
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onConfirmPayment={confirmPayment}
        amount={paymentData.amount}
        description={paymentData.description}
        pixCode={paymentData.pixCode}
      />

      {/* Header Info */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg md:col-span-2">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Bem-vindo(a)</dt>
                  <dd className="text-lg font-medium text-gray-900">{profile?.email}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
             <div className="text-sm text-gray-700">
               Status: <span className={`font-bold ${profile?.is_member ? 'text-green-600' : 'text-gray-500'}`}>
                 {profile?.is_member ? 'Membro Ativo' : 'Visitante'}
               </span>
             </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-100 rounded-md p-3">
                <Wallet className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Seus Créditos</dt>
                  <dd className="text-2xl font-bold text-gray-900">R$ {profile?.credits.toFixed(2).replace('.', ',')}</dd>
                </dl>
              </div>
            </div>
          </div>
           <div className="bg-gray-50 px-5 py-3">
             <div className="text-xs text-gray-500">
                Use seus créditos para resgatar cupons.
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Membership & Virtual Card */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Virtual Card Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <CardIcon className="text-gray-400" size={20}/>
              Carteirinha Digital
            </h3>
            {profile && <VirtualCard profile={profile} />}
          </div>

          {/* Membership CTA */}
          {(!profile?.is_member) && (
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white text-center">
              <h3 className="text-xl font-bold mb-2">Seja Membro Clube49</h3>
              <p className="mb-6 opacity-90 text-sm">
                Por apenas <strong>R$ 49,90/ano</strong>, você recebe o valor integral em créditos e acessa ofertas exclusivas.
              </p>
              <button 
                onClick={initiateMembershipPayment}
                disabled={purchasingMembership}
                className="w-full bg-white text-green-700 font-bold py-3 px-4 rounded shadow hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {purchasingMembership ? <Loader2 className="animate-spin h-5 w-5"/> : <Unlock size={18} />}
                {purchasingMembership ? 'Gerando PIX...' : 'Assinar Agora'}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Marketplace & History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Marketplace */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Ticket className="text-gray-500" />
              Cupons Disponíveis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                  <div className="h-32 bg-gray-200 relative">
                    <img src={coupon.image_url} alt={coupon.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {coupon.type === 'premium' ? 'PREMIUM' : 'STANDARD'}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-gray-800">{coupon.title}</h4>
                    <p className="text-sm text-gray-500 mb-3">{coupon.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-sm">
                        <span className="block text-xs text-gray-400">Valor Real</span>
                        <span className="font-semibold text-gray-700">R$ {coupon.value_real.toFixed(2).replace('.', ',')}</span>
                      </div>
                      
                      {coupon.type === 'standard' ? (
                        <button 
                          onClick={() => buyStandardCoupon(coupon)}
                          disabled={purchasing || (profile?.credits || 0) < (coupon.cost_credits || 0)}
                          className="bg-green-100 text-green-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-green-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {purchasing ? <Loader2 className="animate-spin h-3 w-3" /> : <ShoppingCart size={14} />}
                          Resgatar (-R${coupon.cost_credits})
                        </button>
                      ) : (
                        <button 
                          onClick={() => initiatePremiumCouponPayment(coupon)}
                          className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-purple-200 transition flex items-center gap-1"
                        >
                          <CreditCard size={14} />
                          Comprar (R${coupon.cost_monetary})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* My Coupons */}
          <div id="my-coupons-section" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Gift className="text-green-500" />
                Meus Cupons Ativos
              </h3>
            </div>
            {myCoupons.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                Você ainda não possui cupons.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {myCoupons.map((uc) => (
                  <li key={uc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50">
                    <div className="mb-2 sm:mb-0">
                      <p className="text-sm font-medium text-gray-900">{uc.coupons?.title}</p>
                      <p className="text-xs text-gray-500">Adquirido em {new Date(uc.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 px-3 py-1 rounded border border-dashed border-gray-400 font-mono text-sm font-bold tracking-wider text-gray-700">
                        {uc.code}
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Ativo
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Transactions */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <History className="text-gray-500" />
                Histórico
              </h3>
            </div>
             <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {t.description}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.amount > 0 ? '+' : ''}R$ {Math.abs(t.amount).toFixed(2).replace('.',',')}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        Nenhuma movimentação recente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default App;