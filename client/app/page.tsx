"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TextField, Button, Dialog, DialogTitle, DialogContent, AppBar, Toolbar, Container, Tabs, Tab, Link as MuiLink, IconButton, Drawer, List, InputAdornment, Avatar } from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import GroupIcon from '@mui/icons-material/Group';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import StorefrontIcon from '@mui/icons-material/Storefront';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { toast } from 'react-toastify';
import Logo from "@/components/Logo";
import { AVATARS, PEDESTALS, getRankInfo, NAME_COLORS, TITLES } from "@/components/game/types";
import { getAudioContext } from "@/utils/audio";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [playDialogOpen, setPlayDialogOpen] = useState(false);

  const initAudio = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
          ctx.resume();
      }
  };
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [forgotPasswordDialogOpen, setForgotPasswordDialogOpen] = useState(false);
  
  const [user, setUser] = useState<{ id: string, username: string, avatar: string, pedestal?: string, nameColor?: string, title?: string, gold: number, unlockedAvatars: string[], unlockedPedestals?: string[], unlockedNameColors?: string[], unlockedTitles?: string[], rankInfo?: { title: string, reputation: number, nextThreshold: number | null }, quests?: any[], canClaimDaily?: boolean, loginStreak?: number } | null>(null);
  
  const [questsDialogOpen, setQuestsDialogOpen] = useState(false);

  const handleClaimQuest = async (questId: string) => {
      const token = localStorage.getItem("gameToken");
      if (!token) return;
      try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/auth/claim-quest`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({ questId })
          });
          const data = await res.json();
          if (res.ok) {
              toast.success("Ödül alındı! 🎉");
              setUser(prev => prev ? { ...prev, gold: data.gold, rankInfo: data.rankInfo, quests: data.quests } : prev);
          } else {
              toast.error(data.error);
          }
      } catch (e) {
          toast.error("Bağlantı hatası!");
      }
  };
  
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [shopTab, setShopTab] = useState(0);
  const [dailyRewardDialogOpen, setDailyRewardDialogOpen] = useState(false);
  const [shopItems, setShopItems] = useState<any[]>([]);

  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState({ activeRooms: 0, activePlayers: 0 });

  const [authTab, setAuthTab] = useState(0);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [selectedPedestal, setSelectedPedestal] = useState("");
  const [selectedNameColor, setSelectedNameColor] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get("invite");
    if (inviteCode) {
        setRoomCode(inviteCode);
        setPlayDialogOpen(true);
    }

    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/stats/live`)
      .then(res => res.json())
      .then(data => setLiveStats(data))
      .catch(() => {});

    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/shop/items`)
      .then(res => res.json())
      .then(data => setShopItems(data))
      .catch(() => {});
  }, []);

  const fetchMe = (token: string) => {
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/auth/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setUser({ 
              id: data.id, 
              username: data.username, 
              avatar: data.avatar, 
              pedestal: data.pedestal,
              nameColor: data.nameColor,
              title: data.title,
              gold: data.gold, 
              unlockedAvatars: data.unlockedAvatars,
              unlockedPedestals: data.unlockedPedestals || ['default_stone'],
              unlockedNameColors: data.unlockedNameColors || ['text-white'],
              unlockedTitles: data.unlockedTitles || [],
              rankInfo: data.rankInfo,
              quests: data.quests,
              canClaimDaily: data.canClaimDaily,
              loginStreak: data.loginStreak
          });
        } else {
          localStorage.removeItem("gameToken");
        }
      })
      .catch(() => localStorage.removeItem("gameToken"));
  };

  useEffect(() => {
    const token = localStorage.getItem("gameToken");
    if (token) fetchMe(token);
  }, []);

  const handleOpenLeaderboard = () => {
      fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/stats/leaderboard`)
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.token) {
        localStorage.setItem("gameToken", data.token);
        fetchMe(data.token);
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
          const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/auth/profile`, {
              method: "PUT",
              headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ username: loginName, avatar: selectedAvatar, pedestal: selectedPedestal, nameColor: selectedNameColor, title: selectedTitle })
          });
          const data = await res.json();
          if (data.id) {
              setUser(prev => prev ? { ...prev, ...data } : data);
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

  const handleBuyItem = async (itemId: string) => {
    const token = localStorage.getItem("gameToken");
    if (!token) return toast.error("Giriş yapmanız gerekiyor.");
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/shop/buy`, {
          method: "POST",
          headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ itemId })
      });
      const data = await res.json();
      if (res.ok) {
          toast.success(data.message);
          if (user) {
              setUser({ ...user, gold: data.gold, unlockedAvatars: data.unlockedAvatars, unlockedPedestals: data.unlockedPedestals, unlockedNameColors: data.unlockedNameColors, unlockedTitles: data.unlockedTitles });
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
      setSelectedAvatar(user?.avatar || "Warrior");
      setSelectedPedestal(user?.pedestal || "default_stone");
      setSelectedNameColor(user?.nameColor || "text-white");
      setSelectedTitle(user?.title || "");
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

  const handleClaimDaily = async () => {
    const token = localStorage.getItem("gameToken");
    if (!token) return;
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/auth/daily-reward`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            toast.success(`🎁 📅 ${data.streak}. Gün Giriş Ödülü: ${data.amount} Altın kazandınız!`, {
                autoClose: 5000
            });
            setUser(prev => prev ? { ...prev, gold: data.gold, canClaimDaily: false, loginStreak: data.streak } : prev);
        } else {
            toast.error(data.error || "Ödül alınamadı.");
        }
    } catch (e) {
        toast.error("Bağlantı hatası!");
    }
  };

  const inputFieldSx = {
    input: { color: '#F6F5F2', fontWeight: 600, fontFamily: 'var(--font-sans)' },
    label: { color: '#A0A8B8' },
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#111318',
      borderRadius: '4px',
      '& fieldset': { borderColor: '#2D3342', borderWidth: '2px' },
      '&:hover fieldset': { borderColor: '#3E4659' },
      '&.Mui-focused fieldset': { borderColor: '#FFBE0B', borderWidth: '2px' }
    }
  };

  return (
    <div className="min-h-screen text-[#F6F5F2] selection:bg-[#FFBE0B] selection:text-[#111318]">
      
      {/* Swiss Architectural Header Bar */}
      <AppBar position="sticky" elevation={0} color="transparent" className="!bg-[#111318] !border-b-2 !border-[#2D3342]">
        <Container maxWidth="lg">
          <Toolbar disableGutters className="flex justify-between py-2.5">
            <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
                <Logo size="sm" />
                <div className="hidden sm:flex flex-col">
                  <span className="font-display font-bold text-xl tracking-tight text-[#F6F5F2] leading-none group-hover:text-[#FFBE0B] transition-colors">
                    KİMBUKİ
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#A0A8B8] mt-0.5">
                    3D SOSYAL TAHMİN OYUNU
                  </span>
                </div>
            </div>

            <div className="lg:hidden flex items-center">
              <IconButton color="inherit" onClick={() => setMobileMenuOpen(true)} className="!border-2 !border-[#2D3342] !rounded-[4px]">
                <MenuIcon className="text-[#F6F5F2]" />
              </IconButton>
            </div>

            <div className="hidden lg:flex gap-2 xl:gap-3 items-center">
              <Button 
                color="inherit" 
                className="!font-display !font-bold !text-xs !uppercase !tracking-wider !text-[#A0A8B8] hover:!text-[#F6F5F2]" 
                onClick={() => scrollToSection('nasil-oynanir')}
              >
                NASIL OYNANIR?
              </Button>
              <Button 
                color="inherit" 
                className="!font-display !font-bold !text-xs !uppercase !tracking-wider !text-[#A0A8B8] hover:!text-[#F6F5F2]" 
                onClick={() => scrollToSection('biz-kimiz')}
              >
                HAKKIMIZDA
              </Button>
              
              {user && (
                <>
                    <div className="w-[2px] h-6 bg-[#2D3342] mx-1" />
                    <Button 
                        onClick={() => setDailyRewardDialogOpen(true)}
                        className={`!whitespace-nowrap !font-mono !text-xs !font-bold !border-2 !rounded-[4px] !px-3 !py-1.5 ${
                          user.canClaimDaily 
                            ? '!border-[#090A0D] !bg-[#00E5A3] !text-[#111318] !shadow-[2px_2px_0px_#090A0D]' 
                            : '!border-[#2D3342] !bg-[#1A1D24] !text-[#A0A8B8]'
                        }`} 
                    >
                        🎁 GÜNLÜK ÖDÜL
                    </Button>
                    <div className="flex items-center gap-1 font-mono text-xs font-bold border-2 border-[#FFBE0B] bg-[#1A1D24] text-[#FFBE0B] rounded-[4px] px-3 py-1.5 tnum">
                        <span>🪙</span>
                        <span>{user.gold || 0}</span>
                    </div>
                    <Button 
                      onClick={() => setShopDialogOpen(true)} 
                      startIcon={<StorefrontIcon fontSize="small" />}
                      className="swiss-btn-secondary !px-3 !py-1.5 !text-xs"
                    >
                        MAĞAZA
                    </Button>
                    <Button 
                      onClick={() => setQuestsDialogOpen(true)}
                      className="swiss-btn-secondary !px-3 !py-1.5 !text-xs"
                    >
                        📜 GÖREVLER
                    </Button>
                    <Button 
                      onClick={handleOpenLeaderboard}
                      className="swiss-btn-secondary !px-3 !py-1.5 !text-xs"
                    >
                        🏆 LİDERLİK
                    </Button>

                    {/* Player Dossier Badge */}
                    <button 
                      onClick={openProfile}
                      className="flex flex-col items-stretch justify-center px-3.5 py-1.5 bg-[#1A1D24] hover:border-[#FFBE0B] rounded-[4px] border-2 border-[#3E4659] shadow-[2px_2px_0px_#090A0D] min-w-[165px] max-w-[185px] cursor-pointer transition-colors text-left"
                    >
                        <div className="flex items-center justify-between gap-1.5 text-[#F6F5F2] font-display font-bold text-xs mb-1 w-full">
                            <span className="truncate max-w-[110px] uppercase">{user.username}</span>
                            <AccountCircleIcon sx={{ fontSize: 16, color: '#FFBE0B' }} />
                        </div>
                        <div className="w-full flex flex-col items-stretch">
                            <div className="flex justify-between w-full text-[9px] font-mono font-bold mb-1">
                                <span className={`uppercase flex items-center gap-1 ${getRankInfo(user.rankInfo?.reputation || 0).color}`}>
                                    {getRankInfo(user.rankInfo?.reputation || 0).icon} {user.rankInfo?.title || 'Çaylak'}
                                </span>
                                <span className="text-[#A0A8B8] tnum">{user.rankInfo?.reputation || 0}/{user.rankInfo?.nextThreshold || 'MAX'}</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#111318] rounded-[1px] overflow-hidden border border-[#2D3342]">
                                <div 
                                    className="h-full bg-[#FFBE0B]" 
                                    style={{ width: `${user.rankInfo?.nextThreshold ? Math.min(100, ((user.rankInfo.reputation || 0) / user.rankInfo.nextThreshold) * 100) : 100}%` }}
                                />
                            </div>
                        </div>
                    </button>
                </>
              )}

              <Button 
                variant="contained" 
                className="swiss-btn-primary !px-6 !py-2 !text-sm" 
                onClick={() => { initAudio(); setPlayDialogOpen(true); }}
              >
                HEMEN OYNA
              </Button>
            </div>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer 
        anchor="right" 
        open={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
        slotProps={{ paper: { className: "!bg-[#1A1D24] !text-[#F6F5F2] w-72 !border-l-2 !border-[#3E4659]" } }}
      >
        <div className="p-4 flex justify-between items-center border-b-2 border-[#2D3342]">
            <span className="font-display font-bold text-lg uppercase tracking-wider text-[#FFBE0B]">NAVİGASYON</span>
            <IconButton color="inherit" onClick={() => setMobileMenuOpen(false)}>
                <CloseIcon />
            </IconButton>
        </div>
        <List className="p-4 flex flex-col gap-3">
            <Button className="swiss-btn-secondary w-full !justify-start !py-2.5" onClick={() => { scrollToSection('nasil-oynanir'); setMobileMenuOpen(false); }}>NASIL OYNANIR?</Button>
            <Button className="swiss-btn-secondary w-full !justify-start !py-2.5" onClick={() => { scrollToSection('biz-kimiz'); setMobileMenuOpen(false); }}>HAKKIMIZDA</Button>
            
            {user && (
                <>
                    <div className="h-[2px] bg-[#2D3342] my-1" />
                    <Button 
                        className={`w-full !justify-start !font-mono !font-bold !border-2 !px-4 !py-2.5 !rounded-[4px] ${
                          user.canClaimDaily 
                            ? '!border-[#090A0D] !bg-[#00E5A3] !text-[#111318]' 
                            : '!border-[#2D3342] !bg-[#111318] !text-[#A0A8B8]'
                        }`} 
                        onClick={() => { setDailyRewardDialogOpen(true); setMobileMenuOpen(false); }}
                    >
                        🎁 GÜNLÜK ÖDÜL
                    </Button>
                    <div className="w-full flex items-center justify-between font-mono font-bold text-xs border-2 border-[#FFBE0B] bg-[#111318] text-[#FFBE0B] px-4 py-2.5 rounded-[4px] tnum">
                        <span>ALTIN BAKİYESİ</span>
                        <span>🪙 {user.gold || 0}</span>
                    </div>
                    <Button className="swiss-btn-secondary w-full !justify-start !py-2.5" onClick={() => { setShopDialogOpen(true); setMobileMenuOpen(false); }} startIcon={<StorefrontIcon />}>
                        MAĞAZA
                    </Button>
                    <Button className="swiss-btn-secondary w-full !justify-start !py-2.5" onClick={() => { setQuestsDialogOpen(true); setMobileMenuOpen(false); }}>
                        📜 GÖREVLER
                    </Button>
                    <Button className="swiss-btn-secondary w-full !justify-start !py-2.5" onClick={() => { handleOpenLeaderboard(); setMobileMenuOpen(false); }}>
                        🏆 LİDERLİK TABLOSU
                    </Button>
                    <Button className="swiss-btn-secondary w-full !justify-between !py-2.5" onClick={() => { openProfile(); setMobileMenuOpen(false); }}>
                        <span className="truncate">{user.username}</span>
                        <span className={`font-mono text-xs flex items-center gap-1 ${getRankInfo(user.rankInfo?.reputation || 0).color}`}>
                            {getRankInfo(user.rankInfo?.reputation || 0).icon} {user.rankInfo?.title || 'Çaylak'}
                        </span>
                    </Button>
                </>
            )}

            <Button className="swiss-btn-primary w-full !py-3.5 !mt-2" onClick={() => { initAudio(); setPlayDialogOpen(true); setMobileMenuOpen(false); }}>
                HEMEN OYNA
            </Button>
        </List>
      </Drawer>

      {/* Hero Section: Swiss Graphic Poster Composition */}
      <section className="relative pt-16 pb-20 lg:pt-28 lg:pb-28 border-b-2 border-[#2D3342]">
        <Container maxWidth="lg" className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Poster Typography Column */}
            <div className="lg:col-span-7 text-left space-y-6">
              {/* Live Telemetry Strip */}
              <div className="inline-flex items-center gap-4 bg-[#1A1D24] px-4 py-2 rounded-[4px] border-2 border-[#3E4659] shadow-[4px_4px_0px_#090A0D]">
                  <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-[#00E5A3] inline-block animate-pulse" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F6F5F2] tnum">
                        {liveStats.activePlayers} AKTİF OYUNCU
                      </span>
                  </div>
                  <div className="w-[2px] h-4 bg-[#2D3342]" />
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#FFBE0B] tnum">
                    {liveStats.activeRooms} CANLI MASA
                  </div>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] uppercase">
                ALNINDAKİ <br />
                <span className="inline-block bg-[#FFBE0B] text-[#111318] px-3 py-0.5 border-2 border-[#090A0D] shadow-[5px_5px_0px_#090A0D] transform -rotate-1 my-1">
                  KİMLİĞİ
                </span>{" "}
                ÇÖZ.
              </h1>

              <p className="text-lg sm:text-xl text-[#A0A8B8] max-w-xl leading-relaxed">
                Klasik <strong className="text-[#F6F5F2]">"Ben Kimim?"</strong> masa oyununun 3 boyutlu, sesli sohbetli ve taktiksel jokerli yeni nesil versiyonu. Odanı kur, arkadaşlarının alnına kelimeleri yapıştır ve sorgulamaya başla!
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button 
                  variant="contained" 
                  size="large" 
                  startIcon={<PlayArrowIcon />}
                  onClick={() => { initAudio(); setPlayDialogOpen(true); }}
                  className="swiss-btn-primary !text-base !py-4 !px-8"
                >
                  MASAYA OTUR
                </Button>
                <Button 
                  variant="outlined" 
                  size="large" 
                  onClick={() => scrollToSection('nasil-oynanir')}
                  className="swiss-btn-secondary !text-base !py-4 !px-8"
                >
                  KURALLARI İNCELE
                </Button>
              </div>
            </div>

            {/* Right Tactile Tabletop Preview Card */}
            <div className="lg:col-span-5">
              <div className="swiss-panel p-6 md:p-8 relative bg-[#1A1D24]">
                <div className="flex justify-between items-center border-b-2 border-[#2D3342] pb-4 mb-6">
                  <span className="swiss-label">MASA SİMÜLASYONU // 3D SAHNE</span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#FF5938] text-white rounded-[2px]">
                    CANLI SES + JOKER
                  </span>
                </div>

                <div className="flex flex-col items-center py-4">
                  <Logo size="xl" className="mb-8" />
                  
                  <div className="w-full space-y-3">
                    <div className="p-3.5 rounded-[4px] bg-[#111318] border-2 border-[#2D3342] flex items-center justify-between">
                      <span className="font-mono text-xs uppercase text-[#A0A8B8]">1. ADIM</span>
                      <span className="font-display font-bold text-sm uppercase text-[#F6F5F2]">ARKADAŞININ ALNINA KELİME YAZ</span>
                    </div>
                    <div className="p-3.5 rounded-[4px] bg-[#111318] border-2 border-[#2D3342] flex items-center justify-between">
                      <span className="font-mono text-xs uppercase text-[#FFBE0B]">2. ADIM</span>
                      <span className="font-display font-bold text-sm uppercase text-[#F6F5F2]">MİKROFONU AÇ & SORULAR SOR</span>
                    </div>
                    <div className="p-3.5 rounded-[4px] bg-[#111318] border-2 border-[#00E5A3] flex items-center justify-between">
                      <span className="font-mono text-xs uppercase text-[#00E5A3]">3. ADIM</span>
                      <span className="font-display font-bold text-sm uppercase text-[#00E5A3]">JOKER KULLAN & KASAYI KAZAN</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </Container>
      </section>

      {/* How to Play Section: 3-Column Swiss Grid */}
      <section id="nasil-oynanir" className="py-20 bg-[#1A1D24]/60 border-b-2 border-[#2D3342]">
        <Container maxWidth="lg">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b-2 border-[#2D3342]">
            <div>
              <span className="swiss-label block mb-2">OYUN PROTOKOLÜ</span>
              <h2 className="font-display text-3xl md:text-5xl font-bold uppercase tracking-tight">
                NASIL OYNANIR?
              </h2>
            </div>
            <p className="text-[#A0A8B8] font-mono text-xs uppercase tracking-wider mt-2 md:mt-0">
              3 ADIMDA PARTİ BAŞLASIN
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="swiss-card swiss-card-interactive p-7 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="w-12 h-12 bg-[#FFBE0B] text-[#111318] border-2 border-[#090A0D] rounded-[4px] shadow-[3px_3px_0px_#090A0D] flex items-center justify-center">
                    <GroupIcon />
                  </div>
                  <span className="font-mono text-2xl font-bold text-[#687082] tnum">01</span>
                </div>
                <h3 className="font-display text-2xl font-bold uppercase mb-3 text-[#F6F5F2]">
                  ODADA TOPLANIN
                </h3>
                <p className="text-[#A0A8B8] text-sm leading-relaxed">
                  Hızlıca kayıt ol, yeni bir masa kur ve 6 haneli bilet kodunu veya davet bağlantısını arkadaşlarınla paylaş.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#2D3342] font-mono text-[11px] uppercase text-[#FFBE0B]">
                ● 2 — 8 OYUNCU DESTEĞİ
              </div>
            </div>

            <div className="swiss-card swiss-card-interactive p-7 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="w-12 h-12 bg-[#FF5938] text-white border-2 border-[#090A0D] rounded-[4px] shadow-[3px_3px_0px_#090A0D] flex items-center justify-center">
                    <LightbulbIcon />
                  </div>
                  <span className="font-mono text-2xl font-bold text-[#687082] tnum">02</span>
                </div>
                <h3 className="font-display text-2xl font-bold uppercase mb-3 text-[#F6F5F2]">
                  KARTLARI YAPIŞTIRIN
                </h3>
                <p className="text-[#A0A8B8] text-sm leading-relaxed">
                  Oyun başladığında eşleştiğin arkadaşının alnında yazacak gizli kelimeyi belirle ve kendi taktiksel jokerini seç.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#2D3342] font-mono text-[11px] uppercase text-[#FF5938]">
                ● 17 FARKLI TAKTİKSEL JOKER
              </div>
            </div>

            <div className="swiss-card swiss-card-interactive p-7 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="w-12 h-12 bg-[#00E5A3] text-[#111318] border-2 border-[#090A0D] rounded-[4px] shadow-[3px_3px_0px_#090A0D] flex items-center justify-center">
                    <QuestionMarkIcon />
                  </div>
                  <span className="font-mono text-2xl font-bold text-[#687082] tnum">03</span>
                </div>
                <h3 className="font-display text-2xl font-bold uppercase mb-3 text-[#F6F5F2]">
                  SORGULA & KAZAN
                </h3>
                <p className="text-[#A0A8B8] text-sm leading-relaxed">
                  3D masada herkes birbirinin alnını görür ama kendi kelimesini göremez. Sıran geldiğinde sorular sor ve kim olduğunu ilk sen bul!
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#2D3342] font-mono text-[11px] uppercase text-[#00E5A3]">
                ● CANLI SESLİ SOHBET & OYLAMA
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* About Section */}
      <section id="biz-kimiz" className="py-20">
        <Container maxWidth="md">
          <div className="swiss-panel p-8 md:p-12">
            <span className="swiss-label block mb-2">STÜDYO MANİFESTOSU</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold uppercase mb-5 text-[#F6F5F2]">
              BİZ KİMİZ?
            </h2>
            <p className="text-[#A0A8B8] text-base md:text-lg leading-relaxed mb-6">
              Amacımız, klasik kutu ve masa oyunlarının verdiği samimi, rekabetçi ve eğlenceli hissi modern dijital dünyaya taşımak. 
              Arkadaşlarınızla yan yana veya uzaklarda olsanız bile, gecikmesiz sesli sohbet altyapımız ve 3 boyutlu masa motorumuz 
              sayesinde sanki aynı odadaymışsınız gibi kahkaha dolu anlar yaşamanızı sağlıyoruz.
            </p>
            <div className="pt-4 border-t-2 border-[#2D3342] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs text-[#687082] uppercase">
              <span>GELİŞTİRİCİ: BEDİR HÜSEYİN ÖZCAN</span>
              <span>SWISS TABLETOP EDITION // V2.0</span>
            </div>
          </div>
        </Container>
      </section>

      <footer className="py-8 border-t-2 border-[#2D3342] bg-[#111318] text-center font-mono text-xs text-[#687082] uppercase tracking-wider">
        <p>© 2026 KİMBUKİ. TÜM HAKLARI SAKLIDIR.</p>
      </footer>

      {/* Auth / Create & Join Room Dialog */}
      <Dialog 
        open={playDialogOpen} 
        onClose={() => setPlayDialogOpen(false)}
        slotProps={{ 
            paper: { 
              className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#3E4659] !shadow-[8px_8px_0px_#090A0D] min-w-[320px] sm:min-w-[420px]" 
            }
        }}
      >
        <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#FFBE0B] inline-block" />
          {user ? "MASAYA KATIL VEYA ODA KUR" : "OYUNCU GİRİŞİ"}
        </DialogTitle>
        <DialogContent className="p-6">
          
          {!user ? (
            <div className="space-y-4 mt-2">
              <Tabs 
                value={authTab} 
                onChange={(_, v) => setAuthTab(v)} 
                variant="fullWidth"
                textColor="inherit"
                slotProps={{ indicator: { style: { backgroundColor: '#FFBE0B', height: '3px' } } }}
                className="mb-4 border-b-2 border-[#2D3342]"
              >
                <Tab label="GİRİŞ YAP" className="!font-display !font-bold !text-sm" />
                <Tab label="KAYIT OL" className="!font-display !font-bold !text-sm" />
              </Tabs>
              
              <TextField
                placeholder="E-posta adresiniz"
                type="email"
                size="small"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                sx={inputFieldSx}
                slotProps={{ 
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon sx={{ color: '#A0A8B8', fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }
                }}
                fullWidth
              />

              {authTab === 1 && (
                <TextField
                  placeholder="Kullanıcı Adı (Nick)"
                  size="small"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  sx={inputFieldSx}
                  slotProps={{ 
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineIcon sx={{ color: '#A0A8B8', fontSize: 20 }} />
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
                  size="small"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  sx={inputFieldSx}
                  slotProps={{ 
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ color: '#A0A8B8', fontSize: 20 }} />
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
                            className="!font-mono !text-xs !text-[#A0A8B8] hover:!text-[#FFBE0B]"
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
                className="swiss-btn-primary !py-3.5 !mt-2"
              >
                {loginLoading ? "İŞLENİYOR..." : (authTab === 0 ? "GİRİŞ YAP" : "HESAP OLUŞTUR")}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 mt-2">
              <div className="bg-[#111318] p-4 rounded-[4px] border-2 border-[#2D3342] flex items-center justify-between">
                <div>
                  <span className="swiss-label block">AKTİF OYUNCU</span>
                  <p className="font-display text-xl font-bold text-[#FFBE0B] uppercase">{user.username}</p>
                </div>
                <Button size="small" className="swiss-btn-secondary !px-3 !py-1 !text-xs" onClick={openProfile}>
                  PROFİL
                </Button>
              </div>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleCreate}
                className="swiss-btn-primary !py-4 !text-base"
              >
                + YENİ MASA KUR
              </Button>
              
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t-2 border-[#2D3342]"></div>
                <span className="flex-shrink-0 mx-4 font-mono text-xs font-bold uppercase text-[#687082]">
                  VEYA KOD İLE KATIL
                </span>
                <div className="flex-grow border-t-2 border-[#2D3342]"></div>
              </div>

              <div className="flex flex-col gap-3">
                <TextField
                  placeholder="ODA KODU (ÖRN: A7B9K2)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  sx={{
                    input: { 
                      color: '#111318', 
                      backgroundColor: '#F4F1EA', 
                      textAlign: 'center', 
                      fontFamily: 'var(--font-mono)', 
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase'
                    },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '4px',
                      '& fieldset': { borderColor: '#090A0D', borderWidth: '2px' }
                    }
                  }}
                  fullWidth
                />
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  onClick={handleJoin}
                  className="swiss-btn-mint !py-3.5"
                >
                  ODAYA KATIL 🚀
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog 
        open={forgotPasswordDialogOpen} 
        onClose={() => setForgotPasswordDialogOpen(false)}
        slotProps={{ 
            paper: { 
              className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#3E4659] !shadow-[8px_8px_0px_#090A0D] min-w-[320px] max-w-md" 
            }
        }}
      >
        <DialogTitle className="font-display font-bold uppercase tracking-wider text-lg border-b-2 border-[#2D3342] py-4 px-6">
          ŞİFREMİ UNUTTUM
        </DialogTitle>
        <DialogContent className="p-6 space-y-4">
            <p className="text-[#A0A8B8] text-sm mt-2">
                Kayıt olduğunuz e-posta adresinizi girin. Size bir şifre sıfırlama bağlantısı göndereceğiz.
            </p>
            <TextField
                placeholder="E-posta adresiniz"
                type="email"
                size="small"
                disabled
                sx={inputFieldSx}
                fullWidth
            />
            <div className="bg-[#FFBE0B]/10 border-l-4 border-[#FFBE0B] p-3 text-[#FFBE0B] font-mono text-xs">
                ⚠️ BİLGİLENDİRME: Otomatik e-posta ile şifre sıfırlama servisi şu anda bakım aşamasındadır. Lütfen yönetici ile iletişime geçin.
            </div>
            <Button
                variant="contained"
                fullWidth
                disabled
                className="!py-3 !mt-2 !rounded-[4px] !bg-[#222630] !text-[#687082] !font-mono !font-bold"
            >
                GEÇİCİ OLARAK DEVRE DIŞI
            </Button>
        </DialogContent>
      </Dialog>

      {/* Profile & Locker Dialog */}
      <Dialog 
        open={profileDialogOpen} 
        onClose={() => setProfileDialogOpen(false)}
        slotProps={{ 
            paper: { 
              className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#3E4659] !shadow-[8px_8px_0px_#090A0D] min-w-[320px] sm:min-w-[460px]" 
            }
        }}
      >
        <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center justify-between">
          <span>OYUNCU KİMLİĞİ & ENVANTER</span>
          <span className="font-mono text-xs text-[#FFBE0B]">PROFİL</span>
        </DialogTitle>
        <DialogContent className="p-6 space-y-5 custom-scrollbar">
            <div className="bg-[#111318] border-2 border-[#2D3342] p-4 rounded-[4px] flex flex-col items-center mt-2">
                <span className="swiss-label mb-1">MEVCUT İTİBAR KADEMESİ</span>
                <span className={`font-display text-2xl font-bold uppercase mb-3 flex items-center gap-2 ${getRankInfo(user?.rankInfo?.reputation || 0).color}`}>
                    <span className="text-3xl">{getRankInfo(user?.rankInfo?.reputation || 0).icon}</span>
                    {getRankInfo(user?.rankInfo?.reputation || 0).title}
                </span>
                <div className="w-full flex flex-col items-center">
                    <div className="flex justify-between w-full font-mono text-[10px] font-bold uppercase text-[#A0A8B8] mb-1">
                        <span>İTİBAR PUANI</span>
                        <span className="tnum">{user?.rankInfo?.reputation || 0} / {user?.rankInfo?.nextThreshold || 'MAX'} RP</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#1A1D24] rounded-[2px] overflow-hidden border border-[#2D3342]">
                        <div 
                            className="h-full bg-[#FFBE0B]" 
                            style={{ width: `${user?.rankInfo?.nextThreshold ? Math.min(100, ((user.rankInfo.reputation || 0) / user.rankInfo.nextThreshold) * 100) : 100}%` }}
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="swiss-label block mb-2">KULLANICI ADI</label>
                <TextField
                    size="small"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    sx={inputFieldSx}
                    fullWidth
                />
            </div>

            <div>
                <p className="swiss-label mb-2.5">3D KARAKTER SEÇİMİ:</p>
                <div className="flex flex-wrap gap-2.5 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                    {user?.unlockedAvatars?.map(avId => {
                        const av = AVATARS.find(a => a.id === avId);
                        if (!av) return null;
                        const isSelected = selectedAvatar === av.id;
                        return (
                            <div 
                                key={av.id} 
                                onClick={() => setSelectedAvatar(av.id)}
                                className={`w-12 h-12 rounded-[4px] border-2 cursor-pointer flex justify-center items-center transition-all ${av.color} ${
                                    isSelected 
                                        ? 'border-[#FFBE0B] shadow-[3px_3px_0px_#FFBE0B] -translate-y-0.5' 
                                        : 'border-[#090A0D] opacity-60 hover:opacity-100'
                                }`}
                                title={av.label}
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

            <div>
                <p className="swiss-label mb-2.5">PLATFORM (KAİDE) SEÇİMİ:</p>
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                    {user?.unlockedPedestals?.map(pedId => {
                        const ped = PEDESTALS.find(p => p.id === pedId);
                        if (!ped) return null;
                        const isSelected = selectedPedestal === ped.id;
                        return (
                            <button 
                                key={ped.id} 
                                onClick={() => setSelectedPedestal(ped.id)}
                                className={`px-3.5 py-2 rounded-[4px] border-2 font-mono text-xs font-bold uppercase cursor-pointer transition-all ${
                                    isSelected 
                                        ? 'bg-[#FFBE0B] text-[#111318] border-[#090A0D] shadow-[2px_2px_0px_#090A0D]' 
                                        : 'bg-[#111318] text-[#A0A8B8] border-[#2D3342] hover:border-[#3E4659]'
                                }`}
                            >
                                {ped.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <p className="swiss-label mb-2.5">İSİM RENGİ:</p>
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                    {user?.unlockedNameColors?.map(colorId => {
                        const c = NAME_COLORS.find(x => x.id === colorId);
                        if (!c) return null;
                        const isSelected = selectedNameColor === c.id;
                        return (
                            <button 
                                key={c.id} 
                                onClick={() => setSelectedNameColor(c.id)}
                                className={`px-3.5 py-2 rounded-[4px] border-2 font-mono text-xs font-bold uppercase cursor-pointer transition-all bg-[#111318] ${
                                    isSelected 
                                        ? 'border-[#FFBE0B] shadow-[2px_2px_0px_#FFBE0B]' 
                                        : 'border-[#2D3342] opacity-70 hover:opacity-100'
                                }`}
                            >
                                <span className={c.className}>{c.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <p className="swiss-label mb-2.5">ÖZEL ÜNVAN:</p>
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                    {['', ...(user?.unlockedTitles || [])].map(titleId => {
                        const t = TITLES.find(x => x.id === titleId);
                        if (!t) return null;
                        const isSelected = selectedTitle === t.id;
                        return (
                            <button 
                                key={t.id} 
                                onClick={() => setSelectedTitle(t.id)}
                                className={`px-3.5 py-2 rounded-[4px] border-2 font-mono text-xs font-bold uppercase cursor-pointer transition-all ${
                                    isSelected 
                                        ? 'bg-[#00E5A3] text-[#111318] border-[#090A0D] shadow-[2px_2px_0px_#090A0D]' 
                                        : 'bg-[#111318] text-[#A0A8B8] border-[#2D3342] hover:border-[#3E4659]'
                                }`}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
                <Button
                    variant="contained"
                    fullWidth
                    onClick={handleUpdateProfile}
                    className="swiss-btn-primary !py-3"
                >
                    DEĞİŞİKLİKLERİ KAYDET
                </Button>
                <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleLogout}
                    className="!border-2 !border-[#FF334B] !text-[#FF334B] hover:!bg-[#FF334B] hover:!text-white !rounded-[4px] !font-mono !font-bold !py-2.5"
                >
                    OTURUMU KAPAT
                </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Daily Reward Dialog */}
      <Dialog 
        open={dailyRewardDialogOpen} 
        onClose={() => setDailyRewardDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ 
            paper: { 
              className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#00E5A3] !shadow-[8px_8px_0px_#090A0D]" 
            }
        }}
      >
        <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center justify-between">
            <span>🎁 7 GÜNLÜK GİRİŞ SERİSİ</span>
            <span className="font-mono text-xs text-[#00E5A3] tnum">SERİ: {user?.loginStreak || 0} GÜN</span>
        </DialogTitle>
        <DialogContent className="p-6">
            <p className="text-[#A0A8B8] text-sm mb-6 mt-1">
              Her gün oyuna girerek giriş serini koru ve artan altın ödüllerini topla!
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const amounts = [50, 100, 150, 200, 250, 300, 500];
                    const amount = amounts[day - 1];
                    const streak = user?.loginStreak || 0;
                    
                    let status = 'locked';
                    if (user?.canClaimDaily) {
                        if (day <= streak) status = 'claimed';
                        else if (day === streak + 1) status = 'current';
                    } else {
                        if (day <= streak) status = 'claimed';
                    }

                    let cardStyle = 'bg-[#111318] border-[#2D3342] text-[#687082]';
                    if (status === 'claimed') cardStyle = 'bg-[#00E5A3]/15 border-[#00E5A3] text-[#00E5A3]';
                    if (status === 'current') cardStyle = 'bg-[#FFBE0B] border-[#090A0D] text-[#111318] shadow-[3px_3px_0px_#090A0D] -translate-y-1';

                    return (
                        <div key={day} className={`flex flex-col items-center justify-between p-3 rounded-[4px] border-2 ${cardStyle} transition-all`}>
                            <span className="font-mono text-[10px] font-bold uppercase">{day}. GÜN</span>
                            <span className="text-xl my-2">
                                {status === 'claimed' ? '✓' : status === 'locked' ? '🔒' : '🎁'}
                            </span>
                            <span className="font-mono text-xs font-bold tnum">{amount}G</span>
                        </div>
                    );
                })}
            </div>
            
            <Button
                variant="contained"
                fullWidth
                disabled={!user?.canClaimDaily}
                onClick={() => {
                    handleClaimDaily();
                    setDailyRewardDialogOpen(false);
                }}
                className={`!py-3.5 !mt-6 ${user?.canClaimDaily ? 'swiss-btn-mint' : '!bg-[#111318] !text-[#687082] !border-2 !border-[#2D3342] !font-mono !font-bold'}`}
            >
                {user?.canClaimDaily ? 'GÜNLÜK ÖDÜLÜ TOPLA' : 'BUGÜNÜN ÖDÜLÜ ALINDI'}
            </Button>
        </DialogContent>
      </Dialog>

      {/* Shop Dialog */}
      <Dialog 
        open={shopDialogOpen} 
        onClose={() => setShopDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ 
            paper: { 
              className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#3E4659] !shadow-[8px_8px_0px_#090A0D]" 
            }
        }}
      >
        <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center justify-between">
            <span>🛒 KOZMETİK MAĞAZASI</span>
            <span className="font-mono text-xs font-bold px-3 py-1 bg-[#111318] border border-[#FFBE0B] text-[#FFBE0B] rounded-[4px] tnum">
                🪙 {user?.gold || 0} ALTIN
            </span>
        </DialogTitle>
        <DialogContent className="p-6 custom-scrollbar">
            <Tabs 
                value={shopTab} 
                onChange={(_, newValue) => setShopTab(newValue)} 
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    mb: 3, borderBottom: 2, borderColor: '#2D3342',
                    '& .MuiTab-root': { color: '#A0A8B8', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' },
                    '& .Mui-selected': { color: '#FFBE0B !important' },
                    '& .MuiTabs-indicator': { backgroundColor: '#FFBE0B', height: '3px' }
                }}
            >
                <Tab label="🎭 KARAKTERLER" />
                <Tab label="🧊 KAİDELER" />
                <Tab label="🎨 İSİM RENKLERİ" />
                <Tab label="👑 ÜNVANLAR" />
            </Tabs>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {shopItems.filter(i => {
                    if (shopTab === 0) return i.type === 'avatar' || !i.type;
                    if (shopTab === 1) return i.type === 'pedestal';
                    if (shopTab === 2) return i.type === 'color';
                    if (shopTab === 3) return i.type === 'title';
                    return false;
                }).map((item) => {
                    let isUnlocked = false;
                    if (shopTab === 0) isUnlocked = user?.unlockedAvatars?.includes(item.id) || false;
                    if (shopTab === 1) isUnlocked = user?.unlockedPedestals?.includes(item.id) || false;
                    if (shopTab === 2) isUnlocked = user?.unlockedNameColors?.includes(item.id) || false;
                    if (shopTab === 3) isUnlocked = user?.unlockedTitles?.includes(item.id) || false;

                    return (
                        <div key={item.id} className="bg-[#111318] p-4 rounded-[4px] border-2 border-[#2D3342] flex flex-col items-center justify-between text-center">
                            <span className="text-4xl mb-2 flex justify-center items-center h-[52px] w-[52px] bg-[#1A1D24] border border-[#2D3342] rounded-[4px]">
                                {item.icon}
                            </span>
                            <span className="font-display font-bold text-sm uppercase text-[#F6F5F2]">{item.label}</span>
                            <div className="mt-3 w-full">
                                {isUnlocked ? (
                                    <Button disabled fullWidth size="small" className="!bg-[#1A1D24] !text-[#687082] !border !border-[#2D3342] !font-mono !text-xs !font-bold !rounded-[4px]">
                                        ENVANTERDE
                                    </Button>
                                ) : (
                                    <Button 
                                        fullWidth 
                                        size="small" 
                                        onClick={() => handleBuyItem(item.id)}
                                        className="swiss-btn-primary !py-1.5 !text-xs tnum"
                                        startIcon={<AttachMoneyIcon fontSize="small" />}
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

      {/* Leaderboard Dialog */}
      <Dialog 
        open={leaderboardDialogOpen} 
        onClose={() => setLeaderboardDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ 
            paper: { 
              className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#FFBE0B] !shadow-[8px_8px_0px_#090A0D]" 
            }
        }}
      >
        <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center justify-between">
            <span>🏆 ŞEREF KÜRSÜSÜ (LİDERLİK)</span>
            <span className="font-mono text-xs text-[#FFBE0B]">TOP OYUNCULAR</span>
        </DialogTitle>
        <DialogContent className="p-6 custom-scrollbar">
            <div className="space-y-2.5 mt-1">
                {leaderboard.length === 0 ? (
                    <p className="text-center font-mono text-xs uppercase text-[#687082] py-6">HENÜZ SIRALAMA VERİSİ YOK.</p>
                ) : (
                    leaderboard.map((u, index) => {
                        const avMeta = AVATARS.find(a => a.id === u.avatar);
                        const rankObj = getRankInfo(u.reputation || 0);
                        return (
                            <div 
                                key={u._id} 
                                className={`flex justify-between items-center p-3.5 rounded-[4px] border-2 ${
                                    index === 0 
                                        ? 'bg-[#FFBE0B]/15 border-[#FFBE0B]' 
                                        : index < 3 
                                            ? 'bg-[#222630] border-[#3E4659]' 
                                            : 'bg-[#111318] border-[#2D3342]'
                                }`}
                            >
                                <div className="flex items-center gap-3.5">
                                    <span className={`font-mono font-bold text-lg w-8 text-center tnum ${
                                        index === 0 ? 'text-[#FFBE0B]' : index === 1 ? 'text-[#F6F5F2]' : index === 2 ? 'text-[#FF5938]' : 'text-[#687082]'
                                    }`}>
                                        #{index + 1}
                                    </span>
                                    <Avatar className={`!rounded-[4px] !border-2 !border-[#090A0D] ${avMeta?.color || '!bg-[#3B82F6]'}`}>
                                        {avMeta?.icon ? <span className="text-xl flex items-center justify-center h-full w-full">{avMeta.icon}</span> : u.username.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${rankObj.color}`}>
                                            {rankObj.icon} {rankObj.title}
                                        </span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {u.title && (
                                                <span className="text-[10px] font-mono font-bold bg-[#1A1D24] border border-[#3E4659] px-1.5 py-0.5 rounded-[2px] text-[#F6F5F2]">
                                                    {TITLES.find(t => t.id === u.title)?.label || u.title}
                                                </span>
                                            )}
                                            <span className={`font-display font-bold text-base leading-tight ${NAME_COLORS.find(c => c.id === u.nameColor)?.className || 'text-[#F6F5F2]'}`}>
                                                {u.username}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="font-mono text-xs font-bold bg-[#111318] text-[#00E5A3] px-3 py-1 rounded-[4px] border border-[#00E5A3] tnum">
                                    ★ {u.reputation || 0}
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
                className="swiss-btn-secondary !mt-6 !py-2.5"
            >
                TABLOYU KAPAT
            </Button>
        </DialogContent>
      </Dialog>

      {/* Quests Dialog */}
      <Dialog 
        open={questsDialogOpen} 
        onClose={() => setQuestsDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
        slotProps={{ 
            paper: { 
                className: "!bg-[#1A1D24] !text-[#F6F5F2] !rounded-[6px] !border-2 !border-[#3E4659] !shadow-[8px_8px_0px_#090A0D]" 
            } 
        }}
      >
        <DialogTitle className="font-display font-bold uppercase tracking-wider text-xl border-b-2 border-[#2D3342] py-4 px-6 flex items-center justify-between">
            <span>📜 AKTİF GÖREVLER</span>
            <span className="font-mono text-xs text-[#00E5A3]">ÖDÜL KONTRATLARI</span>
        </DialogTitle>
        <DialogContent className="p-6 custom-scrollbar">
            <div className="space-y-3.5 mt-1">
                {user?.quests?.map((quest: any) => {
                    const isCompleted = quest.progress >= quest.target;
                    return (
                        <div 
                            key={quest.id} 
                            className={`p-4 rounded-[4px] border-2 flex flex-col sm:flex-row gap-4 justify-between items-center ${
                                quest.isClaimed 
                                    ? 'bg-[#111318] border-[#2D3342] opacity-55' 
                                    : isCompleted 
                                        ? 'bg-[#00E5A3]/10 border-[#00E5A3]' 
                                        : 'bg-[#111318] border-[#2D3342]'
                            }`}
                        >
                            <div className="flex-1 w-full text-left">
                                <p className="font-display font-bold text-base uppercase text-[#F6F5F2]">{quest.title}</p>
                                <p className="font-mono text-xs text-[#FFBE0B] font-bold mb-2.5 mt-0.5 tnum">
                                    ÖDÜL: +{quest.rewardGold} ALTIN & +{quest.rewardRep} İTİBAR
                                </p>
                                <div className="w-full h-2 bg-[#1A1D24] rounded-[2px] overflow-hidden border border-[#2D3342]">
                                    <div 
                                        className={`h-full ${isCompleted ? 'bg-[#00E5A3]' : 'bg-[#FFBE0B]'}`} 
                                        style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }}
                                    />
                                </div>
                                <p className="font-mono text-[11px] text-[#A0A8B8] mt-1 text-right tnum">
                                    {Math.min(quest.progress, quest.target)} / {quest.target}
                                </p>
                            </div>
                            <Button 
                                variant="contained" 
                                disabled={!isCompleted || quest.isClaimed}
                                onClick={() => handleClaimQuest(quest.id)}
                                className={`!whitespace-nowrap !px-4 !py-2 ${
                                    quest.isClaimed 
                                        ? '!bg-[#222630] !text-[#687082] !font-mono !text-xs' 
                                        : isCompleted 
                                            ? 'swiss-btn-mint !text-xs' 
                                            : '!bg-[#222630] !text-[#687082] !font-mono !text-xs'
                                }`}
                            >
                                {quest.isClaimed ? 'ALINDI' : (isCompleted ? 'ÖDÜLÜ AL' : 'DEVAM EDİYOR')}
                            </Button>
                        </div>
                    );
                })}
                {!user?.quests?.length && (
                    <p className="text-center font-mono text-xs uppercase text-[#687082] py-6">GÖREVLER YÜKLENİYOR...</p>
                )}
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
