'use client'
import Image from "next/image";

export default function PalomaLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="w-60 relative mb-0 flex justify-center">
        <Image
          src="https://i.ibb.co/jvJk2gb5/Group-2.png"
          alt="Paloma Realty Logo"
          width={200}
          height={200}
          className="object-contain h-auto mx-auto w-[80px] xs:w-[100px] sm:w-[150px] md:w-[200px]"
          priority
          unoptimized
        />
      </div>
      <div className="text-center font-playfair mt-0">
        <h2 className="font-normal tracking-wide leading-none text-[32px] xs:text-[40px] sm:text-[44px] md:text-[48px]">
          PALOMA
        </h2>
        <h3 className="text-base sm:text-xl md:text-2xl tracking-widest -mt-1">REALTY</h3>
      </div>
    </div>
  );
}
