// Get Audiobook Chapters
export const fetchAudiobookChapters = async (
  token: string,
  audiobookId: string
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/audiobooks/${audiobookId}/chapters?market=US&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch chapters");
    }

    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return [];
  }
};

// Get Single Chapter
export const fetchChapter = async (token: string, chapterId: string) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/chapters/${chapterId}?market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch chapter");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching chapter:", error);
    return null;
  }
};

// Get Several Chapters
export const fetchSeveralChapters = async (
  token: string,
  chapterIds: string[]
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/chapters?ids=${chapterIds.join(
        ","
      )}&market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch chapters");
    }

    const data = await response.json();
    return data.chapters;
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return [];
  }
};
