"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TextField, Button, Dialog, DialogTitle, DialogContent, AppBar, Toolbar, Typography, Container, Card, CardContent } from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import GroupIcon from '@mui/icons-material/Group';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [playDialogOpen, setPlayDialogOpen] = useState(false);
  const [user, setUser] = useState<{ id: string, username: string, avatar: number } | null>(null);
  const [loginName, setLoginName] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("gameUser");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      fetch(`http://localhost:4000/api/auth/me/${parsed.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setUser(data);
          } else {
            localStorage.removeItem("gameUser");
          }
        })
        .catch(() => localStorage.removeItem("gameUser"));
    }
  }, []);

  const handleLogin = async () => {
    if (!loginName.trim()) return alert("Lütfen bir isim gir!");
    setLoginLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginName })
      });
      const data = await res.json();
      if (data.id) {
        setUser(data);
        localStorage.setItem("gameUser", JSON.stringify(data));
      } else {
        alert(data.error || "Giriş başarısız.");
      }
    } catch (err) {
      alert("Sunucuya bağlanılamadı.");
    }
    setLoginLoading(false);
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

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-violet-500/30">
      
      <AppBar position="sticky" elevation={0} className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <Container maxWidth="lg">
          <Toolbar disableGutters className="flex justify-between">
            <Typography variant="h6" className="font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
              BEN KİMİM?
            </Typography>
            <div className="hidden md:flex gap-6 items-center">
              <Button color="inherit" className="text-slate-300 hover:text-white" onClick={() => scrollToSection('nasil-oynanir')}>Nasıl Oynanır?</Button>
              <Button color="inherit" className="text-slate-300 hover:text-white" onClick={() => scrollToSection('biz-kimiz')}>Biz Kimiz?</Button>
              <Button variant="contained" className="bg-violet-600 hover:bg-violet-500 font-bold rounded-full px-6" onClick={() => setPlayDialogOpen(true)}>
                Oyna
              </Button>
            </div>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        <Container maxWidth="md" className="relative z-10 text-center">
          <div className="inline-block mb-6 p-4 bg-slate-800/50 rounded-full border border-slate-700 shadow-2xl animate-bounce">
            <SportsEsportsIcon sx={{ fontSize: 60 }} className="text-cyan-400" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Arkadaşlarınla Eğlenceli <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">Tahmin Oyunu</span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Klasik "Alnımdaki kağıtta ne yazıyor?" oyununun modern ve dijital hali. 
            Hemen bir oda kur, arkadaşlarını davet et ve kim olduğunu bulmaya çalış!
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
                <p className="text-slate-400">Bir oda kur ve davet linkini arkadaşlarınla paylaş. Herkes kendi rengini ve adını seçip lobiye katılsın.</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border border-slate-700 text-white shadow-xl hover:-translate-y-2 transition-transform duration-300">
              <CardContent className="p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-violet-500/20 rounded-2xl flex items-center justify-center mb-6 text-violet-400">
                  <LightbulbIcon fontSize="large" />
                </div>
                <h3 className="text-2xl font-bold mb-3">2. Kelimeleri Seçin</h3>
                <p className="text-slate-400">Oyun başladığında, eşleştiğin arkadaşının alnında yazacak kelimeyi (kişi, nesne, ünlü vb.) sen belirle.</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border border-slate-700 text-white shadow-xl hover:-translate-y-2 transition-transform duration-300">
              <CardContent className="p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6 text-green-400">
                  <QuestionMarkIcon fontSize="large" />
                </div>
                <h3 className="text-2xl font-bold mb-3">3. Sorular Sor</h3>
                <p className="text-slate-400">30 saniyelik sıran geldiğinde diğerlerine "Ben yaşıyor muyum?" gibi sorular sorarak kim olduğunu tahmin et!</p>
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
        <p>© 2026 Ben Kimim? Tüm hakları saklıdır.</p>
      </footer>
      <Dialog 
        open={playDialogOpen} 
        onClose={() => setPlayDialogOpen(false)}
        slotProps={{ paper: { className: "bg-slate-900 border border-slate-700 text-white rounded-3xl min-w-[320px] sm:min-w-[400px]" } }}
      >
        <DialogTitle className="text-center font-black text-2xl pt-8 pb-2">
          {user ? "Odaya Katıl veya Kur" : "Oyuna Giriş Yap"}
        </DialogTitle>
        <DialogContent className="p-8">
          
          {!user ? (
            <div className="space-y-4">
              <p className="text-slate-400 text-center text-sm mb-6">24 saat geçerli geçici bir profil oluşturulacak.</p>
              <TextField
                placeholder="Takma Adın"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                slotProps={{ input: { className: "text-center font-bold text-white bg-slate-800 rounded-2xl h-14" } }}
                fullWidth
              />
              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={loginLoading}
                onClick={handleLogin}
                className="py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 font-bold text-lg shadow-lg shadow-violet-500/20"
              >
                {loginLoading ? "Giriş Yapılıyor..." : "Devam Et 🚀"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center mb-6">
                <p className="text-sm text-slate-400">Hoş geldin,</p>
                <p className="text-xl font-bold text-cyan-400">{user.username}</p>
              </div>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleCreate}
                className="py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 font-bold text-lg shadow-lg shadow-violet-500/20"
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
                  slotProps={{ input: { className: "text-center uppercase tracking-widest font-mono text-white bg-slate-800 rounded-2xl h-14" } }}
                  fullWidth
                />
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  onClick={handleJoin}
                  className="py-3 rounded-2xl border-slate-600 text-slate-300 font-bold hover:bg-slate-800"
                >
                  Odaya Katıl 🚀
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
