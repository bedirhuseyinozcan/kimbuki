"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, AppBar, Toolbar, Container, IconButton, Drawer, List } from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import GroupIcon from '@mui/icons-material/Group';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import StorefrontIcon from '@mui/icons-material/Storefront';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { toast } from 'react-toastify';
import Logo from "@/components/Logo";
import { getRankInfo } from "@/components/game/types";
import { getAudioContext } from "@/utils/audio";
import { HomeUser, LeaderboardEntry, ShopItem } from "@/components/home/types";
import PlayAuthDialog from "@/components/home/PlayAuthDialog";
import ForgotPasswordDialog from "@/components/home/ForgotPasswordDialog";
import ProfileDialog from "@/components/home/ProfileDialog";
import DailyRewardDialog from "@/components/home/DailyRewardDialog";
import ShopDialog from "@/components/home/ShopDialog";
import LeaderboardDialog from "@/components/home/LeaderboardDialog";
import QuestsDialog from "@/components/home/QuestsDialog";

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

  const [user, setUser] = useState<HomeUser | null>(null);
  
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
      } catch {
          toast.error("Bağlantı hatası!");
      }
  };
  
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [shopTab, setShopTab] = useState(0);
  const [dailyRewardDialogOpen, setDailyRewardDialogOpen] = useState(false);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);

  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [liveStats, setLiveStats] = useState({ activeRooms: 0, activePlayers: 0 });

  const [authTab, setAuthTab] = useState(0);
  const [guestName, setGuestName] = useState("");
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
        queueMicrotask(() => {
            setRoomCode(inviteCode);
            setAuthTab(2);
            setPlayDialogOpen(true);
        });
    }

    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/stats/live`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && typeof data.activeRooms === "number") setLiveStats(data);
      })
      .catch(() => {});

    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/shop/items`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (Array.isArray(data)) setShopItems(data);
      })
      .catch(() => {});
  }, []);

  const fetchMe = (token: string) => {
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/auth/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("gameToken");
          setUser(null);
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (!data) return;
        if (data.id) {
          setUser({ 
              id: data.id, 
              username: data.username, 
              isGuest: Boolean(data.isGuest),
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
        }
      })
      .catch(() => {
        // Keep token on transient network error / cold start
      });
  };

  useEffect(() => {
    const token = localStorage.getItem("gameToken");
    if (token) fetchMe(token);
  }, []);

  const handleOpenLeaderboard = () => {
      fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/stats/leaderboard`)
        .then(res => {
          if (!res.ok) throw new Error("Leaderboard fetch failed");
          return res.json();
        })
        .then(data => {
            if (!Array.isArray(data)) throw new Error("Invalid leaderboard payload");
            setLeaderboard(data);
            setLeaderboardDialogOpen(true);
        })
        .catch(() => toast.error("Liderlik tablosu yüklenemedi."));
  };

  const handleGuestLogin = async () => {
    const cleanName = guestName.trim();
    if (cleanName.length < 3 || cleanName.length > 20) {
      return toast.error("Takma ad 3 ile 20 karakter arasında olmalıdır!");
    }
    setLoginLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanName })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Misafir girişi başarısız!");
        return;
      }
      localStorage.setItem("gameToken", data.token);
      setUser({
        id: data.user.id,
        username: data.user.username,
        isGuest: true,
        avatar: data.user.avatar,
        pedestal: data.user.pedestal,
        nameColor: data.user.nameColor,
        title: data.user.title,
        gold: 0,
        unlockedAvatars: data.user.unlockedAvatars,
        unlockedPedestals: data.user.unlockedPedestals,
        unlockedNameColors: data.user.unlockedNameColors,
        unlockedTitles: [],
        rankInfo: data.user.rankInfo,
        quests: [],
        canClaimDaily: false,
        loginStreak: 0
      });
      toast.success(`Hoş geldin ${data.user.username}! (Misafir)`);
      if (roomCode.trim()) {
        router.push(`/game/${encodeURIComponent(roomCode.trim().toUpperCase())}`);
      }
    } catch {
      toast.error("Sunucuya bağlanılamadı!");
    } finally {
      setLoginLoading(false);
    }
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
                Klasik <strong className="text-[#F6F5F2]">&ldquo;Ben Kimim?&rdquo;</strong> masa oyununun 3 boyutlu, sesli sohbetli ve taktiksel jokerli yeni nesil versiyonu. Odanı kur, arkadaşlarının alnına kelimeleri yapıştır ve sorgulamaya başla!
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

      <PlayAuthDialog
        open={playDialogOpen}
        onClose={() => setPlayDialogOpen(false)}
        user={user}
        authTab={authTab}
        setAuthTab={setAuthTab}
        guestName={guestName}
        setGuestName={setGuestName}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginName={loginName}
        setLoginName={setLoginName}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginLoading={loginLoading}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        onGuestLogin={handleGuestLogin}
        onAuth={handleAuth}
        onForgotPassword={handleForgotPassword}
        onOpenProfile={openProfile}
        onCreateRoom={handleCreate}
        onJoinRoom={handleJoin}
      />

      <ForgotPasswordDialog
        open={forgotPasswordDialogOpen}
        onClose={() => setForgotPasswordDialogOpen(false)}
      />

      <ProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        user={user}
        loginName={loginName}
        setLoginName={setLoginName}
        selectedAvatar={selectedAvatar}
        setSelectedAvatar={setSelectedAvatar}
        selectedPedestal={selectedPedestal}
        setSelectedPedestal={setSelectedPedestal}
        selectedNameColor={selectedNameColor}
        setSelectedNameColor={setSelectedNameColor}
        selectedTitle={selectedTitle}
        setSelectedTitle={setSelectedTitle}
        onSave={handleUpdateProfile}
        onLogout={handleLogout}
      />

      <DailyRewardDialog
        open={dailyRewardDialogOpen}
        onClose={() => setDailyRewardDialogOpen(false)}
        user={user}
        onClaimDaily={handleClaimDaily}
      />

      <ShopDialog
        open={shopDialogOpen}
        onClose={() => setShopDialogOpen(false)}
        user={user}
        shopTab={shopTab}
        setShopTab={setShopTab}
        shopItems={shopItems}
        onBuyItem={handleBuyItem}
      />

      <LeaderboardDialog
        open={leaderboardDialogOpen}
        onClose={() => setLeaderboardDialogOpen(false)}
        leaderboard={leaderboard}
      />

      <QuestsDialog
        open={questsDialogOpen}
        onClose={() => setQuestsDialogOpen(false)}
        user={user}
        onClaimQuest={handleClaimQuest}
      />

    </div>
  );
}
