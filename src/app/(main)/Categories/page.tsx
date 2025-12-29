"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/";
import { Button } from "@/components/ui/";
import { Skeleton } from "@/components/ui/";
import { Radio, Search, Grid3x3, List } from "lucide-react";
import { fetchBrowseCategories, fetchCategory } from "@/utils/fetchCategories";
import { useRouter } from "next/navigation";

type CategoryProps = {
  id: string;
  name: string;
  icons: { url: string }[];
  href: string;
};

const CategoriesPage = () => {
  const [token, setToken] = useState<string>("");
  const [categories, setCategories] = useState<CategoryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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
        viewMode === "grid"
          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          : "grid-cols-1"
      } gap-4 sm:gap-6`}
    >
      {[...Array(12)].map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton
            className={`w-full ${
              viewMode === "grid" ? "aspect-square" : "h-24"
            } rounded-lg bg-zinc-800`}
          />
          <Skeleton className="h-4 w-3/4 bg-zinc-800" />
        </div>
      ))}
    </div>
  );

  const CategoryCard = ({ category }: { category: CategoryProps }) => {
    const handleClick = () => {
      router.push(
        `/Categories/${category.id}?name=${encodeURIComponent(category.name)}`
      );
    };

    if (viewMode === "list") {
      return (
        <Card
          className="group bg-zinc-900/50 hover:bg-zinc-800/70 border border-zinc-800 transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden"
          onClick={handleClick}
        >
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
              className="text-green-500 hover:text-green-400"
            >
              Explore →
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <Card
        className="group relative bg-zinc-900/50 hover:bg-zinc-800/70 border border-zinc-800 transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden"
        onClick={handleClick}
      >
        <div className="relative w-full aspect-square">
          <Image
            src={category.icons?.[0]?.url || "/default-category.png"}
            alt={category.name}
            fill
            className="object-cover rounded-t-lg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-bold text-lg drop-shadow-lg">
              {category.name}
            </h3>
          </div>
        </div>
      </Card>
    );
  };

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
      {/* Header */}
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={`border-zinc-700 hover:bg-zinc-800 ${
              viewMode === "grid" ? "bg-zinc-800" : ""
            }`}
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={`border-zinc-700 hover:bg-zinc-800 ${
              viewMode === "list" ? "bg-zinc-800" : ""
            }`}
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Categories Grid/List */}
      {loading ? (
        <LoadingSkeleton />
      ) : categories.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className={`grid ${
            viewMode === "grid"
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              : "grid-cols-1"
          } gap-4 sm:gap-6`}
        >
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
