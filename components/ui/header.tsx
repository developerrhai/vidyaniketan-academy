import { Phone } from 'lucide-react';
import logo from '../../public/logo.jpeg';

export const Header = () => {
    return (

        <div className="relative overflow-hidden flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-[#0b3d6b] via-[#0d5c9e] to-[#0b7abf] px-8 py-10 text-white shadow-xl rounded-xl">

            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>

            <div className="shrink-0 transition-transform hover:scale-105 duration-300">
                <img
                    src={logo.src}
                    alt="Vidyanekethan Logo"
                    className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl"
                />
            </div>

            <div className="text-center md:text-left space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">
                    Vidyanekethan
                </h1>

                <div className="flex flex-col gap-1 opacity-90">
                    <p className="text-sm md:text-base leading-relaxed max-w-sm">
                        <span className="font-semibold block mb-1">Address:</span>
                        Arun Galaxy, Shreeram Chouk, <br />
                        Indapur, Maharashtra 413106
                    </p>

                    <p className="text-xl md:text-xl font-mono font-bold pt-2 flex items-center justify-center md:justify-start gap-2">
                        <span className="text-blue-200"><Phone /></span> 7972725715
                    </p>
                </div>
            </div>
        </div>
    )
}