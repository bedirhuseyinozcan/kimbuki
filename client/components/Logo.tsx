export default function Logo({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl", className?: string }) {
    const sizeClasses = {
        sm: "w-8 h-8 text-xl border-[2px]",
        md: "w-12 h-12 text-2xl border-[3px]",
        lg: "w-20 h-20 text-4xl border-[4px]",
        xl: "w-32 h-32 text-6xl border-[6px]"
    };

    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <div className={`absolute inset-0 bg-amber-600/50 rounded-sm transform translate-y-1 translate-x-1 ${sizeClasses[size]}`}></div>
            <div className={`
                relative bg-gradient-to-br from-yellow-300 to-amber-400 
                rounded-sm shadow-xl flex items-center justify-center 
                transform -rotate-6 hover:rotate-0 transition-all duration-300
                border-amber-500
                ${sizeClasses[size]}
            `}>
                <span className="font-black text-slate-800 drop-shadow-sm font-mono">
                    ?
                </span>
                <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-tl from-amber-500/40 to-transparent rounded-tl-full mix-blend-multiply"></div>
            </div>
        </div>
    );
}
