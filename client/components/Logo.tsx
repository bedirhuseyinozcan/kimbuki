export default function Logo({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl", className?: string }) {
    const sizeClasses = {
        sm: "w-9 h-9 text-xl border-2",
        md: "w-12 h-12 text-2xl border-2",
        lg: "w-20 h-20 text-4xl border-[3px]",
        xl: "w-28 h-28 text-6xl border-[3px]"
    };

    const offsetClasses = {
        sm: "translate-x-1 translate-y-1",
        md: "translate-x-1.5 translate-y-1.5",
        lg: "translate-x-2 translate-y-2",
        xl: "translate-x-2.5 translate-y-2.5"
    };

    return (
        <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
            {/* Hard Swiss Offset Plate */}
            <div className={`absolute inset-0 bg-[#FF5938] border-[#090A0D] rounded-[4px] transform ${offsetClasses[size]} ${sizeClasses[size]}`} />
            
            {/* Primary Signal Post-it Tile */}
            <div className={`
                relative bg-[#FFBE0B] border-[#090A0D]
                rounded-[4px] flex items-center justify-center 
                transform -rotate-3 hover:rotate-0 transition-transform duration-150
                ${sizeClasses[size]}
            `}>
                <span className="font-display font-bold text-[#111318] leading-none">
                    ?
                </span>
                {/* Corner registration mark */}
                <span className="absolute top-1 left-1 w-1.5 h-1.5 bg-[#111318] rounded-none opacity-80" />
            </div>
        </div>
    );
}
