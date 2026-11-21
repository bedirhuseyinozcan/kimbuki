const WORD_CATEGORIES: Record<string, string[]> = {
    "Ünlüler": [
        "Cristiano Ronaldo", "Lionel Messi", "Tarkan", "Cem Yılmaz", "Barış Manço",
        "Kemal Sunal", "Şener Şen", "Sezen Aksu", "Hadise", "Acun Ilıcalı",
        "Arda Güler", "Kıvanç Tatlıtuğ", "Haluk Bilginer", "Elon Musk", "Taylor Swift",
        "Brad Pitt", "Leonardo DiCaprio", "Rihanna", "Eminem", "Michael Jackson",
        "Beyonce", "Adele", "Keanu Reeves", "Johnny Depp", "Neymar",
        "Kylian Mbappe", "LeBron James", "Michael Jordan", "Usain Bolt", "Novak Djokovic",
        "Ezhel", "Ceza", "Sagopa Kajmer", "Mabel Matiz", "Sertab Erener",
        "Müslüm Gürses", "Neşet Ertaş", "İbrahim Tatlıses", "Kenan İmirzalıoğlu", "Serenay Sarıkaya"
    ],
    "Hayvanlar": [
        "Penguen", "Zürafa", "Bukalemun", "Ahtapot", "Flamingo",
        "Koala", "Kanguru", "Tembel Hayvan", "Kunduz", "Kirpi",
        "Yunus", "Köpekbalığı", "Balina", "Kutup Ayısı", "Panda",
        "Çita", "Aslan", "Kaplan", "Fil", "Gergedan",
        "Su Aygırı", "Timsah", "Kartal", "Baykuş", "Tavus Kuşu",
        "Papağan", "Yarasa", "Tilki", "Kurt", "Sincap",
        "Deve", "Lama", "Mirket", "Ornitorenk", "Denizanası",
        "Kelebek", "Akbaba", "Kobra", "Komodo Ejderi", "Kaplumbağa"
    ],
    "Tarihi Kişiler": [
        "Mustafa Kemal Atatürk", "Fatih Sultan Mehmet", "Kanuni Sultan Süleyman", "Mimar Sinan", "Yunus Emre",
        "Mevlana", "Nasreddin Hoca", "Piri Reis", "Barbaros Hayrettin Paşa", "İbn-i Sina",
        "Albert Einstein", "Nikola Tesla", "Isaac Newton", "Leonardo da Vinci", "Galileo Galilei",
        "Marie Curie", "Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "William Shakespeare", "Napolyon Bonapart",
        "Jül Sezar", "Kleopatra", "Büyük İskender", "Cengiz Han", "Sokrates",
        "Aristoteles", "Platon", "Charles Darwin", "Thomas Edison", "Stephen Hawking",
        "Abraham Lincoln", "Nelson Mandela", "Mahatma Gandhi", "Pablo Picasso", "Vincent van Gogh",
        "Frida Kahlo", "Salvador Dali", "Kristof Kolomb", "Marco Polo", "Yuri Gagarin"
    ],
    "Filmler / Diziler": [
        "Sherlock Holmes", "Harry Potter", "Darth Vader", "Batman", "Spider-Man",
        "Iron Man", "Joker", "Thanos", "Gandalf", "Frodo Baggins",
        "Jon Snow", "Walter White", "Tommy Shelby", "Polat Alemdar", "Behzat Ç",
        "Recep İvedik", "İnek Şaban", "Gora Arif", "SüngerBob", "Shrek",
        "Jack Sparrow", "Indiana Jones", "James Bond", "John Wick", "Neo",
        "Terminatör", "Forrest Gump", "Rocky Balboa", "Hannibal Lecter", "Voldemort",
        "Hermione Granger", "Deadpool", "Wolverine", "Homer Simpson", "Rick Sanchez",
        "Naruto", "Goku", "Luffy", "Pikachu", "Mario"
    ]
};

const ALL_WORDS: string[] = Array.from(
    new Set(Object.values(WORD_CATEGORIES).flat())
);

export function getRandomWord(category?: string, excludeWord?: string): string {
    const pool = (category && WORD_CATEGORIES[category]) ? WORD_CATEGORIES[category] : ALL_WORDS;
    const normalizedExclude = (excludeWord || "").trim().toLocaleLowerCase("tr-TR");
    const candidates = pool.filter(w => w.toLocaleLowerCase("tr-TR") !== normalizedExclude);
    const list = candidates.length > 0 ? candidates : pool;
    return list[Math.floor(Math.random() * list.length)];
}
