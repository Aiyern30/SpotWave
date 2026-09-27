import { ShareTemplateProps } from "@/types/shareToInstagram";
import Image from "next/image";

export default function ClassicTemplate({ data }: ShareTemplateProps) {
    return (
        <div className="flex h-[1920px] w-[1080px] flex-col justify-end bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-20">
            <div className="mb-16 overflow-hidden rounded-3xl shadow-2xl">
                <Image
                    src={data.coverImage}
                    width={840}
                    height={840}
                    alt=""
                    className="h-[840px] w-[840px] object-cover"
                    unoptimized
                />
            </div>
            <h1 className="mb-6 text-7xl font-bold leading-tight text-white">
                {data.name}
            </h1>
            {data.description && (
                <p className="mb-8 line-clamp-2 text-3xl text-zinc-400">
                    {data.description}
                </p>
            )}
            <div className="flex items-center gap-4 text-2xl text-zinc-300">
                <span>{data.trackCount} songs</span>
                <span className="opacity-40">•</span>
                <span>{data.duration}</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
                {data.ownerAvatar && (
                    <Image
                        src={data.ownerAvatar}
                        width={56}
                        height={56}
                        alt=""
                        className="rounded-full"
                        unoptimized
                    />
                )}
                <span className="text-2xl font-medium text-zinc-400">
                    {data.ownerName}
                </span>
            </div>
        </div>
    );
}