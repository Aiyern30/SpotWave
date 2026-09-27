import { ShareTemplateProps } from "@/types/shareToInstagram";
import Image from "next/image";

export default function MinimalTemplate({ data }: ShareTemplateProps) {
    return (
        <div className="flex h-[1920px] w-[1080px] flex-col items-center justify-center bg-black p-20 text-center">
            <div className="mb-12 overflow-hidden rounded-full shadow-2xl">
                <Image
                    src={data.coverImage}
                    width={600}
                    height={600}
                    alt=""
                    className="h-[600px] w-[600px] object-cover"
                    unoptimized
                />
            </div>
            <h1 className="mb-4 text-6xl font-bold text-white">{data.name}</h1>
            <p className="text-2xl text-zinc-500">
                {data.trackCount} songs · {data.duration}
            </p>
        </div>
    );
}