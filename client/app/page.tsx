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
import { InputAdornment } from "@mui/material";
import Logo from "@/components/Logo";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [playDialogOpen, setPlayDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [forgotPasswordDialogOpen, setForgotPasswordDialogOpen] = useState(false);
  
  const [user, setUser] = useState<{ id: string, username: string, avatar: number } | null>(null);
  
  const [authTab, setAuthTab] = useState(0);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get("invite");
    if (inviteCode) {
        setRoomCode(inviteCode);
        setPlayDialogOpen(true);
    }

    const token = localStorage.getItem("gameToken");
    if (token) {
      fetch("http://localhost:4000/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data._id) {
            setUser({ id: data._id, username: data.username, avatar: data.avatar });
          } else {
            localStorage.removeItem("gameToken");
          }
        })
        .catch(() => localStorage.removeItem("gameToken"));
    }
  }, []);

  const handleAuth = async () => {
    if (authTab === 0 && (!loginEmail.trim() || !loginPassword.trim())) return alert("Lütfen e-posta ve şifre girin!");
    if (authTab === 1 && (!loginEmail.trim() || !loginName.trim() || !loginPassword.trim())) return alert("Lütfen tüm alanları doldurun!");
    
    if (authTab === 1) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(loginEmail)) {
            return alert("Lütfen geçerli bir e-posta adresi girin.");
        }
        if (loginName.length < 3) {
            return alert("Kullanıcı adı en az 3 karakter olmalıdır.");
        }
        if (loginPassword.length < 8) {
            return alert("Şifre en az 8 karakter olmalıdır.");
        }
        if (!/(?=.*[a-z])/.test(loginPassword)) {
            return alert("Şifre en az bir küçük harf içermelidir.");
        }
        if (!/(?=.*[A-Z])/.test(loginPassword)) {
            return alert("Şifre en az bir büyük harf içermelidir.");
        }
        if (!/(?=.*\d)/.test(loginPassword)) {
            return alert("Şifre en az bir rakam (sayı) içermelidir.");
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
      } else {
        alert(data.error || "İşlem başarısız.");
      }
    } catch (err) {
      alert("Sunucuya bağlanılamadı.");
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
              body: JSON.stringify({ username: loginName })
          });
          const data = await res.json();
          if (data.id) {
              setUser(data);
              setProfileDialogOpen(false);
              alert("Profil güncellendi!");
          } else {
              alert(data.error || "Hata oluştu");
          }
      } catch (err) {}
  };

  const handleLogout = () => {
      localStorage.removeItem("gameToken");
      setUser(null);
      setProfileDialogOpen(false);
  };

  const openProfile = () => {
      setLoginName(user?.username || "");
      setProfileDialogOpen(true);
  };

  const handleCreate = () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    router.push(`/game/${code}`);
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return alert("Lütfen oda kodunu gir!");
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
                <Button color="inherit" className="text-cyan-400 hover:text-cyan-300 font-bold" onClick={openProfile} startIcon={<AccountCircleIcon />}>
                    {user.username}
                </Button>
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
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Klasik "Alnımdaki kağıtta ne yazıyor?" oyununun modern ve dijital hali. 
            Hemen kayıt ol, bir oda kur, arkadaşlarını davet et ve kim olduğunu bulmaya çalış!
          </p>
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
                onClick={() => { alert("Şifre sıfırlama maili gönderildi (Simülasyon)."); setForgotPasswordDialogOpen(false); }}
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
              className: "shadow-2xl shadow-cyan-500/10 min-w-[320px]" 
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
    </div>
  );
}
