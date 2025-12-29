"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/";
import { Button } from "@/components/ui/";
import { Skeleton } from "@/components/ui/";
import { Radio, Search } from "lucide-react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import { fetchBrowseCategories } from "@/utils/fetchCategories";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DisplayUIProps } from "@/lib/types";

type CategoryProps = {
  id: string;
  name: string;
  icons: { url: string }[];
  href: string;
};

const CategoryCard = ({
  category,
  viewMode,
}: {
  category: CategoryProps;
  viewMode: DisplayUIProps;
}) => {
  const detailUrl = `/Categories/${category.id}?name=${encodeURIComponent(
    category.name
  )}`;

  if (viewMode === "Table") {
    return (
      <Link href={detailUrl} className="block w-full">
        <Card className="group bg-zinc-900/50 hover:bg-zinc-800/70 border border-zinc-800 transition-all duration-300 hover:scale-[1.01] cursor-pointer overflow-hidden">
          <div className="flex items-center gap-4 p-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <Image
                src={category.icons?.[0]?.url || "/default-category.png"}
                alt={category.name}
                fill
                className="object-cover rounded-lg"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg">
                {category.name}
              </h3>
              <p className="text-zinc-400 text-sm mt-1">
                Browse {category.name.toLowerCase()} music
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-green-500 hover:text-green-400 pointer-events-none"
            >
              Explore →
            </Button>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={detailUrl} className="block w-full">
      <Card className="group relative bg-zinc-900/50 hover:bg-zinc-800/70 border border-zinc-800 transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden aspect-square">
        <div className="relative w-full h-full">
          <Image
            src={category.icons?.[0]?.url || "/default-category.png"}
            alt={category.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-bold text-lg drop-shadow-lg group-hover:text-green-400 transition-colors">
              {category.name}
            </h3>
          </div>
        </div>
      </Card>
    </Link>
  );
};

const CategoriesPage = () => {
  const [token, setToken] = useState<string>("");
  const [categories, setCategories] = useState<CategoryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [displayUI, setDisplayUI] = useState<DisplayUIProps>("Grid");
  const router = useRouter();

  const handleFetchCategories = useCallback(async () => {
    setLoading(true);
    const data = await fetchBrowseCategories(token);
    if (data) {
      setCategories(data);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      handleFetchCategories();
    }
  }, [token, handleFetchCategories]);

  const LoadingSkeleton = () => (
    <div
      className={`grid ${
        displayUI === "Grid"
          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          : "grid-cols-1"
      } gap-4 sm:gap-6`}
    >
      {[...Array(12)].map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton
            className={`w-full ${
              displayUI === "Grid" ? "aspect-square" : "h-24"
            } rounded-lg bg-zinc-800`}
          />
          <Skeleton className="h-4 w-3/4 bg-zinc-800" />
        </div>
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-32 h-32 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700">
        <Radio className="h-16 w-16 text-zinc-600" />
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-2xl font-semibold text-white">
          No Categories Available
        </h3>
        <p className="text-zinc-400 text-base">
          We couldn't load any categories at the moment. Please try again later.
        </p>
      </div>
      <Button
        onClick={() => handleFetchCategories()}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-6 mt-4"
      >
        Retry
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Radio className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Browse Categories</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {loading
                ? "Loading..."
                : `${categories.length} categories to explore`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDisplayUI("Table")}
            className={`h-9 px-3 transition-all ${
              displayUI === "Table"
                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <PiTable className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Table</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDisplayUI("Grid")}
            className={`h-9 px-3 transition-all ${
              displayUI === "Grid"
                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <LuLayoutGrid className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Grid</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : categories.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className={`grid ${
            displayUI === "Grid"
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              : "grid-cols-1"
          } gap-4 sm:gap-6`}
        >
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              viewMode={displayUI}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
