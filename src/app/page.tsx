"use client";

import { Button, Input } from "@/components/ui";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Home() {
  const CLIENT_ID = "5bf8d69f8aaf4727a4677c0ad2fef6ec";
  const REDIRECT_URI = "http://localhost:3000";

  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const RESPONSE_TYPE = "token";

  const [token, setToken] = useState<string>("");
  const [searchKey, setSearchKey] = useState<string>("");
  const [artists, setArtists] = useState<any[]>([]);

  useEffect(() => {
    const hash = window.location.hash;
    let token = window.localStorage.getItem("Token");

    if (!token && hash) {
      const tokenFragment = hash
        .substring(1)
        .split("&")
        .find((elem) => elem.startsWith("access_token"));

      if (tokenFragment) {
        token = tokenFragment.split("=")[1];

        setToken(token);
        window.localStorage.setItem("Token", token);

        window.location.hash = "";
      }
    } else if (token) {
      setToken(token);
    }
  }, []);

  const logout = () => {
    setToken("");
    window.localStorage.removeItem("Token");
  };

  const searchArtists = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent form from submitting

    const { data } = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: searchKey,
        type: "artist",
      },
    });

    setArtists(data.artists.items);
  };

  const renderArtists = () => {
    return artists.map((artist) => {
      return (
        <div key={artist.id}>
          {artist.images.length ? (
            <img src={artist.images[0].url} width={100} height={100} />
          ) : (
            <div>No Image</div>
          )}
          {artist.name}
        </div>
      );
    });
  };

  return (
    <div>
      <div>Spotify React</div>
      {!token ? (
        <a
          href={`${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}`}
        >
          Login to Spotify
        </a>
      ) : (
        <Button onClick={logout}>Logout</Button>
      )}

      {token ? (
        <form onSubmit={searchArtists}>
          <Input
            type="text"
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
          ></Input>
          <Button type="submit">Search</Button>
        </form>
      ) : (
        <div>Please Login</div>
      )}

      {renderArtists()}
    </div>
  );
}
