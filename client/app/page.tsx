"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TextField, Button, Dialog, DialogTitle, DialogContent, AppBar, Toolbar, Typography, Container, Card, CardContent, Tabs, Tab, Link as MuiLink } from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import GroupIcon from '@mui/icons-material/Group';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SavingsIcon from '@mui/icons-material/Savings';
import { InputAdornment, Avatar } from "@mui/material";
import { toast } from 'react-toastify';
import Logo from "@/components/Logo";
import { AVATARS } from "@/components/game/types";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [playDialogOpen, setPlayDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [forgotPasswordDialogOpen, setForgotPasswordDialogOpen] = useState(false);
  
  const [user, setUser] = useState<{ id: string, username: string, avatar: string, gold: number, unlockedAvatars: string[] } | null>(null);
  
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [shopItems, setShopItems] = useState<any[]>([]);

  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState({ activeRooms: 0, activePlayers: 0 });

  const [authTab, setAuthTab] = useState(0);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get("invite");
    if (inviteCode) {
        setRoomCode(inviteCode);
        setPlayDialogOpen(true);
    }

    fetch("http://localhost:4000/api/stats/live")
      .then(res => res.json())
      .then(data => setLiveStats(data))
      .catch(() => {});

    const token = localStorage.getItem("gameToken");
    if (token) {
      fetch("http://localhost:4000/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setUser({ id: data.id, username: data.username, avatar: data.avatar, gold: data.gold, unlockedAvatars: data.unlockedAvatars });
          } else {
            localStorage.removeItem("gameToken");
          }
        })
        .catch(() => localStorage.removeItem("gameToken"));
    }

    fetch("http://localhost:4000/api/shop/items")
      .then(res => res.json())
      .then(data => setShopItems(data))
      .catch(() => {});
  }, []);

  const handleOpenLeaderboard = () => {
      fetch("http://localhost:4000/api/stats/leaderboard")
        .then(res => res.json())
        .then(data => {
            setLeaderboard(data);
            setLeaderboardDialogOpen(true);
        })
        .catch(() => toast.error("Liderlik tablosu yüklenemedi."));
  };

  const handleAuth = async () => {
    if (authTab === 0 && (!loginEmail.trim() || !loginPassword.trim())) return toast.error("Lütfen e-posta ve şifre girin!");
    if (authTab === 1 && (!loginEmail.trim() || !loginName.trim() || !loginPassword.trim())) return toast.error("Lütfen tüm alanları doldurun!");
    
    if (authTab === 1) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(loginEmail)) {
            return toast.error("Lütfen geçerli bir e-posta adresi girin.");
        }
        if (loginName.length < 3) {
            return toast.error("Kullanıcı adı en az 3 karakter olmalıdır.");
        }
        if (loginPassword.length < 8) {
            return toast.error("Şifre en az 8 karakter olmalıdır.");
        }
        if (!/(?=.*[a-z])/.test(loginPassword)) {
            return toast.error("Şifre en az bir küçük harf içermelidir.");
        }
        if (!/(?=.*[A-Z])/.test(loginPassword)) {
            return toast.error("Şifre en az bir büyük harf içermelidir.");
        }
        if (!/(?=.*\d)/.test(loginPassword)) {
            return toast.error("Şifre en az bir rakam (sayı) içermelidir.");
        }
    }

    setLoginLoading(true);
    
    const endpoint = authTab === 0 ? "login" : "register";
    const payload = authTab === 0 
        ? { email: loginEmail, password: loginPassword }
        : { email: loginEmail, username: loginName, password: loginPassword };
    
    try {
      const res = await fetch(`http://localhost:4000/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.token) {
        setUser(data.user);
        localStorage.setItem("gameToken", data.token);
        setLoginName("");
        setLoginEmail("");
        setLoginPassword("");
        toast.success(`Hoş geldin ${data.user.username}!`);
      } else {
        toast.error(data.error || "İşlem başarısız.");
      }
    } catch (err) {
      toast.error("Sunucuya bağlanılamadı.");
    }
    setLoginLoading(false);
  };

  const handleUpdateProfile = async () => {
      const token = localStorage.getItem("gameToken");
      if (!token) return;
      try {
          const res = await fetch("http://localhost:4000/api/auth/profile", {
              method: "PUT",
              headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ username: loginName, avatar: selectedAvatar })
          });
          const data = await res.json();
          if (data.id) {
              setUser(data);
              setProfileDialogOpen(false);
              toast.success("Profil güncellendi!");
          } else {
              toast.error(data.error || "Hata oluştu");
          }
      } catch (err) {
          toast.error("Sunucuya bağlanılamadı.");
      }
  };

  const handleLogout = () => {
      localStorage.removeItem("gameToken");
      setUser(null);
      setProfileDialogOpen(false);
  };

  const handleBuyAvatar = async (avatarId: string) => {
    const token = localStorage.getItem("gameToken");
    if (!token) return toast.error("Giriş yapmanız gerekiyor.");
    
    try {
      const res = await fetch("http://localhost:4000/api/shop/buy", {
          method: "POST",
          headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ avatarId })
      });
      const data = await res.json();
      if (res.ok) {
          toast.success(data.message);
          if (user) {
              setUser({ ...user, gold: data.gold, unlockedAvatars: data.unlockedAvatars });
          }
      } else {
          toast.error(data.error);
      }
    } catch (err) {
      toast.error("Sunucuya bağlanılamadı.");
    }
  };

  const openProfile = () => {
      setLoginName(user?.username || "");
      setSelectedAvatar(user?.avatar || "default-violet");
      setProfileDialogOpen(true);
  };

  const handleCreate = () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    router.push(`/game/${code}`);
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return toast.warning("Lütfen oda kodunu gir!");
    router.push(`/game/${roomCode.toUpperCase()}`);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleForgotPassword = () => {
      setForgotPasswordDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-violet-500/30">
      
      <AppBar position="sticky" elevation={0} color="transparent" className="bg-slate-900/60 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20">
        <Container maxWidth="lg">
          <Toolbar disableGutters className="flex justify-between py-3">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                <Logo size="sm" />
                <Typography variant="h6" className="font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 hidden sm:block tracking-wider">
                  NOTEKİM
                </Typography>
            </div>
            <div className="hidden md:flex gap-6 items-center">
              <Button color="inherit" className="text-slate-300 hover:text-white" onClick={() => scrollToSection('nasil-oynanir')}>Nasıl Oynanır?</Button>
              <Button color="inherit" className="text-slate-300 hover:text-white" onClick={() => scrollToSection('biz-kimiz')}>Biz Kimiz?</Button>
              
              {user && (
                <>
                    <Button color="warning" className="font-bold border border-yellow-500/50 bg-yellow-500/10 rounded-full px-4" startIcon={<SavingsIcon />}>
                        {user.gold || 0}
                    </Button>
                    <Button color="inherit" className="text-cyan-400 hover:text-cyan-300 font-bold" onClick={() => setShopDialogOpen(true)} startIcon={<StorefrontIcon />}>
                        Mağaza
                    </Button>
                    <Button color="inherit" className="text-amber-400 hover:text-amber-300 font-bold" onClick={handleOpenLeaderboard}>
                        🏆 Liderlik
                    </Button>
                    <Button color="inherit" className="text-cyan-400 hover:text-cyan-300 font-bold" onClick={openProfile} startIcon={<AccountCircleIcon />}>
                        {user.username}
                    </Button>
                </>
              )}

              <Button variant="contained" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 shadow-lg shadow-violet-500/25 font-bold rounded-full px-8 py-2" onClick={() => setPlayDialogOpen(true)}>
                Oyna
              </Button>
            </div>
          </Toolbar>
        </Container>
      </AppBar>

      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        <Container maxWidth="md" className="relative z-10 text-center">
          <div className="flex justify-center mb-10 animate-bounce">
            <Logo size="xl" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Arkadaşlarınla Eğlenceli <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">Tahmin Oyunu</span>
          </h1>
          <p className="text-xl text-slate-400 mb-6 max-w-2xl mx-auto leading-relaxed">
            Klasik "Alnımdaki kağıtta ne yazıyor?" oyununun modern ve dijital hali. 
            Hemen kayıt ol, bir oda kur, arkadaşlarını davet et ve kim olduğunu bulmaya çalış!
          </p>
          
          <div className="flex justify-center items-center gap-6 mb-10 text-slate-300 bg-slate-800/50 w-max mx-auto px-6 py-2 rounded-full border border-slate-700 shadow-xl">
              <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="font-bold">{liveStats.activePlayers} Oyuncu</span>
              </div>
              <div className="w-px h-4 bg-slate-600"></div>
              <div className="font-bold text-cyan-400">{liveStats.activeRooms} Aktif Oda</div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              variant="contained" 
              size="large" 
              startIcon={<PlayArrowIcon />}
              onClick={() => setPlayDialogOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-lg py-3 px-8 rounded-full font-bold shadow-lg shadow-violet-500/25"
            >
              Hemen Başla
            </Button>
            <Button 
              variant="outlined" 
              size="large" 
              onClick={() => scrollToSection('nasil-oynanir')}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500 text-lg py-3 px-8 rounded-full"
            >
              Nasıl Oynanır?
            </Button>
          </div>
        </Container>
      </section>

      <section id="nasil-oynanir" className="py-20 bg-slate-800/30 border-y border-slate-800">
        <Container maxWidth="lg">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">Nasıl Oynanır?</h2>
            <p className="text-slate-400 text-lg">Sadece 3 basit adımda oynamaya başla.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-800 border border-slate-700 text-white shadow-xl hover:-translate-y-2 transition-transform duration-300">
              <CardContent className="p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 text-blue-400">
                  <GroupIcon fontSize="large" />
                </div>
                <h3 className="text-2xl font-bold mb-3">1. Odada Toplanın</h3>
                <p className="text-slate-400">Giriş yapıp bir oda kur ve davet linkini arkadaşlarınla paylaş.</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border border-slate-700 text-white shadow-xl hover:-translate-y-2 transition-transform duration-300">
              <CardContent className="p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-violet-500/20 rounded-2xl flex items-center justify-center mb-6 text-violet-400">
                  <LightbulbIcon fontSize="large" />
                </div>
                <h3 className="text-2xl font-bold mb-3">2. Kelimeleri Seçin</h3>
                <p className="text-slate-400">Oyun başladığında, eşleştiğin arkadaşının alnında yazacak kelimeyi sen belirle.</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border border-slate-700 text-white shadow-xl hover:-translate-y-2 transition-transform duration-300">
              <CardContent className="p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6 text-green-400">
                  <QuestionMarkIcon fontSize="large" />
                </div>
                <h3 className="text-2xl font-bold mb-3">3. Sorular Sor</h3>
                <p className="text-slate-400">Sıran geldiğinde diğerlerine sorular sorarak kim olduğunu tahmin et!</p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      <section id="biz-kimiz" className="py-20">
        <Container maxWidth="md" className="text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-6">Biz Kimiz?</h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Amacımız, klasik masa oyunlarının verdiği samimi ve eğlenceli hissi dijital dünyaya taşımak. 
            Arkadaşlarınızla yan yana veya uzaklarda olsanız bile, sesli sohbet altyapımız ve hızlı oyun motorumuz 
            sayesinde sanki aynı masadaymışsınız gibi kahkaha dolu anlar yaşamanızı sağlamak istiyoruz.
          </p>
          <p className="text-slate-500">
            Geliştirici: Bedir Hüseyin Özcan
          </p>
        </Container>
      </section>

      <footer className="py-8 border-t border-slate-800 text-center text-slate-500">
        <p>© 2026 Notekim. Tüm hakları saklıdır.</p>
      </footer>

      <Dialog 
        open={playDialogOpen} 
        onClose={() => setPlayDialogOpen(false)}
        slotProps={{ 
            paper: { 
              style: { backgroundColor: '#0f172a', color: 'white', borderRadius: '1.5rem', border: '1px solid #334155' },
              className: "shadow-2xl shadow-violet-500/10 min-w-[320px] sm:min-w-[400px]" 
            }
        }}
      >
        <DialogTitle className="text-center font-black text-2xl pt-8 pb-2">
          {user ? "Odaya Katıl veya Kur" : "Platforma Giriş Yap"}
        </DialogTitle>
        <DialogContent className="p-8">
          
          {!user ? (
            <div className="space-y-5">
              <Tabs 
                value={authTab} 
                onChange={(_, v) => setAuthTab(v)} 
                centered 
                textColor="inherit"
                slotProps={{ indicator: { style: { backgroundColor: '#8b5cf6', height: '3px', borderRadius: '3px' } } }}
                className="mb-4"
              >
                <Tab label="Giriş Yap" className="font-bold text-base" />
                <Tab label="Kayıt Ol" className="font-bold text-base" />
              </Tabs>
              
              <TextField
                placeholder="E-posta"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                slotProps={{ 
                  input: {
                    style: { color: 'white', backgroundColor: '#1e293b', borderRadius: '0.75rem', fontWeight: 'bold' },
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    )
                  }
                }}
                fullWidth
              />

              {authTab === 1 && (
                <TextField
                  placeholder="Kullanıcı Adı (Nick)"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  slotProps={{ 
                    input: {
                      style: { color: 'white', backgroundColor: '#1e293b', borderRadius: '0.75rem', fontWeight: 'bold' },
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      )
                    }
                  }}
                  fullWidth
                />
              )}

              <div>
                <TextField
                  placeholder="Şifre"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  slotProps={{ 
                    input: {
                      style: { color: 'white', backgroundColor: '#1e293b', borderRadius: '0.75rem', fontWeight: 'bold' },
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      )
                    }
                  }}
                  fullWidth
                />
                {authTab === 0 && (
                    <div className="text-right mt-2">
                        <MuiLink 
                            component="button" 
                            variant="body2" 
                            onClick={handleForgotPassword}
                            className="text-slate-400 hover:text-violet-400 font-medium"
                            underline="hover"
                        >
                            Şifremi Unuttum?
                        </MuiLink>
                    </div>
                )}
              </div>

              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={loginLoading}
                onClick={handleAuth}
                className="py-4 mt-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 font-bold text-lg shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-shadow"
              >
                {loginLoading ? "İşleniyor..." : (authTab === 0 ? "GİRİŞ YAP" : "KAYIT OL")}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center mb-6 relative">
                <p className="text-sm text-slate-400">Hoş geldin,</p>
                <p className="text-xl font-bold text-cyan-400">{user.username}</p>
                <Button size="small" className="absolute top-2 right-2 text-slate-500 text-xs" onClick={openProfile}>Düzenle</Button>
              </div>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleCreate}
                className="py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 font-bold text-lg shadow-lg shadow-violet-500/20 hover:scale-[1.02] transition-transform"
              >
                Yeni Oda Kur
              </Button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink-0 mx-4 text-slate-500 text-sm font-bold uppercase">veya Kod ile Katıl</span>
                <div className="flex-grow border-t border-slate-700"></div>
              </div>

              <div className="flex flex-col gap-3">
                <TextField
                  placeholder="ODA KODU"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  slotProps={{ 
                      input: {
                        style: { color: 'white', backgroundColor: '#1e293b', borderRadius: '1rem', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.1em' }
                      }
                  }}
                  fullWidth
                />
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  onClick={handleJoin}
                  className="py-3 rounded-2xl border-slate-600 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Odaya Katıl 🚀
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog 
        open={forgotPasswordDialogOpen} 
        onClose={() => setForgotPasswordDialogOpen(false)}
        slotProps={{ 
            paper: { 
              style: { backgroundColor: '#0f172a', color: 'white', borderRadius: '1.5rem', border: '1px solid #334155' },
              className: "shadow-2xl shadow-violet-500/10 min-w-[320px]" 
            }
        }}
      >
        <DialogTitle className="text-center font-black text-xl pt-6 pb-2">Şifremi Unuttum</DialogTitle>
        <DialogContent className="p-6 space-y-5 text-center">
            <p className="text-slate-400 text-sm mb-4">
                Kayıt olduğunuz e-posta adresinizi girin. Size bir şifre sıfırlama bağlantısı göndereceğiz.
            </p>
            <TextField
                placeholder="E-posta adresiniz"
                type="email"
                slotProps={{ 
                  input: {
                    style: { color: 'white', backgroundColor: '#1e293b', borderRadius: '0.75rem', fontWeight: 'bold' },
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    )
                  }
                }}
                fullWidth
            />
            <Button
                variant="contained"
                fullWidth
                onClick={() => { toast.success("Şifre sıfırlama maili gönderildi (Simülasyon)."); setForgotPasswordDialogOpen(false); }}
                className="py-3 mt-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold shadow-lg shadow-violet-500/20"
            >
                Bağlantı Gönder
            </Button>
        </DialogContent>
      </Dialog>
      <Dialog 
        open={profileDialogOpen} 
        onClose={() => setProfileDialogOpen(false)}
        slotProps={{ 
            paper: { 
              style: { backgroundColor: '#0f172a', color: 'white', borderRadius: '1.5rem', border: '1px solid #334155' },
              className: "shadow-2xl shadow-cyan-500/10 min-w-[320px] sm:min-w-[400px]" 
            }
        }}
      >
        <DialogTitle className="text-center font-black text-2xl pt-6 pb-2">Profilim</DialogTitle>
        <DialogContent className="p-6 space-y-5">
            <TextField
                label="Kullanıcı Adı"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                slotProps={{ 
                  input: { style: { color: 'white', backgroundColor: '#1e293b', borderRadius: '0.75rem', fontWeight: 'bold' } },
                  inputLabel: { style: { color: '#94a3b8' } }
                }}
                fullWidth
            />

            <div>
                <p className="text-slate-400 text-sm mb-3">Karakterini Seç (Envanter):</p>
                <div className="flex flex-wrap gap-3 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                    {user?.unlockedAvatars?.map(avId => {
                        const av = AVATARS.find(a => a.id === avId);
                        if (!av) return null;
                        return (
                            <div 
                                key={av.id} 
                                onClick={() => setSelectedAvatar(av.id)}
                                className={`w-12 h-12 rounded-full cursor-pointer flex justify-center items-center transition-all ${av.color} 
                                    ${selectedAvatar === av.id ? 'ring-4 ring-white scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'}`}
                            >
                                {av.icon ? (
                                    <span className="text-2xl flex items-center justify-center w-full h-full">{av.icon}</span>
                                ) : (
                                    <span className="text-xl font-bold">{user.username.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <Button
                variant="contained"
                fullWidth
                onClick={handleUpdateProfile}
                className="py-3 mt-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold shadow-lg shadow-cyan-500/20"
            >
                Güncelle
            </Button>
            <Button
                variant="text"
                color="error"
                fullWidth
                onClick={handleLogout}
                className="mt-2 font-bold hover:bg-red-500/10"
            >
                Çıkış Yap
            </Button>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={shopDialogOpen} 
        onClose={() => setShopDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ 
            paper: { 
              style: { backgroundColor: '#0f172a', color: 'white', borderRadius: '1.5rem', border: '1px solid #334155' },
              className: "shadow-2xl shadow-yellow-500/10" 
            }
        }}
      >
        <DialogTitle className="text-center font-black text-2xl pt-6 pb-2">
            Mağaza 🛒
            <p className="text-sm text-yellow-500 mt-1 font-bold">Mevcut Altının: {user?.gold || 0}</p>
        </DialogTitle>
        <DialogContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {shopItems.map((item) => {
                    const isUnlocked = user?.unlockedAvatars?.includes(item.id);
                    const avMeta = AVATARS.find(a => a.id === item.id);
                    return (
                        <div key={item.id} className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 flex flex-col items-center text-center">
                            {avMeta?.icon ? (
                                <span className="text-5xl mb-2 flex justify-center items-center h-[60px] w-[60px]">{avMeta.icon}</span>
                            ) : (
                                <span className="text-5xl mb-2 flex justify-center items-center h-[60px] w-[60px]">{item.icon}</span>
                            )}
                            <span className="font-bold text-slate-200">{item.label}</span>
                            <div className="mt-3 w-full">
                                {isUnlocked ? (
                                    <Button disabled fullWidth size="small" variant="contained" className="bg-slate-700 text-slate-400 !cursor-not-allowed rounded-lg">
                                        Alındı
                                    </Button>
                                ) : (
                                    <Button 
                                        fullWidth size="small" variant="contained" color="warning"
                                        onClick={() => handleBuyAvatar(item.id)}
                                        className="font-bold rounded-lg shadow-lg"
                                        startIcon={<SavingsIcon fontSize="small" />}
                                    >
                                        {item.price}
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={leaderboardDialogOpen} 
        onClose={() => setLeaderboardDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ 
            paper: { 
              style: { backgroundColor: '#0f172a', color: 'white', borderRadius: '1.5rem', border: '1px solid #334155' },
              className: "shadow-2xl shadow-amber-500/10" 
            }
        }}
      >
        <DialogTitle className="text-center font-black text-3xl pt-8 pb-4 text-amber-400">
            🏆 Liderler Tablosu
        </DialogTitle>
        <DialogContent className="p-6">
            <div className="space-y-3">
                {leaderboard.length === 0 ? (
                    <p className="text-center text-slate-500">Henüz kimse listeye giremedi.</p>
                ) : (
                    leaderboard.map((u, index) => {
                        const avMeta = AVATARS.find(a => a.id === u.avatar);
                        return (
                            <div key={u._id} className={`flex justify-between items-center p-4 rounded-xl border ${index < 3 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800 border-slate-700'}`}>
                                <div className="flex items-center gap-4">
                                    <span className={`font-black text-2xl w-8 text-center ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                                        #{index + 1}
                                    </span>
                                    <Avatar className={avMeta?.color || 'bg-violet-600'}>
                                        {avMeta?.icon ? <span className="text-xl flex items-center justify-center h-full w-full">{avMeta.icon}</span> : u.username.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <span className="font-bold text-lg">{u.username}</span>
                                </div>
                                <div className="flex items-center gap-1 text-yellow-400 font-bold bg-yellow-400/10 px-3 py-1 rounded-full">
                                    <SavingsIcon fontSize="small" />
                                    <span>{u.gold || 0}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <Button
                variant="outlined"
                fullWidth
                onClick={() => setLeaderboardDialogOpen(false)}
                className="mt-6 py-3 rounded-xl border-slate-600 text-slate-300 font-bold hover:bg-slate-800"
            >
                Kapat
            </Button>
        </DialogContent>
      </Dialog>

    </div>
  );
}
